// The study loop in three steps — told on the first-run screen and the
// landing page from this one list, so the two can't drift apart.
export const LOOP_STEPS = [
  ['Add a card', 'A problem you solved, or a question you want to remember with its answer.'],
  ['Review it tomorrow', 'Reveal the answer, then grade yourself honestly: Got it, or Struggled.'],
  ['Watch the gaps grow', 'Each “Got it” pushes the next review further out (1, 3, 7, 14, 30, then 60 days); a struggle brings it back sooner.'],
] as const;
