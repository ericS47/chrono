import { useEffect, useState } from 'react';
import { useRoute, go } from './lib/router';
import { useSchedules, useSettings, useWorkouts } from './data/hooks';
import { pruneHistory } from './data/db';
import { restoreSession, setFinishHandler } from './engine/session';
import { setKeepAwake, syncReminders } from './lib/platform';
import { IconCalendar, IconHome, IconList, IconSettings } from './ui/icons';
import { Home } from './screens/Home';
import { Planning } from './screens/Planning';
import { Library } from './screens/Library';
import { SettingsScreen } from './screens/Settings';
import { WorkoutDetail } from './screens/WorkoutDetail';
import { Editor } from './screens/Editor';
import { QuickSetup } from './screens/QuickSetup';
import { TimerScreen } from './screens/Timer';
import { ResultScreen } from './screens/Result';
import { LogDetail } from './screens/LogDetail';
import { ImportShared } from './screens/ImportShared';
import { ScheduleForm } from './screens/ScheduleForm';

const TABS = [
  { path: '', label: 'Accueil', Icon: IconHome },
  { path: 'planning', label: 'Planning', Icon: IconCalendar },
  { path: 'seances', label: 'Séances', Icon: IconList },
  { path: 'reglages', label: 'Réglages', Icon: IconSettings },
];

function useSystemDark(): boolean {
  const [dark, setDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const fn = () => setDark(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return dark;
}

export function App() {
  const route = useRoute();
  const settings = useSettings();
  const schedules = useSchedules();
  const workouts = useWorkouts();
  const systemDark = useSystemDark();
  const [head, ...rest] = route;

  const dark = settings.theme === 'dark' || (settings.theme === 'system' && systemDark);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#14161B' : '#F7F6F3');
  }, [dark]);

  // Écran allumé tant que l'app est ouverte (réglage).
  useEffect(() => {
    setKeepAwake(settings.keepAwake);
  }, [settings.keepAwake]);

  // Nettoyage automatique de l'historique ancien.
  useEffect(() => {
    void pruneHistory(settings.historyMonths);
  }, [settings.historyMonths]);

  // Rappels des séances planifiées.
  useEffect(() => {
    if (schedules && workouts) void syncReminders(schedules, workouts).catch(() => undefined);
  }, [schedules, workouts]);

  useEffect(() => {
    setFinishHandler(() => go('/resultat', true));
    // App fermée par le téléphone pendant une séance : on la reprend là où elle en est.
    const restored = restoreSession();
    if (restored) go(restored.run.status === 'finished' ? '/resultat' : '/chrono', true);
    return () => setFinishHandler(null);
  }, []);

  // Accolades obligatoires : scrollTo renvoie une Promise dans les Chrome récents,
  // que React prendrait pour une fonction de nettoyage.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [head, rest[0]]);

  let screen: JSX.Element;
  let nav = true;
  switch (head) {
    case undefined: screen = <Home />; break;
    case 'planning': screen = <Planning />; break;
    case 'seances': screen = <Library />; break;
    case 'reglages': screen = <SettingsScreen />; break;
    case 'seance': screen = <WorkoutDetail id={rest[0]} />; nav = false; break;
    case 'editer': screen = <Editor id={rest[0]} />; nav = false; break;
    case 'rapide': screen = <QuickSetup mode={rest[0]} />; nav = false; break;
    case 'chrono': screen = <TimerScreen />; nav = false; break;
    case 'resultat': screen = <ResultScreen />; nav = false; break;
    case 'saisie': screen = <ResultScreen manual />; nav = false; break;
    case 'historique': screen = <LogDetail id={rest[0]} />; nav = false; break;
    case 'partage': screen = <ImportShared code={rest[0]} />; nav = false; break;
    case 'planifier': screen = <ScheduleForm />; nav = false; break;
    default: screen = <Home />;
  }

  return (
    <div className="app">
      {screen}
      {nav && (
        <nav className="nav" aria-label="Navigation principale">
          {TABS.map(({ path, label, Icon }) => (
            <a key={label} href={`#/${path}`} aria-current={(head ?? '') === path ? 'page' : undefined}>
              <Icon />
              {label}
            </a>
          ))}
        </nav>
      )}
    </div>
  );
}
