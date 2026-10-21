/** 164 → « 2:44 », 3723 → « 1:02:03 ». */
export function fmtClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** 720 → « 12′ », 30 → « 30″ », 90 → « 1′30″ ». */
export function fmtShort(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (!m) return `${s}″`;
  return s ? `${m}′${String(s).padStart(2, '0')}″` : `${m}′`;
}

/** 5640 → « 1 h 34 », 1920 → « 32 min ». */
export function fmtDuration(sec: number): string {
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const DAYS_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export const dayName = (d: Date) => DAYS[d.getDay()];
export const dayShort = (wd: number) => DAYS_SHORT[wd];
export const monthName = (m: number) => MONTHS[m];
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** « Mardi 21 octobre » */
export function fmtLongDate(d: Date): string {
  return `${cap(dayName(d))} ${d.getDate()} ${monthName(d.getMonth())}`;
}

/** Date locale au format AAAA-MM-JJ. */
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseIsoDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Lundi de la semaine de d. */
export function startOfWeek(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const wd = (r.getDay() + 6) % 7;
  r.setDate(r.getDate() - wd);
  return r;
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
