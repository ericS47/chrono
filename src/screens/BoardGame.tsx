import type { ComponentType } from 'react';
import { go } from '../lib/router';
import { TopBar, Empty } from '../ui/kit';
import { Battleship } from './Battleship';
import { IconBattleship, IconGoose, IconMilestone, IconProperty, IconRoulette } from '../ui/icons';

export const GAMES: { id: string; label: string; color: string; Icon: ComponentType<{ size?: number }> }[] = [
  { id: 'bataille-navale', label: 'Bataille navale', color: '#9BD3F5', Icon: IconBattleship },
  { id: 'jeu-de-l-oie', label: 'Jeu de l’oie', color: '#B5D98A', Icon: IconGoose },
  { id: 'monopoly', label: 'Monopoly', color: '#FFBE98', Icon: IconProperty },
  { id: '1000-bornes', label: '1000 Bornes', color: '#FFC93C', Icon: IconMilestone },
  { id: 'roulette-russe', label: 'Roulette russe', color: '#F5A8C8', Icon: IconRoulette },
];

/** Jeux de société : la liste, puis la page d’un jeu (à construire). */
export function BoardGame({ id }: { id?: string }) {
  if (id === 'bataille-navale') return <Battleship />;
  const game = GAMES.find((g) => g.id === id);
  if (game) {
    return (
      <main className="screen no-nav">
        <TopBar title={game.label} />
        <Empty>Bientôt ici : {game.label}.</Empty>
      </main>
    );
  }
  return (
    <main className="screen no-nav">
      <TopBar title="Jeu de société" />
      <div className="games">
        {GAMES.map(({ id, label, color, Icon }) => (
          <button key={id} className="big-tile" style={{ background: color }} onClick={() => go(`/jeu/${id}`)}>
            <Icon size={56} />
            {label}
          </button>
        ))}
      </div>
    </main>
  );
}
