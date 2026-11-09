import type { ComponentType } from 'react';
import { go } from '../lib/router';
import { TopBar, Empty } from '../ui/kit';
import { Battleship } from './Battleship';
import { Goose } from './Goose';
import { Memo } from './Memo';
import { HealthWheel } from './HealthWheel';
import { GameScreen } from './Game';
import { IconBattleship, IconGoose, IconMemo, IconMilestone, IconProperty, IconWheel } from '../ui/icons';

export const GAMES: { id: string; label: string; color: string; Icon: ComponentType<{ size?: number }> }[] = [
  { id: 'bataille-navale', label: 'Bataille navale', color: '#9BD3F5', Icon: IconBattleship },
  { id: 'jeu-de-l-oie', label: 'Jeu de l’oie', color: '#B5D98A', Icon: IconGoose },
  { id: 'pulse-party', label: 'Pulse Poly', color: '#FFBE98', Icon: IconProperty },
  { id: '1000-bornes', label: '1000 Bornes', color: '#FFC93C', Icon: IconMilestone },
  { id: 'roue-de-la-sante', label: 'La roue de la santé', color: '#F5A8C8', Icon: IconWheel },
  { id: 'memo', label: 'Mémo', color: '#B9A6FF', Icon: IconMemo },
];

/** Jeux de société : la liste, puis la page d’un jeu (à construire). */
export function BoardGame({ id }: { id?: string }) {
  if (id === 'bataille-navale') return <Battleship />;
  if (id === 'jeu-de-l-oie') return <Goose />;
  if (id === 'memo') return <Memo />;
  if (id === 'roue-de-la-sante') return <HealthWheel />;
  if (id === 'pulse-party') return <GameScreen />;
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
