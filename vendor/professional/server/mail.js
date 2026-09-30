import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import nodemailer from "nodemailer";
import { hash, requireThat } from "./workspaces.js";
import { text } from "../shared/model.js";
export function publicAddress(ip) {
  if (ip.startsWith("::ffff:")) return publicAddress(ip.slice(7));
  if (isIP(ip) === 6) return /^[23][a-f\d]{3}:/i.test(ip) && !/^(2001:(?:db8|0:|2:|10:|20:)|3fff:)/i.test(ip);
  if (isIP(ip) !== 4) return false;
  const [a, b] = ip.split(".").map(Number);
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && [0, 168].includes(b)) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && [18, 19, 51].includes(b)) ||
    (a === 203 && b === 0)
  );
}
const email = (v) => {
  v = text(v, 254).trim();
  requireThat(
    /^[^\s<>@]+@[^\s<>@]+$/.test(v) && !/[\r\n]/.test(v),
    400,
    "Enter a valid mailbox.",
  );
  return v;
};
export function mailConnection(v) {
  requireThat(
    v && typeof v === "object",
    400,
    "Enter mail connection settings.",
  );
  const port = Number(v.port);
  requireThat(
    [465, 587].includes(port),
    400,
    "Use TLS port 465 or STARTTLS port 587.",
  );
  const host = text(v.host, 253).trim();
  requireThat(
    /^[a-zA-Z0-9.-]+$/.test(host) &&
      !host.endsWith(".local") &&
      host !== "localhost",
    400,
    "Use a public SMTP hostname.",
  );
  return {
    label: text(v.label, 120),
    host,
    port,
    user: text(v.user, 254),
    password: text(v.password, 4096),
    from: email(v.from),
  };
}
export function recipients(v) {
  requireThat(
    Array.isArray(v) && v.length > 0 && v.length <= 25,
    400,
    "Choose 1–25 recipients.",
  );
  return [...new Set(v.map(email))];
}
export function sendPreview(account, project, connectionId, to, message) {
  return {
    projectId: project.id,
    revision: project.revision,
    connectionId,
    to: recipients(to),
    subject: text(message.subject, 200),
    html: message.html,
    text: message.text,
    attachments: message.attachments || [],
    digest: hash({
      account: account.id,
      project: project.id,
      revision: project.revision,
      connection: connectionId,
      to: recipients(to),
      message,
    }),
  };
}
export async function dispatch(
  store,
  a,
  p,
  preview,
  approvedDigest,
  transportFactory = null,
) {
  store.project(a, p.id, true);
  requireThat(
    preview.digest === approvedDigest,
    409,
    "The reviewed email changed. Review it again.",
  );
  const saved = store.db
    .prepare("SELECT * FROM sends WHERE account=? AND digest=?")
    .get(a.id, preview.digest);
  if (saved) return { id: saved.id, status: saved.status, duplicate: true };
  const connection = store.connection(a, preview.connectionId);
  const id = crypto.randomUUID();
  store.db.prepare("INSERT INTO sends VALUES(?,?,?,?,?,'claimed',?,?)").run(
    id,
    p.workspace,
    p.id,
    a.id,
    preview.digest,
    JSON.stringify({
      to: preview.to,
      subject: preview.subject,
      revision: p.revision,
      attachments: preview.attachments || [],
      retryOf: preview.retryOf || null,
      retryCount: preview.retryCount || 0,
    }),
    new Date().toISOString(),
  );
  let dispatched = false,
    transport;
  try {
    if (transportFactory) transport = await transportFactory(connection);
    else {
      const addresses = await lookup(connection.host, { all: true });
      requireThat(
        addresses.length && addresses.every((x) => publicAddress(x.address)),
        400,
        "SMTP resolves to a restricted network.",
      );
      transport = nodemailer.createTransport({
        host: addresses[0].address,
        port: connection.port,
        secure: connection.port === 465,
        requireTLS: true,
        auth: { user: connection.user, pass: connection.password },
        tls: { servername: connection.host, rejectUnauthorized: true },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 30000,
      });
    }
    requireThat(
      store.project(a, p.id, true).revision === p.revision,
      409,
      "The project changed before dispatch.",
    );
    store.connection(a, preview.connectionId);
    const attachments = (preview.attachments || []).map((v) => {
      const f = store.getFile(a, v.id);
      requireThat(
        f.project === p.id && hash(f.bytes) === v.digest,
        409,
        "Attachment changed before dispatch.",
      );
      return {
        filename: f.name,
        content: Buffer.from(f.bytes),
        contentType: f.mime,
      };
    });
    dispatched = true;
    const result = await transport.sendMail({
      from: connection.from,
      to: preview.to,
      subject: preview.subject,
      html: preview.html,
      text: preview.text,
      attachments,
      disableFileAccess: true,
      disableUrlAccess: true,
      messageId: `<${id}@yrp.studio>`,
    });
    const accepted = result.accepted?.length || 0;
    const status = accepted ? "accepted_by_server" : "failed";
    store.db.prepare("UPDATE sends SET status=?,data=? WHERE id=?").run(
      status,
      JSON.stringify({
        to: preview.to,
        subject: preview.subject,
        revision: p.revision,
        attachments: preview.attachments || [],
        retryOf: preview.retryOf || null,
        retryCount: preview.retryCount || 0,
        messageId: result.messageId || `<${id}@yrp.studio>`,
        accepted: result.accepted || [],
        rejected: result.rejected || [],
      }),
      id,
    );
    return {
      id,
      status,
      accepted: result.accepted || [],
      rejected: result.rejected || [],
    };
  } catch (error) {
    const certain =
      !dispatched || ["EAUTH", "EENVELOPE", "ETLS"].includes(error.code);
    const status = certain ? "failed" : "uncertain";
    store.db.prepare("UPDATE sends SET status=? WHERE id=?").run(status, id);
    return {
      id,
      status,
      message: certain
        ? "Mail connection or recipients were rejected. Review the connection."
        : "The send outcome is uncertain. Check your mailbox before composing another attempt.",
    };
  } finally {
    transport?.close?.();
  }
}
