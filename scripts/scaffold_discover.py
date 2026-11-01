#!/usr/bin/env python3
"""
scaffold-discover.py
Discovers available skill-scaffold templates from MCP server.
Lists templates filtered by skill_type and phases.
"""

import json
import sys
import logging
from typing import Optional, Dict, Any, List
from dataclasses import dataclass

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class Template:
    """Represents a skill-scaffold template."""
    name: str
    skill_type: str
    description: str
    phases: List[str]
    variables: Dict[str, Any]
    path: str

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "name": self.name,
            "skill_type": self.skill_type,
            "description": self.description,
            "phases": self.phases,
            "variables": self.variables,
            "path": self.path,
        }


class TemplateDiscovery:
    """Discovers templates from MCP server."""

    def __init__(self, mcp_client):
        """
        Initialize discovery with MCP client.

        Args:
            mcp_client: MCP client instance for calling tools
        """
        self.mcp_client = mcp_client
        self.templates_cache = None

    def discover_templates(
        self,
        skill_type: Optional[str] = None,
        phases: Optional[List[str]] = None,
    ) -> List[Template]:
        """
        Discover templates from MCP server.

        Args:
            skill_type: Filter by skill type (cli, validation, documentation, agent)
            phases: Filter by phases (1, 2, 3, or all)

        Returns:
            List of discovered templates

        Raises:
            RuntimeError: If MCP call fails
        """
        try:
            # Call MCP tool to list templates
            result = self.mcp_client.call_tool(
                "list_templates",
                {
                    "skill_type": skill_type,
                    "phases": phases or "all",
                }
            )

            if not result.get("success"):
                raise RuntimeError(f"Template discovery failed: {result.get('error')}")

            # Parse templates from result
            templates = []
            for template_data in result.get("templates", []):
                template = Template(
                    name=template_data["name"],
                    skill_type=template_data["skill_type"],
                    description=template_data["description"],
                    phases=template_data.get("phases", ["1", "2", "3"]),
                    variables=template_data.get("variables", {}),
                    path=template_data["path"],
                )
                templates.append(template)

            logger.info(f"Discovered {len(templates)} templates")
            self.templates_cache = templates
            return templates

        except Exception as e:
            logger.error(f"Template discovery error: {e}")
            raise RuntimeError(f"Failed to discover templates: {e}")

    def filter_templates(
        self,
        templates: List[Template],
        skill_type: Optional[str] = None,
        requires_phases: Optional[List[str]] = None,
    ) -> List[Template]:
        """
        Filter templates by criteria.

        Args:
            templates: List of templates to filter
            skill_type: Filter by skill type
            requires_phases: Filter by required phases

        Returns:
            Filtered list of templates
        """
        filtered = templates

        if skill_type:
            filtered = [t for t in filtered if t.skill_type == skill_type]

        if requires_phases:
            filtered = [
                t for t in filtered
                if any(phase in t.phases for phase in requires_phases)
            ]

        return filtered

    def get_template_info(self, template_name: str) -> Optional[Template]:
        """
        Get information about a specific template.

        Args:
            template_name: Name of template to retrieve

        Returns:
            Template object or None if not found
        """
        if not self.templates_cache:
            self.discover_templates()

        for template in self.templates_cache:
            if template.name == template_name:
                return template

        return None

    def list_skill_types(self) -> List[str]:
        """
        Get list of available skill types.

        Returns:
            List of skill type strings
        """
        return ["cli", "validation", "documentation", "agent"]

    def format_template_listing(self, templates: List[Template]) -> str:
        """
        Format templates for display to user.

        Args:
            templates: List of templates to format

        Returns:
            Formatted string for display
        """
        if not templates:
            return "No templates found matching your criteria."

        lines = ["Available Templates:", "=" * 50]

        for i, template in enumerate(templates, 1):
            lines.append(f"\n{i}. {template.name}")
            lines.append(f"   Type: {template.skill_type}")
            lines.append(f"   Description: {template.description}")
            lines.append(f"   Phases: {', '.join(template.phases)}")
            lines.append(f"   Variables: {len(template.variables)}")

        return "\n".join(lines)


def main():
    """Command-line interface for template discovery."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Discover skill-scaffold templates"
    )
    parser.add_argument(
        "--skill-type",
        help="Filter by skill type (cli, validation, documentation, agent)"
    )
    parser.add_argument(
        "--phases",
        help="Filter by phases (comma-separated: 1,2,3)"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output as JSON"
    )

    args = parser.parse_args()

    # Mock MCP client for testing
    class MockMCPClient:
        def call_tool(self, tool_name, params):
            # Simulate MCP response with example templates
            return {
                "success": True,
                "templates": [
                    {
                        "name": "phase-1-cli-basic",
                        "skill_type": "cli",
                        "description": "Basic CLI skill scaffold",
                        "phases": ["1", "2", "3"],
                        "variables": {
                            "skill_name": {"type": "string", "required": True},
                            "skill_description": {"type": "string", "required": True},
                        },
                        "path": "/templates/phase-1-cli-basic",
                    },
                    {
                        "name": "phase-2-agent-basic",
                        "skill_type": "agent",
                        "description": "Basic agent skill scaffold",
                        "phases": ["2", "3"],
                        "variables": {
                            "skill_name": {"type": "string", "required": True},
                        },
                        "path": "/templates/phase-2-agent-basic",
                    },
                ]
            }

    mcp_client = MockMCPClient()
    discovery = TemplateDiscovery(mcp_client)

    # Parse phases filter
    phases = None
    if args.phases:
        phases = args.phases.split(",")

    # Discover templates
    templates = discovery.discover_templates(
        skill_type=args.skill_type,
        phases=phases,
    )

    # Output
    if args.json:
        output = {
            "count": len(templates),
            "templates": [t.to_dict() for t in templates],
        }
        print(json.dumps(output, indent=2))
    else:
        print(discovery.format_template_listing(templates))


if __name__ == "__main__":
    main()
