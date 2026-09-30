import React, { useState } from "react";
const h = React.createElement;
export const recipeStates = [
  "ready",
  "loading",
  "empty",
  "error",
  "success",
  "disabled",
  "long",
  "stale",
  "queued",
  "running",
  "interrupted",
  "awaiting_review",
  "uncertain",
];
export function Field({ label, children, hint, className = "" }) {
  return h(
    "label",
    { className: "pf-ui-field " + className },
    h("span", null, label),
    children,
    hint && h("small", null, hint),
  );
}
export function Panel({ title, children, className = "" }) {
  return h(
    "section",
    { className: "pf-ui-panel " + className },
    title && h("h2", null, title),
    children,
  );
}
export function ActionBar({ children }) {
  return h("div", { className: "pf-ui-actions" }, children);
}
export function Button({ children, variant = "primary", ...props }) {
  return h(
    "button",
    {
      type: "button",
      ...props,
      className:
        "pf-ui-button " + (variant === "primary" ? "pf-ui-primary" : ""),
    },
    children,
  );
}
export function Recipe({
  recipe,
  title = "Your workspace",
  description = "",
  state = "ready",
  rows = [],
  selectedId = "",
  onSelect,
  onQuery,
  onSort,
  settings = {},
  onSave,
  onSignIn,
  onCreate,
  onAccept,
  onDiscard,
  onCancel,
  onResume,
  before = "No prior source supplied.",
  after = "No proposed source supplied.",
  task = {},
  receipt = {},
  navigation = [],
  onNavigate,
}) {
  const [query, setQuery] = useState(""),
    [reverse, setReverse] = useState(false),
    [step, setStep] = useState(0),
    [values, setValues] = useState({
      name: settings.name || "",
      details: settings.details || "",
    }),
    [menu, setMenu] = useState(false);
  const inactive = ["disabled", "stale", "loading", "uncertain"].includes(
    state,
  );
  const action = (label, callback, variant = "primary") =>
    h(
      Button,
      { disabled: inactive || !callback, onClick: callback, variant },
      label,
    );
  const input = (key, label, required = true) =>
    h(
      Field,
      { label },
      h(key === "details" ? "textarea" : "input", {
        value: values[key],
        required,
        maxLength: key === "name" ? 120 : 4000,
        onChange: (e) => setValues({ ...values, [key]: e.target.value }),
      }),
    );
  const heading = h(
    "header",
    { className: "pf-ui-heading" },
    h("h1", null, title),
    description &&
      h("p", null, state === "long" ? description.repeat(6) : description),
  );
  let content;
  if (state === "loading")
    content = h("p", { role: "status" }, "Loading your workspace…");
  else if (state === "empty")
    content = h(
      "div",
      null,
      h("p", null, "No items yet."),
      onCreate &&
        action("Create your first item", () =>
          onCreate({ name: "New item", details: "" }),
        ),
    );
  else if (state === "error")
    content = h(
      "p",
      { role: "alert" },
      "This view could not be loaded. Refresh before continuing.",
    );
  else
    switch (recipe) {
      case "sign-in":
        content = h(
          "div",
          null,
          h(
            "p",
            null,
            "Continue through the application’s verified account provider.",
          ),
          action("Continue with Google", onSignIn),
        );
        break;
      case "settings":
        content = h(
          "form",
          {
            onSubmit: (e) => {
              e.preventDefault();
              if (!inactive && onSave) onSave(values);
            },
          },
          input("name", "Display name"),
          input("details", "Preferences", false),
          h(
            Button,
            { type: "submit", disabled: inactive || !onSave },
            "Save settings",
          ),
        );
        break;
      case "data-table": {
        const filtered = rows.filter((r) =>
          r.name.toLowerCase().includes(query.toLowerCase()),
        );
        content = h(
          "div",
          null,
          h(
            Field,
            { label: "Find an item" },
            h("input", {
              value: query,
              onChange: (e) => {
                setQuery(e.target.value);
                onQuery?.(e.target.value);
              },
            }),
          ),
          h(
            "div",
            { className: "pf-ui-table-scroll" },
            h(
              "table",
              null,
              h("caption", null, "Your items"),
              h(
                "thead",
                null,
                h(
                  "tr",
                  null,
                  h(
                    "th",
                    { scope: "col" },
                    h(
                      Button,
                      {
                        variant: "subtle",
                        onClick: () => {
                          setReverse(!reverse);
                          onSort?.(!reverse);
                        },
                      },
                      "Name " + (reverse ? "↓" : "↑"),
                    ),
                  ),
                  h("th", { scope: "col" }, "Status"),
                ),
              ),
              h(
                "tbody",
                null,
                (reverse ? [...filtered].reverse() : filtered).map((r) =>
                  h(
                    "tr",
                    { key: r.id },
                    h(
                      "td",
                      null,
                      onSelect
                        ? h(
                            Button,
                            {
                              variant: "subtle",
                              onClick: () => onSelect(r.id),
                            },
                            r.name,
                          )
                        : r.name,
                    ),
                    h("td", null, r.status || "draft"),
                  ),
                ),
              ),
            ),
          ),
          filtered.length === 0 &&
            h("p", { role: "status" }, "No matching items."),
        );
        break;
      }
      case "list-detail": {
        const chosen = rows.find((r) => r.id === selectedId);
        content = h(
          "div",
          { className: "pf-ui-split" },
          h(
            "nav",
            { "aria-label": "Item queue" },
            rows.map((r) =>
              h(
                Button,
                {
                  key: r.id,
                  variant: "subtle",
                  "aria-current": selectedId === r.id ? "true" : undefined,
                  disabled: !onSelect,
                  onClick: () => onSelect?.(r.id),
                },
                r.name,
              ),
            ),
          ),
          h(
            Panel,
            { title: chosen?.name || "Choose an item" },
            h(
              "p",
              null,
              chosen?.details ||
                "Select an item to inspect its current revision.",
            ),
            chosen &&
              h(
                "p",
                null,
                "Revision " +
                  chosen.revision +
                  " · " +
                  (chosen.status || "draft"),
              ),
          ),
        );
        break;
      }
      case "navigation":
        content = h(
          "div",
          null,
          h(
            Button,
            { "aria-expanded": menu, onClick: () => setMenu(!menu) },
            "Menu",
          ),
          menu &&
            h(
              "nav",
              { "aria-label": "Workspace sections" },
              navigation.map((n) =>
                h(
                  Button,
                  {
                    key: n.id,
                    variant: "subtle",
                    disabled: !onNavigate,
                    "aria-current": selectedId === n.id ? "page" : undefined,
                    onClick: () => onNavigate?.(n.id),
                  },
                  n.name,
                ),
              ),
            ),
          h("p", null, "Navigation follows application routes."),
        );
        break;
      case "multi-step":
        content = h(
          "form",
          {
            onSubmit: (e) => {
              e.preventDefault();
              if (step === 0) setStep(1);
              else if (onCreate && !inactive) onCreate(values);
            },
          },
          h("p", null, "Step " + (step + 1) + " of 2"),
          step === 0 ? input("name", "Item name") : input("details", "Details"),
          h(
            ActionBar,
            null,
            step > 0 &&
              h(
                Button,
                { variant: "subtle", onClick: () => setStep(step - 1) },
                "Back",
              ),
            h(
              Button,
              {
                type: "submit",
                disabled: inactive || (step === 1 && !onCreate),
              },
              step === 0 ? "Continue" : "Create item",
            ),
          ),
        );
        break;
      case "task-progress":
        content = h(
          "div",
          null,
          h("p", { role: "status" }, task.status || state),
          Number.isFinite(task.progress) &&
            h("progress", {
              max: 100,
              value: task.progress,
              "aria-label": "Reported progress",
            }),
          h(
            "p",
            null,
            task.message || "Progress comes from the application receipt.",
          ),
          h(
            ActionBar,
            null,
            action("Stop task", onCancel, "subtle"),
            action("Continue from saved work", onResume),
          ),
        );
        break;
      case "change-review":
        content = h(
          "div",
          null,
          h(
            "div",
            { className: "pf-ui-split" },
            h(
              Panel,
              { title: "Before" },
              h("div", { className: "pf-ui-content" }, before),
            ),
            h(
              Panel,
              { title: "After" },
              h("div", { className: "pf-ui-content" }, after),
            ),
          ),
          h(
            ActionBar,
            null,
            action("Accept changes", onAccept),
            action("Keep original", onDiscard, "subtle"),
          ),
        );
        break;
      case "outcome-receipt":
        content = h(
          "dl",
          { className: "pf-ui-receipt" },
          ["outcome", "revision", "evidence", "delivery"].flatMap((key) => [
            h(
              "dt",
              { key: key + "-label" },
              key[0].toUpperCase() + key.slice(1),
            ),
            h("dd", { key }, receipt[key] ?? "Unavailable"),
          ]),
        );
        break;
      default:
        content = h("p", { role: "alert" }, "This recipe is unavailable.");
    }
  return h(
    "section",
    { className: "pf-ui", "data-recipe": recipe, "data-state": state },
    heading,
    h("div", { className: "pf-ui-body" }, content),
    state === "stale" &&
      h(
        "p",
        { role: "alert" },
        "A newer revision is available. Reload before changing it.",
      ),
    state === "uncertain" &&
      h(
        "p",
        { role: "alert" },
        "The outcome is uncertain. Look up the existing operation before proceeding.",
      ),
    state === "success" &&
      h(
        "p",
        { role: "status" },
        "The application reports that this change was saved.",
      ),
  );
}
