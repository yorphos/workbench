import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import blueprint from "../app-blueprint.json";
import {
  Recipe,
  Field,
  Button,
  ActionBar,
} from "../vendor/foundation/creation/ui.js";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../vendor/foundation/react/dialog";
import "../vendor/foundation/web/foundation.css";
import "../vendor/foundation/creation/ui.css";
import "./app.css";
import "./theme.css";
type Item = {
  id: string;
  name: string;
  details: string;
  revision: number;
  status: string;
  proposal: null | { name: string; details: string; digest: string };
};
const base = import.meta.env.BASE_URL;
function App() {
  const [session, setSession] = useState<any>(null),
    [items, setItems] = useState<Item[]>([]),
    [selectedId, setSelected] = useState(""),
    [name, setName] = useState(""),
    [details, setDetails] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false),
    [appearance, setAppearance] = useState(
      () => localStorage.getItem("appearance") || "light",
    );
  const current = useRef(""),
    abort = useRef(new AbortController()),
    generation = useRef(0);
  const screen =
    blueprint.screens.find(
      (s) => s.path === "/" + location.pathname.slice(base.length),
    ) || blueprint.screens[0];
  const selected = items.find((i) => i.id === selectedId);
  async function request(path: string, method = "GET", data?: unknown) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Studio-Request": "1",
    };
    if (method !== "GET") headers["X-App-Account"] = current.current;
    const response = await fetch(base + path, {
      method,
      headers,
      body: data === undefined ? undefined : JSON.stringify(data),
      signal: abort.current.signal,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Request failed.");
    return result;
  }
  async function refresh() {
    const token = ++generation.current;
    const s = await request("api/session");
    if (token !== generation.current) return;
    if (current.current && current.current !== s.account.id) {
      abort.current.abort();
      abort.current = new AbortController();
      setItems([]);
      setSelected("");
      setName("");
      setDetails("");
      setConfirm(false);
    }
    current.current = s.account.id;
    setSession(s);
    setItems(s.records);
    setSelected((id) =>
      s.records.some((r: Item) => r.id === id)
        ? id
        : new URLSearchParams(location.search).get("record") ||
          s.records[0]?.id ||
          "",
    );
  }
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
    const focus = () => refresh().catch((e) => setError(e.message));
    window.addEventListener("focus", focus);
    return () => {
      abort.current.abort();
      window.removeEventListener("focus", focus);
    };
  }, []);
  useEffect(() => {
    setName(selected?.proposal?.name || selected?.name || "");
    setDetails(selected?.proposal?.details || selected?.details || "");
  }, [selected?.id, selected?.revision]);
  function navigate(id: string) {
    const target = blueprint.screens.find((s) => s.id === id);
    if (target)
      location.assign(
        base +
          target.path.slice(1) +
          (selectedId ? "?record=" + encodeURIComponent(selectedId) : ""),
      );
  }
  function select(id: string) {
    setSelected(id);
    history.replaceState(
      null,
      "",
      location.pathname + "?record=" + encodeURIComponent(id),
    );
  }
  async function act(action: string, input: any) {
    const account = current.current;
    setBusy(true);
    setError("");
    try {
      const r = await request("api/actions/" + action, "POST", {
        ...input,
        operationId: crypto.randomUUID(),
      });
      if (current.current !== account) return;
      setSession((s: any) => ({ ...s, receipts: [r.receipt, ...s.receipts] }));
      if (r.record) setSelected(r.record.id);
      await refresh();
      setConfirm(false);
    } catch (e: any) {
      if (e.name !== "AbortError") setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const receipt = session?.receipts?.[0];
  return (
    <div className="pf-app pilot-shell" data-pf-theme={appearance}>
      <header className="pilot-header">
        <a className="pf-brand" href={base}>
          <span className="pilot-mark" aria-hidden="true">
            {blueprint.product.mark}
          </span>
          <span className="pf-brand-copy">
            <span className="pf-brand-name">{blueprint.product.name}</span>
            <span className="pf-brand-signature">
              by <b>YRP</b>
            </span>
          </span>
        </a>
        <div className="pilot-account">
          <Button
            variant="subtle"
            onClick={() => {
              const next = appearance === "dark" ? "light" : "dark";
              setAppearance(next);
              localStorage.setItem("appearance", next);
            }}
          >
            {appearance === "dark" ? "Light appearance" : "Dark appearance"}
          </Button>
          {session && <span>{session.account.email}</span>}
          <a
            href={
              "/oauth2/sign_out?rd=" +
              encodeURIComponent(location.origin + base)
            }
          >
            Sign out
          </a>
        </div>
      </header>
      <div className="pilot-workspace">
        <nav className="pilot-nav" aria-label="Application sections">
          {blueprint.screens.map((s) => (
            <a
              key={s.id}
              href={
                base +
                s.path.slice(1) +
                (selectedId ? "?record=" + encodeURIComponent(selectedId) : "")
              }
              aria-current={screen.id === s.id ? "page" : undefined}
            >
              {s.title}
            </a>
          ))}
        </nav>
        <main className="pilot-main">
          {error && <p role="alert">{error}</p>}
          {!session ? (
            <Recipe
              recipe="sign-in"
              title="Open your private workspace"
              description={error || "Checking your verified account…"}
              onSignIn={() =>
                location.assign(
                  "/oauth2/sign_in?rd=" + encodeURIComponent(location.href),
                )
              }
            />
          ) : (
            <>
              <Recipe
                key={
                  screen.id +
                  ":" +
                  selectedId +
                  ":" +
                  (selected?.revision || 0) +
                  ":" +
                  session.settings.revision
                }
                recipe={screen.recipe}
                title={screen.title}
                description={screen.description}
                state={
                  busy
                    ? "disabled"
                    : screen.recipe === "change-review" && selected?.proposal
                      ? "awaiting_review"
                      : "ready"
                }
                rows={items}
                selectedId={
                  screen.recipe === "navigation" ? screen.id : selectedId
                }
                onSelect={select}
                navigation={blueprint.screens.map((s) => ({
                  id: s.id,
                  name: s.title,
                }))}
                onNavigate={navigate}
                settings={session.settings}
                onSave={(values) => {
                  void act("settings", {
                    ...values,
                    revision: session.settings.revision,
                  });
                }}
                onCreate={(values) => {
                  void act("create", values);
                }}
                onSignIn={() =>
                  location.assign(
                    "/oauth2/sign_in?rd=" + encodeURIComponent(location.href),
                  )
                }
                before={
                  selected
                    ? selected.name + "\n" + selected.details
                    : "Choose an item first."
                }
                after={
                  selected?.proposal
                    ? selected.proposal.name + "\n" + selected.proposal.details
                    : "No proposal awaiting review."
                }
                onAccept={
                  selected?.proposal ? () => setConfirm(true) : undefined
                }
                onDiscard={
                  selected?.proposal
                    ? () => {
                        void act("discard", {
                          id: selected.id,
                          revision: selected.revision,
                        });
                      }
                    : undefined
                }
                task={{
                  status: receipt?.status || "No operation yet",
                  progress: receipt ? 100 : undefined,
                  message:
                    receipt?.outcome || "No background task has been started.",
                }}
                receipt={
                  receipt || {
                    outcome: "No operation yet",
                    revision: "Unavailable",
                    evidence: "Unavailable",
                    delivery: "No external delivery",
                  }
                }
              />
              {selected &&
                ["list-detail", "data-table", "change-review"].includes(
                  screen.recipe,
                ) && (
                  <section
                    className="pilot-editor"
                    aria-label="Propose an item revision"
                  >
                    <h2>Propose a revision</h2>
                    <p>
                      Current revision {selected.revision}. Your original
                      remains intact until acceptance.
                    </p>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void act("propose", {
                          id: selected.id,
                          revision: selected.revision,
                          name,
                          details,
                        });
                      }}
                    >
                      <Field label="Proposed name">
                        <input
                          value={name}
                          required
                          maxLength={120}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </Field>
                      <Field label="Proposed details">
                        <textarea
                          value={details}
                          maxLength={4000}
                          onChange={(e) => setDetails(e.target.value)}
                        />
                      </Field>
                      <ActionBar>
                        <Button type="submit" disabled={busy}>
                          Save proposal for review
                        </Button>
                        <Button
                          variant="subtle"
                          disabled={busy}
                          onClick={() =>
                            navigate(
                              blueprint.screens.find(
                                (s) => s.recipe === "change-review",
                              )?.id || "",
                            )
                          }
                        >
                          Open review
                        </Button>
                      </ActionBar>
                    </form>
                  </section>
                )}
              {receipt && (
                <aside className="pilot-receipt" role="status">
                  {receipt.outcome} · Revision {receipt.revision}
                </aside>
              )}
            </>
          )}
          <Dialog open={confirm} onOpenChange={setConfirm}>
            <DialogContent>
              <DialogTitle>Apply this reviewed revision?</DialogTitle>
              <DialogDescription>
                The server will check the current account and item revision
                before replacing the original.
              </DialogDescription>
              <p>{selected?.proposal?.name}</p>
              <DialogFooter>
                <Button variant="subtle" onClick={() => setConfirm(false)}>
                  Keep reviewing
                </Button>
                <Button
                  disabled={busy}
                  onClick={() => {
                    if (selected)
                      void act("accept", {
                        id: selected.id,
                        revision: selected.revision,
                      });
                  }}
                >
                  Apply reviewed changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
