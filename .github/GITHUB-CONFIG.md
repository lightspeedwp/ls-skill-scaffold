# GitHub Configuration

Organization-wide standards and templates for skill-scaffold repository.

## Contents

### Configuration Files

| File | Purpose |
|------|---------|
| `branch-labels.yml` | Map branch names to GitHub labels |
| `branch-types.yml` | Define valid branch types and rules |
| `changelog-rules.yml` | Rules for changelog management |
| `issue-types.yml` | Define valid issue types |
| `labeler.yml` | Automated labeling rules |
| `labels.yml` | Define all available labels |

### Templates

**Issue Templates** (`ISSUE_TEMPLATE/`)
- Task, Bug, Feature, Design, Epic
- Decision, Improvement, Chore, CI
- Automation, Test, Performance, A11y
- Security, Compatibility, Refactor, Release
- Dependency Update, Documentation, Research
- Audit, Review, AIops, Content Modelling, Build

**Pull Request Templates** (`PULL_REQUEST_TEMPLATE/`)
- Type-specific templates matching issue types
- Feedback response template
- Consistent formatting across PRs

### Hooks

**Pre-commit Hook** (`hooks/pre-commit`)
- Validates branch names
- Checks changelog integrity
- Enforces commit policies

## Using These Standards

### Branch Naming

Format: `{type}/{scope}-{short-title}`

Valid types (see `branch-types.yml`):
```
feat, fix, hotfix, release, refactor, chore, task, docs, doc,
test, perf, ci, build, deps, security, revert, research, design,
a11y, ux, i18n, ops, audit, codex, aiops, automation, epic
```

Examples:
```
feat/skill-add-validation
fix/script-timeout-issue
docs/update-readme
```

### Creating Issues

1. Use appropriate template from `ISSUE_TEMPLATE/`
2. GitHub will auto-label based on template type
3. Link related PRs and issues

### Creating Pull Requests

1. Use branch name following type conventions
2. GitHub auto-routes to matching template
3. Fill in acceptance criteria and testing steps

## Configuration

These files are automatically synchronized with the org-wide standards at:
https://github.com/lightspeedwp/.github

To update:
1. Review changes in the org repository
2. Copy updated files here
3. Test locally
4. Commit with message referencing the org repo

## Hooks Setup

To enable pre-commit hooks locally:

```bash
# Install Lefthook (if not already installed)
brew install evilmartians/tap/lefthook  # macOS
sudo apt-get install lefthook           # Linux
choco install lefthook                  # Windows

# Install hooks
lefthook install
```

Hooks will run automatically on `git commit` and `git push`.
To skip (not recommended): `git commit --no-verify`
