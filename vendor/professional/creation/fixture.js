export function recipeFixture(state = "ready") {
  return {
    state,
    rows: [
      {
        id: "release",
        name: "Release plan",
        details: "Fictional review material.",
        status: "in_review",
        revision: 4,
      },
      {
        id: "research",
        name: "Research notes",
        details: "Fictional source notes.",
        status: "draft",
        revision: 2,
      },
    ],
    selectedId: "release",
    settings: { name: "Northstar Studio", details: "Fictional preferences" },
    before: "Weekly update with unresolved notes.",
    after: "A clear update with decisions and supporting links.",
    task: {
      status: state === "ready" ? "running" : state,
      message: "Fictional task receipt; no job is running.",
      ...(["ready", "running", "success"].includes(state)
        ? { progress: state === "success" ? 100 : 60 }
        : {}),
    },
    receipt: {
      outcome: "Fixture: changes saved",
      revision: "4 → 5",
      evidence: "Fictional reviewed sections",
      delivery: "No external delivery",
    },
    navigation: [
      { id: "overview", name: "Overview" },
      { id: "projects", name: "Projects" },
      { id: "settings", name: "Settings" },
    ],
  };
}
