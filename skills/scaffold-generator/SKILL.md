---
name: scaffold-generator
description: |
  Generate new skill files from templates using the skill-scaffold MCP server. Use this whenever a user wants to create, bootstrap, or generate skill files for a new skill type (cli, validation, documentation, or agent). Intelligently chooses between guided step-by-step flow (for new users or exploratory requests) and fast form-based flow (for experienced users making quick decisions). Provides variable input with defaults, real-time validation, and a preview-before-write workflow. Works with Claude agents to automate skill generation and with humans learning to create skills. If the user hasn't explicitly asked for skill generation but mentions "creating a new skill", "bootstrapping templates", "generating skill files", or "building a skill structure", proactively offer this skill.
compatibility: |
  Requires: skill-scaffold MCP server running with templates directory configured
  MCP tools used: scaffold_apply, scaffold_dry_run, template_render, validate_variables, list_templates, skill_info
---

# Scaffold Generator

Generate skill files interactively using the skill-scaffold MCP server and Mustache templating.

## Overview

This skill wraps the skill-scaffold MCP server to provide an **interactive, guided experience** for generating skill files. It intelligently handles:

- **Interaction Mode Selection**: Chooses between conversational (step-by-step guidance) and form-based (fast input) flows
- **Template Discovery**: Lists available templates from the MCP server, filtered by skill type and phase
- **Variable Management**: Suggests defaults, validates in real-time, catches errors early
- **Preview Workflow**: Always shows a dry-run first (proposed files, paths, variable substitutions) before writing
- **Safe Generation**: Confirms before overwriting, shows coverage percentage, displays file structure

## When to Use This Skill

Use **scaffold-generator** when:
- A user wants to **create a new skill** (cli, validation, documentation, or agent type)
- A user needs to **generate missing skill files** from templates
- A user asks to **bootstrap a skill repository** with structure and scaffolding
- A user is **learning to create skills** and needs guidance
- You're **automating skill generation** in an agent workflow
- A user mentions "creating templates", "generating skill structure", or "bootstrapping files" in the context of skill-scaffold

## Interaction Model

The skill adapts to context:

### Conversational Mode
Triggered by:
- First-time users ("I've never made a skill before")
- Exploratory requests ("help me create a skill")
- Uncertain users ("I'm not sure what a cli skill needs")

**Flow:**
1. "What type of skill are you creating?" (cli / validation / documentation / agent)
2. "Which phases?" (1, 2, 3, or all)
3. "Let me get some details..." (iterate through required variables, one at a time)
4. For each variable: suggest default, show type/constraints, validate input
5. "Here's what we'll create..." (show dry-run preview)
6. "Ready to write?" (confirm before applying)

### Form Mode
Triggered by:
- Experienced users ("generate a cli skill with repo_name='my-cli' and author='Claude'")
- Scripting / automation ("create validation skill for repo at /path")
- Quick decisions ("cli skill, phase 2, these variables: X, Y, Z")

**Flow:**
1. Parse all provided variables at once
2. Validate batch (show errors for any invalid inputs)
3. Let user correct, or proceed if all valid
4. "Here's what we'll create..." (show dry-run preview)
5. "Ready to write?" (confirm before applying)

### Hybrid Decision Logic
```
IF user_message contains explicit variables or flags:
  → Use Form Mode (faster)
ELSE IF user_is_new_to_skills OR user_asks_for_help:
  → Use Conversational Mode (guided)
ELSE IF user_wants_quick_generation:
  → Use Form Mode (efficient)
ELSE:
  → Default to Conversational (safe, discoverable)
```

---

## Workflow: Step by Step

### Step 1: Determine Interaction Mode
Read the user's message. Decide conversational vs. form based on:
- Presence of explicit variables
- User's expressed confidence level
- Complexity of request

Tell the user which mode you're using: *"I'll guide you step-by-step"* or *"Let me gather all the details upfront"*.

### Step 2: Collect Skill Metadata
**Conversational:** Ask one question at a time.
**Form:** Parse from user input or ask for missing pieces.

Collect:
- **Skill Type** (required): `cli` | `validation` | `documentation` | `agent`
- **Phases** (optional, default: all): `1` | `2` | `3` | `all`
- **Target Repository** (inferred or explicit): Detect from git/package.json markers, confirm with user

Example:
```
Skill Type: cli
Phases: 2
Target Repo: /Users/ash/work/my-cli-skill (inferred from git root)
```

### Step 3: List Available Templates
Call `list_templates` MCP tool with filters:
```
list_templates(skill_type="cli", phase="2")
```

Show user:
- Template count
- File paths that will be created
- Coverage percentage (from skill_info)

### Step 4: Collect Variables
Get schema via `validate_variables` MCP tool:
```
validate_variables(skill_type="cli", variables={})
```

Returns: `required`, `optional`, field types/constraints

**Conversational Mode:**
```
For each required variable:
  1. Show field name and description
  2. Suggest default (if template provides one)
  3. Show constraints/examples
  4. Ask user to provide value
  5. Validate in real-time
  6. Show "✓ looks good" or "❌ error: X"
```

**Form Mode:**
```
1. Collect all variables at once
2. Batch validate all
3. Show any errors grouped
4. Ask user to correct and re-submit
```

**Real-time Validation Pattern:**
- As user enters each variable, validate against schema
- Show helpful error messages: "repo_name must match ^[a-z][a-z0-9-]*$"
- Suggest fixes: "Did you mean `my-skill` instead of `My Skill`?"
- Mark valid fields with ✓ indicator

### Step 5: Show Dry-Run Preview
Call `scaffold_dry_run` MCP tool:
```
scaffold_dry_run(
  repo_path="/Users/ash/work/my-cli-skill",
  repo_name="my-cli-skill",
  skill_type="cli",
  phases="2",
  variables={...}
)
```

Display to user:
```
📋 DRY-RUN PREVIEW
──────────────────────────────────
Skill Type:     cli
Phases:         2
Target Repo:    /Users/ash/work/my-cli-skill
Coverage:       90%

📄 Files to Create:
  ✓ SKILL.md
  ✓ scripts/generate.py
  ✓ references/examples.md
  ✓ evals/eval-1/prompt.md
  [4 files total]

🔍 Variable Substitutions:
  repo_name    → my-cli-skill
  author       → Claude
  version      → 1.0.0

Ready to write? (yes/no)
```

### Step 6: Confirm & Apply
If user says "yes":
```
Call: scaffold_apply(
  repo_path="/Users/ash/work/my-cli-skill",
  repo_name="my-cli-skill",
  skill_type="cli",
  phases="2",
  variables={...},
  overwrite=false  # ask before overwriting
)
```

Show result:
```
✅ GENERATION COMPLETE
──────────────────────────────────
Files Written:  4
Files Skipped:  0
Coverage:       90%

📍 Location: /Users/ash/work/my-cli-skill

Next Steps:
  1. Review the generated files
  2. Run: npm install (if applicable)
  3. Read SKILL.md to understand the structure
```

If file already exists and `overwrite=false`, ask:
```
File already exists: SKILL.md
Overwrite? (yes/no/skip)
```

---

## Error Handling

### Variable Validation Errors
```
❌ repo_name validation failed
   Expected: Lowercase alphanumeric with hyphens
   Got: "My Skill"
   Suggestion: Try "my-skill"
```

### File Writing Errors
```
❌ Cannot write to /path/to/repo
   Reason: Directory does not exist
   Solution: Create the directory first, or specify a different path
```

### MCP Server Unavailable
```
❌ Cannot connect to skill-scaffold MCP server
   This skill requires the MCP server to be running.
   Start it with: npx @modelcontextprotocol/inspector node /path/to/server/dist/index.js
```

---

## Advanced Options

### Dry-Run Only
If user says "just show me what would be created", run dry-run and stop (don't apply).

### Multiple Phases
If user selects "all" phases, show cumulative file list and variable requirements.

### Custom Variables
If user provides variables beyond required set, pass them through (optional variables from template).

### Overwrite Strategy
- By default, skip existing files (safe)
- Ask permission before overwriting
- Show what would change if overwriting

---

## Examples

### Example 1: New User, Conversational Mode
```
User: "I want to create my first skill, a CLI tool"
Claude: I'll guide you step-by-step. First, what type of CLI tool?
  - CLI: command-line interface tool
  - Validation: data validation rules
  - Documentation: docs/reference helper
  - Agent: AI agent workflow

User: CLI please

Claude: Great! Which phases? (1=foundation, 2=core, 3=polish)
  Option: phases 1-2 to start, add 3 later

User: All of them

Claude: Perfect. I need a few details:
  - repo_name: What should the repo be called? (lowercase, hyphens ok)
  User: my-awesome-cli

  - author: Who's the author?
  User: Claude

  - version: Starting version?
  User: [uses default 1.0.0]

Claude: [Shows dry-run]

User: Looks good!

Claude: [Applies templates, writes files]
```

### Example 2: Experienced User, Form Mode
```
User: "Generate a validation skill for my-repo, phases 1-2, 
       repo_name=my-validator, author=Ash"

Claude: I'll use form mode for speed.
  [Collects all variables]
  [Validates batch]
  [Shows dry-run]
  
User: Write it

Claude: [Applies templates]
```

---

## Key Patterns & Mental Model

### Why Preview-First?
Showing a dry-run before writing prevents:
- Files written to wrong location
- Variable substitutions breaking templates
- Accidental overwrites
- Users discovering mistakes after the fact

### Why Suggest Defaults?
Defaults from template metadata make the experience:
- Faster (fewer required inputs)
- Safer (sensible starting points)
- Educational (user sees what's typical)

### Why Real-Time Validation?
Validating as user types:
- Catches errors immediately
- Provides context-aware help
- Reduces back-and-forth
- Feels responsive

### Why Hybrid Mode?
Different users have different needs:
- Newcomers need guidance
- Power users need speed
- Same skill serves both

---

## Integration Notes

### MCP Server Dependency
This skill requires the skill-scaffold MCP server to be running. The server provides:
- `list_templates` — discover available templates
- `validate_variables` — check variable schemas
- `template_render` — render individual templates (for preview)
- `scaffold_dry_run` — preview all files before writing
- `scaffold_apply` — write files to disk
- `skill_info` — get metadata (coverage %, template count)

### For Claude Agents
Agents can use this skill to:
- Automate skill generation in workflows
- Generate skill boilerplate from decisions
- Create multiple skill variants
- Integrate into CI/CD pipelines

Pass all variables at once for form mode:
```
Generate a cli skill:
  repo_name: my-service
  author: Agent
  phases: 1
```

### For Human Users
Humans use conversational mode for discovery and guidance:
```
Help me create my first skill
```

Claude chooses mode automatically based on context.

---

## Troubleshooting

**Q: "Cannot connect to MCP server"**
A: Start the skill-scaffold MCP server:
```bash
cd /path/to/skill-scaffold/mcp/server
npx @modelcontextprotocol/inspector node dist/index.js
```

**Q: "File already exists, skipped"**
A: The skill uses `overwrite=false` by default (safe). To overwrite:
- Confirm when prompted, OR
- Delete the file first, then regenerate

**Q: "Variable validation failed"**
A: Check the error message for the expected format. Common issues:
- `repo_name`: must be lowercase alphanumeric with hyphens
- `author`: usually any string, but check schema
- `version`: should match semantic versioning (e.g., 1.0.0)

**Q: "Target repository not found"**
A: The skill infers from git markers. If not found:
- Run from a git repository, OR
- Explicitly provide the target path

---

## Summary

**scaffold-generator** turns template generation into a guided, interactive experience. It:
- ✅ Chooses conversational or form mode intelligently
- ✅ Validates variables in real-time with helpful errors
- ✅ Shows dry-run preview before writing
- ✅ Suggests defaults and explains constraints
- ✅ Works with Claude agents for automation
- ✅ Works with humans for learning and discovery

Use it whenever a user wants to generate skill files from templates.
