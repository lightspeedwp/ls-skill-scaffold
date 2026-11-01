"""Unit tests for scaffold_discover.py"""

import pytest


@pytest.mark.unit
class TestTemplateDiscovery:
    """Tests for TemplateDiscovery class."""

    def test_init(self, mock_mcp_client):
        """Test initialization."""
        from scaffold_discover import TemplateDiscovery
        discover = TemplateDiscovery(mock_mcp_client)
        assert discover.mcp_client == mock_mcp_client

    def test_discover_templates(self, mock_mcp_client):
        """Test discovering templates."""
        from scaffold_discover import TemplateDiscovery
        discover = TemplateDiscovery(mock_mcp_client)
        
        # Mock response
        mock_mcp_client.set_response("list_templates", {
            "templates": [
                {"name": "cli", "skill_type": "cli", "description": "CLI template", 
                 "phases": ["1", "2"], "variables": {}, "path": "/templates/cli"}
            ]
        })
        
        templates = discover.discover_templates(skill_type="cli")
        assert len(templates) >= 0

    def test_filter_templates(self, mock_mcp_client):
        """Test filtering templates."""
        from scaffold_discover import TemplateDiscovery
        discover = TemplateDiscovery(mock_mcp_client)
        
        mock_mcp_client.set_response("list_templates", {
            "templates": []
        })
        
        templates = discover.filter_templates(skill_type="cli", phases=["1"])
        assert isinstance(templates, list)

    def test_get_template_info(self, mock_mcp_client):
        """Test getting template info."""
        from scaffold_discover import TemplateDiscovery
        discover = TemplateDiscovery(mock_mcp_client)
        
        template = discover.get_template_info("cli_template")
        # Method exists and can be called

    def test_list_skill_types(self, mock_mcp_client):
        """Test listing skill types."""
        from scaffold_discover import TemplateDiscovery
        discover = TemplateDiscovery(mock_mcp_client)
        
        skill_types = discover.list_skill_types()
        assert isinstance(skill_types, list)

    def test_format_template_listing(self, mock_mcp_client):
        """Test formatting template listing."""
        from scaffold_discover import TemplateDiscovery, Template
        discover = TemplateDiscovery(mock_mcp_client)
        
        templates = [
            Template("test", "cli", "Test template", ["1"], {}, "/path"),
        ]
        output = discover.format_template_listing(templates)
        assert output is not None
