/**
 * Convert a glob pattern to an anchored regular expression.
 *
 * Supported glob syntax:
 *   *      matches any number of characters (including none) except path separators
 *   **     matches any number of characters including path separators
 *   ?      matches exactly one character except a path separator
 *   [...]  character class (supports ranges and negation with ! or ^)
 *   {a,b}  brace expansion alternation (non-nested)
 *
 * The returned RegExp is anchored with ^ and $, so it matches the entire string.
 * Backslashes are treated as escape characters only before glob special characters;
 * otherwise they are matched literally (no special escape semantics).
 *
 * @param {string} pattern - The glob pattern.
 * @param {{ extended?: boolean, globstar?: boolean }} [options]
 * @returns {RegExp}
 */
export function globToRegExp(pattern, options = {}) {
  const { extended = false, globstar = false } = options;

  if (typeof pattern !== 'string') {
    throw new TypeError('glob pattern must be a string');
  }

  const chars = [...pattern];
  let i = 0;
  let out = '^';

  while (i < chars.length) {
    const c = chars[i];

    if (c === '*') {
      if (globstar && chars[i + 1] === '*') {
        // `**` matches zero or more characters including `/`.
        out += '.*';
        i += 2;
        // Allow a following slash to be consumed by `**/` as well.
        if (chars[i] === '/') {
          out += '/?';
          i += 1;
        }
        continue;
      }
      // `*` matches zero or more characters except `/`.
      out += '[^/]*';
      i += 1;
      continue;
    }

    if (c === '?') {
      out += '[^/]';
      i += 1;
      continue;
    }

    if (c === '[') {
      const closing = chars.indexOf(']', i + 1);
      if (closing === -1) {
        // Unterminated class: treat `[` literally.
        out += '\\[';
        i += 1;
        continue;
      }

      const classBody = chars.slice(i + 1, closing);
      let j = 0;
      let negated = false;
      if (classBody[0] === '!' || classBody[0] === '^') {
        negated = true;
        j = 1;
      }

      let classOut = '';
      while (j < classBody.length) {
        const cc = classBody[j];

        if (cc === '\\' && j + 1 < classBody.length) {
          // Escape inside class: treat next char literally.
          classOut += '\\' + classBody[j + 1];
          j += 2;
          continue;
        }

        if (
          j + 2 < classBody.length &&
          classBody[j + 1] === '-' &&
          classBody[j + 2] !== ']'
        ) {
          // Range a-z
          classOut += cc + '-' + classBody[j + 2];
          j += 3;
          continue;
        }

        if (cc === ']') {
          // `]` cannot appear unescaped inside a class; treat literally.
          classOut += '\\]';
          j += 1;
          continue;
        }

        classOut += cc.replace(/[\^$.|?*+(){}]/g, '\\$&');
        j += 1;
      }

      if (classOut === '') {
        // Empty class `[]` or `[!]` never matches anything.
        out += '(?!)';
      } else {
        out += `[${negated ? '^' : ''}${classOut}]`;
      }
      i = closing + 1;
      continue;
    }

    if (c === '{' && extended) {
      const closing = chars.indexOf('}', i + 1);
      if (closing === -1) {
        out += '\\{';
        i += 1;
        continue;
      }

      const body = chars.slice(i + 1, closing).join('');
      const parts = body.split(',');
      if (parts.length < 2 || parts.some((p) => p.length === 0)) {
        // Empty alternatives are not supported; treat `{` literally.
        out += '\\{';
        i += 1;
        continue;
      }

      const alts = parts.map((p) => {
        // Recursively compile each alternative.
        return globToRegExp(p, options).source.slice(1, -1);
      });
      out += `(?:${alts.join('|')})`;
      i = closing + 1;
      continue;
    }

    if (c === '\\' && i + 1 < chars.length) {
      const next = chars[i + 1];
      if ('*?[]{}()'.includes(next)) {
        // Escape glob metacharacter: match it literally.
        out += next.replace(/[\^$.|?*+(){}]/g, '\\$&');
        i += 2;
        continue;
      }
      // Backslash before non-special char: match backslash literally.
      out += '\\\\';
      i += 1;
      continue;
    }

    // Escape regex special characters.
    out += c.replace(/[\^$.|?*+(){}]/g, '\\$&');
    i += 1;
  }

  out += '$';
  return new RegExp(out);
}
