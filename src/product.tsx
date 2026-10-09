import { Recipe } from "../vendor/professional/creation/ui.js";
import { recipeFixture } from "../vendor/professional/creation/fixture.js";
import { appThemeVars } from "../vendor/professional/creation/theme.js";
import {
  validateBlueprint,
  getCatalog,
  upgradeBlueprint,
} from "../vendor/professional/creation/blueprint.js";
import "../vendor/professional/creation/ui.css";
import { useState, useEffect } from "react";
import { Sun, Moon, Smartphone, Monitor, Code, Check } from "lucide-react";
import { Studio, Field } from "../vendor/professional/react/studio";
import type { Product, EditorProps } from "../vendor/professional/react/studio";
import { ThemeFields } from "../vendor/professional/react/theme";
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
      {module === "blueprint" ? (
        <BlueprintEditor data={data} onChange={onChange} />
      ) : module === "theme" ? (
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
                Application export contains account-owned records, real
                create/propose/review actions, an independent lockfile and
                isolated workflow checks. The interface demo uses fictional
                fixtures.
              </p>
            </>
          )}
        </>
      )}
    </fieldset>
  );
}
function BlueprintEditor({
  data,
  onChange,
}: {
  data: any;
  onChange: (data: any) => void;
}) {
  const [source, setSource] = useState(JSON.stringify(data.blueprint, null, 2)),
    [error, setError] = useState("");
  useEffect(
    () => setSource(JSON.stringify(data.blueprint, null, 2)),
    [data.blueprint],
  );
  const report = validateBlueprint({ ...data.blueprint, theme: data.theme });
  const catalog = getCatalog();
  const screenList = Array.isArray(data.blueprint?.screens) ? data.blueprint.screens : [];
  const selectedIndex = Math.max(0, screenList.findIndex((screen: any) => screen?.id === data.blueprintScreen));
  const changeScreen = (index: number, patch: Record<string, unknown>) =>
    onChange({ ...data, blueprint: { ...data.blueprint, screens: data.blueprint.screens.map((screen: any, i: number) => i === index ? { ...screen, ...patch } : screen) } });
  return (
    <>
      <p>
        Foundation {getCatalog().foundationVersion}. Compose routes and explicit
        callbacks; the initial domain adapter supports account-owned records and
        reviewed changes.
      </p>
      <p>Routes and content are editable here. The legacy application export remains the explicitly supported review-records adapter.</p>
      <Field label="Preview screen"><select value={screenList[selectedIndex]?.id ?? ""} onChange={event => onChange({ ...data, blueprintScreen: event.target.value })}>
        {Array.isArray(data.blueprint?.screens) && data.blueprint.screens.filter((screen: any) => screen && typeof screen === "object").map((screen: any) => <option key={screen.id} value={screen.id}>{screen.title || screen.id}</option>)}
      </select></Field>
      {Array.isArray(data.blueprint?.screens) && data.blueprint.screens.map((screen: any, index: number) => index !== selectedIndex ? null : screen && typeof screen === "object" ? (
        <fieldset key={index} className="blueprint-screen">
          <legend>Screen {index + 1}: {screen.id}</legend>
          <Field label="Screen title"><input value={screen.title ?? ""} onChange={event => changeScreen(index, { title: event.target.value })} /></Field>
          <Field label="Screen route"><input value={screen.path ?? ""} onChange={event => changeScreen(index, { path: event.target.value })} /></Field>
          <Field label="Screen recipe"><select value={screen.recipe ?? ""} onChange={event => {
            const recipe = catalog.recipes.find((item: any) => item.id === event.target.value);
            if (recipe) changeScreen(index, { recipe: recipe.id, recipeVersion: recipe.version, states: (Array.isArray(screen.states) ? screen.states : ["ready"]).filter((state: string) => recipe.states.includes(state)) });
          }}>{catalog.recipes.map((recipe: any) => <option key={recipe.id} value={recipe.id}>{recipe.title} · v{recipe.version}</option>)}</select></Field>
        </fieldset>
      ) : <p key={index} role="alert">Screen {index + 1} has invalid structure. Repair it in Advanced blueprint JSON.</p>)}
      <details>
        <summary>Advanced blueprint JSON</summary>
        <Field label="Application blueprint"><textarea rows={18} value={source} onChange={event => setSource(event.target.value)} /></Field>
        <button type="button" onClick={() => {
          try {
            const value = JSON.parse(source);
            const validation = validateBlueprint({ ...value, theme: data.theme });
            if (!validation.valid) { setError([...validation.errors, ...validation.unresolved].join(" ")); return; }
            onChange({ ...data, blueprint: value }); setError("");
          } catch { setError("Use valid blueprint JSON."); }
        }}>Apply blueprint draft</button>
        {error && <p role="alert">{error}</p>}
      </details>
      <button
        type="button"
        onClick={() =>
          onChange({ ...data, blueprint: upgradeBlueprint(data.blueprint) })
        }
      >
        Review current Foundation pin
      </button>
      <p>
        {report.valid
          ? "Blueprint ready for application export."
          : "Application export requires these changes:"}
      </p>
      {[...report.errors, ...report.unresolved].map((v: string) => (
        <p key={v}>{v}</p>
      ))}
      <details>
        <summary>Agent entry points</summary>
        <pre>
          npm run workbench -- catalog{"\n"}npm run workbench -- inspect
          --recipe change-review{"\n"}npm run workbench -- validate --blueprint
          app-blueprint.json{"\n"}npm run workbench -- plan --blueprint
          app-blueprint.json{"\n"}npm run workbench -- scaffold --blueprint
          app-blueprint.json --out /tmp/my-app
        </pre>
        <p>
          Scaffold writes only to an empty directory. Plan does not install
          dependencies, deploy, spend or publish. Hosted private tools
          additionally require an owner grant and service delegation.
        </p>
      </details>
    </>
  );
}
export function Preview({ data, module }: { data: any; module: string }) {
  const [dark, setDark] = useState(false),
    [mobile, setMobile] = useState(false),
    [code, setCode] = useState(false),
    [trace, setTrace] = useState(""),
    [selected, setSelected] = useState("release"),
    [query, setQuery] = useState(""),
    [reverse, setReverse] = useState(false);
  const screen = module === "blueprint" && Array.isArray(data.blueprint?.screens)
    ? data.blueprint.screens.find((item: any) => item?.id === data.blueprintScreen) ?? data.blueprint.screens[0]
    : null;
  const blueprintReport = module === "blueprint"
    ? validateBlueprint({ ...data.blueprint, theme: data.theme }) : null;
  const previewRecipe = screen?.recipe ?? data.recipe;
  const previewState = screen && Array.isArray(screen.states) && !screen.states.includes(data.state)
    ? screen.states[0] ?? "ready" : data.state;
  useEffect(() => { setQuery(""); setTrace(""); setReverse(false); setSelected("release"); }, [previewRecipe, previewState, screen?.id]);
  const fixture: any = recipeFixture(previewState),
    rows = fixture.rows.filter((r: any) =>
      r.name.toLowerCase().includes(query.toLowerCase()),
    );
  if (reverse) rows.reverse();

  const requested = (name: string) => () =>
    setTrace(
      "Fixture callback requested: " +
        name +
        ". No application effect was applied.",
    );
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
          <Code size={13} />
          {code ? "Preview" : "Source"}
        </button>
      </div>
      {code ? (
        <pre style={{ padding: 20 }}>{componentSource(previewRecipe)}</pre>
      ) : module === "publish" && data.graphic !== "screenshot" ? (
        <img
          className="graphic-preview"
          alt="Your composed release graphic"
          src={
            "data:image/svg+xml;charset=utf-8," +
            encodeURIComponent(graphic(data))
          }
        />
      ) : blueprintReport && !blueprintReport.valid ? (
        <div className="creation-preview" role="alert">
          <p>Resolve the blueprint errors before previewing this application.</p>
          {[...blueprintReport.errors, ...blueprintReport.unresolved].map((error: string) => <p key={error}>{error}</p>)}
        </div>
      ) : (
        <div
          className="pf-app creation-preview"
          style={
            {
              ...appThemeVars(data.theme, dark),
              maxWidth: mobile ? 375 : undefined,
            } as any
          }
          data-pf-theme={dark ? "dark" : "light"}
        >
          <p className="preview-label">
            Fictional state fixture · {previewState} · Foundation{" "}
            {getCatalog().foundationVersion}
          </p>
          <Recipe
            key={previewRecipe + previewState}
            {...fixture}
            recipe={previewRecipe}
            title={screen?.title ?? data.title}
            description={screen?.description ?? data.description}
            rows={rows}
            selectedId={selected}
            onSelect={setSelected}
            onQuery={setQuery}
            onSort={setReverse}
            onNavigate={requested("navigation.open")}
            onSignIn={requested("account.signIn")}
            onSave={requested("settings.save")}
            onCreate={requested("records.create")}
            onAccept={requested("records.accept")}
            onDiscard={requested("records.discard")}
            onCancel={requested("task.cancel")}
            onResume={requested("task.resume")}
          />
          {trace && <p role="status">{trace}</p>}
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
    {
      id: "blueprint",
      name: "Blueprint",
      description:
        "Compose an independent application from versioned Foundation recipes and explicit domain callbacks.",
    },
  ],
  seed,
  Editor,
  Preview,
  exports: [
    { id: "application", name: "Account-owned application · ZIP" },
    { id: "blueprint", name: "Application blueprint · JSON" },
    { id: "starter", name: "Interface fixture demo · ZIP" },
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
