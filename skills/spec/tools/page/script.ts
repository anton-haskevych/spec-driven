// The page's only script. It holds no board rule: the server renders every screen and pushes each new render.
export const PAGE_SCRIPT = `(() => {
  const DEAD_AFTER_S = 15;
  const app = document.getElementById("app");
  const screen = document.getElementById("screen");
  const state = { lastTick: Date.now(), sort: "rank", show: "", filter: "", folds: new Map(), pending: null };
  const all = (selector) => Array.from(app.querySelectorAll(selector));

  function route() {
    const hash = decodeURIComponent(location.hash.slice(1));
    const card = /^c[1-9][0-9]*$/.test(hash) ? document.getElementById(hash) : null;
    const view = card ? "card" : hash === "plan" ? "plan" : "now";
    all("[data-view]").forEach((node) => {
      const own = node.dataset.view;
      node.hidden = own === "card" ? node !== card : own === "cards" ? !card : own !== view;
    });
    all("[data-nav]").forEach((node) => node.classList.toggle("on", node.dataset.nav === view));
    const cid = document.getElementById("cid");
    cid.hidden = !card;
    cid.textContent = card ? hash : "";
  }

  function apply() {
    all("details[data-id]").forEach((node) => { if (state.folds.has(node.dataset.id)) node.open = state.folds.get(node.dataset.id); });
    const plan = document.getElementById("plan");
    if (plan) {
      const nodes = Array.from(plan.children).filter((node) => node.dataset.rank !== undefined);
      const key = (node) => (state.sort === "rank" ? Number(node.dataset.rank) : node.dataset.due || "9999");
      nodes.sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : Number(a.dataset.rank) - Number(b.dataset.rank)));
      nodes.forEach((node) => { if (node.classList.contains("gh")) node.hidden = state.sort !== "rank"; plan.appendChild(node); });
    }
    all("details.proj").forEach((node) => { node.hidden = (state.show === "mine" && node.dataset.mine !== "1") || (state.show === "nobody" && node.dataset.nobody !== "1"); });
    all("#moving [data-tags]").forEach((node) => { node.hidden = state.filter !== "" && !node.dataset.tags.split("|").includes(state.filter); });
    all("[data-sort]").forEach((node) => node.classList.toggle("on", node.dataset.sort === state.sort));
    all("[data-show]").forEach((node) => node.classList.toggle("on", node.dataset.show === state.show));
    all("[data-filter]").forEach((node) => node.classList.toggle("on", node.dataset.filter === state.filter));
  }

  function swap(render) {
    const typing = all("form.answer input").some((input) => input.value.trim() !== "");
    state.pending = typing ? render : null;
    if (typing) return;
    app.innerHTML = render.html;
    document.title = render.title;
    apply();
    route();
  }

  let toastTimer = 0;
  function toast(text, bad) {
    const node = document.getElementById("toast");
    node.textContent = text;
    node.classList.toggle("bad", Boolean(bad));
    node.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { node.hidden = true; }, 8000);
  }

  function beat() {
    const quiet = Math.round((Date.now() - state.lastTick) / 1000);
    const dead = quiet > DEAD_AFTER_S;
    screen.classList.toggle("dead", dead);
    const label = document.getElementById("beat");
    if (label) label.textContent = dead ? "no signal · " + quiet + " s" : "live · " + quiet + " s ago";
    const banner = document.getElementById("deadline");
    if (banner) banner.textContent = "No update for " + quiet + " s. This board may be wrong.";
  }

  app.addEventListener("toggle", (event) => { if (event.target.dataset && event.target.dataset.id) state.folds.set(event.target.dataset.id, event.target.open); }, true);
  app.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-sort],[data-show],[data-filter]");
    if (chip) {
      if (chip.dataset.sort !== undefined) state.sort = chip.dataset.sort;
      if (chip.dataset.show !== undefined) state.show = chip.dataset.show;
      if (chip.dataset.filter !== undefined) state.filter = chip.dataset.filter;
      apply();
    }
    const copy = event.target.closest("[data-copy]");
    if (copy) {
      const note = copy.nextElementSibling;
      navigator.clipboard.writeText(copy.dataset.copy).then(() => { note.textContent = "Copied. Paste it into a session."; }, () => { note.textContent = copy.dataset.copy; });
    }
  });
  app.addEventListener("submit", async (event) => {
    const form = event.target.closest("form.answer");
    if (!form) return;
    event.preventDefault();
    const text = (event.submitter && event.submitter.value) || form.elements.own.value.trim();
    const said = form.querySelector(".said");
    if (!text) { said.textContent = "Type an answer first."; return; }
    said.textContent = "Sending…";
    try {
      const response = await fetch("/answer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spec: form.dataset.spec, id: form.dataset.question, text, ifVersion: form.dataset.version }) });
      const reply = await response.json();
      const line = reply.line;
      toast(line, !reply.ok);
      form.elements.own.value = "";
      if (state.pending) swap(state.pending);
      const now = app.querySelector('form.answer[data-question="' + form.dataset.question + '"] .said');
      (now || said).textContent = line;
    } catch (error) {
      said.textContent = "Not sent: the page lost its server.";
      toast(said.textContent, true);
    }
  });

  const events = new EventSource("/events");
  events.addEventListener("tick", () => { state.lastTick = Date.now(); beat(); });
  events.addEventListener("render", (event) => { state.lastTick = Date.now(); swap(JSON.parse(event.data)); beat(); });
  window.addEventListener("hashchange", route);
  setInterval(beat, 1000);
  apply();
  route();
  beat();
})();`;
