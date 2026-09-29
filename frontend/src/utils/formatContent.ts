import katex from 'katex';
import { marked } from 'marked';

// Configure marked with GFM tables and breaks
marked.setOptions({
  gfm: true,
  breaks: false,
});

/**
 * Renders mathematical expressions using KaTeX with Unicode fallback.
 */
export function renderMath(expr: string, isDisplay: boolean): string {
  const trimmed = (expr || '').trim();
  if (!trimmed) return '';

  try {
    return katex.renderToString(trimmed, {
      displayMode: isDisplay,
      throwOnError: false,
    });
  } catch {
    // Unicode Fallback
    let out = trimmed;
    const greek: Record<string, string> = {
      '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ', '\\epsilon': 'ε',
      '\\zeta': 'ζ', '\\eta': 'η', '\\theta': 'θ', '\\iota': 'ι', '\\kappa': 'κ',
      '\\lambda': 'λ', '\\mu': 'μ', '\\nu': 'ν', '\\xi': 'ξ', '\\pi': 'π',
      '\\rho': 'ρ', '\\sigma': 'σ', '\\tau': 'τ', '\\upsilon': 'υ', '\\phi': 'φ',
      '\\chi': 'χ', '\\psi': 'ψ', '\\omega': 'ω',
      '\\Gamma': 'Γ', '\\Delta': 'Δ', '\\Theta': 'Θ', '\\Lambda': 'Λ', '\\Xi': 'Ξ',
      '\\Pi': 'Π', '\\Sigma': 'Σ', '\\Phi': 'Φ', '\\Psi': 'Ψ', '\\Omega': 'Ω',
    };
    Object.keys(greek).forEach((k) => {
      out = out.split(k).join(greek[k]);
    });

    const ops: Record<string, string> = {
      '\\ge': '≥', '\\geq': '≥', '>=': '≥',
      '\\le': '≤', '\\leq': '≤', '<=': '≤',
      '\\neq': '≠', '!=': '≠',
      '\\approx': '≈', '\\equiv': '≡',
      '\\times': '×', '\\cdot': '·', '\\pm': '±',
      '\\to': '→', '\\rightarrow': '→', '\\Rightarrow': '⇒',
      '\\in': '∈', '\\notin': '∉',
      '\\infty': '∞',
      '\\sum': '∑', '\\prod': '∏', '\\int': '∫', '\\partial': '∂',
    };
    Object.keys(ops).forEach((k) => {
      out = out.split(k).join(ops[k]);
    });

    out = out.replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '<span class="math-frac"><span class="math-num">$1</span><span class="math-den">$2</span></span>');
    out = out.replace(/_\{([^{}]+)\}/g, '<sub>$1</sub>');
    out = out.replace(/_([a-zA-Z0-9]+)/g, '<sub>$1</sub>');
    out = out.replace(/\^\{([^{}]+)\}/g, '<sup>$1</sup>');
    out = out.replace(/\^([a-zA-Z0-9]+)/g, '<sup>$1</sup>');
    out = out.replace(/\\text\s*\{([^{}]+)\}/g, '$1');

    return isDisplay
      ? `<div class="math-block">${out}</div>`
      : `<span class="math-inline">${out}</span>`;
  }
}

/**
 * Normalizes headings and title cases.
 */
export function normalizeHeadings(rawText: string): string {
  if (!rawText) return '';
  const lines = rawText.split('\n');
  const sectionPattern = /^(\s*)(Answer|Key\s*points?|Key\s*findings?|Key\s*take[\-\s]*aways?|Executive\s*summary|Summary|Remaining\s*uncertainties|Unresolved\s*questions?|Architectural\s*trade[\-\s]*offs?|Trade[\-\s]*offs?|Technical\s*analysis|Analysis|Methodology|Recommendations?|Conclusion|Sources?)\s*:?\s*$/i;

  const processed = lines.map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    if (/^#{1,6}\s+/.test(trimmed)) {
      return line;
    }

    const match = trimmed.match(sectionPattern);
    if (match) {
      const title = match[2].trim();
      const cleanTitle = title.replace(/\b\w/g, (c) => c.toUpperCase());
      return `### ${cleanTitle}`;
    }

    const numberedHeaderMatch = trimmed.match(/^(\d+\.)\s+([A-Z][A-Za-z0-9\s—–\/\-]{2,50})$/);
    if (numberedHeaderMatch) {
      return `### ${numberedHeaderMatch[1]} ${numberedHeaderMatch[2].trim()}`;
    }

    const shortColonMatch = trimmed.match(/^([A-Z][A-Za-z0-9\s—–\/\-]{2,40}):\s*$/);
    if (shortColonMatch && !shortColonMatch[1].includes('http')) {
      return `### ${shortColonMatch[1].trim()}`;
    }

    const boldHeadingMatch = trimmed.match(/^\*\*([A-Za-z0-9\s—–\/\-]+?):?\*\*\s*$/);
    if (boldHeadingMatch && boldHeadingMatch[1].length < 45) {
      return `### ${boldHeadingMatch[1].trim()}`;
    }

    if (idx === 0 && trimmed.length < 75 && !/[.!?]$/.test(trimmed) && /^[A-Z]/.test(trimmed)) {
      return `### ${trimmed}`;
    }

    return line;
  });

  return processed.join('\n');
}

/**
 * Master HTML Formatter with Math, Markdown Tables, and Typography.
 */
export function formatContent(raw: string): string {
  if (!raw) return '';

  let text = String(raw);

  // Pre-process LaTeX quirks
  text = text.replace(/\\bigl\(/g, '(').replace(/\\bigr\)/g, ')');
  text = text.replace(/\\Bigl\(/g, '(').replace(/\\Bigr\)/g, ')');
  text = text.replace(/\\\[([\s\S]+?)\\\]/g, '\n\n$$$$$1$$$$\n\n');
  text = text.replace(/\\\(([\s\S]+?)\\\)/g, '$$$1$');
  text = text.replace(/^[ \t]*>[ \t]*(\$\$|\\\[|\[)/gm, '$1');

  text = text.replace(/;\s*([=+\-*\/<>]|\\ge|\\le)\s*;/g, ' $1 ');
  text = text.replace(/;\s*\\/g, ' \\');

  // Bracketed equations: [ C_i = \alpha ... ]
  text = text.replace(/^[ \t]*\[\s*([\s\S]*?(?:\\(?:alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|sigma|tau|phi|omega|Delta|Theta|Sigma|ge|geq|le|leq|neq|approx|times|sum|int|infty|frac|text|sqrt)|[A-Za-z0-9]_[A-Za-z0-9\{])[^\]\n]*?)\s*\][ \t]*$/gm, (_, math) => {
    const cleanMath = math.replace(/\s+\.\s*$/, '').replace(/^[><\s]+|[><\s]+$/g, '').trim();
    return `\n\n$$${cleanMath}$$\n\n`;
  });

  // Parenthesized math
  text = text.replace(/\(\s*(\\theta[A-Za-z0-9_\{\}\\\s]*|\\alpha|\\beta|\\gamma|\\Delta|\\tau|\\sigma|C_i)\s*\)/g, (_, math) => {
    return `$${math.trim()}$`;
  });

  text = normalizeHeadings(text);

  // Math token extraction
  const mathTokens: string[] = [];

  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) => {
    const idx = mathTokens.length;
    const cleanExpr = expr.replace(/^[><\s]+|[><\s]+$/g, '').trim();
    mathTokens.push(renderMath(cleanExpr, true));
    return `%%CTMARS_MATH_BLOCK_${idx}%%`;
  });

  text = text.replace(/(^|[^\\])\$([^\$\n]+?)\$/g, (m, prefix, expr) => {
    if (/^\s*\d+[\d,.]*\s*$/.test(expr)) return m;
    const idx = mathTokens.length;
    mathTokens.push(renderMath(expr, false));
    return `${prefix}%%CTMARS_MATH_INLINE_${idx}%%`;
  });

  // Typography
  text = text.replace(/(\s)---(\s)/g, '$1—$2').replace(/(\s)--(\s)/g, '$1–$2');
  text = text.replace(/(\s)->(\s)/g, '$1→$2').replace(/(\s)=>(\s)/g, '$1⇒$2');

  // Parse Markdown with marked
  let parsedHtml = '';
  try {
    parsedHtml = marked.parse(text) as string;
  } catch (err) {
    console.warn('Marked parse error:', err);
    parsedHtml = text;
  }

  // Restore Math Tokens
  mathTokens.forEach((tokenHtml, idx) => {
    parsedHtml = parsedHtml.split(`%%CTMARS_MATH_BLOCK_${idx}%%`).join(tokenHtml);
    parsedHtml = parsedHtml.split(`%%CTMARS_MATH_INLINE_${idx}%%`).join(tokenHtml);
  });

  // Clean bare LaTeX residual tokens in body
  parsedHtml = parsedHtml
    .replace(/\\theta(?:_\{([^{}]+)\}|_([a-zA-Z0-9]+))?/g, (_, sub1, sub2) => {
      const s = sub1 || sub2;
      return s ? `θ<sub>${s}</sub>` : `θ`;
    })
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\gamma/g, 'γ')
    .replace(/\\Delta/g, 'Δ')
    .replace(/\\tau/g, 'τ')
    .replace(/\\sigma/g, 'σ')
    .replace(/\\mu/g, 'μ')
    .replace(/\\ge(?:q)?\b/g, '≥')
    .replace(/\\le(?:q)?\b/g, '≤')
    .replace(/\\approx/g, '≈')
    .replace(/\\neq/g, '≠')
    .replace(/\\times/g, '×')
    .replace(/\\pm/g, '±')
    .replace(/\\cdot/g, '·')
    .replace(/\\to\b/g, '→')
    .replace(/\\infty/g, '∞')
    .replace(/\\text\{([^{}]+)\}/g, '$1');

  // External links
  parsedHtml = parsedHtml.replace(/<a\s+(?!.*?target=)/gi, '<a target="_blank" rel="noopener noreferrer" ');

  // Responsive table wrapper
  parsedHtml = parsedHtml.replace(/(?<!<div class="table-wrap">)(<table[\s\S]*?<\/table>)/gi, (match) => {
    return `<div class="table-wrap">${match}</div>`;
  });

  return parsedHtml;
}
