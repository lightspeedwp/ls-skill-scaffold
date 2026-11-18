#!/usr/bin/env node

/**
 * skill-scaffold MCP Server
 * Enables Claude agents to invoke skill-scaffold operations as first-class tools
 */

import { resolve } from 'node:path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { ScaffoldClient, type PlanEntry } from './client/scaffold-client.ts';

/**
 * The scaffold folder templates are read from: SCAFFOLD_DIR, or this
 * repository's root (three folders up from mcp/server/src). Never the
 * process's working folder, which a client may set to anything.
 */
export const DEFAULT_SCAFFOLD_DIR = process.env.SCAFFOLD_DIR || resolve(import.meta.dirname, '../../..');

// Define all tools
const tools = [
  {
    name: 'scaffold_apply',
    description: 'Apply skill-scaffold templates to a repository.',
    inputSchema: {
      type: 'object',
      properties: {
        repo_path: { type: 'string' },
        repo_name: { type: 'string' },
        skill_type: { type: 'string', enum: ['cli', 'validation', 'documentation', 'agent'] },
        variables: { type: 'object' },
        dry_run: { type: 'boolean' },
        phases: { type: 'string', enum: ['1', '2', '3', 'all'] },
        overwrite: { type: 'boolean' },
      },
      required: ['repo_path', 'repo_name'],
    },
  },
  {
    name: 'scaffold_dry_run',
    description: 'Preview changes without writing files.',
    inputSchema: {
      type: 'object',
      properties: {
        repo_path: { type: 'string' },
        repo_name: { type: 'string' },
        skill_type: { type: 'string', enum: ['cli', 'validation', 'documentation', 'agent'] },
        variables: { type: 'object' },
        phases: { type: 'string', enum: ['1', '2', '3', 'all'] },
      },
      required: ['repo_path', 'repo_name'],
    },
  },
  {
    name: 'list_templates',
    description: 'List all skill-scaffold templates.',
    inputSchema: {
      type: 'object',
      properties: {
        skill_type: { type: 'string', enum: ['cli', 'validation', 'documentation', 'agent'] },
        phase: { type: 'string', enum: ['1', '2', '3', 'all'] },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  },
  {
    name: 'list_variants',
    description: 'List template variants for a skill type.',
    inputSchema: {
      type: 'object',
      properties: {
        skill_type: { type: 'string', enum: ['cli', 'validation', 'documentation', 'agent'] },
        phases: { type: 'array', items: { type: 'number' } },
      },
      required: ['skill_type'],
    },
  },
  {
    name: 'template_render',
    description: 'Render a Mustache template.',
    inputSchema: {
      type: 'object',
      properties: {
        template_name: { type: 'string' },
        variables: { type: 'object' },
      },
      required: ['template_name', 'variables'],
    },
  },
  {
    name: 'validate_variables',
    description: 'Validate variables against requirements.',
    inputSchema: {
      type: 'object',
      properties: {
        skill_type: { type: 'string', enum: ['cli', 'validation', 'documentation', 'agent'] },
        variables: { type: 'object' },
      },
      required: ['skill_type', 'variables'],
    },
  },
  {
    name: 'skill_info',
    description: 'Get metadata about skill-scaffold.',
    inputSchema: { type: 'object', properties: {} },
  },
];

/**
 * Create the MCP server.
 *
 * @param scaffoldDir Folder templates are read from.
 * @returns Server, not yet connected.
 */
export function createServer(scaffoldDir: string = DEFAULT_SCAFFOLD_DIR): Server {
  const scaffoldClient = new ScaffoldClient(scaffoldDir);
  const server = new Server({ name: 'skill-scaffold', version: '1.0.0' }, { capabilities: { tools: {} } });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    const text = (result: string) => ({ content: [{ type: 'text' as const, text: result }] });

    try {
      switch (name) {
        case 'scaffold_apply':
          return text(await handleScaffoldApply(scaffoldClient, args));
        case 'scaffold_dry_run':
          return text(await handleScaffoldDryRun(scaffoldClient, args));
        case 'list_templates':
          return text(await handleListTemplates(scaffoldClient, args));
        case 'list_variants':
          return text(await handleListVariants(scaffoldClient, args));
        case 'template_render':
          return text(await handleTemplateRender(scaffoldClient, args));
        case 'validate_variables':
          return text(await handleValidateVariables(scaffoldClient, args));
        case 'skill_info':
          return text(await handleSkillInfo());
        default:
          return { ...text(`Unknown tool: ${name}`), isError: true };
      }
    } catch (error) {
      return { ...text(`Error: ${error instanceof Error ? error.message : String(error)}`), isError: true };
    }
  });

  return server;
}

/**
 * The templates a request selects.
 *
 * @param client Scaffold client.
 * @param args   Request arguments.
 * @returns Templates.
 */
function selectTemplates(client: ScaffoldClient, args: any) {
  // Phase semantics are unchanged here (omitted means phase 3); see LS-4748 SC-F07.
  const phaseNum = args.phases === 'all' ? undefined : parseInt(args.phases || '3');
  return client.filterTemplates(args.skill_type, phaseNum ? [phaseNum] : [1, 2, 3]);
}

/**
 * Validate the request and plan it, without writing.
 *
 * @param client Scaffold client.
 * @param args   Request arguments.
 * @returns The target root and plan, or the validation errors.
 */
function planRequest(
  client: ScaffoldClient,
  args: any
): { errors: Array<{ field?: string; file?: string; error: string }> } | { root: string; plan: PlanEntry[] } {
  const validation = client.validateVariables({ repo_name: args.repo_name, ...args.variables });
  if (!validation.valid) {
    return { errors: validation.errors };
  }
  const root = client.resolveTargetRoot(args.repo_path);
  const overwrite = typeof args.overwrite === 'boolean' ? args.overwrite : undefined;
  return { root, plan: client.planApply(root, selectTemplates(client, args), overwrite) };
}

async function handleScaffoldApply(client: ScaffoldClient, args: any): Promise<string> {
  if (args.dry_run) {
    return handleScaffoldDryRun(client, args);
  }
  const planned = planRequest(client, args);
  if ('errors' in planned) {
    return JSON.stringify({ success: false, errors: planned.errors }, null, 2);
  }
  const { root, plan } = planned;
  const variables = { repo_name: args.repo_name, ...args.variables };
  const toWrite = plan.filter((entry) => entry.action !== 'skip');
  const skipped = plan.filter((entry) => entry.action === 'skip');

  // Render everything first, so a template error writes nothing.
  const errors: Array<{ file: string; error: string }> = [];
  const rendered = new Map<string, string>();
  for (const entry of toWrite) {
    try {
      rendered.set(entry.file, client.renderTemplate(entry.source, variables));
    } catch (error) {
      errors.push({ file: entry.file, error: error instanceof Error ? error.message : String(error) });
    }
  }

  const written: Array<{ file: string; action: string }> = [];
  if (errors.length === 0) {
    for (const entry of toWrite) {
      try {
        client.writeFile(root, entry.file, rendered.get(entry.file) as string, entry.action as 'create' | 'overwrite');
        written.push({ file: entry.file, action: entry.action });
      } catch (error) {
        errors.push({ file: entry.file, error: error instanceof Error ? error.message : String(error) });
        break;
      }
    }
  }
  const done = new Set(written.map((entry) => entry.file));
  const notWritten = toWrite.filter((entry) => !done.has(entry.file));

  return JSON.stringify(
    {
      success: errors.length === 0,
      repoPath: root,
      filesWritten: written.length,
      filesSkipped: skipped.length,
      written,
      skipped: skipped.map(({ file, reason }) => ({ file, reason })),
      notWritten: errors.length ? notWritten.map((entry) => entry.file) : undefined,
      coverage: Math.round((written.length / (written.length + plan.length || 1)) * 100),
      summary: errors.length
        ? `Stopped after ${written.length} of ${toWrite.length} files`
        : `Applied ${written.length} templates, skipped ${skipped.length}`,
      errors: errors.length > 0 ? errors : undefined,
    },
    null,
    2
  );
}

async function handleScaffoldDryRun(client: ScaffoldClient, args: any): Promise<string> {
  const planned = planRequest(client, args);
  if ('errors' in planned) {
    return JSON.stringify({ success: false, errors: planned.errors }, null, 2);
  }
  const { root, plan } = planned;
  const count = (action: string) => plan.filter((entry) => entry.action === action).length;
  return JSON.stringify(
    {
      success: true,
      repoPath: root,
      proposedChanges: plan.map(({ file, action, phase, reason }) => ({ file, action, phase, ...(reason && { reason }) })),
      totalFiles: plan.length,
      summary: `Would create ${count('create')}, overwrite ${count('overwrite')} and skip ${count('skip')} files`,
    },
    null,
    2
  );
}

async function handleListTemplates(scaffoldClient: ScaffoldClient, args: any): Promise<string> {
  const phaseNum = args.phase === 'all' ? undefined : (args.phase ? parseInt(args.phase) : undefined);
  const templates = scaffoldClient.filterTemplates(args.skill_type, phaseNum ? [phaseNum] : undefined);

  const page = Math.max(1, args.page || 1);
  const limit = Math.min(100, Math.max(1, args.limit || 25));
  const start = (page - 1) * limit;

  return JSON.stringify(
    {
      templates: templates.slice(start, start + limit),
      total: templates.length,
      page,
      pages: Math.ceil(templates.length / limit),
    },
    null,
    2
  );
}

async function handleListVariants(scaffoldClient: ScaffoldClient, args: any): Promise<string> {
  const variants = scaffoldClient.getVariants(args.skill_type, args.phases);
  const variantArray = Array.from(variants.entries()).map(([tag, temps]) => ({
    tag,
    templates: temps.map((t) => t.name),
    phase: temps[0]?.phase || 1,
  }));

  return JSON.stringify({ skillType: args.skill_type, variants: variantArray }, null, 2);
}

async function handleTemplateRender(scaffoldClient: ScaffoldClient, args: any): Promise<string> {
  try {
    const content = scaffoldClient.renderTemplate(args.template_name, args.variables || {});
    return JSON.stringify(
      { success: true, content, lines: content.split('\n').length, preview: content.substring(0, 500) },
      null,
      2
    );
  } catch (error) {
    return JSON.stringify({ success: false, error: String(error) }, null, 2);
  }
}

async function handleValidateVariables(scaffoldClient: ScaffoldClient, args: any): Promise<string> {
  const schema = scaffoldClient.getVariableSchema();
  const validation = scaffoldClient.validateVariables(args.variables || {});

  return JSON.stringify(
    {
      valid: validation.valid,
      required: schema.required.map((name) => ({ name, provided: name in (args.variables || {}) })),
      optional: Object.entries(schema.optional).map(([name]) => ({
        name,
        provided: name in (args.variables || {}),
      })),
      errors: validation.errors,
    },
    null,
    2
  );
}

async function handleSkillInfo(): Promise<string> {
  return JSON.stringify(
    {
      name: 'skill-scaffold',
      version: '1.0.0',
      coverage: { phase1: 90, phase2: 95, phase3: 98, overall: 98 },
      templates: { total: 24, variants: 28 },
      skillTypes: [
        { type: 'cli', coverage: 98 },
        { type: 'validation', coverage: 95 },
        { type: 'documentation', coverage: 90 },
        { type: 'agent', coverage: 98 },
      ],
    },
    null,
    2
  );
}

async function main() {
  const transport = new StdioServerTransport();
  await createServer().connect(transport);
  console.error('[skill-scaffold MCP Server] Connected and ready');
}

// Start only when run directly, not when imported by the tests.
if (import.meta.main) {
  main().catch((error) => {
    console.error('[skill-scaffold MCP Server] Fatal error:', error);
    process.exit(1);
  });
}
