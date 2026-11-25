/**
 * Starter checks for this skill, from ls-skill-scaffold.
 *
 * They check what Claude Code relies on to load the skill: SKILL.md
 * frontmatter with a name that matches the package, a usable description,
 * and relative links that resolve. Add tests for the skill's own code and
 * behaviour alongside these.
 */

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

/**
 * Read the YAML frontmatter fields of a Markdown file. Supports plain values
 * and folded (`>-`) values, which is what SKILL.md uses.
 *
 * @param {string} text File contents.
 * @returns {Record<string, string>} Field values.
 */
function frontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    return {};
  }
  const fields = {};
  let current = null;
  for (const line of match[1].split('\n')) {
    const pair = line.match(/^([a-z_-]+):\s*(.*)$/);
    if (pair) {
      current = pair[1];
      fields[current] = /^[>|]-?$/.test(pair[2]) ? '' : pair[2];
    } else if (current && /^\s+\S/.test(line)) {
      fields[current] = `${fields[current]} ${line.trim()}`.trim();
    }
  }
  return fields;
}

describe('SKILL.md', () => {
  const skill = read('SKILL.md');
  const fields = frontmatter(skill);

  test('has a name that matches package.json', () => {
    expect(fields.name).toBe(JSON.parse(read('package.json')).name);
  });

  test('has a description Claude Code can use to pick the skill', () => {
    expect(fields.description).toBeTruthy();
    expect(fields.description.length).toBeLessThanOrEqual(1024);
  });

  test('has a top-level heading', () => {
    expect(skill).toMatch(/^# /m);
  });
});

describe('links', () => {
  const docs = ['SKILL.md', 'README.md', 'CLAUDE.md', 'AGENTS.md'].filter((file) =>
    fs.existsSync(path.join(root, file)),
  );

  test.each(docs)('relative links in %s resolve', (file) => {
    const links = [...read(file).matchAll(/\]\(([^)\s]+)\)/g)]
      .map((m) => m[1].split('#')[0])
      .filter((href) => href && !/^(https?:|mailto:)/.test(href));
    for (const href of links) {
      expect({ file, href, exists: fs.existsSync(path.join(root, href)) }).toEqual({
        file,
        href,
        exists: true,
      });
    }
  });
});
