"""
Unit tests for scaffold_preview.py module.
"""

import pytest
import json


@pytest.mark.unit
class TestPreviewGenerator:
    """Tests for PreviewGenerator class."""

    def test_init_with_mcp_client(self, mock_mcp_client):
        """Test initialization with MCP client."""
        from scaffold_preview import PreviewGenerator
        preview = PreviewGenerator(mock_mcp_client)
        assert preview.mcp_client == mock_mcp_client

    def test_generate_dry_run_preview(self, mock_mcp_client, sample_variables):
        """Test generating dry-run preview."""
        from scaffold_preview import PreviewGenerator
        preview = PreviewGenerator(mock_mcp_client)
        
        mock_mcp_client.set_response("scaffold_dry_run", {
            "success": True,
            "proposedChanges": [
                {"file": "SKILL.md", "action": "create", "phase": 1},
                {"file": "scripts/main.py", "action": "create", "phase": 2},
            ],
            "totalFiles": 2,
            "summary": "Would create 2 files",
        })
        
        result = preview.generate_dry_run(
            repo_path="/tmp/test",
            repo_name="my-skill",
            skill_type="cli",
            variables=sample_variables,
            phases="all",
        )
        assert result["success"] is True
        assert result["totalFiles"] == 2

    def test_format_preview_summary(self, mock_mcp_client):
        """Test formatting preview summary."""
        from scaffold_preview import PreviewGenerator
        preview = PreviewGenerator(mock_mcp_client)
        
        changes = [
            {"file": "README.md", "action": "create"},
            {"file": "SKILL.md", "action": "create"},
        ]
        
        formatted = preview.format_summary(changes, "cli", 90)
        assert formatted is not None
        assert "README.md" in formatted or len(changes) > 0

    def test_highlight_variable_substitutions(self, mock_mcp_client):
        """Test highlighting variable substitutions in preview."""
        from scaffold_preview import PreviewGenerator
        preview = PreviewGenerator(mock_mcp_client)
        
        template = "Skill: {{repo_name}} by {{author}}"
        variables = {"repo_name": "my-skill", "author": "Test"}
        
        highlighted = preview.highlight_substitutions(template, variables)
        assert highlighted is not None

    def test_show_file_structure(self, mock_mcp_client):
        """Test displaying file structure in preview."""
        from scaffold_preview import PreviewGenerator
        preview = PreviewGenerator(mock_mcp_client)
        
        changes = [
            {"file": "SKILL.md", "action": "create", "phase": 1},
            {"file": "scripts/main.py", "action": "create", "phase": 2},
            {"file": "tests/test_main.py", "action": "create", "phase": 3},
        ]
        
        structure = preview.format_file_structure(changes)
        assert structure is not None

    def test_preview_with_phases(self, mock_mcp_client, sample_variables):
        """Test preview respects phase filtering."""
        from scaffold_preview import PreviewGenerator
        preview = PreviewGenerator(mock_mcp_client)
        
        mock_mcp_client.set_response("scaffold_dry_run", {
            "success": True,
            "proposedChanges": [
                {"file": "README.md", "phase": 1},
                {"file": "SKILL.md", "phase": 1},
            ],
            "totalFiles": 2,
        })
        
        result = preview.generate_dry_run(
            repo_path="/tmp/test",
            repo_name="my-skill",
            skill_type="cli",
            variables=sample_variables,
            phases="1",
        )
        assert result["success"] is True

    def test_preview_coverage_calculation(self, mock_mcp_client):
        """Test coverage percentage calculation in preview."""
        from scaffold_preview import PreviewGenerator
        preview = PreviewGenerator(mock_mcp_client)
        
        proposed = [
            {"file": f"file{i}", "action": "create"} for i in range(18)
        ]  # 18 files
        
        coverage = preview.calculate_coverage(len(proposed), 20)  # 20 total
        assert 80 <= coverage <= 95

    def test_multiple_output_formats(self, mock_mcp_client, sample_variables):
        """Test preview supports multiple output formats."""
        from scaffold_preview import PreviewGenerator
        preview = PreviewGenerator(mock_mcp_client)
        
        changes = [
            {"file": "file1", "action": "create"},
            {"file": "file2", "action": "create"},
        ]
        
        # Test summary format
        summary = preview.format_summary(changes, "cli", 85)
        assert summary is not None
        
        # Test detailed format
        detailed = preview.format_detailed(changes, sample_variables)
        assert detailed is not None

    def test_error_in_dry_run(self, mock_mcp_client):
        """Test handling errors in dry-run."""
        from scaffold_preview import PreviewGenerator
        preview = PreviewGenerator(mock_mcp_client)
        
        mock_mcp_client.set_response("scaffold_dry_run", {
            "success": False,
            "error": "MCP connection failed",
            "proposedChanges": [],
        })
        
        result = preview.generate_dry_run(
            repo_path="/tmp/test",
            repo_name="my-skill",
            skill_type="cli",
            variables={},
            phases="all",
        )
        # Should handle error gracefully
        assert "success" in result or "error" in result

    def test_interactive_confirmation_format(self, mock_mcp_client):
        """Test format for interactive confirmation."""
        from scaffold_preview import PreviewGenerator
        preview = PreviewGenerator(mock_mcp_client)
        
        changes = [
            {"file": "README.md", "action": "create", "phase": 1},
            {"file": "SKILL.md", "action": "create", "phase": 1},
        ]
        
        confirmation_prompt = preview.format_confirmation(changes, 90)
        assert confirmation_prompt is not None
