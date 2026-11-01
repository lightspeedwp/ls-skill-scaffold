"""
Pytest configuration and fixtures for scaffold-generator tests.
"""

import pytest
import sys
import json
from pathlib import Path
from unittest.mock import Mock, MagicMock, patch
from typing import Dict, Any, Optional

# Add scripts directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))


class MockMCPClient:
    """Mock MCP client for testing."""

    def __init__(self):
        self.calls = []
        self.responses = {}

    def call_tool(self, tool_name: str, **kwargs) -> Dict[str, Any]:
        """Mock MCP tool call."""
        self.calls.append({"tool": tool_name, "args": kwargs})
        
        if tool_name in self.responses:
            response = self.responses[tool_name]
            if callable(response):
                return response(**kwargs)
            return response
        
        return self._default_response(tool_name, kwargs)

    def _default_response(self, tool_name: str, kwargs: Dict) -> Dict[str, Any]:
        """Provide default responses for common MCP tools."""
        if tool_name == "list_templates":
            return {
                "templates": [
                    {"name": "cli_basic", "target": "SKILL.md", "phase": 1, "skill_type": "cli"},
                    {"name": "cli_scripts", "target": "scripts/main.py", "phase": 2, "skill_type": "cli"},
                ],
                "total": 2,
            }
        elif tool_name == "validate_variables":
            return {"valid": True, "errors": []}
        elif tool_name == "template_render":
            return {"success": True, "content": "Rendered template content", "lines": 10}
        elif tool_name == "scaffold_dry_run":
            return {
                "success": True,
                "proposedChanges": [{"file": "SKILL.md", "action": "create", "phase": 1}],
                "totalFiles": 1,
            }
        elif tool_name == "scaffold_apply":
            return {"success": True, "filesWritten": 1, "coverage": 95, "summary": "Applied 1 template"}
        elif tool_name == "skill_info":
            return {"name": "skill-scaffold", "version": "1.0.0", "templates": {"total": 24}}
        return {"success": True}

    def set_response(self, tool_name: str, response: Dict[str, Any]):
        """Set custom response for a tool."""
        self.responses[tool_name] = response


@pytest.fixture
def mock_mcp_client():
    """Fixture providing a mock MCP client."""
    return MockMCPClient()


@pytest.fixture
def sample_variables():
    """Fixture providing sample variables."""
    return {
        "repo_name": "my-skill",
        "author": "Test Author",
        "version": "1.0.0",
        "description": "A test skill",
    }


@pytest.fixture
def sample_config():
    """Fixture providing sample configuration."""
    return {
        "skill_type": "cli",
        "phases": "all",
        "target_repo": "/tmp/test-repo",
        "interaction_mode": "form",
    }


@pytest.fixture
def temp_repo_path(tmp_path):
    """Fixture providing a temporary repository path."""
    repo_path = tmp_path / "test_repo"
    repo_path.mkdir()
    return str(repo_path)


@pytest.fixture
def sample_templates():
    """Fixture providing sample templates."""
    return [
        {"name": "skill_readme", "target": "README.md", "phase": 1, "skill_type": "cli"},
        {"name": "skill_manifest", "target": "skill.json", "phase": 1, "skill_type": "cli"},
        {"name": "cli_main", "target": "scripts/main.py", "phase": 2, "skill_type": "cli"},
    ]
