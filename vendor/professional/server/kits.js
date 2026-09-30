import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import { hash, requireThat } from "./workspaces.js";
const safePath = (name) =>
  /^[a-zA-Z0-9_./-]+$/.test(name) &&
  !name.startsWith("/") &&
  !name.split("/").includes("..");
export function packKit(app, project, extras = {}, attachments = []) {
  const files = {
    ...extras,
    "project.json": strToU8(JSON.stringify(project.data, null, 2)),
  };
  const assets = attachments.map((f, i) => {
    const path = `attachments/${i}.bin`;
    files[path] = new Uint8Array(f.bytes);
    return { path, name: f.name, mime: f.mime, shared: !!f.shared };
  });
  requireThat(
    Object.keys(files).every(safePath) && !files["manifest.json"],
    400,
    "Unsafe kit file.",
  );
  requireThat(
    Object.values(files).reduce((sum, bytes) => sum + bytes.length, 0) <=
      40 * 1024 * 1024,
    413,
    "Expanded kit exceeds 40 MB.",
  );
  const manifest = {
    schemaVersion: 1,
    app,
    projectName: project.data.name,
    sourceRevision: project.revision,
    sourceDigest: hash(project.data),
    attachments: assets,
    files: Object.fromEntries(
      Object.entries(files).map(([name, bytes]) => [
        name,
        hash(Buffer.from(bytes)),
      ]),
    ),
  };
  const bytes = Buffer.from(
    zipSync({
      ...files,
      "manifest.json": strToU8(JSON.stringify(manifest, null, 2)),
    }),
  );
  requireThat(
    bytes.length <= 20 * 1024 * 1024,
    413,
    "Project kit exceeds 20 MB.",
  );
  return bytes;
}
export function readKit(bytes) {
  requireThat(
    bytes.length <= 20 * 1024 * 1024,
    413,
    "Project kit exceeds 20 MB.",
  );
  let total = 0;
  const files = unzipSync(bytes, {
    filter(file) {
      requireThat(safePath(file.name), 400, "Unsafe kit path.");
      total += file.originalSize;
      requireThat(
        Number.isSafeInteger(total) && total <= 40 * 1024 * 1024,
        413,
        "Expanded kit exceeds 40 MB.",
      );
      return true;
    },
  });
  requireThat(
    files["manifest.json"] && files["project.json"],
    400,
    "Kit manifest or source missing.",
  );
  const manifest = JSON.parse(strFromU8(files["manifest.json"])),
    data = JSON.parse(strFromU8(files["project.json"]));
  const names = Object.keys(files).filter((name) => name !== "manifest.json");
  requireThat(
    manifest.schemaVersion === 1 &&
      manifest.sourceDigest === hash(data) &&
      names.length === Object.keys(manifest.files || {}).length &&
      names.every(
        (name) => manifest.files[name] === hash(Buffer.from(files[name])),
      ),
    400,
    "Kit checksums or version do not match.",
  );
  requireThat(
    Array.isArray(manifest.attachments || []) &&
      (manifest.attachments || []).length <= 100,
    400,
    "Invalid kit attachments.",
  );
  const attachments = (manifest.attachments || []).map((f) => {
    requireThat(
      /^attachments\/\d+\.bin$/.test(f.path) &&
        files[f.path] &&
        typeof f.name === "string" &&
        [
          "application/pdf",
          "image/png",
          "image/jpeg",
          "image/webp",
          "text/plain",
          "application/zip",
          "application/json",
        ].includes(f.mime),
      400,
      "Invalid kit attachment.",
    );
    return { ...f, bytes: Buffer.from(files[f.path]) };
  });
  return { manifest, data, attachments };
}
