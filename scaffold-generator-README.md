# scaffold-generator

**Generate complete skill boilerplate from templates in seconds using the skill-scaffold MCP server.**

Guides new users step-by-step or runs fast for power users. Always previews before writing. Real-time validation, smart defaults, zero surprises.

**Status:** Phase 4.4 | **Version:** 0.1.0 | **License:** MIT

---

## Quick Start

### 👤 First-Time User
```
"Help me create my first CLI skill"
```
↓ Claude guides you through skill type, phases, variables, then shows a preview ↓
```
✅ Skill scaffold created at /your/path
```

### ⚡ Experienced User
```
"Generate validation skill: repo_name=my-validator, author=Ash, phases=1-2"
```
↓ Validates all variables, shows preview ↓
```
✅ Skill scaffold created instantly
```

---

## What It Does

- **Smart Interaction** — Conversational for learners, fast form-mode for experts
- **Real-Time Validation** — Catches errors immediately, suggests fixes
- **Preview-First** — Shows exactly what will be created before any files are written
- **Template-Powered** — Uses skill-scaffold MCP server for templates, schemas, and metadata
- **Coverage Reporting** — Shows which templates apply to your skill type
- **Safe Defaults** — Suggests sensible starting values, explains constraints

---

## Documentation Map

Start here based on what you need:

| I want to... | Read this |
|---|---|
| **Understand what this skill does** | [SKILL.md](SKILL.md) |
| **Learn the interaction modes** | [docs/interaction-modes.md](docs/interaction-modes.md) |
| **See real examples** | [docs/examples.md](docs/examples.md) |
| **Understand the architecture** | [docs/architecture.md](docs/architecture.md) |
| **Integrate with MCP server** | [docs/mcp-integration.md](docs/mcp-integration.md) |
| **Troubleshoot issues** | [docs/troubleshooting.md](docs/troubleshooting.md) |
| **View the API reference** | [docs/api.md](docs/api.md) |

---

## Sub-Skills (For Advanced Use)

This skill is built from 5 reusable Python modules that can run independently:

| Module | Purpose |
|--------|---------|
| `scaffold_discover` | List available templates, filter by type/phase |
| `scaffold_validate` | Validate variables against template schema |
| `scaffold_preview` | Show dry-run (proposed files, paths, substitutions) |
| `scaffold_apply` | Write files to disk with overwrite protection |
| `scaffold_generator` | Orchestrate full workflow (conversational or form mode) |

**Most users use the main `scaffold-generator` skill.** Use sub-skills if you need fine-grained control over specific steps. See [docs/architecture.md](docs/architecture.md) for API details.

---

## Requirements

- **MCP Server** (required): skill-scaffold MCP server running locally or accessible
- **Storage**: Write access to target repository directory
- **Optional**: Python 3.8+ for helper scripts, Node.js v24+ to run MCP server locally

---

## Troubleshooting

**MCP server won't connect?** → Start it with: `npx @modelcontextprotocol/inspector node /path/to/server/dist/index.js`

**Variable validation failed?** → Check the error message. Common issues: repo_name must be lowercase with hyphens, version must be semantic (1.0.0).

**Files not written?** → Check file permissions on target directory. Use `overwrite=false` by default (safe, won't overwrite existing files).

See [SKILL.md Troubleshooting](SKILL.md#troubleshooting) for more.

---

## For Developers

- **Development**: [CLAUDE.md](CLAUDE.md)
- **Tests**: [tests/README.md](tests/README.md)
- **Helper scripts**: [scripts/README.md](scripts/README.md)
- **Architecture**: [docs/architecture.md](docs/architecture.md)
- **API Reference**: [docs/api.md](docs/api.md)

---

## Next Steps

- ✅ [Understand interaction modes](docs/interaction-modes.md)
- ✅ [See real examples](docs/examples.md)
- ✅ [Explore the API](docs/api.md)
- ✅ [Review the architecture](docs/architecture.md)