---
name: ops-legal
description: >-
  Draft product legal copy (Privacy Policy, Terms/Disclaimer, copyright notices)
  for workspaces like OmniCast. Use when the user asks for privacy, terms,
  ToS, warranty disclaimer, copyright, Play Store legal, or "abogado" drafts.
  Not licensed legal advice — always mark drafts for human review.
---

# ops-legal

You draft **clear, honest legal-ish documents** for apps in `workspaces.yaml`.
You are **not** a lawyer. Every output must say it is a **draft for human review**.

## When to use

- Privacy Policy / Terms of Use / Disclaimer / warranty “AS IS”
- Copyright / third-party attribution notes
- About-screen short legal blurb
- Play Store “Data safety” narrative (text only; user fills Console)

## Inputs

1. Read `workspaces.yaml` → pick `workspace` id (default: ask once via **ops-escalate** if unclear).
2. Read that product’s `README.md` and About/brand copy if present (e.g. OmniCast: LAN cast, no account, Shields, tip jar, YouTube/Netflix out of scope).
3. Confirm with the user only if missing: **operator name**, **contact email**, **tip jar URL**, **hosting URL for the published policy** (GitHub Pages / repo path).

## Deliverables (write files)

Prefer writing under the **product repo** when the user approved the job:

- `docs/legal/PRIVACY.md`
- `docs/legal/TERMS.md`
- `docs/legal/COPYRIGHT.md` (short)

Or under ops-agent: `docs/legal/drafts/<workspace>-YYYY-MM-DD-*.md` if the product path must not change yet.

### Required header on every draft

```markdown
> **DRAFT — not legal advice.** Review with a qualified attorney before Play Store /
> public launch. Operator is solely responsible for accuracy and compliance.
```

## Content rules (OmniCast-shaped defaults)

### Privacy

- Local / LAN first: casting, sniffer, Shields blocklists on-device, media cache.
- No mandatory account; tip jar opens an **external** site (their privacy applies there).
- List Android permissions in plain language (network, storage/SAF, notifications for cast foreground).
- No sale of personal data; no cloud backend claimed unless the README says otherwise.
- Contact email for privacy requests.

### Terms / Disclaimer (user intent: strong “use at your own risk”)

Include, in professional English (Spanish summary OK in chat):

- Software provided **AS IS**, **no warranties** (merchantability, fitness, uninterrupted service, cast reliability).
- User responsible for: content they cast, websites they visit, network setup (guest Wi‑Fi / AP isolation), destination devices.
- Not affiliated with Google, Chromecast, YouTube, Netflix, Pluto, or other trademarks mentioned for identification only.
- No support for DRM / partner Cast of those services.
- Tips/donations are voluntary and **do not** purchase warranty or priority support.
- Limitation of liability to the maximum extent permitted by law (no liability for data loss, service bans, TV failure, etc.).

Do **not** promise “Universal” casting or “works on every TV”.

### Copyright

- © year + operator / project name.
- Third-party: list known attributions (e.g. HaGeZi GPL-3.0 for Shields) with links.
- “Not affiliated with…” block.

## Process

1. **ops-scope-guard**: do not publish to Play Console; only draft files.
2. Draft the three docs (or only those requested).
3. Suggest About links: Privacy · Terms (URLs once hosted).
4. End with **Needs review**: checklist for the human (email, tip URL, jurisdiction if any, attorney pass).

## Forbidden

- Claiming the draft is “court-proof” or “Play approved”.
- Hiding that the app can be used to access third-party sites (user remains responsible).
- Auto-filing anything on Google Play.
