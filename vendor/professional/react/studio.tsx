import { useState, useEffect, useRef } from "react";
import type { ComponentType, ReactNode } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Download,
  Check,
  Settings,
  Users,
  Layers,
  BookOpen,
  Mail,
  ChevronRight,
  RefreshCw,
  Upload,
  Sun,
  Moon,
  Command,
  Send,
  Compass,
  Type,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./dialog";
import "./studio.css";
export type Project = {
  id: string;
  workspace: string;
  revision: number;
  data: any;
  permission?: string;
  canAccept?: boolean;
  history?: any[];
  comments?: any[];
  events?: any[];
  files?: any[];
};
export type EditorProps = {
  data: any;
  onChange: (data: any) => void;
  module: string;
  readonly: boolean;
};
export type Product = {
  id: string;
  name: string;
  kicker: string;
  tagline: string;
  description: string;
  modules: { id: string; name: string; description: string }[];
  seed: (name?: string) => any;
  Editor: ComponentType<EditorProps>;
  Preview: ComponentType<{ data: any; module: string }>;
  exports: { id: string; name: string }[];
};
const base = import.meta.env.BASE_URL;
const path = (value: string) => base + value;
function Brand({ product }: { product: Product }) {
  return (
    <a href={base} className="pf-brand studio-brand">
      <span className={"product-mark " + product.id} aria-hidden="true">
        {product.id === "fieldwork" ? (
          <Compass size={25} />
        ) : product.id === "letterpress" ? (
          <Type size={25} />
        ) : (
          <Layers size={25} />
        )}
      </span>
      <span className="pf-brand-copy">
        <span className="pf-brand-name">{product.name}</span>
        <span className="pf-brand-signature">
          <span>by</span> <b>YRP</b>
        </span>
      </span>
    </a>
  );
}
export {Field} from '../creation/ui.js';
import {Field} from '../creation/ui.js';
import '../creation/ui.css';
function Header({ product, email }: { product: Product; email?: string }) {
  const [appearance,setAppearance]=useState(() => {try{return localStorage.getItem('yrp:'+product.id+':appearance') || (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');}catch{return 'light';}});
  useEffect(()=>{document.documentElement.dataset.pfTheme=appearance;try{localStorage.setItem('yrp:'+product.id+':appearance',appearance);}catch{}},[appearance]);
  return (
    <header className="studio-header">
      <Brand product={product} />
      <nav aria-label="Product"><button className="appearance-toggle" aria-label={"Switch to " + (appearance === "dark" ? "light" : "dark") + " appearance"} onClick={()=>setAppearance(appearance === "dark" ? "light" : "dark")}>{appearance === "dark" ? <Sun size={16}/> : <Moon size={16}/>}</button>
        <a href="/">Toolbox</a><a href={path("recipes")}>Explore</a>
        <a href={path("docs")}>Documentation</a>
        {email ? (
          <a
            className="account-link"
            href={
              "/oauth2/sign_out?rd=" +
              encodeURIComponent(location.origin + base)
            }
          >
            {email} · Sign out
          </a>
        ) : (
          <a className="button primary" href={path("app")}>
            Open workspace <ArrowUpRight size={15} />
          </a>
        )}
      </nav>
    </header>
  );
}
function Public({ product }: { product: Product }) {
  const [data, setData] = useState(product.seed("Northstar Studio")),
    [module, setModule] = useState(product.modules[0].id);
  const section = location.pathname.includes("/docs")
    ? "docs"
    : location.pathname.includes("/recipes")
      ? "recipes"
      : "home";
  return (
    <>
      <Header product={product} />
      <main className="public-main">
        <div className="eyebrow">
          <span /> THE YRP PROFESSIONAL TOOLSET
        </div>
        <div className="hero-copy">
          <div>
            <p className="kicker">{product.kicker}</p>
            <h1>{product.tagline}</h1>
            <p className="hero-description">{product.description}</p>
            <div className="actions">
              <a className="button primary" href={path("app")}>
                Start your next project <ArrowRight size={17} />
              </a>
              <a
                className="button subtle"
                href={"https://github.com/yorphos/" + product.id}
                target="_blank"
                rel="noreferrer"
              >
                Open source <ArrowUpRight size={16} />
              </a>
            </div>
            <p className="hero-note">
              Thoughtful defaults. Your own account. Work you can take with you.
            </p>
          </div>
          <div className="hero-specimen">
            <div className="specimen-bar">
              <span>
                <i />
                <i />
                <i />
              </span>
              <span>{product.name.toLowerCase()} / a first look</span>
              <Command size={14} />
            </div>
            <product.Preview data={data} module={module} />
          </div>
        </div>
        <section className="collection">
          <div className="section-heading">
            <div>
              <p className="kicker">A COHESIVE REPERTOIRE</p>
              <h2>Small tools. Substantial work.</h2>
            </div>
            <span>
              {String(product.modules.length).padStart(2, "0")} tools, one
              working rhythm
            </span>
          </div>
          <div className="module-grid">
            {product.modules.map((m, i) => (
              <button
                className={
                  module === m.id ? "module-card selected" : "module-card"
                }
                key={m.id}
                onClick={() => setModule(m.id)}
              >
                <span className="module-number">
                  0{i + 1}
                  <ArrowUpRight size={17} />
                </span>
                <h3>{m.name}</h3>
                <p>{m.description}</p>
              </button>
            ))}
          </div>
        </section>
        {section === "docs" ? (
          <section className="documentation">
            <h2>From starting point to finished work</h2>
            <ol>
              <li>Sign in with Google and create your own workspace.</li>
              <li>
                Create a project, invite developer editors, and choose a
                starting template.
              </li>
              <li>
                Save your changes, publish a fixed revision, and invite named
                clients to review it.
              </li>
              <li>
                Export useful files or a portable project kit. Imports create a
                separate snapshot and transfer no permissions.
              </li>
            </ol>
            <h3>Sharing and ownership</h3>
            <p>
              Owners manage membership. Editors work on projects. Client
              reviewers see only the projects shared with them. Your mail
              connection belongs to your account and is encrypted separately.
            </p>
            <h3>Source and self-hosting</h3>
            <p>
              Clone the product repository, use Node 24, run npm ci, npm run
              db:migrate, and npm run build. Configure the trusted Google proxy
              for private workspaces. See RUNBOOK.md for deployment and
              recovery.
            </p>
            <h3>Useful outputs</h3>
            <p>{product.exports.map((x) => x.name).join(" · ")}</p>
          </section>
        ) : section === "recipes" ? (
          <section className="documentation">
            <h2>Try the materials</h2>
            <p>
              This fictional example stays in this page. Sign in to save your
              own work.
            </p>
            <product.Editor
              data={data}
              onChange={setData}
              module={module}
              readonly={false}
            />
            <product.Preview data={data} module={module} />
          </section>
        ) : (
          <section className="suite-callout">
            <BookOpen size={24} />
            <div>
              <h3>A professional toolkit, built one good tool at a time.</h3>
              <p>
                Workbench for interfaces. Fieldwork for engagements. Letterpress
                for the words and materials that bring them together.
              </p>
            </div>
            <a href={path("docs")}>
              See how it works <ArrowRight size={16} />
            </a>
          </section>
        )}
      </main>
      <footer>
        <Brand product={product} />
        <span>Made for the work ahead.</span>
        <a href={"https://github.com/yorphos/" + product.id}>
          Source & releases <ArrowUpRight size={14} />
        </a>
      </footer>
    </>
  );
}
export function Studio({ product }: { product: Product }) {
  const isApp = location.pathname.replace(base, "/").startsWith("/app");
  const [session, setSession] = useState<any>(null),
    [workspace, setWorkspace] = useState(""),
    [projects, setProjects] = useState<Project[]>([]),
    [project, setProject] = useState<Project | null>(null),
    [draft, setDraft] = useState<any>(null),
    [module, setModule] = useState(product.modules[0].id),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [dialog, setDialog] = useState<string | null>(null),
    [team, setTeam] = useState<any>(null),
    [preview, setPreview] = useState<any>(null),
    [mail, setMail] = useState({
      connectionId: "",
      to: "",
      invitationId: "",
      attachmentIds: [] as string[],
      retryOf: "",
    }),
    [invitationLink, setInvitationLink] = useState(""),
    [job, setJob] = useState<any>(null),
    [reviewText, setReviewText] = useState(""),
    [signerName, setSignerName] = useState(""),
    [acceptConsent, setAcceptConsent] = useState(false),
    [comment, setComment] = useState(""),
    [workspaceName, setWorkspaceName] = useState("My studio"),
    [projectName, setProjectName] = useState(""),
    [invite, setInvite] = useState({
      email: "",
      role: "editor",
      canAccept: false,
    }),
    [connection, setConnection] = useState({
      label: "My mailbox",
      host: "",
      port: 587,
      user: "",
      password: "",
      from: "",
    });
  const sessionId = useRef("");
  const requestAbort = useRef(new AbortController());
  const dirty =
    !!project && JSON.stringify(draft) !== JSON.stringify(project.data);
  const readonly = project?.permission === "reviewer";
  async function api(url: string, method = "GET", value?: any) {
    const response = await fetch(path(url), {
      method,
      headers: { "Content-Type": "application/json", "X-Studio-Request": "1", ...(sessionId.current ? {"X-App-Account":sessionId.current}: {}) },
      body: value === undefined ? undefined : JSON.stringify(value),
      signal: requestAbort.current.signal,
    });
    if (!response.ok) {
      let message = "Request failed.";
      try {
        message = (await response.json()).error || message;
      } catch {}
      if (response.status === 401) {
        setSession(null);
        setProject(null);
        setDraft(null);
      }
      throw new Error(message);
    }
    return response.json();
  }
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e: any) {
      if (e.name !== "AbortError") setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function refresh() {
    const s = await api("api/session");
    if (sessionId.current && sessionId.current !== s.account.id) {
      requestAbort.current.abort();
      requestAbort.current = new AbortController();
      setProject(null);
      setDraft(null);
      setProjects([]);
      setWorkspace("");
      setPreview(null);
      setDialog(null);
    }
    sessionId.current = s.account.id;
    setSession(s);
    return s;
  }
  function remember(workspaceId:string,projectId?:string){const u=new URL(location.href);u.searchParams.set("workspace",workspaceId);if(projectId)u.searchParams.set("project",projectId);else u.searchParams.delete("project");history.replaceState({},"",u);}
  async function selectWorkspace(id: string) {
    setWorkspace(id);
    setProject(null);
    setDraft(null);
    setProjects(await api("api/workspaces/" + id));
    remember(id);
  }
  async function openProject(id: string) {
    const p = await api("api/projects/" + id);
    setProject(p);
    setWorkspace(p.workspace);
    remember(p.workspace,p.id);
    setDraft({...product.seed(p.data.name),...structuredClone(p.data)});
    setJob(null);
  }
  async function refreshProject() {
    if (project) await openProject(project.id);
    setProjects(await api("api/workspaces/" + workspace));
  }
  useEffect(() => {
    if (!isApp) return;
    run(async () => {
      const s = await refresh();
      const inviteId = new URLSearchParams(location.search).get("invite");
      if (inviteId) {
        const invitation = await api("api/invitations/" + inviteId);
        setInvitationLink(inviteId);
        setNotice(
          `Invitation for ${invitation.email}. Accept it to join the ${invitation.role} workspace.`,
        );
        setDialog("acceptInvite");
      } else {const params=new URLSearchParams(location.search), requested=params.get("project"), workspaceId=params.get("workspace");const w=s.workspaces.find((v:any)=>v.id===workspaceId)||s.workspaces[0];if(w)await selectWorkspace(w.id);if(requested)await openProject(requested); }
    });
    const timer = setInterval(() => {
      refresh().catch(() => {});
    }, 30000);
    return () => {
      clearInterval(timer);
      requestAbort.current.abort();
    };
  }, []);
  useEffect(() => {
    if (!job || !["queued", "running"].includes(job.status)) return;
    const timer = setTimeout(
      () =>
        api("api/jobs/" + job.id)
          .then(setJob)
          .catch((e: any) => setError(e.message)),
      800,
    );
    return () => clearTimeout(timer);
  }, [job]);
  function download(bytes: Blob, name: string) {
    const url = URL.createObjectURL(bytes);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function exportProject(format: string) {
    if (!project) return;
    const response = await fetch(
      path("api/projects/" + project.id + "/export"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Studio-Request": "1",
        },
        body: JSON.stringify({ format, revision: project.revision }),
      },
    );
    if (!response.ok) throw new Error((await response.json()).error);
    if (response.status === 202) {
      setJob(await response.json());
      return;
    }
    const disposition = response.headers.get("Content-Disposition") || "";
    download(
      await response.blob(),
      decodeURIComponent(
        disposition.split("UTF-8''")[1] || product.id + "-export",
      ),
    );
  }
  async function sendPreview() {
    if (!project) return;
    setPreview(
      await api("api/mail/preview", "POST", {
        projectId: project.id,
        revision: project.revision,
        ...mail,
        to: mail.to
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
      }),
    );
  }
  if (!isApp) return <Public product={product} />;
  if (!session)
    return (
      <>
        <Header product={product} />
        <main className="signin-panel">
          <div className="eyebrow">YOUR PRIVATE WORKSPACE</div>
          <h1>Your work deserves a place of its own.</h1>
          <p>{error || "Opening your account workspace…"}</p>
          <a
            className="button primary"
            href={
              "/oauth2/sign_in?rd=" +
              encodeURIComponent(
                location.origin + path("app") + location.search,
              )
            }
          >
            Continue with Google <ArrowUpRight size={16} />
          </a>
        </main>
      </>
    );
  return (
    <>
      <Header product={product} email={session.account.email} />
      <div className="workspace-shell">
        <aside className="workspace-sidebar">
          <div className="sidebar-heading">YOUR WORKSPACE</div>
          <Field label="Workspace">
            <select
              value={workspace}
              disabled={dirty}
              onChange={(e) => run(() => selectWorkspace(e.target.value))}
            >
              <option value="">Choose a workspace</option>
              {session.workspaces.map((w: any) => (
                <option key={w.id} value={w.id}>
                  {w.name} · {w.role}
                </option>
              ))}
            </select>
          </Field>
          <button
            className="sidebar-action"
            onClick={() => setDialog("workspace")}
          >
            <Plus size={16} /> New workspace
          </button>
          {workspace && (
            <>
              <div className="sidebar-heading">
                PROJECTS{" "}
                <button
                  disabled={dirty}
                  aria-label="New project"
                  onClick={() => setDialog("project")}
                >
                  <Plus size={16} />
                </button>
              </div>
              <nav aria-label="Projects">
                {projects.map((p) => (
                  <button
                    disabled={dirty}
                    className={project?.id === p.id ? "active" : ""}
                    key={p.id}
                    onClick={() => run(() => openProject(p.id))}
                  >
                    <Layers size={16} />
                    <span>{p.data.name}</span>
                    <ChevronRight size={14} />
                  </button>
                ))}
              </nav>
              <button
                className="sidebar-action"
                disabled={dirty}
                onClick={() => setDialog("import")}
              >
                <Upload size={16} /> Import project kit
              </button>
            </>
          )}
          <div className="sidebar-bottom">
            <button onClick={() => setDialog("connection")}>
              <Mail size={16} /> Mail connections
            </button>
            {workspace &&
              session.workspaces.find((w: any) => w.id === workspace)?.role ===
                "owner" && (
                <button
                  onClick={() =>
                    run(async () => {
                      setTeam(
                        await api("api/workspaces/" + workspace + "/team"),
                      );
                      setDialog("team");
                    })
                  }
                >
                  <Users size={16} /> Team & client access
                </button>
              )}
            <a href={path("docs")}>
              <BookOpen size={16} /> Product guide
            </a>
          </div>
        </aside>
        <main className="workspace-main">
          {error && (
            <div className="feedback error" role="alert">
              {error}
              {project && (
                <button onClick={() => run(refreshProject)}>
                  <RefreshCw size={14} /> Reload latest
                </button>
              )}
            </div>
          )}
          {notice && (
            <div className="feedback" role="status">
              {notice}
            </div>
          )}
          {!project ? (
            <section className="empty-workspace">
              <div className="empty-mark">
                <Layers size={38} />
              </div>
              <p className="kicker">A PLACE FOR YOUR NEXT PROJECT</p>
              <h1>Good work starts with a clear beginning.</h1>
              <p>
                {workspace
                  ? "Choose a project or create your first one."
                  : "Create your own workspace, then invite the people you work with."}
              </p>
              <button
                className="primary"
                onClick={() => setDialog(workspace ? "project" : "workspace")}
              >
                <Plus size={17} />
                {workspace ? "Create a project" : "Create a workspace"}
              </button>
            </section>
          ) : (
            <>
              <div className="project-heading">
                <div>
                  <p className="kicker">
                    {product.name.toUpperCase()} /{" "}
                    {readonly ? "CLIENT REVIEW" : "PROJECT STUDIO"}
                  </p>
                  <h1>{draft.name}</h1>
                  <span className="save-status">
                    {dirty ? "Unsaved changes" : "Saved"} · Revision{" "}
                    {project.revision}
                    {readonly ? " · Published snapshot" : ""}
                  </span>
                </div>
                <div className="actions">
                  {!readonly && (
                    <>
                      <button
                        disabled={busy || !dirty}
                        className="primary"
                        onClick={() =>
                          run(async () => {
                            const p = await api(
                              "api/projects/" + project.id,
                              "PUT",
                              { revision: project.revision, data: draft },
                            );
                            setProject({ ...project, ...p });
                            setDraft({...product.seed(p.data.name),...structuredClone(p.data)});
                            setNotice("Changes saved.");
                            setProjects(
                              await api("api/workspaces/" + workspace),
                            );
                          })
                        }
                      >
                        <Check size={16} /> Save changes
                      </button>
                      <button
                        disabled={busy || dirty}
                        onClick={() =>
                          run(async () => {
                            await api(
                              "api/projects/" + project.id + "/publish",
                              "POST",
                              { revision: project.revision },
                            );
                            await refreshProject();
                            setNotice("A fixed revision is ready for review.");
                          })
                        }
                      >
                        Publish for review
                      </button>
                    </>
                  )}
                  <button
                    disabled={busy || dirty || readonly}
                    onClick={() =>
                      run(async () => {
                        const p = await api(
                          "api/projects/" + project.id + "/duplicate",
                          "POST",
                          {},
                        );
                        setProjects(await api("api/workspaces/" + workspace));
                        await openProject(p.id);
                      })
                    }
                  >
                    Duplicate
                  </button>
                  <button
                    disabled={busy || dirty}
                    onClick={() => setDialog("exports")}
                  >
                    <Download size={16} /> Export
                  </button>
                </div>
              </div>
              <nav className="module-tabs" aria-label="Tools">
                {product.modules.map((m) => (
                  <button
                    aria-current={module === m.id ? "page" : undefined}
                    className={module === m.id ? "active" : ""}
                    key={m.id}
                    onClick={() => setModule(m.id)}
                  >
                    {m.name}
                  </button>
                ))}
                <button
                  className={module === "review" ? "active" : ""}
                  onClick={() => setModule("review")}
                >
                  Review & evidence
                </button>
              </nav>
              {module === "review" ? (
                <section className="review-panel">
                  <h2>Published revisions</h2>
                  {project.history?.length ? (
                    project.history.map((s) => (
                      <div className="revision-card" key={s.id}>
                        <div>
                          <strong>Revision {s.revision}</strong>
                          <p>
                            {new Date(s.created).toLocaleString()} ·{" "}
                            {s.digest.slice(0, 16)}
                          </p>
                        </div>
                        <button
                          disabled={dirty || s.revision !== project.revision}
                          onClick={() => {
                            setPreview(s);
                            setDialog("review");
                          }}
                        >
                          Review this revision
                        </button>
                      </div>
                    ))
                  ) : (
                    <p>No published revision yet.</p>
                  )}
                  <h2>Comments</h2>
                  {project.comments?.map((c) => (
                    <article className="comment" key={c.id}>
                      <strong>{c.actor}</strong>
                      <span>
                        {" "}
                        Revision {c.revision}
                        {c.anchor ? " · " + c.anchor : ""}
                      </span>
                      <p>{c.body}</p>
                    </article>
                  ))}
                  <Field label="Add a comment">
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="A decision, a question, or a useful next step…"
                    />
                  </Field>
                  <button
                    disabled={!comment || dirty}
                    onClick={() =>
                      run(async () => {
                        await api(
                          "api/projects/" + project.id + "/comments",
                          "POST",
                          {
                            revision: project.revision,
                            body: comment,
                            anchor: module,
                          },
                        );
                        setComment("");
                        await refreshProject();
                      })
                    }
                  >
                    Add comment
                  </button>
                  <h2>Mail evidence</h2>
                  {session.attempts
                    ?.filter((a: any) => a.project === project.id)
                    .map((a: any) => (
                      <article className="comment" key={a.id}>
                        <strong>{a.status.replaceAll("_", " ")}</strong>
                        {a.status === "failed" && (
                          <button
                            onClick={() => {
                              setMail({
                                ...mail,
                                to: a.data.to.join(", "),
                                retryOf: a.id,
                                invitationId: "",
                              });
                              setPreview(null);
                              setDialog("mail");
                            }}
                          >
                            Review a manual retry
                          </button>
                        )}
                        <p>
                          {a.data.subject} · {a.data.to.join(", ")}
                        </p>
                        <button
                          onClick={() =>
                            download(
                              new Blob([JSON.stringify(a, null, 2)], {
                                type: "application/json",
                              }),
                              "mail-receipt.json",
                            )
                          }
                        >
                          Download mail receipt
                        </button>
                      </article>
                    ))}
                  <h2>Recorded outcomes</h2>
                  {project.events?.map((e) => (
                    <article className="comment" key={e.id}>
                      <strong>{e.kind.replaceAll("_", " ")}</strong>
                      <p>
                        {e.data.name} · Revision {e.data.revision}
                      </p>
                      <p>{e.data.consent}</p>
                      <button
                        disabled={dirty || busy}
                        onClick={() =>
                          download(
                            new Blob([JSON.stringify(e, null, 2)], {
                              type: "application/json",
                            }),
                            "review-receipt.json",
                          )
                        }
                      >
                        Download receipt
                      </button>
                    </article>
                  ))}
                </section>
              ) : (
                <div className="editor-layout">
                  <section className="editor-panel">
                    <div className="panel-heading">
                      <Settings size={16} />
                      <h2>
                        {product.modules.find((m) => m.id === module)?.name}
                      </h2>
                      <span>{readonly ? "Read only" : "Your materials"}</span>
                    </div>
                    <product.Editor
                      data={draft}
                      onChange={setDraft}
                      module={module}
                      readonly={!!readonly}
                    />
                  </section>
                  <section className="preview-panel">
                    <div className="panel-heading">
                      <Layers size={16} />
                      <h2>Live preview</h2>
                      <span>Current draft</span>
                    </div>
                    <product.Preview data={draft} module={module} />
                  </section>
                </div>
              )}
              {job && (
                <div className="feedback" role="status">
                  Export: {job.status}
                  {job.error && " · " + job.error}
                  {job.file && (
                    <a className="button" href={path("api/files/" + job.file)}>
                      Download output
                    </a>
                  )}
                  {["queued", "running"].includes(job.status) && (
                    <button
                      onClick={() =>
                        run(async () =>
                          setJob(
                            await api(
                              "api/jobs/" + job.id + "/cancel",
                              "POST",
                              {},
                            ),
                          ),
                        )
                      }
                    >
                      Cancel export
                    </button>
                  )}
                </div>
              )}
              {readonly && !!project.files?.length && <section className="project-footer" aria-label="Shared attachments">{project.files.map(f => <a key={f.id} href={path("api/files/"+f.id)}>{f.name}</a>)}</section>}
              {!readonly && (
                <div className="project-footer">
                  <button
                    disabled={dirty}
                    onClick={() => {
                      setPreview(null);
                      setDialog("mail");
                    }}
                  >
                    <Send size={16} /> Compose project email
                  </button>
                  <label className="file-button">
                    <Upload size={16} /> Attach a file
                    <input
                      type="file"
                      disabled={dirty || busy}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file)
                          run(async () => {
                            const bytes = await file.arrayBuffer();
                            let value = "";
                            new Uint8Array(bytes).forEach(
                              (x) => (value += String.fromCharCode(x)),
                            );
                            await api(
                              "api/projects/" + project.id + "/files",
                              "POST",
                              {
                                name: file.name,
                                mime: file.type || "text/plain",
                                bytes: btoa(value),
                                shared: false,
                              },
                            );
                            await refreshProject();
                          });
                      }}
                    />
                  </label>
                  {project.files?.map((f) => (
                    <span key={f.id}>
                      <a href={path("api/files/" + f.id)}>{f.name}</a>{" "}
                      <button
                        disabled={dirty || busy}
                        onClick={() =>
                          run(async () => {
                            await api("api/files/" + f.id, "PUT", {
                              shared: !f.shared,
                            });
                            await refreshProject();
                          })
                        }
                      >
                        {f.shared ? "Keep private" : "Share with clients"}
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
      <Dialog
        open={!!dialog}
        onOpenChange={(open) => {
          if (!open) {
            setDialog(null);
            setPreview(null);
          }
        }}
      >
        <DialogContent>
          <DialogTitle>
            {
              {
                workspace: "Create a workspace",
                project: "Create a project",
                exports: "Take your work with you",
                team: "Team & client access",
                connection: "Your mail connections",
                mail: "Review and send",
                review: "Review this revision",
                import: "Import a project kit",
                acceptInvite: "Join your invited workspace",
              }[dialog || ""]
            }
          </DialogTitle>
          <DialogDescription>
            {dialog === "mail"
              ? "Check the exact content, recipients, and sender. Sending uses your account’s mail connection."
              : dialog === "team"
                ? "Membership belongs to this product. Client access is limited to the selected project."
                : "Your workspace keeps its own records and permissions."}
          </DialogDescription>
          {dialog === "workspace" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(async () => {
                  const w = await api("api/workspaces", "POST", {
                    name: workspaceName,
                  });
                  await refresh();
                  await selectWorkspace(w.id);
                  setDialog(null);
                });
              }}
            >
              <Field label="Workspace name">
                <input
                  required
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                />
              </Field>
              <button className="primary" disabled={busy}>
                Create workspace
              </button>
            </form>
          )}
          {dialog === "project" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(async () => {
                  const p = await api(
                    "api/workspaces/" + workspace + "/projects",
                    "POST",
                    product.seed(projectName),
                  );
                  setProjects(await api("api/workspaces/" + workspace));
                  await openProject(p.id);
                  setDialog(null);
                  setProjectName("");
                });
              }}
            >
              <Field label="Project name">
                <input
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Your next project"
                />
              </Field>
              <button className="primary" disabled={busy}>
                Create project
              </button>
            </form>
          )}
          {dialog === "exports" && (
            <div className="export-options">
              {[
                ...product.exports,
                ...(!readonly
                  ? [{ id: "kit", name: "Portable project kit" }]
                  : []),
              ].map((x) => (
                <button
                  disabled={busy}
                  key={x.id}
                  onClick={() =>
                    run(async () => {
                      await exportProject(x.id);
                      setDialog(null);
                    })
                  }
                >
                  <Download size={17} />
                  {x.name}
                  <ArrowUpRight size={15} />
                </button>
              ))}
            </div>
          )}
          {dialog === "import" && (
            <Field label="Choose a .yrp-kit.zip file">
              <input
                type="file"
                accept=".zip"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file)
                    run(async () => {
                      let data = "";
                      new Uint8Array(await file.arrayBuffer()).forEach(
                        (v) => (data += String.fromCharCode(v)),
                      );
                      const p = await api(
                        "api/workspaces/" + workspace + "/import",
                        "POST",
                        { bytes: btoa(data) },
                      );
                      await selectWorkspace(workspace);
                      await openProject(p.id);
                      setDialog(null);
                      setNotice(
                        "Imported as a new snapshot. No permissions were transferred.",
                      );
                    });
                }}
              />
            </Field>
          )}
          {dialog === "team" && (
            <>
              <div className="team-list">
                {team?.members.map((m: any) => (
                  <div key={m.account}>
                    <span>
                      {m.email} · {m.role}
                    </span>
                    {m.role !== "owner" && (
                      <div className="actions">
                        <button
                          onClick={() =>
                            run(async () => {
                              await api(
                                "api/workspaces/" + workspace + "/team",
                                "DELETE",
                                { account: m.account },
                              );
                              setTeam(
                                await api(
                                  "api/workspaces/" + workspace + "/team",
                                ),
                              );
                            })
                          }
                        >
                          Remove
                        </button>
                        <button
                          onClick={() =>
                            run(async () => {
                              await api(
                                "api/workspaces/" + workspace + "/transfer",
                                "POST",
                                { account: m.account },
                              );
                              await refresh();
                              setDialog(null);
                            })
                          }
                        >
                          Transfer ownership
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {team?.grants.map((g: any) => (
                  <div key={g.account + g.project}>
                    <span>{g.email} · Client reviewer</span>
                    <button
                      onClick={() =>
                        run(async () => {
                          await api(
                            "api/workspaces/" + workspace + "/team",
                            "DELETE",
                            { account: g.account },
                          );
                          setTeam(
                            await api("api/workspaces/" + workspace + "/team"),
                          );
                        })
                      }
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  run(async () => {
                    const i = await api(
                      "api/workspaces/" + workspace + "/invitations",
                      "POST",
                      { ...invite, project: project?.id },
                    );
                    setInvitationLink(
                      new URL(path("app") + "?invite=" + i.id, location.origin)
                        .href,
                    );
                    setMail({
                      ...mail,
                      to: i.email,
                      invitationId: i.id,
                      attachmentIds: [],
                      retryOf: "",
                    });
                    setTeam(await api("api/workspaces/" + workspace + "/team"));
                  });
                }}
              >
                <Field label="Invite by Google email">
                  <input
                    type="email"
                    required
                    value={invite.email}
                    onChange={(e) =>
                      setInvite({ ...invite, email: e.target.value })
                    }
                  />
                </Field>
                <Field label="Access">
                  <select
                    value={invite.role}
                    onChange={(e) =>
                      setInvite({ ...invite, role: e.target.value })
                    }
                  >
                    <option value="editor">Developer editor</option>
                    <option value="reviewer" disabled={!project}>
                      Client reviewer · selected project
                    </option>
                  </select>
                </Field>
                {invite.role === "reviewer" && product.id === "fieldwork" && (
                  <label>
                    <input
                      type="checkbox"
                      checked={invite.canAccept}
                      onChange={(e) =>
                        setInvite({ ...invite, canAccept: e.target.checked })
                      }
                    />{" "}
                    Allow proposal acceptance
                  </label>
                )}
                <button disabled={busy}>Create invitation</button>
              </form>
              {invitationLink && (
                <div className="invitation-result">
                  <p>Copy this link for the named recipient:</p>
                  <input
                    readOnly
                    value={invitationLink}
                    aria-label="Invitation link"
                  />
                  {project && (
                    <button
                      onClick={() => {
                        setPreview(null);
                        setDialog("mail");
                      }}
                    >
                      Email this invitation
                    </button>
                  )}
                </div>
              )}
              <h3>Pending invitations</h3>
              {team?.invitations
                .filter((i: any) => !i.revoked && !i.accepted)
                .map((i: any) => (
                  <div className="revision-card" key={i.id}>
                    <span>
                      {i.email} · expires{" "}
                      {new Date(i.expires).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() =>
                        run(async () => {
                          await api(
                            "api/workspaces/" + workspace + "/team",
                            "DELETE",
                            { invitation: i.id },
                          );
                          setTeam(
                            await api("api/workspaces/" + workspace + "/team"),
                          );
                        })
                      }
                    >
                      Revoke
                    </button>
                  </div>
                ))}
            </>
          )}
          {dialog === "acceptInvite" && (
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const result = await api(
                    "api/invitations/" + invitationLink + "/accept",
                    "POST",
                    {},
                  );
                  await refresh();
                  await selectWorkspace(result.workspace);
                  history.replaceState({}, "", path("app"));
                  setDialog(null);
                  setNotice("Invitation accepted.");
                })
              }
            >
              Accept invitation
            </button>
          )}
          {dialog === "connection" && (
            <>
              <div className="team-list">
                {session.connections.map((c: any) => (
                  <div key={c.id}>
                    <span>{c.label}</span>
                    <button
                      onClick={() =>
                        run(async () => {
                          await api("api/connections/" + c.id, "DELETE");
                          await refresh();
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  run(async () => {
                    await api("api/connections", "POST", connection);
                    await refresh();
                    setConnection({ ...connection, password: "" });
                    setNotice("Account-owned mail connection saved.");
                    setDialog(null);
                  });
                }}
              >
                {(["label", "host", "user", "password", "from"] as const).map(
                  (k) => (
                    <Field
                      key={k}
                      label={
                        {
                          label: "Connection name",
                          host: "Public SMTP hostname",
                          user: "SMTP username",
                          password: "SMTP password",
                          from: "Sender email",
                        }[k]
                      }
                    >
                      <input
                        required
                        type={
                          k === "password"
                            ? "password"
                            : k === "from"
                              ? "email"
                              : "text"
                        }
                        value={connection[k]}
                        onChange={(e) =>
                          setConnection({ ...connection, [k]: e.target.value })
                        }
                      />
                    </Field>
                  ),
                )}
                <Field label="TLS port">
                  <select
                    value={connection.port}
                    onChange={(e) =>
                      setConnection({
                        ...connection,
                        port: Number(e.target.value),
                      })
                    }
                  >
                    <option value={587}>587 · STARTTLS</option>
                    <option value={465}>465 · TLS</option>
                  </select>
                </Field>
                <button disabled={busy} className="primary">
                  Save encrypted connection
                </button>
              </form>
            </>
          )}
          {dialog === "mail" && (
            <>
              <Field label="Your sender connection">
                <select
                  value={mail.connectionId}
                  onChange={(e) => {
                    setMail({ ...mail, connectionId: e.target.value });
                    setPreview(null);
                  }}
                >
                  <option value="">Choose a connection</option>
                  {session.connections.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Recipients · comma separated">
                <input
                  value={mail.to}
                  onChange={(e) => {
                    setMail({ ...mail, to: e.target.value });
                    setPreview(null);
                  }}
                />
              </Field>
              {!mail.invitationId && (
                <fieldset>
                  <legend>Attachments</legend>
                  {project?.files?.map((f) => (
                    <label className="check-label" key={f.id}>
                      <input
                        type="checkbox"
                        checked={mail.attachmentIds.includes(f.id)}
                        onChange={(e) => {
                          setMail({
                            ...mail,
                            attachmentIds: e.target.checked
                              ? [...mail.attachmentIds, f.id]
                              : mail.attachmentIds.filter((id) => id !== f.id),
                          });
                          setPreview(null);
                        }}
                      />
                      {f.name}
                    </label>
                  ))}
                </fieldset>
              )}
              {preview && (
                <>
                  <h3>{preview.subject}</h3>
                  <p>
                    From: {preview.from} · To: {preview.to.join(", ")}
                  </p>
                  <p>
                    {preview.attachments
                      ?.map((f: any) => f.name + " (" + f.size + " bytes)")
                      .join(", ")}
                  </p>
                  <iframe
                    className="mail-preview"
                    title="Exact email preview"
                    sandbox=""
                    srcDoc={preview.html}
                  />
                  <details>
                    <summary>Plain-text version</summary>
                    <pre>{preview.text}</pre>
                  </details>
                </>
              )}
              <DialogFooter>
                {!preview ? (
                  <button
                    disabled={busy || !mail.connectionId || !mail.to}
                    onClick={() => run(sendPreview)}
                  >
                    Review exact email
                  </button>
                ) : (
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        const outcome = await api("api/mail/send", "POST", {
                          projectId: project!.id,
                          revision: project!.revision,
                          ...mail,
                          to: preview.to,
                          digest: preview.digest,
                          confirm: true,
                        });
                        setNotice(
                          "Mail outcome: " +
                            outcome.status.replaceAll("_", " "),
                        );
                        await refresh();
                        setPreview(null);
                        setMail({
                          ...mail,
                          invitationId: "",
                          retryOf: "",
                          attachmentIds: [],
                        });
                        setDialog(null);
                      })
                    }
                  >
                    <Send size={16} /> Confirm and send
                  </button>
                )}
              </DialogFooter>
            </>
          )}
          {dialog === "review" && preview && (
            <>
              <p>
                Revision {preview.revision} · {preview.digest.slice(0, 16)}
              </p>
              <div className="snapshot-preview">
                <product.Preview
                  data={preview.data}
                  module={module === "review" ? product.modules[0].id : module}
                />
              </div>
              {product.id === "fieldwork" && project?.canAccept && (
                <>
                  <Field label="Your full name">
                    <input
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                    />
                  </Field>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={acceptConsent}
                      onChange={(e) => setAcceptConsent(e.target.checked)}
                    />
                    I accept the scope, price, schedule, and terms in this exact
                    proposal revision.
                  </label>
                  <p>
                    This records your verified account, typed name, consent,
                    revision, digest, and time. It is recorded acceptance, not a
                    certified electronic signature.
                  </p>
                </>
              )}
              <Field label="Review or explicit acceptance">
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Describe your decision…"
                />
              </Field>
              <DialogFooter>
                {[
                  "approved",
                  "changes_requested",
                  ...(product.id === "fieldwork" && project?.canAccept
                    ? ["acceptance"]
                    : []),
                ].map((kind) => (
                  <button
                    disabled={
                      busy ||
                      !reviewText ||
                      (kind === "acceptance" &&
                        (!acceptConsent || signerName.trim().length < 2))
                    }
                    key={kind}
                    onClick={() =>
                      run(async () => {
                        await api(
                          "api/snapshots/" + preview.id + "/review",
                          "POST",
                          {
                            kind,
                            body: reviewText,
                            name: signerName,
                            confirm: acceptConsent,
                          },
                        );
                        setDialog(null);
                        setReviewText("");
                        setSignerName("");
                        setAcceptConsent(false);
                        await refreshProject();
                        setNotice(
                          "Your decision was recorded against this exact revision.",
                        );
                      })
                    }
                  >
                    {kind === "acceptance"
                      ? "Accept proposal"
                      : kind === "approved"
                        ? "Approve"
                        : "Request changes"}
                  </button>
                ))}
              </DialogFooter>
            </>
          )}
          {error && (
            <div className="feedback error" role="alert">
              {error}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
