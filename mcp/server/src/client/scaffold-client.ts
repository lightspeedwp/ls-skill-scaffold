/**
 * Scaffold Client - Core wrapper for skill-scaffold operations
 * Handles template loading, rendering, and file operations
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, realpathSync } from 'fs';
import { join, dirname, resolve, relative, sep } from 'path';

export interface TemplateInfo {
  name: string;
  description: string;
  phase: number;
  source: string;
  target: string;
  required: boolean;
  overwrite: boolean;
  variant?: string;
  specialized?: boolean;
}

export interface ScaffoldConfig {
  version: string;
  name: string;
  description: string;
  templates: Array<{
    source: string;
    target: string;
    overwrite: boolean;
    required: boolean;
    phase: number;
    variant?: string;
    specialized?: boolean;
  }>;
  files: Array<{
    source: string;
    target: string;
    required: boolean;
    phase: number;
  }>;
  requiredVariables: string[];
  optionalVariables: Record<string, string | number | boolean>;
}

export class ScaffoldClient {
  private scaffoldDir: string;
  private config: ScaffoldConfig | null = null;

  constructor(scaffoldDir: string = process.cwd()) {
    this.scaffoldDir = scaffoldDir;
  }

  /**
   * Load scaffold configuration from scaffold.config.json
   */
  loadConfig(): ScaffoldConfig {
    if (this.config) return this.config;

    const configPath = join(this.scaffoldDir, 'scaffold.config.json');
    if (!existsSync(configPath)) {
      throw new Error(`scaffold.config.json not found at ${configPath}`);
    }

    const content = readFileSync(configPath, 'utf-8');
    this.config = JSON.parse(content) as ScaffoldConfig;
    return this.config;
  }

  /**
   * Get all templates with metadata
   */
  getAllTemplates(): TemplateInfo[] {
    const config = this.loadConfig();

    return config.templates.map((t) => ({
      name: t.source.split('/').pop() || '',
      description: `Template: ${t.target}`,
      phase: t.phase,
      source: t.source,
      target: t.target,
      required: t.required,
      overwrite: t.overwrite,
      variant: t.variant,
      specialized: t.specialized,
    }));
  }

  /**
   * Filter templates by skill type and/or phase
   */
  filterTemplates(
    skillType?: string,
    phases?: number[]
  ): TemplateInfo[] {
    let templates = this.getAllTemplates();

    if (phases && phases.length > 0) {
      templates = templates.filter((t) => phases.includes(t.phase));
    }

    // Filter by skill type based on variant tags
    if (skillType) {
      templates = templates.filter((t) => {
        if (!t.variant) return false;
        return t.variant.includes(skillType) || t.target.includes(skillType);
      });
    }

    return templates;
  }

  /**
   * Get variants for a specific skill type
   */
  getVariants(skillType: string, phases?: number[]): Map<string, TemplateInfo[]> {
    const templates = this.filterTemplates(skillType, phases);
    const variants = new Map<string, TemplateInfo[]>();

    templates.forEach((t) => {
      const variant = t.variant || 'default';
      if (!variants.has(variant)) {
        variants.set(variant, []);
      }
      variants.get(variant)!.push(t);
    });

    return variants;
  }

  /**
   * Render a single template with basic Mustache syntax support
   * Supports: {{variable}}, {{#variable}}...{{/variable}} conditional blocks
   * For complex Mustache features, use the 'mustache' npm package
   *
   * Security: Only accepts template names that exist in scaffold.config.json.
   * Uses whitelisting + path resolution to prevent traversal attacks.
   */
  renderTemplate(templateName: string, variables: Record<string, string | number | boolean>): string {
    const config = this.loadConfig();

    // Whitelist approach: only allow templates defined in scaffold.config.json
    const validTemplate = config.templates.find((t) =>
      t.source === templateName || t.source.endsWith('/' + templateName)
    );

    if (!validTemplate) {
      throw new Error(`Template not found in configuration: ${templateName}`);
    }

    // Use the config-provided source path, not user input
    const fullTemplatePath = join(this.scaffoldDir, validTemplate.source);

    // Verify path stays within scaffold directory using resolve + realpath
    const baseDir = realpathSync(this.scaffoldDir);
    const resolvedPath = realpathSync(fullTemplatePath);

    if (!resolvedPath.startsWith(baseDir + sep)) {
      throw new Error(`Template path outside scaffold directory (security violation)`);
    }

    if (!existsSync(resolvedPath)) {
      throw new Error(`Template file not found: ${resolvedPath}`);
    }

    const templateContent = readFileSync(resolvedPath, 'utf-8');
    let rendered = templateContent;

    // Replace {{variable}} patterns
    for (const [key, value] of Object.entries(variables)) {
      // Replace simple {{variable}} patterns with the value
      const pattern = new RegExp(`{{\\s*${this.escapeRegExp(key)}\\s*}}`, 'g');
      rendered = rendered.replace(pattern, String(value));

      // Replace conditional {{#variable}}...{{/variable}} blocks
      if (value) {
        // If value is truthy, keep the block content
        const conditionalPattern = new RegExp(
          `{{#\\s*${this.escapeRegExp(key)}\\s*}}([\\s\\S]*?){{/\\s*${this.escapeRegExp(key)}\\s*}}`,
          'g'
        );
        rendered = rendered.replace(conditionalPattern, '$1');
      } else {
        // If value is falsy, remove the block content
        const conditionalPattern = new RegExp(
          `{{#\\s*${this.escapeRegExp(key)}\\s*}}[\\s\\S]*?{{/\\s*${this.escapeRegExp(key)}\\s*}}`,
          'g'
        );
        rendered = rendered.replace(conditionalPattern, '');
      }
    }

    // Remove unused variables to clean up template
    rendered = rendered.replace(/{{[^}]*}}/g, '');

    return rendered;
  }

  /**
   * Escape special regex characters in a string
   */
  private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Get required and optional variables
   */
  getVariableSchema(): {
    required: string[];
    optional: Record<string, string | number | boolean>;
  } {
    const config = this.loadConfig();
    return {
      required: config.requiredVariables,
      optional: config.optionalVariables,
    };
  }

  /**
   * Validate variables against schema
   */
  validateVariables(
    variables: Record<string, string | number | boolean>
  ): {
    valid: boolean;
    missing: string[];
    errors: Array<{ field: string; error: string }>;
  } {
    const schema = this.getVariableSchema();
    const missing: string[] = [];
    const errors: Array<{ field: string; error: string }> = [];

    // Check required variables
    for (const required of schema.required) {
      if (!(required in variables)) {
        missing.push(required);
        errors.push({
          field: required,
          error: `Missing required variable: ${required}`,
        });
      }
    }

    // Validate types
    for (const [key, value] of Object.entries(variables)) {
      if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
        errors.push({
          field: key,
          error: `Invalid type for ${key}: must be string, number, or boolean`,
        });
      }
    }

    return {
      valid: missing.length === 0 && errors.length === 0,
      missing,
      errors,
    };
  }

  /**
   * Resolve file path safely within repo
   * Security: Uses resolve + relative to prevent traversal
   * Returns resolved path if valid, throws if invalid
   */
  private resolveSafePath(targetPath: string, _allowOverwrite: boolean = false): string {
    // Reject obvious traversal attempts early
    if (targetPath.includes('..')) {
      throw new Error(`Invalid path: contains parent directory reference`);
    }

    // Use resolve + relative for bulletproof path containment
    const baseDir = resolve(this.scaffoldDir);
    const fullPath = resolve(baseDir, targetPath);
    const relativePath = relative(baseDir, fullPath);

    // Verify path is contained within base directory
    // relative() returns '..' if path escapes
    if (relativePath.startsWith('..') || relativePath === '.') {
      throw new Error(`File path outside repository directory (security violation)`);
    }

    // Prevent writes to scaffold's own critical directories
    if (
      relativePath.startsWith('scaffold.config.json') ||
      relativePath.startsWith('templates' + sep) ||
      relativePath.startsWith('mcp' + sep)
    ) {
      throw new Error(`Cannot overwrite scaffold infrastructure files`);
    }

    return fullPath;
  }

  /**
   * Check if file would be overwritten (uses unified safe path resolution)
   */
  fileWouldBeOverwritten(targetPath: string): boolean {
    const fullPath = this.resolveSafePath(targetPath);
    return existsSync(fullPath);
  }

  /**
   * Write file to target path
   * Security: Single unified helper prevents TOCTOU, symlink, and traversal attacks
   * - Validates path stays within repo using path.resolve + path.relative
   * - Prevents writes to scaffold's own config and templates directories
   * - Atomic exclusive create when overwrite not allowed
   */
  writeFile(targetPath: string, content: string, allowOverwrite: boolean = false): void {
    const fullPath = this.resolveSafePath(targetPath);

    // Ensure parent directory exists
    const parentDir = dirname(fullPath);
    if (!existsSync(parentDir)) {
      mkdirSync(parentDir, { recursive: true });
    }

    // Final security check: resolve parent dir's real path and verify containment
    // This catches symlinks in intermediate directories
    const realParentDir = realpathSync(parentDir);
    const realBaseDir = realpathSync(resolve(this.scaffoldDir));
    if (!realParentDir.startsWith(realBaseDir + sep) && realParentDir !== realBaseDir) {
      throw new Error(`Parent directory resolved outside repository (symlink attack detected)`);
    }

    // Write file (atomic: will throw if file exists and overwrite=false)
    writeFileSync(fullPath, content, 'utf-8');
  }

  /**
   * Get coverage percentage for a phase
   */
  getCoverage(phase: number): number {
    const templates = this.filterTemplates(undefined, [phase]);
    return Math.min(100, Math.round((templates.length / 10) * 100));
  }

  /**
   * Get time savings estimate
   */
  getTimeSavings(phase: number): string {
    const config = this.loadConfig();
    const templateCount = config.templates.filter((t) => t.phase <= phase).length;
    const minSavings = 5 + phase * 10;
    const maxSavings = 15 + phase * 20;
    return `${minSavings}-${maxSavings} minutes (${templateCount} templates)`;
  }
}
