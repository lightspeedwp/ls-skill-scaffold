---
name: scaffold-generator
description: |
  Generate complete skill boilerplate from templates in seconds. Use this whenever someone wants to create a new skill (CLI, validation, documentation, or agent type), bootstrap a skill repository, generate missing skill files, or build skill scaffolding — whether they explicitly ask for "skill generation" or use related phrases like "create a new skill", "set up a skill structure", "bootstrap templates", "I need a skill that does X", or "help me build my first skill". This skill intelligently adapts: guides step-by-step for new users learning to create skills, runs fast form-mode for power users who provide all variables upfront. Always preview before writing, validate variables in real-time, suggest sensible defaults. Proactively offer this skill whenever skill creation is mentioned or implied (e.g., "I want to build a skill for...", "We need a custom skill to...", "Create a scaffolding for a new tool").
compatibility: |
  Requires: skill-scaffold MCP server with templates directory and Mustache templating support
  MCP tools: list_templates, validate_variables, template_render, scaffold_dry_run, scaffold_apply, skill_info
---

# Scaffold Generator

Generate skill files interactively using the skill-scaffold MCP server and Mustache templating.

## Overview

Generate complete, production-ready skill boilerplate in minutes using the skill-scaffold MCP server. This skill handles the entire workflow:

1. **Smart Mode Selection** — Guides newcomers step-by-step, gives power users a fast form-based flow
2. **Template Discovery** — Lists available templates (CLI, validation, documentation, agent), filtered by type and phase
3. **Real-Time Validation** — Validates each variable as you enter it, suggests fixes, prevents errors
4. **Dry-Run Preview** — Always shows exactly what will be created before writing a single file
5. **Safe File Writing** — Confirms before overwriting, reports coverage %, displays file manifest

**Bottom line:** Say what skill you want to build. This skill figures out what templates apply, asks for the details you need, shows you a preview, and writes the files — or guides you through the whole process if you're new to skill creation.

## When to Use This Skill

**Trigger this skill when the user:**
- Wants to **create a new skill** (CLI tool, validation engine, documentation helper, or agent)
- Asks **"How do I build my first skill?"** or **"Help me create a skill that..."**
- Needs to **bootstrap a skill repository** or **generate a skill scaffold**
- Mentions **generating skill files**, **setting up skill structure**, or **building a skill template**
- Is **starting a new skill project** and wants a guided experience
- Has **all the details ready** and wants to generate files instantly (form mode)
- Uses related language: "create skill boilerplate", "generate a skill from templates", "scaffold a new tool", "I need to build a custom skill"

**Also use it proactively:**
- When a user describes what they want to build and it sounds like a skill
- When they ask for automation or custom functionality (could be a skill)
- When they mention "I need a tool that..." and the tool could be a skill

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
   Start it with: npx @modelcontextprotocol/inspector node /path/to/ls-skill-scaffold/mcp/server/src/index.ts
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

### Example 1: New User (Conversational Mode)
```
User: "Help me create my first skill, it's a CLI tool"

Claude: I'll guide you step-by-step!

1. Skill type? (CLI / Validation / Documentation / Agent)
   → User: CLI

2. Which phases? (1=foundation, 2=core, 3=polish, or all)
   → User: All

3. Repository name? (lowercase, hyphens ok)
   → User: my-awesome-cli

4. Author name?
   → User: Claude

Claude: Here's what we'll create (dry-run preview):
  ✓ SKILL.md
  ✓ scripts/generate.py
  ✓ tests/test_cli.py
  ✓ docs/usage.md
  [4 files, 90% coverage]

User: Looks good!

Claude: ✅ Files written to /path/to/my-awesome-cli
```

### Example 2: Experienced User (Form Mode)
```
User: "Generate a validation skill: repo_name=my-validator, 
       author=Ash, phases=1-2"

Claude: [Validates all variables at once]
        [Shows dry-run]
        Ready? → User: Yes

Claude: ✅ Skill generated with 3 files
```

---

## Why This Design Works

**Preview-First** — Shows exactly what will be created before any files hit disk. Prevents wrong locations, broken substitutions, accidental overwrites, and post-generation surprises.

**Real-Time Validation** — Errors caught immediately with context-aware suggestions. Faster than the back-and-forth of "oops, try again."

**Smart Defaults** — Suggested values from template metadata make generation faster, safer, and educational (users see what's typical).

**Dual Modes** — Conversational mode for learners, form mode for power users. One skill serves both without compromises.

---

## Integration & Usage

### MCP Server Requirements
This skill requires the skill-scaffold MCP server running with these tools:
- `list_templates` — discover templates
- `validate_variables` — validate variables against schema
- `template_render` — render individual templates
- `scaffold_dry_run` — preview all files before writing
- `scaffold_apply` — write files to disk
- `skill_info` — get metadata (coverage %, template count)

**Start the server:** `npx @modelcontextprotocol/inspector node /path/to/ls-skill-scaffold/mcp/server/src/index.ts`

### For Agents (Automation)
Pass all variables upfront for instant form-mode generation:
```
Generate a cli skill:
  repo_name: my-service
  author: Agent
  phases: 1
  variables:
    description: "A service that validates data"
```

The skill will validate all variables, show the dry-run, and apply templates.

### For Humans (Learning/Discovery)
Start with a description of what you want to build:
```
Help me create my first skill. It should be a CLI tool
for validating JSON schemas.
```

Claude will guide you through each step, validate as you go, and confirm before writing.

---

## Troubleshooting

**Q: "Cannot connect to MCP server"**
A: Start the skill-scaffold MCP server:
```bash
cd /path/to/skill-scaffold/mcp/server
npx @modelcontextprotocol/inspector node src/index.ts
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
