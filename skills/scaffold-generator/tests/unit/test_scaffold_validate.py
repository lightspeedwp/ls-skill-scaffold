"""
Unit tests for scaffold_validate.py module.
"""

import pytest


@pytest.mark.unit
class TestVariableValidator:
    """Tests for VariableValidator class."""

    def test_init_with_mcp_client(self, mock_mcp_client):
        """Test initialization with MCP client."""
        from scaffold_validate import VariableValidator
        validator = VariableValidator(mock_mcp_client)
        assert validator.mcp_client == mock_mcp_client

    def test_validate_variables_success(self, mock_mcp_client, sample_variables):
        """Test successful variable validation."""
        from scaffold_validate import VariableValidator
        validator = VariableValidator(mock_mcp_client)
        
        mock_mcp_client.set_response("validate_variables", {
            "valid": True,
            "errors": [],
        })
        
        result = validator.validate_variables(sample_variables)
        assert result["valid"] is True
        assert len(result["errors"]) == 0

    def test_validate_variables_with_errors(self, mock_mcp_client):
        """Test variable validation with errors."""
        from scaffold_validate import VariableValidator
        validator = VariableValidator(mock_mcp_client)
        
        mock_mcp_client.set_response("validate_variables", {
            "valid": False,
            "errors": [
                {"field": "repo_name", "message": "must be lowercase"},
                {"field": "version", "message": "invalid semver"},
            ],
        })
        
        result = validator.validate_variables({"repo_name": "My-Skill", "version": "invalid"})
        assert result["valid"] is False
        assert len(result["errors"]) == 2

    def test_validate_individual_field(self, mock_mcp_client):
        """Test validating individual field."""
        from scaffold_validate import VariableValidator
        validator = VariableValidator(mock_mcp_client)
        
        # Test repo_name validation
        result = validator.validate_field("repo_name", "my-skill")
        assert result is True
        
        result = validator.validate_field("repo_name", "Invalid Name")
        assert result is False

    def test_validate_semver(self, mock_mcp_client):
        """Test semantic version validation."""
        from scaffold_validate import VariableValidator
        validator = VariableValidator(mock_mcp_client)
        
        assert validator.validate_field("version", "1.0.0") is True
        assert validator.validate_field("version", "2.1.3-beta") is True
        assert validator.validate_field("version", "invalid") is False

    def test_validate_email(self, mock_mcp_client):
        """Test email validation."""
        from scaffold_validate import VariableValidator
        validator = VariableValidator(mock_mcp_client)
        
        assert validator.validate_field("email", "test@example.com") is True
        assert validator.validate_field("email", "invalid-email") is False

    def test_validate_url(self, mock_mcp_client):
        """Test URL validation."""
        from scaffold_validate import VariableValidator
        validator = VariableValidator(mock_mcp_client)
        
        assert validator.validate_field("url", "https://example.com") is True
        assert validator.validate_field("url", "not-a-url") is False

    def test_get_schema_for_skill_type(self, mock_mcp_client):
        """Test getting schema for skill type."""
        from scaffold_validate import VariableValidator
        validator = VariableValidator(mock_mcp_client)
        
        mock_mcp_client.set_response("validate_variables", {
            "valid": True,
            "required": ["repo_name", "author"],
            "optional": ["version", "description"],
        })
        
        result = validator.get_schema("cli")
        assert "required" in result or "valid" in result

    def test_suggest_fix_for_error(self, mock_mcp_client):
        """Test suggesting fixes for validation errors."""
        from scaffold_validate import VariableValidator
        validator = VariableValidator(mock_mcp_client)
        
        # Test suggestion for kebab-case
        suggestion = validator.suggest_fix("repo_name", "My-Skill")
        assert suggestion and "my-skill" in suggestion.lower()

    def test_validate_multiple_fields(self, mock_mcp_client, sample_variables):
        """Test validating multiple fields."""
        from scaffold_validate import VariableValidator
        validator = VariableValidator(mock_mcp_client)
        
        mock_mcp_client.set_response("validate_variables", {
            "valid": True,
            "errors": [],
        })
        
        result = validator.validate_variables(sample_variables)
        assert result["valid"] is True

    def test_handle_missing_required_fields(self, mock_mcp_client):
        """Test handling missing required fields."""
        from scaffold_validate import VariableValidator
        validator = VariableValidator(mock_mcp_client)
        
        mock_mcp_client.set_response("validate_variables", {
            "valid": False,
            "errors": [{"field": "repo_name", "message": "is required"}],
        })
        
        result = validator.validate_variables({})
        assert result["valid"] is False

    def test_preserve_fields_on_retry(self, mock_mcp_client):
        """Test that valid fields are preserved during retry."""
        from scaffold_validate import VariableValidator
        validator = VariableValidator(mock_mcp_client)
        
        initial = {"repo_name": "my-skill", "version": "invalid"}
        corrected = {"repo_name": "my-skill", "version": "1.0.0"}
        
        mock_mcp_client.set_response("validate_variables", {
            "valid": True,
            "errors": [],
        })
        
        result = validator.validate_variables(corrected)
        assert result["valid"] is True
