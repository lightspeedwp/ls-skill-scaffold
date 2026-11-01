#!/usr/bin/env python3
"""
scaffold-preview.py
Shows dry-run preview of template application.
Displays proposed files and variable substitutions.
"""

import json
import sys
import logging
from typing import Dict, Any, List, Tuple
from dataclasses import dataclass

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class PreviewFile:
    """Represents a file in the preview."""
    path: str
    type: str  # "create", "modify", "skip"
    content_preview: str
    size_bytes: int


class PreviewGenerator:
    """Generates dry-run previews of template application."""

    def __init__(self, mcp_client):
        """
        Initialize preview generator with MCP client.

        Args:
            mcp_client: MCP client instance for calling tools
        """
        self.mcp_client = mcp_client

    def generate_preview(
        self,
        repo_path: str,
        repo_name: str,
        template: str,
        variables: Dict[str, Any],
        phases: List[str] = None,
    ) -> Dict[str, Any]:
        """
        Generate dry-run preview using MCP scaffold_dry_run.

        Args:
            repo_path: Repository path
            repo_name: Repository name
            template: Template name
            variables: Variables for substitution
            phases: Phases to preview (optional)

        Returns:
            Preview result dictionary

        Raises:
            RuntimeError: If MCP call fails
        """
        try:
            # Call MCP tool for dry run
            result = self.mcp_client.call_tool(
                "scaffold_dry_run",
                {
                    "repo_path": repo_path,
                    "repo_name": repo_name,
                    "template": template,
                    "variables": variables,
                    "phases": phases or ["all"],
                }
            )

            if not result.get("success"):
                raise RuntimeError(f"Preview failed: {result.get('error')}")

            logger.info(f"Generated preview for {template}")
            return result

        except Exception as e:
            logger.error(f"Preview generation error: {e}")
            raise RuntimeError(f"Failed to generate preview: {e}")

    def format_preview(self, preview_data: Dict[str, Any]) -> str:
        """
        Format preview for user display.

        Args:
            preview_data: Preview data from MCP

        Returns:
            Formatted preview string
        """
        lines = [
            "Dry-Run Preview",
            "=" * 60,
            "",
            f"Template: {preview_data.get('template', 'unknown')}",
            f"Repository: {preview_data.get('repo_path', 'unknown')}",
            "",
        ]

        # Show variable substitutions
        if preview_data.get("variables"):
            lines.append("Variable Substitutions:")
            lines.append("-" * 40)
            for key, value in preview_data["variables"].items():
                lines.append(f"  {key}: {self._format_value(value)}")
            lines.append("")

        # Show file changes
        files = preview_data.get("files", [])
        lines.append(f"Files to be created/modified: {len(files)}")
        lines.append("-" * 40)

        for file_info in files:
            file_type = file_info.get("type", "create")
            file_path = file_info["path"]
            file_size = file_info.get("size", 0)

            # Format file type indicator
            type_indicator = {
                "create": "[+]",
                "modify": "[~]",
                "skip": "[·]",
            }.get(file_type, "[?]")

            lines.append(f"  {type_indicator} {file_path} ({file_size} bytes)")

        lines.append("")

        # Show statistics
        stats = preview_data.get("statistics", {})
        lines.append("Statistics:")
        lines.append("-" * 40)
        lines.append(f"  Files to create: {stats.get('created', 0)}")
        lines.append(f"  Files to modify: {stats.get('modified', 0)}")
        lines.append(f"  Files to skip: {stats.get('skipped', 0)}")
        lines.append(f"  Total size: {stats.get('total_size', 0)} bytes")
        lines.append("")

        # Show coverage
        if "coverage" in preview_data:
            lines.append(f"Template Coverage: {preview_data['coverage']}%")

        return "\n".join(lines)

    def format_file_details(self, preview_data: Dict[str, Any], max_preview_lines: int = 5) -> str:
        """
        Format detailed file preview.

        Args:
            preview_data: Preview data from MCP
            max_preview_lines: Maximum lines to show per file

        Returns:
            Formatted detailed preview
        """
        lines = [
            "Detailed File Preview",
            "=" * 60,
            "",
        ]

        for file_info in preview_data.get("files", []):
            file_path = file_info["path"]
            file_content = file_info.get("content", "")

            lines.append(f"File: {file_path}")
            lines.append("-" * 40)

            if file_content:
                content_lines = file_content.split("\n")
                for line in content_lines[:max_preview_lines]:
                    lines.append(f"  {line}")

                if len(content_lines) > max_preview_lines:
                    remaining = len(content_lines) - max_preview_lines
                    lines.append(f"  ... ({remaining} more lines)")
            else:
                lines.append("  (empty file)")

            lines.append("")

        return "\n".join(lines)

    def show_variable_highlights(self, preview_data: Dict[str, Any]) -> str:
        """
        Show where variables will be substituted.

        Args:
            preview_data: Preview data from MCP

        Returns:
            Formatted variable highlighting
        """
        lines = [
            "Variable Substitution Highlights",
            "=" * 60,
            "",
        ]

        substitutions = preview_data.get("substitutions", {})

        for file_path, file_subs in substitutions.items():
            lines.append(f"File: {file_path}")
            lines.append("-" * 40)

            for sub in file_subs:
                template_var = sub.get("variable", "unknown")
                from_value = sub.get("from", "")
                to_value = sub.get("to", "")
                count = sub.get("count", 1)

                lines.append(f"  Variable: {template_var}")
                lines.append(f"    Template: {self._format_value(from_value)}")
                lines.append(f"    Will be: {self._format_value(to_value)}")
                lines.append(f"    Count: {count} occurrence(s)")

            lines.append("")

        return "\n".join(lines)

    def ask_confirmation(self) -> bool:
        """
        Ask user for confirmation to proceed.

        Returns:
            True if user confirms, False otherwise
        """
        while True:
            response = input("\nProceed with applying this scaffold? (yes/no): ").strip().lower()
            if response in ("yes", "y"):
                return True
            elif response in ("no", "n"):
                return False
            else:
                print("Please enter 'yes' or 'no'")

    def _format_value(self, value: Any) -> str:
        """
        Format value for display.

        Args:
            value: Value to format

        Returns:
            Formatted string
        """
        if isinstance(value, str):
            if len(value) > 50:
                return f"{value[:47]}..."
            return value
        elif isinstance(value, (list, dict)):
            return json.dumps(value, indent=2)
        else:
            return str(value)


def main():
    """Command-line interface for preview generation."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Generate dry-run preview for scaffold application"
    )
    parser.add_argument(
        "--repo-path",
        required=True,
        help="Repository path"
    )
    parser.add_argument(
        "--repo-name",
        required=True,
        help="Repository name"
    )
    parser.add_argument(
        "--template",
        required=True,
        help="Template name"
    )
    parser.add_argument(
        "--variables",
        required=True,
        help="JSON string of variables"
    )
    parser.add_argument(
        "--phases",
        help="Comma-separated phases (1,2,3)"
    )
    parser.add_argument(
        "--detail",
        action="store_true",
        help="Show detailed file content preview"
    )
    parser.add_argument(
        "--highlights",
        action="store_true",
        help="Show variable substitution highlights"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output as JSON"
    )

    args = parser.parse_args()

    try:
        variables = json.loads(args.variables)
    except json.JSONDecodeError as e:
        print(f"Invalid JSON in variables: {e}")
        sys.exit(1)

    # Parse phases
    phases = None
    if args.phases:
        phases = args.phases.split(",")

    # Mock MCP client for testing
    class MockMCPClient:
        def call_tool(self, tool_name, params):
            # Simulate MCP dry_run response
            return {
                "success": True,
                "template": params["template"],
                "repo_path": params["repo_path"],
                "variables": params["variables"],
                "files": [
                    {
                        "path": "skill.json",
                        "type": "create",
                        "size": 250,
                        "content": '{\n  "name": "db-migration-tool",\n  "version": "1.0.0"\n}'
                    },
                    {
                        "path": "README.md",
                        "type": "create",
                        "size": 500,
                        "content": "# Database Migration Tool\n\nAutomated database schema migration validator"
                    },
                ],
                "statistics": {
                    "created": 2,
                    "modified": 0,
                    "skipped": 0,
                    "total_size": 750,
                },
                "coverage": 85,
                "substitutions": {
                    "skill.json": [
                        {
                            "variable": "skill_name",
                            "from": "{{skill_name}}",
                            "to": "db-migration-tool",
                            "count": 1
                        },
                    ],
                },
            }

    mcp_client = MockMCPClient()
    generator = PreviewGenerator(mcp_client)

    # Generate preview
    preview = generator.generate_preview(
        args.repo_path,
        args.repo_name,
        args.template,
        variables,
        phases=phases,
    )

    # Output
    if args.json:
        print(json.dumps(preview, indent=2))
    else:
        print(generator.format_preview(preview))

        if args.detail:
            print("\n")
            print(generator.format_file_details(preview))

        if args.highlights:
            print("\n")
            print(generator.show_variable_highlights(preview))


if __name__ == "__main__":
    main()
