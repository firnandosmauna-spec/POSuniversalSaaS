import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.posuniversalsaas.app',
  appName: 'POSUniversalSaaS',
  webDir: '.output/public',
  server: {
    url: 'http://192.168.18.22:5175',
    cleartext: true
  }
};

export default config;
