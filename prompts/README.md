# Prompts

Claude prompt templates and instructions for the scaffold-generator skill.

## Purpose

This directory holds:
- System prompts for sub-skills
- Interaction templates
- Validation prompts
- Error handling responses

## File Organization

```
prompts/
├── system/
│   ├── scaffold-discover.md
│   ├── scaffold-validate.md
│   ├── scaffold-preview.md
│   └── scaffold-apply.md
└── interactions/
    ├── conversational-mode.md
    └── form-based-mode.md
```

## Prompt Design

Each prompt file includes:
- **Purpose**: What the prompt is for
- **Context**: Variables and input format
- **Behavior**: How the skill should respond
- **Error handling**: What to do if validation fails

## Using Prompts

Prompts are loaded by the skill at runtime from this directory. To modify prompt behavior:

1. Edit the relevant `.md` file
2. Test with the skill
3. Document changes in a commit message

## Contributing Prompts

New prompts should be:
- Clear and specific
- Well-documented
- Include examples
- Handle edge cases

See [../docs/architecture.md](../docs/architecture.md) for how prompts are integrated into the skill.
