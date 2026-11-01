# Assets

Static assets and resources for the scaffold-generator skill.

## Purpose

This directory holds:
- Images and diagrams (SVG, PNG)
- Icons and visual references
- Brand/design tokens
- Any other static resources used in documentation

## File Organization

Organize by content type:
```
assets/
├── diagrams/
│   └── architecture.svg
├── icons/
│   └── skill-icon.png
└── images/
    └── screenshot.png
```

## Guidelines

- Keep file sizes reasonable (compress images)
- Use SVG for diagrams and icons when possible
- Include alt-text descriptions in documentation
- Commit only essential resources

## Adding New Assets

1. Create the asset file
2. Add a reference in the appropriate docs (e.g., [../docs/architecture.md](../docs/architecture.md))
3. Include descriptive alt-text or captions
