# Compatibility map (SC-D01)

This page records which names the scaffold accepts, which names it translates them to, and what each layer returns. It is the contract for the LS-4748 repairs. If you change a name in the config, a template or the MCP server, update this page in the same pull request.

Status: **agreed 18 November 2026** (Warwick). Rows marked *To do* describe the agreed behaviour that the code does not follow yet.

## Agreed rules

1. **Public names stay snake_case.** Callers send `repo_name`, `repo_description`, `author`, `version` and the other names in `scaffold.config.json`. The tool names and argument names on the MCP server do not change (SC-D01, 5 November 2026).
2. **The renderer translates.** The templates use camelCase placeholders. Before rendering, the server fills each camelCase name from its snake_case source. Templates are not renamed.
3. **Missing values are worked out or asked for, never made up.** A value that can be worked out from the slug (`repo_name`) or the skill type is filled in automatically. Anything else is asked for. If it is still missing, the preview lists it and nothing is written.
4. **An omitted `phases` means all phases**, as `SKILL.md` already says.
5. **Overwrite authority** follows SC-D02: an explicit `overwrite` in the request decides for every existing file; otherwise the manifest's per-template `overwrite` decides. Files outside the plan are never touched.
6. **The MCP server is the only programmatic interface.** The Python helper scripts were removed. They only called a mock and nothing used them. `scripts/apply-scaffold.sh` stays as the command-line route.

## 1. Template variables

### From the config

| Public name (`scaffold.config.json`) | Default | Template placeholder(s) filled | Status |
|---|---|---|---|
| `repo_name` *(required)* | none | `repo_name`, `skillSlug` | Works |
| `repo_description` *(required)* | none | `repo_description`, `skillDescription` | Works |
| `author` *(required)* | none | `authorName` | Works |
| `version` *(required)* | none | `version` | Works |
| `min_node_version` | `24.0.0` | `nodeMinVersion` (as given), `nodeVersion` (major only, for `{{nodeVersion}}.x` in workflows) | Works |
| `coverage_threshold` | `80` | `testCoverageThreshold` | Works |
| `branch_prefix` | `skill-` | `branch_prefix` | Works |
| `branch_pattern` | `^(wp-db-\|skill-\|main\|master)$` | `branchPattern` | Works |
| `has_bats` | `false` | `hasBatsTests` | Works |
| `has_shell` | `false` | `has_shell`, `hasShellScripts` | Works |
| `has_yaml` | `false` | `has_yaml`, `hasYamlLinting` | Works |
| `has_anthropic` | `false` | `hasAnthropicSdk` | Works |
| `has_migrate` | `false` | `hasMigrationApi` | Works |
| `has_jest` | `true` | none (no template uses it) | No change |

Config defaults are merged before rendering. A value the caller sends under a placeholder's own name (for example `skillName`) always wins over the default and the worked-out value.

### Worked out automatically

| Placeholder | Worked out from | Example (`repo_name: wp-db-migrate`, `skill_type: cli`) |
|---|---|---|
| `skillName` | `repo_name` in title case; shown to the user to confirm | `WP DB Migrate` |
| `quickStartCommand` | `/` + `repo_name` | `/wp-db-migrate` |
| `skillType` | `skill_type` | `cli` |
| `hasCLI` | `skill_type` is `cli` | `true` |
| `hasValidation` | `skill_type` is `validation` | `false` |
| `hasDocs` | `skill_type` is `documentation` | `false` |

### Asked for when the caller has not supplied them

These describe what the new skill does, so they cannot be worked out. In conversational mode the skill asks for them. In form mode they must be in `variables`, or the preview reports them as missing.

| Placeholder(s) | Used in |
|---|---|
| `features` | `SKILL.md`, `README.md` |
| `usageExamples` (`usageTitle`, `usageDescription`, `usageCommand`, `usageCode`) | `SKILL.md`, `AGENTS.md` |
| `howItWorks`, `installation`, `advancedUsage`, `troubleshooting`, `faq` | `README.md`, `SKILL.md` |
| `agentPurpose`, `agentCapabilities`, `agentLimitations`, `agentUsageExamples` | agent skill type only |
| `promptPurpose`, `promptVariables`, `promptExamples` | `PROMPT_TEMPLATE.md` only |
| `license` | `README.md`, `package.json` (no default: see open questions) |
| `testCommand` | `.github/workflows/ci.yml` (no source in the config) |
| `lineLength` | `.markdownlint.json` (no source in the config) |
| `promptName` | `PROMPT_TEMPLATE.md` |
| `skillType` | `AGENTS.md`, `PROMPT_TEMPLATE.md`, `SKILL.md`: worked out when `skill_type` is sent, asked for otherwise |

### Feature flags with no source

These switch optional template sections on or off. They default to `false` (the section is left out) unless the caller sends them: `hasSkillDirectory`, `hasPluginDirectory`, `hasProductionDeps`, `hasAPI`, `hasSetupScript`, `useEsModules`, `strictMode`, `hasBrowserGlobals`, `skipTests`, `excludeTests`, `includeCoverage`, `skillDocPath`, `licenseText`, `acknowledgments`, `customRequirements`.

### Must pass through unchanged

GitHub Actions expressions are not scaffold variables. The renderer leaves every `${{ … }}` exactly as written, for example `${{ matrix.os }}`, `${{ steps.version.outputs.VERSION }}` and `${{ secrets.GITHUB_TOKEN }}`.

### How values are written

- Values are written as they are. Output is not HTML-escaped, and `$&` or `$1` in a value stays literal.
- In JSON targets (`package.json` and its variants, `.markdownlint.json`), values are JSON-escaped, and the rendered file must parse. A file that does not parse is an error, and nothing is written.
- A plain `{{name}}` with no value is never written as an empty string. Dry run lists it in `errors[]` (`field`, `file`), and apply writes nothing.
- The renderer supports plain Mustache only: names, sections over booleans, lists and objects, inverted sections, `{{.}}`, dotted names and comments. Filter syntax (`{{x | default 'y'}}`), partials and delimiter changes are refused with an error.

### Static files

The `files` entries in `scaffold.config.json` (`.prettierrc`, `.markdownlint.jsonc`) are planned and copied byte for byte with the templates of their phase. The manifest gives them no `overwrite` flag, so an existing copy is kept unless the request sets `overwrite: true` (SC-D02). `list_templates` lists them with `static: true`.

## 2. MCP tool arguments

| Tool | Arguments | Notes |
|---|---|---|
| `scaffold_apply` | `repo_path`, `repo_name` *(required)*; `skill_type`, `variables`, `dry_run`, `phases`, `overwrite` | `phases` is a string: `"1"`, `"2"`, `"3"` or `"all"`. Omitted means `"all"`. |
| `scaffold_dry_run` | `repo_path`, `repo_name` *(required)*; `skill_type`, `variables`, `phases` | Same plan as `scaffold_apply`; writes nothing. |
| `list_templates` | `skill_type`, `phase`, `page`, `limit` | Singular `phase`, string form. |
| `list_variants` | `skill_type` *(required)*; `phases` | `phases` is an array of numbers here, unlike the other tools. |
| `template_render` | `template_name`, `variables` *(required)* | |
| `validate_variables` | `skill_type`, `variables` | |
| `skill_info` | none | |

`skill_type` is one of `cli`, `validation`, `documentation`, `agent`. `documentation` selects the templates tagged `docs`.

## 3. Results

Every tool returns one MCP text item whose `text` is a JSON object. Callers parse `content[0].text`.

| Tool | Fields |
|---|---|
| `scaffold_dry_run` | `success`, `proposedChanges[]` (`file`, `action`: `create` / `overwrite` / `skip`, `phase`, `reason`), `totalFiles`, `repoPath`, `errors[]` when apply would refuse |
| `scaffold_apply` | `filesWritten`, `filesSkipped`, `written[]`, `skipped[]`, `notWritten[]`, `repoPath` |
| `list_templates` | `templates[]` (`source`, `target`, `phase`, `static` for `files` entries, …), `total`, `page`, `pages` |
| `template_render` | `success`, `content`, `missing[]` (placeholders with no value), `lines`, `preview` |
| `validate_variables` | `valid`, `errors[]` (`field`, `error`) |
| Any tool, on failure | `isError: true`; `text` is a plain message starting `Error:`, not JSON |

Plan errors (missing variables, unreadable templates) come back inside the JSON as `errors[]`, each with `error` and either `field` or `file`.

Callers that page through `list_templates` keep requesting pages until `page` equals `pages`.

**To do (SC-F10):** `skill_info` returns hard-coded counts and coverage figures (24 templates, 98% coverage). It must report the real inventory from `scaffold.config.json`: 23 templates and 3 static files at the time of writing.

## 4. Phases

| `phases` value | Templates selected | Status |
|---|---|---|
| omitted | all phases | **To do:** the server currently selects phase 3 only |
| `"all"` | all phases | Works |
| `"1"`, `"2"`, `"3"` | that phase only | Works |

## 5. Removed interfaces

| Interface | Replaced by |
|---|---|
| `scripts/scaffold_discover.py` | `list_templates`, `list_variants` |
| `scripts/scaffold_validate.py` | `validate_variables` |
| `scripts/scaffold_preview.py` | `scaffold_dry_run` |
| `scripts/scaffold_apply.py` | `scaffold_apply` |
| `scripts/scaffold_generator.py` | `SKILL.md` (conversation flow) calling the tools above |

## Open questions

- **`features` has two shapes.** `SKILL.md.mustache` expects a list of strings (`{{.}}`). `README.md.mustache` expects a list of objects with `title` and `description`. The renderer needs one input shape. Proposal: callers send objects, and `SKILL.md` renders `title`.
- **Licence.** This repository's `LICENSE` file is GPL-3.0, but `skill.json` and `.skill` say MIT. Until that is settled, `license` has no default and is always asked for.
- **`testCommand` and `lineLength`** have no source in the config, so every apply has to send them. Defaults (`npm test`, `120`) would be easy to add to `optionalVariables`, but that is a contract change for review, not part of SC-F06.
