// Feature switches. NEXT_PUBLIC_ so the client bundle can read them (Next
// inlines the value at build time, so changing one needs a rebuild/redeploy).

/**
 * Ask AI is off unless NEXT_PUBLIC_ASK_AI=on. The client hides the button and
 * its shortcuts, and /api/ask checks the same switch, so turning it off also
 * stops anyone calling the route directly and spending the OpenAI key.
 */
export const ASK_AI_ENABLED = process.env.NEXT_PUBLIC_ASK_AI === 'on';
