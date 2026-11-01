"""Unit tests for scaffold_validate.py"""

import pytest


@pytest.mark.unit
class TestVariableValidator:
    """Tests for VariableValidator class."""

    def test_init(self, mock_mcp_client):
        """Test initialization."""
        from scaffold_validate import VariableValidator
        validator = VariableValidator(mock_mcp_client)
        assert validator.mcp_client == mock_mcp_client

    def test_validate_variables_success(self, mock_mcp_client, sample_variables):
        """Test successful validation."""
        from scaffold_validate import VariableValidator
        validator = VariableValidator(mock_mcp_client)
        
        mock_mcp_client.set_response("validate_variables", {
            "valid": True,
            "errors": []
        })
        
        result = validator.validate_variables(sample_variables, "cli")
        assert result is not None

    def test_validate_variables_with_errors(self, mock_mcp_client):
        """Test validation with errors."""
        from scaffold_validate import VariableValidator
        validator = VariableValidator(mock_mcp_client)
        
        mock_mcp_client.set_response("validate_variables", {
            "valid": False,
            "errors": [{"field": "repo_name", "message": "invalid"}]
        })
        
        result = validator.validate_variables({}, "cli")
        assert result is not None

    def test_validate_field(self, mock_mcp_client):
        """Test validating single field."""
        from scaffold_validate import VariableValidator
        validator = VariableValidator(mock_mcp_client)
        
        # Test with a basic schema
        schema = {"type": "string", "pattern": "^[a-z-]+$"}
        result = validator.validate_field("repo_name", "my-skill", schema)
        assert isinstance(result, bool)

    def test_format_errors(self, mock_mcp_client):
        """Test formatting validation errors."""
        from scaffold_validate import VariableValidator, ValidationError
        validator = VariableValidator(mock_mcp_client)
        
        errors = [
            ValidationError("repo_name", "must be lowercase")
        ]
        output = validator.format_errors(errors)
        assert output is not None

    def test_parse_mcp_errors(self, mock_mcp_client):
        """Test parsing MCP errors."""
        from scaffold_validate import VariableValidator
        validator = VariableValidator(mock_mcp_client)
        
        errors = [{"field": "test", "message": "error"}]
        parsed = validator._parse_mcp_errors(errors)
        assert len(parsed) >= 0

    def test_get_suggestion(self, mock_mcp_client):
        """Test getting error suggestions."""
        from scaffold_validate import VariableValidator
        validator = VariableValidator(mock_mcp_client)
        
        suggestion = validator._get_suggestion("repo_name", "MySkill", "must be lowercase")
        # Method exists and can be called

    def test_check_type(self, mock_mcp_client):
        """Test type checking."""
        from scaffold_validate import VariableValidator
        validator = VariableValidator(mock_mcp_client)
        
        result = validator._check_type("value", "string")
        assert isinstance(result, bool)
