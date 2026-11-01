# scaffold-generator

**Generate skill files interactively from templates using the skill-scaffold MCP server.**

Create new skills in seconds with guided variable input, real-time validation, and preview-before-write workflow.

**Status:** Phase 4.4 - Under Development | **Version:** 0.1.0 | **License:** MIT

---

## 🚀 Quick Start (2 minutes)

### For First-Time Users
Tell the skill what you want to create:
```
"Help me create my first CLI skill"
```
Claude will guide you step-by-step, asking for variables and confirming before writing.

### For Experienced Users
Provide all details upfront:
```
"Generate a cli skill: repo_name=my-cli, author=Claude, phases=1-2"
```
The skill validates and creates files instantly.

**Result:** Ready-to-use skill file structure with templates, tests, and docs.

---

## What This Skill Does

| Feature | Benefit |
|---------|---------|
| 🎯 **Interactive Generation** | Creates complete skill file structure from templates |
| 🔍 **Smart Mode Selection** | Conversational for learners, form-based for power users |
| ✅ **Variable Validation** | Catches errors in real-time with helpful suggestions |
| 👁️ **Preview-First Workflow** | Always shows dry-run before writing to disk |
| 📊 **Coverage Reporting** | Shows what templates apply to your skill type |
| 🔗 **MCP-Powered** | Uses skill-scaffold MCP server for templates and schemas |

---

## How It Works

```
1. You describe the skill → 2. Select templates → 3. Enter variables →
4. Preview files → 5. Confirm → 6. Files written to disk
```

All steps include validation, suggestions, and error handling.

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

## The Architecture: Sub-Skills

This skill is built from 5 focused, reusable sub-skills:

| Skill | Purpose | Use When |
|-------|---------|----------|
| **scaffold-discover** | List templates and metadata | "What templates are available?" |
| **scaffold-validate** | Validate variables | "Are these variables correct?" |
| **scaffold-preview** | Show dry-run preview | "Show me what this will create" |
| **scaffold-apply** | Write files to disk | "Generate the skill files" |
| **scaffold-generator** | Orchestrate full workflow | "Create my skill" |

Each can be used independently. See [docs/architecture.md](docs/architecture.md) for details.

---

## Requirements

- **MCP Server** (required): skill-scaffold MCP server running locally or accessible
- **Storage**: Write access to target repository directory
- **Optional**: Python 3.8+ for helper scripts, Node.js v24+ to run MCP server locally

---

## Getting Help

| Problem | Solution |
|---------|----------|
| **MCP server won't connect** | See [docs/troubleshooting.md#mcp-connection](docs/troubleshooting.md#mcp-connection) |
| **Variable validation fails** | Check [docs/api.md#validate-variables](docs/api.md#validate-variables) |
| **Files not written** | Review [docs/troubleshooting.md#file-writing](docs/troubleshooting.md#file-writing) |

---

## For Developers

- **Development setup**: [CLAUDE.md](CLAUDE.md)
- **Contributing**: See [CLAUDE.md](CLAUDE.md)
- **Version history**: [CHANGELOG.md](CHANGELOG.md)
- **Test cases**: [tests/README.md](tests/README.md)
- **Helper scripts**: [scripts/README.md](scripts/README.md)

---

## Next Steps

- ✅ [Understand interaction modes](docs/interaction-modes.md)
- ✅ [See real examples](docs/examples.md)
- ✅ [Explore the API](docs/api.md)
- ✅ [Review the architecture](docs/architecture.md)