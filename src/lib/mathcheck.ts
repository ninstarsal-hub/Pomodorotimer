/**
 * Math-aware answer checking: treats 1/2, 0.5 and 50% as the same number, and
 * 2x+1, 1+2x and 2(x+0.5) as the same expression (by evaluating both at a few
 * random points). Handles plain-text and simple LaTeX input.
 */

type Node = (vars: Record<string, number>) => number;

const FUNCS: Record<string, (x: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  arcsin: Math.asin,
  arccos: Math.acos,
  arctan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  sqrt: Math.sqrt,
  abs: Math.abs,
  ln: Math.log,
  log: Math.log10,
  exp: Math.exp,
};
const CONSTS: Record<string, number> = { pi: Math.PI, π: Math.PI, e: Math.E };

/** Convert common LaTeX and unicode into the plain syntax the parser understands. */
export function delatex(s: string): string {
  let t = s.trim().replace(/^\$+|\$+$/g, '').replace(/^\\\(|\\\)$/g, '');
  // Unwrap innermost groups first so nesting works: \frac{-b+\sqrt{x^{2}}}{2a}
  for (let i = 0; i < 12; i++) {
    const before = t;
    t = t
      .replace(/\\sqrt\s*\[([^\]]+)\]\s*\{([^{}]*)\}/g, '(($2)^(1/($1)))')
      .replace(/\\sqrt\s*\{([^{}]*)\}/g, 'sqrt($1)')
      .replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '(($1)/($2))')
      .replace(/\^\s*\{([^{}]*)\}/g, '^($1)')
      .replace(/_\s*\{([^{}]*)\}/g, '');
    if (t === before) break;
  }
  t = t
    .replace(/\\left|\\right/g, '')
    .replace(/\\cdot|\\times|·|×/g, '*')
    .replace(/\\div|÷/g, '/')
    .replace(/\\pi/g, 'pi')
    .replace(/\\(sin|cos|tan|ln|log|exp|arcsin|arccos|arctan|sinh|cosh|tanh)/g, '$1')
    .replace(/\\,|\\;|\\!|\\ /g, '')
    .replace(/[{]/g, '(')
    .replace(/[}]/g, ')')
    .replace(/√\s*\(/g, 'sqrt(')
    .replace(/√\s*([\d.a-z]+)/gi, 'sqrt($1)')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/−|–/g, '-')
    .replace(/\*\*/g, '^');
  return t;
}

/** Parse an expression into an evaluator, or null if it isn't valid math. */
export function parseExpr(input: string): { fn: Node; vars: Set<string> } | null {
  const s = delatex(input).replace(/\s+/g, '');
  if (!s || /[^0-9a-zA-Zπ.+\-*/^()%!,]/.test(s)) return null;
  // Words aren't math: every run of 3+ letters must be a function name (optionally followed by one variable).
  const known = new RegExp(`(${Object.keys(FUNCS).sort((a, b) => b.length - a.length).join('|')}|pi)`, 'g');
  for (const run of s.match(/[a-zA-Z]{3,}/g) ?? []) if (run.replace(known, '|').split('|').some((piece) => piece.length > 2)) return null;
  let i = 0;
  const vars = new Set<string>();
  const peek = () => s[i];

  function expr(): Node {
    let left = term();
    while (peek() === '+' || peek() === '-') {
      const op = s[i++];
      const right = term();
      const l = left;
      left = op === '+' ? (v) => l(v) + right(v) : (v) => l(v) - right(v);
    }
    return left;
  }
  function term(): Node {
    let left = unary();
    for (;;) {
      const c = peek();
      if (c === '*' || c === '/') {
        i++;
        const right = unary();
        const l = left;
        left = c === '*' ? (v) => l(v) * right(v) : (v) => l(v) / right(v);
      } else if (c && /[0-9a-zA-Zπ.(]/.test(c)) {
        // implicit multiplication: 2x, 3(x+1), (a)(b), x y
        const right = unary();
        const l = left;
        left = (v) => l(v) * right(v);
      } else return left;
    }
  }
  function unary(): Node {
    if (peek() === '-') {
      i++;
      const u = unary();
      return (v) => -u(v);
    }
    if (peek() === '+') {
      i++;
      return unary();
    }
    return power();
  }
  function power(): Node {
    const base = postfix();
    if (peek() === '^') {
      i++;
      const ex = unary(); // right-associative, allows 2^-1
      return (v) => Math.pow(base(v), ex(v));
    }
    return base;
  }
  function postfix(): Node {
    let a = atom();
    while (peek() === '%' || peek() === '!') {
      const op = s[i++];
      const inner = a;
      a = op === '%' ? (v) => inner(v) / 100 : (v) => factorial(inner(v));
    }
    return a;
  }
  function atom(): Node {
    const c = peek();
    if (c === '(') {
      i++;
      const e = expr();
      if (peek() !== ')') throw new Error('paren');
      i++;
      return e;
    }
    const num = s.slice(i).match(/^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i);
    if (num && !/^\d+e[a-z]/i.test(s.slice(i))) {
      i += num[0].length;
      const n = Number(num[0]);
      return () => n;
    }
    const word = s.slice(i).match(/^[a-zA-Zπ]+/);
    if (word) {
      const w = word[0];
      // longest function name first, e.g. "sinx" → sin(x)
      const fname = Object.keys(FUNCS)
        .sort((a, b) => b.length - a.length)
        .find((f) => w.startsWith(f));
      if (fname) {
        i += fname.length;
        const arg = peek() === '(' ? atom() : power();
        const f = FUNCS[fname];
        return (v) => f(arg(v));
      }
      if (w.startsWith('pi')) {
        i += 2;
        return () => Math.PI;
      }
      // single-letter symbols: constants π, e, otherwise variables
      i += 1;
      const ch = w[0];
      if (ch === 'π') return () => Math.PI;
      if (ch === 'e' && !vars.has('e')) return () => CONSTS.e;
      vars.add(ch);
      return (v) => v[ch];
    }
    throw new Error('unexpected');
  }

  try {
    const fn = expr();
    if (i !== s.length) return null;
    return { fn, vars };
  } catch {
    return null;
  }
}

function factorial(n: number) {
  if (n < 0 || n > 170 || !Number.isInteger(n)) return NaN;
  let r = 1;
  for (let k = 2; k <= n; k++) r *= k;
  return r;
}

/** Strip "x =" / "y=" prefixes and units-free trailing text like "units". */
function stripLhs(s: string) {
  return s
    .trim()
    .replace(/^\$+|\$+$/g, '')
    .replace(/^\s*[a-zA-Z]\s*=\s*/, '')
    .trim();
}

/** Decimal places the student wrote, to accept rounded answers (e.g. 3.14 for π). */
function decimals(s: string) {
  const m = s.match(/\.(\d+)/);
  return m ? m[1].length : null;
}

/**
 * Compare two math answers. Returns true/false when both sides are valid math,
 * or null when either side isn't math (so the caller falls back to text matching).
 */
export function mathEqual(given: string, expected: string): boolean | null {
  // "a ± b" means two answers: a + b and a − b.
  const pm = /±|\\pm\b|\+\/-/;
  if (pm.test(given) || pm.test(expected)) {
    const expand = (t: string) => (pm.test(t) ? [t.replace(pm, '+'), t.replace(pm, '-')] : [t]);
    return mathEqual(expand(stripLhs(given)).join(', '), expand(stripLhs(expected)).join(', '));
  }
  // Multiple answers ("x = 2 or x = -3", "2, -3"): compare as unordered sets.
  const split = (t: string) =>
    t
      .split(/\s*(?:,|;|\bor\b|\band\b)\s*/i)
      .map(stripLhs)
      .filter(Boolean);
  const gs = split(given);
  const es = split(expected);
  if (gs.length > 1 || es.length > 1) {
    if (gs.length !== es.length) return es.every((e) => parseExpr(e)) ? false : null;
    const used = new Set<number>();
    for (const e of es) {
      const j = gs.findIndex((g, k) => !used.has(k) && mathEqual(g, e) === true);
      if (j < 0) return es.every((x) => parseExpr(x)) ? false : null;
      used.add(j);
    }
    return true;
  }

  const g = parseExpr(stripLhs(given));
  const e = parseExpr(stripLhs(expected));
  if (!g || !e) return null;
  const vars = [...new Set([...g.vars, ...e.vars])];
  // Letters only on the student's side are probably units ("10 m/s") — let text matching decide.
  // (Unless the student's expression doesn't actually depend on them, e.g. sin²x + cos²x = 1.)
  if ([...g.vars].some((v) => !e.vars.has(v))) {
    const at = () => g.fn(Object.fromEntries(vars.map((v) => [v, 0.3 + Math.random() * 2])));
    const a = at();
    const b = at();
    if (!(Number.isFinite(a) && Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a)))) return null;
  }

  if (!vars.length) {
    const a = g.fn({});
    const b = e.fn({});
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    // Rounded decimals (either side, at least 2 places) count if they match to that precision.
    const ds = [decimals(given), decimals(expected)].filter((d): d is number => d !== null && d >= 2);
    const tol = ds.length ? 0.5 * 10 ** -Math.min(...ds) + 1e-12 : Math.max(1e-9, Math.abs(b) * 1e-9);
    return Math.abs(a - b) <= tol;
  }

  // Expressions: equal if they agree at several random points.
  let checked = 0;
  for (let k = 0; k < 12 && checked < 6; k++) {
    const point = Object.fromEntries(vars.map((v) => [v, 0.3 + Math.random() * 2.7 * (Math.random() < 0.5 ? -1 : 1)]));
    const a = g.fn(point);
    const b = e.fn(point);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    checked++;
    if (Math.abs(a - b) > 1e-6 * Math.max(1, Math.abs(b))) return false;
  }
  return checked ? true : null;
}

/** True if the text looks like a math answer rather than words. */
export function looksMathy(s: string) {
  const t = stripLhs(s);
  return /\$|\\[a-z]+|[=^√π]|\d/.test(t) && !/[a-z]{4,}/i.test(delatex(t).replace(/sqrt|sin|cos|tan|log|exp|pi|abs|asin|acos|atan/gi, ''));
}
