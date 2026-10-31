/**
 * Zod schemas for skill-scaffold MCP tools
 * Validates input and defines output structure for all 7 operations
 */

import * as z from 'zod/v4';

/**
 * Skill type enumeration for filtering templates
 */
export const SkillType = z.enum(['cli', 'validation', 'documentation', 'agent']);
export type SkillType = z.infer<typeof SkillType>;

/**
 * Phase enumeration for template filtering
 */
export const Phase = z.enum(['1', '2', '3', 'all']);
export type Phase = z.infer<typeof Phase>;

/**
 * Template metadata structure
 */
export const TemplateMetadata = z.object({
  source: z.string().describe('Source template path'),
  target: z.string().describe('Target file path'),
  phase: z.number().min(1).max(3).describe('Phase number (1, 2, or 3)'),
  overwrite: z.boolean().describe('Whether this file will be overwritten'),
  required: z.boolean().describe('Whether this template is required'),
  variant: z.string().optional().describe('Variant tag (e.g., jest:strict)'),
  specialized: z.boolean().optional().describe('Whether this is a specialized template'),
});
export type TemplateMetadata = z.infer<typeof TemplateMetadata>;

/**
 * Variables object for template rendering
 */
export const TemplateVariables = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
  .describe('Mustache variables for template rendering');
export type TemplateVariables = z.infer<typeof TemplateVariables>;

// ============================================================================
// scaffold_apply schema
// ============================================================================

export const ScaffoldApplyInput = z.object({
  repo_path: z.string().describe('Target repository path'),
  repo_name: z.string().describe('Repository name'),
  skill_type: SkillType.optional().describe('Skill type: cli, validation, documentation, or agent'),
  variables: TemplateVariables.optional().describe('Additional Mustache variables'),
  dry_run: z.boolean().optional().default(false).describe('Preview changes without writing (read-only)'),
  phases: Phase.optional().default('all').describe('Phases to apply: 1, 2, 3, or all'),
  overwrite: z.boolean().optional().default(false).describe('Overwrite non-security files'),
}).strict();
export type ScaffoldApplyInput = z.infer<typeof ScaffoldApplyInput>;

export const ScaffoldApplyOutput = z.object({
  success: z.boolean().describe('Whether operation succeeded'),
  filesWritten: z.number().describe('Number of files written/previewed'),
  filesSkipped: z.number().describe('Number of files skipped'),
  coverage: z.number().min(0).max(100).describe('Estimated coverage percentage'),
  timeSaved: z.string().describe('Estimated time saved vs. manual setup'),
  summary: z.string().describe('Human-readable summary of changes'),
  errors: z.array(z.object({
    file: z.string(),
    error: z.string(),
    suggestion: z.string().optional(),
  })).optional().describe('List of errors encountered'),
}).strict();
export type ScaffoldApplyOutput = z.infer<typeof ScaffoldApplyOutput>;

// ============================================================================
// scaffold_dry_run schema
// ============================================================================

export const ScaffoldDryRunInput = z.object({
  repo_path: z.string().describe('Target repository path'),
  repo_name: z.string().describe('Repository name'),
  skill_type: SkillType.optional().describe('Skill type for filtering'),
  variables: TemplateVariables.optional().describe('Mustache variables'),
  phases: Phase.optional().default('all').describe('Phases to preview'),
}).strict();
export type ScaffoldDryRunInput = z.infer<typeof ScaffoldDryRunInput>;

export const ScaffoldDryRunOutput = z.object({
  success: z.boolean().describe('Whether dry-run succeeded'),
  proposedChanges: z.array(z.object({
    file: z.string().describe('Target file path'),
    action: z.enum(['create', 'overwrite', 'skip']).describe('Action to be taken'),
    phase: z.number().describe('Template phase'),
    lines: z.number().optional().describe('Estimated lines of code'),
  })).describe('List of proposed file changes'),
  totalFiles: z.number().describe('Total files that would be affected'),
  coverage: z.number().min(0).max(100).describe('Coverage percentage if applied'),
  summary: z.string().describe('Summary of what would change'),
}).strict();
export type ScaffoldDryRunOutput = z.infer<typeof ScaffoldDryRunOutput>;

// ============================================================================
// list_templates schema
// ============================================================================

export const ListTemplatesInput = z.object({
  skill_type: SkillType.optional().describe('Filter by skill type'),
  phase: Phase.optional().describe('Filter by phase'),
  page: z.number().min(1).optional().default(1).describe('Pagination page number'),
  limit: z.number().min(1).max(100).optional().default(25).describe('Results per page'),
}).strict();
export type ListTemplatesInput = z.infer<typeof ListTemplatesInput>;

export const ListTemplatesOutput = z.object({
  templates: z.array(
    z.object({
      name: z.string().describe('Template name'),
      description: z.string().describe('Template description'),
      phase: z.number().describe('Phase number'),
      source: z.string().describe('Source template path'),
      target: z.string().describe('Target file path'),
      required: z.boolean().describe('Whether template is required'),
      overwrite: z.boolean().describe('Whether file is overwritten'),
      variant: z.string().optional().describe('Variant tag if applicable'),
    })
  ).describe('Array of template metadata'),
  total: z.number().describe('Total templates matching filters'),
  page: z.number().describe('Current page number'),
  pages: z.number().describe('Total number of pages'),
  hasMore: z.boolean().describe('Whether more results are available'),
}).strict();
export type ListTemplatesOutput = z.infer<typeof ListTemplatesOutput>;

// ============================================================================
// list_variants schema
// ============================================================================

export const ListVariantsInput = z.object({
  skill_type: SkillType.describe('Skill type to filter variants for'),
  phases: z.array(z.number().min(1).max(3)).optional().describe('Filter by phases'),
}).strict();
export type ListVariantsInput = z.infer<typeof ListVariantsInput>;

export const ListVariantsOutput = z.object({
  skillType: z.string().describe('The skill type requested'),
  variants: z.array(
    z.object({
      tag: z.string().describe('Variant tag (e.g., jest:strict)'),
      description: z.string().describe('Description of the variant'),
      templates: z.array(z.string()).describe('List of template names'),
      phase: z.number().describe('Phase number'),
    })
  ).describe('Array of variant configurations'),
  coverage: z.number().min(0).max(100).describe('Coverage percentage for this skill type'),
}).strict();
export type ListVariantsOutput = z.infer<typeof ListVariantsOutput>;

// ============================================================================
// template_render schema
// ============================================================================

export const TemplateRenderInput = z.object({
  template_name: z.string().describe('Name of template to render (e.g., package.json.mustache)'),
  variables: TemplateVariables.describe('Mustache variables for rendering'),
}).strict();
export type TemplateRenderInput = z.infer<typeof TemplateRenderInput>;

export const TemplateRenderOutput = z.object({
  success: z.boolean().describe('Whether rendering succeeded'),
  content: z.string().optional().describe('Rendered template content'),
  lines: z.number().optional().describe('Number of lines in rendered output'),
  errors: z.array(z.string()).optional().describe('Rendering errors if any'),
  preview: z.string().optional().describe('First 500 characters of rendered content'),
}).strict();
export type TemplateRenderOutput = z.infer<typeof TemplateRenderOutput>;

// ============================================================================
// validate_variables schema
// ============================================================================

export const ValidateVariablesInput = z.object({
  skill_type: SkillType.describe('Skill type to validate against'),
  variables: TemplateVariables.describe('Variables to validate'),
}).strict();
export type ValidateVariablesInput = z.infer<typeof ValidateVariablesInput>;

export const ValidateVariablesOutput = z.object({
  valid: z.boolean().describe('Whether all required variables are present and valid'),
  required: z.array(z.object({
    name: z.string().describe('Variable name'),
    type: z.string().describe('Expected type'),
    provided: z.boolean().describe('Whether variable was provided'),
  })).describe('Required variables and their status'),
  optional: z.array(z.object({
    name: z.string().describe('Variable name'),
    type: z.string().describe('Variable type'),
    default: z.union([z.string(), z.number(), z.boolean()]).optional().describe('Default value'),
    provided: z.boolean().describe('Whether variable was provided'),
  })).describe('Optional variables and their status'),
  errors: z.array(z.object({
    field: z.string().describe('Variable name'),
    error: z.string().describe('Error message'),
    suggestion: z.string().optional().describe('How to fix'),
  })).optional().describe('Validation errors'),
}).strict();
export type ValidateVariablesOutput = z.infer<typeof ValidateVariablesOutput>;

// ============================================================================
// skill_info schema
// ============================================================================

export const SkillInfoInput = z.object({}).strict();
export type SkillInfoInput = z.infer<typeof SkillInfoInput>;

export const SkillInfoOutput = z.object({
  name: z.string().describe('Project name'),
  version: z.string().describe('Current version'),
  description: z.string().describe('Project description'),
  coverage: z.object({
    phase1: z.number().describe('Phase 1 coverage percentage'),
    phase2: z.number().describe('Phase 2 coverage percentage'),
    phase3: z.number().describe('Phase 3 coverage percentage'),
    overall: z.number().describe('Overall coverage percentage'),
  }).describe('Coverage metrics by phase'),
  timeSavings: z.object({
    phase1: z.string().describe('Time saved with Phase 1'),
    phase2: z.string().describe('Time saved with Phase 2'),
    phase3: z.string().describe('Time saved with Phase 3'),
    overall: z.string().describe('Overall time savings vs. manual setup'),
  }).describe('Time savings by phase'),
  templates: z.object({
    total: z.number().describe('Total number of templates'),
    byPhase: z.object({
      phase1: z.number(),
      phase2: z.number(),
      phase3: z.number(),
    }).describe('Templates per phase'),
    variants: z.number().describe('Number of variants available'),
  }).describe('Template statistics'),
  skillTypes: z.array(z.object({
    type: SkillType.describe('Skill type'),
    coverage: z.number().describe('Coverage for this type'),
    templates: z.number().describe('Number of templates'),
  })).describe('Support for different skill types'),
}).strict();
export type SkillInfoOutput = z.infer<typeof SkillInfoOutput>;
