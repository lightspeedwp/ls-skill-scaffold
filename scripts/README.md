# Scripts

Helper Python scripts for the scaffold-generator skill.

## Overview

| Script | Purpose |
|--------|---------|
| `scaffold_discover.py` | List available templates and metadata |
| `scaffold_validate.py` | Validate user-provided variables |
| `scaffold_preview.py` | Generate dry-run preview of files |
| `scaffold_apply.py` | Write files to disk |

## Running Scripts

Scripts are invoked by the scaffold-generator skill through the MCP server. To run manually:

```bash
python3 scripts/scaffold_discover.py
python3 scripts/scaffold_validate.py --skill-name "my-skill" --skill-type "cli"
```

## Development

Each script is designed to be:
- **Standalone**: Can be tested independently
- **Reusable**: Imported as modules by the skill
- **Well-documented**: Includes docstrings and type hints

See [../tests/README.md](../tests/README.md) for test coverage.

## Testing

Run script tests:

```bash
pytest tests/unit -v
```
