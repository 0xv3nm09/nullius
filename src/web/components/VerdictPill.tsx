import type { Verdict } from '../../types';
import { GLYPHS } from '../lib';

/** Verdict pill — text label + glyph, never colour alone (design system §16). */
export function VerdictPill({ verdict }: { verdict: Verdict }) {
  return (
    <span className="pill" data-verdict={verdict}>
      <span aria-hidden="true">{GLYPHS[verdict]}</span> {verdict}
    </span>
  );
}
