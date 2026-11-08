import { TopBar, Empty } from '../ui/kit';

/** Création d’un jeu de société (page à construire). */
export function BoardGame() {
  return (
    <main className="screen no-nav">
      <TopBar title="Jeu de société" />
      <Empty>Bientôt ici : la création d’un jeu de société.</Empty>
    </main>
  );
}
