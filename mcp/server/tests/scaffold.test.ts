/**
 * Template selection, target containment and overwrite precedence for the
 * skill-scaffold MCP server (LS-4748: SC-F04, SC-F07, SC-F08, SC-D02).
 *
 * Templates are read from this repository; every write goes to a new
 * temporary folder, which is removed afterwards.
 */

import { mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ScaffoldClient } from '../src/client/scaffold-client.ts';
import { createServer, DEFAULT_SCAFFOLD_DIR } from '../src/index.ts';

const SCAFFOLD = resolve(import.meta.dirname, '../../..');
const work = realpathSync(mkdtempSync(join(tmpdir(), 'skill-scaffold-test-')));
afterAll(() => rmSync(work, { recursive: true, force: true }));

const client = new ScaffoldClient(SCAFFOLD);
const variables = { repo_description: 'A test skill', author: 'LightSpeed', version: '0.1.0' };
let count = 0;
const target = () => {
  const dir = join(work, `target-${++count}`);
  mkdirSync(dir);
  return dir;
};

describe('template selection (SC-F07)', () => {
  const targets = (skillType?: string) => client.filterTemplates(skillType, [1, 2, 3]).map((t) => t.target);
  const common = client.getAllTemplates().filter((t) => !t.variant).map((t) => t.target);

  it('selects every template when no skill type is given', () => {
    expect(targets()).toHaveLength(client.getAllTemplates().length);
  });

  it.each([
    ['cli', ['package.json.cli']],
    ['validation', ['package.json.validation']],
    ['documentation', ['package.json.docs']],
    ['agent', []],
  ])('keeps the common templates for %s, plus its own variants', (skillType, variants) => {
    const selected = targets(skillType);
    expect(selected).toEqual(expect.arrayContaining(common));
    expect(selected.filter((file) => !common.includes(file))).toEqual(variants);
  });
});

describe('target containment (SC-F04)', () => {
  it.each([
    ['an empty path', ''],
    ['a relative path', 'some/repo'],
    ['a ".." segment', `${work}/../escape`],
    ['a missing folder', join(work, 'missing')],
    ['the filesystem root', '/'],
    ['the scaffold itself', SCAFFOLD],
    ['a folder inside the scaffold', join(SCAFFOLD, 'templates')],
  ])('refuses %s as repo_path', (_label, repoPath) => {
    expect(() => client.resolveTargetRoot(repoPath)).toThrow();
  });

  it('accepts an absolute folder outside the scaffold, with spaces in its name', () => {
    const spaced = join(work, 'my skill repo');
    mkdirSync(spaced);
    expect(client.resolveTargetRoot(spaced)).toBe(spaced);
  });

  it.each([['../escape'], ['/etc/passwd'], ['a/./b'], ['.git/config'], ['sub/.git/hooks']])(
    'refuses the target %s',
    (file) => {
      expect(() => client.resolveTargetPath(work, file)).toThrow();
    }
  );

  it('never writes through a linked folder', () => {
    const root = target();
    const outside = join(work, 'outside');
    mkdirSync(outside);
    symlinkSync(outside, join(root, '.github'));
    const ci = client.getAllTemplates().filter((t) => t.target === '.github/workflows/ci.yml');
    expect(() => client.planApply(root, ci)).toThrow(/symbolic link/);
    expect(() => client.writeFile(root, '.github/workflows/ci.yml', 'x', 'create')).toThrow(/symbolic link/);
    expect(readdirSync(outside)).toEqual([]);
  });

  it('refuses a target that is a folder', () => {
    const root = target();
    mkdirSync(join(root, 'SKILL.md'));
    expect(() => client.resolveTargetPath(root, 'SKILL.md')).toThrow(/not a regular file/);
  });

  it('does not replace a file that appeared after a create was planned', () => {
    const root = target();
    writeFileSync(join(root, 'SKILL.md'), 'mine\n');
    expect(() => client.writeFile(root, 'SKILL.md', 'new', 'create')).toThrow();
    expect(readFileSync(join(root, 'SKILL.md'), 'utf-8')).toBe('mine\n');
  });

  it('refuses an overwrite whose file has gone', () => {
    expect(() => client.writeFile(target(), 'SKILL.md', 'new', 'overwrite')).toThrow(/no longer exists/);
  });
});

describe('overwrite precedence (SC-D02)', () => {
  // lefthook.yml: the manifest allows replacing it. SKILL.md: it does not.
  const pick = client.getAllTemplates().filter((t) => ['lefthook.yml', 'SKILL.md'].includes(t.target));
  const existing = () => {
    const root = target();
    writeFileSync(join(root, 'lefthook.yml'), 'custom\n');
    writeFileSync(join(root, 'SKILL.md'), 'custom\n');
    return root;
  };
  const actions = (overwrite?: boolean) =>
    Object.fromEntries(client.planApply(existing(), pick, overwrite).map((entry) => [entry.file, entry.action]));

  it('lets the manifest decide when the request leaves overwrite out', () => {
    expect(actions()).toEqual({ 'lefthook.yml': 'overwrite', 'SKILL.md': 'skip' });
  });

  it('protects every existing file when the request sets overwrite: false', () => {
    expect(actions(false)).toEqual({ 'lefthook.yml': 'skip', 'SKILL.md': 'skip' });
  });

  it('replaces every existing file when the request sets overwrite: true', () => {
    expect(actions(true)).toEqual({ 'lefthook.yml': 'overwrite', 'SKILL.md': 'overwrite' });
  });

  it('creates missing files whatever the request says', () => {
    expect(client.planApply(target(), pick, false).map((entry) => entry.action)).toEqual(['create', 'create']);
  });

  it('replaces a file in place, leaving no temporary file', () => {
    const root = existing();
    client.writeFile(root, 'lefthook.yml', 'new\n', 'overwrite');
    expect(readFileSync(join(root, 'lefthook.yml'), 'utf-8')).toBe('new\n');
    expect(readdirSync(root).sort()).toEqual(['SKILL.md', 'lefthook.yml']);
  });
});

describe('server over an in-memory transport', () => {
  const mcp = new Client({ name: 'skill-scaffold-test', version: '1.0.0' });
  beforeAll(async () => {
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    await createServer(SCAFFOLD).connect(serverSide);
    await mcp.connect(clientSide);
  });
  afterAll(() => mcp.close());

  type Result = { isError?: boolean; content: Array<{ text: string }> };
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const result = (await mcp.callTool({ name, arguments: args })) as Result;
    return { result, text: result.content[0].text };
  };
  const json = async (name: string, args: Record<string, unknown> = {}) => JSON.parse((await call(name, args)).text);

  it('keeps the seven public tool names (SC-D01)', async () => {
    const { tools } = await mcp.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual([
      'list_templates',
      'list_variants',
      'scaffold_apply',
      'scaffold_dry_run',
      'skill_info',
      'template_render',
      'validate_variables',
    ]);
  });

  it('reads templates from the repository root by default', () => {
    expect(DEFAULT_SCAFFOLD_DIR).toBe(SCAFFOLD);
  });

  it('previews the exact plan that apply carries out, writing nothing', async () => {
    const root = target();
    writeFileSync(join(root, 'SKILL.md'), 'custom\n');
    writeFileSync(join(root, 'lefthook.yml'), 'custom\n');
    const request = { repo_path: root, repo_name: 'test-skill', variables, phases: 'all', overwrite: false };

    const preview = await json('scaffold_dry_run', request);
    expect(readdirSync(root).sort()).toEqual(['SKILL.md', 'lefthook.yml']);
    expect(await json('scaffold_apply', { ...request, dry_run: true })).toEqual(preview);
    const skipped = preview.proposedChanges.filter((c: { action: string }) => c.action === 'skip');
    expect(skipped.map((c: { file: string }) => c.file).sort()).toEqual(['SKILL.md', 'lefthook.yml']);

    const applied = await json('scaffold_apply', request);
    expect(applied.success).toBe(true);
    expect(applied.filesSkipped).toBe(2);
    expect(applied.filesWritten).toBe(preview.totalFiles - 2);
    expect(readFileSync(join(root, 'SKILL.md'), 'utf-8')).toBe('custom\n');
    expect(readFileSync(join(root, 'lefthook.yml'), 'utf-8')).toBe('custom\n');
    expect(readFileSync(join(root, '.github/workflows/ci.yml'), 'utf-8')).not.toBe('');
  });

  it('writes nothing when a template cannot be rendered', async () => {
    const broken = join(work, 'broken-scaffold');
    mkdirSync(join(broken, 'templates'), { recursive: true });
    writeFileSync(
      join(broken, 'scaffold.config.json'),
      JSON.stringify({
        templates: [
          { source: 'templates/a.mustache', target: 'a.md', overwrite: false, required: true, phase: 1 },
          { source: 'templates/missing.mustache', target: 'b.md', overwrite: false, required: true, phase: 1 },
        ],
        files: [],
        requiredVariables: ['repo_name'],
        optionalVariables: {},
      })
    );
    writeFileSync(join(broken, 'templates/a.mustache'), '{{repo_name}}\n');
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    await createServer(broken).connect(serverSide);
    const other = new Client({ name: 'broken', version: '1.0.0' });
    await other.connect(clientSide);
    const root = target();
    const result = (await other.callTool({
      name: 'scaffold_apply',
      arguments: { repo_path: root, repo_name: 'x', phases: '1' },
    })) as Result;
    const applied = JSON.parse(result.content[0].text);
    await other.close();
    expect(applied.success).toBe(false);
    expect(applied.errors[0].file).toBe('b.md');
    expect(readdirSync(root)).toEqual([]);
  });

  it('reports missing variables without writing', async () => {
    const root = target();
    const applied = await json('scaffold_apply', { repo_path: root, repo_name: 'x', variables: {}, phases: 'all' });
    expect(applied.success).toBe(false);
    expect(applied.errors.map((e: { field: string }) => e.field).sort()).toEqual(['author', 'repo_description', 'version']);
    expect(readdirSync(root)).toEqual([]);
  });

  it('returns refusals and unknown tools as errors', async () => {
    const refused = await call('scaffold_apply', { repo_path: 'relative', repo_name: 'x', variables, phases: 'all' });
    expect(refused.result.isError).toBe(true);
    expect(refused.text).toMatch(/absolute path/);
    expect((await call('no_such_tool')).result.isError).toBe(true);
  });

  it('still answers the read-only tools', async () => {
    expect((await json('list_templates', { skill_type: 'cli' })).total).toBeGreaterThan(0);
    expect((await json('list_variants', { skill_type: 'cli' })).variants.length).toBeGreaterThan(0);
    expect((await json('template_render', { template_name: 'SKILL.md.mustache', variables })).success).toBe(true);
    expect((await json('validate_variables', { skill_type: 'cli', variables })).valid).toBe(false);
    expect((await json('skill_info')).name).toBe('skill-scaffold');
  });
});

describe('server over stdio', () => {
  it('starts from / and keeps standard output for the protocol', async () => {
    let stderr = '';
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [resolve(import.meta.dirname, '../src/index.ts')],
      cwd: '/',
      env: { PATH: process.env.PATH ?? '' },
      stderr: 'pipe',
    });
    transport.stderr?.on('data', (chunk) => (stderr += chunk));
    const mcp = new Client({ name: 'stdio-test', version: '1.0.0' });
    await mcp.connect(transport);
    const { tools } = await mcp.listTools();
    await mcp.close();
    expect(tools).toHaveLength(7);
    expect(stderr).toContain('Connected and ready');
    expect(stderr).not.toMatch(/ExperimentalWarning|MODULE_TYPELESS/);
  });
});
