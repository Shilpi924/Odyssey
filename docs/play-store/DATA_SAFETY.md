# Google Play Data Safety Worksheet

This is a conservative engineering draft, not a completed Play submission. Re-audit the exact deployed build, hosting logs, database, Google sign-in configuration, map/search/AI providers, retention, and contracts before answering in Play Console. The final form must match actual behavior.

## Top-level answers

- Does the app collect or share required user data types? **Yes.** Treat data sent off-device to Odyssey or a provider as collected unless the current Play definition clearly exempts that processing.
- Is all collected user data encrypted in transit? **Yes, if production verification confirms every endpoint and provider uses HTTPS.** Android cleartext is disabled.
- Can users request deletion? **Yes**, through the in-app Profile link and public `/account-deletion` web page. Verify the deployed URL and production database deletion before submission.
- Is the app independently certified against an eligible security standard? **No**, unless the operator obtains and documents one.
- Does the app sell data or use it for advertising? **No** in the current build.

## Data-type inventory to declare and verify

| Play category | Data | Collected? | Shared? | Purpose / notes |
| --- | --- | --- | --- | --- |
| Location | Approximate location | Yes, optional | Review provider treatment | Nearby discovery, park context, and location-based features. Coordinates may reach Odyssey; reduced precision is used for some community-provider searches. |
| Location | Precise location | Yes, optional | Review provider treatment | Foreground nearby search and user-started hike recording. GPS routes remain local unless a signed-in user explicitly backs up a completed activity. |
| Personal info | Name | Yes, optional | No other than service processing | Returned by Google sign-in for account display/authentication. |
| Personal info | Email address | Yes, optional | No other than service processing | Returned by Google sign-in and used to identify the signed-in account. |
| Personal info | User IDs | Yes, optional | No other than service processing | Google/Odyssey account identifier and session handling. |
| App activity | App interactions | Yes | Review hosting/provider logs | Search requests, feature requests, and ordinary security/reliability request metadata. No analytics SDK is intentionally installed. |
| App activity | In-app search history | Yes, optional | Review optional AI/search providers | Search terms can be processed by Odyssey and relevant search providers; browser search history is local. |
| User-generated content | Other user-generated content | Yes, optional | No | Activity title/notes, preferences, accessibility needs, and group-dynamics text when saved or submitted. Warn users not to enter sensitive data. |
| Health and fitness | Fitness info | Conservative: Yes, optional | No | Completed hike time, distance, pace, elevation, and route may be backed up. Confirm the current Play category mapping in Console. |
| Device or other IDs | Device or other identifiers | Review | Review | Ordinary IP address, user agent, cookies/session identifiers, and provider request metadata may qualify under current definitions. |

For every declared collected type, use these current characteristics unless deployment proves otherwise:

- Collection is optional where the user can use a manual or signed-out path.
- Purposes are **App functionality**, **Account management**, and **Security/fraud prevention** only where supported by the actual flow.
- Data is not used for advertising, marketing, personalization outside the user-requested app experience, or sale.
- Account preferences and backed-up activities are retained until the user deletes them or the service is retired; local data lasts until cleared; infrastructure logs follow the operator’s documented retention schedule.

## Provider verification

Before submission, decide under Play’s current definitions whether each transfer counts as “shared,” including any service-provider exception, and retain evidence:

- Google: authentication; external Maps directions only after user action.
- Stadia Maps: basemap requests and ordinary network metadata.
- OpenStreetMap/Nominatim/Overpass infrastructure: destination terms, reduced-precision location for nearby queries, trail/route lookup, and request metadata.
- National Park Service and California State Parks ArcGIS: official content/boundary/route requests and request metadata.
- Anthropic: only when optional Trail Guide/refinement is configured and invoked.
- Hosting/database vendors: application traffic, logs, signed-in preferences, and optional activity backups.

Official references: [Data Safety form guidance](https://support.google.com/googleplay/android-developer/answer/10787469), [User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311), and [account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111).
