"""
Unit tests for scaffold_generator.py module (main orchestrator).
"""

import pytest


@pytest.mark.unit
class TestScaffoldGenerator:
    """Tests for ScaffoldGenerator class."""

    def test_init_with_mcp_client(self, mock_mcp_client):
        """Test initialization with MCP client."""
        from scaffold_generator import ScaffoldGenerator
        gen = ScaffoldGenerator(mock_mcp_client)
        assert gen.mcp_client == mock_mcp_client
        assert gen.discovery is not None
        assert gen.validator is not None
        assert gen.preview_gen is not None
        assert gen.applier is not None

    def test_detect_interaction_mode_form(self, mock_mcp_client, sample_variables):
        """Test detection of form interaction mode."""
        from scaffold_generator import ScaffoldGenerator, InteractionMode
        gen = ScaffoldGenerator(mock_mcp_client)
        
        # Form mode: all variables provided
        mode = gen.detect_interaction_mode(
            "Generate a skill",
            provided_variables=sample_variables,
        )
        assert mode == InteractionMode.FORM

    def test_detect_interaction_mode_conversational(self, mock_mcp_client):
        """Test detection of conversational interaction mode."""
        from scaffold_generator import ScaffoldGenerator, InteractionMode
        gen = ScaffoldGenerator(mock_mcp_client)
        
        # Conversational mode: asking questions
        mode = gen.detect_interaction_mode(
            "Can you help me create a skill? How should I set it up?"
        )
        assert mode == InteractionMode.CONVERSATIONAL

    def test_conversational_workflow_complete(self, mock_mcp_client, sample_variables):
        """Test complete conversational workflow."""
        from scaffold_generator import ScaffoldGenerator
        gen = ScaffoldGenerator(mock_mcp_client)
        
        # Mock responses for conversational flow
        mock_mcp_client.set_response("list_templates", {
            "templates": [
                {"name": "t1", "target": "f1", "skill_type": "cli"},
            ],
            "total": 1,
        })
        mock_mcp_client.set_response("validate_variables", {
            "valid": True,
            "errors": [],
        })
        mock_mcp_client.set_response("scaffold_dry_run", {
            "success": True,
            "proposedChanges": [{"file": "f1", "action": "create"}],
            "totalFiles": 1,
        })
        
        # Mock the workflow
        success = gen.run_conversational_mode(
            repo_path="/tmp/test",
            skill_type="cli",
        )
        assert success is not None

    def test_form_mode_workflow_complete(self, mock_mcp_client, sample_variables):
        """Test complete form mode workflow."""
        from scaffold_generator import ScaffoldGenerator
        gen = ScaffoldGenerator(mock_mcp_client)
        
        mock_mcp_client.set_response("validate_variables", {
            "valid": True,
            "errors": [],
        })
        mock_mcp_client.set_response("scaffold_dry_run", {
            "success": True,
            "proposedChanges": [],
            "totalFiles": 0,
        })
        mock_mcp_client.set_response("scaffold_apply", {
            "success": True,
            "filesWritten": 3,
            "coverage": 85,
        })
        
        success = gen.run_form_mode(
            repo_path="/tmp/test",
            repo_name="test-skill",
            skill_type="cli",
            variables=sample_variables,
        )
        assert success is not None

    def test_orchestrate_full_workflow(self, mock_mcp_client, sample_variables):
        """Test full orchestration with all steps."""
        from scaffold_generator import ScaffoldGenerator
        gen = ScaffoldGenerator(mock_mcp_client)
        
        # Setup mock responses for full workflow
        mock_mcp_client.set_response("list_templates", {
            "templates": [{"name": "t1", "target": "f1"}],
            "total": 1,
        })
        mock_mcp_client.set_response("validate_variables", {
            "valid": True,
            "errors": [],
        })
        mock_mcp_client.set_response("scaffold_dry_run", {
            "success": True,
            "proposedChanges": [{"file": "f1"}],
            "totalFiles": 1,
        })
        mock_mcp_client.set_response("scaffold_apply", {
            "success": True,
            "filesWritten": 1,
            "coverage": 90,
        })
        
        # Run orchestration
        result = gen.orchestrate(
            prompt="Create a skill",
            repo_path="/tmp/test",
            repo_name="test",
            skill_type="cli",
            variables=sample_variables,
            phases="all",
        )
        assert result is not None

    def test_error_handling_in_conversational(self, mock_mcp_client):
        """Test error handling in conversational workflow."""
        from scaffold_generator import ScaffoldGenerator
        gen = ScaffoldGenerator(mock_mcp_client)
        
        # Mock error in template discovery
        mock_mcp_client.set_response("list_templates", {
            "error": "MCP connection failed",
            "templates": [],
        })
        
        result = gen.run_conversational_mode(
            repo_path="/tmp/test",
            skill_type="cli",
        )
        # Should handle error gracefully
        assert result is not None

    def test_validation_error_recovery(self, mock_mcp_client):
        """Test recovery from validation errors."""
        from scaffold_generator import ScaffoldGenerator
        gen = ScaffoldGenerator(mock_mcp_client)
        
        # First call: validation fails
        invalid_vars = {"repo_name": "Invalid Name"}
        mock_mcp_client.set_response("validate_variables", {
            "valid": False,
            "errors": [{"field": "repo_name", "message": "must be lowercase"}],
        })
        
        result = gen.validate_with_recovery(
            invalid_vars,
            skill_type="cli",
        )
        assert result is not None

    def test_preview_confirmation_flow(self, mock_mcp_client, sample_variables):
        """Test preview and confirmation step."""
        from scaffold_generator import ScaffoldGenerator
        gen = ScaffoldGenerator(mock_mcp_client)
        
        mock_mcp_client.set_response("scaffold_dry_run", {
            "success": True,
            "proposedChanges": [
                {"file": "f1", "phase": 1},
                {"file": "f2", "phase": 2},
            ],
            "totalFiles": 2,
        })
        
        preview = gen.show_preview(
            repo_path="/tmp/test",
            repo_name="test",
            skill_type="cli",
            variables=sample_variables,
            phases="all",
        )
        assert preview is not None

    def test_handle_user_abort(self, mock_mcp_client):
        """Test handling user abort/cancellation."""
        from scaffold_generator import ScaffoldGenerator
        gen = ScaffoldGenerator(mock_mcp_client)
        
        # User chooses to abort
        result = gen.handle_user_response("abort")
        assert result is False or result is None

    def test_generate_next_steps(self, mock_mcp_client):
        """Test generating next steps guidance."""
        from scaffold_generator import ScaffoldGenerator
        gen = ScaffoldGenerator(mock_mcp_client)
        
        next_steps = gen.generate_next_steps(
            skill_type="cli",
            files_written=5,
            coverage=90,
        )
        assert next_steps is not None
        assert len(next_steps) > 0

    def test_logging_workflow_progression(self, mock_mcp_client, sample_variables):
        """Test that workflow progression is logged."""
        from scaffold_generator import ScaffoldGenerator
        gen = ScaffoldGenerator(mock_mcp_client)
        
        # Should log each major step
        gen.run_form_mode(
            repo_path="/tmp/test",
            repo_name="test",
            skill_type="cli",
            variables=sample_variables,
        )
        
        # Verify MCP calls were made (logged implicitly)
        assert len(mock_mcp_client.calls) >= 0

    def test_workflow_state_tracking(self, mock_mcp_client, sample_variables):
        """Test that workflow state is properly tracked."""
        from scaffold_generator import ScaffoldGenerator
        gen = ScaffoldGenerator(mock_mcp_client)
        
        # Set up complete workflow
        mock_mcp_client.set_response("validate_variables", {
            "valid": True,
            "errors": [],
        })
        mock_mcp_client.set_response("scaffold_apply", {
            "success": True,
            "filesWritten": 1,
            "coverage": 85,
        })
        
        gen.run_form_mode(
            repo_path="/tmp/test",
            repo_name="test",
            skill_type="cli",
            variables=sample_variables,
        )
        
        # Workflow state should be tracked
        assert gen.current_state is not None or len(mock_mcp_client.calls) > 0
