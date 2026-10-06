import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

/**
 * POST /api/generate-cards
 * Body: { title?: string, subject?: string, notes: string }
 * Returns: { cards: { type, question, answer, topic, fromNotes }[] }
 *
 * Requires ANTHROPIC_API_KEY in the Vercel project's environment variables.
 * If STILLPOINT_ACCESS_CODE is set, callers must send it in the
 * `x-access-code` header so strangers can't spend your API credits.
 */

const MAX_CHARS = 150_000;

const CardSchema = z.object({
  type: z.enum(['qa', 'cloze', 'explain']),
  question: z.string(),
  answer: z.string(),
  topic: z.string(),
  fromNotes: z.boolean(),
});

const ResultSchema = z.object({ cards: z.array(CardSchema) });

const SYSTEM = `You write retrieval-practice questions for a student's study app. The student pastes lecture notes, study guides or textbook excerpts; you turn them into questions that test whether they actually know the material.

What makes a good question:
- It tests a fact, definition, relationship, cause/effect, process step, comparison, or application from the material — the kind of thing that shows up on a quiz or exam.
- It can be answered from memory in a few seconds to a minute. Answers are short: a word, a phrase, or one to two sentences ("explain" answers can be up to three sentences).
- It stands alone: never say "according to the notes", "in this section", or refer to page numbers.
- Mix formats: mostly "qa" (short-answer, exam style), some "cloze" (a statement with the key term replaced by "_____"; the answer is only the missing term), and a few "explain" (explain/compare/why questions for the big ideas).
- Cover all the main topics proportionally rather than many questions on one sentence. Skip trivia nobody would be tested on.

What to skip entirely — these teach nothing:
- Instructions, assignments and logistics: "Read chapter 4", "Complete the worksheet", "Review pages 10–20", due dates, grading info, reminders, links.
- Headings or fragments with no content behind them.

When a study guide only names a topic or reading without the content (for example "Read chapter 4: the causes of World War I" or "Know the stages of mitosis"), write questions on that named topic from standard textbook knowledge at the level the material implies, and set fromNotes to false for those. Set fromNotes to true when the answer comes from the provided text.

"topic" is a 1–4 word label for what the question covers.
Aim for roughly one question per key idea: about 8–15 for short notes and up to 50 for long material. If the material contains nothing testable at all, return an empty list.`;

function json(status: number, body: unknown) {
  return Response.json(body, { status });
}

export async function POST(request: Request) {
  const accessCode = process.env.STILLPOINT_ACCESS_CODE;
  if (accessCode && request.headers.get('x-access-code') !== accessCode) {
    return json(401, { error: 'Access code required. Enter it in Settings → AI questions.' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return json(503, { error: 'AI is not set up yet: add ANTHROPIC_API_KEY to the Vercel project environment variables and redeploy.' });
  }

  let body: { title?: unknown; subject?: unknown; notes?: unknown };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Invalid JSON body.' });
  }
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  if (!notes) return json(400, { error: 'These notes are empty.' });
  if (notes.length > MAX_CHARS) {
    return json(413, { error: `These notes are too long for one pass (${notes.length.toLocaleString()} characters, limit ${MAX_CHARS.toLocaleString()}). Split them into a few smaller sets of notes.` });
  }
  const title = typeof body.title === 'string' ? body.title.slice(0, 200) : '';
  const subject = typeof body.subject === 'string' ? body.subject.slice(0, 100) : '';

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: betaZodOutputFormat(ResultSchema) },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `${subject ? `Subject: ${subject}\n` : ''}${title ? `Title: ${title}\n` : ''}\n<material>\n${notes}\n</material>`,
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      return json(422, { error: 'The AI declined to generate questions for this material.' });
    }
    if (response.stop_reason === 'max_tokens') {
      return json(413, { error: 'These notes produced too many questions in one go. Split them into smaller sets of notes.' });
    }
    const parsed = response.parsed_output;
    if (!parsed) return json(502, { error: 'The AI response could not be read. Please try again.' });
    return json(200, { cards: parsed.cards });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) return json(503, { error: 'The ANTHROPIC_API_KEY on the server is invalid.' });
    if (error instanceof Anthropic.RateLimitError) return json(429, { error: 'The AI is busy (rate limited). Try again in a minute.' });
    if (error instanceof Anthropic.APIError) return json(502, { error: `AI request failed (${error.status ?? 'network'}). Please try again.` });
    throw error;
  }
}
