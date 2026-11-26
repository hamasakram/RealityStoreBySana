// RealityStore "Try & vote" (#shop, #shop-<zone|category>)
// Preview mode: the test line-up (one product per category). Try each on, vote "I want this".
import * as S from '../store.js';
import { esc, icon, productCard, catLabel, zoneLabel, arLevel, ZONE_ICON, debounce, go } from '../ui.js';
import { ZONES, CATEGORIES } from '../data.js';

// Survive hash changes between categories
let search = '';
let sort = 'category';

const SORTS = [
  ['category', 'Category'],
  ['wanted', 'Most wanted'],
  ['price-asc', 'Expected price: low to high'],
  ['price-desc', 'Expected price: high to low'],
];

function parse(param) {
  const zone = ZONES.find(z => z.id === param);
  if (zone) return { kind: 'zone', zone: zone.id, cats: zone.cats, title: `${zone.label} · ${zone.blurb}` };
  const cat = CATEGORIES.find(c => c.id === param);
  if (cat) return { kind: 'cat', zone: cat.zone, cats: [cat.id], title: cat.label };
  return { kind: 'all', title: 'Try & vote' };
}

function base(f) {
  const all = S.products();
  if (f.kind === 'zone' || f.kind === 'cat') return all.filter(p => f.cats.includes(p.category));
  return all;
}

function results(f) {
  const q = search.trim().toLowerCase();
  let list = base(f);
  if (q) {
    const words = q.split(/\s+/);
    list = list.filter(p => {
      const hay = [p.name, p.category, catLabel(p.category), zoneLabel(p.zone), p.model, p.desc, ...(p.colors || []).map(c => c.name)].join(' ').toLowerCase();
      return words.every(w => hay.includes(w));
    });
  }
  const order = id => CATEGORIES.findIndex(c => c.id === id);
  const s = [...list];
  if (sort === 'wanted') s.sort((a, b) => S.wantCount(b.id) - S.wantCount(a.id) || order(a.category) - order(b.category));
  else if (sort === 'price-asc') s.sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') s.sort((a, b) => b.price - a.price);
  else s.sort((a, b) => order(a.category) - order(b.category));
  return s;
}

const plural = n => `${n} ${n === 1 ? 'product' : 'products'}`;
function countText(f, n) {
  const total = base(f).length;
  return search.trim() ? `Showing ${n} of ${plural(total)}` : `${plural(n)} to try`;
}

function gridHTML(f) {
  const list = results(f);
  if (!list.length) {
    if (!base(f).length) {
      return `<div class="glass empty">${icon('cube')}<h3>Nothing to try here yet</h3>
        <p class="muted">This part of the line-up is still on its way. Try the other categories in the meantime.</p>
        <a class="btn btn-try" href="#shop">${icon('grid')} See the whole line-up</a></div>`;
    }
    return `<div class="glass empty">${icon('search')}<h3>No matches for “${esc(search.trim())}”</h3>
      <p class="muted">The test line-up is small — one piece per category. Clear the search to see them all.</p>
      <button class="btn btn-try" type="button" data-clear>${icon('refresh')} Clear search</button></div>`;
  }
  return `<div class="products tv-grid ${list.length === 1 ? 'one' : ''}">${list.map(productCard).join('')}</div>`;
}

function crumbs(f, param) {
  const parts = [['#home', 'Home'], ['#shop', 'Try & vote']];
  if (f.kind === 'zone') parts.push([null, zoneLabel(f.zone)]);
  else if (f.kind === 'cat') { parts.push([`#shop-${f.zone}`, zoneLabel(f.zone)]); parts.push([null, catLabel(param)]); }
  else parts[1] = [null, 'Try & vote'];
  return `<nav class="breadcrumbs" aria-label="Breadcrumb">${parts.map(([h, t], i) =>
    `${i ? '<span aria-hidden="true">/</span>' : ''}${h ? `<a href="${h}">${esc(t)}</a>` : `<span aria-current="page" class="here">${esc(t)}</span>`}`).join('')}</nav>`;
}

function chips(f, param) {
  const catOn = c => (f.kind === 'zone' || f.kind === 'cat') && f.cats.includes(c);
  return `<div class="chips" role="group" aria-label="Category">
    <a class="chip ${f.kind === 'all' ? 'on' : ''}" href="#shop" ${f.kind === 'all' ? 'aria-current="page"' : ''}>${icon('grid')}All ${S.products().length}</a>
    ${CATEGORIES.map(c => `<a class="chip ${catOn(c.id) ? 'on' : ''}" href="#shop-${c.id}" ${param === c.id ? 'aria-current="page"' : ''}>${icon(ZONE_ICON[c.zone])}${esc(c.label)}</a>`).join('')}
  </div>`;
}

const CSS = `<style>
.v-shop{overflow-x:clip}
.v-shop .shop-head{position:relative;padding:4px 0 8px}
.v-shop .shop-head .orb{width:520px;height:420px;right:-200px;top:-200px;filter:none;opacity:1;
  background:radial-gradient(closest-side,rgba(143,184,160,.32),rgba(143,184,160,0))}
.v-shop .breadcrumbs{margin:22px 0 14px}
.v-shop .breadcrumbs .here{color:var(--mist)}
.v-shop .title-row{display:flex;align-items:flex-end;justify-content:space-between;gap:12px 24px;flex-wrap:wrap}
.v-shop h1{font-size:clamp(30px,4vw,46px);margin:0}
.v-shop .title-ico{display:inline-grid;place-items:center;flex:none;width:52px;height:52px;border-radius:16px;margin-right:14px;background:var(--gloss-violet);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 8px 22px rgba(47,93,70,0.248)}
.v-shop .title-ico .ico{width:26px;height:26px;color:#fff}
.v-shop .title-wrap{display:flex;align-items:center}
.v-shop .lede{margin:10px 0 0;max-width:62ch;color:var(--mist)}
.v-shop .lede b{color:var(--text);font-weight:600}
.v-shop .rcount{display:inline-flex;align-items:center;gap:8px;font:600 15px var(--f-body);color:var(--mist)}
.v-shop .ar-note{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:16px;max-width:720px}
.v-shop .ar-note .ico{color:var(--violet-hi)}
.v-shop .ar-note b{color:var(--text);font-weight:600}
.v-shop .ar-note .lv{display:inline-flex;align-items:center;gap:8px}

.v-shop .filters{position:relative;margin:22px 0 22px;padding:14px;border-radius:20px;display:grid;gap:12px}
.v-shop .chips{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.v-shop .chip{min-height:40px}
.v-shop .chip .ico{width:15px;height:15px}
.v-shop .frow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center}
.v-shop .search{position:relative}
.v-shop .search .ico{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--dim);pointer-events:none}
.v-shop .search .input{padding-left:44px;padding-right:44px}
.v-shop .search .x{position:absolute;right:4px;top:50%;transform:translateY(-50%);width:40px;height:40px;border:0;background:none;border-radius:50%;display:grid;place-items:center;color:var(--mist)}
.v-shop .search .x:hover{color:var(--text);background:rgba(47,93,70,0.072)}
.v-shop .search .x[hidden]{display:none}
.v-shop .search input::-webkit-search-cancel-button{-webkit-appearance:none;appearance:none}
.v-shop .sortbox{display:flex;align-items:center;gap:10px}
.v-shop .sortbox label{font:600 14px var(--f-body);color:var(--mist);white-space:nowrap}
.v-shop .sortbox select{width:auto;min-width:230px;cursor:pointer}
.v-shop .tv-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
.v-shop .tv-grid.one{grid-template-columns:minmax(0,360px)}
.v-shop .empty{border-radius:22px}
.v-shop .empty>.ico{color:var(--violet-hi)}
.v-shop .empty .btn .ico{width:20px;height:20px;margin:0;color:#fff}
.v-shop .empty p{max-width:46ch;margin:0 auto 18px}
.v-shop .after{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:16px 20px;align-items:center;margin-top:26px;padding:20px 22px;border-radius:20px}
.v-shop .after .a-ico{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:rgba(47,93,70,.09);border:1px solid rgba(47,93,70,.2)}
.v-shop .after .a-ico .ico{width:24px;height:24px;color:var(--violet)}
.v-shop .after h3{margin:0 0 2px;font-size:18px}
.v-shop .after p{margin:0;color:var(--mist);font-size:15px}
.v-shop .after .row{gap:10px}
@media(max-width:960px){.v-shop .tv-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:760px){
  .v-shop .title-ico{width:44px;height:44px;border-radius:14px;margin-right:12px}
  .v-shop .title-ico .ico{width:22px;height:22px}
  .v-shop .filters{padding:12px;margin:18px 0}
  .v-shop .chips{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin:-4px -12px -8px;padding:4px 12px 10px;
    -webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 28px),transparent);mask-image:linear-gradient(90deg,#000 calc(100% - 28px),transparent)}
  .v-shop .chips::-webkit-scrollbar{display:none}
  .v-shop .chip{flex:none}
  .v-shop .frow{grid-template-columns:minmax(0,1fr)}
  .v-shop .sortbox select{flex:1;min-width:0}
  .v-shop .after{grid-template-columns:minmax(0,1fr);padding:18px}
  .v-shop .after .a-ico{display:none}
  .v-shop .after .row{grid-column:1/-1}
  .v-shop .after .row .btn{flex:1 1 auto}
}
@media(max-width:560px){
  .v-shop .tv-grid{gap:12px}
  .v-shop .tv-grid.one{grid-template-columns:minmax(0,1fr)}
  .v-shop .pcard{padding:8px;border-radius:16px}
  .v-shop .pcard .art{border-radius:11px}
  .v-shop .pcard .meta{padding:10px 2px 2px;gap:5px}
  .v-shop .pcard .name{font-size:15px;line-height:1.25}
  .v-shop .pcard .sub{font-size:12px}
}
</style>`;

export default {
  title: param => parse(param).title,
  render(param) {
    if (S.session.search) { search = S.session.search; S.session.search = ''; }
    const f = parse(param);
    const lvl = f.zone ? arLevel(f.zone) : null;
    const n = results(f).length;
    const sub = f.kind === 'all'
      ? `<b>We’re testing before we stock.</b> Try them on and vote — the most-wanted products are the ones we’ll bring to the store.`
      : f.cats.length > 1
        ? `One test product per category here. Try each on, then tap <b>I want this</b> if you’d buy it.`
        : `This is our test piece for ${esc(catLabel(f.cats[0]).toLowerCase())}. Try it on, then tap <b>I want this</b> if you’d buy it.`;
    return `<div class="v-shop">${CSS}
      <section class="wrap">
        <header class="shop-head">
          <div class="orb"></div>
          ${crumbs(f, param)}
          <div class="title-row">
            <div class="title-wrap">
              <span class="title-ico">${icon(f.zone ? ZONE_ICON[f.zone] : 'camera')}</span>
              <h1>${esc(f.title)}</h1>
            </div>
            <span class="rcount" id="shop-count" aria-live="polite">${countText(f, n)}</span>
          </div>
          <p class="lede">${sub}</p>
          ${lvl ? `<p class="note ar-note"><span class="lv">${icon('camera')}<b>${esc(lvl.label)}</b></span><span>${esc(lvl.tip)}</span></p>` : ''}
        </header>

        <div class="glass filters">
          ${chips(f, param)}
          <div class="frow">
            <div class="search">
              <label class="sr-only" for="shop-q">Search the line-up</label>
              ${icon('search')}
              <input class="input" id="shop-q" type="search" placeholder="Search name, colour, style…" autocomplete="off" value="${esc(search)}">
              <button class="x" type="button" data-clear-q aria-label="Clear search" ${search ? '' : 'hidden'}>${icon('x')}</button>
            </div>
            <div class="sortbox">
              <label for="shop-sort">Order by</label>
              <select class="input" id="shop-sort">${SORTS.map(([v, l]) => `<option value="${v}" ${sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
            </div>
          </div>
        </div>

        <div id="shop-grid">${gridHTML(f)}</div>

        <aside class="glass after" aria-label="What happens next">
          <span class="a-ico">${icon('sparkle')}</span>
          <div><h3>More products come after the vote</h3>
            <p>This is a small test line-up. Whatever wins gets stocked first — and you can tell us what else you’d like to see.</p></div>
          <div class="row"><a class="btn btn-try" href="#vote">${icon('chart')} See the results</a><a class="btn" href="#vote" data-goto="suggest">Suggest a product</a></div>
        </aside>
      </section>
    </div>`;
  },
  mount(root, param) {
    const f = parse(param);
    const grid = root.querySelector('#shop-grid');
    const count = root.querySelector('#shop-count');
    const input = root.querySelector('#shop-q');
    const xBtn = root.querySelector('[data-clear-q]');

    const refresh = () => {
      grid.innerHTML = gridHTML(f);
      count.textContent = countText(f, results(f).length);
      xBtn.hidden = !search;
    };
    // bring the active category chip into view in the scrolling chip row (mobile)
    const row = root.querySelector('.chips'), on = row && row.querySelector('.chip.on');
    if (row && on && row.scrollWidth > row.clientWidth) row.scrollLeft = Math.max(0, on.offsetLeft - row.offsetLeft - 24);

    const onInput = debounce(() => { search = input.value; refresh(); }, 180);
    input.addEventListener('input', onInput);
    input.addEventListener('keydown', e => { if (e.key === 'Escape' && input.value) { input.value = ''; search = ''; refresh(); } });
    root.querySelector('#shop-sort').addEventListener('change', e => { sort = e.target.value; refresh(); });

    const onClick = e => {
      const g = e.target.closest('[data-goto]');
      if (g) { S.session.voteFocus = g.dataset.goto; return; }
      if (e.target.closest('[data-clear-q]')) { input.value = ''; search = ''; refresh(); input.focus(); return; }
      if (e.target.closest('[data-clear]')) {
        search = ''; input.value = '';
        if (!base(f).length && f.kind !== 'all') { go('#shop'); return; }
        refresh();
      }
    };
    root.addEventListener('click', onClick);

    // vote buttons sync themselves (ui.js); only re-order when sorting by votes
    const off = S.on(k => { if (k === 'edits' || k === 'custom' || (k === 'votes' && sort === 'wanted')) refresh(); });
    return () => { off(); root.removeEventListener('click', onClick); };
  },
};
