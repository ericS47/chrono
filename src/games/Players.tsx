// Joueurs d'une partie à plusieurs sur le même téléphone : noms et couleurs des pions.

import { IconMinus, IconPlus } from '../ui/icons';

export const MAX_PLAYERS = 6;
export const PLAYER_COLORS = ['#4F5BD5', '#E0533D', '#2E9E6B', '#D99A00', '#9B59D0', '#1FA2C4'];

/** Noms des joueurs, avec un nom par défaut pour les champs laissés vides. */
export const playerNames = (players: string[]) => (players.length ? players : ['Joueur 1']).map((n, i) => n.trim() || `Joueur ${i + 1}`);

export function PlayersEditor({ players: list, onChange, hint }: { players: string[]; onChange: (p: string[]) => void; hint?: string }) {
  const players = list.length ? list : ['Joueur 1'];
  const rename = (i: number, name: string) => onChange(players.map((n, k) => (k === i ? name : n)));
  return (
    <section className="section" aria-label="Joueurs">
      <h2 className="section-title">Joueurs</h2>
      <div className="card goose-players">
        {players.map((name, i) => (
          <div key={i} className="goose-player-row">
            <span className="goose-token" style={{ background: PLAYER_COLORS[i] }} aria-hidden="true" />
            <input type="text" className="input" aria-label={`Nom du joueur ${i + 1}`} value={name} maxLength={20} onChange={(e) => rename(i, e.target.value)} />
            {players.length > 1 && (
              <button type="button" className="mini-btn" aria-label={`Retirer ${name || `le joueur ${i + 1}`}`} onClick={() => onChange(players.filter((_, k) => k !== i))}>
                <IconMinus size={18} />
              </button>
            )}
          </div>
        ))}
        {players.length < MAX_PLAYERS && (
          <button type="button" className="btn ghost small" onClick={() => onChange([...players, `Joueur ${players.length + 1}`])}>
            <IconPlus size={18} />Ajouter un joueur
          </button>
        )}
        {hint && <p className="hint">{hint}</p>}
      </div>
    </section>
  );
}
