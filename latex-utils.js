(function (root, factory) {
  const utils = factory();
  if (typeof module === 'object' && module.exports) module.exports = utils;
  if (root) root.LatexUtils = utils;
})(typeof window !== 'undefined' ? window : null, function () {
  const TEXT_ENVIRONMENTS = {
    abstract: 'Resumen',
    center: '',
    corollary: 'Corolario',
    definition: 'Definición',
    example: 'Ejemplo',
    flushleft: '',
    flushright: '',
    lemma: 'Lema',
    proof: 'Demostración',
    proposition: 'Proposición',
    quote: '',
    quotation: '',
    remark: 'Observación',
    solution: 'Solución',
    theorem: 'Teorema'
  };

  const TEXT_COMMANDS = {
    emph: { tag: 'em' },
    textbf: { tag: 'strong' },
    textit: { tag: 'em' },
    textmd: { tag: 'span', className: 'latex-text-medium' },
    textnormal: { tag: 'span', className: 'latex-text-normal' },
    textrm: { tag: 'span', className: 'latex-textrm' },
    textsc: { tag: 'span', className: 'latex-text-small-caps' },
    textsf: { tag: 'span', className: 'latex-text-sans' },
    texttt: { tag: 'code', className: 'latex-text-monospace' },
    textup: { tag: 'span', className: 'latex-text-upright' },
    text: { tag: 'span' },
    underline: { tag: 'u' }
  };

  const MATH_ENVIRONMENTS = new Set([
    'align', 'align*', 'alignat', 'alignat*', 'aligned', 'alignedat', 'array', 'cases', 'CD',
    'equation', 'equation*', 'flalign', 'flalign*', 'gather', 'gather*', 'gathered', 'matrix',
    'multline', 'multline*', 'pmatrix', 'smallmatrix', 'split', 'subarray', 'Vmatrix', 'vmatrix',
    'bmatrix', 'Bmatrix', 'xalignat', 'xalignat*', 'xxalignat'
  ]);

  const ESCAPED_HTML = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ESCAPED_HTML[char]);
  }

  function normalizeEnvironmentSyntax(source) {
    return String(source || '').replace(
      /\\(begin|end)\s*\{?\s*([A-Za-z][A-Za-z0-9*:_-]*)\s*\}?/g,
      (_, command, environment) => `\\${command}{${environment}}`
    );
  }

  function hasLatexSyntax(source) {
    return /(?:\$\$?|\\\[|\\\(|\\(?:begin|end)\s*(?:\{|\s)[A-Za-z]|\\[A-Za-z]+(?![A-Za-z])(?=\s*(?:[A-Za-z{}()]|[_^])))/.test(String(source || ''));
  }

  function findGroupEnd(source, start) {
    let depth = 0;
    for (let index = start; index < source.length; index++) {
      if (source[index] === '\\') {
        index++;
      } else if (source[index] === '%') {
        const newline = source.indexOf('\n', index);
        index = newline < 0 ? source.length : newline;
      } else if (source[index] === '{') {
        depth++;
      } else if (source[index] === '}' && --depth === 0) {
        return index;
      }
    }
    return -1;
  }

  function formatInlineText(source, insideMathEnvironment = false) {
    if (insideMathEnvironment) return escapeHtml(source);
    let output = '';
    let cursor = 0;
    let index = 0;

    while (index < source.length) {
      let opening = null;
      if (source.startsWith('$$', index)) opening = { open: '$$', close: '$$' };
      else if (source[index] === '$') opening = { open: '$', close: '$' };
      else if (source.startsWith('\\[', index)) opening = { open: '\\[', close: '\\]' };
      else if (source.startsWith('\\(', index)) opening = { open: '\\(', close: '\\)' };

      if (opening) {
        let end = index + opening.open.length;
        while (end < source.length && !source.startsWith(opening.close, end)) {
          if (source[end] === '\\') end++;
          end++;
        }
        if (end >= source.length) {
          index += opening.open.length;
          continue;
        }
        end += opening.close.length;
        output += escapeHtml(source.slice(cursor, index));
        output += escapeHtml(source.slice(index, end));
        index = end;
        cursor = end;
        continue;
      }

      if (source[index] !== '\\') {
        index++;
        continue;
      }

      const command = /^\\([A-Za-z]+)(?![A-Za-z])/.exec(source.slice(index));
      if (!command) {
        index += 2;
        continue;
      }
      const format = TEXT_COMMANDS[command[1]];
      if (!format) {
        index += command[0].length;
        continue;
      }

      let groupStart = index + command[0].length;
      while (/\s/.test(source[groupStart] || '') && groupStart < source.length) groupStart++;
      if (source[groupStart] !== '{') {
        index += command[0].length;
        continue;
      }
      const groupEnd = findGroupEnd(source, groupStart);
      if (groupEnd < 0) {
        index += command[0].length;
        continue;
      }

      output += escapeHtml(source.slice(cursor, index));
      const className = format.className ? ` class="${format.className}"` : '';
      output += `<${format.tag}${className}>${formatInlineText(source.slice(groupStart + 1, groupEnd))}</${format.tag}>`;
      index = groupEnd + 1;
      cursor = index;
    }

    return output + escapeHtml(source.slice(cursor));
  }

  function formatLatexText(source) {
    const normalized = normalizeEnvironmentSyntax(source);
    const tokenPattern = /\\(begin|end)\{([A-Za-z][A-Za-z0-9*:_-]*)\}/g;
    const environments = [];
    let output = '';
    let cursor = 0;
    let match;

    while ((match = tokenPattern.exec(normalized))) {
      const inMath = environments.some(environment => environment.math);
      output += formatInlineText(normalized.slice(cursor, match.index), inMath);
      cursor = tokenPattern.lastIndex;
      const command = match[1];
      const name = match[2];

      if (command === 'begin') {
        const recognized = Object.prototype.hasOwnProperty.call(TEXT_ENVIRONMENTS, name);
        let title = '';
        if (recognized && TEXT_ENVIRONMENTS[name]) {
          const optionalTitle = /^\s*\[([^\]]*)\]/.exec(normalized.slice(cursor));
          if (optionalTitle) {
            title = optionalTitle[1].trim();
            cursor += optionalTitle[0].length;
            tokenPattern.lastIndex = cursor;
          }
        }

        environments.push({ name, recognized, math: MATH_ENVIRONMENTS.has(name) });
        if (recognized) {
          output += `<div class="latex-environment latex-environment--${name}">`;
          if (TEXT_ENVIRONMENTS[name]) {
            const label = title ? `${TEXT_ENVIRONMENTS[name]}: ${title}` : TEXT_ENVIRONMENTS[name];
            output += `<strong class="latex-environment__title">${escapeHtml(label)}</strong>`;
          }
        } else {
          output += escapeHtml(match[0]);
        }
        continue;
      }

      let matchingIndex = environments.length - 1;
      while (matchingIndex >= 0 && environments[matchingIndex].name !== name) matchingIndex--;
      if (matchingIndex < 0) {
        output += escapeHtml(match[0]);
        continue;
      }
      for (let index = environments.length - 1; index >= matchingIndex; index--) {
        if (environments[index].recognized) output += '</div>';
      }
      environments.length = matchingIndex;
    }

    output += formatInlineText(normalized.slice(cursor), environments.some(environment => environment.math));
    for (let index = environments.length - 1; index >= 0; index--) {
      if (environments[index].recognized) output += '</div>';
    }
    return output;
  }

  return { formatLatexText, hasLatexSyntax, normalizeEnvironmentSyntax };
});
