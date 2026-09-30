import { useState } from "react";
import { Sun, Moon, Smartphone, Monitor, Code, Check } from "lucide-react";
import { Studio, Field } from "../vendor/professional/react/studio";
import type { Product, EditorProps } from "../vendor/professional/react/studio";
import { themeVars, ThemeFields } from "../vendor/professional/react/theme";
import { contrast } from "../vendor/professional/shared/model.js";
import {
  seed,
  recipes,
  states,
  componentSource,
  graphic,
} from "../shared/recipes.js";
function Editor({ data, onChange, module, readonly }: EditorProps) {
  const set = (key: string, value: any) => onChange({ ...data, [key]: value });
  return (
    <fieldset disabled={readonly}>
      <Field label="Project name">
        <input
          value={data.name}
          onChange={(e) => set("name", e.target.value)}
        />
      </Field>
      {module === "theme" ? (
        <>
          <ThemeFields value={data.theme} onChange={(t) => set("theme", t)} />
          <p className="contrast-note">
            Text contrast:{" "}
            {contrast(data.theme.light.text, data.theme.light.surface).toFixed(
              2,
            )}
            :1 · Dark:{" "}
            {contrast(data.theme.dark.text, data.theme.dark.surface).toFixed(2)}
            :1. Aim for 4.5:1 for regular text.
          </p>
        </>
      ) : (
        <>
          <Field label="Interface recipe">
            <select
              value={data.recipe}
              onChange={(e) => set("recipe", e.target.value)}
            >
              {recipes.map((r) => (
                <option value={r.id} key={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Heading">
            <input
              value={data.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </Field>
          <Field label="Supporting copy">
            <textarea
              value={data.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>
          {module === "states" && (
            <Field label="State fixture">
              <select
                value={data.state}
                onChange={(e) => set("state", e.target.value)}
              >
                {states.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          )}
          {module === "publish" && (
            <Field label="Graphic layout">
              <select
                value={data.graphic}
                onChange={(e) => set("graphic", e.target.value)}
              >
                <option value="social">Social card · 1200 × 630</option>
                <option value="release">Release graphic · 1200 × 1080</option>
                <option value="screenshot">Interface screenshot</option>
              </select>
            </Field>
          )}
          {module === "handoff" && (
            <>
              <Field label="Implementation notes">
                <textarea
                  value={data.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </Field>
              <p className="handoff-note">
                Your starter contains this component, semantic CSS, theme
                tokens, state fixtures, a working Vite app, browser checks, and
                dependency declarations.
              </p>
            </>
          )}
        </>
      )}
    </fieldset>
  );
}
export function Preview({ data, module }: { data: any; module: string }) {
  const [dark, setDark] = useState(false),
    [mobile, setMobile] = useState(false),
    [code, setCode] = useState(false),
    [notice, setNotice] = useState(""),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState("Release plan"),
    [step, setStep] = useState(1),
    [open, setOpen] = useState(true),
    [reverse, setReverse] = useState(false);
  const state = data.state,
    rows = ["Release plan", "Research notes", "Client handoff"];
  return (
    <>
      <div className="preview-controls">
        <div className="actions">
          <button
            aria-label="Toggle preview appearance"
            onClick={() => setDark(!dark)}
          >
            {dark ? <Sun size={13} /> : <Moon size={13} />}{" "}
            {dark ? "Dark" : "Light"}
          </button>
          <button
            aria-label="Toggle preview width"
            onClick={() => setMobile(!mobile)}
          >
            {mobile ? <Smartphone size={13} /> : <Monitor size={13} />}{" "}
            {mobile ? "Mobile" : "Desktop"}
          </button>
        </div>
        <button onClick={() => setCode(!code)}>
          <Code size={13} /> {code ? "Preview" : "Source"}
        </button>
      </div>
      {code ? (
        <pre style={{ padding: 20 }}>{componentSource(data.recipe)}</pre>
      ) : module === "publish" && data.graphic !== "screenshot" ? (
        <img
          className="graphic-preview"
          alt="Your composed release graphic"
          src={
            "data:image/svg+xml;charset=utf-8," +
            encodeURIComponent(graphic(data))
          }
        />
      ) : (
        <div
          className={"pattern-frame " + (mobile ? "mobile" : "")}
          style={themeVars(data.theme, dark)}
        >
          <div className="pattern-inner">
            <div className="preview-label">
              {recipes.find((r) => r.id === data.recipe)?.name} / {state}
            </div>
            <h1>{data.title}</h1>
            <p>
              {state === "long" ? data.description.repeat(8) : data.description}
            </p>
            {state === "loading" ? (
              <p role="status">Loading your workspace…</p>
            ) : state === "empty" ? (
              <p>No items yet. Create your first project.</p>
            ) : state === "error" ? (
              <p role="alert">
                We couldn’t load this view. Your saved work is safe.
              </p>
            ) : (
              <>
                {data.recipe === "change-review" && (
                  <>
                    <div className="pattern-split">
                      <section>
                        <h2>Before</h2>
                        <p>Weekly update with unresolved notes.</p>
                      </section>
                      <section>
                        <h2>After</h2>
                        <p>
                          A clear update with decisions and supporting links.
                        </p>
                      </section>
                    </div>
                    <div className="actions">
                      <button
                        disabled={state === "disabled"}
                        onClick={() =>
                          setNotice("Changes accepted in this local example.")
                        }
                      >
                        <Check size={14} /> Accept changes
                      </button>
                      <button
                        onClick={() =>
                          setNotice("Changes discarded. Original retained.")
                        }
                      >
                        Keep original
                      </button>
                    </div>
                  </>
                )}
                {data.recipe === "settings" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setNotice("Settings saved in this example.");
                    }}
                  >
                    <Field label="Display name">
                      <input defaultValue="Studio team" required />
                    </Field>
                    <Field label="Notification preference">
                      <select>
                        <option>Important updates</option>
                        <option>All updates</option>
                      </select>
                    </Field>
                    <label>
                      <input type="checkbox" defaultChecked /> Show detailed
                      progress
                    </label>
                    <button disabled={state === "disabled"}>
                      Save settings
                    </button>
                  </form>
                )}
                {data.recipe === "sign-in" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setNotice(
                        "Account handoff example. Connect your own authentication provider.",
                      );
                    }}
                  >
                    <Field label="Email">
                      <input
                        type="email"
                        required
                        placeholder="you@example.com"
                      />
                    </Field>
                    <button disabled={state === "disabled"}>
                      Continue with your account
                    </button>
                    <p>Authentication stays with your application.</p>
                  </form>
                )}
                {data.recipe === "data-table" && (
                  <>
                    <Field label="Find a project">
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </Field>
                    <table>
                      <caption>Example projects</caption>
                      <thead>
                        <tr>
                          <th>
                            <button onClick={() => setReverse(!reverse)}>
                              Project {reverse ? "↓" : "↑"}
                            </button>
                          </th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(reverse ? [...rows].reverse() : rows)
                          .filter((r) =>
                            r.toLowerCase().includes(query.toLowerCase()),
                          )
                          .map((r) => (
                            <tr key={r}>
                              <td>{r}</td>
                              <td>In review</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </>
                )}
                {data.recipe === "list-detail" && (
                  <div className="pattern-split">
                    <nav aria-label="Example queue">
                      {rows.map((r) => (
                        <button key={r} onClick={() => setSelected(r)}>
                          {r}
                        </button>
                      ))}
                    </nav>
                    <section>
                      <h2>{selected}</h2>
                      <p>
                        Review its scope, current revision, and outstanding
                        decisions.
                      </p>
                    </section>
                  </div>
                )}
                {data.recipe === "navigation" && (
                  <>
                    <button aria-expanded={open} onClick={() => setOpen(!open)}>
                      Menu
                    </button>
                    {open && (
                      <nav aria-label="Workspace navigation">
                        {["Overview", "Projects", "Settings"].map((r) => (
                          <button key={r} onClick={() => setSelected(r)}>
                            {r}
                          </button>
                        ))}
                      </nav>
                    )}
                    <p>Selected: {selected}</p>
                  </>
                )}
                {data.recipe === "multi-step" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (step < 3) setStep(step + 1);
                      else setNotice("Your example project is ready.");
                    }}
                  >
                    <p>Step {step} of 3</p>
                    <Field
                      label={
                        step === 1
                          ? "Project name"
                          : step === 2
                            ? "Primary audience"
                            : "Success criteria"
                      }
                    >
                      <input key={step} required />
                    </Field>
                    <div className="actions">
                      {step > 1 && (
                        <button type="button" onClick={() => setStep(step - 1)}>
                          Back
                        </button>
                      )}
                      <button>{step === 3 ? "Finish" : "Continue"}</button>
                    </div>
                  </form>
                )}
                {data.recipe === "task-progress" && (
                  <>
                    <progress
                      max="100"
                      value={state === "success" ? 100 : 60}
                      aria-label="Task progress"
                    />
                    <p>Draft saved. Reviewing the remaining changes.</p>
                    <div className="actions">
                      <button
                        disabled={state === "disabled"}
                        onClick={() =>
                          setNotice("Stopped. The saved draft is preserved.")
                        }
                      >
                        Stop task
                      </button>
                      <button
                        onClick={() =>
                          setNotice(
                            "Continuation requested in this local example.",
                          )
                        }
                      >
                        Continue
                      </button>
                    </div>
                  </>
                )}
                {data.recipe === "outcome-receipt" && (
                  <dl>
                    <dt>Outcome</dt>
                    <dd>Changes saved</dd>
                    <dt>Revision</dt>
                    <dd>4 → 5</dd>
                    <dt>Evidence</dt>
                    <dd>Three reviewed sections</dd>
                    <dt>Delivery</dt>
                    <dd>No delivery requested</dd>
                  </dl>
                )}
              </>
            )}
            {state === "stale" && (
              <p role="alert">
                A newer revision is available. Reload before making changes.
              </p>
            )}
            {state === "success" && <p role="status">Changes saved.</p>}
            {notice && <p role="status">{notice}</p>}
          </div>
        </div>
      )}
    </>
  );
}
const product: Product = {
  id: "workbench",
  name: "Workbench",
  kicker: "DESIGN. INSPECT. MAKE IT YOURS.",
  tagline: "Good interfaces, from the ground up.",
  description:
    "A workshop for the interfaces you build every day. Shape your identity, work with thoughtful patterns, and take the finished parts with you.",
  modules: [
    {
      id: "theme",
      name: "Theme",
      description:
        "Color, type, and proportion. Find a visual language of your own.",
    },
    {
      id: "patterns",
      name: "Patterns",
      description:
        "Useful interfaces, ready to adapt to the way your product works.",
    },
    {
      id: "states",
      name: "States",
      description:
        "Give the loading, empty, and unexpected moments the same care.",
    },
    {
      id: "publish",
      name: "Publish",
      description: "Bring your release graphics and product previews together.",
    },
    {
      id: "handoff",
      name: "Handoff",
      description:
        "Leave with usable code, clear notes, and a kit of your own.",
    },
  ],
  seed,
  Editor,
  Preview,
  exports: [
    { id: "starter", name: "Runnable React starter" },
    { id: "css", name: "Semantic theme CSS" },
    { id: "svg", name: "Release graphic · SVG" },
    { id: "png", name: "Release graphic · PNG" },
    { id: "pdf", name: "Style guide · PDF" },
    { id: "html", name: "Style guide · HTML" },
  ],
};
export default function App() {
  return <Studio product={product} />;
}
