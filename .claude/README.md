# Claude Code Configuration

This directory contains Claude Code configuration for the skill-scaffold project.

## Files

- **claude.json** — Claude Code settings (model, effort, permissions)
- **hooks/** — Git hooks integration (pre-commit, pre-push validation)
- **settings.json** — Extended Claude Code preferences (optional)

## Setup

1. Claude Code will automatically detect this configuration
2. Default model: Claude Opus 5.5
3. Default effort: Medium
4. Permissions: bash, npm, git, node

## Customization

Edit `claude.json` to:
- Change the default model (claude-opus-5-5, claude-sonnet-5-5, etc.)
- Adjust effort level (low, medium, high, xhigh, max)
- Modify allowed permissions
- Update hook paths

See [Claude Code Documentation](https://claude.com/claude-code) for more options.
