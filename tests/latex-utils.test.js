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
  assert.equal(hasLatexSyntax('\\textbf{negrita}'), true);
  assert.equal(hasLatexSyntax('\\mathbf{v}'), true);
  assert.equal(hasLatexSyntax('C:\\Users\\Juan\\notas.txt'), false);
});

test('escapes HTML while retaining unknown MathJax environments', () => {
  const html = formatLatexText('<script>alert(1)</script> \\begin{aligned}x\\end{aligned}');
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.ok(html.includes('\\begin{aligned}'));
});

test('renders text formatting commands outside math mode', () => {
  const html = formatLatexText('Texto \\textbf{en negrita}, \\textit{en cursiva} y \\underline{subrayado}.');
  assert.ok(html.includes('<strong>en negrita</strong>'));
  assert.ok(html.includes('<em>en cursiva</em>'));
  assert.ok(html.includes('<u>subrayado</u>'));
  assert.ok(formatLatexText('\\textbf{<script>x</script>}').includes('<strong>&lt;script&gt;x&lt;/script&gt;</strong>'));
});

test('supports nested text commands and preserves formulas inside their arguments', () => {
  const html = formatLatexText('\\textbf{Fuerte con \\emph{énfasis} y $x^2$}');
  assert.ok(html.includes('<strong>Fuerte con <em>énfasis</em> y $x^2$</strong>'));
});

test('leaves text macros inside math mode for MathJax', () => {
  const html = formatLatexText('$\\textbf{x}$ and \\(\\textit{y}\\)');
  assert.ok(html.includes('$\\textbf{x}$'));
  assert.ok(html.includes('\\(\\textit{y}\\)'));
  assert.doesNotMatch(html, /<strong>|<em>/);
});

test('continues formatting after an unmatched math delimiter', () => {
  const html = formatLatexText('Fórmula sin cerrar $x + \\textbf{todavía destacado}');
  assert.ok(html.includes('<strong>todavía destacado</strong>'));
});

test('renders text macros inside common MathJax environments without altering math syntax', () => {
  const html = formatLatexText('\\begin{align}\\text{x} &= \\textbf{y}\\end{align}');
  assert.ok(html.includes('\\text{x} &amp;= \\textbf{y}'));
});
