# United States and California Launch Readiness

Status: pre-production engineering record, last reviewed July 13, 2026.

This document records product facts, engineering controls, and unresolved launch gates. It is not legal advice, does not establish that any law applies or does not apply, and must not be represented as an attorney’s approval.

## Recommended initial scope

Market the first release as a California-first Yosemite pilot. Apply a United States federal and California baseline to the product, privacy notice, security practices, and incident planning. Do not describe the service as legally limited to California merely because its verified trail catalog is limited to Yosemite; an online service can still be accessed elsewhere and other laws may apply.

This scope is easier to review than a nationwide trail launch because the current catalog, park alerts, and verified coverage are already centered on Yosemite. Expansion to another state requires a new state-law and product-claim review before that state is marketed or its trail catalog is enabled.

## Release stages

### Personal localhost testing

Personal development and evaluation on `localhost` can continue without a Stadia key. Keep real personal data to the minimum needed for testing, do not enable community uploads, and do not treat this stage as a public or commercial release.

### Closed tester evaluation

Before inviting testers, use a controlled staging URL and register that staging host with Stadia domain authentication. Confirm that the evaluation remains noncommercial and within the provider’s free-plan terms and credit limits; otherwise upgrade first. Display the Privacy Notice and beta/safety warning, provide a private feedback channel, verify the contextual permission shown before the first precise-location request, and keep payments, advertising, analytics, public profiles, community uploads, and cloud GPS history disabled.

### Public production release

Run every production gate in this document when the operator selects the production domain or requests a production release. At that point, recheck current law and provider terms, complete the deployed-environment audit, make the Stadia plan/domain change, and make an informed decision about qualified legal review. This review is intentionally deferred during personal localhost testing.

## Audited product facts

| Data or feature | Current handling | External recipient or exposure |
| --- | --- | --- |
| Search terms, planning preferences, and short-lived verified results | Browser storage and transient Odyssey API requests | Odyssey server; Anthropic only when an optional AI feature is invoked |
| Approximate or precise search location | Browser memory and a transient request to Odyssey when location-based search is used | Odyssey server; ordinary request logs may exist |
| Active-hike GPS points and saved trail facts | IndexedDB on the user’s device | Not uploaded by the current routes |
| Display preferences | Browser storage and theme cookie; optional database storage for a signed-in user | Odyssey database when the user saves authenticated preferences |
| Account identity | Google sign-in and a JWT session cookie | Google, Odyssey session handling, and the preference database |
| Basemap and route display | Live provider requests; no Odyssey offline basemap package | Stadia Maps; OpenStreetMap infrastructure for identified relation geometry |
| External directions | User-selected outbound link | Google receives selected coordinates and ordinary network metadata |
| Community submissions, payments, ads, and analytics | Not enabled | None in the current product |

Recheck this inventory against runtime code, deployed configuration, provider contracts, logs, and infrastructure before every production release.

## Legal and regulatory baseline

### FTC Act and precise location

Privacy, security, safety, and performance statements must match actual behavior. Use data minimization, reasonable security, purpose limitation, and clear permission before collecting precise location. The FTC specifically recommends affirmative consent for precise geolocation and clear notice when location collection begins.

Engineering control: Search and Saved Hikes gate their first geolocation request behind an Odyssey explanation and affirmative action. Planning requests location only from its Use My Current Location action, scheduled themes do not request location without a remembered Odyssey choice, and hike recording has a separate explanation before tracking starts. Reverify these controls in the deployed browser build before inviting testers.

### California Online Privacy Protection Act

California Business and Professions Code section 22575 broadly requires a commercial online service collecting personally identifiable information from California consumers to conspicuously post a privacy policy. The policy requirements include collected-information and recipient categories, review/change processes if offered, material-change notices, an effective date, Do Not Track handling, and disclosure of possible third-party cross-site collection.

The public Privacy Notice now covers those headings based on the current audited behavior. It must be re-audited whenever a provider, data category, retention practice, or business model changes.

### California Consumer Privacy Act

Do not claim that Odyssey is CCPA compliant or exempt until the operator and counsel document the business facts. The statutory business thresholds include annual gross revenue over $25 million, buying, selling, or sharing personal information of 100,000 or more consumers or households, or deriving at least 50 percent of annual revenue from selling or sharing personal information. Thresholds and controlled-entity rules must be reassessed as the service grows.

Precise geolocation is sensitive personal information under California law. Even if Odyssey is below CCPA thresholds, use the stricter design baseline: collect only for a clear feature, avoid cloud GPS storage by default, do not use it for advertising, and provide deletion paths.

### Children

Odyssey is documented as a general-audience service not directed to children under 13. This statement is not an age-assurance control. Before production, counsel must approve the audience position and the operator must adopt a process for any actual knowledge that a child under 13 submitted personal information. Do not add child-directed design, profiles, community features, or targeted marketing without a COPPA review and required parental-consent controls.

### Security incidents and breach notification

Maintain a written incident-response and evidence-preservation procedure. California requires notification when defined unencrypted personal information is acquired, or reasonably believed acquired, by an unauthorized person; incidents affecting more than 500 California residents can require submission of a sample notice to the Attorney General. Counsel must determine scope and deadlines for an actual incident.

## Required engineering and operator decisions before production

These are project release controls, not a statement that every item is independently required by statute. Production release is blocked until all of the following are recorded:

- Legal operator name, entity type, business address, launch domain, and a private privacy/legal contact channel.
- Operator attestation covering for-profit status, revenue, California consumer or household volume, and any sale or sharing of personal information.
- An operator decision recording whether launch counsel was retained, what was reviewed, and any accepted residual risk.
- A contextual precise-location permission flow verified on Search, Saved Hikes, planning, and active-hike recording.
- A tested request procedure for access, correction, and deletion of server-side account preferences, including identity verification and response logging.
- A retention schedule for server logs, account preferences, support requests, and incident records.
- An incident-response owner, private escalation channel, breach-assessment checklist, and notification templates.
- A commercial Stadia plan and production-domain authentication.
- Confirmation that community uploads, public profiles, reviews, photos, and route sharing remain disabled until moderation, reporting, takedown, appeal, abuse-prevention, and audit controls are operational.
- A final deployed-environment review confirming that no undeclared analytics, advertising, session replay, pixels, or provider SDKs are active.

## Strongly recommended counsel review

There is no general rule that a software publisher must hire an attorney before releasing an app. Counsel review is recommended here because Odyssey combines precise location, accounts, changing outdoor conditions, safety-sensitive statements, and several third-party providers. The project owner previously selected jurisdiction-specific legal review as a launch safeguard; that is a risk-management decision rather than a claim that hiring counsel is always legally mandatory.

Qualified California and U.S. counsel can review the Terms, Privacy Notice, CalOPPA and CCPA analysis, age position, location consent, safety and liability language, accessibility exposure, provider contracts, entity structure, insurance, and incident plan using facts that cannot be established from source code alone. A limited private test with no payments, advertising, community content, or cloud GPS history presents a different risk profile from a public commercial launch.

## Expansion triggers

Repeat legal and engineering review before enabling any of the following:

- Marketing or verified trail coverage outside California.
- Community uploads, reviews, photos, public GPS routes, messaging, or public profiles.
- Cloud GPS history, background location, wearable integrations, or health/fitness data combinations.
- Payments, subscriptions, advertising, affiliate tracking, analytics, or session replay.
- New identity providers, AI providers, map/data providers, or data exports.
- A material change in data use, retention, audience, revenue, or consumer volume.

## Primary sources for counsel packet

- [California Business and Professions Code section 22575 (CalOPPA)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=22575)
- [California Civil Code section 1798.140 (CCPA definitions and thresholds)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.140)
- [California Attorney General CCPA overview](https://oag.ca.gov/privacy/ccpa)
- [California Attorney General breach-reporting guidance](https://oag.ca.gov/privacy/databreach/reporting)
- [FTC guidance for marketing mobile apps](https://www.ftc.gov/business-guidance/resources/marketing-your-mobile-app-get-it-right-start)
- [FTC children’s privacy guidance](https://www.ftc.gov/business-guidance/privacy-security/childrens-privacy)
- [FTC mobile health app and location-data best practices](https://www.ftc.gov/business-guidance/resources/mobile-health-app-developers-ftc-best-practices)
