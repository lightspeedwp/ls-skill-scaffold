# Tests

Test suite for the scaffold-generator skill.

## Structure

```
tests/
├── unit/           # Unit tests for individual functions
├── evals/          # Evaluation tests for end-to-end skill behavior
└── conftest.py     # Pytest fixtures and shared test configuration
```

## Running Tests

### All tests
```bash
pytest tests/ -v
```

### Unit tests only
```bash
pytest tests/unit -v
```

### Evaluation tests only
```bash
pytest tests/evals -v
```

### With coverage report
```bash
pytest tests/ --cov=skills/scaffold-generator/scripts --cov-report=html
# View report: open htmlcov/index.html
```

## Test Coverage

Target: 80% code coverage across scripts and core logic.

Current status: See `.github/workflows/test.yml` for CI results.

## Writing Tests

Each test file should:
1. Test one logical unit or behavior
2. Use descriptive names: `test_<function>_<scenario>`
3. Include setup/teardown via `conftest.py` fixtures
4. Mock external dependencies (file I/O, API calls)

Example:
```python
def test_validate_skill_name_rejects_invalid_characters(mock_variables):
    """Validation should reject skill names with spaces."""
    result = scaffold_validate.validate_variables(
        {"skill_name": "my skill"}  # Invalid
    )
    assert result.errors is not None
```

## Debugging Tests

Run a single test with output:
```bash
pytest tests/unit/test_scaffold_validate.py::test_my_test -vvs
```

## CI Integration

Tests run automatically on:
- Pull requests to `develop` and `main`
- Commits to `develop` and `main`
- See `.github/workflows/test.yml` for workflow details
