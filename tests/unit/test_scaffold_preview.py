"""Unit tests for scaffold_preview.py"""

import pytest


@pytest.mark.unit
class TestPreviewGenerator:
    """Tests for PreviewGenerator class."""

    def test_init(self, mock_mcp_client):
        """Test initialization."""
        from scaffold_preview import PreviewGenerator
        preview = PreviewGenerator(mock_mcp_client)
        assert preview.mcp_client == mock_mcp_client

    def test_generate_preview(self, mock_mcp_client, sample_variables):
        """Test generating preview."""
        from scaffold_preview import PreviewGenerator
        preview = PreviewGenerator(mock_mcp_client)
        
        mock_mcp_client.set_response("scaffold_dry_run", {
            "success": True,
            "proposedChanges": [{"file": "README.md"}],
            "totalFiles": 1
        })
        
        result = preview.generate_preview(
            repo_path="/tmp/test",
            repo_name="test",
            skill_type="cli",
            variables=sample_variables,
            phases="all"
        )
        assert result is not None

    def test_format_preview(self, mock_mcp_client):
        """Test formatting preview."""
        from scaffold_preview import PreviewGenerator
        preview = PreviewGenerator(mock_mcp_client)
        
        preview_data = {
            "proposedChanges": [{"file": "README.md", "action": "create"}],
            "totalFiles": 1
        }
        output = preview.format_preview(preview_data)
        assert output is not None

    def test_format_file_details(self, mock_mcp_client):
        """Test formatting file details."""
        from scaffold_preview import PreviewGenerator
        preview = PreviewGenerator(mock_mcp_client)
        
        preview_data = {
            "proposedChanges": [{"file": "README.md", "action": "create"}]
        }
        output = preview.format_file_details(preview_data)
        assert output is not None

    def test_show_variable_highlights(self, mock_mcp_client, sample_variables):
        """Test showing variable highlights."""
        from scaffold_preview import PreviewGenerator
        preview = PreviewGenerator(mock_mcp_client)
        
        preview_data = {
            "variables": sample_variables,
            "content": "Skill: {{repo_name}}"
        }
        output = preview.show_variable_highlights(preview_data)
        assert output is not None

    def test_ask_confirmation(self, mock_mcp_client, monkeypatch):
        """Test asking for confirmation."""
        from scaffold_preview import PreviewGenerator
        preview = PreviewGenerator(mock_mcp_client)
        
        # Mock user input
        monkeypatch.setattr('builtins.input', lambda _: 'yes')
        result = preview.ask_confirmation()
        assert isinstance(result, bool)

    def test_format_value(self, mock_mcp_client):
        """Test formatting values."""
        from scaffold_preview import PreviewGenerator
        preview = PreviewGenerator(mock_mcp_client)
        
        formatted = preview._format_value("test value")
        assert formatted is not None
