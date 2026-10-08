import { useEffect, useState } from 'react';
import { hasMath } from '../lib/quiz';

type Katex = typeof import('katex').default;
let katex: Katex | null = null;
let loading: Promise<Katex> | null = null;

/** Load KaTeX (and its CSS) only when some text actually contains math. */
function loadKatex() {
  loading ??= Promise.all([import('katex'), import('katex/dist/katex.min.css')]).then(([m]) => (katex = m.default));
  return loading;
}

// $$display$$, $inline$ (not "$5 and $10"), \( inline \), \[ display \]
const MATH = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$([^\s$](?:[^$]*?[^\s$])?)\$(?!\d)/g;

function render(text: string, k: Katex) {
  let html = '';
  let last = 0;
  for (const m of text.matchAll(MATH)) {
    html += escape(text.slice(last, m.index));
    const display = m[1] !== undefined || m[2] !== undefined;
    const tex = m[1] ?? m[2] ?? m[3] ?? m[4];
    html += k.renderToString(tex, { displayMode: display, throwOnError: false, strict: 'ignore' });
    last = m.index! + m[0].length;
  }
  return html + escape(text.slice(last));
}

function escape(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');
}

/** Text with $…$ math rendered. Plain text renders instantly; math appears once KaTeX loads. */
export function MathText({ text, as: Tag = 'span', className }: { text: string; as?: 'span' | 'div' | 'p'; className?: string }) {
  const math = hasMath(text);
  const [, setReady] = useState(!!katex);
  useEffect(() => {
    if (math && !katex) void loadKatex().then(() => setReady(true));
  }, [math]);
  if (!math || !katex) return <Tag className={className}>{text}</Tag>;
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: render(text, katex) }} />;
}
