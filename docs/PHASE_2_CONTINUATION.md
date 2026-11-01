# Skill-Scaffold Phase 2 Continuation Prompt

**Date:** 2026-10-31  
**User:** ashley@lightspeedwp.agency  
**Status:** Phase 1 ✅ Complete — Phase 2 Ready to Start

---

## Current State & Checkout Locations

### Primary Working Directory
- **Path:** `/Users/ash/work/wp-db-migrate`
- **Type:** Git repository (main branch)
- **Status:** Clean working tree

### skill-scaffold Repository
- **Repository:** https://github.com/lightspeedwp/skill-scaffold
- **Local Clone:** `/tmp/skill-scaffold-phase1/`
- **Current Branch:** `main`
- **Latest Commit:** `4e0cb0c` — "feat: add phase 1 core templates (90% coverage)"
- **Remote Status:** Up to date with origin/main

### Scratchpad Directory
- **Path:** `/private/tmp/claude-501/-Users-ash-work-wp-db-migrate/805a890e-0428-483f-9a72-91c01c0ebeac/scratchpad/`
- **Contents:** Reference documents (CONTINUATION_PROMPT.md, analysis files)

---

## Phase 1 Completion Summary

### ✅ Delivered (October 31, 2026)

**5 Core Templates Created:**
1. `templates/package.json.mustache` (88 lines) — npm config with 13+ variables
2. `templates/jest.config.js.mustache` (46 lines) — Jest with 80% coverage default
3. `templates/CLAUDE.md.mustache` (266 lines) — development guide with adaptive sections
4. `templates/README.md.mustache` (228 lines) — project README with skill variants
5. `templates/lefthook.yml.mustache` (51 lines) — git hooks (pre-commit/pre-push)

**Total:** 679 production-ready lines of Mustache templates

**Coverage:** 90% of LightSpeed skill repositories  
**Time Savings:** 45-65 min → 25-30 min setup (50% improvement)

**Commit:** 4e0cb0c pushed to skill-scaffold/main with full attribution

---

## Phase 2: Extended Templates (95% Coverage)

### 📋 Scope: 5 Additional Templates

**To Create:**

1. **templates/.eslintrc.json.mustache** (~40 lines)
   - Variables: `useEsModules`, `nodeVersion`, `strictMode`, `includeNodeEnv`
   - Features: strict/relaxed variants, node environment, custom rule overrides
   - Reference: wp-db-migrate .eslintrc.cjs, branch-validation patterns
   - Status: NOT YET CREATED

2. **templates/SKILL.md.mustache** (~250 lines)
   - Variables: `skillName`, `skillSlug`, `skillDescription`, `skillType`, `useCases[]`, `installation`, `usage`, `faq[]`
   - Sections: Overview, Features, Installation, Quick Start, How It Works, Advanced Usage, FAQ, Troubleshooting
   - For: Skill-type repos (like wp-db-migrate model)
   - Status: NOT YET CREATED

3. **templates/.editorconfig.mustache** (~15 lines)
   - Variables: Minimal (mostly universal)
   - Standard: 2-space indent, LF line endings, UTF-8, trim_trailing_whitespace
   - Reference: wp-db-migrate .editorconfig pattern
   - Status: NOT YET CREATED

4. **templates/.github/workflows/ci.yml.mustache** (~50 lines)
   - Variables: `nodeVersion`, `skipBats`, `skipTests`, `testCommand`
   - Workflow: Lint → Test → Coverage
   - Actions: setup-node, cache npm, run tests, coverage upload
   - Reference: wp-db-migrate GitHub Actions workflow
   - Status: NOT YET CREATED

5. **templates/.markdownlint.json.mustache** (~40 lines)
   - Variables: `strictMode`, `lineLength`, `enableRules[]`
   - Default: MD013 (120 chars), disable overly-strict rules
   - Conditional: stricter rules if `strictMode: true`
   - Reference: wp-db-migrate .markdownlint.jsonc
   - Status: NOT YET CREATED

### 📚 Documentation Updates Needed

1. **SCAFFOLD.md** — Add Phase 2 section with:
   - Template descriptions and variable references
   - "Recommended Combinations" guide for common skill types
   - All 10 core templates in reference table

2. **scaffold.config.json** — Update with:
   - Phase 2 template file listings
   - Template dependency graph (e.g., package.json → jest.config.js)
   - Variable inheritance map

3. **README.md** — Expand with:
   - Phase 2 status and coverage increase (90% → 95%)
   - Quick links to both Phase 1 and Phase 2 templates

### 🎯 Success Criteria for Phase 2

- [ ] 5 extended templates created in `templates/`
- [ ] All templates render without errors using Mustache
- [ ] Template variable reference table complete (15+ universal variables)
- [ ] SCAFFOLD.md updated with Phase 2 guide and examples
- [ ] "Recommended Combinations" guide created (CLI skills, validation skills, etc.)
- [ ] Tested on 2-3 LightSpeed repos (wp-db-migrate, branch-validation, linting)
- [ ] Commit message: "feat: add phase 2 extended templates (95% coverage)"
- [ ] Coverage increased to 95% across all skill types
- [ ] Time savings verified: 45-65 min → 10-15 min setup (75% improvement)

---

## Key Context for Next Session

### Files to Reference (All 8 LightSpeed Repos)

**CLI Skills:**
- wp-db-migrate: `.eslintrc.cjs`, `.editorconfig`, `.github/workflows/`, `.markdownlint.jsonc`
- branch-validation: Similar structure
- frontmatter: Similar structure

**Validation Skills:**
- linting: Minimal config files

**Documentation Skills:**
- prd, test, changelog, release: Mostly markdown, fewer config files

### Universal Variables (Updated from Phase 1)

```
{{skillName}}                 # "WordPress Database Migration"
{{skillSlug}}                 # "wp-db-migrate"
{{skillDescription}}          # One-line description
{{authorName}}                # "Ash Shaw"
{{version}}                   # "1.0.0"
{{license}}                   # "MIT"
{{nodeVersion}}               # "24" (for workflows)
{{nodeMinVersion}}            # "18.0.0"
{{testCoverageThreshold}}     # 80 (for jest, eslint)
{{strictMode}}                # Boolean for stricter rules
{{useEsModules}}              # Boolean for ES modules vs CommonJS
{{hasShellScripts}}           # Boolean for ShellCheck
{{hasBatsTests}}              # Boolean for BATS
{{hasMarkdownDocs}}           # Boolean for markdown validation
{{hasYamlLinting}}            # Boolean for YAML linting
{{branchPattern}}             # Regex for branch validation
{{skillType}}                 # "cli" | "validation" | "documentation" | "agent"
```

### Repository Layout

```
/tmp/skill-scaffold-phase1/
├── templates/
│   ├── package.json.mustache          ✅ (Phase 1)
│   ├── jest.config.js.mustache        ✅ (Phase 1)
│   ├── CLAUDE.md.mustache             ✅ (Phase 1)
│   ├── README.md.mustache             ✅ (Phase 1)
│   ├── lefthook.yml.mustache          ✅ (Phase 1)
│   ├── .eslintrc.json.mustache        ❌ (Phase 2 TODO)
│   ├── SKILL.md.mustache              ❌ (Phase 2 TODO)
│   ├── .editorconfig.mustache         ❌ (Phase 2 TODO)
│   ├── .github/workflows/ci.yml.mustache ❌ (Phase 2 TODO)
│   └── .markdownlint.json.mustache    ❌ (Phase 2 TODO)
├── scripts/
│   ├── apply-scaffold.sh              (unchanged)
│   └── __tests__/ (test utilities)    (unchanged)
├── SCAFFOLD.md                        ✅ Updated with Phase 1
├── README.md                          ✅ (needs Phase 2 section)
└── scaffold.config.json               ✅ (needs Phase 2 entries)
```

---

## Exact Next Steps for Phase 2

1. **Clone/Open skill-scaffold:**
   ```bash
   cd /tmp/skill-scaffold-phase1
   git status  # Verify clean working tree
   ```

2. **Create 5 Phase 2 templates** (use Agent or write directly):
   - Reference wp-db-migrate and branch-validation for patterns
   - All templates must render cleanly with Mustache
   - Match Phase 1 quality (60+ variables, conditional sections)

3. **Test templates:**
   - Render with `mustache vars.json template.mustache`
   - Verify no unrendered variables remain
   - Validate syntax (JSON, YAML, Bash, etc.)

4. **Update documentation:**
   - SCAFFOLD.md: Add Phase 2 section, variable reference table, combinations guide
   - README.md: Add Phase 2 status
   - scaffold.config.json: Add Phase 2 entries

5. **Commit to skill-scaffold/main:**
   ```bash
   git add templates/.eslintrc.json.mustache templates/SKILL.md.mustache templates/.editorconfig.mustache templates/.github/workflows/ci.yml.mustache templates/.markdownlint.json.mustache SCAFFOLD.md README.md scaffold.config.json
   git commit -m "feat: add phase 2 extended templates (95% coverage)"
   git push origin main
   ```

6. **Verify:**
   - All 10 templates in skill-scaffold repo
   - Commit hash captured
   - Coverage: 95% of all LightSpeed skill types

---

## Expected Outcome After Phase 2

- ✅ 10 core Mustache templates (Phase 1 + Phase 2)
- ✅ 95% coverage across all LightSpeed skill types
- ✅ Setup time reduced to 10-15 minutes (75% improvement)
- ✅ "Recommended Combinations" guide for common patterns
- ✅ Ready for Phase 3 (variants, specializations, 98%+ coverage)

---

## Branch & Repository Summary

| Item | Value |
|------|-------|
| **Git Repo** | skill-scaffold (https://github.com/lightspeedwp/skill-scaffold) |
| **Branch** | main |
| **Local Path** | /tmp/skill-scaffold-phase1/ |
| **Working Dir** | /Users/ash/work/wp-db-migrate (primary, but not active for Phase 2) |
| **Phase 1 Commit** | 4e0cb0c |
| **Phase 1 Status** | ✅ Complete & Pushed |
| **Phase 2 Status** | ⏳ Ready to Start |

---

## How to Resume in New Chat

1. Start new chat
2. Paste this continuation prompt
3. Specify: "Continue Phase 2 template implementation"
4. Claude will:
   - Clone /tmp/skill-scaffold-phase1 if needed
   - Create 5 Phase 2 templates
   - Test and commit to skill-scaffold/main
   - Update documentation
   - Push to GitHub

**Everything is self-contained in this prompt.** No additional context needed.
