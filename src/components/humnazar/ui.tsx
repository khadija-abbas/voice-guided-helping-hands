import type { ReactNode } from "react";

// Icon paths copied from the approved high-fidelity frames, plus back, pause and bell.
const P = {
  sp: "M11 5L6 9H2v6h4l5 4V5z M15.5 8.5a5 5 0 010 7 M19 5a10 10 0 010 14",
  ck: "M5 12l5 5 9-10",
  al: "M12 3L2 21h20z M12 10v5 M12 18h.01",
  in: "M12 11v6 M12 7h.01 M12 3a9 9 0 100 18 9 9 0 000-18",
  cm: "M3 8h4l2-3h6l2 3h4v12H3z M12 11a3.5 3.5 0 100 7 3.5 3.5 0 000-7",
  mc: "M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3z M6 11a6 6 0 0012 0 M12 17v4",
  pl: "M8 5l11 7-11 7z",
  pa: "M8 5v14 M16 5v14",
  ey: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 9a3 3 0 100 6 3 3 0 000-6",
  ph: "M5 4h4l2 5-2.500 1.500a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z",
  cl: "M12 3a9 9 0 100 18 9 9 0 000-18 M12 7v5l3 2",
  x: "M6 6l12 12 M18 6L6 18",
  st: "M7 7h10v10H7z",
  bk: "M15 5l-7 7 7 7",
  bl: "M6 16V11a6 6 0 0112 0v5l2 2H4z M10 21h4",
} as const;
export type IconName = keyof typeof P;

export function Icon({ n, s = 24, className }: { n: IconName; s?: number | undefined; className?: string | undefined }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={P[n]} />
    </svg>
  );
}

type BtnKind = "p" | "s" | "pr";
export function Btn({ kind = "p", children, onClick, disabled, large, busy, label }: { kind?: BtnKind | undefined; children: ReactNode; onClick?: (() => void) | undefined; disabled?: boolean | undefined; large?: boolean | undefined; busy?: boolean | undefined; label?: string | undefined }) {
  return (
    <button type="button" className={`hz-bt hz-${kind}${large ? " hz-bl" : ""}${busy ? " is-busy" : ""}`} onClick={onClick} disabled={disabled || busy} aria-busy={busy || undefined} aria-label={label}>
      {children}
    </button>
  );
}

export function HelpType({ icon, children, onClick, last, lastLabel }: { icon: IconName; children: ReactNode; onClick: () => void; last?: boolean | undefined; lastLabel: string }) {
  return (
    <button type="button" className={`hz-bt hz-ht${last ? " hz-pd" : ""}`} onClick={onClick}>
      <span className="ic"><Icon n={icon} s={28} /></span>
      <span>
        {children}
        {last && (
          <span className="last"><Icon n="ck" s={20} />{lastLabel}</span>
        )}
      </span>
    </button>
  );
}

export function Notice({ v, icon, title, children }: { v: "i" | "ok" | "e" | "n"; icon: IconName; title?: string | undefined; children?: ReactNode | undefined }) {
  return (
    <div className={`hz-bn hz-bn-${v}`} role={v === "e" ? "alert" : undefined}>
      <Icon n={icon} />
      <div>{title && <b>{title}</b>} {children}</div>
    </div>
  );
}

export function Chip({ on, disabled, children, onClick, note }: { on?: boolean | undefined; disabled?: boolean | undefined; children: ReactNode; onClick: () => void; note?: string | undefined }) {
  return (
    <button type="button" role="radio" aria-checked={!!on} className={`hz-ch${on ? " on" : ""}`} disabled={disabled} onClick={onClick}>
      {on && <Icon n="ck" s={20} />}
      {disabled && <Icon n="x" s={20} />}
      {children}
      {note && <small>· {note}</small>}
    </button>
  );
}

export function StatusCard({ status, label, loading, number, numberLabel, sample }: { status: string; label: string; loading?: boolean | undefined; number: string; numberLabel: string; sample: string }) {
  return (
    <div className="hz-sc">
      <div className="h">
        {loading ? <span className="hz-sp" aria-hidden="true" /> : <span className="okc"><Icon n="ck" /></span>}
        {label} {status}
      </div>
      {numberLabel}
      <div className="hz-rn">{number} <span dir="auto">{sample}</span></div>
    </div>
  );
}

export function Camera({ children, tall, img, imgAlt, tag }: { children?: ReactNode | undefined; tall?: boolean | undefined; img?: string | undefined; imgAlt?: string | undefined; tag?: string | undefined }) {
  return (
    <div className={`hz-cm${tall ? " tl" : ""}${img ? " has-img" : ""}`}>
      {img ? (
        <>
          <img src={img} alt={imgAlt ?? ""} width={816} height={816} />
          {tag && <span className="lbl">{tag}</span>}
        </>
      ) : (
        <>
          <Icon n="cm" s={40} />
          {children}
        </>
      )}
    </div>
  );
}

export function Toggle({ on, label, onText, offText, onChange }: { on: boolean; label: string; onText: string; offText: string; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} className="hz-tg" onClick={() => onChange(!on)}>
      <span><b>{label}</b><br />{on ? onText : offText}</span>
      <span className={`hz-swt${on ? " on" : ""}`} aria-hidden="true" />
    </button>
  );
}

export function Tip({ icon, children, no }: { icon: IconName; children: ReactNode; no?: boolean | undefined }) {
  return (
    <div className={`hz-tp${no ? " no" : ""}`}>
      <Icon n={icon} />
      <span>{children}</span>
    </div>
  );
}

export function Rating({ value, onChange, label, aria }: { value: number; onChange: (n: number) => void; label: string; aria: (n: number) => string }) {
  return (
    <div>
      <div className="hz-lbl" id="hz-rate">{label}</div>
      <div className="hz-rt" role="radiogroup" aria-labelledby="hz-rate">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={aria(n)} className={value === n ? "on" : ""} onClick={() => onChange(n)}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
