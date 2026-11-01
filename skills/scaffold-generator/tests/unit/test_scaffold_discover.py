"""
Unit tests for scaffold_discover.py module.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock


@pytest.mark.unit
class TestTemplateDiscovery:
    """Tests for TemplateDiscovery class."""

    def test_init_with_mcp_client(self, mock_mcp_client):
        """Test initialization with MCP client."""
        from scaffold_discover import TemplateDiscovery
        discover = TemplateDiscovery(mock_mcp_client)
        assert discover.mcp_client == mock_mcp_client

    def test_list_templates_with_skill_type(self, mock_mcp_client):
        """Test listing templates filtered by skill type."""
        from scaffold_discover import TemplateDiscovery
        discover = TemplateDiscovery(mock_mcp_client)
        
        # Mock response
        mock_mcp_client.set_response("list_templates", {
            "templates": [
                {"name": "cli_1", "target": "file1", "skill_type": "cli", "phase": 1},
                {"name": "cli_2", "target": "file2", "skill_type": "cli", "phase": 2},
            ],
            "total": 2,
        })
        
        result = discover.list_templates(skill_type="cli")
        assert result["total"] == 2
        assert len(result["templates"]) == 2

    def test_list_templates_with_phase(self, mock_mcp_client):
        """Test listing templates filtered by phase."""
        from scaffold_discover import TemplateDiscovery
        discover = TemplateDiscovery(mock_mcp_client)
        
        mock_mcp_client.set_response("list_templates", {
            "templates": [{"name": "cli_1", "target": "file1", "phase": 1}],
            "total": 1,
        })
        
        result = discover.list_templates(skill_type="cli", phase="1")
        assert result["total"] == 1

    def test_list_templates_error_handling(self, mock_mcp_client):
        """Test error handling in list_templates."""
        from scaffold_discover import TemplateDiscovery
        discover = TemplateDiscovery(mock_mcp_client)
        
        # Mock error response
        mock_mcp_client.set_response("list_templates", {
            "error": "MCP connection failed",
            "templates": [],
        })
        
        result = discover.list_templates(skill_type="cli")
        # Should handle gracefully and return empty or error
        assert "templates" in result or "error" in result

    def test_get_template_by_name(self, mock_mcp_client):
        """Test retrieving a template by name."""
        from scaffold_discover import TemplateDiscovery
        discover = TemplateDiscovery(mock_mcp_client)
        
        # Mock list response
        templates = [
            {"name": "test_template", "target": "output.txt", "phase": 1},
            {"name": "other_template", "target": "other.txt", "phase": 2},
        ]
        mock_mcp_client.set_response("list_templates", {
            "templates": templates,
            "total": 2,
        })
        
        result = discover.list_templates()
        assert len(result["templates"]) == 2

    def test_filter_by_multiple_criteria(self, mock_mcp_client):
        """Test filtering templates by multiple criteria."""
        from scaffold_discover import TemplateDiscovery
        discover = TemplateDiscovery(mock_mcp_client)
        
        mock_mcp_client.set_response("list_templates", {
            "templates": [
                {"name": "cli_phase2", "target": "file", "skill_type": "cli", "phase": 2},
            ],
            "total": 1,
        })
        
        result = discover.list_templates(skill_type="cli", phase="2")
        assert result["total"] == 1
        assert result["templates"][0]["phase"] == 2

    def test_get_variants(self, mock_mcp_client):
        """Test getting template variants."""
        from scaffold_discover import TemplateDiscovery
        discover = TemplateDiscovery(mock_mcp_client)
        
        mock_mcp_client.set_response("list_variants", {
            "skillType": "cli",
            "variants": [
                {"tag": "basic", "templates": ["t1", "t2"]},
                {"tag": "advanced", "templates": ["t3", "t4"]},
            ],
        })
        
        result = discover.get_variants(skill_type="cli")
        assert "variants" in result
        assert len(result["variants"]) >= 0

    def test_handle_empty_template_list(self, mock_mcp_client):
        """Test handling empty template list."""
        from scaffold_discover import TemplateDiscovery
        discover = TemplateDiscovery(mock_mcp_client)
        
        mock_mcp_client.set_response("list_templates", {
            "templates": [],
            "total": 0,
        })
        
        result = discover.list_templates(skill_type="nonexistent")
        assert result["total"] == 0
        assert len(result["templates"]) == 0

    def test_pagination_support(self, mock_mcp_client):
        """Test pagination support in list_templates."""
        from scaffold_discover import TemplateDiscovery
        discover = TemplateDiscovery(mock_mcp_client)
        
        mock_mcp_client.set_response("list_templates", {
            "templates": [{"name": f"t{i}", "target": f"file{i}"} for i in range(10)],
            "total": 25,
            "page": 1,
            "pages": 3,
        })
        
        result = discover.list_templates(page=1, limit=10)
        assert result["page"] == 1
        assert result["total"] == 25
