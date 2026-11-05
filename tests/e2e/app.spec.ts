import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-21T17:00:00') });
});

test('accueil : chrono rapide et navigation', async ({ page }) => {
  await page.goto('./');
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

test('Mes séances : créer, 2 favoris au plus, puis toutes les séances', async ({ page }) => {
  for (const name of ['Séance A', 'Séance B', 'Séance C']) {
    await page.goto('./#/seances');
    await page.getByRole('button', { name: 'Créer' }).click();
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
  expect(m.name).toBe('Chrono');
  expect(m.display).toBe('standalone');
  expect(m.icons.length).toBeGreaterThanOrEqual(3);
  expect((await request.get('./sw.js')).ok()).toBe(true);
});
