"""Unit tests for scaffold_generator.py"""

import pytest


@pytest.mark.unit
class TestScaffoldGenerator:
    """Tests for ScaffoldGenerator class."""

    def test_init(self, mock_mcp_client):
        """Test initialization."""
        from scaffold_generator import ScaffoldGenerator
        gen = ScaffoldGenerator(mock_mcp_client)
        assert gen.mcp_client == mock_mcp_client

    def test_detect_interaction_mode_conversational(self, mock_mcp_client):
        """Test detecting conversational mode."""
        from scaffold_generator import ScaffoldGenerator, InteractionMode
        gen = ScaffoldGenerator(mock_mcp_client)
        
        mode = gen.detect_interaction_mode("Can you help me create a skill?")
        assert mode == InteractionMode.CONVERSATIONAL

    def test_detect_interaction_mode_form(self, mock_mcp_client, sample_variables):
        """Test detecting form mode."""
        from scaffold_generator import ScaffoldGenerator, InteractionMode
        gen = ScaffoldGenerator(mock_mcp_client)
        
        mode = gen.detect_interaction_mode("Create skill", provided_variables=sample_variables)
        assert mode == InteractionMode.FORM

    def test_run_conversational_mode(self, mock_mcp_client, sample_variables):
        """Test conversational workflow."""
        from scaffold_generator import ScaffoldGenerator
        gen = ScaffoldGenerator(mock_mcp_client)
        
        # Setup mocks
        mock_mcp_client.set_response("list_templates", {
            "templates": [{"name": "t1", "path": "p1"}]
        })
        mock_mcp_client.set_response("scaffold_dry_run", {
            "success": True,
            "proposedChanges": [],
            "totalFiles": 0
        })
        mock_mcp_client.set_response("scaffold_apply", {
            "success": True,
            "filesWritten": 0
        })
        
        result = gen.run_conversational_mode(repo_path="/tmp/test")
        assert result is not None

    def test_run_form_mode(self, mock_mcp_client, sample_variables):
        """Test form mode workflow."""
        from scaffold_generator import ScaffoldGenerator
        gen = ScaffoldGenerator(mock_mcp_client)
        
        mock_mcp_client.set_response("validate_variables", {
            "valid": True,
            "errors": []
        })
        mock_mcp_client.set_response("scaffold_dry_run", {
            "success": True,
            "proposedChanges": [],
            "totalFiles": 0
        })
        mock_mcp_client.set_response("scaffold_apply", {
            "success": True,
            "filesWritten": 0
        })
        
        result = gen.run_form_mode(
            repo_path="/tmp/test",
            skill_type="cli",
            variables=sample_variables
        )
        assert result is not None

    def test_run_workflow(self, mock_mcp_client, sample_variables):
        """Test main run method."""
        from scaffold_generator import ScaffoldGenerator
        gen = ScaffoldGenerator(mock_mcp_client)
        
        mock_mcp_client.set_response("scaffold_apply", {
            "success": True,
            "filesWritten": 0
        })
        
        result = gen.run(
            prompt="Create skill",
            repo_path="/tmp/test",
            skill_type="cli",
            variables=sample_variables
        )
        assert result is not None
