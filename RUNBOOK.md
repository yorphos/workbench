# Workbench operations

Node 24. HOST=127.0.0.1, PORT=8175, BASE_PATH=/workbench/, PUBLIC_URL and DATA_DIR are controller-owned. Standalone data defaults to ignored .data/. Run npm ci, npm run db:migrate, npm run build, then npm start. Private routes fail closed without APP_AUTH_PROXY_SECRET and the trusted Google gateway.

Schema migration is explicit in prepare, never hidden in health or browser tests. Version 1 creates studio.sqlite; no existing portfolio data is imported. Every workspace has a verified account owner and explicit members. Account SMTP keys live under DATA_DIR/keys, mode 0600, and belong with this app database in backups. Stop writers and back up the whole DATA_DIR before future migrations. Restore matching keys and database together. Missing keys fail closed.

Health GET /healthz does no jobs or external work. Public landing/docs/recipes/assets are read-only. API mutations require same-origin JSON and X-Studio-Request. Rendered outputs are generated locally with blocked network access. Sending uses each initiating account’s explicitly configured TLS SMTP connection; claimed sends become uncertain after restart and are never replayed automatically.

Verify isolated tests/build/browser workflows, then central prepare → plan/render → apply → actual URL checks. Public dedicated-domain release requires DNS/TLS and registered Google callbacks; do not broaden the existing private portfolio allowlist. Browser tests have synthetic proxy credentials, isolated keys/data, and no external services.

Current staged route: https://yrp-vm.tail16022f.ts.net/workbench/ . Read-only public materials are reachable on this origin; private workspaces retain the scoped Google gate. Dedicated public-domain enrollment remains disabled.
