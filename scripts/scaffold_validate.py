#!/usr/bin/env python3
"""
scaffold-validate.py
Validates variables against template schema.
Provides error messages and recovery suggestions.
"""

import json
import re
import sys
import logging
from typing import Dict, Any, List, Tuple, Optional
from dataclasses import dataclass

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class ValidationError:
    """Represents a validation error."""
    field: str
    value: Any
    error: str
    suggestion: Optional[str] = None
    example: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "field": self.field,
            "value": self.value,
            "error": self.error,
            "suggestion": self.suggestion,
            "example": self.example,
        }


class VariableValidator:
    """Validates scaffold variables against template schema."""

    # Validation patterns
    PATTERNS = {
        "kebab_case": r"^[a-z0-9]+(-[a-z0-9]+)*$",
        "semantic_version": r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$",
        "email": r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$",
        "url": r"^https?://[^\s/$.?#].[^\s]*$",
    }

    def __init__(self, mcp_client):
        """
        Initialize validator with MCP client.

        Args:
            mcp_client: MCP client instance for calling tools
        """
        self.mcp_client = mcp_client
        self.schema_cache = {}

    def validate_variables(
        self,
        template_name: str,
        variables: Dict[str, Any],
    ) -> Tuple[bool, List[ValidationError], Dict[str, Any]]:
        """
        Validate variables against template schema using MCP.

        Args:
            template_name: Name of template
            variables: Variables to validate

        Returns:
            Tuple of (is_valid, errors, validated_variables)

        Raises:
            RuntimeError: If MCP call fails
        """
        try:
            # Call MCP tool to validate
            result = self.mcp_client.call_tool(
                "validate_variables",
                {
                    "template": template_name,
                    "variables": variables,
                }
            )

            if not result.get("success"):
                # Parse validation errors from MCP response
                errors = self._parse_mcp_errors(result.get("errors", []))
                return False, errors, {}

            # Validation passed
            logger.info(f"Validation passed for {template_name}")
            return True, [], result.get("validated_variables", variables)

        except Exception as e:
            logger.error(f"Validation error: {e}")
            raise RuntimeError(f"Failed to validate variables: {e}")

    def _parse_mcp_errors(self, errors: List[Dict]) -> List[ValidationError]:
        """
        Parse MCP error responses into ValidationError objects.

        Args:
            errors: List of error dictionaries from MCP

        Returns:
            List of ValidationError objects
        """
        validation_errors = []

        for error_data in errors:
            field = error_data.get("field", "unknown")
            value = error_data.get("value")
            error_msg = error_data.get("message", "Unknown error")

            # Add contextual suggestions based on error type
            suggestion = self._get_suggestion(field, value, error_msg)
            example = self._get_example(field)

            validation_errors.append(ValidationError(
                field=field,
                value=value,
                error=error_msg,
                suggestion=suggestion,
                example=example,
            ))

        return validation_errors

    def _get_suggestion(self, field: str, value: Any, error: str) -> Optional[str]:
        """
        Generate contextual suggestion for error recovery.

        Args:
            field: Field name
            value: Field value
            error: Error message

        Returns:
            Suggested fix or None
        """
        if "version" in field.lower() and value:
            # Try to convert to valid semver
            if isinstance(value, str):
                parts = value.split("-")[0].split("+")[0].split(".")
                if len(parts) == 1:
                    return f"Did you mean {value}.0.0?"
                elif len(parts) == 2:
                    return f"Did you mean {value}.0?"

        if "phase" in field.lower():
            return "Did you mean to use phases 1, 2, 3, or 'all'?"

        if "name" in field.lower() and value:
            # Convert to kebab-case
            kebab = re.sub(r"_", "-", str(value).lower())
            return f"Did you mean {kebab}?"

        return None

    def _get_example(self, field: str) -> Optional[str]:
        """
        Get example value for field.

        Args:
            field: Field name

        Returns:
            Example value or None
        """
        examples = {
            "version": "1.0.0 (or 2.1.3, 1.0.0-alpha, 1.0.0+build.1)",
            "skill_name": "my-skill (lowercase with hyphens)",
            "skill_description": "A tool for validating database schemas",
            "author": "your-team or your-name",
            "phases": "1, 2, 3, or 'all'",
            "skill_type": "cli, validation, documentation, or agent",
        }

        for key, example in examples.items():
            if key in field.lower():
                return example

        return None

    def validate_field(
        self,
        field_name: str,
        value: Any,
        schema: Dict[str, Any],
    ) -> Optional[ValidationError]:
        """
        Validate a single field against schema.

        Args:
            field_name: Field name
            value: Field value
            schema: Field schema from template

        Returns:
            ValidationError if invalid, None if valid
        """
        field_schema = schema.get(field_name, {})

        # Check required
        if field_schema.get("required") and not value:
            return ValidationError(
                field=field_name,
                value=value,
                error="This field is required",
            )

        # Check type
        field_type = field_schema.get("type", "string")
        if not self._check_type(value, field_type):
            return ValidationError(
                field=field_name,
                value=value,
                error=f"Expected {field_type}, got {type(value).__name__}",
            )

        # Check pattern if applicable
        if "pattern" in field_schema and isinstance(value, str):
            pattern = field_schema["pattern"]
            if pattern in self.PATTERNS:
                if not re.match(self.PATTERNS[pattern], value):
                    suggestion = self._get_suggestion(field_name, value, "")
                    return ValidationError(
                        field=field_name,
                        value=value,
                        error=f"Value does not match {pattern} format",
                        suggestion=suggestion,
                    )

        # Check length constraints
        if "minLength" in field_schema and isinstance(value, str):
            if len(value) < field_schema["minLength"]:
                return ValidationError(
                    field=field_name,
                    value=value,
                    error=f"Minimum length is {field_schema['minLength']} characters",
                )

        if "maxLength" in field_schema and isinstance(value, str):
            if len(value) > field_schema["maxLength"]:
                return ValidationError(
                    field=field_name,
                    value=value,
                    error=f"Maximum length is {field_schema['maxLength']} characters",
                )

        # Check enum values
        if "enum" in field_schema:
            if value not in field_schema["enum"]:
                return ValidationError(
                    field=field_name,
                    value=value,
                    error=f"Must be one of: {', '.join(field_schema['enum'])}",
                )

        return None

    def _check_type(self, value: Any, expected_type: str) -> bool:
        """
        Check if value matches expected type.

        Args:
            value: Value to check
            expected_type: Expected type string

        Returns:
            True if type matches
        """
        type_map = {
            "string": str,
            "number": (int, float),
            "integer": int,
            "boolean": bool,
            "array": list,
            "object": dict,
        }

        expected = type_map.get(expected_type)
        if expected is None:
            return True  # Unknown type, allow

        return isinstance(value, expected)

    def format_errors(self, errors: List[ValidationError]) -> str:
        """
        Format validation errors for display.

        Args:
            errors: List of validation errors

        Returns:
            Formatted error message
        """
        if not errors:
            return "All fields are valid!"

        lines = ["Validation Errors:", "=" * 50]

        for i, error in enumerate(errors, 1):
            lines.append(f"\n{i}. {error.field}")
            lines.append(f"   Error: {error.error}")
            if error.suggestion:
                lines.append(f"   Suggestion: {error.suggestion}")
            if error.example:
                lines.append(f"   Example: {error.example}")

        return "\n".join(lines)


def main():
    """Command-line interface for variable validation."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Validate scaffold variables"
    )
    parser.add_argument(
        "--template",
        required=True,
        help="Template name to validate against"
    )
    parser.add_argument(
        "--variables",
        required=True,
        help="JSON string of variables to validate"
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

    # Mock MCP client for testing
    class MockMCPClient:
        def call_tool(self, tool_name, params):
            # Simulate MCP validation response
            return {
                "success": True,
                "validated_variables": params["variables"],
            }

    mcp_client = MockMCPClient()
    validator = VariableValidator(mcp_client)

    # Validate
    is_valid, errors, validated = validator.validate_variables(
        args.template,
        variables,
    )

    # Output
    if args.json:
        output = {
            "valid": is_valid,
            "errors": [e.to_dict() for e in errors],
            "validated_variables": validated,
        }
        print(json.dumps(output, indent=2))
    else:
        if is_valid:
            print("Validation passed!")
        else:
            print(validator.format_errors(errors))


if __name__ == "__main__":
    main()
