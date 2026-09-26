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

  function formatLatexText(source) {
    const normalized = normalizeEnvironmentSyntax(source);
    const tokenPattern = /\\(begin|end)\{([A-Za-z][A-Za-z0-9*:_-]*)\}/g;
    const environments = [];
    let output = '';
    let cursor = 0;
    let match;

    while ((match = tokenPattern.exec(normalized))) {
      output += escapeHtml(normalized.slice(cursor, match.index));
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

        environments.push({ name, recognized });
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

    output += escapeHtml(normalized.slice(cursor));
    for (let index = environments.length - 1; index >= 0; index--) {
      if (environments[index].recognized) output += '</div>';
    }
    return output;
  }

  return { formatLatexText, hasLatexSyntax, normalizeEnvironmentSyntax };
});
