// « Pulse Poly » : jeu de plateau sportif, à plusieurs sur le même téléphone.
// Les règles sont dans src/game/game.ts ; cet écran affiche le plateau et les choix.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from '../data/hooks';
import { EXERCISES, EXERCISE_BY_ID, equipmentOf, isExerciseId, positionOf, type ExerciseId } from '../anim/exercises';
import { ExerciseFigure, FigureFrame } from '../anim/Figure';
import {
  abandon, applyCard, BOARD, decide, DEFAULT_CARDIO, done, EXERCISE_SQUARES, GROUP_COLORS, newGame, ownedBy,
  playerById, randomExercises, ranking, roll, RULES, type GameConfig, type GameState, type Task,
} from '../game/game';
import { GameStage } from '../ui/GameStage';
import { Segmented, Sheet, Stepper, TopBar } from '../ui/kit';

const SAVE_KEY = 'pulse.game';

/** Exercices proposés pour le plateau : debout, sans matériel. */
const POOL = EXERCISES.filter((e) => positionOf(e) === 'standing' && equipmentOf(e) === 'none').map((e) => ({ exId: e.id, label: e.label }));

function load(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? (JSON.parse(raw) as GameState) : null;
  } catch {
    return null;
  }
}
function save(s: GameState | null): void {
  try {
    if (s) localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    else localStorage.removeItem(SAVE_KEY);
  } catch {
    /* stockage indisponible : la partie n'est pas sauvegardée */
  }
}

export function GameScreen() {
  const [state, setState] = useState<GameState | null>(() => load());
  useEffect(() => save(state), [state]);
  if (!state) return <Setup onStart={setState} />;
  return <Play state={state} setState={setState} onQuit={() => setState(null)} />;
}

// ---------- Préparation ----------

function Setup({ onStart }: { onStart: (s: GameState) => void }) {
  const [names, setNames] = useState(['', '']);
  const [endKind, setEndKind] = useState<'unlimited' | 'laps'>('laps');
  const [laps, setLaps] = useState(4);
  const [mode, setMode] = useState<'random' | 'choose'>('random');
  const [chosen, setChosen] = useState<GameConfig['exercises']>(() => randomExercises(POOL, Math.random));
  const [cardio, setCardio] = useState<Task[]>(DEFAULT_CARDIO);

  const start = () => {
    const exercises = mode === 'random' ? randomExercises(POOL, Math.random) : chosen;
    onStart(newGame(names, { exercises, cardio, end: endKind === 'laps' ? { kind: 'laps', laps } : { kind: 'unlimited' } }, Math.random));
  };

  return (
    <main className="screen no-nav pp-setup">
      <TopBar title="Pulse Poly" />
      <p className="hint" style={{ margin: 0 }}>
        Faites le tour du plateau : achetez des exercices en répétitions, et faites payer les autres en répétitions quand ils tombent chez vous.
      </p>

      <section className="section">
        <h2 className="section-title">Joueurs</h2>
        <div className="form">
          {names.map((n, i) => (
            <div key={i} className="row">
              <span className="pp-dot" style={{ background: ['#4F5BD5', '#E5484D', '#2E7A5E', '#FF9F5A', '#B05BD5', '#14183A'][i] }} />
              <input aria-label={`Joueur ${i + 1}`} className="pp-name" value={n} placeholder={`Joueur ${i + 1}`} onChange={(e) => setNames(names.map((x, k) => (k === i ? e.target.value : x)))} />
              {names.length > 2 && <button className="link-btn" onClick={() => setNames(names.filter((_, k) => k !== i))}>Retirer</button>}
            </div>
          ))}
        </div>
        {names.length < 6 && <button className="btn secondary block" onClick={() => setNames([...names, ''])}>Ajouter un joueur</button>}
      </section>

      <section className="section">
        <h2 className="section-title">Fin de partie</h2>
        <Segmented label="Fin de partie" value={endKind} onChange={setEndKind} options={[{ value: 'laps', label: 'Tours de plateau' }, { value: 'unlimited', label: 'Illimitée' }]} />
        {endKind === 'laps' && <div className="form"><Stepper label="Tours de plateau" value={laps} min={1} max={20} onChange={setLaps} /></div>}
        <p className="hint" style={{ margin: 0 }}>
          {endKind === 'laps'
            ? `Un tour = un passage par le Départ. Le premier joueur qui fait ${laps} tour${laps > 1 ? 's' : ''} de plateau gagne et termine la partie.`
            : 'Un joueur peut abandonner ; « Terminer la partie » est dans le menu. Gagnant : celui qui détient le plus de cases.'}
        </p>
      </section>

      <section className="section">
        <h2 className="section-title">Exercices du plateau</h2>
        <Segmented label="Exercices" value={mode} onChange={setMode} options={[{ value: 'random', label: 'Aléatoires' }, { value: 'choose', label: 'Je choisis' }]} />
        {mode === 'choose' && (
          <div className="form">
            {EXERCISE_SQUARES.map((sq) => (
              <div key={sq} className="row">
                <span className="pp-band" style={{ background: GROUP_COLORS[BOARD[sq].group ?? 0] }} />
                <select aria-label={`Case ${sq}`} value={chosen[sq]?.exId ?? ''} onChange={(e) => {
                  const ex = POOL.find((x) => x.exId === e.target.value);
                  if (ex) setChosen({ ...chosen, [sq]: ex });
                }}>
                  {POOL.map((x) => <option key={x.exId} value={x.exId}>{x.label}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <h2 className="section-title">Carte cardio</h2>
        <div className="form">
          {cardio.map((t, i) => (
            <div key={i} className="row">
              <select aria-label={`Cardio ${i + 1}`} value={t.exId ?? ''} onChange={(e) => {
                const ex = POOL.find((x) => x.exId === e.target.value);
                if (ex) setCardio(cardio.map((x, k) => (k === i ? { ...x, ...ex } : x)));
              }}>
                {POOL.map((x) => <option key={x.exId} value={x.exId}>{x.label}</option>)}
              </select>
              <div className="stepper">
                <button type="button" className="step-btn" aria-label={`${t.label} : moins`} onClick={() => setCardio(cardio.map((x, k) => (k === i ? { ...x, reps: Math.max(1, x.reps - 1) } : x)))}>−</button>
                <output className="step-val">{t.reps}</output>
                <button type="button" className="step-btn" aria-label={`${t.label} : plus`} onClick={() => setCardio(cardio.map((x, k) => (k === i ? { ...x, reps: x.reps + 1 } : x)))}>+</button>
              </div>
              {cardio.length > 1 && <button className="link-btn" onClick={() => setCardio(cardio.filter((_, k) => k !== i))}>Retirer</button>}
            </div>
          ))}
        </div>
        <button className="btn secondary block" onClick={() => setCardio([...cardio, { exId: 'squat', label: 'Squat', reps: 10 }])}>Ajouter un exercice</button>
        <p className="hint" style={{ margin: 0 }}>
          4 cartes cardio sur le plateau, toujours au prix indiqué : on fait ces exercices une fois pour l’acheter, et une fois chez un autre joueur.
        </p>
      </section>

      <button className="btn block" onClick={start}>Commencer la partie</button>
    </main>
  );
}

// ---------- Plateau ----------

/** Position d'une case dans la grille 11 × 11 (départ en bas à droite, sens des aiguilles d'une montre inversé). */
function cell(i: number): { row: number; col: number } {
  if (i <= 10) return { row: 11, col: 11 - i };
  if (i <= 20) return { row: 21 - i, col: 1 };
  if (i <= 30) return { row: 1, col: i - 19 };
  return { row: i - 29, col: 11 };
}

const CORNER: Record<string, string> = { start: 'Départ', gym: 'Salle de sport', rest: 'Récup', togym: 'Direction salle de sport' };

function squareLabel(s: GameState, i: number): string {
  const sq = BOARD[i];
  if (sq.kind === 'exercise') return s.config.exercises[i]?.label ?? 'Exercice';
  if (sq.kind === 'cardio') return `Cardio ${(sq.cardio ?? 0) + 1}`;
  if (sq.kind === 'defi') return 'Défi';
  if (sq.kind === 'culture') return 'Culture AP';
  return CORNER[sq.kind];
}

function Board({ s, children }: { s: GameState; children: React.ReactNode }) {
  return (
    <div className="pp-board">
      {BOARD.map((sq, i) => {
        const { row, col } = cell(i);
        const owner = s.owner[i] ? playerById(s, s.owner[i]) : null;
        const here = s.players.filter((p) => !p.out && p.pos === i);
        const corner = i % 10 === 0;
        return (
          <div
            key={i}
            className={`pp-sq ${sq.kind}${corner ? ' corner' : ''}`}
            style={{ gridRow: row, gridColumn: col, borderColor: owner?.color, ...(owner ? { boxShadow: `inset 0 0 0 2px ${owner.color}` } : {}) }}
            title={squareLabel(s, i)}
            data-sq={i}
          >
            {sq.kind === 'exercise' && <i className="pp-stripe" style={{ background: GROUP_COLORS[sq.group ?? 0] }} />}
            {/* Sur le plateau, le nom court (sans la précision entre parenthèses). */}
            <span className="pp-sq-label">{squareLabel(s, i).replace(/\s*\(.*\)\s*$/, '')}</span>
            {here.length > 0 && (
              <span className="pp-pawns">
                {here.map((p) => <b key={p.id} style={{ background: p.color }} title={p.name} />)}
              </span>
            )}
          </div>
        );
      })}
      <div className="pp-center">{children}</div>
    </div>
  );
}

// ---------- Partie ----------

const DIE = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

function Tasks({ tasks }: { tasks: Task[] }) {
  const settings = useSettings();
  const [i, setI] = useState(0);
  // Plusieurs exercices (carte cardio) : l'animation passe de l'un à l'autre.
  useEffect(() => {
    if (tasks.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % tasks.length), 3000);
    return () => clearInterval(t);
  }, [tasks.length]);
  const cur = tasks[i % tasks.length];
  return (
    <div className="pp-tasks">
      {cur && isExerciseId(cur.exId) && (
        <div className="pp-anim"><ExerciseFigure exercise={cur.exId as ExerciseId} avatar={settings.anim.avatar} /></div>
      )}
      <ul>
        {tasks.map((t, k) => <li key={k} className={k === i % tasks.length ? 'on' : ''}><b>{t.reps}</b> {t.label}</li>)}
      </ul>
    </div>
  );
}

/** Choix sur une case libre : le total, et le détail des exercices s'il y en a plusieurs (carte cardio). */
function Choice({ label, tasks, secondary, onClick }: { label: string; tasks: Task[]; secondary?: boolean; onClick: () => void }) {
  const total = tasks.reduce((t, x) => t + x.reps, 0);
  return (
    <button className={`btn small block pp-choice${secondary ? ' secondary' : ''}`} onClick={onClick}>
      <span>{label} : {total} rép.</span>
      {tasks.length > 1 && <small>{tasks.map((t) => `${t.reps} ${t.label}`).join(' · ')}</small>}
    </button>
  );
}

function Play({ state: s, setState, onQuit }: { state: GameState; setState: (s: GameState | null) => void; onQuit: () => void }) {
  const settings = useSettings();
  const [rolling, setRolling] = useState<number | null>(null);
  const [menu, setMenu] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [giftTo, setGiftTo] = useState('');
  const timer = useRef<number | null>(null);
  const p = s.players[s.current];
  const pend = s.pending;

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  useEffect(() => { setShowAnswer(false); setGiftTo(''); }, [pend]);

  const throwDie = () => {
    if (rolling !== null) return;
    let n = 0;
    timer.current = window.setInterval(() => {
      n += 1;
      setRolling(1 + Math.floor(Math.random() * 6));
      if (n >= 8) {
        clearInterval(timer.current!);
        timer.current = null;
        const v = 1 + Math.floor(Math.random() * 6);
        setRolling(null);
        setState(roll(s, v));
      }
    }, 70);
  };

  const myGiftTask = useMemo<Task>(() => {
    const mine = ownedBy(s, p.id).map((k) => s.config.exercises[k]).filter(Boolean);
    const ex = mine[0] ?? { exId: 'squat', label: 'Squat' };
    return { ...ex, reps: RULES.gift };
  }, [s, p.id]);

  let panel: React.ReactNode;
  if (pend.kind === 'over') {
    const rank = ranking(s);
    const race = s.config.end.kind === 'laps';
    const winner = s.winner ? playerById(s, s.winner) : null;
    panel = (
      <div className="pp-panel">
        <h2>{winner ? `${winner.name} gagne !` : 'Fin de partie'}</h2>
        {winner && race && <span className="hint">Premier à faire {s.config.end.kind === 'laps' ? s.config.end.laps : ''} tours de plateau</span>}
        <ol className="pp-rank">
          {rank.map(({ player, squares }, k) => (
            <li key={player.id}>
              <span className="pp-dot" style={{ background: player.color }} />
              <b>{k === 0 ? '🏆 ' : ''}{player.name}</b>
              <span>{player.out ? 'abandon' : `${race ? `${player.laps ?? 0} tour${(player.laps ?? 0) > 1 ? 's' : ''} · ` : ''}${squares} case${squares > 1 ? 's' : ''}`} · {player.reps} rép.</span>
            </li>
          ))}
        </ol>
        <button className="btn block" onClick={onQuit}>Nouvelle partie</button>
      </div>
    );
  } else if (pend.kind === 'roll') {
    panel = (
      <div className="pp-panel">
        <span className="pp-turn"><span className="pp-dot" style={{ background: p.color }} /> {p.name}{p.inGym ? ' · salle de sport' : ''}</span>
        <button className="pp-die" aria-label="Lancer le dé" onClick={throwDie}>{DIE[(rolling ?? s.lastRoll ?? 1) - 1]}</button>
        <span className="hint">{p.inGym ? 'Un 6 pour sortir de la salle de sport' : rolling ? 'Le dé roule…' : 'Touchez le dé'}</span>
      </div>
    );
  } else if (pend.kind === 'buy') {
    const label = squareLabel(s, pend.square);
    const exId = s.config.exercises[pend.square]?.exId;
    panel = (
      <div className="pp-panel">
        <span className="pp-turn"><span className="pp-dot" style={{ background: p.color }} /> {p.name} · {DIE[(s.lastRoll ?? 1) - 1]}</span>
        <b className="pp-title">{label}</b>
        {isExerciseId(exId) && <div className="pp-thumb"><FigureFrame exercise={exId} avatar={settings.anim.avatar} sec={EXERCISE_BY_ID[exId].period / 2} /></div>}
        <span className="hint">Case libre</span>
        <Choice label="Acheter" tasks={pend.cost} onClick={() => setState(decide(s, true))} />
        <Choice label="Passer" tasks={pend.pass} secondary onClick={() => setState(decide(s, false))} />
      </div>
    );
  } else if (pend.kind === 'tasks') {
    panel = (
      <div className="pp-panel">
        <b className="pp-title">{pend.title}</b>
        <span className="pp-who">{pend.who.map((id) => playerById(s, id).name).join(' + ')}{pend.who.length > 1 ? ' (salle de sport)' : ''}</span>
        <Tasks tasks={pend.tasks} />
        <button className="btn small block" onClick={() => setState(done(s))}>C’est fait</button>
      </div>
    );
  } else {
    const card = pend.card;
    panel = (
      <div className="pp-panel">
        <b className="pp-title">{pend.deck === 'defi' ? 'Défi' : 'Culture AP'}</b>
        <p className="pp-card">{card.text}</p>
        {card.effect.kind === 'question' ? (
          showAnswer ? (
            <>
              <p className="pp-answer">{card.answer}</p>
              <div className="pp-row">
                <button className="btn small" onClick={() => setState(applyCard(s, { correct: true }))}>Bonne réponse</button>
                <button className="btn small secondary" onClick={() => setState(applyCard(s, { correct: false }))}>Raté</button>
              </div>
            </>
          ) : <button className="btn small block" onClick={() => setShowAnswer(true)}>Voir la réponse</button>
        ) : card.effect.kind === 'gift' ? (
          <>
            <select aria-label="Joueur qui reçoit" value={giftTo} onChange={(e) => setGiftTo(e.target.value)}>
              <option value="">Choisir un joueur…</option>
              {s.players.filter((x) => x.id !== p.id && !x.out).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
            <span className="hint">{myGiftTask.reps} × {myGiftTask.label}</span>
            <button className="btn small block" disabled={!giftTo} onClick={() => setState(applyCard(s, { target: giftTo, task: myGiftTask }))}>Offrir</button>
          </>
        ) : <button className="btn small block" onClick={() => setState(applyCard(s))}>OK</button>}
      </div>
    );
  }

  return (
    <main className="screen no-nav pp-play game-play">
      <TopBar
        title={s.config.end.kind === 'laps' ? `Pulse Poly · course en ${s.config.end.laps} tours` : `Pulse Poly · tour ${s.round}${s.config.end.kind === 'turns' ? `/${s.config.end.turns}` : ''}`}
        right={pend.kind !== 'over' ? <button className="link-btn" onClick={() => setMenu(true)}>Menu</button> : undefined}
      />
      <GameStage ratio={1} board={<Board s={s}>{panel}</Board>}>
      <div className="pp-players">
        {s.players.map((x) => (
          <div key={x.id} className={`pp-player${x.id === p.id && pend.kind !== 'over' ? ' current' : ''}${x.out ? ' out' : ''}`}>
            <span className="pp-dot" style={{ background: x.color }} />
            <b>{x.name}</b>
            <span>{s.config.end.kind === 'laps' ? `${x.laps ?? 0}/${s.config.end.laps} tours · ` : ''}{ownedBy(s, x.id).length} case{ownedBy(s, x.id).length > 1 ? 's' : ''} · {x.reps} rép.{x.inGym ? ' · 🏋️' : ''}</span>
          </div>
        ))}
      </div>
      {s.log.length > 0 && <p className="hint pp-log">{s.log[0]}</p>}
      </GameStage>
      {menu && (
        <Sheet title="Menu de la partie" onClose={() => setMenu(false)}>
          <span className="field-label">Abandon d’un joueur</span>
          {s.players.filter((x) => !x.out).map((x) => (
            <button key={x.id} className="btn secondary block" onClick={() => { setState(abandon(s, x.id)); setMenu(false); }}>{x.name} abandonne</button>
          ))}
          <button className="btn block" onClick={() => { setState({ ...s, pending: { kind: 'over' } }); setMenu(false); }}>Terminer la partie</button>
          <button className="btn danger block" onClick={() => { if (window.confirm('Effacer la partie en cours ?')) { setMenu(false); onQuit(); } }}>Effacer la partie</button>
        </Sheet>
      )}
    </main>
  );
}
