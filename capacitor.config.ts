import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.posuniversalsaas.app',
  appName: 'POSUniversalSaaS',
  webDir: '.output/public',
  server: {
    url: 'https://mypos-mu.vercel.app',
    cleartext: true
  }
};

export default config;
