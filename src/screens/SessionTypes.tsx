import { ALL_MODES, MODE_COLORS, MODE_LABELS } from '../data/types';
import { go } from '../lib/router';
import { TopBar } from '../ui/kit';

/** Couleur de la tuile « WOD connus » (même famille que les couleurs des modes). */
export const WOD_COLOR = '#E6CBA8';

/** Tous les types de séance, ouverts depuis la tuile « Types de séances » de l'accueil. */
export function SessionTypes() {
  return (
    <main className="screen no-nav">
      <TopBar title="Types de séances" />
      <div className="tiles types">
        {ALL_MODES.map((m) => (
          <button key={m} className="tile solo" style={{ background: MODE_COLORS[m] }} onClick={() => go(`/rapide/${m}`)}>
            {MODE_LABELS[m]}
          </button>
        ))}
        <button className="tile solo" style={{ background: WOD_COLOR }} onClick={() => go('/seances?tab=wod')}>
          WOD connus
        </button>
      </div>
    </main>
  );
}
