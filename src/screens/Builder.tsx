// Créateur de séance : blocs « Effort » et « Repos » assemblés sur une timeline,
// regroupés en séries (répétées) et en blocs de travail (nommés, répétables).
// La séance est enregistrée comme un bloc « Personnalisé » qui porte la timeline.

import { useEffect, useRef, useState } from 'react';
import { db, saveWorkout } from '../data/db';
import { useSettings } from '../data/hooks';
import type { TimelineGroup, TimelineItem, TimelineSeries, TimelineStep, Workout } from '../data/types';
import { expandTimeline, timelineDuration } from '../engine/timeline';
import { fmtClock, uid } from '../lib/format';
import { launchWorkout } from '../lib/launch';
import { back, go } from '../lib/router';
import { DurationField, Sheet, Stepper, TopBar } from '../ui/kit';
import { IconPlay } from '../ui/icons';

const DRAFT_KEY = 'chrono.createur.brouillon';
const DEFAULT_DUR = { effort: 30, rest: 15 };
const LABEL = { effort: 'Effort', rest: 'Repos' };
const PRESETS = { effort: [20, 30, 40, 45, 60, 90, 120, 300], rest: [10, 15, 20, 30, 45, 60, 90, 120] };
const PREP_PRESETS = [0, 5, 10, 15, 20, 30, 45, 60];

type Container = TimelineSeries | TimelineGroup;
type SheetState =
  | { kind: 'step' | 'series' | 'group' | 'long'; id: string; isNew?: boolean }
  | { kind: 'prep' | 'clear' };

interface Found {
  item: TimelineItem;
  list: TimelineItem[];
  index: number;
  parent: Container | null;
}

const isContainer = (x: TimelineItem): x is Container => x.type === 'series' || x.type === 'group';

function find(list: TimelineItem[], id: string, parent: Container | null = null): Found | null {
  for (let i = 0; i < list.length; i++) {
    const x = list[i];
    if (x.id === id) return { item: x, list, index: i, parent };
    if (isContainer(x)) {
      const f = find(x.children as TimelineItem[], id, x);
      if (f) return f;
    }
  }
  return null;
}

function cloneWithIds(x: TimelineItem): TimelineItem {
  if (x.type === 'series') return { ...x, id: uid(), children: x.children.map((k) => cloneWithIds(k) as TimelineStep) };
  if (x.type === 'group') return { ...x, id: uid(), children: x.children.map((k) => cloneWithIds(k) as TimelineStep | TimelineSeries) };
  return { ...x, id: uid() };
}

function allSteps(list: TimelineItem[]): TimelineStep[] {
  return list.flatMap((x) => (isContainer(x) ? allSteps(x.children as TimelineItem[]) : [x]));
}

/** Le dernier repos d'une série ou d'un bloc de travail sert de récupération entre deux répétitions. */
function lastRest(c: Container): TimelineStep | null {
  const last = c.children[c.children.length - 1];
  return last && last.type === 'rest' ? last : null;
}

function recupText(c: Container, what: string): string {
  const lr = lastRest(c);
  if (lr) return `Récup entre ${what} ${fmtClock(lr.duration)} (dernier repos, retiré à la fin)`;
  return c.between > 0 ? `Récup entre ${what} ${fmtClock(c.between)}` : `Sans récup entre ${what}`;
}

const fmtPreset = (v: number) => (v === 0 ? 'Aucune' : v < 60 ? `${v} s` : fmtClock(v));

export function isBuilderWorkout(w: Pick<Workout, 'blocks'>): boolean {
  return w.blocks.length === 1 && w.blocks[0].mode === 'custom' && !!w.blocks[0].params.timeline;
}

function Grip() {
  return (
    <span className="bd-grip" aria-hidden="true">
      <svg width="16" height="20" viewBox="0 0 16 20" fill="currentColor"><circle cx="5" cy="4" r="1.8" /><circle cx="11" cy="4" r="1.8" /><circle cx="5" cy="10" r="1.8" /><circle cx="11" cy="10" r="1.8" /><circle cx="5" cy="16" r="1.8" /><circle cx="11" cy="16" r="1.8" /></svg>
    </span>
  );
}

export function Builder({ id }: { id?: string }) {
  const settings = useSettings();
  const isNew = !id;
  const [loaded, setLoaded] = useState<Workout | null>(null);
  const [name, setName] = useState('');
  const [prep, setPrep] = useState<number | null>(null);
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [ready, setReady] = useState(false);
  const [selecting, setSelecting] = useState<null | 'series' | 'group'>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [toast, setToast] = useState('');
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Chargement : séance existante, ou brouillon d'une nouvelle séance.
  useEffect(() => {
    if (id) {
      void db.workouts.get(id).then((w) => {
        if (w && isBuilderWorkout(w)) {
          setLoaded(w);
          setName(w.name);
          setPrep(w.prepSeconds ?? null);
          setItems(w.blocks[0].params.timeline ?? []);
        }
        setReady(true);
      });
      return;
    }
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as { name: string; prep: number | null; items: TimelineItem[] };
        setName(d.name ?? '');
        setPrep(d.prep ?? null);
        setItems(d.items ?? []);
      }
    } catch {
      /* brouillon illisible : on repart de zéro */
    }
    setReady(true);
  }, [id]);

  // Brouillon d'une nouvelle séance, pour ne rien perdre si l'app se ferme.
  useEffect(() => {
    if (!ready || !isNew) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ name, prep, items }));
    } catch {
      /* stockage indisponible */
    }
  }, [ready, isNew, name, prep, items]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 1600);
    return () => clearTimeout(t);
  }, [toast]);

  const prepSec = prep ?? settings.prepSeconds;
  const body = expandTimeline(items);
  const flat = prepSec > 0 ? [{ kind: 'prep' as const, duration: prepSec }, ...body] : body;
  const total = flat.reduce((t, x) => t + x.duration, 0);
  const efforts = body.filter((x) => x.kind === 'work').length;

  const mutate = (fn: (list: TimelineItem[]) => void) => {
    setItems((prev) => {
      const copy = structuredClone(prev);
      fn(copy);
      return copy;
    });
  };
  const withItem = (xid: string, fn: (f: Found, list: TimelineItem[]) => void) => mutate((list) => {
    const f = find(list, xid);
    if (f) fn(f, list);
  });

  // ---------- Ajout ----------
  const add = (type: 'effort' | 'rest') => {
    if (selecting) return;
    const prev = allSteps(items).filter((x) => x.type === type).at(-1);
    const b: TimelineStep = { id: uid(), type, duration: prev ? prev.duration : DEFAULT_DUR[type] };
    setItems([...items, b]);
    setLastAdded(b.id);
  };

  // Dernier ajout toujours visible, juste au-dessus du bouton « Lancer la séance ».
  useEffect(() => {
    if (!lastAdded) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    document.querySelector(`[data-node="${lastAdded}"]`)?.scrollIntoView({ block: 'end', behavior: reduce ? 'auto' : 'smooth' });
  }, [lastAdded]);

  // À l'ouverture (séance existante ou brouillon), la vue démarre sur les derniers blocs.
  const openedAtEnd = useRef(false);
  useEffect(() => {
    if (!ready || openedAtEnd.current) return;
    openedAtEnd.current = true;
    const nodes = document.querySelectorAll('.bd-timeline > [data-node]');
    nodes[nodes.length - 1]?.scrollIntoView({ block: 'end', behavior: 'auto' });
  }, [ready]);

  // Copier : la copie va à la fin de la séance. Un bloc rangé dans une série ou un bloc de
  // travail va à la fin de celui-ci (il reste dedans).
  const copy = (xid: string) => {
    const f0 = find(items, xid);
    if (!f0) return;
    const c = cloneWithIds(f0.item);
    withItem(xid, (f) => { f.list.push(structuredClone(c)); });
    setLastAdded(c.id);
    setToast(f0.parent ? `Copié à la fin ${f0.parent.type === 'series' ? 'de la série' : 'du bloc'}` : 'Copié à la fin');
  };
  const remove = (xid: string) => {
    mutate((list) => {
      const f = find(list, xid);
      if (!f) return;
      f.list.splice(f.index, 1);
      // Une série ou un bloc de travail vidé disparaît, et ainsi de suite vers le haut.
      let parent = f.parent;
      while (parent && !parent.children.length) {
        const p = find(list, parent.id);
        if (!p) break;
        p.list.splice(p.index, 1);
        parent = p.parent;
      }
    });
    setToast('Supprimé');
  };
  const move = (xid: string, d: number) => withItem(xid, (f) => {
    const j = f.index + d;
    if (j < 0 || j >= f.list.length) return;
    [f.list[f.index], f.list[j]] = [f.list[j], f.list[f.index]];
  });
  const unwrap = (xid: string) => withItem(xid, (f) => {
    if (isContainer(f.item)) f.list.splice(f.index, 1, ...(f.item.children as TimelineItem[]));
  });

  // ---------- Séries et blocs de travail ----------
  const startSelect = (mode: 'series' | 'group') => {
    if (selecting === mode) {
      setSelecting(null);
      setPicked([]);
      return;
    }
    const ok = mode === 'series' ? items.some((x) => !isContainer(x)) : items.some((x) => x.type !== 'group');
    if (!ok) {
      setToast(mode === 'series' ? 'Ajoutez d’abord des blocs à répéter' : 'Ajoutez d’abord des blocs ou des séries');
      return;
    }
    setSelecting(mode);
    setPicked([]);
  };
  const togglePick = (xid: string) => {
    // Sélection d'éléments qui se suivent : tout ce qui est entre le premier et le dernier touché.
    const idx = items.findIndex((x) => x.id === xid);
    const cur = picked.map((p) => items.findIndex((x) => x.id === p));
    let range: [number, number] | null;
    if (picked.includes(xid)) {
      const others = cur.filter((i) => i !== idx);
      range = others.length ? [Math.min(...others), Math.max(...others)] : null;
      if (range && idx > range[0] && idx < range[1]) range = [range[0], idx - 1];
    } else {
      range = cur.length ? [Math.min(idx, ...cur), Math.max(idx, ...cur)] : [idx, idx];
    }
    const next: string[] = [];
    if (range) {
      for (let i = range[0]; i <= range[1]; i++) {
        const bad = selecting === 'series' ? isContainer(items[i]) : items[i].type === 'group';
        if (bad) {
          setToast(selecting === 'series' ? 'Une série ne contient que des blocs simples' : 'Un bloc de travail ne peut pas en contenir un autre');
          setPicked([]);
          return;
        }
        next.push(items[i].id);
      }
    }
    setPicked(next);
  };
  const createContainer = () => {
    const idxs = picked.map((p) => items.findIndex((x) => x.id === p)).sort((a, b) => a - b);
    const children = items.slice(idxs[0], idxs[idxs.length - 1] + 1);
    const nGroups = items.filter((x) => x.type === 'group').length;
    const c: Container = selecting === 'group'
      ? { id: uid(), type: 'group', name: `Bloc de travail ${nGroups + 1}`, reps: 1, between: 0, children: children as (TimelineStep | TimelineSeries)[] }
      : { id: uid(), type: 'series', reps: 4, between: 0, children: children as TimelineStep[] };
    const list = items.slice();
    list.splice(idxs[0], children.length, c);
    setItems(list);
    setSheet({ kind: c.type, id: c.id, isNew: true });
    setSelecting(null);
    setPicked([]);
  };

  // ---------- Appui long, toucher, glisser ----------
  const press = useRef<{ timer: number; el: HTMLElement; x: number; y: number; fired: boolean } | null>(null);
  const drag = useRef<{ node: HTMLElement; id: string; sibs: HTMLElement[]; y0: number; target: HTMLElement | null; after: boolean; pid: number } | null>(null);
  const suppressClick = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    if (selecting) return;
    const t = e.target as HTMLElement;
    if (t.closest('.bd-grip')) {
      const node = t.closest<HTMLElement>('[data-node]');
      if (!node) return;
      e.preventDefault();
      const sibs = [...(node.parentElement?.children ?? [])].filter((x): x is HTMLElement => !!(x as HTMLElement).dataset.node);
      drag.current = { node, id: node.dataset.node!, sibs, y0: e.clientY, target: null, after: false, pid: e.pointerId };
      node.classList.add('bd-dragging');
      try {
        node.setPointerCapture(e.pointerId);
      } catch {
        /* sans capture, le glisser marche quand même */
      }
      return;
    }
    const el = t.closest<HTMLElement>('[data-press]');
    if (!el) return;
    el.classList.add('bd-pressing');
    const timer = window.setTimeout(() => {
      if (!press.current) return;
      press.current.fired = true;
      el.classList.remove('bd-pressing');
      try {
        navigator.vibrate?.(30);
      } catch {
        /* pas de vibration */
      }
      setSheet({ kind: 'long', id: el.dataset.press! });
    }, 480);
    press.current = { timer, el, x: e.clientX, y: e.clientY, fired: false };
  };
  const cancelPress = () => {
    if (!press.current) return;
    clearTimeout(press.current.timer);
    press.current.el.classList.remove('bd-pressing');
    if (press.current.fired) suppressClick.current = true;
    press.current = null;
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const p = press.current;
      if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10) cancelPress();
      const d = drag.current;
      if (!d || e.pointerId !== d.pid) return;
      e.preventDefault();
      d.node.style.transform = `translateY(${e.clientY - d.y0}px)`;
      d.sibs.forEach((x) => x.classList.remove('bd-drop-before', 'bd-drop-after'));
      d.target = null;
      for (const x of d.sibs) {
        if (x === d.node) continue;
        const r = x.getBoundingClientRect();
        if (e.clientY > r.top && e.clientY < r.bottom) {
          d.after = e.clientY > r.top + r.height / 2;
          d.target = x;
          x.classList.add(d.after ? 'bd-drop-after' : 'bd-drop-before');
          break;
        }
      }
      if (e.clientY < 140) window.scrollBy(0, -8);
      else if (e.clientY > window.innerHeight - 90) window.scrollBy(0, 8);
    };
    const onUp = (e: PointerEvent) => {
      cancelPress();
      const d = drag.current;
      if (!d || e.pointerId !== d.pid) return;
      d.node.classList.remove('bd-dragging');
      d.node.style.transform = '';
      d.sibs.forEach((x) => x.classList.remove('bd-drop-before', 'bd-drop-after'));
      drag.current = null;
      suppressClick.current = true;
      const target = d.target?.dataset.node;
      if (!target) return;
      const after = d.after;
      mutate((list) => {
        const f = find(list, d.id);
        if (!f) return;
        const [moved] = f.list.splice(f.index, 1);
        let j = f.list.findIndex((x) => x.id === target);
        if (j < 0) {
          f.list.splice(f.index, 0, moved);
          return;
        }
        if (after) j += 1;
        f.list.splice(j, 0, moved);
      });
    };
    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    };
  });

  const onClick = (e: React.MouseEvent) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    const t = e.target as HTMLElement;
    if (t.closest('.bd-grip')) return;
    if (t.closest('.bd-prep')) {
      if (!selecting) setSheet({ kind: 'prep' });
      return;
    }
    if (selecting) {
      const top = t.closest<HTMLElement>('[data-pick]');
      if (top?.dataset.pick) togglePick(top.dataset.pick);
      return;
    }
    const el = t.closest<HTMLElement>('[data-open]');
    if (!el) return;
    const xid = el.dataset.open!;
    const f = find(items, xid);
    if (f) setSheet({ kind: f.item.type === 'series' ? 'series' : f.item.type === 'group' ? 'group' : 'step', id: xid });
  };

  // ---------- Enregistrer, lancer ----------
  const buildWorkout = (): Workout => {
    const now = Date.now();
    const base = loaded ?? { id: uid(), tags: [], favorite: false, description: '', createdAt: now };
    return {
      ...base,
      name: name.trim() || 'Séance sans nom',
      prepSeconds: prepSec,
      blocks: [{ id: loaded?.blocks[0].id ?? uid(), mode: 'custom', params: { timeline: items }, exercises: [], restAfter: 0 }],
      updatedAt: now,
    } as Workout;
  };
  const save = async (): Promise<Workout | null> => {
    if (!body.length) {
      setToast('Ajoutez au moins un bloc');
      return null;
    }
    const w = buildWorkout();
    await saveWorkout(w);
    if (isNew) {
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* rien à faire */
      }
    }
    return w;
  };
  const saveAndOpen = async () => {
    const w = await save();
    if (w) go(`/seance/${w.id}`, true);
  };
  const launch = async () => {
    const w = await save();
    if (w) launchWorkout(w, settings);
  };

  if (!ready) return null;
  if (id && !loaded) {
    return (
      <main className="screen no-nav">
        <TopBar title="Modifier la séance" />
        <p className="empty">Séance introuvable.</p>
      </main>
    );
  }

  // ---------- Rendu ----------
  const stepHtml = (b: TimelineStep, top: boolean) => (
    <button
      key={b.id}
      className={`bd-blk ${b.type}${picked.includes(b.id) ? ' picked' : ''}${b.id === lastAdded ? ' new' : ''}`}
      data-node={b.id}
      data-press={b.id}
      data-open={b.id}
      data-pick={top ? b.id : undefined}
      aria-label={`${LABEL[b.type]} ${fmtClock(b.duration)}${b.note ? `, ${b.note}` : ''}`}
    >
      {selecting && top && <span className="bd-check" aria-hidden="true">{picked.includes(b.id) ? '✓' : ''}</span>}
      <span className="bd-main">
        <span className="bd-kind">{LABEL[b.type]}</span>
        {b.note && <span className="bd-note">{b.note}</span>}
      </span>
      <span className="bd-end">
        <span className="bd-time">{fmtClock(b.duration)}</span>
        {!selecting && <Grip />}
      </span>
    </button>
  );
  const itemHtml = (it: TimelineItem, top: boolean): JSX.Element => {
    if (it.type === 'series') {
      return (
        <section key={it.id} className={`bd-series${top ? ' top' : ''}${picked.includes(it.id) ? ' picked' : ''}`} data-node={it.id} data-pick={top ? it.id : undefined} aria-label={`Série × ${it.reps}`}>
          <button className="bd-series-head" data-press={it.id} data-open={it.id}>
            <span>Série × {it.reps}</span>
            <span className="bd-end"><span>{fmtClock(timelineDuration([it]))}</span>{!selecting && <Grip />}</span>
          </button>
          {it.children.map((k) => stepHtml(k, false))}
          <div className="bd-foot">{recupText(it, 'séries')}</div>
        </section>
      );
    }
    if (it.type === 'group') {
      return (
        <section key={it.id} className="bd-group" data-node={it.id} aria-label={it.name || 'Bloc de travail'}>
          <button className="bd-group-head" data-press={it.id} data-open={it.id}>
            <span>{it.name || 'Bloc de travail'}<small>{it.reps > 1 ? `Répété ${it.reps} fois` : 'Une fois'}</small></span>
            <span className="bd-end"><span>{fmtClock(timelineDuration([it]))}</span>{!selecting && <Grip />}</span>
          </button>
          {it.children.map((k) => itemHtml(k, false))}
          {it.reps > 1 && <div className="bd-foot muted">{recupText(it, 'deux passages')}</div>}
        </section>
      );
    }
    return stepHtml(it, top);
  };

  return (
    <main className="screen no-nav bd-screen">
      <TopBar
        title={isNew ? 'Créer une séance' : 'Modifier la séance'}
        onBack={() => back('/seances')}
        right={<button className="btn small" onClick={() => void saveAndOpen()}>Enregistrer</button>}
      />

      <input className="bd-name" aria-label="Nom de la séance" placeholder="Nom de la séance" value={name} onChange={(e) => setName(e.target.value)} />

      <div className="bd-head">
        <div className="bd-head-row">
          <div>
            <div className="bd-head-title">Durée de la séance</div>
            <div className="bd-total num" data-testid="builder-total">{fmtClock(total)}</div>
          </div>
          <div className="bd-head-side">
            <span>{efforts} effort{efforts > 1 ? 's' : ''} · {body.length - efforts} repos</span>
            {!!items.length && <button className="link-btn" onClick={() => setSheet({ kind: 'clear' })}>Tout effacer</button>}
          </div>
        </div>
        <div className="bd-strip" aria-hidden="true">
          {flat.map((x, i) => <i key={i} className={x.kind} style={{ flex: x.duration }} />)}
        </div>
      </div>

      <div className="bd-layout">
        <nav className="bd-palette" aria-label="Ajouter">
          <button className="bd-pal effort" onClick={() => add('effort')}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg>
            Effort
          </button>
          <button className="bd-pal rest" onClick={() => add('rest')}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M9 6v12M15 6v12" /></svg>
            Repos
          </button>
          <button className="bd-pal series" aria-pressed={selecting === 'series'} onClick={() => startSelect('series')}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 2l4 4-4 4" /><path d="M3 11V9a3 3 0 013-3h15" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v2a3 3 0 01-3 3H3" /></svg>
            Série
          </button>
          <button className="bd-pal group" aria-pressed={selecting === 'group'} onClick={() => startSelect('group')}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></svg>
            Bloc de travail
          </button>
        </nav>

        <div ref={timelineRef} className={`bd-timeline${selecting ? ` selecting mode-${selecting}` : ''}`} onPointerDown={onPointerDown} onClick={onClick} onContextMenu={(e) => e.preventDefault()}>
          <button className="bd-blk bd-prep">
            <span className="bd-main">
              <span className="bd-kind">Préparation</span>
              <span className="bd-note">{prepSec > 0 ? 'Touchez pour régler' : 'Aucune · touchez pour régler'}</span>
            </span>
            <span className="bd-end"><span className="bd-time">{fmtClock(prepSec)}</span></span>
          </button>
          {items.length
            ? items.map((it) => itemHtml(it, true))
            : <p className="bd-empty">Votre séance est vide.<br />Touchez « Effort » ou « Repos » à gauche pour commencer.</p>}
        </div>
      </div>

      {selecting ? (
        <div className="bd-bottom bd-selbar">
          <p>{picked.length ? `${picked.length} élément${picked.length > 1 ? 's' : ''} ${selecting === 'group' ? 'à regrouper' : 'à répéter'}` : selecting === 'group' ? 'Touchez les blocs et séries à regrouper' : 'Touchez les blocs à répéter'}</p>
          <button className="btn secondary" onClick={() => { setSelecting(null); setPicked([]); }}>Annuler</button>
          <button className="btn" disabled={!picked.length} onClick={createContainer}>Créer</button>
        </div>
      ) : (
        <div className="bd-bottom">
          <button className="btn block bd-launch" disabled={!body.length} onClick={() => void launch()}><IconPlay size={18} />Lancer la séance</button>
        </div>
      )}

      {toast && <div className="toast bd-toast" role="status">{toast}</div>}

      {sheet && <BuilderSheet
        sheet={sheet}
        items={items}
        prep={prepSec}
        onPrep={setPrep}
        close={() => setSheet(null)}
        withItem={withItem}
        copy={copy}
        remove={remove}
        move={move}
        unwrap={unwrap}
        clearAll={() => setItems([])}
        open={setSheet}
      />}
    </main>
  );
}

function BuilderSheet({
  sheet, items, prep, onPrep, close, withItem, copy, remove, move, unwrap, clearAll, open,
}: {
  sheet: SheetState;
  items: TimelineItem[];
  prep: number;
  onPrep: (v: number) => void;
  close: () => void;
  withItem: (id: string, fn: (f: Found, list: TimelineItem[]) => void) => void;
  copy: (id: string) => void;
  remove: (id: string) => void;
  move: (id: string, d: number) => void;
  unwrap: (id: string) => void;
  clearAll: () => void;
  open: (s: SheetState) => void;
}) {
  if (sheet.kind === 'prep') {
    return (
      <Sheet title="Préparation" onClose={close}>
        <div className="form">
          <DurationField label="Avant le premier effort" value={prep} min={0} max={60} step={5} onChange={onPrep} />
        </div>
        <div className="chips">
          {PREP_PRESETS.map((v) => <button key={v} className="chip" aria-pressed={v === prep} onClick={() => onPrep(v)}>{fmtPreset(v)}</button>)}
        </div>
        <p className="hint">Le temps de se mettre en place. Elle reste toujours en tête de la séance.</p>
        <button className="btn block" onClick={close}>Terminé</button>
      </Sheet>
    );
  }
  if (sheet.kind === 'clear') {
    return (
      <Sheet title="Tout effacer ?" onClose={close}>
        <p className="hint">Tous les blocs sont supprimés. La préparation reste.</p>
        <button className="btn danger block" onClick={() => { clearAll(); close(); }}>Tout effacer</button>
        <button className="btn secondary block" onClick={close}>Annuler</button>
      </Sheet>
    );
  }
  const sh = sheet as Extract<SheetState, { id: string }>;
  const f = find(items, sh.id);
  if (!f) return null;
  const it = f.item;
  const xid = it.id;

  if (sh.kind === 'long') {
    const title = it.type === 'series' ? `Série × ${it.reps}` : it.type === 'group' ? it.name || 'Bloc de travail' : `${LABEL[it.type]} ${fmtClock(it.duration)}`;
    return (
      <Sheet title={title} onClose={close}>
        <button className="btn block" onClick={() => { copy(xid); close(); }}>Copier</button>
        <button className="btn secondary block" onClick={() => open({ kind: it.type === 'series' ? 'series' : it.type === 'group' ? 'group' : 'step', id: xid })}>Régler</button>
        <button className="btn danger block" onClick={() => { remove(xid); close(); }}>Supprimer</button>
      </Sheet>
    );
  }

  if (!isContainer(it)) {
    const set = (v: number) => withItem(xid, (x) => { (x.item as TimelineStep).duration = Math.max(5, Math.min(3600, v)); });
    return (
      <Sheet title={`${LABEL[it.type]}${f.parent ? (f.parent.type === 'series' ? ' · dans la série' : ' · dans le bloc') : ''}`} onClose={close}>
        <div className="form">
          <DurationField label="Durée" value={it.duration} min={5} max={3600} step={5} onChange={set} />
        </div>
        <div className="chips">
          {PRESETS[it.type].map((v) => <button key={v} className="chip" aria-pressed={v === it.duration} onClick={() => set(v)}>{fmtPreset(v)}</button>)}
        </div>
        <div className="form">
          <div className="field">
            <label htmlFor="bd-note">Commentaire</label>
            <textarea id="bd-note" value={it.note ?? ''} placeholder={it.type === 'effort' ? 'Ex. 15 burpees, allure 5:00/km…' : 'Ex. marcher, s’étirer…'} onChange={(e) => { const v = e.target.value; withItem(xid, (x) => { (x.item as TimelineStep).note = v; }); }} />
          </div>
        </div>
        <div className="btn-row">
          <button className="btn secondary" disabled={f.index === 0} onClick={() => move(xid, -1)}>Monter</button>
          <button className="btn secondary" disabled={f.index === f.list.length - 1} onClick={() => move(xid, 1)}>Descendre</button>
        </div>
        <div className="btn-row">
          <button className="btn secondary" onClick={() => { copy(xid); close(); }}>Copier</button>
          <button className="btn danger" onClick={() => { remove(xid); close(); }}>Supprimer</button>
        </div>
        <button className="btn block" onClick={close}>Terminé</button>
      </Sheet>
    );
  }

  const c = it;
  const lr = lastRest(c);
  const recup = lr ? lr.duration : c.between;
  const setRecup = (v: number) => withItem(xid, (x) => {
    const k = x.item as Container;
    const l = lastRest(k);
    if (l) l.duration = Math.max(5, v);
    else k.between = Math.max(0, v);
  });
  const isSeries = c.type === 'series';
  return (
    <Sheet title={isSeries ? (sh.isNew ? 'Nouvelle série' : 'Série') : (sh.isNew ? 'Nouveau bloc de travail' : 'Bloc de travail')} onClose={close}>
      <div className="form">
        {c.type === 'group' && (
          <div className="field">
            <label htmlFor="bd-gname">Nom</label>
            <input id="bd-gname" type="text" value={c.name} placeholder="Ex. Bloc cardio" onChange={(e) => { const v = e.target.value; withItem(xid, (x) => { (x.item as TimelineGroup).name = v; }); }} />
          </div>
        )}
        <Stepper
          label={isSeries ? 'Répétitions' : 'Passages'}
          value={c.reps}
          min={isSeries ? 2 : 1}
          max={isSeries ? 50 : 20}
          onChange={(v) => withItem(xid, (x) => { (x.item as Container).reps = v; })}
        />
        {(isSeries || c.reps > 1) && (
          <DurationField
            label={isSeries ? 'Récup entre deux séries' : 'Récup entre deux passages'}
            hint={lr ? 'C’est le dernier repos : retiré à la fin' : 'Ajoutée entre deux répétitions'}
            value={recup}
            min={lr ? 5 : 0}
            max={900}
            step={15}
            onChange={setRecup}
          />
        )}
      </div>
      <p className="hint">Durée : <b>{fmtClock(timelineDuration([c]))}</b>.</p>
      <div className="btn-row">
        <button className="btn secondary" onClick={() => { copy(xid); close(); }}>Copier</button>
        <button className="btn secondary" onClick={() => { unwrap(xid); close(); }}>{isSeries ? 'Défaire la série' : 'Défaire le bloc'}</button>
      </div>
      <button className="btn danger block" onClick={() => { remove(xid); close(); }}>Supprimer</button>
      <button className="btn block" onClick={close}>Terminé</button>
    </Sheet>
  );
}
