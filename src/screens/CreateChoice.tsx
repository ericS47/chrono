import { go } from '../lib/router';
import { TopBar } from '../ui/kit';
import { IconBoardGame, IconDumbbell } from '../ui/icons';

/** Après « Créer » : choisir entre une séance de sport et un jeu de société. */
export function CreateChoice() {
  return (
    <main className="screen no-nav">
      <TopBar title="Créer" />
      <div className="choice-btns">
        <button className="create-btn big" aria-label="Séance de sport" onClick={() => go('/creer')}>
          <IconDumbbell size={64} />
        </button>
        <button className="create-btn big" aria-label="Jeu de société" onClick={() => go('/jeu')}>
          <IconBoardGame size={64} />
        </button>
      </div>
    </main>
  );
}
