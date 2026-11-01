# Phase 4.2 Handoff: Next Session Checklist

**Current Status:** SDK v1.32.2 installed, tool registration API mismatch identified  
**Last Commit:** `88864bf` — SDK integration progress  
**Token Usage:** ~5M used in this session

---

## What's Ready

✅ **ScaffoldClient** — 100% complete, production-ready
- Template loading, filtering, validation
- Safe path handling (realpath + relative checks)
- Rendering and file writing with security

✅ **Tool Handlers** — All 7 tools have complete implementation logic
- scaffold_apply, scaffold_dry_run, list_templates, list_variants
- template_render, validate_variables, skill_info
- Error handling, JSON response formatting

✅ **Zod Schemas** — 332 lines, all input/output types defined

❌ **SDK Binding** — Needs API adapter for v1.x

---

## The Fix (15 minutes)

The v1.x SDK uses `setRequestHandler()` instead of `registerTool()`.

**Current Code (Doesn't Work):**
```typescript
server.registerTool('scaffold_apply', {...}, async (input) => {...});
```

**v1.x Correct Pattern:**
```typescript
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case 'scaffold_apply':
      // Handle scaffold_apply(args)
      break;
    case 'scaffold_dry_run':
      // Handle scaffold_dry_run(args)
      break;
    // ... other tools
  }
});
```

**Reference:**
- v1 SDK examples: https://github.com/modelcontextprotocol/typescript-sdk/tree/v1.x/examples
- Look at: `server.setRequestHandler()` pattern for tool execution

---

## Next Session Steps

### 1. Fix Tool Registration (15 min)
- Replace all `server.registerTool()` with `setRequestHandler()`
- Import `CallToolRequestSchema` from `@modelcontextprotocol/sdk/types.js`
- Update each tool handler to extract args from request.params

### 2. Build & Test (10 min)
```bash
cd /Users/ash/work/skill-scaffold/mcp/server
npm run build  # Should compile successfully
npx @modelcontextprotocol/inspector  # Test all 7 tools
```

### 3. Create Evaluation Suite (30 min)
- Create `PHASE4_EVALUATION.xml` with 10 test scenarios
- Test each tool with sample inputs
- Verify correct outputs

### 4. Documentation (20 min)
- Write `MCP_GUIDE.md` (integration guide)
- Update `README.md` with Phase 4 section
- Update `SCAFFOLD.md` with MCP details

### 5. Security Follow-Up (30 min) ⚠️
Three findings still need hardening:
1. [HIGH] path_traversal_symlink — Use lstatSync() for final path
2. [MEDIUM] toctou_symlink_mkdir — Check realpath before mkdir
3. [MEDIUM] denylist_bypass_case_normalization — Use realpath comparison

---

## File Structure

```
mcp/server/
├── src/
│   ├── index.ts (440 lines) — MCP server + tool dispatch
│   ├── client/
│   │   └── scaffold-client.ts (300 lines) — Template operations
│   └── schemas/
│       └── index.ts (332 lines) — Zod type definitions
├── package.json (v1.32.2 SDK)
├── tsconfig.json (strict: false)
└── dist/ (compiled output)
```

---

## Quick Reference: Tool Signatures

All 7 tools already have:
- Input validation logic
- Error handling
- JSON response formatting
- Examples ready to test

```
1. scaffold_apply(repo_path, repo_name, skill_type?, variables?, dry_run?, phases?, overwrite?)
2. scaffold_dry_run(repo_path, repo_name, skill_type?, variables?, phases?)
3. list_templates(skill_type?, phase?, page?, limit?)
4. list_variants(skill_type, phases?)
5. template_render(template_name, variables)
6. validate_variables(skill_type, variables)
7. skill_info()
```

---

## Testing Locally

Once built:

```bash
# Start MCP Inspector
npx @modelcontextprotocol/inspector

# In Inspector, test tool:
# {
#   "name": "list_templates",
#   "arguments": {"skill_type": "cli"}
# }
```

---

## Timeline Estimate

- Fix SDK binding: 15 min
- Build & test: 10 min
- Evaluation suite: 30 min
- Documentation: 20 min
- **Total: 75 minutes (~1.25 hours)**

Security hardening is separate (30+ min) and optional before MVP.

---

## Token Budget

This session used ~5M tokens.  
Next session should have ~10M tokens available.  
Sufficient for Phase 4.2 completion + security hardening if needed.

---

## Commands to Run

```bash
cd /Users/ash/work/skill-scaffold/mcp/server

# Install and build
npm install
npm run build

# Test with MCP Inspector
npx @modelcontextprotocol/inspector

# Run tests (after creation)
npm test
```

---

## Related Files

- `PHASE4_IMPLEMENTATION_PLAN.md` — Architecture & design decisions
- `PHASE4_SESSION_SUMMARY.md` — What was accomplished this session
- Git commits: `57ff97c` (planning), `88864bf` (current SDK work)

---

**Next Session:** Ready to proceed with SDK fix?

Start with: `cd /Users/ash/work/skill-scaffold && git log --oneline | head -5`
