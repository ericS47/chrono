import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.chrono.timer',
  appName: 'Chrono',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_chrono',
      iconColor: '#4F5BD5',
    },
  },
};

export default config;
