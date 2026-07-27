import { NextRequest } from 'next/server';
import { parseSSE } from '@/lib/openaiStream';
import { createRateLimiter } from '@/lib/rateLimit';

export const runtime = 'nodejs';

const MODEL = process.env.OPENAI_MODEL || 'gpt-5-nano';

// Guards a public, unauthenticated endpoint that spends OpenAI credits:
// max 2 requests per minute per IP (best-effort per warm instance).
const rateLimit = createRateLimiter({ limit: 2, windowMs: 60_000 });

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

const SYSTEM_PROMPT = `You are a friendly tutor helping someone who is still learning this topic — pitch it at a curious newcomer, not an expert. Your job is to make the concept genuinely click, not to sound thorough.

Start with a one- or two-sentence plain-English intuition, ideally a concrete everyday analogy (no jargon in the analogy). Then add the depth their saved answer is missing, in simple terms — define any technical term the first time you use it. ALWAYS include at least one concrete, worked example (a short code snippet, a small scenario, or a real-world case) that makes it stick.

Keep it tight and scannable: aim for ~180 words, short bullets, no filler, and don't just restate what they already wrote. Format with GitHub-flavoured markdown. Put code in fenced blocks tagged with the language. For any verbatim monospaced text that isn't a programming language — ASCII diagrams, tables, sample input/output, traces — wrap it in a fenced block tagged \`plaintext\` (\`\`\`plaintext … \`\`\`).`;

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json({ error: 'AI isn’t configured. Add OPENAI_API_KEY to .env.local and restart.' }, 503);
  }

  const rl = rateLimit(clientIp(req));
  if (!rl.ok) {
    return new Response(
      JSON.stringify({ error: `Slow down — max 2 AI requests per minute. Try again in ${rl.retryAfter}s.` }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rl.retryAfter) } },
    );
  }

  let body: { question?: string; answer?: string; domain?: string; tags?: string[] };
  try { body = await req.json(); } catch { return json({ error: 'Send a JSON body.' }, 400); }

  const question = (body.question ?? '').trim();
  const answer = (body.answer ?? '').trim();
  if (!question) return json({ error: 'A question is required.' }, 400);

  // Context lines help the model disambiguate (e.g. "Caching" under System
  // Design vs Backend) and pitch the answer at the right topic.
  const context: string[] = [];
  if (body.domain) context.push(`Domain: ${body.domain}`);
  const tags = (body.tags ?? []).map((t) => t.trim()).filter(Boolean);
  if (tags.length) context.push(`Topic: ${tags.join(' › ')}`);
  const contextBlock = context.length ? `${context.join('\n')}\n\n` : '';

  const userContent = answer
    ? `${contextBlock}Question: ${question}\n\nMy saved answer:\n${answer}`
    : `${contextBlock}Question: ${question}\n\n(No saved answer yet — give a concise primer with a worked example.)`;

  let upstream: Response;
  try {
    upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
      }),
    });
  } catch {
    return json({ error: 'Couldn’t reach the AI service. Try again.' }, 502);
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '');
    return json({ error: 'The AI request failed.', detail: detail.slice(0, 500) }, 502);
  }

  // Re-stream OpenAI's SSE frames to the client as a plain UTF-8 token stream.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buffer = '';
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const { deltas, rest, done: finished } = parseSSE(buffer);
          buffer = rest;
          for (const d of deltas) controller.enqueue(encoder.encode(d));
          if (finished) break;
        }
      } catch (e) {
        controller.error(e);
        return;
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
