#!/usr/bin/env node

/**
 * skill-scaffold MCP Server
 * Enables Claude agents to invoke skill-scaffold operations as first-class tools
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ToolSchema } from '@modelcontextprotocol/sdk/types.js';

import { ScaffoldClient } from './client/scaffold-client.js';

// Initialize MCP Server
const server = new Server({
  name: 'skill-scaffold',
  version: '1.0.0',
});

// Initialize Scaffold Client
const scaffoldClient = new ScaffoldClient(process.env.SCAFFOLD_DIR || process.cwd());

// Define all tools
const tools: any[] = [
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

// Register tools list handler
server.setRequestHandler(ToolSchema as any, async () => ({
  tools,
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'scaffold_apply': {
        const result = await handleScaffoldApply(args as any);
        return { content: [{ type: 'text', text: result }] };
      }
      case 'scaffold_dry_run': {
        const result = await handleScaffoldDryRun(args as any);
        return { content: [{ type: 'text', text: result }] };
      }
      case 'list_templates': {
        const result = await handleListTemplates(args as any);
        return { content: [{ type: 'text', text: result }] };
      }
      case 'list_variants': {
        const result = await handleListVariants(args as any);
        return { content: [{ type: 'text', text: result }] };
      }
      case 'template_render': {
        const result = await handleTemplateRender(args as any);
        return { content: [{ type: 'text', text: result }] };
      }
      case 'validate_variables': {
        const result = await handleValidateVariables(args as any);
        return { content: [{ type: 'text', text: result }] };
      }
      case 'skill_info': {
        const result = await handleSkillInfo();
        return { content: [{ type: 'text', text: result }] };
      }
      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
    }
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error}`, isError: true }] };
  }
});

async function handleScaffoldApply(args: any): Promise<string> {
  const validation = scaffoldClient.validateVariables({ repo_name: args.repo_name, ...args.variables });
  if (!validation.valid) {
    return JSON.stringify({ success: false, errors: validation.errors }, null, 2);
  }

  const phaseNum = args.phases === 'all' ? undefined : parseInt(args.phases || '3');
  const templates = scaffoldClient.filterTemplates(args.skill_type, phaseNum ? [phaseNum] : [1, 2, 3]);

  let filesWritten = 0;
  const errors = [];

  for (const template of templates) {
    try {
      const rendered = scaffoldClient.renderTemplate(template.source.split('/').pop() || '', {
        repo_name: args.repo_name,
        ...args.variables,
      });

      if (!args.dry_run) {
        const targetPath = `${args.repo_path}/${template.target}`;
        const exists = scaffoldClient.fileWouldBeOverwritten(targetPath);

        // Skip if file exists and overwrite not allowed
        if (exists && !args.overwrite && !template.overwrite) {
          continue;
        }

        scaffoldClient.writeFile(targetPath, rendered, args.overwrite || template.overwrite);
        filesWritten++;
      } else {
        filesWritten++;
      }
    } catch (error) {
      errors.push({ file: template.target, error: String(error) });
    }
  }

  return JSON.stringify(
    {
      success: errors.length === 0,
      filesWritten,
      coverage: Math.round((filesWritten / (filesWritten + templates.length || 1)) * 100),
      summary: `Applied ${filesWritten} templates`,
      errors: errors.length > 0 ? errors : undefined,
    },
    null,
    2
  );
}

async function handleScaffoldDryRun(args: any): Promise<string> {
  const phaseNum = args.phases === 'all' ? undefined : parseInt(args.phases || '3');
  const templates = scaffoldClient.filterTemplates(args.skill_type, phaseNum ? [phaseNum] : [1, 2, 3]);

  return JSON.stringify(
    {
      success: true,
      proposedChanges: templates.map((t) => ({ file: t.target, action: 'create', phase: t.phase })),
      totalFiles: templates.length,
      summary: `Would apply ${templates.length} templates`,
    },
    null,
    2
  );
}

async function handleListTemplates(args: any): Promise<string> {
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

async function handleListVariants(args: any): Promise<string> {
  const variants = scaffoldClient.getVariants(args.skill_type, args.phases);
  const variantArray = Array.from(variants.entries()).map(([tag, temps]) => ({
    tag,
    templates: temps.map((t) => t.name),
    phase: temps[0]?.phase || 1,
  }));

  return JSON.stringify({ skillType: args.skill_type, variants: variantArray }, null, 2);
}

async function handleTemplateRender(args: any): Promise<string> {
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

async function handleValidateVariables(args: any): Promise<string> {
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
  await server.connect(transport);
  console.error('[skill-scaffold MCP Server] Connected and ready');
}

main().catch((error) => {
  console.error('[skill-scaffold MCP Server] Fatal error:', error);
  process.exit(1);
});
