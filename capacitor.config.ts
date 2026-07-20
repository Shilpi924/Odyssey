import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.odyssey.app',
  appName: 'Odyssey',
  webDir: 'public',
  bundledWebRuntime: false,
  server: {
    url: 'https://odysseypro.vercel.app',
    cleartext: true
  }
};

export default config;
