# Workbench

Interfaces with a considered starting point. Part of the YRP professional toolset.

Theme tokens with light/dark palettes and contrast checks; nine canonical React recipes, thirteen explicit state fixtures, versioned application blueprints, independent app exports, registry items, SVG/PNG release materials, and portable handoff kits.

## Workspaces and sharing

Google identities use the verified immutable subject, never email or admin role as ownership. Each account starts with no workspace. Owners create teams and invite named editors or project-only client reviewers; invitations expire after seven days and can be revoked. Ownership transfer requires an existing editor. Clients see published snapshots and explicitly shared files. Saving uses revision checks; publishing and recorded decisions bind the exact revision and SHA-256 digest. Fieldwork proposal acceptance additionally requires a designated client, typed name and explicit consent. This is recorded acceptance, not certified e-signature.

All three products import and export schema-versioned `.yrp-kit.zip` snapshots. Sources and assets have checksums and bounded sizes; imports create a new project and private attachments, never code execution, membership, credentials or live links. Source templates are fictional.

## Run locally

Use Node 24 and Chromium:

```sh
npm ci
npm run db:migrate
npm run build
npx playwright install chromium
npm start
```

`HOST=127.0.0.1`, `PORT`, `BASE_PATH`, `PUBLIC_URL` and `DATA_DIR` configure the runtime. Build with the intended `BASE_PATH`. Standalone storage defaults to `.data`; schema creation is an explicit migration. Private workspaces require the trusted Google OIDC gateway. Set an independent `APP_AUTH_PROXY_SECRET` and have the authenticated proxy overwrite `X-Portfolio-Secret`, `X-Portfolio-User` (verified Google subject), `X-Portfolio-Email` and `X-Portfolio-Role`; prevent direct external app access. No password, human key login, or anonymous private fallback exists. The public landing, docs, recipes and compiled assets remain read-only.

The current portfolio launch uses the existing Tailscale origin at `/workbench/`, with the existing Google account gate. Dedicated public domains and open enrollment are future deployment configuration, not active access policy. New invited users need host-approved Google access while this staged deployment remains restricted.

## Mail and exports

SMTP connections belong to the initiating account and are encrypted with a separate account key in this app's data directory. Only TLS 465 or STARTTLS 587 to public DNS addresses are supported. Exact sender, recipients, HTML/plain text and attachments are reviewed before explicit confirmation. Attempts are claimed durably before dispatch, and SMTP acceptance is distinguished from inbox delivery. Confirmed failures permit up to two explicit reviewed retries. Interrupted/ambiguous outcomes stay uncertain and are never automatically replayed. Tests send only through an injected synthetic transport.

PDF and PNG rendering runs locally, one job at a time, with network access blocked. Source revisions survive cancellation/failure/restart. Job/output reads require account ownership and current project access. Keep the database and matching encryption keys together; see [RUNBOOK.md](RUNBOOK.md) and [recovery-profile.json](recovery-profile.json).

## Verification

```sh
npm test
npm run build
npm run test:browser
```

Browser fixtures use isolated databases/keys and synthetic proxy identity for `yorphos@gmail.com`; other identities are synthetic isolation fixtures. They do not prove real Google consent or actual SMTP delivery. Browser checks cover desktop/mobile, keyboard dialog focus, save/publish/comment/export and invitations. Contract tests cover foreign-account denial, client grants, revocation, revisions, safe kits, encrypted connection ownership, uncertain-send handling, restoration and real local PDF output.

## Source and releases

Original application code, recipes and the explicitly selected `vendor/professional` profile are MIT. DM Sans retains its OFL license; dependencies retain upstream licenses. The remaining private Foundation code is excluded. This independent clone builds without sibling checkouts or access to Foundation. Vendor files are receipt-verified release bundles: change canonical Foundation and synchronize, never hand-edit a bundle. No host configuration, credentials, databases or private history are published.

## Create apps with framework and agents

Workbench consumes the canonical Foundation `professional-creation` release. Preview, screenshots, registry source and generated apps share `creation/ui.js`; fixture callbacks are labelled and never report a real save, acceptance or delivery. Product copy, marks, layout and domain behavior remain app-owned. Each blueprint pins the Foundation version and source digest, screen/recipe versions, states, runtime and callback bindings. The first supported runtime is React + TypeScript + Vite, Node 24, account-owned SQLite and verified Google integration. Other profiles remain unresolved until their adapters are implemented; export refuses unresolved blueprints.

```sh
npm run workbench -- catalog
npm run workbench -- inspect --recipe change-review
npm run workbench -- blueprint --name "Review desk" > app-blueprint.json
npm run workbench -- validate --blueprint app-blueprint.json
npm run workbench -- plan --blueprint app-blueprint.json
npm run workbench -- preview --blueprint app-blueprint.json --out /tmp/review-preview.html
npm run workbench -- scaffold --blueprint app-blueprint.json --out /tmp/review-desk
npm run workbench -- adoption --target /tmp/review-desk
```

The CLI returns JSON. It does not install dependencies, create a repository, enroll a service or deploy. Scaffold accepts an empty directory only. The generated review adapter implements actual create/propose/accept/discard actions, account-owned settings and durable receipts; it is a starting domain adapter to replace for your product. Generated AGENTS.md, RUNNER.toml, migrations, lockfile and prefix-aware tests keep the app independent. Preview HTML is a static fixture with blueprint/release/fixture evidence. Adoption reports changed managed files, rejects edited bundles and requires review; the existing Foundation release gate remains the authority for shared consumer releases.

The Blueprint panel edits routes and bindings. Application ZIP includes the complete supported runtime. Interface demo ZIP is a fictional UI fixture. Blueprint JSON contains no grants or credentials. Read `/r/catalog.json` for discovery and `/r/blueprint-schema.json` for validation contracts. Each [registry item](https://ui.shadcn.com/docs/registry/registry-item-json) includes canonical scoped UI, tokens and local fonts with their license; import its CSS once rather than globally replacing product styles.

Hosted tools are declared in capabilities.json. The receiver requires loopback transport, an Ed25519 service assertion, signed delegation, a currently installed owner grant and a private owner-to-verified-account binding. It never accepts account identity in tool arguments. Only explicit workspace grants permit private inspection, project creation/update, exports and operation recovery. Human and agent actions use the same StudioStore/config/RenderQueue paths. Binary archives use authenticated download handles; bounded text retrieval stays below the gateway envelope. No paid calls, SMTP sends, acceptance or deployment capability is exported.

Live external gateway enrollment follows Foundation #55 and #56; offline and isolated receiver tests do not establish live OpenClaw/Foreman acceptance. See RUNBOOK.md for the closed-default configuration.
