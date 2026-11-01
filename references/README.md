# References

External and internal reference materials for the scaffold-generator skill.

## Purpose

This directory holds:
- Links to external documentation
- Reference specifications
- JSON schemas and validation rules
- Constants and configuration references

## File Organization

```
references/
├── schema/
│   ├── skill-schema.json
│   └── variable-schema.json
├── constants.yaml
└── external-links.md
```

## Common References

- **Skill Schema**: Rules for what makes a valid skill
- **Variable Schema**: Expected format for user inputs
- **MCP Server API**: Reference for communicating with MCP server
- **Template Standards**: Guidelines for creating templates

## Using References

Scripts and the skill reference these files to:
- Validate user inputs
- Generate accurate previews
- Apply correct transformations

To update validation rules:
1. Modify the relevant schema file
2. Test changes with the test suite
3. Update documentation as needed

## Adding New References

When adding new schemas or constants:
1. Create the file with clear naming
2. Include documentation at the top
3. Update this README with a brief description
4. Link from appropriate docs (e.g., [../docs/api.md](../docs/api.md))

See [../docs/architecture.md](../docs/architecture.md) for how references are used internally.
