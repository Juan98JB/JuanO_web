const test = require('node:test');
const assert = require('node:assert/strict');
const { formatLatexText, hasLatexSyntax, normalizeEnvironmentSyntax } = require('../latex-utils.js');

test('normalizes missing and spaced environment braces', () => {
  assert.equal(
    normalizeEnvironmentSyntax('\\begin center}x\\end center}'),
    '\\begin{center}x\\end{center}'
  );
  assert.equal(
    normalizeEnvironmentSyntax('\\begin { aligned }x\\end{aligned'),
    '\\begin{aligned}x\\end{aligned}'
  );
});

test('renders common text environments and preserves math delimiters', () => {
  const html = formatLatexText('\\begin center}\\[x^2\\]\\end center}');
  assert.match(html, /class="latex-environment latex-environment--center"/);
  assert.ok(html.includes('\\[x^2\\]'));
  assert.match(html, /<\/div>$/);
});

test('renders theorem and proof labels, including optional theorem titles', () => {
  const html = formatLatexText('\\begin{theorem}[Schur]Sea $A$\\end{theorem} \\begin{proof}Fin.\\end{proof}');
  assert.match(html, /Teorema: Schur/);
  assert.match(html, /latex-environment--proof/);
  assert.match(html, /Demostración/);
  assert.match(html, /Sea \$A\$/);
});

test('supports nested text environments and closes malformed wrappers', () => {
  const html = formatLatexText('\\begin{theorem}A \\begin{center}B\\end{center} C');
  assert.equal((html.match(/<div class="latex-environment/g) || []).length, 2);
  assert.equal((html.match(/<\/div>/g) || []).length, 2);
});

test('distinguishes unmarked prose from common LaTeX syntax', () => {
  assert.equal(hasLatexSyntax('Una explicación en texto normal.'), false);
  assert.equal(hasLatexSyntax('\\begin center}x\\end center}'), true);
  assert.equal(hasLatexSyntax('\\frac{1}{2}'), true);
  assert.equal(hasLatexSyntax('\\mathbf{v}'), true);
  assert.equal(hasLatexSyntax('C:\\Users\\Juan\\notas.txt'), false);
});

test('escapes HTML while retaining unknown MathJax environments', () => {
  const html = formatLatexText('<script>alert(1)</script> \\begin{aligned}x\\end{aligned}');
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.ok(html.includes('\\begin{aligned}'));
});
