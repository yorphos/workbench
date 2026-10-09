# Workbench operations

Node 24. HOST=127.0.0.1, PORT=8175, BASE_PATH=/workbench/, PUBLIC_URL and DATA_DIR are controller-owned. Standalone data defaults to ignored .data/. Run npm ci, npm run db:migrate, npm run build, then npm start. Private routes fail closed without APP_AUTH_PROXY_SECRET and the trusted Google gateway.

Schema migration is explicit in prepare, never hidden in health or browser tests. Version 1 creates studio.sqlite; no existing portfolio data is imported. Every workspace has a verified account owner and explicit members. Account SMTP keys live under DATA_DIR/keys, mode 0600, and belong with this app database in backups. Stop writers and back up the whole DATA_DIR before future migrations. Restore matching keys and database together. Missing keys fail closed.

Health GET /healthz does no jobs or external work. Public landing/docs/recipes/assets are read-only. API mutations require same-origin JSON and X-Studio-Request. Rendered outputs are generated locally with blocked network access. Sending uses each initiating account’s explicitly configured TLS SMTP connection; claimed sends become uncertain after restart and are never replayed automatically.

Verify isolated tests/build/browser workflows, then central prepare → plan/render → apply → actual URL checks. Public dedicated-domain release requires DNS/TLS and registered Google callbacks; do not broaden the existing private portfolio allowlist. Browser tests have synthetic proxy credentials, isolated keys/data, and no external services.

Current staged route: https://yrp-vm.tail16022f.ts.net/workbench/ . Read-only public materials are reachable on this origin; private workspaces retain the scoped Google gate. Dedicated public-domain enrollment remains disabled.

Workbench agent migration v1 creates workbench_schema and workbench_operations alongside Studio schema 1; `db:migrate` runs it explicitly. Back up DATA_DIR with writers stopped before adopting this release. Startup converts unfinished claimed operations to uncertain; lookup never redispatches. Render jobs retain their interrupted/failed/cancelled states and source revision.

Delegated routes default closed. Operations supplies ECOSYSTEM_SERVICE_ID, ECOSYSTEM_SERVICE_KEY and ECOSYSTEM_TRUST_KEYS at runtime. Explicit host environment bindings may supply AGENT_GRANTS_FILE and WORKBENCH_AGENT_ACCOUNTS_FILE, both outside the checkout, mode 0600. The account binding has `{"schemaVersion":1,"owners":{"standing-grant-owner":"verified-Google-account-SHA256"}}`; resolve it from an already verified accounts row, never from an email or an agent argument. AGENT_GRANTS_FILE uses the existing Foundation clients/grants contract, explicit Workbench capabilities and workspace resources; artifacts.export also needs a format constraint. Revoke the client/grant to deny retries and recovery reads. Grant files are re-read at dispatch. Missing provisioning does not prevent normal Google workspaces or anonymous catalog reads. Public ingress strips service assertions; access through a browser cannot authenticate these routes.

Do not install live gateway grants as part of the disposable pilot. Keep that acceptance under Foundation #55/#56. The pilot runs outside the workspace with fresh data and synthetic authority, no production services, repository creation, messages or paid providers.

## Current Pip v2 composition language

The complete editor/shell and new generated defaults use Foundation's exact
Preview-owned Pip language delivery. See vendor/professional/web/pip-ui.css and
vendor/professional/shared/pip-language.js for checked source identity. Public
Noto Sans fonts retain the OFL notice; no Breeze binary is bundled. Host appearance
is explicit in Links → Appearance and drives preview and export. Saved custom
themes are preserved; Use Pip v2 defaults is an explicit edit. On phones, workspace
management and secondary project actions use native disclosures, while Save,
Export, tool navigation and editing remain directly available. Invalid/raw drafts
keep the last valid content and preserve account/project/revision isolation.

Shared identity/link bodies are declaratively generated. Standalone ZIP fixtures
open after extraction and provide mock completion only. Native auth, link services,
fonts/skins and Pip geometry remain explicit app-owned adapters. Current native
references are YRPid 0145ad3c and Go df933875; old comparisons are historical.
Private configured-font parity and public fallback typography are separate checks.
No live service, credential or data change is part of source review/publication.
