/**
 * A small Mustache renderer for the scaffold templates (LS-4748 SC-F06).
 *
 * Supports what the templates use: `{{name}}`, `{{{name}}}` and `{{&name}}`,
 * sections over booleans, objects and lists (`{{#name}}`), inverted sections
 * (`{{^name}}`), the current item (`{{.}}`), dotted names and comments.
 * Lines that hold only a section tag or a comment are removed whole, as the
 * Mustache specification says.
 *
 * Differences from full Mustache, on purpose:
 * - Output is not HTML-escaped. A caller can pass an escaper for the target
 *   format instead (JSON strings, for example).
 * - `${{ … }}` is left exactly as written: it is a GitHub Actions expression,
 *   not a scaffold variable.
 * - Partials, delimiter changes, lambdas and filter syntax such as
 *   `{{name | default 'x'}}` are refused with an error, never guessed at.
 * - A plain `{{name}}` with no value is reported in `missing`, so a caller can
 *   refuse to write a file with holes in it.
 */

export type TemplateValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | TemplateValue[]
  | { [key: string]: TemplateValue };

export interface RenderOptions {
  /** Applied to every `{{name}}` value; not to `{{{name}}}` or `{{&name}}`. */
  escape?: (value: string) => string;
}

export interface RenderResult {
  output: string;
  /** Names rendered as plain tags that had no value, in first-seen order. */
  missing: string[];
}

type Node =
  | { type: 'text'; value: string }
  | { type: 'name'; name: string; raw: boolean }
  | { type: 'section'; name: string; inverted: boolean; children: Node[] };

const NAME = /^(\.|[A-Za-z_][\w-]*(\.[A-Za-z_][\w-]*)*)$/;
const STANDALONE = /^[ \t]*\{\{[#^/!][^}]*\}\}[ \t]*$/;

/**
 * Render a template.
 *
 * @param template Template text.
 * @param context  Values for the tags.
 * @param options  Escaper.
 * @returns Output and the names that had no value.
 * @throws When the template uses syntax this renderer does not support, or a
 *         section is not closed.
 */
export function renderMustache(
  template: string,
  context: Record<string, TemplateValue>,
  options: RenderOptions = {}
): RenderResult {
  const missing = new Set<string>();
  const output = renderNodes(parse(stripStandalone(template)), [context], options, missing);
  return { output, missing: [...missing] };
}

/**
 * Remove the whitespace and line ending around tags that stand alone on a line.
 *
 * @param template Template text.
 * @returns Template text.
 */
function stripStandalone(template: string): string {
  const lines = template.split(/(?<=\n)/);
  return lines
    .map((line) => {
      const body = line.replace(/\r?\n$/, '');
      return STANDALONE.test(body) && !body.includes('${{') ? body.trim() : line;
    })
    .join('');
}

/**
 * Parse a template into a tree.
 *
 * @param template Template text.
 * @returns Nodes.
 */
function parse(template: string): Node[] {
  const root: Node[] = [];
  const stack: Array<{ name: string; children: Node[]; line: number }> = [];
  let children = root;
  let text = '';
  let i = 0;

  const lineAt = (index: number) => template.slice(0, index).split('\n').length;
  const flush = () => {
    if (text) children.push({ type: 'text', value: text });
    text = '';
  };

  while (i < template.length) {
    const open = template.indexOf('{{', i);
    if (open === -1) {
      text += template.slice(i);
      break;
    }
    text += template.slice(i, open);

    // GitHub Actions expression: copy `${{ … }}` through unchanged.
    if (template[open - 1] === '$') {
      const close = template.indexOf('}}', open + 2);
      if (close === -1) throw new Error(`Unclosed \${{ on line ${lineAt(open)}`);
      text += template.slice(open, close + 2);
      i = close + 2;
      continue;
    }

    const triple = template.startsWith('{{{', open);
    const closer = triple ? '}}}' : '}}';
    const close = template.indexOf(closer, open + (triple ? 3 : 2));
    if (close === -1) throw new Error(`Unclosed tag on line ${lineAt(open)}`);
    const tag = template.slice(open + (triple ? 3 : 2), close).trim();
    i = close + closer.length;

    const sigil = triple ? '{' : tag[0];
    const name = triple ? tag : '#^/!&>='.includes(sigil) ? tag.slice(1).trim() : tag;
    if (sigil === '!') continue;
    if (sigil === '>' || sigil === '=') {
      throw new Error(`Unsupported Mustache tag {{${tag}}} on line ${lineAt(open)}`);
    }
    if (!NAME.test(name)) {
      throw new Error(`Unsupported tag {{${tag}}} on line ${lineAt(open)}: use plain Mustache names and sections`);
    }

    flush();
    if (sigil === '#' || sigil === '^') {
      const section: Node = { type: 'section', name, inverted: sigil === '^', children: [] };
      children.push(section);
      stack.push({ name, children, line: lineAt(open) });
      children = section.children;
    } else if (sigil === '/') {
      const top = stack.pop();
      if (!top || top.name !== name) {
        throw new Error(`{{/${name}}} on line ${lineAt(open)} does not close ${top ? `{{#${top.name}}}` : 'a section'}`);
      }
      children = top.children;
    } else {
      children.push({ type: 'name', name, raw: triple || sigil === '&' });
    }
  }
  flush();
  if (stack.length) {
    const top = stack[stack.length - 1];
    throw new Error(`{{#${top.name}}} on line ${top.line} is never closed`);
  }
  return root;
}

/**
 * Look a name up through the context stack, innermost first.
 *
 * @param name  Tag name.
 * @param stack Context stack.
 * @returns The value, or undefined.
 */
function lookup(name: string, stack: TemplateValue[]): TemplateValue {
  if (name === '.') return stack[stack.length - 1];
  const [first, ...rest] = name.split('.');
  for (let i = stack.length - 1; i >= 0; i--) {
    const frame = stack[i];
    if (isObject(frame) && Object.prototype.hasOwnProperty.call(frame, first)) {
      let value: TemplateValue = frame[first];
      for (const part of rest) {
        value = isObject(value) && Object.prototype.hasOwnProperty.call(value, part) ? value[part] : undefined;
      }
      return value;
    }
  }
  return undefined;
}

function isObject(value: TemplateValue): value is { [key: string]: TemplateValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFalsy(value: TemplateValue): boolean {
  return Array.isArray(value) ? value.length === 0 : !value;
}

function renderNodes(nodes: Node[], stack: TemplateValue[], options: RenderOptions, missing: Set<string>): string {
  let out = '';
  for (const node of nodes) {
    if (node.type === 'text') {
      out += node.value;
      continue;
    }
    const value = lookup(node.name, stack);
    if (node.type === 'name') {
      if (value === undefined || value === null) {
        missing.add(node.name);
        continue;
      }
      if (typeof value === 'object') {
        throw new Error(`{{${node.name}}} is a list or object; render it with a section`);
      }
      out += node.raw || !options.escape ? String(value) : options.escape(String(value));
      continue;
    }
    if (node.inverted) {
      if (isFalsy(value)) out += renderNodes(node.children, stack, options, missing);
    } else if (Array.isArray(value)) {
      for (const item of value) out += renderNodes(node.children, [...stack, item], options, missing);
    } else if (!isFalsy(value)) {
      out += renderNodes(node.children, [...stack, value], options, missing);
    }
  }
  return out;
}
