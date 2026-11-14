/** Kind badge — the visible code-vs-model guarantee. Every rendered block
 * carries one: `code` for anything deterministic, `prose` for model text. */
export function KindBadge({ kind }: { kind: 'code' | 'prose' }) {
  return <span className="kind" data-kind={kind}>{kind}</span>;
}
