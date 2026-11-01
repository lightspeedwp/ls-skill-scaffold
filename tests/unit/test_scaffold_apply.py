"""Unit tests for scaffold_apply.py"""

import pytest


@pytest.mark.unit
class TestScaffoldApplier:
    """Tests for ScaffoldApplier class."""

    def test_init(self, mock_mcp_client):
        """Test initialization."""
        from scaffold_apply import ScaffoldApplier
        applier = ScaffoldApplier(mock_mcp_client)
        assert applier.mcp_client == mock_mcp_client

    def test_apply_scaffold_success(self, mock_mcp_client, sample_variables):
        """Test successful scaffold application."""
        from scaffold_apply import ScaffoldApplier
        applier = ScaffoldApplier(mock_mcp_client)
        
        mock_mcp_client.set_response("scaffold_apply", {
            "success": True,
            "filesWritten": 5,
            "coverage": 95
        })
        
        result = applier.apply_scaffold(
            repo_path="/tmp/test",
            repo_name="test",
            skill_type="cli",
            variables=sample_variables,
            phases="all",
            overwrite=False
        )
        assert result is not None

    def test_handle_overwrite_conflicts(self, mock_mcp_client):
        """Test handling overwrite conflicts."""
        from scaffold_apply import ScaffoldApplier
        applier = ScaffoldApplier(mock_mcp_client)
        
        conflicts = [{"file": "README.md", "exists": True}]
        result = applier.handle_overwrite_conflicts(conflicts)
        assert result is not None

    def test_format_result(self, mock_mcp_client):
        """Test formatting result."""
        from scaffold_apply import ScaffoldApplier, ApplyResult
        applier = ScaffoldApplier(mock_mcp_client)
        
        result = ApplyResult(
            success=True,
            files_written=5,
            errors=[],
            coverage=95,
            summary="Applied 5 files"
        )
        output = applier.format_result(result)
        assert output is not None

    def test_format_next_steps(self, mock_mcp_client):
        """Test formatting next steps."""
        from scaffold_apply import ScaffoldApplier, ApplyResult
        applier = ScaffoldApplier(mock_mcp_client)
        
        result = ApplyResult(
            success=True,
            files_written=5,
            errors=[],
            coverage=95,
            summary="Applied 5 files"
        )
        output = applier.format_next_steps(result, "/tmp/test")
        assert output is not None
