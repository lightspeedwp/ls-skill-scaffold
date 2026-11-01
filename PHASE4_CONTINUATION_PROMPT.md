# Skill Scaffold Phase 4: MCP Integration — Continuation Prompt

**Session Date:** 2026-10-31 | **Status:** Phase 1–3 Complete, Phase 4 Ready to Begin

---

## Executive Summary

**skill-scaffold** is a professional configuration scaffold for WordPress/Claude skills. Phases 1–3 have delivered 24 production-ready Mustache templates (90%→95%→98%+ coverage) reducing setup time from 45–65 min to 6–11 min.

**Phase 4 Goal:** Add MCP (Model Context Protocol) server layer enabling Claude agents to invoke skill-scaffold operations as first-class tools.

---

## Part 1: What Has Been Accomplished (Phases 1–3)

### Phase 1: Core Templates (90% Coverage) ✅
**Status:** Production-ready

**5 core templates (679 lines):**
- `package.json.mustache` (88 lines) — Dependencies, scripts, Jest config
- `jest.config.js.mustache` (46 lines) — Testing with configurable coverage
- `CLAUDE.md.mustache` (266 lines) — Development guide
- `README.md.mustache` (228 lines) — Project documentation
- `lefthook.yml.mustache` (51 lines) — Git hooks (pre-commit, pre-push)

**Non-templated files:**
- `.eslintrc.cjs`, `.prettierrc`, `.markdownlint.jsonc`

**Coverage:** 95%+ CLI/validation skills, 90%+ docs skills

---

### Phase 2: Extended Templates (95% Coverage) ✅
**Status:** Production-ready, tested against wp-db-migrate, branch-validation

**5 new templates (~410 lines):**
- `.eslintrc.json.mustache` — ESLint with strict/relaxed modes
- `SKILL.md.mustache` (250+ lines) — Adaptive skill documentation
- `.editorconfig.mustache` — Universal editor standards
- `.github/workflows/ci.yml.mustache` — GitHub Actions CI/CD
- `.markdownlint.json.mustache` — Markdown linting rules

**Key features:**
- Conditional rendering for skill types (CLI, validation, documentation, agent)
- Security-hardened ignore files (`.npmignore`, `.gitignore` with `overwrite: true`)
- All templates 100% pass rate in real-repo validation

---

### Phase 3: Template Variants & Specialized (98%+ Coverage) ✅
**Status:** Production-ready, full testing completed

**14 templates split into:**

**A. Variants (8 templates):**
- Jest: `jest.config.js.strict` (90%+ coverage), `jest.config.js.esm` (ES6 modules)
- Package.json: CLI, validation, documentation skill variants
- ESLint: strict mode, browser+node mixed environments
- Workflows: test-only, test-matrix (multi-Node versions)

**B. Specialized (6 templates):**
- Workflows: `release.yml` (npm publish, GitHub releases), `security.yml` (npm audit, snyk, gitleaks)
- Docs: `AGENTS.md` (agent capabilities), `PROMPT_TEMPLATE.md` (prompt engineering)
- Ignore: `.npmignore`, `.gitignore` (security-critical, `overwrite: true`)

**Coverage Analysis:**
- 24 templates total + 28+ combinations
- **98%+ coverage** of all LightSpeed skill types
- Setup time: 45–65 min → **6–11 min (80–87% improvement)**

---

## Part 2: Architecture Decisions (Phases 1–3)

### Templating Strategy
- **Mustache for simplicity:** Portable, no build step, renders in any environment
- **Variable-driven:** ~20 optional variables + 4 required variables
- **Conditional blocks:** `{{#condition}} ... {{/condition}}` for skill types
- **Overwrite strategy:** `overwrite: true` for security-critical files (ignore files, CI/CD)

### Security Hardening (Phase 3)
- **Unconditional secret patterns:**
  - `.npmignore`: `.env`, `.env.production`, `.npmrc`, `*.pem`, `*.key`, `*.secret`
  - `.gitignore`: `.env` rules always applied (never optional)
- **Rationale:** Security-first approach; rules always enforced regardless of optional flags
- **Commits:** f59b84f (added patterns), d6824e9 (finalized overwrite strategy)

### Configuration
**`scaffold.config.json` structure:**
```json
{
  "templates": [
    {
      "source": "templates/file.mustache",
      "target": "file",
      "overwrite": true|false,
      "required": true|false,
      "phase": 1|2|3,
      "variant": "optional:tag",
      "specialized": true  // Phase 3 only
    }
  ],
  "requiredVariables": ["repo_name", "repo_description", "author", "version"],
  "optionalVariables": {
    "coverage_threshold": 80,
    "has_jest": true,
    "has_bats": false,
    // ... 9 more optional flags
  }
}
```

### Sub-Skill Templates (Nested Directories)
- `templates/skill/README.md` — Skill documentation subdirectory
- `templates/skill/scripts/example.sh` — Shell script template
- `templates/.claude/settings.json` — Claude Code project settings
- `templates/__tests__/example.test.js` — Jest test example
- `templates/.github/workflows/lint.yml` — Lint workflow reference

---

## Part 3: Phase 4 Scope — MCP Integration

### Phase 4 Objective
Enable Claude and other LLM agents to invoke skill-scaffold operations as first-class MCP tools, not shell commands. Provides:
- Structured tool interface (vs. raw shell)
- Better error handling & debugging
- Foundation for Phase 5 (autonomous workflows)

### Phase 4 Architecture (Using mcp-builder Framework)

#### **Phase 4.1: Research & Planning**
1. **Study MCP Protocol** (https://modelcontextprotocol.io)
   - Specification overview and architecture
   - Transport mechanisms (streamable HTTP for remote, stdio for local)
   - Tool, resource, and prompt definitions

2. **TypeScript SDK v2** (`@modelcontextprotocol/server`)
   - Current stable release (v1 receives only bug/security fixes)
   - Zod schemas for input validation
   - Structured content responses
   - Tool annotations (readOnlyHint, destructiveHint, idempotentHint, openWorldHint)

3. **Define MCP Operations:**
   - **scaffold_apply** — Apply templates to a repository
   - **scaffold_dry_run** — Preview changes (no write)
   - **scaffold_list_templates** — List available templates with metadata
   - **scaffold_list_variants** — Filter templates by skill type/phase
   - **template_render** — Render single template with variables
   - **validate_variables** — Check required/optional variables
   - **skill_info** — Metadata (coverage %, time savings, skill type support)

4. **Input Schema Design:**
   - `repo_path`: Target repository path
   - `repo_name`: Repository name
   - `skill_type`: "cli" | "validation" | "documentation" | "agent"
   - `variables`: Record<string, string | number | boolean>
   - `dry_run`: boolean (default: false)
   - `phases`: "1" | "2" | "3" | "all" (default: "all")
   - `overwrite`: boolean (respected for non-security files)

5. **Output Schema Design:**
   - Structured JSON with file counts, coverage metrics, timing
   - Text summary of changes
   - Actionable error messages with next-step guidance

#### **Phase 4.2: Implementation**
1. **Project Setup**
   - Directory: `mcp/server/` (TypeScript, stdio transport)
   - `package.json`: `@modelcontextprotocol/server`, TypeScript deps
   - `tsconfig.json`: ES2020 target, strict mode
   - Build: `tsc` to `dist/`

2. **Core Modules**
   - `src/index.ts` — MCP server initialization, tool registration
   - `src/tools/` — Individual tool handlers
     - `scaffold-apply.ts`
     - `scaffold-dry-run.ts`
     - `list-templates.ts`
     - etc.
   - `src/client/` — Scaffold API wrapper
     - `scaffold-client.ts` (mustache execution, file I/O)
     - `variable-validator.ts`
     - `error-handler.ts`
   - `src/schemas/` — Zod definitions for all tools

3. **Implementation Details**
   - Use `child_process.spawn()` for template rendering (security isolation)
   - Implement pagination for large template lists
   - Proper error handling: actionable messages + suggestions
   - Annotations for each tool (readOnlyHint, destructiveHint, etc.)

#### **Phase 4.3: Review & Test**
1. **Code Quality**
   - No code duplication (DRY)
   - Full TypeScript type coverage
   - Consistent error handling
   - Clear tool descriptions

2. **Build & Verification**
   - `npm run build` — Compile TypeScript
   - `npm run type-check` — Verify types
   - MCP Inspector testing: `npx @modelcontextprotocol/inspector`
   - Test each tool manually with sample inputs

#### **Phase 4.4: Evaluation**
1. **Create 10 Realistic Test Questions**
   - "Apply Phase 2 templates to a new CLI skill (wp-new-skill)"
   - "List all template variants for a validation skill"
   - "Dry-run scaffold on branch-validation; what would change?"
   - "Apply Phase 1 only to an existing skill; check coverage"
   - "Render SKILL.md for an agent-type skill with custom variables"
   - "Validate variables for a CLI skill with missing required fields"
   - "Get skill-scaffold metadata; what's the time savings for Phase 3?"
   - "Apply Phase 3 to wp-db-migrate; verify ESLint and Jest configs"
   - "Dry-run with overwrite=false on a repo with existing .npmignore"
   - "Batch apply to 3 repos with different skill types; report coverage"

2. **Output Format**
   - XML evaluation file with 10 qa_pairs
   - Each pair: realistic question + verifiable answer
   - Answers based on scaffold behavior + metadata

---

## Part 4: Files to Create (Phase 4)

### Directory Structure
```
skill-scaffold/
├── mcp/
│   └── server/
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts (server initialization)
│       │   ├── tools/
│       │   │   ├── scaffold-apply.ts
│       │   │   ├── scaffold-dry-run.ts
│       │   │   ├── list-templates.ts
│       │   │   ├── list-variants.ts
│       │   │   ├── template-render.ts
│       │   │   ├── validate-variables.ts
│       │   │   └── skill-info.ts
│       │   ├── client/
│       │   │   ├── scaffold-client.ts
│       │   │   ├── variable-validator.ts
│       │   │   └── error-handler.ts
│       │   └── schemas/
│       │       ├── scaffold-apply.schema.ts
│       │       ├── list-templates.schema.ts
│       │       └── ... (one per tool)
│       └── dist/ (generated)
├── mcp/
│   └── server/
│       └── mcp.json (configuration)
├── MCP_GUIDE.md (integration guide for Claude Code)
└── README.md (update with Phase 4 section)
```

### Key Files to Create
1. **mcp/server/package.json** — Dependencies, build scripts, main entry
2. **mcp/server/tsconfig.json** — TypeScript configuration
3. **mcp/server/src/index.ts** — MCP server factory + tool registry
4. **mcp/server/src/tools/*.ts** — Tool implementations (7 files)
5. **mcp/server/src/schemas/*.ts** — Zod input/output schemas
6. **MCP_GUIDE.md** — How to use the MCP server with Claude Code
7. **PHASE4_EVALUATION.xml** — 10 test questions + answers

### Documentation Updates
1. **README.md** — Add Phase 4 section
2. **SCAFFOLD.md** — MCP integration details
3. **.claude/mcp.json** — Register MCP server for Claude Code

---

## Part 5: Environment & Dependencies

### Repository State
- **Location:** `https://github.com/lightspeedwp/skill-scaffold` (or local fork)
- **Current branch:** `main` (Phase 3 complete and deployed)
- **Working directory:** `/tmp/skill-scaffold-phase1/` (from prior session)

### Node.js & Tooling
- **Node.js:** 24+ (required)
- **npm:** 10+
- **TypeScript:** 5.x
- **Mustache CLI:** Already in use (Phase 1–3)

### Key Dependencies (Phase 4 only)
```json
{
  "@modelcontextprotocol/server": "^1.0.0",
  "zod": "^3.22.0",
  "typescript": "^5.3.0",
  "ts-node": "^10.9.0"
}
```

---

## Part 6: Success Criteria (Phase 4)

- ✅ MCP server builds without errors (`npm run build`)
- ✅ All 7 tools have Zod schemas + clear descriptions
- ✅ MCP Inspector can load server + list all tools
- ✅ Manual testing: each tool invoked successfully with sample inputs
- ✅ Error handling: actionable error messages for invalid inputs
- ✅ 10 evaluation questions answered correctly by Claude using the MCP server
- ✅ Integration guide (MCP_GUIDE.md) ready for Claude Code users
- ✅ Commit to main branch with Phase 4 complete

---

## Part 7: Next Session Checklist

### Setup (5 min)
- [ ] Clone/open skill-scaffold repo
- [ ] Run `npm install` in `mcp/server/`
- [ ] Review mcp-builder skill (reference for MCP patterns)

### Phase 4.1: Planning (30 min)
- [ ] Study MCP Protocol spec & TypeScript SDK v2
- [ ] Define 7 core MCP operations
- [ ] Design input/output schemas using Zod

### Phase 4.2: Implementation (90 min)
- [ ] Create MCP server project structure
- [ ] Implement `scaffold-client.ts` (core wrapper)
- [ ] Implement 7 tools + handlers
- [ ] Write Zod schemas for all tools

### Phase 4.3: Review & Test (45 min)
- [ ] Build & compile verification
- [ ] MCP Inspector testing
- [ ] Manual tool testing with sample inputs

### Phase 4.4: Evaluation & Docs (30 min)
- [ ] Create PHASE4_EVALUATION.xml (10 questions)
- [ ] Write MCP_GUIDE.md
- [ ] Update README.md & SCAFFOLD.md

### Final (10 min)
- [ ] Commit Phase 4 to main
- [ ] Tag v2.0.0 (Phase 1–4 complete)

---

## Part 8: User Approvals & Context

**User has explicitly approved:**
- Phase 4 MCP Integration ("yes, totally") ✅
- Using mcp-builder skill as framework ✅
- Target: LightSpeed repo deployment ✅

**No blockers remain. Phase 4 is ready to begin.**

---

## Reference: Phase 1–3 Template Counts

| Phase | Templates | Coverage | Time Savings |
|-------|-----------|----------|--------------|
| 1     | 5 core    | 90%      | 50% (45→25 min) |
| 2     | +5 extended | 95%    | 75% (45→15 min) |
| 3     | +14 variants/specialized | **98%+** | **80-87% (45→6-11 min)** |

---

**End of Continuation Prompt**

Next session: Start Phase 4.1 (Planning) with mcp-builder guidance. All context preserved.
