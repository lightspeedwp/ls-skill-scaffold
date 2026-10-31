#!/bin/bash

# apply-scaffold.sh
# Renders and applies skill scaffold to a target repository

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
SCAFFOLD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="${PWD}"
DRY_RUN=false

# Functions
show_help() {
  cat << EOF
${BLUE}skill-scaffold${NC} - Apply professional configuration to skill repos

Usage: apply-scaffold.sh [OPTIONS]

Options:
  -t, --target DIR              Target repository directory (default: current)
  -n, --repo-name NAME          Repository name (required)
  -d, --description DESC        Repository description (required)
  -a, --author AUTHOR           Author name (default: Ash Shaw)
  -v, --version VERSION         Package version (default: 1.0.0)
  --coverage PERCENT            Jest coverage threshold (default: 80)
  --branch-pattern PATTERN      Branch validation regex (default: ^(wp-db-|skill-|main|develop|master)$)
  --dry-run                     Show what would be applied without changes
  --help                        Show this help message

Examples:
  # Apply to current directory
  apply-scaffold.sh --repo-name my-skill --description "My skill"

  # Apply with custom options
  apply-scaffold.sh -t /path/to/repo -n my-skill -d "Description" -v 2.0.0

EOF
}

log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1" >&2
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -t|--target)
      TARGET_DIR="$2"
      shift 2
      ;;
    -n|--repo-name)
      REPO_NAME="$2"
      shift 2
      ;;
    -d|--description)
      REPO_DESCRIPTION="$2"
      shift 2
      ;;
    -a|--author)
      AUTHOR="$2"
      shift 2
      ;;
    -v|--version)
      VERSION="$2"
      shift 2
      ;;
    --coverage)
      COVERAGE_THRESHOLD="$2"
      shift 2
      ;;
    --branch-pattern)
      BRANCH_PATTERN="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help|-h)
      show_help
      exit 0
      ;;
    *)
      log_error "Unknown option: $1"
      show_help
      exit 1
      ;;
  esac
done

# Validate required arguments
if [[ -z "$REPO_NAME" ]]; then
  log_error "Repository name is required (--repo-name)"
  show_help
  exit 1
fi

if [[ -z "$REPO_DESCRIPTION" ]]; then
  log_error "Repository description is required (--description)"
  show_help
  exit 1
fi

# Set defaults
AUTHOR="${AUTHOR:-Ash Shaw}"
VERSION="${VERSION:-1.0.0}"
COVERAGE_THRESHOLD="${COVERAGE_THRESHOLD:-80}"
BRANCH_PATTERN="${BRANCH_PATTERN:-^(wp-db-|skill-|main|develop|master)$}"

# Validate target directory
if [[ ! -d "$TARGET_DIR" ]]; then
  log_error "Target directory not found: $TARGET_DIR"
  exit 1
fi

if [[ ! -d "$TARGET_DIR/.git" ]]; then
  log_warning "Target directory is not a git repository"
fi

log_info "Applying skill-scaffold to: $TARGET_DIR"
echo ""

# Check if mustache is available
if ! command -v mustache &> /dev/null; then
  log_warning "mustache not found, trying to install..."
  npm install -g mustache || {
    log_error "Failed to install mustache. Please install manually: npm install -g mustache"
    exit 1
  }
fi

# Create variables file for mustache
VARS_FILE=$(mktemp)
cat > "$VARS_FILE" << EOF
{
  "repo_name": "$REPO_NAME",
  "repo_description": "$REPO_DESCRIPTION",
  "author": "$AUTHOR",
  "version": "$VERSION",
  "min_node_version": "24.0.0",
  "coverage_threshold": $COVERAGE_THRESHOLD,
  "branch_pattern": "$BRANCH_PATTERN",
  "branch_prefix": "skill-",
  "has_jest": true,
  "has_bats": false,
  "has_shell": false,
  "has_yaml": false,
  "has_anthropic": false,
  "has_migrate": false
}
EOF

log_info "Variables prepared"

# Process templates
log_info "Rendering templates..."

for template in "$SCAFFOLD_DIR"/templates/*.mustache; do
  filename=$(basename "$template" .mustache)
  target_file="$TARGET_DIR/$filename"

  log_info "Processing: $filename"

  if [[ "$DRY_RUN" == true ]]; then
    log_info "  [DRY-RUN] Would render to: $target_file"
  else
    mustache "$VARS_FILE" "$template" > "$target_file"
    log_success "  Created: $filename"
  fi
done

# Copy non-template files
for file in .eslintrc.cjs .prettierrc .markdownlint.jsonc; do
  source="$SCAFFOLD_DIR/templates/$file"
  if [[ -f "$source" ]]; then
    target="$TARGET_DIR/$file"
    if [[ "$DRY_RUN" == true ]]; then
      log_info "  [DRY-RUN] Would copy: $file"
    else
      cp "$source" "$target"
      log_success "  Copied: $file"
    fi
  fi
done

# Create .claude directory if needed
if [[ "$DRY_RUN" != true ]]; then
  mkdir -p "$TARGET_DIR/.claude/skills"
  log_success "Created .claude directory structure"
fi

echo ""
if [[ "$DRY_RUN" == true ]]; then
  log_info "Dry-run completed. No changes made."
else
  log_success "Scaffold applied successfully!"
  echo ""
  log_info "Next steps:"
  echo "  1. Review the generated files"
  echo "  2. Run: npm install"
  echo "  3. Run: npx lefthook install"
  echo "  4. Run: npm run lint:all"
  echo "  5. Commit changes"
fi

# Cleanup
rm -f "$VARS_FILE"

exit 0
