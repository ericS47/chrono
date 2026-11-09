import type { CSSProperties, ReactNode } from 'react';

/**
 * Mise en page d'un jeu : le plateau occupe toute la place libre sans faire défiler
 * l'écran, en gardant ses proportions ; les informations vont dessous en portrait
 * et à droite en paysage.
 * `ratio` : largeur / hauteur du plateau ; `extra` : hauteur fixe en plus (px),
 * par exemple une ligne de titre au-dessus des cases.
 */
export function GameStage({ ratio, extra = 0, board, children }: { ratio: number; extra?: number; board: ReactNode; children: ReactNode }) {
  return (
    <div className="game-stage">
      <div className="game-board">
        <div className="game-board-fit" style={{ '--ratio': ratio, '--extra': `${extra}px` } as CSSProperties}>{board}</div>
      </div>
      <aside className="game-side">{children}</aside>
    </div>
  );
}
