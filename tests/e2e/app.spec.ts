import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-21T17:00:00') });
});

test('accueil : chrono rapide et navigation', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle('Pulse');
  await expect(page.getByText('Un peu Pulse chaque jour')).toBeVisible();
  await expect(page.locator('.big-tile')).toHaveCount(2);
  await page.locator('.big-tile', { hasText: 'Types de séances' }).click();
  await expect(page.getByRole('heading', { name: 'Types de séances' })).toBeVisible();
  for (const m of ['AMRAP', 'EMOM', 'For Time', 'Tabata', 'Intervalles', 'Chrono', 'Compte à rebours', 'Personnalisé', 'Musculation', 'Course', 'WOD connus']) {
    await expect(page.locator('.tile', { hasText: m }).first()).toBeVisible();
  }
  await expect(page.locator('.tile')).toHaveCount(11);
  await expect(page.getByRole('heading', { name: 'Mes séances' })).toHaveCount(0);
  await page.locator('.tile', { hasText: 'WOD connus' }).click();
  await expect(page.getByRole('link', { name: /Cindy/ })).toBeVisible();
  await page.getByRole('link', { name: 'Accueil' }).click();
  await page.locator('.big-tile', { hasText: 'Ma séance' }).click();
  await expect(page).toHaveURL(/#\/seances/);
  await expect(page.getByRole('tab', { name: 'Mes séances' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Favoris' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Créer' })).toBeVisible();
  await page.getByRole('link', { name: 'Accueil' }).click();
  await page.getByRole('link', { name: 'Planning' }).click();
  await expect(page.getByRole('heading', { name: 'Octobre' })).toBeVisible();
  await page.getByRole('link', { name: 'Réglages' }).click();
  await expect(page.getByRole('heading', { name: 'Réglages' })).toBeVisible();
});

test('Tabata complet : phases, pause, fin et enregistrement', async ({ page }) => {
  await page.goto('./#/rapide/tabata');
  await page.getByRole('button', { name: 'Démarrer' }).click();
  // Écran du chrono, avant le départ
  await expect(page.locator('.timer.idle')).toBeVisible();
  await page.getByRole('button', { name: 'Démarrer' }).click();
  await expect(page.locator('.timer.prep')).toBeVisible();
  await expect(page.getByTestId('timer-value')).toHaveText('10');
  await page.clock.runFor(10_500);
  await expect(page.locator('.timer.work')).toBeVisible();
  await expect(page.locator('.ring-phase')).toHaveText('EFFORT');
  await expect(page.locator('.timer-stats')).toContainText('1 / 8');
  await page.clock.runFor(20_000);
  await expect(page.locator('.timer.rest')).toBeVisible();
  await expect(page.locator('.ring-phase')).toHaveText('REPOS');

  // Pause : le temps ne bouge plus
  await page.getByRole('button', { name: 'Pause' }).click();
  const frozen = await page.getByTestId('timer-value').textContent();
  await page.clock.runFor(30_000);
  await expect(page.getByTestId('timer-value')).toHaveText(frozen!);
  await expect(page.getByText('EN PAUSE')).toBeVisible();
  await page.getByRole('button', { name: 'Reprendre', exact: true }).click();

  // Passer une phase à la main
  await page.getByRole('button', { name: 'Reprendre l’effort' }).click();
  await expect(page.locator('.timer-stats')).toContainText('2 / 8');

  // Fin de la séance
  await page.clock.runFor(6 * 30_000 + 30_000);
  await expect(page.getByText('Séance terminée')).toBeVisible();
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await page.getByRole('button', { name: '8', exact: true }).click();
  await page.getByLabel('Note').fill('Bonne séance');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tabata' })).toBeVisible();
  await expect(page.getByText('8 / 10')).toBeVisible();
  await page.goto('./#/seances?tab=historique');
  await expect(page.locator('.item', { hasText: 'Tabata' })).toBeVisible();
});

test('AMRAP : compteur de tours repris dans le résultat', async ({ page }) => {
  await page.goto('./#/rapide/amrap');
  await page.getByRole('button', { name: 'Démarrer' }).click();
  await page.getByRole('button', { name: 'Démarrer' }).click();
  await page.clock.runFor(11_000);
  await page.getByRole('button', { name: 'Ajouter un tour' }).click();
  await page.getByRole('button', { name: 'Ajouter un tour' }).click();
  await expect(page.getByTestId('round-count')).toHaveText('2');
  await page.getByRole('button', { name: 'Arrêter' }).click();
  await page.getByRole('button', { name: 'Terminer maintenant' }).click();
  await expect(page.locator('.stat', { hasText: 'tours' })).toContainText('2');
});

test('résultat prérempli conservé après rechargement de la page', async ({ page }) => {
  // For Time : temps réalisé
  await page.goto('./#/rapide/fortime');
  await page.getByRole('button', { name: 'Démarrer' }).click();
  await page.getByRole('button', { name: 'Démarrer' }).click();
  await page.clock.runFor(10_500);
  await expect(page.locator('.timer.work')).toBeVisible();
  await page.clock.runFor(3_000);
  await page.getByRole('button', { name: 'Terminé' }).click();
  await expect(page.getByText('Séance terminée')).toBeVisible();
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  const time = page.getByLabel('Temps réalisé', { exact: true });
  await expect(time).toBeVisible();
  const before = await time.inputValue();
  expect(before).not.toBe('0:00');
  await page.reload();
  await expect(page.getByText('Séance terminée')).toBeVisible();
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(time).toHaveValue(before);

  // AMRAP : tours complets
  await page.getByRole('button', { name: 'Ne pas enregistrer' }).click();
  await page.goto('./#/rapide/amrap');
  await page.getByRole('button', { name: 'Démarrer' }).click();
  await page.getByRole('button', { name: 'Démarrer' }).click();
  await page.clock.runFor(11_000);
  await page.getByRole('button', { name: 'Ajouter un tour' }).click();
  await page.getByRole('button', { name: 'Ajouter un tour' }).click();
  await page.getByRole('button', { name: 'Arrêter' }).click();
  await page.getByRole('button', { name: 'Terminer maintenant' }).click();
  await page.reload();
  await expect(page.locator('.stat', { hasText: 'tours' })).toContainText('2');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.locator('.row', { hasText: 'Tours complets' }).locator('output')).toHaveText('2');
});

test('créer, planifier et lancer une séance', async ({ page }) => {
  await page.goto('./#/editer/nouvelle');
  await page.getByLabel('Nom', { exact: true }).fill('Metcon jambes');
  await page.getByRole('button', { name: 'Ajouter un bloc' }).click();
  await page.locator('.sheet .tile', { hasText: 'Tabata' }).click();
  await page.getByRole('button', { name: 'Enregistrer la séance' }).click();
  await expect(page.getByRole('heading', { name: 'Metcon jambes' })).toBeVisible();
  await expect(page.getByText('AMRAP 12′')).toBeVisible();

  await page.getByRole('button', { name: 'Planifier' }).click();
  await page.getByLabel('Heure').fill('18:30');
  await page.getByRole('button', { name: 'Mer' }).click();
  await page.getByRole('button', { name: 'Jeu' }).click();
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.locator('.slot', { hasText: 'Metcon jambes' })).toBeVisible();

  await page.getByRole('link', { name: 'Accueil' }).click();
  const today = page.getByRole('region', { name: 'Séance du jour' });
  await expect(today).toContainText('Metcon jambes');
  await expect(today).toContainText('18:30');
  await today.getByRole('button', { name: 'Démarrer' }).click();
  await expect(page.locator('.timer')).toBeVisible();
  await expect(page.locator('.timer-top')).toContainText('Bloc 1 / 2');
});

test('WOD connu, partage par lien et import', async ({ page }) => {
  await page.goto('./#/seances?tab=wod');
  await page.getByRole('link', { name: /Cindy/ }).click();
  await page.getByRole('button', { name: 'Copier dans mes séances' }).click();
  await expect(page.getByRole('button', { name: 'Modifier' })).toBeVisible();
  await page.getByRole('button', { name: 'Partager' }).click();
  await expect(page.getByAltText('QR code de la séance')).toBeVisible();
  const url = await page.locator('.code-box').textContent();
  expect(url).toContain('#/partage/');
  await page.goto(url!.replace(/^.*#/, './#'));
  await expect(page.getByText('Cindy')).toBeVisible();
  await page.getByRole('button', { name: 'Ajouter à mes séances' }).click();
  await expect(page.getByRole('button', { name: 'Modifier' })).toBeVisible();
  await page.goto('./#/seances');
  await page.getByRole('button', { name: /Toutes mes séances/ }).click();
  await expect(page.locator('.item-title', { hasText: 'Cindy' })).toHaveCount(2);
});

test('réglages enregistrés et thème sombre', async ({ page }) => {
  await page.goto('./#/reglages');
  await page.getByRole('tab', { name: 'Sombre' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Préparation par défaut : plus' }).click();
  await expect(page.locator('output', { hasText: '15 s' })).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('output', { hasText: '15 s' })).toBeVisible();
});

test('chrono : affichage agrandi avec le tour en cours', async ({ page }) => {
  await page.goto('./#/rapide/tabata');
  await page.getByRole('button', { name: 'Démarrer' }).click();
  await page.getByRole('button', { name: 'Démarrer' }).click();
  await page.clock.runFor(10_500);
  await page.getByRole('button', { name: 'Agrandir le chrono' }).click();
  await expect(page.getByTestId('zoom-value')).toBeVisible();
  await expect(page.locator('.zoom-info')).toContainText('Tour 1 / 8');
  await expect(page.locator('.zoom-phase')).toHaveText('EFFORT');
  await expect(page.getByTestId('zoom-rest')).toContainText('Reste');
  await expect(page.getByTestId('zoom-rest')).toContainText('Ensuite : Repos');
  await expect(page.getByTestId('zoom-count')).toHaveText('1/8');
  await page.clock.runFor(20_000);
  await expect(page.locator('.zoom-phase')).toHaveText('REPOS');
  // Raccourcis sans quitter l'affichage agrandi
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.locator('.zoom-phase')).toHaveText('EN PAUSE');
  await page.getByRole('button', { name: 'Reprendre' }).click();
  await page.getByRole('button', { name: 'Étape suivante' }).click();
  await expect(page.locator('.zoom-info')).toContainText('Tour 2 / 8');
  await page.getByRole('button', { name: 'Revenir en arrière' }).click();
  await expect(page.locator('.zoom-phase')).toBeVisible();
  // Étape oubliée, ajoutée pendant la séance : 1 min d'effort juste après l'étape en cours
  await page.getByRole('button', { name: 'Ajouter une étape' }).click();
  await page.getByRole('dialog', { name: 'Ajouter une étape' }).getByRole('button', { name: 'Effort' }).click();
  await page.getByRole('button', { name: '1:00', exact: true }).click();
  await page.getByRole('button', { name: 'Ajouter après l’étape en cours' }).click();
  await expect(page.locator('.timer.zoom')).toBeVisible();
  await page.getByRole('button', { name: 'Étape suivante' }).click();
  await expect(page.locator('.zoom-phase')).toHaveText('EFFORT');
  await expect(page.getByTestId('zoom-value')).toHaveText('1:00');
  await page.locator('.timer.zoom').click();
  await expect(page.getByTestId('timer-value')).toBeVisible();
});

test('séance reprise au même point après fermeture de l’app', async ({ page }) => {
  await page.goto('./#/rapide/tabata');
  await page.getByRole('button', { name: 'Démarrer' }).click();
  await page.getByRole('button', { name: 'Démarrer' }).click();
  await page.clock.runFor(10_500 + 20_000 + 2_000);
  await expect(page.locator('.timer.rest')).toBeVisible();
  await page.goto('./');
  await page.reload();
  await expect(page.locator('.timer.rest, .timer.work')).toBeVisible();
  await expect(page.locator('.timer-stats')).toContainText('/ 8');
});

test('séance en pause reprise après fermeture de l’app : le chrono repart', async ({ page }) => {
  await page.goto('./#/rapide/tabata');
  await page.getByRole('button', { name: 'Démarrer' }).click();
  await page.getByRole('button', { name: 'Démarrer' }).click();
  await page.clock.runFor(1_500);
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByText('EN PAUSE')).toBeVisible();
  await page.reload();
  await expect(page.getByText('EN PAUSE')).toBeVisible();
  await page.getByRole('button', { name: 'Reprendre', exact: true }).click();
  await expect(page.locator('.ring-phase')).toHaveText('PRÊT ?');
  // Reste ~8,5 s de préparation : le chrono doit passer à l’effort.
  await page.clock.runFor(10_000);
  await expect(page.locator('.ring-phase')).toHaveText('EFFORT');
  await expect(page.locator('.timer-stats')).toContainText('1 / 8');
});

test('séance : les bips sont joués par une piste audio (arrière-plan)', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __tracks: number };
    w.__tracks = 0;
    const orig = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      if (this.src.startsWith('blob:') && this.duration > 5) w.__tracks++;
      return orig.call(this);
    };
  });
  // Réglage désactivé par défaut (il met en pause Spotify) : on l'active.
  await page.goto('./#/reglages');
  const bg = page.getByRole('switch', { name: 'Son en arrière-plan' });
  await bg.click();
  await expect(bg).toBeChecked();
  await page.goto('./#/rapide/tabata');
  await page.getByRole('button', { name: 'Démarrer' }).click();
  await page.getByRole('button', { name: 'Démarrer' }).click();
  await page.clock.runFor(3000);
  await expect.poll(() => page.evaluate(() => (window as unknown as { __tracks: number }).__tracks), { timeout: 15_000 }).toBeGreaterThan(0);
});

test('Créer : choix entre séance de sport et jeu de société', async ({ page }) => {
  await page.goto('./#/seances');
  await page.getByRole('button', { name: 'Créer' }).click();
  await expect(page).toHaveURL(/#\/nouvelle/);
  await page.getByRole('button', { name: 'Jeu de société' }).click();
  await expect(page.getByRole('heading', { name: 'Jeu de société' })).toBeVisible();
  for (const name of ['Bataille navale', 'Jeu de l’oie', 'Pulse Poly', '1000 Bornes', 'La roue de la santé', 'Mémo']) {
    await expect(page.getByRole('button', { name })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Bataille navale' }).click();
  await expect(page.getByRole('heading', { name: 'Bataille navale' })).toBeVisible();
  await page.getByRole('button', { name: 'Retour' }).click();
  await page.getByRole('button', { name: 'Retour' }).click();
  await page.getByRole('button', { name: 'Séance de sport' }).click();
  await expect(page).toHaveURL(/#\/creer/);
  await expect(page.getByLabel('Nom de la séance')).toBeVisible();
});

test('Bataille navale : réglages, tir raté, exercice de la ligne', async ({ page }) => {
  await page.goto('./#/jeu/bataille-navale');
  await expect(page.getByRole('heading', { name: 'Bataille navale' })).toBeVisible();
  await page.getByRole('radio', { name: 'Debout' }).click();
  await page.getByRole('tab', { name: 'Choisis' }).click();
  await expect(page.getByRole('button', { name: 'Lancer la partie' })).toBeDisabled();
  await page.getByRole('option', { name: 'Squat', exact: true }).click();
  await page.getByRole('button', { name: 'Répétitions : plus' }).click();
  await page.getByRole('button', { name: 'Lancer la partie' }).click();
  // Placement de ma flotte : un bateau à la main, puis le reste au hasard.
  await expect(page.getByRole('heading', { name: 'Place tes bateaux' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Commencer la partie' })).toBeDisabled();
  await page.getByRole('gridcell', { name: 'A1', exact: true }).click();
  await expect(page.getByRole('gridcell', { name: 'A5, bateau' })).toBeVisible();
  await page.getByRole('gridcell', { name: 'B2', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('ni se toucher');
  await page.getByRole('button', { name: 'Au hasard' }).click();
  await page.getByRole('button', { name: 'Commencer la partie' }).click();
  const enemy = page.getByRole('region', { name: 'Grille ennemie' });
  // Mode « Marquer » : un drapeau, et la case n'est plus jouable en mode « Tirer ».
  await page.getByRole('tab', { name: 'Marquer' }).click();
  await enemy.getByRole('gridcell', { name: 'J10', exact: true }).click();
  await expect(enemy.getByRole('gridcell', { name: 'J10, marquée' })).toBeVisible();
  await page.getByRole('tab', { name: 'Tirer' }).click();
  await expect(enemy.getByRole('gridcell', { name: 'J10, marquée' })).toBeDisabled();
  await expect(enemy.getByRole('gridcell')).toHaveCount(100);
  // Un seul exercice choisi : toutes les lignes sont des squats.
  await expect(page.getByRole('region', { name: 'Exercices des lignes' })).toContainText('A B C D E F G H I J');
  // On tire jusqu'au premier raté (l'ordinateur peut nous toucher entre-temps).
  for (let i = 0; i < 40; i++) {
    const dialog = page.getByRole('dialog');
    if (await dialog.isVisible()) {
      const raté = /^Raté/.test((await dialog.getAttribute('aria-label')) ?? '');
      await expect(dialog).toContainText('11 × Squat');
      await dialog.getByRole('button', { name: 'C’est fait' }).click();
      if (raté) break;
      continue;
    }
    const cell = enemy.locator('.bn-cell.empty:not(:disabled)').first();
    if (await cell.isVisible()) await cell.click();
    else await page.waitForTimeout(300);
  }
  await expect(page.getByLabel('Exercices faits')).not.toHaveText('0 ex.');
});

test('Jeu de l’oie : 2 joueurs, lancer les dés, exercices de la case', async ({ page }) => {
  await page.goto('./#/jeu/jeu-de-l-oie');
  await expect(page.getByRole('heading', { name: 'Jeu de l’oie' })).toBeVisible();
  await page.getByLabel('Nom du joueur 1').fill('Ana');
  await page.getByRole('button', { name: 'Ajouter un joueur' }).click();
  await page.getByLabel('Nom du joueur 2').fill('Léo');
  await page.getByRole('tab', { name: 'Choisis' }).click();
  await page.getByRole('option', { name: 'Squat', exact: true }).click();
  await page.getByRole('button', { name: 'Lancer la partie' }).click();
  await expect(page.locator('.goose-case')).toHaveCount(63);
  await expect(page.getByText('Au tour de Ana')).toBeVisible();
  await page.getByRole('button', { name: 'Lancer le dé' }).click();
  const dialog = page.getByRole('dialog', { name: 'Tour de Ana' });
  await expect(dialog).toContainText('10 × Squat');
  await dialog.getByRole('button', { name: 'C’est fait' }).click();
  await expect(page.getByText('Au tour de Léo')).toBeVisible();
});

test('Jeu de l’oie seul : l’ordinateur joue après moi', async ({ page }) => {
  await page.goto('./#/jeu/jeu-de-l-oie');
  await page.getByRole('button', { name: 'Lancer la partie' }).click();
  await expect(page.getByRole('list', { name: 'Joueurs' })).toContainText('L’ordinateur');
  await page.getByRole('button', { name: 'Lancer le dé' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /C’est fait|Continuer/ }).click();
  const bot = page.getByRole('dialog', { name: 'Tour de l’ordinateur' });
  await expect(bot).toBeVisible();
  await expect(bot.locator('.goose-ex')).toHaveCount(0);
  await bot.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByText('À toi de jouer')).toBeVisible();
});

test('Mémo : niveaux, paire retirée ou deux exercices, points', async ({ page }) => {
  await page.goto('./#/jeu/memo');
  await expect(page.getByRole('heading', { name: 'Mémo' })).toBeVisible();
  await page.getByRole('button', { name: 'Ajouter un joueur' }).click();
  await page.getByRole('radio', { name: /Expert/ }).click();
  await expect(page.getByRole('radio', { name: /Expert/ })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('radio', { name: /Facile/ }).click();
  // Choisis : il faut au moins 6 exercices différents pour le niveau facile.
  await page.getByRole('tab', { name: 'Choisis' }).click();
  await page.getByRole('option', { name: 'Squat', exact: true }).click();
  await expect(page.getByText('Il faut au moins 6 exercices')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lancer la partie' })).toBeDisabled();
  await page.getByRole('tab', { name: 'Aléatoires' }).click();
  await page.getByRole('button', { name: 'Lancer la partie' }).click();
  await expect(page.locator('.memo-card')).toHaveCount(12);
  for (let i = 0; i < 12; i++) {
    const backs = page.locator('.memo-card:not(.removed):not(.up)');
    await backs.nth(0).click();
    await backs.nth(0).click();
    const dialog = page.getByRole('dialog', { name: 'Pas une paire' });
    await expect.poll(async () => (await dialog.isVisible()) || (await page.locator('.memo-card.up').count()) === 0).toBe(true);
    if (!(await dialog.isVisible())) await expect(page.getByLabel(/^\d+ points?$/).first()).not.toHaveText('0 pt');
    if (await dialog.isVisible()) {
      await expect(dialog.locator('.goose-ex')).toHaveCount(2);
      await dialog.getByRole('button', { name: 'C’est fait' }).click();
      await expect(page.getByRole('status')).toContainText('Au tour de Joueur 2');
      return;
    }
    await page.waitForTimeout(100);
  }
});

test('Mémo seul : l’ordinateur joue après moi', async ({ page }) => {
  await page.goto('./#/jeu/memo');
  await page.getByRole('button', { name: 'Lancer la partie' }).click();
  await expect(page.getByRole('list', { name: 'Joueurs' })).toContainText('L’ordinateur');
  // Je retourne des cartes jusqu'à me tromper (une paire me fait rejouer).
  for (let i = 0; i < 6; i++) {
    const backs = page.locator('.memo-card:not(.removed):not(.up)');
    await backs.nth(0).click();
    await backs.nth(0).click();
    const dialog = page.getByRole('dialog', { name: 'Pas une paire' });
    // Soit la fenêtre des exercices, soit la paire retirée (plus aucune carte retournée).
    await expect.poll(async () => (await dialog.isVisible()) || (await page.locator('.memo-card.up').count()) === 0).toBe(true);
    if (await dialog.isVisible()) {
      await dialog.getByRole('button', { name: 'C’est fait' }).click();
      break;
    }
  }
  await expect(page.getByRole('status')).toContainText('L’ordinateur');
  // L'ordinateur retourne ses cartes tout seul, puis me rend la main (ou termine la partie).
  await expect(page.getByRole('status').filter({ hasText: 'À toi' }).or(page.getByRole('dialog', { name: 'Partie terminée' }))).toBeVisible({ timeout: 30_000 });
});

test('Roue de la santé : répétitions, la roue désigne un exercice ou un repos, fin de partie', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#/jeu/roue-de-la-sante');
  await expect(page.getByRole('heading', { name: 'La roue de la santé' })).toBeVisible();
  // 2 exercices dans la partie.
  for (let i = 0; i < 8; i++) await page.getByRole('button', { name: 'Nombre d’exercices : moins' }).click();
  await page.getByRole('button', { name: 'Lancer la partie' }).click();
  await expect(page.getByText('0 / 2')).toBeVisible();
  for (let i = 0; i < 12; i++) {
    if (await page.getByRole('dialog', { name: 'Partie terminée' }).isVisible()) break;
    await page.getByRole('button', { name: 'Faire tourner la roue' }).click();
    const sheet = page.locator('.wheel-sheet');
    await expect(sheet).toBeVisible();
    if ((await sheet.getAttribute('aria-label')) === 'Repos') await sheet.getByRole('button', { name: 'Passer' }).click();
    else {
      await expect(sheet).toContainText('10 ×');
      await sheet.getByRole('button', { name: 'C’est fait' }).click();
    }
  }
  const end = page.getByRole('dialog', { name: 'Partie terminée' });
  await expect(end).toContainText('20 répétitions');
});

test('Roue de la santé : en temps, le décompte se déclenche à la main', async ({ page }) => {
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#/jeu/roue-de-la-sante');
  await page.getByRole('tab', { name: 'Temps' }).click();
  await page.getByRole('button', { name: 'Lancer la partie' }).click();
  for (let i = 0; i < 10; i++) {
    await page.getByRole('button', { name: 'Faire tourner la roue' }).click();
    await page.clock.runFor(1000);
    const sheet = page.locator('.wheel-sheet');
    await expect(sheet).toBeVisible();
    if ((await sheet.getAttribute('aria-label')) !== 'Repos') break;
    await sheet.getByRole('button', { name: 'Passer' }).click();
  }
  const sheet = page.locator('.wheel-sheet');
  await expect(sheet.getByRole('timer')).toHaveText('0:30');
  await sheet.getByRole('button', { name: 'Démarrer le décompte' }).click();
  await page.clock.runFor(10_000);
  await expect(sheet.getByRole('timer')).toHaveText('0:20');
  await page.clock.runFor(21_000);
  await expect(sheet.getByRole('timer')).toHaveText('Fini !');
  await sheet.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByText('1 / 10')).toBeVisible();
});

test('Mes séances : créer, 2 favoris au plus, puis toutes les séances', async ({ page }) => {
  for (const name of ['Séance A', 'Séance B', 'Séance C']) {
    await page.goto('./#/seances');
    await page.getByRole('button', { name: 'Créer' }).click();
    await page.getByRole('button', { name: 'Séance de sport' }).click();
    await page.getByLabel('Nom de la séance').fill(name);
    await page.getByRole('button', { name: 'Effort', exact: true }).click();
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByRole('heading', { name })).toBeVisible();
    await page.getByRole('button', { name: 'Ajouter aux favoris' }).click();
    await expect(page.getByRole('button', { name: 'Retirer des favoris' })).toBeVisible();
  }
  await page.goto('./#/seances');
  await expect(page.getByRole('region', { name: 'Favoris' }).locator('.item-title')).toHaveCount(2);
  await page.getByRole('button', { name: /Toutes mes séances/ }).click();
  await expect(page.getByRole('region', { name: 'Toutes mes séances' }).locator('.item-title')).toHaveCount(3);
});

test('créateur : blocs, série, durée totale, enregistrement et lancement', async ({ page }) => {
  await page.goto('./#/creer');
  await expect(page.getByTestId('builder-total')).toHaveText('0:10');
  await page.getByLabel('Nom de la séance').fill('Fractionné maison');
  await page.getByRole('button', { name: 'Effort', exact: true }).click();
  await page.getByRole('button', { name: 'Repos', exact: true }).click();
  await expect(page.getByTestId('builder-total')).toHaveText('0:55');
  // Série de 4 : 30 s d'effort, 15 s de repos (retiré à la fin) → 4×30 + 3×15 = 165 s, + 10 s de préparation.
  await page.getByRole('button', { name: 'Série', exact: true }).click();
  await page.getByRole('button', { name: /^Effort 0:30/ }).click();
  await page.getByRole('button', { name: /^Repos 0:15/ }).click();
  await page.getByRole('button', { name: 'Créer', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Nouvelle série' })).toBeVisible();
  await page.getByRole('button', { name: 'Terminé' }).click();
  await expect(page.getByTestId('builder-total')).toHaveText('2:55');
  // Commentaire sur l'effort
  await page.getByRole('button', { name: /^Effort 0:30/ }).click();
  await page.getByLabel('Commentaire').fill('Burpees');
  await page.getByRole('button', { name: 'Terminé' }).click();
  await page.getByRole('button', { name: 'Lancer la séance' }).click();
  await expect(page.locator('.timer')).toBeVisible();
  await page.getByRole('button', { name: 'Démarrer' }).click();
  await page.clock.runFor(10_500);
  await expect(page.locator('.ring-phase')).toHaveText('EFFORT');
  await expect(page.locator('.ring-sub').first()).toContainText('Burpees');
  await expect(page.locator('.timer-stats')).toContainText('1 / 4');
  // La séance est enregistrée et se rouvre dans le créateur.
  await page.goto('./#/seances');
  await page.getByRole('button', { name: /Toutes mes séances/ }).click();
  await page.locator('.item-title', { hasText: 'Fractionné maison' }).click();
  await page.getByRole('button', { name: 'Modifier' }).click();
  await expect(page.getByLabel('Nom de la séance')).toHaveValue('Fractionné maison');
  await expect(page.getByTestId('builder-total')).toHaveText('2:55');
});

test('créateur : le dernier bloc ajouté reste visible, la durée reste en haut', async ({ page }) => {
  await page.goto('./#/creer');
  for (let i = 0; i < 12; i++) await page.getByRole('button', { name: i % 2 ? 'Repos' : 'Effort', exact: true }).click();
  const last = page.locator('.bd-timeline [data-node]').last();
  await expect.poll(async () => {
    const b = await last.boundingBox();
    const bar = await page.locator('.bd-bottom').boundingBox();
    return !!b && !!bar && b.y + b.height <= bar.y + 1;
  }).toBe(true);
  await expect(page.getByTestId('builder-total')).toBeInViewport();
  // En rouvrant le créateur (brouillon), la vue démarre sur les derniers blocs.
  await page.goto('./#/seances');
  await page.goto('./#/creer');
  await expect(last).toBeInViewport();
  await expect(page.getByTestId('builder-total')).toBeInViewport();
});

for (const [label, size] of [['portrait', { width: 390, height: 664 }], ['paysage', { width: 750, height: 340 }]] as const) {
  test(`jeux : le plateau tient dans l’écran (${label}), sans défilement`, async ({ page }) => {
    await page.setViewportSize(size);
    const games: [string, (p: typeof page) => Promise<void>][] = [
      ['jeu-de-l-oie', async (p) => { await p.getByRole('button', { name: 'Lancer la partie' }).click(); }],
      ['bataille-navale', async (p) => {
        await p.getByRole('button', { name: 'Lancer la partie' }).click();
        await p.getByRole('button', { name: 'Au hasard' }).click();
        await p.getByRole('button', { name: 'Commencer la partie' }).click();
      }],
      ['memo', async (p) => { await p.getByRole('button', { name: 'Lancer la partie' }).click(); }],
      ['pulse-party', async (p) => { await p.getByRole('button', { name: 'Commencer la partie' }).click(); }],
    ];
    for (const [id, start] of games) {
      await page.goto(`./#/jeu/${id}`);
      await start(page);
      const board = page.locator('.game-board-fit > *').first();
      await expect(board).toBeVisible();
      const fits = await page.evaluate(() => {
        const r = document.querySelector('.game-board-fit > *')!.getBoundingClientRect();
        return r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1
          && document.scrollingElement!.scrollHeight <= innerHeight + 1;
      });
      expect(fits, id).toBe(true);
    }
  });
}

test('Pulse Poly : sur une carte cardio libre, les 3 exercices sont détaillés', async ({ page }) => {
  // Dé toujours sur 4 : case 4, carte cardio libre.
  await page.addInitScript(() => { Math.random = () => 0.5; });
  await page.goto('./#/jeu/pulse-party');
  await page.getByRole('button', { name: 'Commencer la partie' }).click();
  await page.getByRole('button', { name: 'Lancer le dé' }).click();
  await expect(page.getByRole('button', { name: /^Acheter : 30 rép\. 15 Tipping · 10 Jumping jack · 5 Burpee/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Passer : 30 rép\. 15 Tipping · 10 Jumping jack · 5 Burpee/ })).toBeVisible();
});

test('annonces enregistrées : la voix du téléphone (qui coupe la musique) n’est plus utilisée', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __speak: number; __clips: number };
    w.__speak = 0; w.__clips = 0;
    speechSynthesis.speak = () => { w.__speak++; };
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (this: AudioBufferSourceNode, ...a: [number?, number?, number?]) {
      if (this.context instanceof AudioContext) w.__clips++;
      return start.apply(this, a);
    };
  });
  await page.goto('./#/rapide/tabata');
  // Les annonces enregistrées se chargent à l'ouverture de l'app.
  await page.waitForResponse((r) => r.url().endsWith('voix-fr.mp3'));
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Démarrer' }).click();
  await page.getByRole('button', { name: 'Démarrer' }).click();
  // « Préparation » tout de suite, puis « Go. Tour 1 sur 8 » au départ (programmés d'avance).
  await expect.poll(() => page.evaluate(() => (window as unknown as { __clips: number }).__clips)).toBeGreaterThan(3);
  expect(await page.evaluate(() => (window as unknown as { __speak: number }).__speak)).toBe(0);
});

/** Active « Son en arrière-plan » (piste audio), désactivé par défaut. */
async function backgroundSoundOn(page: import('@playwright/test').Page) {
  await page.goto('./#/reglages');
  const bg = page.getByRole('switch', { name: 'Son en arrière-plan' });
  await bg.click();
  await expect(bg).toBeChecked();
}

test('son en arrière-plan : la piste coupée par le téléphone est relancée', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __plays: number; __player?: HTMLMediaElement };
    w.__plays = 0;
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      if (this.src.startsWith('blob:') && this.duration > 5) { w.__plays++; w.__player = this; }
      return play.call(this);
    };
  });
  await backgroundSoundOn(page);
  await page.goto('./#/rapide/tabata');
  await page.getByRole('button', { name: 'Démarrer' }).click();
  await page.getByRole('button', { name: 'Démarrer' }).click();
  const plays = () => page.evaluate(() => (window as unknown as { __plays: number }).__plays);
  await expect.poll(plays, { timeout: 15_000 }).toBe(1);
  // Le téléphone met la piste en pause (appel, autre app…).
  await page.evaluate(() => (window as unknown as { __player: HTMLMediaElement }).__player.pause());
  await expect.poll(plays, { timeout: 15_000 }).toBe(2);
});

test('son en arrière-plan : piste qui ne se charge pas → bips en direct', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __osc: number };
    w.__osc = 0;
    // La piste ne se charge jamais : son adresse est ignorée.
    const desc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src')!;
    Object.defineProperty(HTMLMediaElement.prototype, 'src', {
      configurable: true,
      get() { return desc.get!.call(this); },
      set(v: string) { if (!String(v).startsWith('blob:')) desc.set!.call(this, v); },
    });
    const start = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (this: OscillatorNode, ...a: [number?]) {
      if (this.context instanceof AudioContext) w.__osc++;
      return start.apply(this, a);
    };
  });
  await backgroundSoundOn(page);
  await page.goto('./#/rapide/tabata');
  await page.getByRole('button', { name: 'Démarrer' }).click();
  await page.evaluate(() => { (window as unknown as { __osc: number }).__osc = 0; });
  await page.getByRole('button', { name: 'Démarrer' }).click();
  // Bips de la préparation (à 7, 8 et 9 s) : programmés en direct après l'échec de la piste.
  await expect.poll(() => page.evaluate(() => (window as unknown as { __osc: number }).__osc), { timeout: 15_000 }).toBeGreaterThan(0);
});

test('réglages : le bouton Tester joue bien le son', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __started: number };
    w.__started = 0;
    const orig = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (this: OscillatorNode, ...a: [number?]) {
      w.__started++;
      return orig.apply(this, a);
    };
  });
  await page.goto('./#/reglages');
  await page.getByRole('button', { name: 'Tester' }).first().click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __started: number }).__started)).toBeGreaterThan(0);
});

test('PWA : manifeste et service worker', async ({ page, request }) => {
  const res = await request.get('./manifest.webmanifest');
  expect(res.ok()).toBe(true);
  const m = await res.json();
  expect(m.name).toBe('Pulse');
  expect(m.display).toBe('standalone');
  expect(m.icons.length).toBeGreaterThanOrEqual(3);
  expect((await request.get('./sw.js')).ok()).toBe(true);
});

test('animation des exercices : active par défaut, affichée pendant l’effort seulement, et coupable', async ({ page }) => {
  await page.goto('./#/rapide/custom');
  await page.getByRole('button', { name: 'Démarrer' }).click();
  await page.getByRole('button', { name: 'Démarrer' }).click();
  await page.getByRole('button', { name: 'Go' }).click();
  await expect(page.getByTestId('anim-card')).toContainText('Squats');
  await expect(page.getByRole('img', { name: 'Animation : Squat' })).toBeVisible();
  // Aussi en plein écran (affichage agrandi).
  await page.getByRole('button', { name: 'Agrandir le chrono' }).click();
  await expect(page.getByTestId('zoom-anim').getByRole('img', { name: 'Animation : Squat' })).toBeVisible();
  await page.getByTestId('zoom-value').click();
  await page.getByRole('button', { name: /Passer au repos/ }).click();
  await expect(page.getByTestId('anim-card')).toHaveCount(0);
  await page.getByRole('button', { name: /Reprendre l’effort/ }).click();
  await expect(page.getByTestId('anim-card')).toContainText('Pompes');
  await page.getByRole('button', { name: 'Arrêter' }).click();
  await page.getByRole('button', { name: 'Abandonner sans enregistrer' }).click();

  // Avatar réglable, et animation coupable dans les réglages.
  await page.goto('./#/reglages');
  await page.getByText('Avatar et animation').click();
  await page.getByRole('tab', { name: 'Homme' }).click();
  await expect(page.getByRole('tab', { name: 'Homme' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('switch', { name: /Afficher pendant la séance/ })).toBeChecked();
  await page.getByRole('switch', { name: /Afficher pendant la séance/ }).click();
  await expect(page.getByRole('switch', { name: /Afficher pendant la séance/ })).not.toBeChecked();

  await page.goto('./#/rapide/custom');
  await page.getByRole('button', { name: 'Démarrer' }).click();
  await page.getByRole('button', { name: 'Démarrer' }).click();
  await page.getByRole('button', { name: 'Go' }).click();
  await expect(page.getByTestId('timer-value')).toBeVisible();
  await expect(page.getByTestId('anim-card')).toHaveCount(0);
});

test('créateur : choisir l’exercice animé d’un effort dans la liste', async ({ page }) => {
  await page.goto('./#/creer');
  await page.getByRole('button', { name: 'Effort', exact: true }).click();
  await page.getByRole('button', { name: /^Effort 0:30/ }).click();
  await page.getByRole('button', { name: 'Exercice animé' }).click();
  // Sans matériel par défaut ; le filtre kettlebell montre les exercices avec kettlebell.
  await expect(page.getByRole('radio', { name: 'Sans matériel' })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('radio', { name: 'Kettlebell' }).click();
  await expect(page.getByRole('option', { name: 'Goblet squat' })).toBeVisible();
  await expect(page.getByRole('option', { name: 'Fente', exact: true })).toHaveCount(0);
  await expect(page.getByRole('option', { name: 'Fente (kettlebell)' })).toBeVisible();
  // Position « Chaise », puis matériel « Haltères » : les exercices assis aux haltères.
  await expect(page.getByRole('radio', { name: 'Debout' })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('radio', { name: 'Chaise' }).click();
  await page.getByRole('radio', { name: 'Haltères' }).click();
  await expect(page.getByRole('option', { name: 'Curl biceps assis (haltères)' })).toBeVisible();
  await expect(page.getByRole('option', { name: 'Goblet squat' })).toHaveCount(0);
  // Variantes générées : triceps aux haltères sur chaise, et sans matériel sur chaise.
  await expect(page.getByRole('option', { name: 'Extension triceps assis (haltères)' })).toBeVisible();
  await page.getByRole('radio', { name: 'Sans matériel' }).click();
  await expect(page.getByRole('option', { name: 'Bûcheron assis' })).toBeVisible();
  await page.getByRole('radio', { name: 'Debout' }).click();
  await page.getByRole('radio', { name: 'Sans matériel' }).click();
  await page.getByRole('option', { name: 'Fente', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Animation : Fente' })).toBeVisible();
  await page.getByRole('button', { name: 'Terminé' }).click();
  await expect(page.getByRole('button', { name: /^Effort 0:30, Fente/ })).toBeVisible();
  // Miniature de l'exercice sur le bloc.
  await expect(page.locator('.bd-blk .bd-thumb svg')).toHaveCount(1);
  await page.getByRole('button', { name: 'Lancer la séance' }).click();
  await page.getByRole('button', { name: 'Démarrer' }).click();
  await page.clock.runFor(10_500);
  await expect(page.locator('.ring-phase')).toHaveText('EFFORT');
  await expect(page.getByTestId('anim-card')).toContainText('Fente');
  await expect(page.getByRole('img', { name: 'Animation : Fente' })).toBeVisible();
  await page.getByRole('button', { name: 'Arrêter' }).click();
  await page.getByRole('button', { name: 'Abandonner sans enregistrer' }).click();

  // Animation coupée : plus de liste ni de miniature dans le créateur.
  await page.goto('./#/avatar');
  await page.getByRole('switch', { name: /Afficher pendant la séance/ }).click();
  await expect(page.getByRole('switch', { name: /Afficher pendant la séance/ })).not.toBeChecked();
  await page.goto('./#/creer');
  await page.getByRole('button', { name: 'Effort', exact: true }).click();
  await expect(page.locator('.bd-thumb')).toHaveCount(0);
  await page.getByRole('button', { name: /^Effort 0:30/ }).first().click();
  await expect(page.getByLabel('Commentaire')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Exercice animé' })).toHaveCount(0);
});

test('créateur : copier un bloc de travail l’ajoute à la fin de la séance', async ({ page }) => {
  await page.goto('./#/creer');
  await page.getByRole('button', { name: 'Effort', exact: true }).click();
  await page.getByRole('button', { name: 'Bloc de travail', exact: true }).click();
  await page.getByRole('button', { name: /^Effort 0:30/ }).click();
  await page.getByRole('button', { name: 'Créer', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Nouveau bloc de travail' })).toBeVisible();
  await page.getByLabel('Nom', { exact: true }).fill('Cardio');
  await page.getByRole('button', { name: 'Terminé' }).click();
  // Un repos après le bloc de travail.
  await page.getByRole('button', { name: 'Repos', exact: true }).click();
  await expect(page.locator('.bd-group')).toHaveCount(1);
  // Copier le bloc de travail : la copie va tout en bas, après le repos.
  // Toucher l'en-tête du bloc de travail : même menu que l'appui long.
  await page.locator('.bd-group-head').first().click();
  await expect(page.getByRole('dialog', { name: 'Cardio' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Cardio' }).getByRole('button', { name: 'Régler' })).toBeVisible();
  await page.getByRole('button', { name: 'Copier', exact: true }).click();
  await expect(page.locator('.bd-group')).toHaveCount(2);
  const order = await page.locator('[data-node]').evaluateAll((els) =>
    els.filter((e) => !e.parentElement?.closest('[data-node]')).map((e) => (e.classList.contains('bd-group') ? 'bloc' : e.textContent?.includes('Repos') ? 'repos' : 'autre')));
  expect(order.slice(-3)).toEqual(['bloc', 'repos', 'bloc']);
});

test('créateur : copier un effort l’ajoute à la fin de la séance', async ({ page }) => {
  await page.goto('./#/creer');
  await page.getByRole('button', { name: 'Effort', exact: true }).click();
  await page.getByRole('button', { name: 'Repos', exact: true }).click();
  await page.getByRole('button', { name: /^Effort 0:30/ }).click();
  await page.getByLabel('Commentaire').fill('Squats');
  await page.getByRole('button', { name: 'Copier', exact: true }).click();
  const labels = await page.locator('.bd-blk[data-node]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  expect(labels).toEqual(['Effort 0:30, Squats', 'Repos 0:15', 'Effort 0:30, Squats']);
});

test('créateur : déplacer un bloc avec la poignée, ou avec Monter / Descendre', async ({ page }) => {
  await page.goto('./#/creer');
  await page.getByRole('button', { name: 'Effort', exact: true }).click();
  await page.getByRole('button', { name: 'Repos', exact: true }).click();
  await page.getByRole('button', { name: 'Effort', exact: true }).click();
  await page.getByRole('button', { name: /^Effort 0:30/ }).first().click();
  await page.getByLabel('Commentaire').fill('Squats');
  await page.getByRole('button', { name: 'Terminé' }).click();
  const labels = () => page.locator('.bd-blk[data-node]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  expect(await labels()).toEqual(['Effort 0:30, Squats', 'Repos 0:15', 'Effort 0:30']);
  // Poignée : le repos glissé tout en bas.
  const grip = await page.locator('.bd-blk.rest .bd-grip').boundingBox();
  const last = await page.locator('.bd-blk[data-node]').last().boundingBox();
  await page.mouse.move(grip!.x + grip!.width / 2, grip!.y + grip!.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(grip!.x + grip!.width / 2, grip!.y + (last!.y + last!.height * 0.8 - grip!.y) * (i / 8));
  await page.mouse.up();
  await expect.poll(labels).toEqual(['Effort 0:30, Squats', 'Effort 0:30', 'Repos 0:15']);
  // Appui long : Monter.
  const rest = page.getByRole('button', { name: /^Repos 0:15/ });
  const r = await rest.boundingBox();
  await page.mouse.move(r!.x + 30, r!.y + r!.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
  await page.getByRole('dialog').getByRole('button', { name: 'Monter' }).click();
  await expect.poll(labels).toEqual(['Effort 0:30, Squats', 'Repos 0:15', 'Effort 0:30']);
});

test('Pulse Poly : préparer une partie, acheter une case, la partie est sauvegardée', async ({ page }) => {
  // Dé toujours sur 1 : on tombe sur la case 1 (exercice).
  await page.addInitScript(() => { Math.random = () => 0; });
  await page.goto('./#/jeu');
  await page.getByRole('button', { name: 'Pulse Poly' }).click();
  await page.getByLabel('Joueur 1').fill('Eric');
  await page.getByLabel('Joueur 2').fill('Marie');
  await expect(page.getByText('Le premier joueur qui fait 4 tours de plateau gagne')).toBeVisible();
  await page.getByRole('button', { name: 'Commencer la partie' }).click();
  await expect(page.locator('.pp-sq')).toHaveCount(40);
  await expect(page.getByRole('heading', { name: /course en 4 tours/ })).toBeVisible();
  await expect(page.locator('.pp-player').first()).toContainText('0/4 tours');
  await page.getByRole('button', { name: 'Lancer le dé' }).click();
  await page.getByRole('button', { name: /^Acheter : 30 rép\./ }).click();
  await expect(page.locator('.pp-tasks')).toContainText('30');
  await page.getByRole('button', { name: 'C’est fait' }).click();
  await expect(page.locator('.pp-player').first()).toContainText('1 case · 30 rép.');
  // Marie tombe chez Eric : 20 répétitions.
  await page.getByRole('button', { name: 'Lancer le dé' }).click();
  await expect(page.locator('.pp-panel')).toContainText('Chez Eric');
  await expect(page.locator('.pp-tasks')).toContainText('20');
  // La partie est reprise après rechargement.
  await page.reload();
  await expect(page.locator('.pp-panel')).toContainText('Chez Eric');
});
