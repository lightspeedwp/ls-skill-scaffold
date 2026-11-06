/**
 * Scaffold Client - Core wrapper for skill-scaffold operations
 * Handles template loading, rendering, and file operations
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  realpathSync,
  lstatSync,
  renameSync,
  rmSync,
  statSync,
} from 'node:fs';
import { randomBytes } from 'node:crypto';
import { homedir } from 'node:os';
import { join, dirname, isAbsolute, sep } from 'node:path';

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

/** What applying a template does to the target repository. */
export type PlanAction = 'create' | 'overwrite' | 'skip';

export interface PlanEntry {
  file: string;
  source: string;
  phase: number;
  action: PlanAction;
  reason?: string;
}

// Skill types whose variant tag differs from the type name.
const VARIANT_ALIASES: Record<string, string[]> = {
  documentation: ['documentation', 'docs'],
};

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

    // With a skill type: every common template (no variant), plus the
    // variants tagged for that type (package.json:cli and so on). Variants
    // for other types or other purposes are left out.
    if (skillType) {
      const tags = VARIANT_ALIASES[skillType] || [skillType];
      templates = templates.filter((t) => {
        if (!t.variant) return true;
        const tag = t.variant.split(':').pop() || '';
        return tags.includes(tag);
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
   * Resolve the repository that templates are written into.
   * The write root is separate from the scaffold, which templates are read from.
   *
   * @param repoPath Absolute path to an existing folder.
   * @returns Its real path.
   */
  resolveTargetRoot(repoPath: string): string {
    if (typeof repoPath !== 'string' || !repoPath.trim()) {
      throw new Error('repo_path must be a non-empty path');
    }
    if (!isAbsolute(repoPath)) {
      throw new Error(`repo_path must be an absolute path: ${repoPath}`);
    }
    if (repoPath.split(/[\\/]/).includes('..')) {
      throw new Error(`repo_path must not contain "..": ${repoPath}`);
    }
    if (!existsSync(repoPath) || !statSync(repoPath).isDirectory()) {
      throw new Error(`repo_path is not an existing folder: ${repoPath}`);
    }
    const root = realpathSync(repoPath);
    if (root === sep || root === realpathSync(homedir())) {
      throw new Error(`repo_path must not be the filesystem root or your home folder: ${root}`);
    }
    const scaffold = realpathSync(this.scaffoldDir);
    if (root === scaffold || root.startsWith(scaffold + sep)) {
      throw new Error(`repo_path must not be inside the scaffold itself: ${root}`);
    }
    return root;
  }

  /**
   * Resolve one template target inside the write root, without following links.
   *
   * @param root   Real path of the target repository.
   * @param target Relative target from scaffold.config.json.
   * @returns The full path and whether a file is already there.
   */
  resolveTargetPath(root: string, target: string): { fullPath: string; exists: boolean } {
    const parts = target.split('/');
    if (isAbsolute(target) || parts.some((part) => part === '' || part === '.' || part === '..')) {
      throw new Error(`Invalid target path: ${target}`);
    }
    if (parts.includes('.git')) {
      throw new Error(`Git paths are never written: ${target}`);
    }
    // Every folder on the way must be a real folder, or not exist yet.
    for (let i = 1; i < parts.length; i++) {
      const ancestor = join(root, ...parts.slice(0, i));
      const stat = lstatOrNull(ancestor);
      if (!stat) break;
      if (stat.isSymbolicLink()) {
        throw new Error(`${parts.slice(0, i).join('/')} is a symbolic link; writes never follow links`);
      }
      if (!stat.isDirectory()) {
        throw new Error(`${parts.slice(0, i).join('/')} is not a folder`);
      }
    }
    const fullPath = join(root, ...parts);
    const stat = lstatOrNull(fullPath);
    if (stat && !stat.isFile()) {
      throw new Error(`${target} exists and is not a regular file`);
    }
    return { fullPath, exists: Boolean(stat) };
  }

  /**
   * Decide what applying each template would do. Shared by dry run and apply,
   * so the preview is the plan that apply carries out.
   *
   * Overwrite precedence (SC-D02): an explicit request `overwrite` decides for
   * every existing file; when the request leaves it out, the manifest's
   * per-template `overwrite` decides. Missing files are always created.
   *
   * @param root      Real path of the target repository.
   * @param templates Selected templates.
   * @param overwrite The request's overwrite value, if given.
   * @returns One entry per template.
   */
  planApply(root: string, templates: TemplateInfo[], overwrite?: boolean): PlanEntry[] {
    return templates.map((t) => {
      const { exists } = this.resolveTargetPath(root, t.target);
      const entry = { file: t.target, source: t.source, phase: t.phase };
      if (!exists) {
        return { ...entry, action: 'create' as const };
      }
      if (overwrite === true) {
        return { ...entry, action: 'overwrite' as const, reason: 'exists; the request sets overwrite: true' };
      }
      if (overwrite === false) {
        return { ...entry, action: 'skip' as const, reason: 'exists; the request sets overwrite: false' };
      }
      return t.overwrite
        ? { ...entry, action: 'overwrite' as const, reason: 'exists; the manifest allows replacing it' }
        : { ...entry, action: 'skip' as const, reason: 'exists; the manifest does not allow replacing it' };
    });
  }

  /**
   * Write one rendered template. A create never replaces a file that appeared
   * since the plan; an overwrite writes a temporary file beside the target and
   * renames it into place, so the target is never half-written.
   *
   * @param root    Real path of the target repository.
   * @param target  Relative target.
   * @param content Rendered content.
   * @param action  The planned action.
   */
  writeFile(root: string, target: string, content: string, action: 'create' | 'overwrite'): void {
    this.resolveTargetPath(root, target);
    const parts = target.split('/');
    for (let i = 1; i < parts.length; i++) {
      const folder = join(root, ...parts.slice(0, i));
      if (!lstatOrNull(folder)) {
        mkdirSync(folder);
      }
    }
    // Re-check after creating folders: nothing on the way may be a link.
    const { fullPath, exists } = this.resolveTargetPath(root, target);

    if (action === 'create') {
      // 'wx' fails if a file appeared since the plan.
      writeFileSync(fullPath, content, { encoding: 'utf-8', flag: 'wx' });
      return;
    }
    if (!exists) {
      throw new Error(`${target} was planned as an overwrite but no longer exists`);
    }
    const temp = join(dirname(fullPath), `.${parts[parts.length - 1]}.scaffold-${randomBytes(6).toString('hex')}.tmp`);
    try {
      writeFileSync(temp, content, { encoding: 'utf-8', flag: 'wx' });
      renameSync(temp, fullPath);
    } catch (error) {
      rmSync(temp, { force: true });
      throw error;
    }
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

/**
 * lstat that returns null when nothing is there.
 *
 * @param path Path.
 * @returns Stats, or null.
 */
function lstatOrNull(path: string): ReturnType<typeof lstatSync> | null {
  try {
    return lstatSync(path);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' || code === 'ENOTDIR') return null;
    throw error;
  }
}
