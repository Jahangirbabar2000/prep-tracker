// Pure parser for an OpenAI (chat.completions) server-sent-events stream.
// Given whatever text has accumulated so far, it returns the complete content
// deltas found, the leftover partial line to carry into the next chunk, and
// whether the terminal [DONE] sentinel was seen. Kept pure so it can be
// unit-tested without a live stream.
export function parseSSE(buffer: string): { deltas: string[]; rest: string; done: boolean } {
  const lines = buffer.split('\n');
  const rest = lines.pop() ?? ''; // last item may be an incomplete line
  const deltas: string[] = [];
  let done = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;
    const data = trimmed.slice(5).trim();
    if (data === '[DONE]') { done = true; continue; }
    try {
      const json = JSON.parse(data);
      const delta = json?.choices?.[0]?.delta?.content;
      if (typeof delta === 'string' && delta) deltas.push(delta);
    } catch {
      // Ignore an unparseable line — it's almost always a partial JSON payload
      // that will complete in a later chunk (we only split on newlines here).
    }
  }

  return { deltas, rest, done };
}
