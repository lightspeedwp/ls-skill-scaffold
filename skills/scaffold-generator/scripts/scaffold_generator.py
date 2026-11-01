#!/usr/bin/env python3
"""
scaffold-generator.py
Main orchestrator for skill-scaffold generation.
Coordinates discovery, validation, preview, and application.
"""

import json
import sys
import logging
import argparse
from typing import Dict, Any, Optional, List, Tuple
from enum import Enum

# Import sub-skill modules
from scaffold_discover import TemplateDiscovery, Template
from scaffold_validate import VariableValidator, ValidationError
from scaffold_preview import PreviewGenerator
from scaffold_apply import ScaffoldApplier, ApplyResult

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class InteractionMode(Enum):
    """Interaction modes for the skill."""
    CONVERSATIONAL = "conversational"
    FORM = "form"


class ScaffoldGenerator:
    """Main orchestrator for scaffold generation workflow."""

    def __init__(self, mcp_client):
        """
        Initialize scaffold generator.

        Args:
            mcp_client: MCP client for calling tools
        """
        self.mcp_client = mcp_client
        self.discovery = TemplateDiscovery(mcp_client)
        self.validator = VariableValidator(mcp_client)
        self.preview_gen = PreviewGenerator(mcp_client)
        self.applier = ScaffoldApplier(mcp_client)

    def detect_interaction_mode(self, prompt: str, provided_variables: Optional[Dict] = None) -> InteractionMode:
        """
        Detect whether user is in conversational or form mode.

        Form mode indicators:
        - All variables provided upfront
        - Structured/JSON-like input
        - No questions asked

        Args:
            prompt: User's request
            provided_variables: Variables provided by user

        Returns:
            InteractionMode enum value
        """
        # If all required variables provided, form mode
        if provided_variables and len(provided_variables) > 2:
            return InteractionMode.FORM

        # If prompt has question words, conversational
        questions = ["how", "what", "which", "where", "can you", "should", "walk me"]
        if any(q in prompt.lower() for q in questions):
            return InteractionMode.CONVERSATIONAL

        # Default to conversational for guidance
        return InteractionMode.CONVERSATIONAL

    def run_conversational_mode(
        self,
        repo_path: str,
        skill_type: Optional[str] = None,
    ) -> Tuple[bool, ApplyResult]:
        """
        Run conversational workflow with guided user interaction.

        Steps:
        1. Discover templates matching skill_type
        2. Guide user through template selection
        3. Explain and collect variables
        4. Validate with error recovery
        5. Preview with confirmation
        6. Apply with status reporting

        Args:
            repo_path: Target repository path
            skill_type: Optional skill type filter

        Returns:
            Tuple of (success, ApplyResult)
        """
        logger.info("Starting conversational mode workflow")

        print("\n" + "=" * 60)
        print("Skill Scaffold Generator - Guided Setup")
        print("=" * 60)
        print()

        # Step 1: Discover templates
        print("Step 1: Discovering available templates...")
        try:
            templates = self.discovery.discover_templates(
                skill_type=skill_type,
                phases=None,
            )

            if not templates:
                print("No templates found matching your criteria.")
                return False, ApplyResult(
                    success=False,
                    files_written=0,
                    files_skipped=0,
                    files_failed=0,
                    coverage=0,
                    summary="No templates available",
                    errors=["No templates found"],
                    warnings=[],
                )

            print(self.discovery.format_template_listing(templates))
            print()
        except Exception as e:
            logger.error(f"Template discovery failed: {e}")
            return False, ApplyResult(
                success=False,
                files_written=0,
                files_skipped=0,
                files_failed=0,
                coverage=0,
                summary=f"Discovery failed: {str(e)}",
                errors=[str(e)],
                warnings=[],
            )

        # Step 2: Template selection
        print("Step 2: Select a template")
        template_index = self._prompt_selection(
            "Choose template number (or 'q' to quit): ",
            len(templates)
        )
        if template_index is None:
            return False, ApplyResult(
                success=False,
                files_written=0,
                files_skipped=0,
                files_failed=0,
                coverage=0,
                summary="User cancelled",
                errors=[],
                warnings=[],
            )

        selected_template = templates[template_index]
        print(f"Selected: {selected_template.name}\n")

        # Step 3: Get repository name
        repo_name = input("Repository name (e.g., my-skill): ").strip()
        if not repo_name:
            print("Repository name is required.")
            return False, ApplyResult(
                success=False,
                files_written=0,
                files_skipped=0,
                files_failed=0,
                coverage=0,
                summary="Missing repository name",
                errors=["Repository name required"],
                warnings=[],
            )

        # Step 4: Collect variables
        print("\nStep 3: Configure variables")
        print("-" * 60)
        print("Please provide the following information:")
        print()

        variables = self._collect_variables(selected_template)
        if variables is None:
            return False, ApplyResult(
                success=False,
                files_written=0,
                files_skipped=0,
                files_failed=0,
                coverage=0,
                summary="User cancelled during variable collection",
                errors=[],
                warnings=[],
            )

        # Step 5: Validate variables
        print("\nValidating configuration...")
        is_valid, errors, validated_vars = self.validator.validate_variables(
            selected_template.name,
            variables,
        )

        if not is_valid:
            print(self.validator.format_errors(errors))
            print()
            retry = input("Try again? (yes/no): ").strip().lower() == "yes"
            if retry:
                return self.run_conversational_mode(repo_path, skill_type)
            else:
                return False, ApplyResult(
                    success=False,
                    files_written=0,
                    files_skipped=0,
                    files_failed=len(errors),
                    coverage=0,
                    summary="Validation failed",
                    errors=[e.error for e in errors],
                    warnings=[],
                )

        print("Configuration validated successfully!")
        print()

        # Step 6: Preview
        print("Step 4: Preview changes")
        print("-" * 60)
        try:
            preview_data = self.preview_gen.generate_preview(
                repo_path,
                repo_name,
                selected_template.name,
                variables,
            )
            print(self.preview_gen.format_preview(preview_data))
            print()
        except Exception as e:
            logger.warning(f"Preview generation failed: {e}")

        # Step 7: Confirmation
        if not self.preview_gen.ask_confirmation():
            return False, ApplyResult(
                success=False,
                files_written=0,
                files_skipped=0,
                files_failed=0,
                coverage=0,
                summary="User cancelled at confirmation",
                errors=[],
                warnings=[],
            )

        # Step 8: Apply
        print("\nStep 5: Applying scaffold...")
        result = self.applier.apply_scaffold(
            repo_path,
            repo_name,
            selected_template.name,
            variables,
        )

        print(self.applier.format_result(result))

        if result.success:
            print(self.applier.format_next_steps(result, repo_path))

        return result.success, result

    def run_form_mode(
        self,
        repo_path: str,
        variables: Dict[str, Any],
    ) -> Tuple[bool, ApplyResult]:
        """
        Run form mode with explicit variables.

        Fast path that skips unnecessary steps:
        - Assume template is provided in variables
        - Validate all variables upfront
        - Show minimal preview (optional)
        - Apply directly

        Args:
            repo_path: Target repository path
            variables: All variables provided by user

        Returns:
            Tuple of (success, ApplyResult)
        """
        logger.info("Starting form mode workflow")

        # Extract required fields
        template = variables.pop("template", None)
        if not template:
            return False, ApplyResult(
                success=False,
                files_written=0,
                files_skipped=0,
                files_failed=0,
                coverage=0,
                summary="Template parameter required in form mode",
                errors=["Missing 'template' parameter"],
                warnings=[],
            )

        repo_name = variables.pop("repo_name", "unknown")
        phases = variables.pop("phases", None)
        overwrite = variables.pop("overwrite", False)

        # Validate variables
        logger.info(f"Validating variables for {template}")
        is_valid, errors, validated_vars = self.validator.validate_variables(
            template,
            variables,
        )

        if not is_valid:
            return False, ApplyResult(
                success=False,
                files_written=0,
                files_skipped=0,
                files_failed=len(errors),
                coverage=0,
                summary="Variable validation failed",
                errors=[e.error for e in errors],
                warnings=[],
            )

        # Parse phases if provided as string
        if phases and isinstance(phases, str):
            phases = phases.split(",")

        # Apply directly (skip preview in form mode)
        logger.info(f"Applying {template} to {repo_path}")
        result = self.applier.apply_scaffold(
            repo_path,
            repo_name,
            template,
            validated_vars,
            phases=phases,
            overwrite=overwrite,
        )

        return result.success, result

    def _collect_variables(self, template: Template) -> Optional[Dict[str, Any]]:
        """
        Collect variables from user with guidance.

        Args:
            template: Template to collect variables for

        Returns:
            Dictionary of variables or None if cancelled
        """
        variables = {}

        for var_name, var_schema in template.variables.items():
            var_type = var_schema.get("type", "string")
            description = var_schema.get("description", var_name)
            required = var_schema.get("required", False)
            default = var_schema.get("default")
            enum_values = var_schema.get("enum")

            # Prompt user
            prompt_text = f"{description}"
            if default:
                prompt_text += f" [{default}]"
            elif enum_values:
                prompt_text += f" ({', '.join(enum_values)})"

            prompt_text += ": "

            while True:
                value = input(prompt_text).strip()

                if not value:
                    if required:
                        print(f"  {var_name} is required")
                        continue
                    elif default:
                        value = default
                    else:
                        continue

                # Type conversion
                if var_type == "integer":
                    try:
                        value = int(value)
                    except ValueError:
                        print(f"  Please enter a valid integer")
                        continue
                elif var_type == "boolean":
                    value = value.lower() in ("true", "yes", "y", "1")

                # Enum validation
                if enum_values and value not in enum_values:
                    print(f"  Please choose from: {', '.join(enum_values)}")
                    continue

                break

            variables[var_name] = value

        return variables

    def _prompt_selection(self, prompt: str, max_choice: int) -> Optional[int]:
        """
        Prompt user to select from numbered options.

        Args:
            prompt: Prompt text
            max_choice: Maximum valid choice number

        Returns:
            Selected index (0-based) or None if cancelled
        """
        while True:
            response = input(prompt).strip().lower()

            if response == "q":
                return None

            try:
                choice = int(response)
                if 1 <= choice <= max_choice:
                    return choice - 1
                else:
                    print(f"Please enter a number between 1 and {max_choice}")
            except ValueError:
                print("Please enter a valid number")

    def run(
        self,
        repo_path: str,
        mode: Optional[str] = None,
        skill_type: Optional[str] = None,
        variables: Optional[Dict[str, Any]] = None,
    ) -> Tuple[bool, ApplyResult]:
        """
        Run the scaffold generator workflow.

        Args:
            repo_path: Target repository path
            mode: Interaction mode (auto-detect if not provided)
            skill_type: Skill type filter
            variables: Provided variables

        Returns:
            Tuple of (success, ApplyResult)
        """
        # Detect mode if not specified
        if not mode:
            mode = self.detect_interaction_mode(
                "",
                variables
            ).value

        logger.info(f"Running scaffold generator in {mode} mode")

        if mode == InteractionMode.FORM.value:
            if not variables:
                logger.error("Form mode requires variables")
                return False, ApplyResult(
                    success=False,
                    files_written=0,
                    files_skipped=0,
                    files_failed=0,
                    coverage=0,
                    summary="Form mode requires variables parameter",
                    errors=[],
                    warnings=[],
                )
            return self.run_form_mode(repo_path, variables)
        else:
            return self.run_conversational_mode(repo_path, skill_type)


def main():
    """Command-line interface."""
    parser = argparse.ArgumentParser(
        description="Generate skill scaffolds with MCP integration"
    )
    parser.add_argument(
        "--repo-path",
        required=True,
        help="Target repository path"
    )
    parser.add_argument(
        "--mode",
        choices=["conversational", "form"],
        help="Interaction mode (auto-detect if not provided)"
    )
    parser.add_argument(
        "--skill-type",
        choices=["cli", "validation", "documentation", "agent"],
        help="Skill type filter (conversational mode only)"
    )
    parser.add_argument(
        "--variables",
        help="JSON string of variables (form mode only)"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output result as JSON"
    )

    args = parser.parse_args()

    # Parse variables if provided
    variables = None
    if args.variables:
        try:
            variables = json.loads(args.variables)
        except json.JSONDecodeError as e:
            print(f"Invalid JSON in variables: {e}")
            sys.exit(1)

    # Mock MCP client for testing
    class MockMCPClient:
        def call_tool(self, tool_name, params):
            # Return mock responses based on tool
            if tool_name == "list_templates":
                return {
                    "success": True,
                    "templates": [
                        {
                            "name": "phase-1-cli-basic",
                            "skill_type": "cli",
                            "description": "Basic CLI skill scaffold",
                            "phases": ["1", "2", "3"],
                            "variables": {
                                "skill_name": {
                                    "type": "string",
                                    "required": True,
                                    "description": "Skill name (kebab-case)"
                                },
                                "skill_description": {
                                    "type": "string",
                                    "required": True,
                                    "description": "Skill description"
                                },
                            },
                            "path": "/templates/phase-1-cli-basic",
                        },
                    ]
                }
            elif tool_name == "validate_variables":
                return {
                    "success": True,
                    "validated_variables": params["variables"],
                }
            elif tool_name == "scaffold_dry_run":
                return {
                    "success": True,
                    "files": [],
                    "statistics": {"created": 5, "modified": 0, "skipped": 0},
                    "coverage": 85,
                }
            elif tool_name == "scaffold_apply":
                return {
                    "success": True,
                    "filesWritten": 5,
                    "filesSkipped": 0,
                    "coverage": 85,
                    "summary": "Applied successfully",
                }
            return {"success": False, "error": f"Unknown tool: {tool_name}"}

    mcp_client = MockMCPClient()
    generator = ScaffoldGenerator(mcp_client)

    # Run generator
    success, result = generator.run(
        args.repo_path,
        mode=args.mode,
        skill_type=args.skill_type,
        variables=variables,
    )

    # Output result
    if args.json:
        print(json.dumps(result.to_dict(), indent=2))
    else:
        if not success:
            print(f"\nGeneration failed: {result.summary}")
            if result.errors:
                print("\nErrors:")
                for error in result.errors:
                    print(f"  - {error}")

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
