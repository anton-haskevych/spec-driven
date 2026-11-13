import { esc } from "./marks";
import type { PageModel } from "./model";
import { cardSheet } from "./render-card";
import { nowView } from "./render-now";
import { planView } from "./render-plan";
import { PAGE_SCRIPT } from "./script";
import { FONTS_URL, STYLES } from "./styles";

// The server builds every screen; the page script only swaps a new render in, shows the screen the address
// names, folds, sorts, filters and posts an answer.
export interface PageRender {
  title: string;
  html: string;
}

export function renderApp(model: PageModel): PageRender {
  const now = new Date(model.generatedAt);
  const notice = model.notice ? `<div class="notice">${esc(model.notice)}</div>` : "";
  const nowScreen = `<section class="body" data-view="now">${notice}${nowView(model, now)}</section>`;
  const plan = `<section class="body" data-view="plan" hidden>${notice}${planView(model, now)}</section>`;
  const cards = `<div class="body" data-view="cards">${model.cards.map((card) => cardSheet(model, card, now)).join("")}</div>`;
  return { title: pageTitle(model), html: bar(model) + nowScreen + plan + cards };
}

export function renderPage(model: PageModel): string {
  const { title, html } = renderApp(model);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${FONTS_URL}">
<style>${STYLES}</style></head>
<body><div class="screen" id="screen"><div id="app">${html}</div></div>
<script>${PAGE_SCRIPT}</script></body></html>`;
}

export function pageTitle(model: PageModel): string {
  const name = `Live board · ${model.repo}`;
  return model.needs.mine > 0 ? `(${model.needs.mine}) ${name}` : name;
}

function bar(model: PageModel): string {
  const { done, all } = model.totals;
  const total = all > 0 ? `<span class="total"><span class="pbar"><i class="d" style="flex:${done}"></i><i style="flex:${all - done}"></i></span>${done} of ${all} done</span>` : "";
  const nav = `<a class="nav" href="#now" data-nav="now">Now<i>${model.needs.mine}</i></a><a class="nav" href="#plan" data-nav="plan">Plan</a><span class="cid" id="cid" hidden></span>`;
  const beat = `<span class="beat" id="beat-wrap"><i></i><span id="beat">live</span></span>`;
  return `<div class="bar"><span class="name">Live board · ${esc(model.repo)}</span>${nav}${total}${beat}</div><div class="deadline" id="deadline">No update for 15 s. This board may be wrong.</div>`;
}
