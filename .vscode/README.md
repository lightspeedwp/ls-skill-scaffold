# VS Code Configuration

Shared VS Code settings for the skill-scaffold project.

## Files

- **settings.json** — Workspace settings (formatting, linting, rulers)
- **extensions.json** — Recommended extensions
- **launch.json** (optional) — Debug configurations

## Recommended Extensions

Install the recommended extensions:

```bash
code --install-extension esbenp.prettier-vscode
code --install-extension dbaeumer.vscode-eslint
code --install-extension DavidAnson.vscode-markdownlint
code --install-extension redhat.vscode-yaml
code --install-extension GitHub.copilot
```

Or VS Code will prompt you to install them when opening the workspace.

## Settings Applied

- **Formatting**: Prettier on save (100 char line width)
- **Linting**: ESLint with auto-fix on save
- **Indentation**: 2 spaces (all file types)
- **Rulers**: 80 and 120 characters for reference
- **Markdown**: Word wrap enabled, 120 char ruler

## Personal Settings

User-specific settings go in `.vscode/settings.local.json` (gitignored).

Example:
```json
{
  "editor.fontSize": 14,
  "editor.fontFamily": "Fira Code",
  "editor.theme": "One Dark Pro"
}
```

## Debug Configurations

Debug configs can be added to `launch.json` for Node.js testing, Jest debugging, etc.
