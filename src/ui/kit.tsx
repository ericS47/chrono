import { useEffect, useId, useState, type ReactNode } from 'react';
import { IconBack, IconMinus, IconPlus } from './icons';
import { back } from '../lib/router';
import { fmtClock } from '../lib/format';

export function TopBar({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <header className="topbar">
      <button className="icon-btn" aria-label="Retour" onClick={onBack ?? (() => back())}>
        <IconBack size={20} />
      </button>
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-right">{right}</div>
    </header>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  const id = useId();
  return (
    <label className="row toggle-row" htmlFor={id}>
      <span className="row-text">
        <span>{label}</span>
        {hint && <span className="hint">{hint}</span>}
      </span>
      <input id={id} type="checkbox" role="switch" className="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function Stepper({
  label, value, onChange, min = 0, max = 999, step = 1, format, hint,
}: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; format?: (v: number) => string; hint?: string;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className="row">
      <span className="row-text">
        <span>{label}</span>
        {hint && <span className="hint">{hint}</span>}
      </span>
      <div className="stepper">
        <button type="button" className="step-btn" aria-label={`${label} : moins`} onClick={() => onChange(clamp(value - step))} disabled={value <= min}>
          <IconMinus size={18} />
        </button>
        <output className="step-val" aria-live="polite">{format ? format(value) : value}</output>
        <button type="button" className="step-btn" aria-label={`${label} : plus`} onClick={() => onChange(clamp(value + step))} disabled={value >= max}>
          <IconPlus size={18} />
        </button>
      </div>
    </div>
  );
}

/** Saisie d'une durée en m:ss, avec boutons − / +. */
export function DurationField({
  label, value, onChange, step = 5, min = 0, max = 6 * 3600, hint,
}: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; hint?: string }) {
  const [text, setText] = useState(fmtClock(value));
  const id = useId();
  useEffect(() => setText(fmtClock(value)), [value]);
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const commit = () => {
    const parts = text.trim().split(':').map((p) => Number(p.replace(',', '.')));
    if (parts.some((p) => Number.isNaN(p))) return setText(fmtClock(value));
    const sec = parts.length === 1 ? parts[0] : parts.reduce((t, p) => t * 60 + p, 0);
    onChange(clamp(Math.round(sec)));
  };
  return (
    <div className="row">
      <label className="row-text" htmlFor={id}>
        <span>{label}</span>
        {hint && <span className="hint">{hint}</span>}
      </label>
      <div className="stepper">
        <button type="button" className="step-btn" aria-label={`${label} : moins`} onClick={() => onChange(clamp(value - step))} disabled={value <= min}>
          <IconMinus size={18} />
        </button>
        <input
          id={id}
          className="step-val step-input"
          inputMode="numeric"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        <button type="button" className="step-btn" aria-label={`${label} : plus`} onClick={() => onChange(clamp(value + step))} disabled={value >= max}>
          <IconPlus size={18} />
        </button>
      </div>
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="link-btn" onClick={onClose}>Fermer</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

export function Chip({ children, tone }: { children: ReactNode; tone?: 'success' | 'accent' | 'muted' }) {
  return <span className={`chip ${tone ?? ''}`}>{children}</span>;
}
