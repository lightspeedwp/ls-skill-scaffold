"""
Unit tests for scaffold_apply.py module.
"""

import pytest
import os
from pathlib import Path


@pytest.mark.unit
class TestScaffoldApplier:
    """Tests for ScaffoldApplier class."""

    def test_init_with_mcp_client(self, mock_mcp_client):
        """Test initialization with MCP client."""
        from scaffold_apply import ScaffoldApplier
        applier = ScaffoldApplier(mock_mcp_client)
        assert applier.mcp_client == mock_mcp_client

    def test_apply_templates_success(self, mock_mcp_client, sample_variables, temp_repo_path):
        """Test successful template application."""
        from scaffold_apply import ScaffoldApplier
        applier = ScaffoldApplier(mock_mcp_client)
        
        mock_mcp_client.set_response("scaffold_apply", {
            "success": True,
            "filesWritten": 5,
            "coverage": 95,
            "summary": "Applied 5 templates successfully",
        })
        
        result = applier.apply_templates(
            repo_path=temp_repo_path,
            repo_name="test-skill",
            skill_type="cli",
            variables=sample_variables,
            phases="all",
            overwrite=False,
        )
        assert result["success"] is True
        assert result["filesWritten"] == 5

    def test_overwrite_protection(self, mock_mcp_client, sample_variables, temp_repo_path):
        """Test overwrite protection when file exists."""
        from scaffold_apply import ScaffoldApplier
        applier = ScaffoldApplier(mock_mcp_client)
        
        # Create an existing file
        existing_file = Path(temp_repo_path) / "SKILL.md"
        existing_file.write_text("Existing content")
        
        # Should ask for confirmation
        needs_confirmation = applier.check_overwrite(str(existing_file))
        assert needs_confirmation is True

    def test_atomic_operation_all_or_nothing(self, mock_mcp_client, sample_variables):
        """Test atomic operation - all files or nothing."""
        from scaffold_apply import ScaffoldApplier
        applier = ScaffoldApplier(mock_mcp_client)
        
        # Mock partial failure
        mock_mcp_client.set_response("scaffold_apply", {
            "success": False,
            "filesWritten": 0,
            "errors": [
                {"file": "README.md", "error": "Permission denied"},
                {"file": "SKILL.md", "error": "Permission denied"},
            ],
        })
        
        result = applier.apply_templates(
            repo_path="/invalid/path",
            repo_name="test",
            skill_type="cli",
            variables=sample_variables,
            phases="1",
            overwrite=False,
        )
        # Should be atomic - either all succeed or all fail
        assert "success" in result

    def test_conflict_resolution(self, mock_mcp_client, sample_variables, temp_repo_path):
        """Test conflict resolution for existing files."""
        from scaffold_apply import ScaffoldApplier
        applier = ScaffoldApplier(mock_mcp_client)
        
        # Create conflicting file
        conflict_file = Path(temp_repo_path) / "README.md"
        conflict_file.write_text("Existing readme")
        
        # Test skip option
        result = applier.resolve_conflict(str(conflict_file), action="skip")
        assert result == "skip"
        
        # Test overwrite option
        result = applier.resolve_conflict(str(conflict_file), action="overwrite")
        assert result == "overwrite"

    def test_apply_specific_phases(self, mock_mcp_client, sample_variables):
        """Test applying only specific phases."""
        from scaffold_apply import ScaffoldApplier
        applier = ScaffoldApplier(mock_mcp_client)
        
        mock_mcp_client.set_response("scaffold_apply", {
            "success": True,
            "filesWritten": 2,
            "coverage": 45,
            "summary": "Applied phase 1 templates",
        })
        
        result = applier.apply_templates(
            repo_path="/tmp/test",
            repo_name="test",
            skill_type="cli",
            variables=sample_variables,
            phases="1",
            overwrite=False,
        )
        assert result["success"] is True

    def test_file_permissions_handling(self, mock_mcp_client, sample_variables, temp_repo_path):
        """Test handling of file permission issues."""
        from scaffold_apply import ScaffoldApplier
        applier = ScaffoldApplier(mock_mcp_client)
        
        mock_mcp_client.set_response("scaffold_apply", {
            "success": False,
            "filesWritten": 0,
            "errors": [{"file": "file", "error": "Permission denied"}],
        })
        
        result = applier.apply_templates(
            repo_path=temp_repo_path,
            repo_name="test",
            skill_type="cli",
            variables=sample_variables,
            phases="all",
            overwrite=False,
        )
        assert "errors" in result or result["success"] is False

    def test_directory_creation(self, mock_mcp_client, sample_variables, temp_repo_path):
        """Test that necessary directories are created."""
        from scaffold_apply import ScaffoldApplier
        applier = ScaffoldApplier(mock_mcp_client)
        
        # Should create directories as needed
        test_dir = Path(temp_repo_path) / "scripts" / "subdir" / "nested"
        applier.ensure_directory_exists(str(test_dir))
        assert test_dir.parent.exists()

    def test_next_steps_guidance(self, mock_mcp_client):
        """Test providing next steps guidance after application."""
        from scaffold_apply import ScaffoldApplier
        applier = ScaffoldApplier(mock_mcp_client)
        
        next_steps = applier.generate_next_steps(
            skill_type="cli",
            files_written=5,
            coverage=90,
        )
        assert next_steps is not None
        assert len(next_steps) > 0

    def test_dry_run_mode(self, mock_mcp_client, sample_variables):
        """Test applying in dry-run mode (no actual writes)."""
        from scaffold_apply import ScaffoldApplier
        applier = ScaffoldApplier(mock_mcp_client)
        
        mock_mcp_client.set_response("scaffold_apply", {
            "success": True,
            "filesWritten": 0,
            "dryRun": True,
            "summary": "Dry-run: would apply 5 files",
        })
        
        result = applier.apply_templates(
            repo_path="/tmp/test",
            repo_name="test",
            skill_type="cli",
            variables=sample_variables,
            phases="all",
            overwrite=False,
            dry_run=True,
        )
        assert result["success"] is True
