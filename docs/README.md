# Documentation

Complete guides and references for the scaffold-generator skill.

## Navigation

| Document | Purpose |
|----------|---------|
| [interaction-modes.md](interaction-modes.md) | Learn the different ways to use the skill |
| [examples.md](examples.md) | Real-world examples and use cases |
| [architecture.md](architecture.md) | How the skill is built internally |
| [mcp-integration.md](mcp-integration.md) | How to integrate with the MCP server |
| [api.md](api.md) | API reference for all functions |
| [troubleshooting.md](troubleshooting.md) | Common issues and solutions |

## Quick Reference

### Using the Skill

**Conversational Mode** (recommended for new users):
```
"Help me create a new CLI skill"
```

**Form-Based Mode** (power users):
```
"Generate a cli skill with repo_name=my-cli, author=Claude"
```

### Typical Workflow

1. Describe what you want → Skill suggests templates
2. Enter variables for your skill → Validation in real-time
3. Preview the files → See what will be created
4. Confirm → Files written to disk

### Troubleshooting

Common issues:
- **MCP server won't connect** → See [troubleshooting.md#mcp-connection](troubleshooting.md#mcp-connection)
- **Variable validation fails** → Check [api.md#validate-variables](api.md#validate-variables)
- **Files not written** → Review [troubleshooting.md#file-writing](troubleshooting.md#file-writing)

## For Contributors

- **Architecture deep-dive**: [architecture.md](architecture.md)
- **MCP integration details**: [mcp-integration.md](mcp-integration.md)
- **Full API reference**: [api.md](api.md)

See the parent directory [../README.md](../README.md) for development setup and testing.
