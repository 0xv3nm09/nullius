// src/prose.ts — model-written commentary, committed as text. The model is
// never on the critical path: no number may appear here except proposition
// ids (TS-13 enforces this over the snapshot). Rendered with a `prose` badge,
// never mistaken for code output.

import type { Prose } from './types.js';

export const PROSE: Prose[] = [
  {
    id: 'P-thesis',
    kind: 'prose',
    body:
      'This thesis reports against itself on purpose. Several of its own propositions fail the falsifiers written for them before any value was computed, and one source field is recorded as a finding rather than pressed into service as a number. ' +
      'A thesis nobody can argue with is a thesis nobody read; the counter-evidence sits beside the case, not beneath it.',
    model: null,
  },
  {
    id: 'P-audit',
    kind: 'prose',
    body:
      'The audit gate ran on every field this thesis touches, not only on the fields already suspected. ' +
      'Each field had to prove itself non-empty, live, and definitionally continuous before any proposition was allowed to stand on it. ' +
      'The failures documented on this page were found by that gate, not hard-coded into it — a further failure would appear here with no code change. That is the difference between an audit and an anecdote.',
    model: null,
  },
  {
    id: 'P-method',
    kind: 'prose',
    body:
      'Facts belong to code and commentary belongs to prose, and the border between them is enforced by a test rather than by discipline. ' +
      'Every figure on every page is computed from raw captured bytes and linked into a hash chain; the prose you are reading carries no numbers at all, because a model-written number would be a claim with no receipt. ' +
      "Take nobody's word for it — including ours.",
    model: null,
  },
];
