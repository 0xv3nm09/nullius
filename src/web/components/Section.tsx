import type { ReactNode } from 'react';

/** Kicker + display heading — the section pattern every page uses. */
export function Section({
  kicker,
  title,
  accent,
  children,
  id,
}: {
  kicker: string;
  title: ReactNode;
  accent?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section className="section-block" id={id}>
      <p className={`kicker${accent ? ` ${accent}` : ''}`}>{kicker}</p>
      <h2 className="section">{title}</h2>
      {children}
    </section>
  );
}
