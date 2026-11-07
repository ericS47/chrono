import { useState } from 'react';
import { CHARACTERS } from '../ui/figure/characters';
import { EXERCISES } from '../ui/figure/exercises';
import { Figure } from '../ui/figure/Figure';
import { TopBar } from '../ui/kit';

/** Galerie des personnages et de leurs exercices animés (remplace les GIF : plus léger, marche hors-ligne). */
export function Personnages() {
  const [charId, setCharId] = useState(CHARACTERS[0].id);
  const [paused, setPaused] = useState(false);
  const character = CHARACTERS.find((c) => c.id === charId) ?? CHARACTERS[0];

  return (
    <main className="screen no-nav">
      <TopBar title="Personnages" />
      <div className="chips" role="group" aria-label="Personnage">
        {CHARACTERS.map((c) => (
          <button key={c.id} className="chip" aria-pressed={c.id === charId} onClick={() => setCharId(c.id)}>
            {c.name}
          </button>
        ))}
        <button className="chip" aria-pressed={paused} onClick={() => setPaused(!paused)}>
          {paused ? 'Animation en pause' : 'Mettre en pause'}
        </button>
      </div>
      <div className="figure-grid">
        {EXERCISES.map((ex) => (
          <figure key={ex.id} className="figure-card">
            <Figure exercise={ex} character={character} paused={paused} />
            <figcaption>{ex.label}</figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
