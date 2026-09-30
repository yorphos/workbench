import type { CSSProperties } from "react";
import { Field } from "./studio";
export function themeVars(t: any, dark = false): CSSProperties {
  return {
    ...Object.fromEntries(
      Object.entries(dark ? t.dark : t.light).map(([k, v]) => [
        "--kit-" + k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase()),
        v,
      ]),
    ),
    "--kit-font": t.font === "DM Sans" ? '"DM Sans", sans-serif' : t.font,
    "--kit-size": t.size + "px",
    "--kit-space": t.spacing + "px",
    "--kit-radius": t.radius + "px",
  } as CSSProperties;
}
export function ThemeFields({
  value,
  onChange,
}: {
  value: any;
  onChange: (v: any) => void;
}) {
  return (
    <>
      <Field label="Identity name">
        <input
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
      </Field>
      <Field label="Typography">
        <select
          value={value.font}
          onChange={(e) => onChange({ ...value, font: e.target.value })}
        >
          <option>DM Sans</option>
          <option>system-ui</option>
          <option>Georgia</option>
        </select>
      </Field>
      <div className="inline-fields">
        {["size", "spacing", "radius"].map((key) => (
          <Field
            key={key}
            label={
              {
                size: "Body size",
                spacing: "Spacing",
                radius: "Corner radius",
              }[key] || key
            }
          >
            <input
              type="number"
              min="0"
              max="64"
              value={value[key]}
              onChange={(e) =>
                onChange({ ...value, [key]: Number(e.target.value) })
              }
            />
          </Field>
        ))}
      </div>
      {["light", "dark"].map((mode) => (
        <details key={mode} open={mode === "light"}>
          <summary>
            {mode === "light" ? "Light appearance" : "Dark appearance"}
          </summary>
          {Object.entries(value[mode]).map(([key, color]) => (
            <label className="color-field" key={key}>
              {key.replace(/[A-Z]/g, (c) => " " + c.toLowerCase())}
              <span>
                <small>{String(color)}</small>
                <input
                  aria-label={mode + " " + key}
                  type="color"
                  value={String(color)}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      [mode]: { ...value[mode], [key]: e.target.value },
                    })
                  }
                />
              </span>
            </label>
          ))}
        </details>
      ))}
    </>
  );
}
