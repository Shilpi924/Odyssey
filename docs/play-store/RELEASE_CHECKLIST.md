# Odyssey Google Play Release Checklist

Last engineering review: July 21, 2026. Package ID: `com.odyssey.app`. Current version: `1.0` (`versionCode 1`). Target SDK: 36.

## Nine-step status

| Step | Status | Evidence or remaining action |
| --- | --- | --- |
| 1. Native foreground location | Implemented | Capacitor Geolocation adapter, coarse/fine Android permissions, and required GPS feature. No background-location permission. |
| 2. Physical Android GPS test | Operator gate | Run `DEVICE_TEST_PLAN.md` on at least one Android 12 device and one Android 15/16 device if available. Record results. |
| 3. Truthful offline behavior | Implemented | Saved facts and route lines work offline; copy explicitly says the basemap needs a connection. Simulated download UI was removed. |
| 4. Production map plan/domain | Commercial gate | Purchase an appropriate Stadia Maps plan and authenticate the final production host. Do not claim this is complete from source code alone. |
| 5. Disable cleartext traffic | Implemented | Capacitor and Android application configuration both reject cleartext HTTP. |
| 6. Lint generated output correctly | Implemented | Generated `android/**` output is globally ignored; source remains linted. |
| 7. Release signing and AAB | Ready for secret setup | Run the upload-key script, back up the key, then run `npm run android:bundle`. Enroll in Play App Signing when the Play Console app is created. |
| 8. Data Safety | Prepared, submission gate | Complete and verify `DATA_SAFETY.md` against the deployed build, then submit it in Play Console. |
| 9. Closed testing | Time/account gate | If the personal developer account was created after Nov. 13, 2023, complete 12 continuously opted-in testers for 14 days and apply for production access. |

## Local commands

```bash
npm run lint
npm test
npm run build
npm run play:check
```

Generate an upload key once, using an absolute path outside the repository:

```bash
./scripts/generate-android-upload-key.sh /absolute/secure/path/odyssey-upload.jks
npm run android:bundle
```

Back up the `.jks` file and `android/keystore.properties` securely. The properties file contains the password and is intentionally ignored by Git. Prefer Google Play App Signing: Google protects the app-signing key while this local key is the replaceable upload key.

Immediately before upload, run the production gate with each operator attestation set to `true`:

```bash
ODYSSEY_STADIA_COMMERCIAL_PLAN_CONFIRMED=true \
ODYSSEY_STADIA_DOMAIN_AUTH_CONFIRMED=true \
ODYSSEY_PHYSICAL_DEVICE_TEST_CONFIRMED=true \
ODYSSEY_PLAY_DATA_SAFETY_SUBMITTED=true \
ODYSSEY_CLOSED_TESTING_COMPLETED=true \
npm run play:check:production
```

An attestation means the action was actually completed; it is not a bypass.

## Final Play Console work

- Create the app with package ID `com.odyssey.app`; a Play package ID cannot be changed after first upload.
- Enroll in Play App Signing and upload the signed AAB from `android/app/build/outputs/bundle/release/app-release.aab`.
- Upload phone screenshots, feature graphic, icon, short description, and full description.
- Use `https://odysseypro.vercel.app/legal/privacy` as the privacy-policy URL only after verifying that deployment is current and reachable.
- Use `https://odysseypro.vercel.app/account-deletion` as the account-deletion URL only after verifying Google sign-in and deletion against the production database.
- Set the target audience as general audience, not directed to children under 13, if that remains accurate.
- Complete App access, Ads, Content rating, Data Safety, Government apps, Financial features, Health, and any other current Play declarations truthfully.
- Keep location foreground-only. Re-review policy before adding background tracking.

Official references: [target API requirements](https://developer.android.com/google/play/requirements/target-sdk), [personal-account testing requirement](https://support.google.com/googleplay/android-developer/answer/14151465), [Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469), and [account deletion](https://support.google.com/googleplay/android-developer/answer/13327111).
