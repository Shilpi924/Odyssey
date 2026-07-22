# Android Physical-Device Test Plan

Do not mark this complete using an emulator alone. Test a release-signed build on real hardware, outside the development Wi-Fi where practical.

## Device matrix

| Device / Android | Build version | Date | Tester | Result / defects |
| --- | --- | --- | --- | --- |
| Android 12 or lowest available |  |  |  |  |
| Android 15 or 16 |  |  |  |  |

## Required cases

1. Fresh install: confirm Odyssey explains location before Android shows its permission dialog.
2. Choose approximate location: nearby search must work or explain why precision is insufficient; it must not crash.
3. Change to precise location in Settings: nearby search, Saved, and Use My Current Location must update correctly.
4. Deny location: manual location search must remain usable and the app must show a recoverable explanation.
5. Deny and select “don’t ask again”: the app must not loop permission dialogs; verify the Settings recovery path.
6. Start hike tracking with precise permission: lock the screen, reopen the app, and confirm the route is accurate for the app’s documented foreground behavior. Do not expect background collection.
7. Stop and save a hike: confirm distance, time, route line, and protected start/end behavior.
8. Save a trail, load its route, enable airplane mode, and reopen it: facts and the saved route line should remain; the app must clearly state that the basemap requires a connection.
9. Verify all map requests use HTTPS and no cleartext networking error appears.
10. Sign in, sync a test preference/activity, open `/account-deletion`, delete, and verify the server rows and local records are gone while the Google account remains.
11. Exercise Back, app resume, rotation, large text, dark theme, and TalkBack on the location and deletion flows.
12. Leave hike tracking active for a representative trip and record battery use, GPS gaps, crash/ANR behavior, and device temperature.

Attach screenshots or a short screen recording to the release record for permission, offline, and deletion cases. Record every defect and rerun the affected case after fixing it.
