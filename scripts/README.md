# Scripts

## Overview

| Script | Purpose |
|--------|---------|
| `apply-scaffold.sh` | Apply the scaffold templates to a repository from the command line |

Run `bash scripts/apply-scaffold.sh --help` for its options.

## Where the other steps live

Template discovery, variable validation, preview and apply are tools on the MCP server in `mcp/server/`:

| Step | MCP tool |
|------|----------|
| List templates | `list_templates`, `list_variants` |
| Validate variables | `validate_variables` |
| Preview | `scaffold_dry_run` |
| Apply | `scaffold_apply` |

`SKILL.md` tells Claude when to call each one. See [../docs/MCP_GUIDE.md](../docs/MCP_GUIDE.md) to start the server.

The Python helper scripts that used to sit here were removed (LS-4748). They only ever talked to a built-in mock, so they never read templates or wrote files, and nothing called them.
