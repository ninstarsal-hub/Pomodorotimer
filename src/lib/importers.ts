/**
 * Extract plain text from uploaded study material, entirely in the browser.
 * Heavy parsers are loaded on demand so they don't slow down the first page load.
 */

export const ACCEPTED_FILES = '.pdf,.docx,.pptx,.txt,.md,.markdown,.csv,.rtf,.html,.htm,application/pdf,text/plain,text/markdown';

export class ImportError extends Error {}

export async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const ext = name.slice(name.lastIndexOf('.') + 1);
  let text: string;
  if (ext === 'pdf' || file.type === 'application/pdf') text = await fromPdf(file);
  else if (ext === 'docx') text = await fromDocx(file);
  else if (ext === 'pptx') text = await fromPptx(file);
  else if (ext === 'html' || ext === 'htm') text = fromHtml(await file.text());
  else if (ext === 'rtf') text = fromRtf(await file.text());
  else if (ext === 'doc' || ext === 'ppt') throw new ImportError('Old .doc/.ppt files aren’t supported — save as .docx/.pptx or PDF first.');
  else text = await file.text();
  return tidy(text);
}

export function titleFromFile(file: File) {
  return file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Imported notes';
}

function tidy(text: string) {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function fromPdf(file: File) {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  let doc;
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  } catch (e) {
    if (e instanceof Error && e.name === 'PasswordException') throw new ImportError('This PDF is password-protected.');
    throw new ImportError('Couldn’t read this PDF.');
  }
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let line = '';
    const lines: string[] = [];
    for (const item of content.items) {
      if (!('str' in item)) continue;
      line += item.str;
      if (item.hasEOL) {
        lines.push(line);
        line = '';
      }
    }
    if (line) lines.push(line);
    pages.push(lines.join('\n'));
  }
  const text = pages.join('\n\n');
  if (text.replace(/\s/g, '').length < 20 * Math.max(1, doc.numPages / 4)) {
    throw new ImportError('This PDF looks like scanned images with no selectable text. Try exporting it with OCR (e.g. “Recognize text” in Preview/Acrobat) or copy the text in.');
  }
  return text;
}

async function fromDocx(file: File) {
  const mammoth = await import('mammoth/mammoth.browser');
  const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return value;
}

async function fromPptx(file: File) {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slideNum = (p: string) => Number(p.match(/(\d+)\.xml$/)?.[1] ?? 0);
  const slides = Object.keys(zip.files)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
    .sort((a, b) => slideNum(a) - slideNum(b));
  const parser = new DOMParser();
  const out: string[] = [];
  for (const path of slides) {
    const xml = parser.parseFromString(await zip.files[path].async('string'), 'application/xml');
    const paras = [...xml.getElementsByTagName('a:p')]
      .map((p) => [...p.getElementsByTagName('a:t')].map((t) => t.textContent ?? '').join(''))
      .filter((t) => t.trim());
    // Speaker notes often hold the actual explanations.
    const notesPath = `ppt/notesSlides/notesSlide${slideNum(path)}.xml`;
    if (zip.files[notesPath]) {
      const nx = parser.parseFromString(await zip.files[notesPath].async('string'), 'application/xml');
      const notes = [...nx.getElementsByTagName('a:t')].map((t) => t.textContent ?? '').join(' ').trim();
      if (notes && !/^\d+$/.test(notes)) paras.push(notes);
    }
    if (paras.length) out.push(`### ${paras[0]}\n${paras.slice(1).join('\n')}`);
  }
  return out.join('\n\n');
}

function fromHtml(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,style,nav,footer').forEach((n) => n.remove());
  return doc.body.innerText || doc.body.textContent || '';
}

function fromRtf(rtf: string) {
  return rtf
    .replace(/\\par[d]?/g, '\n')
    .replace(/\{\\\*[^}]*\}/g, '')
    .replace(/\\[a-z]+-?\d* ?/gi, '')
    .replace(/[{}]/g, '');
}
