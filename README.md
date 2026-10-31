# Skill Scaffold

🏗️ **Professional configuration scaffold for WordPress/Claude skills**

Apply enterprise-grade tooling consistently across multiple skill repositories.

## Features

✅ **Code Quality** — ESLint, Prettier, Markdownlint  
✅ **Testing** — Jest with configurable coverage thresholds  
✅ **Git Hooks** — Automated pre-commit and pre-push validation  
✅ **Code Review** — AI-powered reviews with CodeRabbit  
✅ **Customizable** — Mustache templates for flexible configuration  
✅ **Batch Ready** — Apply to multiple repos easily  

## Quick Start

```bash
# Apply scaffold to current repository
bash <(curl -s https://raw.githubusercontent.com/lightspeedwp/skill-scaffold/main/scripts/apply-scaffold.sh) \
  --repo-name my-skill \
  --description "My skill description"
```

## Installation

### 1. Clone or Download
```bash
git clone https://github.com/lightspeedwp/skill-scaffold.git
cd skill-scaffold
```

### 2. Apply to Your Repo
```bash
bash scripts/apply-scaffold.sh \
  --repo-name my-skill \
  --description "My skill" \
  --author "Your Name"
```

### 3. Install & Configure
```bash
cd /path/to/your/repo
npm install
npx lefthook install
npm run lint:all
```

## What Gets Applied

### Phase 1: Core (90% Coverage)
| File | Purpose |
|------|---------|
| `package.json` | Dependencies, scripts, Jest config |
| `lefthook.yml` | Git hooks (pre-commit, pre-push) |
| `.coderabbit.yaml` | AI-powered code review |
| `.eslintrc.cjs` | JavaScript linting |
| `.prettierrc` | Code formatting |
| `.markdownlint.jsonc` | Markdown validation |
| `CLAUDE.md` | Development guide |
| `README.md` | Project documentation |

### Phase 2: Extended (95% Coverage) ✨
| File | Purpose |
|------|---------|
| `.eslintrc.json` | ESLint configuration with strict modes |
| `SKILL.md` | Skill documentation template |
| `.editorconfig` | Editor standards (EditorConfig) |
| `.github/workflows/ci.yml` | GitHub Actions CI/CD |
| `.markdownlint.json` | Markdown rules with options |

**Coverage:** Phase 1 + Phase 2 covers 95% of all LightSpeed skill types  
**Time Savings:** 45-65 min → 10-15 min (75% improvement)

## Configuration

### Mustache Variables

**Required:**
- `repo_name` — Repository name
- `repo_description` — Package description
- `author` — Author name

**Optional:**
- `coverage_threshold` — Jest coverage % (default: 80)
- `has_jest` — Include Jest tests (default: true)
- `has_bats` — Include BATS (default: false)
- `has_shell` — Include ShellCheck (default: false)
- `has_yaml` — Include YAML linting (default: false)

[Full documentation →](./SCAFFOLD.md)

## Usage Examples

### Single Repository
```bash
bash scripts/apply-scaffold.sh \
  --repo-name wp-db-migrate \
  --description "WordPress database migration" \
  --coverage 80
```

### Dry Run (Preview)
```bash
bash scripts/apply-scaffold.sh \
  --repo-name my-skill \
  --description "My skill" \
  --dry-run
```

### Custom Target Directory
```bash
bash scripts/apply-scaffold.sh \
  --target /path/to/repo \
  --repo-name my-skill \
  --description "My skill"
```

## Available Scripts

### Development
- `npm test` — Run Jest tests
- `npm test:watch` — Watch mode
- `npm lint:js` — Check JavaScript
- `npm lint:md` — Check Markdown
- `npm lint:all` — Run all linters

### Git Hooks
- **Pre-commit:** Prettier → Markdownlint → ESLint → Jest → ShellCheck
- **Pre-push:** Branch name validation

## Batch Application

Apply to multiple repos:

```bash
#!/bin/bash
for repo in skill-1 skill-2 skill-3 skill-4; do
  bash scripts/apply-scaffold.sh \
    --target /path/to/$repo \
    --repo-name $repo \
    --description "Skill: $repo"
done
```

## What Repos Use This?

- [wp-db-migrate](https://github.com/lightspeedwp/wp-db-migrate)
- [wp-studio-migration](https://github.com/lightspeedwp/wp-studio-migration)
- _Add yours here_

## Documentation

- **[Complete Guide](./SCAFFOLD.md)** — Full documentation with examples
- **[scaffold.config.json](./scaffold.config.json)** — Configuration reference

## Requirements

- Node.js 24+
- `mustache` CLI: `npm install -g mustache`
- Git repository

## Troubleshooting

**Mustache not found:**
```bash
npm install -g mustache
```

**Git hooks not running:**
```bash
npx lefthook install
```

**Coverage threshold too strict:**
Lower in `package.json` `coverageThreshold`

[More help →](./SCAFFOLD.md#troubleshooting)

## Contributing

Improvements welcome! Edit templates in `templates/` and test with `--dry-run`.

## License

MIT License — See [LICENSE](./LICENSE)

---

**Get started:** `bash scripts/apply-scaffold.sh --help`