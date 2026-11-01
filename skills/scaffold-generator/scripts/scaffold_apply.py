#!/usr/bin/env python3
"""
scaffold-apply.py
Applies templates to repository.
Handles file writing, overwrite decisions, and result reporting.
"""

import json
import sys
import logging
from typing import Dict, Any, List, Tuple, Optional
from dataclasses import dataclass

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class ApplyResult:
    """Represents the result of applying a scaffold."""
    success: bool
    files_written: int
    files_skipped: int
    files_failed: int
    coverage: int
    summary: str
    errors: List[str]
    warnings: List[str]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "success": self.success,
            "files_written": self.files_written,
            "files_skipped": self.files_skipped,
            "files_failed": self.files_failed,
            "coverage": self.coverage,
            "summary": self.summary,
            "errors": self.errors,
            "warnings": self.warnings,
        }


class ScaffoldApplier:
    """Applies skill-scaffold templates to repositories."""

    def __init__(self, mcp_client):
        """
        Initialize applier with MCP client.

        Args:
            mcp_client: MCP client instance for calling tools
        """
        self.mcp_client = mcp_client

    def apply_scaffold(
        self,
        repo_path: str,
        repo_name: str,
        template: str,
        variables: Dict[str, Any],
        phases: Optional[List[str]] = None,
        overwrite: bool = False,
        dry_run: bool = False,
    ) -> ApplyResult:
        """
        Apply template to repository using MCP.

        Args:
            repo_path: Target repository path
            repo_name: Repository name
            template: Template name
            variables: Template variables
            phases: Phases to apply (optional)
            overwrite: Allow overwriting existing files
            dry_run: Preview only, don't write

        Returns:
            ApplyResult with operation summary

        Raises:
            RuntimeError: If MCP call fails
        """
        try:
            # Call MCP tool to apply scaffold
            result = self.mcp_client.call_tool(
                "scaffold_apply",
                {
                    "repo_path": repo_path,
                    "repo_name": repo_name,
                    "template": template,
                    "variables": variables,
                    "phases": phases or ["all"],
                    "overwrite": overwrite,
                    "dry_run": dry_run,
                }
            )

            if not result.get("success"):
                return ApplyResult(
                    success=False,
                    files_written=0,
                    files_skipped=result.get("filesSkipped", 0),
                    files_failed=len(result.get("errors", [])),
                    coverage=result.get("coverage", 0),
                    summary=f"Apply failed: {result.get('error', 'Unknown error')}",
                    errors=result.get("errors", []),
                    warnings=result.get("warnings", []),
                )

            # Operation succeeded
            return ApplyResult(
                success=True,
                files_written=result.get("filesWritten", 0),
                files_skipped=result.get("filesSkipped", 0),
                files_failed=0,
                coverage=result.get("coverage", 0),
                summary=result.get("summary", f"Applied {result.get('filesWritten', 0)} templates"),
                errors=[],
                warnings=result.get("warnings", []),
            )

        except Exception as e:
            logger.error(f"Apply error: {e}")
            return ApplyResult(
                success=False,
                files_written=0,
                files_skipped=0,
                files_failed=1,
                coverage=0,
                summary=f"Apply failed with exception: {str(e)}",
                errors=[str(e)],
                warnings=[],
            )

    def handle_overwrite_conflicts(
        self,
        conflicts: List[Dict[str, str]],
        auto_overwrite: bool = False,
    ) -> Tuple[bool, List[str]]:
        """
        Handle file overwrite conflicts.

        Args:
            conflicts: List of conflicting files
            auto_overwrite: Automatically overwrite without asking

        Returns:
            Tuple of (proceed, files_to_overwrite)

        Raises:
            KeyboardInterrupt: If user cancels
        """
        if not conflicts:
            return True, []

        if auto_overwrite:
            logger.info(f"Auto-overwriting {len(conflicts)} files")
            return True, [c["path"] for c in conflicts]

        # Ask user for each conflict
        to_overwrite = []

        print("\nFile Conflicts Detected:")
        print("=" * 60)

        for i, conflict in enumerate(conflicts, 1):
            file_path = conflict["path"]
            print(f"\n{i}. {file_path}")
            print(f"   Existing file found. Overwrite?")

            while True:
                response = input("   [y]es / [n]o / [a]ll / [c]ancel: ").strip().lower()

                if response in ("y", "yes"):
                    to_overwrite.append(file_path)
                    break
                elif response in ("n", "no"):
                    break
                elif response in ("a", "all"):
                    to_overwrite.extend([c["path"] for c in conflicts[i:]])
                    return True, to_overwrite
                elif response in ("c", "cancel"):
                    return False, []
                else:
                    print("   Please enter y, n, a, or c")

        return True, to_overwrite

    def format_result(self, result: ApplyResult) -> str:
        """
        Format apply result for display.

        Args:
            result: ApplyResult object

        Returns:
            Formatted result string
        """
        lines = [
            "Scaffold Application Result",
            "=" * 60,
            "",
            f"Status: {'SUCCESS' if result.success else 'FAILED'}",
            f"Summary: {result.summary}",
            "",
            f"Files Written: {result.files_written}",
            f"Files Skipped: {result.files_skipped}",
            f"Files Failed: {result.files_failed}",
            f"Coverage: {result.coverage}%",
            "",
        ]

        if result.warnings:
            lines.append("Warnings:")
            for warning in result.warnings:
                lines.append(f"  - {warning}")
            lines.append("")

        if result.errors:
            lines.append("Errors:")
            for error in result.errors:
                lines.append(f"  - {error}")
            lines.append("")

        return "\n".join(lines)

    def format_next_steps(self, result: ApplyResult, repo_path: str) -> str:
        """
        Format next steps guidance.

        Args:
            result: ApplyResult object
            repo_path: Path to scaffolded repository

        Returns:
            Formatted next steps
        """
        if not result.success:
            return "Please fix the errors above before proceeding."

        lines = [
            "Next Steps:",
            "=" * 60,
            "",
            "1. Review generated files:",
            f"   cd {repo_path}",
            "   ls -la",
            "",
            "2. Update configuration files as needed:",
            "   - skill.json: Add metadata, dependencies",
            "   - requirements.txt: Add Python dependencies",
            "   - scripts/: Implement skill functionality",
            "",
            "3. Write tests:",
            f"   cd {repo_path}/tests",
            "   # Add unit tests, integration tests",
            "",
            "4. Documentation:",
            "   - README.md: Document usage and features",
            "   - docs/: Add detailed guides",
            "",
            "5. Validate and test:",
            "   pytest tests/",
            "   your-skill-test",
            "",
            "6. When ready, commit and push:",
            "   git add .",
            "   git commit -m 'feat: Initialize skill scaffold'",
            "   git push",
            "",
        ]

        return "\n".join(lines)


def main():
    """Command-line interface for scaffold application."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Apply skill-scaffold to repository"
    )
    parser.add_argument(
        "--repo-path",
        required=True,
        help="Target repository path"
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
        help="Comma-separated phases"
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite existing files"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview only"
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
            # Simulate MCP apply response
            return {
                "success": True,
                "filesWritten": 5,
                "filesSkipped": 0,
                "coverage": 85,
                "summary": "Successfully applied 5 templates",
                "warnings": [],
            }

    mcp_client = MockMCPClient()
    applier = ScaffoldApplier(mcp_client)

    # Apply scaffold
    result = applier.apply_scaffold(
        args.repo_path,
        args.repo_name,
        args.template,
        variables,
        phases=phases,
        overwrite=args.overwrite,
        dry_run=args.dry_run,
    )

    # Output
    if args.json:
        print(json.dumps(result.to_dict(), indent=2))
    else:
        print(applier.format_result(result))
        if result.success:
            print("\n")
            print(applier.format_next_steps(result, args.repo_path))


if __name__ == "__main__":
    main()
