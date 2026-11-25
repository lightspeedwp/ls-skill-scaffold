/**
 * Rendering, variables and static files for the skill-scaffold MCP server
 * (LS-4748: SC-F06, contract in docs/COMPATIBILITY.md).
 *
 * Templates are read from this repository; every write goes to a new
 * temporary folder, which is removed afterwards.
 */

import { mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { renderMustache } from '../src/client/mustache.ts';
import { ScaffoldClient } from '../src/client/scaffold-client.ts';
import { createServer } from '../src/index.ts';

const SCAFFOLD = resolve(import.meta.dirname, '../../..');
const work = realpathSync(mkdtempSync(join(tmpdir(), 'skill-scaffold-render-')));
afterAll(() => rmSync(work, { recursive: true, force: true }));

const client = new ScaffoldClient(SCAFFOLD);
const minimal = { repo_name: 'wp-db-migrate', repo_description: 'Moves databases', author: 'LightSpeed', version: '0.1.0' };
// The values the templates ask for that cannot be worked out (COMPATIBILITY.md).
const askedFor = { license: 'GPL-3.0', testCommand: 'npm test', lineLength: 120, promptName: 'Migrate', promptPurpose: 'Move a database' };
const render = (template: string, variables: Record<string, unknown>, skillType?: string) =>
  client.renderTemplateDetailed(template, client.buildContext(variables, skillType));
let count = 0;
const target = () => {
  const dir = join(work, `target-${++count}`);
  mkdirSync(dir);
  return dir;
};

describe('renderer', () => {
  it('leaves GitHub Actions expressions exactly as written', () => {
    const source = readFileSync(join(SCAFFOLD, 'templates/.github/workflows/ci.yml.mustache'), 'utf-8');
    const expressions = source.match(/\$\{\{[^}]*\}\}/g);
    expect(expressions?.length).toBeGreaterThan(0);
    const { content } = render('ci.yml.mustache', { ...minimal, ...askedFor });
    expect(content.match(/\$\{\{[^}]*\}\}/g)).toEqual(expressions);
    expect(content).toContain('${{ matrix.os }}');
  });

  it('writes values literally, including $& and $1', () => {
    const value = `a $& b $1 "q" \\ ü ${'$'}{{ x }}`;
    expect(renderMustache('[{{v}}]', { v: value }).output).toBe(`[${value}]`);
  });

  it('escapes values for JSON targets so they parse back unchanged', () => {
    const description = 'Says "hi" \\ to $& and ü, then\nstops';
    const { content, missing } = render('package.json.mustache', { ...minimal, ...askedFor, repo_description: description });
    expect(missing).toEqual([]);
    expect(JSON.parse(content).description).toBe(description);
  });

  it('renders inverted sections, lists, objects and the current item', () => {
    const template = '{{#items}}- {{.}}\n{{/items}}{{^items}}none\n{{/items}}{{#people}}{{name}};{{/people}}{{#who}}{{name}}{{/who}}';
    expect(renderMustache(template, { items: ['a', 'b'], people: [{ name: 'x' }, { name: 'y' }], who: { name: 'z' } }).output).toBe(
      '- a\n- b\nx;y;z'
    );
    expect(renderMustache(template, { items: [] }).output).toBe('none\n');
    expect(renderMustache('{{a.b}}', { a: { b: 'c' } }).output).toBe('c');
  });

  it('removes lines that hold only a section tag or a comment', () => {
    const template = 'a\n  {{#on}}\nb\n  {{/on}}\n{{! note }}\nc\n';
    expect(renderMustache(template, { on: true }).output).toBe('a\nb\nc\n');
    expect(renderMustache(template, { on: false }).output).toBe('a\nc\n');
  });

  it('reports plain tags with no value, but not ones in a section that is off', () => {
    const { output, missing } = renderMustache('{{a}}-{{#on}}{{b}}{{/on}}-{{^on}}{{c}}{{/on}}', { on: false });
    expect(output).toBe('--');
    expect(missing).toEqual(['a', 'c']);
  });

  it.each([
    ['filter syntax', "{{license | default 'MIT'}}"],
    ['a partial', '{{> header}}'],
    ['a delimiter change', '{{=<% %>=}}'],
    ['an unclosed section', '{{#a}}x'],
    ['a mismatched close', '{{#a}}x{{/b}}'],
    ['an unclosed tag', '{{a'],
  ])('refuses %s', (_label, template) => {
    expect(() => renderMustache(template, { a: true })).toThrow();
  });

  it('refuses a list or object in a plain tag', () => {
    expect(() => renderMustache('{{a}}', { a: ['x'] })).toThrow(/section/);
  });
});

describe('variables (SC-D01)', () => {
  it('fills camelCase placeholders from snake_case names and config defaults', () => {
    const context = client.buildContext(minimal, 'cli');
    expect(context).toMatchObject({
      skillSlug: 'wp-db-migrate',
      skillDescription: 'Moves databases',
      authorName: 'LightSpeed',
      nodeVersion: '24',
      nodeMinVersion: '24.0.0',
      testCoverageThreshold: 80,
      branchPattern: String.raw`^(main|master|(dependabot|renovate)/.+|release/v?[0-9]+[.][0-9]+[.][0-9]+(-[a-z0-9]+)*|(feat|fix|hotfix|release|refactor|chore|task|doc|docs|test|perf|ci|build|deps|security|revert|research|design|a11y|ux|i18n|ops|proto|ds|api|schema|telemetry|content|seo|config|migrate|qa|uat|audit|codex|aiops|automation|epic)/[a-z0-9]+(-[a-z0-9]+)+)$`,
      branch_prefix: 'skill-',
      hasBatsTests: false,
      hasYamlLinting: false,
      skillName: 'WP DB Migrate',
      quickStartCommand: '/wp-db-migrate',
      skillType: 'cli',
      hasCLI: true,
      hasValidation: false,
      hasDocs: false,
    });
  });

  it('lets the caller override a default or a worked-out value', () => {
    const context = client.buildContext({ ...minimal, has_yaml: true, skillName: 'Migrator', min_node_version: '22.4.0' });
    expect(context).toMatchObject({ hasYamlLinting: true, skillName: 'Migrator', nodeVersion: '22', nodeMinVersion: '22.4.0' });
  });

  it('accepts lists and objects, but nothing that is not JSON data', () => {
    expect(client.validateVariables({ ...minimal, features: [{ title: 'a' }], faq: { q: 'x' } }).valid).toBe(true);
    expect(client.validateVariables({ ...minimal, bad: () => 1 }).valid).toBe(false);
  });
});

describe('templates (SC-F06)', () => {
  it('renders package.json from the required values and defaults', () => {
    const { content, missing } = render('package.json.mustache', { ...minimal, license: 'GPL-3.0' });
    expect(missing).toEqual([]);
    const pkg = JSON.parse(content);
    expect(pkg).toMatchObject({ name: 'wp-db-migrate', version: '0.1.0', author: 'LightSpeed', license: 'GPL-3.0' });
    expect(pkg.engines.node).toBe('>=24.0.0');
    expect(pkg.jest.coverageThreshold.global.lines).toBe(80);
  });

  it.each([true, false])('renders valid package.json with every optional flag set to %s', (on) => {
    const flags = { has_yaml: on, has_bats: on, has_shell: on, has_migrate: on, has_anthropic: on, hasProductionDeps: on };
    const pkg = JSON.parse(render('package.json.mustache', { ...minimal, ...flags, license: 'MIT' }).content);
    expect(pkg.scripts['lint:all'].includes('lint:yaml')).toBe(on);
    expect(pkg.scripts['test:all'].includes('test:bats')).toBe(on);
    expect('migrate:budget' in pkg.scripts).toBe(on);
    expect('@anthropic-ai/sdk' in pkg.dependencies).toBe(on);
  });

  it.each(['cli', 'validation', 'documentation', 'agent'])('renders every %s template without holes or invalid JSON', (skillType) => {
    for (const t of client.filterTemplates(skillType, [1, 2, 3])) {
      const { missing } = render(t.source, { ...minimal, ...askedFor }, skillType);
      expect({ file: t.target, missing }).toEqual({ file: t.target, missing: [] });
    }
  });

  it('measures coverage on the skill code, not on the tests', () => {
    const pkg = JSON.parse(render('package.json.mustache', { ...minimal, license: 'MIT' }).content);
    expect(pkg.jest.collectCoverageFrom).toEqual(expect.arrayContaining(['**/*.{js,cjs,mjs}', '!**/__tests__/**']));
    expect(pkg.jest.collectCoverageFrom).not.toContain('__tests__/**/*.test.js');
    for (const t of ['jest.config.js.strict.mustache', 'jest.config.js.esm.mustache']) {
      expect(render(t, { ...minimal, ...askedFor }).content).not.toContain("'__tests__/**/*.test.js',\n    '");
    }
  });

  it.each(['package.json.mustache', 'package.json.cli.mustache', 'package.json.validation.mustache'])(
    '%s lints with ESLint 10 flat config',
    (template) => {
      const pkg = JSON.parse(render(template, { ...minimal, ...askedFor }).content);
      expect(pkg.scripts['lint:js']).toBe('eslint .');
      expect(pkg.devDependencies).toHaveProperty('@eslint/js');
      expect(pkg.devDependencies).toHaveProperty('globals');
    }
  );

  it('renders eslint.config.cjs with the strict and browser options only when asked', () => {
    const plain = render('eslint.config.cjs.mustache', minimal).content;
    expect(plain).toContain("sourceType: 'commonjs'");
    expect(plain).not.toContain('globals.browser');
    expect(plain).not.toContain('no-var');
    const full = render('eslint.config.cjs.mustache', { ...minimal, strictMode: true, hasBrowserGlobals: true, useEsModules: true }).content;
    expect(full).toContain('...globals.browser');
    expect(full).toContain("'no-var': 'error'");
    expect(full).toContain("sourceType: 'module'");
  });

  it('checks only staged shell scripts, and lets shellcheck fail the commit', () => {
    const content = render('lefthook.yml.mustache', { ...minimal, has_shell: true }).content;
    expect(content).toContain('        shellcheck {staged_files}\n');
    expect(content).toContain('shellcheck is not installed');
    expect(content).not.toContain('|| true');
  });

  it('accepts LightSpeed branch names in the pre-push hook and rejects others', () => {
    const content = render('lefthook.yml.mustache', minimal).content;
    const pattern = new RegExp(content.match(/PATTERN='([^']+)'/)![1]);
    for (const ok of ['main', 'feat/blocks-add-hero', 'fix/import-null-check', 'release/v1.2.0', 'dependabot/npm/jest-30']) {
      expect({ ok, valid: pattern.test(ok) }).toEqual({ ok, valid: true });
    }
    for (const bad of ['develop', 'wp-db-', 'feature/x', 'feat/nohyphen', 'Feat/blocks-add', 'my-branch']) {
      expect({ bad, valid: pattern.test(bad) }).toEqual({ bad, valid: false });
    }
  });

  it('gives SKILL.md the frontmatter Claude Code needs to load it', () => {
    const { content } = render('SKILL.md.mustache', { ...minimal, ...askedFor, repo_description: 'Moves: "databases"' }, 'cli');
    expect(content.startsWith('---\nname: wp-db-migrate\ndescription: >-\n  Moves: "databases"\n---\n')).toBe(true);
  });
});

describe('static files and missing values over the server', () => {
  const mcp = new Client({ name: 'render-test', version: '1.0.0' });
  beforeAll(async () => {
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    await createServer(SCAFFOLD).connect(serverSide);
    await mcp.connect(clientSide);
  });
  afterAll(() => mcp.close());
  const json = async (name: string, args: Record<string, unknown>) =>
    JSON.parse(((await mcp.callTool({ name, arguments: args })) as { content: Array<{ text: string }> }).content[0].text);

  const staticFiles = ['.markdownlint.jsonc', '.prettierrc'];

  it('copies the manifest files byte for byte and keeps an existing one', async () => {
    const root = target();
    writeFileSync(join(root, '.prettierrc'), 'custom\n');
    const request = { repo_path: root, repo_name: 'wp-db-migrate', skill_type: 'cli', phases: '1', variables: { ...minimal, ...askedFor } };

    const preview = await json('scaffold_dry_run', request);
    expect(preview.success).toBe(true);
    const planned = Object.fromEntries(preview.proposedChanges.map((c: { file: string; action: string }) => [c.file, c.action]));
    expect(planned).toMatchObject({ 'eslint.config.cjs': 'create', '.markdownlint.jsonc': 'create', '.prettierrc': 'skip' });

    const applied = await json('scaffold_apply', request);
    expect(applied.success).toBe(true);
    for (const file of ['.markdownlint.jsonc']) {
      expect(readFileSync(join(root, file), 'utf-8')).toBe(readFileSync(join(SCAFFOLD, 'templates', file), 'utf-8'));
    }
    expect(readFileSync(join(root, '.prettierrc'), 'utf-8')).toBe('custom\n');
    expect(readdirSync(root)).toEqual(expect.arrayContaining(staticFiles));
  });

  it('lists the unfilled placeholders in the preview, and apply writes nothing', async () => {
    const root = target();
    const request = { repo_path: root, repo_name: 'wp-db-migrate', skill_type: 'cli', phases: '1', variables: minimal };

    const preview = await json('scaffold_dry_run', request);
    expect(preview.success).toBe(false);
    expect(preview.errors).toContainEqual(expect.objectContaining({ field: 'license', file: 'package.json' }));
    expect(preview.proposedChanges.length).toBeGreaterThan(0);

    const applied = await json('scaffold_apply', request);
    expect(applied.success).toBe(false);
    expect(applied.errors).toEqual(preview.errors);
    expect(readdirSync(root)).toEqual([]);
  });

  it('reports unfilled placeholders from template_render', async () => {
    const rendered = await json('template_render', { template_name: 'package.json.mustache', variables: minimal });
    expect(rendered.missing).toEqual(['license']);
  });
});
