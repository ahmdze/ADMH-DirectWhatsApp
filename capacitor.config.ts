import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.admh.directwhatsapp',
  appName: 'واتساب المباشر',
  webDir: 'dist',
  backgroundColor: '#06110f',
  server: {
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: false
  },
  plugins: {
    // Reminder notifications use a white silhouette generated from the PWA
    // monochrome icon (android/tools/generate-icons.py) tinted with the app accent.
    LocalNotifications: {
      smallIcon: 'ic_stat_reminder',
      iconColor: '#6EE7B7'
    }
  }
};

export default config;
