import { TOKENS } from "./tokens";

// The approved mock's token set and components (research/phase-10/2026-11-13-page-design-mock.html), without the
// document around its three screens. Fonts come from Google Fonts; each stack falls back to system fonts offline.
export const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Mono:wght@400;600&family=Atkinson+Hyperlegible+Next:wght@400;500;600;700&family=Bricolage+Grotesque:opsz,wght@12..96,500..800&display=swap";

// Person discs .h0 … .h3: violet, pink, teal, slate; a fifth person reuses the first hue.
export const HUES = 4;

export const STYLES = `${TOKENS}
[hidden] { display: none !important; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--sunk); color: var(--ink); font-family: var(--sans); font-size: 17px; line-height: 1.5; }
p { margin: 0; }
b, strong { font-weight: 700; }
a { color: inherit; text-decoration: none; }
.fine { color: var(--muted); font-size: 15.5px; max-width: 70ch; }
code { font: 600 0.9em var(--mono); background: var(--soft); border-radius: 5px; padding: 2px 6px; }
button:focus-visible, summary:focus-visible, a:focus-visible { outline: 3px solid var(--move); outline-offset: 2px; }
/* priority: weight, not hue */
.pri { display: inline-flex; align-items: center; justify-content: center; flex: none; width: 46px; height: 30px; border-radius: 8px; box-sizing: border-box; font: 800 15px/1 var(--display); }
.pri.p0 { background: var(--p0-bg); color: var(--p0-fg); }
.pri.p1 { border: 2px solid var(--ink); color: var(--ink); }
.pri.p2, .pri.p3 { border: 2px solid var(--line); color: var(--muted); }
.pri.none { border: 1.5px dashed var(--line); color: var(--faint); }
/* people: a hue each; solid = a session is writing now, tinted = has it, dashed = nobody */
.who { flex: none; display: inline-grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; box-sizing: border-box; font: 800 14px/1 var(--display);
  border: 2px solid var(--c, var(--faint)); background: var(--cb, transparent); color: var(--c, var(--faint)); }
.who.h0 { --c: var(--hue0); --cb: var(--hue0-bg); }
.who.h1 { --c: var(--hue1); --cb: var(--hue1-bg); }
.who.h2 { --c: var(--hue2); --cb: var(--hue2-bg); }
.who.h3 { --c: var(--hue3); --cb: var(--hue3-bg); }
.who.on { background: var(--c); color: var(--on-who); box-shadow: 0 0 0 3px var(--cb); }
.who.none { border-style: dashed; }
.who.sm { width: 24px; height: 24px; font-size: 12px; }
.who.sm.on { box-shadow: 0 0 0 2px var(--cb); }
/* phase squares: hollow orange = to do, half blue = doing, full blue = built, green with a tick = live */
.strip { display: inline-flex; flex-wrap: wrap; gap: 4px; }
.sq { position: relative; flex: none; display: inline-block; width: 18px; height: 18px; border-radius: 5px; box-sizing: border-box; border: 2px solid var(--todo); background: var(--todo-bg); }
.sq.doing { border-color: var(--move); background: linear-gradient(90deg, var(--move) 50%, var(--move-bg) 50%); }
.sq.built { border-color: var(--move); background: var(--move); }
.sq.live { border-color: var(--done); background: var(--done); }
.sq.live::after { content: ""; position: absolute; left: 4.5px; top: 1px; width: 4px; height: 8px; border: solid var(--on-solid); border-width: 0 2.5px 2.5px 0; transform: rotate(45deg); box-sizing: content-box; }
/* deadline chips: never wrap */
.due { display: inline-flex; align-items: center; white-space: nowrap; height: 30px; padding: 0 12px; border-radius: 8px; box-sizing: border-box; font: 600 14px/1 var(--sans); font-variant-numeric: tabular-nums;
  background: var(--soft); color: var(--ink); border: 1.5px solid transparent; }
.due.late { background: var(--late); color: var(--on-late); font-weight: 700; }
.due.soon { background: var(--late-bg); color: var(--late-ink); border-color: var(--late); font-weight: 700; }
.due.none { background: none; border: 1.5px dashed var(--faint); color: var(--muted); font-weight: 500; }
.due.sm { height: 24px; padding: 0 8px; border-radius: 6px; font-size: 13px; }
/* waits on you */
.waits { display: inline-flex; align-items: center; gap: 7px; white-space: nowrap; height: 26px; padding: 0 10px 0 8px; border-radius: 6px; background: var(--you); color: var(--you-ink); font: 700 13.5px/1 var(--sans); }
.waits::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--you-ink); }
/* progress bar */
.pbar { display: flex; gap: 2px; height: 14px; border-radius: 7px; overflow: hidden; background: var(--soft); }
.pbar i { display: block; min-width: 5px; }
.pbar .d { background: var(--done); } .pbar .m { background: var(--move); } .pbar .t { background: var(--todo); }
.spec-bar { display: inline-flex; align-items: center; gap: 6px; min-width: 96px; flex: 1 1 96px; font: 600 13px/1 var(--sans); color: var(--muted); font-variant-numeric: tabular-nums; }
.spec-bar .pbar { flex: 1; min-width: 48px; height: 10px; } .fold .spec-bar { flex: 0 1 160px; }
.pbar.empty { background: none; border: 1.5px dashed var(--faint); box-sizing: border-box; }
.chev { flex: none; display: inline-block; width: 8px; height: 8px; border: solid var(--faint); border-width: 0 2.5px 2.5px 0; transform: rotate(-45deg); transition: transform .15s; }
/* session chips */
.sess { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; max-width: 100%; min-height: 36px; padding: 4px 14px 4px 5px; border-radius: 18px; box-sizing: border-box;
  background: var(--surface); border: 1.5px solid var(--line); font: 500 14.5px/1.2 var(--sans); color: var(--muted); font-variant-numeric: tabular-nums; }
.sess b { color: var(--ink); font-weight: 600; }
.sess .now { color: var(--move-ink); font-weight: 700; }
.sess.silent { border-color: var(--late); background: var(--late-bg); color: var(--late-ink); font-weight: 600; }
.sess.silent b { color: var(--late-ink); font-weight: 700; }
.sess.mini { min-height: 30px; padding: 2px 10px 2px 3px; font-size: 13.5px; }
.btn { font: 600 14.5px var(--sans); min-height: 36px; padding: 0 14px; border: 1.5px solid var(--line); background: var(--surface); color: var(--ink); border-radius: 8px; cursor: pointer; }
.btn.pick { background: var(--p0-bg); color: var(--p0-fg); border-color: var(--p0-bg); }
.chips { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.grp { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-right: 16px; }
.chip { display: inline-flex; align-items: center; min-height: 34px; padding: 0 14px; border-radius: 999px; box-sizing: border-box; font: 600 14px var(--sans); border: 1.5px solid var(--line); color: var(--muted); background: var(--surface); }
button.chip { cursor: pointer; }
.chip.on { background: var(--ink); color: var(--surface); border-color: var(--ink); }
.more { font: 500 14.5px var(--sans); color: var(--muted); }
.fold { display: inline-flex; align-items: center; gap: 9px; min-height: 34px; padding: 0 14px; border-radius: 8px; box-sizing: border-box; border: 1.5px solid var(--line); color: var(--muted); font: 600 14px var(--sans); }
.folds { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }

.screen { container-type: inline-size; background: var(--sunk); min-height: 100vh; }
.bar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; padding: 14px 24px; background: var(--band); color: var(--band-muted); font: 500 14.5px var(--sans); }
.bar .name { color: var(--band-fg); font: 700 18px var(--display); margin-right: 6px; }
.nav { display: inline-flex; align-items: center; gap: 8px; height: 34px; padding: 0 14px; border-radius: 999px; background: var(--band-pill); color: var(--band-fg); font-weight: 600; }
.nav.on { background: var(--band-fg); color: var(--band); }
.nav i { font: 800 13px/22px var(--display); min-width: 22px; height: 22px; border-radius: 11px; background: var(--you); color: var(--you-ink); text-align: center; }
.cid { font: 600 14px var(--mono); color: var(--band-fg); background: var(--band-pill); border-radius: 6px; padding: 4px 9px; }
.total { display: inline-flex; align-items: center; gap: 10px; font-variant-numeric: tabular-nums; }
.total .pbar { width: 90px; height: 8px; background: var(--band-pill); }
.beat { margin-left: auto; display: inline-flex; align-items: center; gap: 8px; color: var(--band-fg); font-variant-numeric: tabular-nums; }
.beat i { width: 10px; height: 10px; border-radius: 50%; background: var(--band-fg); }
.deadline { display: none; padding: 12px 24px; background: var(--late); color: var(--on-late); font-weight: 700; font-size: 16px; }
.screen.dead .deadline { display: block; }
.screen.dead .beat i { background: var(--late); box-shadow: 0 0 0 3px var(--band-pill); }
.screen.dead .body { filter: grayscale(1); opacity: 0.45; }
.body { padding: 24px; display: flex; flex-direction: column; gap: 28px; transition: opacity .2s; }
.lane { display: flex; flex-direction: column; gap: 12px; }
.lane > .h { font: 700 19px/1.2 var(--display); display: flex; align-items: baseline; gap: 10px; }
.slab { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 4px 18px; }

.plan { display: flex; flex-direction: column; gap: 10px; }
.gh { display: flex; align-items: center; gap: 12px; margin-top: 26px; font: 800 26px/1 var(--display); }
.gh:first-child { margin-top: 0; }
.gh::after { content: ""; flex: 1; height: 2px; border-radius: 1px; background: var(--line); }
details.proj { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; min-width: 0; }
details.proj > summary { list-style: none; cursor: pointer; display: grid; grid-template-columns: 46px minmax(0, 1fr) minmax(190px, 250px) 32px 150px 12px; gap: 8px 20px; align-items: center; padding: 15px 22px; border-radius: 14px; }
details.proj.p0 > summary { padding-block: 20px; }
details.proj > summary::-webkit-details-marker { display: none; }
details.proj[open] > summary .chev { transform: rotate(45deg); }
.pn { min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
.pn b { font: 700 18px/1.2 var(--display); }
details.p0 .pn b { font-size: 21px; font-weight: 800; }
.pn > span:not(.waits) { color: var(--muted); font-size: 15px; line-height: 1.35; }
.pprog { min-width: 0; display: flex; flex-direction: column; gap: 8px; }
.pcount { display: flex; flex-wrap: wrap; gap: 3px 12px; font: 500 13.5px/1.2 var(--sans); color: var(--muted); font-variant-numeric: tabular-nums; }
.pcount span { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
.pcount span::before { content: ""; width: 9px; height: 9px; border-radius: 3px; }
.pcount .d::before { background: var(--done); } .pcount .m::before { background: var(--move); } .pcount .t::before { background: var(--todo); }
.pcount .z::before { display: none; }
.whos { display: inline-flex; gap: 4px; justify-content: center; }
.pdue { display: flex; justify-content: flex-end; }
.panels { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px; align-items: start; padding: 2px 22px 22px 88px; }
.panel { background: var(--bg); border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; min-width: 0; }
.panel.open { background: none; border: 1.5px dashed var(--faint); }
.panel.done { background: var(--done-bg); border-color: transparent; color: var(--done-ink); }
.ph { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; min-height: 30px; }
.ph b { font: 600 14.5px var(--mono); overflow-wrap: anywhere; min-width: 0; }
.panel.open .ph b, .panel.done .ph b { font: 700 17px var(--display); display: inline-flex; align-items: center; gap: 9px; }
.ph .nobody { display: inline-flex; align-items: center; gap: 7px; font-size: 13.5px; color: var(--muted); }
.ph .n { display: inline-flex; align-items: center; gap: 9px; font: 700 15px var(--sans); }
.panel.done .chev { border-color: var(--done-ink); }
.pc { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; padding: 12px 0; border-top: 1px solid var(--line); }
.ph + .pc { margin-top: 12px; }
.pc:last-child { padding-bottom: 2px; }
.pc b { font-weight: 600; font-size: 15.5px; line-height: 1.3; }
.pmeta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }

.needs { display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 14px; background: var(--you-bg); border-radius: 18px; padding: 14px; }
.count { background: var(--you); color: var(--you-ink); border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 4px; font-variant-numeric: tabular-nums; }
.count b { font: 800 88px/0.82 var(--display); }
.count span { font: 700 18px var(--display); }
.count small { margin-top: auto; padding-top: 16px; display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; font: 600 14px var(--sans); }
.count small .oc { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.rows { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.ny { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; background: var(--surface); border-radius: 12px; padding: 12px 16px 12px 12px; min-width: 0; }
.ny .k { flex: none; width: 40px; height: 40px; border-radius: 10px; background: var(--you); color: var(--you-ink); font: 700 16px/40px var(--sans); text-align: center; }
.ny.late .k { background: var(--late); color: var(--on-late); }
.ny .t { flex: 1 1 240px; min-width: 0; font-weight: 600; font-size: 16.5px; line-height: 1.3; }
.ny .t span { display: block; color: var(--muted); font-weight: 400; font-size: 14.5px; margin-top: 3px; }
.ny .t em { font-style: normal; font-weight: 700; color: var(--late-ink); }
.ny .acts { display: inline-flex; flex-wrap: wrap; gap: 8px; }
.ny .age { margin-left: auto; display: inline-flex; align-items: center; gap: 7px; font: 500 14px var(--sans); color: var(--muted); font-variant-numeric: tabular-nums; }
.fleet { display: flex; flex-wrap: wrap; gap: 8px; }
.row { display: grid; grid-template-columns: 46px minmax(0, 1fr) 106px 32px 40px; gap: 8px 18px; align-items: center; padding: 14px 0; border-top: 1px solid var(--line); }
.row:first-child { border-top: 0; }
.title { min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 5px; }
.title b { font-weight: 600; font-size: 16.5px; line-height: 1.3; }
.title.p0 b { font-weight: 700; }
.sub { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; color: var(--muted); font-size: 14.5px; }
.age2 { font: 500 14px var(--sans); color: var(--muted); text-align: right; font-variant-numeric: tabular-nums; }
.age2.now { color: var(--move-ink); font-weight: 700; }
.demo { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; font-size: 15.5px; color: var(--muted); }

.sheet { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 28px; display: flex; flex-direction: column; gap: 24px; }
.sheet h4 { margin: 0; font: 800 30px/1.12 var(--display); letter-spacing: -0.01em; text-wrap: balance; }
.sheet .ny { background: var(--you-bg); }
.kv { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.tag { display: inline-flex; align-items: center; height: 30px; padding: 0 12px; border-radius: 8px; box-sizing: border-box; font: 600 14px/1 var(--sans); background: var(--soft); color: var(--ink); white-space: nowrap; }
.tag.todo { background: var(--todo-bg); color: var(--todo-ink); border: 1.5px solid var(--todo); }
.end { margin: 10px 0 0; padding: 8px 12px; border-radius: 8px; font-size: 15.5px; line-height: 1.35; background: var(--soft); color: var(--muted); }
.end.done { background: var(--done-bg); color: var(--done-ink); } .end b { margin-right: 4px; }
.note { margin: 0; color: var(--muted); font-size: 15.5px; line-height: 1.45; white-space: pre-line; overflow-wrap: anywhere; }
blockquote { margin: 0; background: var(--bg); border-radius: 12px; padding: 20px 22px; font-size: 20px; line-height: 1.4; }
blockquote footer { display: flex; flex-wrap: wrap; gap: 4px 16px; font-size: 14.5px; color: var(--muted); margin-top: 12px; }
.phases { display: flex; flex-direction: column; }
.phase { display: grid; grid-template-columns: 18px minmax(0, 1fr) auto; gap: 12px; align-items: center; font-size: 16px; padding: 10px 0; border-top: 1px solid var(--line); }
.phase:first-child { border-top: 0; }
.st { font: 600 14px var(--sans); color: var(--todo-ink); white-space: nowrap; }
.st.doing, .st.built { color: var(--move-ink); } .st.live { color: var(--done-ink); }
.last { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; color: var(--muted); font-size: 15.5px; }
.copy { align-self: flex-start; font: 700 16.5px var(--display); min-height: 46px; padding: 0 22px; background: var(--p0-bg); color: var(--p0-fg); border: 0; border-radius: 10px; cursor: pointer; }

@container (max-width: 800px) {
  .bar { padding: 12px 14px; }
  .deadline { padding: 12px 14px; }
  .body { padding: 14px; gap: 24px; }
  .grp { margin-right: 0; }
  details.proj > summary, details.proj.p0 > summary { grid-template-columns: 46px minmax(0, 1fr) auto; grid-template-areas: "pri name who" "prog prog prog" "due due chev"; gap: 14px; padding: 16px; }
  details.proj > summary > .pri { grid-area: pri; align-self: start; }
  details.proj > summary > .pn { grid-area: name; }
  details.proj > summary > .whos { grid-area: who; align-self: start; }
  details.proj > summary > .pprog { grid-area: prog; }
  details.proj > summary > .pdue { grid-area: due; justify-content: flex-start; }
  details.proj > summary > .chev { grid-area: chev; justify-self: end; margin-right: 4px; }
  .panels { padding: 0 12px 12px; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
  .needs { grid-template-columns: minmax(0, 1fr); padding: 10px; }
  .count { flex-direction: row; align-items: center; gap: 12px; padding: 12px 16px; }
  .count b { font-size: 52px; line-height: 0.9; }
  .count small { margin: 0 0 0 auto; padding: 0; }
  .slab { padding: 2px 14px; }
  .row { grid-template-columns: 46px minmax(0, 1fr) 32px 40px; gap: 10px 12px; }
  .row .title { grid-column: 2 / -1; grid-row: 1; }
  .row .pri { grid-row: 1; align-self: start; }
  .row .strip { grid-column: 2; grid-row: 2; }
  .row .who { grid-column: 3; grid-row: 2; }
  .row .age2 { grid-column: 4; grid-row: 2; }
  .ny { padding: 12px; }
  .ny .t { flex-basis: 170px; }
  .sheet { padding: 18px; gap: 20px; }
  .sheet h4 { font-size: 25px; }
  blockquote { font-size: 18px; padding: 16px; }
}
/* the live page: answers, folds, empty states */
.body { max-width: 1120px; margin: 0 auto; }
.ny input { font: 500 14.5px var(--sans); min-height: 36px; padding: 0 10px; border: 1.5px solid var(--line); border-radius: 8px; background: var(--surface); color: var(--ink); min-width: 0; width: 12em; }
.ny .said { font-size: 14.5px; color: var(--muted); }
.ny .said:empty { display: none; }
details.folded > summary { list-style: none; cursor: pointer; }
details.folded > summary::-webkit-details-marker { display: none; }
details.folded[open] > summary .chev, details.panel[open] .chev { transform: rotate(45deg); }
details.folded > .slab, details.folded > .rows { margin-top: 12px; }
.notice { background: var(--surface); border: 1.5px dashed var(--faint); border-radius: 14px; padding: 18px 22px; color: var(--muted); }
.empty { color: var(--muted); font-size: 15.5px; padding: 12px 0; }
a.row, a.pc, a.t { color: inherit; }
a.t:hover b, a.t:hover { text-decoration: underline; text-decoration-thickness: 1.5px; text-underline-offset: 3px; }
a.row:hover .title b, a.pc:hover b { text-decoration: underline; text-underline-offset: 3px; }
.toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 10; max-width: min(640px, calc(100vw - 32px)); padding: 14px 20px; border-radius: 12px; background: var(--p0-bg); color: var(--p0-fg); font: 600 15.5px/1.35 var(--sans); box-shadow: 0 8px 24px rgb(0 0 0 / 0.25); }
.toast.bad { background: var(--late); color: var(--on-late); }
@media (prefers-reduced-motion: reduce) { .body, .chev { transition: none; } }
`;
