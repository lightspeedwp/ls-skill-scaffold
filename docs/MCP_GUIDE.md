# skill-scaffold MCP Integration Guide

## Overview

The **skill-scaffold MCP Server** enables Claude agents to invoke skill-scaffold template operations as first-class tools through the Model Context Protocol (MCP). This guide covers setup, tool descriptions, examples, and best practices for integrating with Claude or other MCP clients.

---

## Quick Start

### Requirements

Node.js 24 or later. Node runs the TypeScript sources in `mcp/server/src/` directly (type stripping), so there is no build step and no `dist/` folder.

### Installation

```bash
cd mcp/server
npm install
```

### Running the Server

```bash
# Standard mode (stdio transport), from any folder
node /path/to/ls-skill-scaffold/mcp/server/src/index.ts

# Or, inside mcp/server
npm start
```

Templates are read from the repository root (the folder that holds `scaffold.config.json`), found from the server's own location. Set `SCAFFOLD_DIR` only to read templates from another checkout; it must point at that checkout's root, not its `templates/` folder.

### Configuration in Claude Code or Claude Desktop

Claude Code (user scope):

```bash
claude mcp add --scope user skill-scaffold -- node /path/to/ls-skill-scaffold/mcp/server/src/index.ts
```

Claude Desktop (`claude_desktop_config.json`), or a project `.mcp.json`:

```json
{
  "mcpServers": {
    "skill-scaffold": {
      "command": "node",
      "args": ["/path/to/ls-skill-scaffold/mcp/server/src/index.ts"]
    }
  }
}
```

Claude Desktop starts servers with a minimal `PATH`; if `node` is not found, use the absolute path to Node 24 as `command`.

### Testing with MCP Inspector

```bash
npx @modelcontextprotocol/inspector node /path/to/ls-skill-scaffold/mcp/server/src/index.ts
```

### Tests

```bash
cd mcp/server
npm test
```

Vitest 5.1.0 with V8 coverage (`text`, `json-summary` and `lcov` reports, no threshold). The tests read templates from this repository and write only to temporary folders.

---

## Tools Overview

The MCP server exposes **7 tools** for managing skill-scaffold templates:

| Tool | Purpose | Read-Only |
|------|---------|-----------|
| `scaffold_apply` | Apply templates to a repository | No |
| `scaffold_dry_run` | Preview template changes without writing | Yes |
| `list_templates` | Discover all available templates | Yes |
| `list_variants` | Find template variants by skill type | Yes |
| `template_render` | Render a single template with variables | Yes |
| `validate_variables` | Check variables against schema requirements | Yes |
| `skill_info` | Get server and skill metadata | Yes |

---

## Tool Specifications

### `scaffold_apply`

**Apply skill-scaffold templates to a repository.**

**Parameters:**
- `repo_path` (string, required): Absolute path to an existing folder outside this scaffold. It is refused if it is relative, contains `..`, is the filesystem root or your home folder, or is inside the scaffold. Templates are written under it, never anywhere else.
- `repo_name` (string, required): Repository name for template interpolation
- `skill_type` (enum, optional): Filter templates by skill type (`cli`, `validation`, `documentation`, `agent`). Every template without a variant is always included; a skill type adds only the variants tagged for it (`package.json:cli`, `package.json:validation`, `package.json:docs` for `documentation`). Without a skill type, every template is selected.
- `variables` (object, optional): Custom variables for template rendering
- `dry_run` (boolean, optional, default=false): Return the `scaffold_dry_run` plan instead of writing
- `phases` (enum, optional): Restrict to phases (`1`, `2`, `3`, `all`). Omitted means phase `3` only; pass `all` for every phase.
- `overwrite` (boolean, optional): What happens to files that already exist:
  - `true`: every selected file that exists is replaced;
  - `false`: no existing file is replaced, whatever the manifest says;
  - omitted: the manifest's per-template `overwrite` decides (`scaffold.config.json`).

  Missing files are always created. Files the plan does not select are never touched.

**Safety:**
- Writes never follow links: if a folder on the way to a target is a symbolic link, the request fails. `.git` paths are never written.
- Every template is rendered before anything is written, so a template error writes nothing.
- A file planned as `create` is written exclusively: if one appeared since the plan, it is not replaced. An `overwrite` is written to a temporary file and renamed into place.

**Returns:**
```json
{
  "success": true,
  "repoPath": "/path/to/my-repo",
  "filesWritten": 5,
  "filesSkipped": 2,
  "written": [{ "file": "lefthook.yml", "action": "overwrite" }],
  "skipped": [{ "file": "SKILL.md", "reason": "exists; the request sets overwrite: false" }],
  "coverage": 71,
  "summary": "Applied 5 templates, skipped 2"
}
```

On a write failure, `success` is `false`, `errors` names the file, and `notWritten` lists the planned files that were not written.

**Example:**
```json
{
  "name": "scaffold_apply",
  "arguments": {
    "repo_path": "/path/to/my-repo",
    "repo_name": "my-api-service",
    "skill_type": "cli",
    "phases": "2",
    "variables": {
      "author": "Claude",
      "license": "MIT"
    },
    "overwrite": false
  }
}
```

---

### `scaffold_dry_run`

**Preview changes without writing files.**

**Parameters:**
- `repo_path`, `repo_name`, `skill_type`, `variables`, `phases`, `overwrite`: as for `scaffold_apply`

It validates the variables and the target exactly as `scaffold_apply` does, and checks what is already in the target, so each file's `action` is what `scaffold_apply` will do with the same arguments: `create`, `overwrite` or `skip` (with a `reason`). It writes nothing. File contents are not included; use `template_render` for one file's content.

**Returns:**
```json
{
  "success": true,
  "repoPath": "/path/to/my-repo",
  "proposedChanges": [
    { "file": "package.json", "action": "create", "phase": 1 },
    { "file": "SKILL.md", "action": "skip", "phase": 2, "reason": "exists; the manifest does not allow replacing it" }
  ],
  "totalFiles": 2,
  "summary": "Would create 1, overwrite 0 and skip 1 files"
}
```

**Example:**
```json
{
  "name": "scaffold_dry_run",
  "arguments": {
    "repo_path": "/path/to/my-repo",
    "repo_name": "test-skill",
    "skill_type": "validation",
    "phases": "1"
  }
}
```

---

### `list_templates`

**List all available templates with pagination.**

**Parameters:**
- `skill_type` (enum, optional): Filter by skill type
- `phase` (enum, optional): Filter by phase
- `page` (number, optional, default=1): Pagination page number
- `limit` (number, optional, default=25): Results per page (max 100)

**Returns:**
```json
{
  "templates": [
    {
      "name": "cli-handler.ts",
      "source": "templates/cli/handler.ts.mustache",
      "target": "src/cli/handler.ts",
      "phase": 1,
      "overwrite": false,
      "required": ["repo_name", "handler_name"],
      "variant": "ts-handler"
    }
  ],
  "total": 24,
  "page": 1,
  "pages": 1
}
```

**Example:**
```json
{
  "name": "list_templates",
  "arguments": {
    "skill_type": "cli",
    "phase": "1",
    "page": 1,
    "limit": 10
  }
}
```

---

### `list_variants`

**Find template variants organized by skill type.**

**Parameters:**
- `skill_type` (string, required): The skill type to list variants for
- `phases` (array, optional): Filter to specific phase numbers

**Returns:**
```json
{
  "skillType": "agent",
  "variants": [
    {
      "tag": "tool-handler",
      "templates": [
        "agent-tool-handler.ts",
        "agent-tool-schema.ts"
      ],
      "phase": 1
    }
  ]
}
```

**Example:**
```json
{
  "name": "list_variants",
  "arguments": {
    "skill_type": "agent",
    "phases": [1, 2]
  }
}
```

---

### `template_render`

**Render a single template with provided variables.**

**Parameters:**
- `template_name` (string, required): Template filename (e.g., `handler.ts`)
- `variables` (object, required): Variables for Mustache rendering

**Returns:**
```json
{
  "success": true,
  "content": "// Rendered template content...",
  "lines": 45,
  "preview": "// Rendered template content...[first 500 chars]"
}
```

**Example:**
```json
{
  "name": "template_render",
  "arguments": {
    "template_name": "cli-handler.ts.mustache",
    "variables": {
      "repo_name": "my-cli",
      "handler_name": "processCommand"
    }
  }
}
```

---

### `validate_variables`

**Validate variables against skill schema requirements.**

**Parameters:**
- `skill_type` (string, required): The skill type to validate against
- `variables` (object, required): Variables to validate

**Returns:**
```json
{
  "valid": false,
  "required": [
    {
      "name": "repo_name",
      "provided": true
    },
    {
      "name": "author",
      "provided": false
    }
  ],
  "optional": [
    {
      "name": "license",
      "provided": false
    }
  ],
  "errors": [
    {
      "field": "author",
      "error": "Required field missing"
    }
  ]
}
```

**Example:**
```json
{
  "name": "validate_variables",
  "arguments": {
    "skill_type": "cli",
    "variables": {
      "repo_name": "my-cli",
      "author": "Claude"
    }
  }
}
```

---

### `skill_info`

**Get metadata about the skill-scaffold server.**

**Parameters:** None

**Returns:**
```json
{
  "name": "skill-scaffold",
  "version": "1.0.0",
  "coverage": {
    "phase1": 90,
    "phase2": 95,
    "phase3": 98,
    "overall": 98
  },
  "templates": {
    "total": 24,
    "variants": 28
  },
  "skillTypes": [
    {
      "type": "cli",
      "coverage": 98
    },
    {
      "type": "validation",
      "coverage": 95
    },
    {
      "type": "documentation",
      "coverage": 90
    },
    {
      "type": "agent",
      "coverage": 98
    }
  ]
}
```

**Example:**
```json
{
  "name": "skill_info",
  "arguments": {}
}
```

---

## Common Workflows

### Workflow 1: Discover and Apply Templates

1. Call `skill_info()` to understand available templates
2. Call `list_templates(skill_type: "cli")` to find CLI templates
3. Call `validate_variables()` with your variables
4. Call `scaffold_dry_run()` to preview changes
5. Call `scaffold_apply()` to apply templates

### Workflow 2: Explore Variants

1. Call `list_variants(skill_type: "agent", phases: [1, 2])`
2. For each variant, call `template_render()` to see the output
3. Use results to decide which variant to apply

### Workflow 3: Audit Existing Repository

1. Call `list_templates()` to see all available templates
2. Manually check which files already exist in your repo
3. Call `scaffold_dry_run()` with `overwrite: false` to see what would be skipped
4. Call `scaffold_apply()` with `overwrite: false` to safely apply new templates

---

## Security & Best Practices

### Path Containment
- All template targets are resolved relative to `repo_path`
- Path traversal attempts (e.g., `../../../etc/passwd`) are rejected
- Symlink resolution prevents breakout attacks

### Overwrite Protection
- `overwrite: false` (default) skips existing files
- Template-level overwrite flags can allow strategic overwrites
- Always dry-run first to preview changes

### Variable Safety
- Variables are validated against schema requirements
- Mustache templates prevent code injection
- Required and optional fields are clearly documented

### Audit Trail
- Success/error counts returned for every operation
- Failed operations include detailed error messages
- Dry-run mode allows zero-risk exploration

---

## Error Handling

All tools return structured error responses:

```json
{
  "success": false,
  "errors": [
    {
      "file": "src/handler.ts",
      "error": "File already exists and overwrite is false"
    }
  ]
}
```

Common errors:
- **File already exists** — Set `overwrite: true` or skip manually
- **Missing required variables** — Call `validate_variables()` first
- **Path traversal detected** — Use relative paths within repo
- **Template not found** — Call `list_templates()` to verify name

---

## Integration Examples

### Claude Agent Example

```typescript
// Pseudo-code: Claude agent using skill-scaffold MCP

const client = new MCPClient("skill-scaffold");

// 1. Discover available templates
const info = await client.call("skill_info");
console.log(`Available: ${info.templates.total} templates`);

// 2. Filter and preview
const dryRun = await client.call("scaffold_dry_run", {
  repo_path: "/my/repo",
  repo_name: "my-service",
  skill_type: "agent"
});
console.log(`Would create: ${dryRun.proposedChanges.length} files`);

// 3. Apply templates
const result = await client.call("scaffold_apply", {
  repo_path: "/my/repo",
  repo_name: "my-service",
  skill_type: "agent",
  variables: { author: "Claude" }
});
console.log(`Created: ${result.filesWritten} files`);
```

### MCP Inspector Test

```bash
# Start MCP Inspector
npx @modelcontextprotocol/inspector node /path/to/ls-skill-scaffold/mcp/server/src/index.ts

# In the Inspector UI, test tools:
# 1. skill_info (no arguments)
# 2. list_templates with {"skill_type": "cli"}
# 3. validate_variables with {"skill_type": "cli", "variables": {"repo_name": "test"}}
# 4. scaffold_dry_run with full arguments
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Server won't start | Check `SCAFFOLD_DIR` env var points to valid templates directory |
| Tools not listed | Rebuild: `npm run build` then restart server |
| File overwrite errors | Set `overwrite: true` or manually delete conflicting files |
| Variable validation fails | Call `validate_variables()` to see missing/invalid fields |
| Path traversal rejection | Use relative paths; don't include `../` sequences |

---

## Performance Notes

- **First call to a tool**: ~50–100ms (template loading + caching)
- **Subsequent calls**: <10ms (cached templates)
- **Large templates**: Rendering scales linearly with template size
- **Pagination**: Default limit 25; use limit ≤100 for best performance

---

## Version & Compatibility

- **skill-scaffold MCP**: v1.0.0
- **MCP SDK**: v1.32.2 (TypeScript)
- **Node.js**: ≥24.0.0
- **Transport**: stdio (local development)

---

## Support & Feedback

For issues, feature requests, or contributions:
- Check the [skill-scaffold repository](https://github.com/lightspeedwp/skill-scaffold)
- Review `mcp/server/README.md` for development details
- Test with MCP Inspector: `npx @modelcontextprotocol/inspector`

---

**Last Updated**: 2026-10-31  
**Maintained By**: LightSpeed WP Team  
**License**: MIT
