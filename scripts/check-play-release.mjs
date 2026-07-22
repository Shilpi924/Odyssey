import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const production = process.argv.includes('--production');
const checks = [];

async function contains(relativePath, pattern, label) {
  try {
    const value = await readFile(path.join(root, relativePath), 'utf8');
    checks.push({ label, ok: pattern.test(value) });
  } catch {
    checks.push({ label, ok: false });
  }
}

async function exists(relativePath, label) {
  try {
    await access(path.join(root, relativePath));
    checks.push({ label, ok: true });
  } catch {
    checks.push({ label, ok: false });
  }
}

await contains('android/app/src/main/AndroidManifest.xml', /ACCESS_FINE_LOCATION/, 'foreground precise-location permission');
await contains('android/app/src/main/AndroidManifest.xml', /ACCESS_COARSE_LOCATION/, 'foreground approximate-location permission');
await contains('android/app/src/main/AndroidManifest.xml', /usesCleartextTraffic="false"/, 'Android cleartext traffic disabled');
await contains('android/app/src/main/AndroidManifest.xml', /android\.hardware\.location\.gps/, 'GPS hardware declaration');
await contains('android/variables.gradle', /targetSdkVersion\s*=\s*36/, 'target SDK 36');
await contains('capacitor.config.ts', /cleartext:\s*false/, 'Capacitor cleartext disabled');
await contains('package.json', /@capacitor\/geolocation/, 'Capacitor geolocation installed');
await exists('src/app/account-deletion/page.js', 'public web account-deletion page');
await exists('src/app/api/user/account/route.js', 'authenticated account-deletion API');
await exists('docs/play-store/DATA_SAFETY.md', 'Data Safety worksheet');
await exists('docs/play-store/DEVICE_TEST_PLAN.md', 'physical-device test plan');
await exists('docs/play-store/CLOSED_TESTING.md', 'closed-testing tracker');

if (production) {
  const requiredAttestations = [
    ['ODYSSEY_STADIA_COMMERCIAL_PLAN_CONFIRMED', 'commercial map plan confirmed'],
    ['ODYSSEY_STADIA_DOMAIN_AUTH_CONFIRMED', 'production map domain authenticated'],
    ['ODYSSEY_PHYSICAL_DEVICE_TEST_CONFIRMED', 'physical Android device tests passed'],
    ['ODYSSEY_PLAY_DATA_SAFETY_SUBMITTED', 'Play Data Safety form submitted'],
    ['ODYSSEY_CLOSED_TESTING_COMPLETED', 'required closed test completed or not applicable'],
  ];
  for (const [name, label] of requiredAttestations) {
    checks.push({ label, ok: process.env[name] === 'true' });
  }
  await exists('android/keystore.properties', 'release signing configured');
}

for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'}  ${check.label}`);
const failures = checks.filter((check) => !check.ok);
if (failures.length) {
  console.error(`\n${failures.length} release check(s) failed${production ? '. Complete the external attestations and signing setup before publishing.' : '.'}`);
  process.exitCode = 1;
} else {
  console.log(`\nAll ${production ? 'production' : 'local engineering'} Play release checks passed.`);
}
