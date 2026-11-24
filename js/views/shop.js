// RealityStore catalogue (#shop, #shop-<zone|category|new|trending|sale>)
import * as S from '../store.js';
import { esc, money, icon, productCard, catLabel, zoneLabel, arLevel, ZONE_ICON, debounce, go } from '../ui.js';
import { ZONES, CATEGORIES } from '../data.js';

// Survive hash changes between categories
let search = '';
let sort = 'featured';
let price = 'any';

const SORTS = [
  ['featured', 'Featured'],
  ['price-asc', 'Price: low to high'],
  ['price-desc', 'Price: high to low'],
  ['rating', 'Top rated'],
  ['reviews', 'Most reviewed'],
];
const PRICES = [
  ['any', 'Any price', () => true],
  ['u2', `Under ${money(2000)}`, p => p.price < 2000],
  ['2-5', `${money(2000)} – 5,000`, p => p.price >= 2000 && p.price <= 5000],
  ['5-10', `${money(5000)} – 10,000`, p => p.price > 5000 && p.price <= 10000],
  ['o10', `Over ${money(10000)}`, p => p.price > 10000],
];
const COLLECTIONS = [['new', 'New arrivals', 'sparkle'], ['trending', 'Trending', 'chart'], ['sale', 'On sale', 'star']];

function parse(param) {
  const zone = ZONES.find(z => z.id === param);
  if (zone) return { kind: 'zone', zone: zone.id, cats: zone.cats, title: `${zone.label} · ${zone.blurb}` };
  const cat = CATEGORIES.find(c => c.id === param);
  if (cat) return { kind: 'cat', zone: cat.zone, cats: [cat.id], title: `${zoneLabel(cat.zone)} · ${cat.label}` };
  if (param === 'new') return { kind: 'tag', tag: 'new', title: 'New arrivals', sub: 'The latest drops — be the first to try them on.' };
  if (param === 'trending') return { kind: 'tag', tag: 'trending', title: 'Trending now', sub: 'The pieces shoppers are trying on most.' };
  if (param === 'sale') return { kind: 'sale', title: 'On sale', sub: 'Marked-down pieces, while stock lasts.' };
  return { kind: 'all', title: 'Shop all', sub: 'Every piece in the store — and every one of them can be tried on live.' };
}

function base(f) {
  const all = S.products();
  if (f.kind === 'zone' || f.kind === 'cat') return all.filter(p => f.cats.includes(p.category));
  if (f.kind === 'tag') return all.filter(p => (p.tags || []).includes(f.tag));
  if (f.kind === 'sale') return all.filter(p => p.compareAt && p.compareAt > p.price);
  return all;
}

function results(f) {
  const q = search.trim().toLowerCase();
  const pf = (PRICES.find(x => x[0] === price) || PRICES[0])[2];
  let list = base(f).filter(pf);
  if (q) {
    const words = q.split(/\s+/);
    list = list.filter(p => {
      const hay = [p.name, p.category, catLabel(p.category), zoneLabel(p.zone), p.model, p.desc, ...(p.colors || []).map(c => c.name)].join(' ').toLowerCase();
      return words.every(w => hay.includes(w));
    });
  }
  const s = [...list];
  if (sort === 'price-asc') s.sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') s.sort((a, b) => b.price - a.price);
  else if (sort === 'rating') s.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
  else if (sort === 'reviews') s.sort((a, b) => b.reviews - a.reviews);
  return s;
}

const plural = n => `${n} ${n === 1 ? 'product' : 'products'}`;

function countText(f, n) {
  const total = base(f).length;
  const filtered = search.trim() || price !== 'any';
  return filtered ? `Showing ${n} of ${plural(total)}` : plural(n);
}

function gridHTML(f) {
  const list = results(f);
  if (!list.length) {
    return `<div class="glass empty">${icon('search')}<h3>No matches${search.trim() ? ` for “${esc(search.trim())}”` : ''}</h3>
      <p class="muted">Try a different word or price range, or clear the filters to see everything here.</p>
      <button class="btn btn-try" type="button" data-clear>${icon('refresh')} Clear filters</button></div>`;
  }
  return `<div class="products">${list.map(productCard).join('')}</div>`;
}

function crumbs(f, param) {
  const parts = [['#home', 'Home'], ['#shop', 'Shop']];
  if (f.kind === 'zone') parts.push([null, zoneLabel(f.zone)]);
  else if (f.kind === 'cat') { parts.push([`#shop-${f.zone}`, zoneLabel(f.zone)]); parts.push([null, catLabel(param)]); }
  else if (f.kind !== 'all') parts.push([null, f.title]);
  else parts[1] = [null, 'Shop'];
  return `<nav class="breadcrumbs" aria-label="Breadcrumb">${parts.map(([h, t], i) =>
    `${i ? '<span aria-hidden="true">/</span>' : ''}${h ? `<a href="${h}">${esc(t)}</a>` : `<span aria-current="page" class="here">${esc(t)}</span>`}`).join('')}</nav>`;
}

function chips(f, param) {
  const catOn = c => (f.kind === 'zone' || f.kind === 'cat') && f.cats.includes(c);
  return `<div class="chips" role="group" aria-label="Category">
    <a class="chip ${f.kind === 'all' ? 'on' : ''}" href="#shop" ${f.kind === 'all' ? 'aria-current="page"' : ''}>All</a>
    ${CATEGORIES.map(c => `<a class="chip ${catOn(c.id) ? 'on' : ''}" href="#shop-${c.id}" ${param === c.id ? 'aria-current="page"' : ''}>${esc(c.label)}</a>`).join('')}
    <span class="chip-sep" aria-hidden="true"></span>
    ${COLLECTIONS.map(([id, label, ic]) => `<a class="chip ${param === id ? 'on' : ''}" href="#shop-${id}" ${param === id ? 'aria-current="page"' : ''}>${icon(ic)}${label}</a>`).join('')}
  </div>`;
}

const CSS = `<style>
.v-shop .shop-head{position:relative;padding:4px 0 8px}
.v-shop .shop-head .orb{width:520px;height:420px;right:-200px;top:-200px;filter:none;opacity:1;
  background:radial-gradient(closest-side,rgba(143,184,160,.32),rgba(143,184,160,0))}
.v-shop .breadcrumbs{margin:22px 0 14px}
.v-shop .breadcrumbs .here{color:var(--mist)}
.v-shop .title-row{display:flex;align-items:flex-end;justify-content:space-between;gap:12px 24px;flex-wrap:wrap}
.v-shop h1{font-size:clamp(30px,4vw,46px);margin:0}
.v-shop .title-ico{display:inline-grid;place-items:center;width:52px;height:52px;border-radius:16px;margin-right:14px;vertical-align:middle;background:var(--gloss-violet);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 8px 22px rgba(47,93,70,0.248)}
.v-shop .title-ico .ico{width:26px;height:26px;color:#fff}
.v-shop .title-wrap{display:flex;align-items:center}
.v-shop{overflow-x:clip}
.v-shop .lede{margin:10px 0 0;max-width:62ch}
.v-shop .rcount{display:inline-flex;align-items:center;gap:8px;
  font:600 15px var(--f-body);color:var(--mist);text-align:left}
.v-shop .ar-note{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:16px;max-width:720px}
.v-shop .ar-note .ico{color:var(--violet-hi)}
.v-shop .ar-note b{color:var(--text);font-weight:600}
.v-shop .ar-note .lv{display:inline-flex;align-items:center;gap:8px}

.v-shop .filters{position:relative;margin:22px 0 22px;padding:14px;border-radius:20px;display:grid;gap:12px}
.v-shop .chips{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.v-shop .chip{min-height:40px}
.v-shop .chip .ico{width:15px;height:15px}
.v-shop .chip-sep{width:1px;height:24px;background:var(--line-2);margin:0 4px}
.v-shop .frow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center}
.v-shop .search{position:relative}
.v-shop .search .ico{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--dim);pointer-events:none}
.v-shop .search .input{padding-left:44px;padding-right:44px}
.v-shop .search .x{position:absolute;right:4px;top:50%;transform:translateY(-50%);width:40px;height:40px;border:0;background:none;border-radius:50%;display:grid;place-items:center;color:var(--mist)}
.v-shop .search .x:hover{color:var(--text);background:rgba(47,93,70,0.072)}
.v-shop .search .x[hidden]{display:none}
.v-shop .sortbox{display:flex;align-items:center;gap:10px}
.v-shop .sortbox label{font:600 14px var(--f-body);color:var(--mist);white-space:nowrap}
.v-shop .sortbox select{width:auto;min-width:200px;cursor:pointer}
.v-shop .prices{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.v-shop .prices .lbl{flex:none;font:600 14px var(--f-body);color:var(--mist);margin-right:4px}
.v-shop .prices .chip{background:transparent;cursor:pointer}
.v-shop .prices .chip.on{background:var(--gloss-violet)}
.v-shop .meta-row{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap}
.v-shop .reset{background:none;border:0;color:var(--violet-hi);font:600 14px var(--f-body);padding:10px 4px;min-height:44px;text-decoration:underline;text-underline-offset:3px}
.v-shop .reset[hidden],.v-shop .meta-row[hidden]{display:none}
.v-shop .empty{border-radius:22px}
.v-shop .empty>.ico{color:var(--violet-hi)}
.v-shop .empty .btn .ico{width:20px;height:20px;margin:0;color:#fff}
.v-shop .search input::-webkit-search-cancel-button{-webkit-appearance:none;appearance:none}
.v-shop .empty p{max-width:46ch;margin:0 auto 18px}
@media(max-width:760px){
  .v-shop .title-ico{width:44px;height:44px;border-radius:14px;margin-right:12px}
  .v-shop .title-ico .ico{width:22px;height:22px}
  .v-shop .filters{padding:12px;margin:18px 0}
  .v-shop .chips,.v-shop .prices{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin:-4px -12px -8px;padding:4px 12px 10px;
    -webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 28px),transparent);mask-image:linear-gradient(90deg,#000 calc(100% - 28px),transparent)}
  .v-shop .chips::-webkit-scrollbar,.v-shop .prices::-webkit-scrollbar{display:none}
  .v-shop .chip{flex:none}
  .v-shop .frow{grid-template-columns:minmax(0,1fr)}
  .v-shop .sortbox select{flex:1;min-width:0}
}
@media(max-width:560px){
  .v-shop .products{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  .v-shop .pcard{padding:8px;border-radius:16px}
  .v-shop .pcard .art{border-radius:11px}
  .v-shop .pcard .meta{padding:10px 2px 2px;gap:5px}
  .v-shop .pcard .name{font-size:15px;line-height:1.25}
  .v-shop .pcard .sub{font-size:12px}
  .v-shop .pcard .sub .stars{font-size:12px;letter-spacing:0}
  .v-shop .pcard .foot{flex-direction:column;align-items:stretch;gap:8px}
  .v-shop .pcard .foot .btn{width:100%;min-height:40px}
  .v-shop .pcard .wish{top:14px!important;right:14px!important}
}
</style>`;

export default {
  title: param => parse(param).title,
  render(param) {
    if (S.session.search) { search = S.session.search; S.session.search = ''; }
    const f = parse(param);
    const lvl = f.zone ? arLevel(f.zone) : null;
    const n = results(f).length;
    return `<div class="v-shop">${CSS}
      <section class="wrap">
        <header class="shop-head">
          <div class="orb"></div>
          ${crumbs(f, param)}
          <div class="title-row">
            <div class="title-wrap">
              ${f.zone ? `<span class="title-ico">${icon(ZONE_ICON[f.zone])}</span>` : ''}
              <h1>${esc(f.title)}</h1>
            </div>
            <span class="rcount" id="shop-count" aria-live="polite">${countText(f, n)}</span>
          </div>
          ${f.sub ? `<p class="lede muted">${esc(f.sub)}</p>` : ''}
          ${lvl ? `<p class="note ar-note"><span class="lv">${icon('camera')}<b>${esc(lvl.label)}</b></span><span>${esc(lvl.tip)}</span></p>` : ''}
        </header>

        <div class="glass filters">
          ${chips(f, param)}
          <div class="frow">
            <div class="search">
              <label class="sr-only" for="shop-q">Search this collection</label>
              ${icon('search')}
              <input class="input" id="shop-q" type="search" placeholder="Search name, colour, style…" autocomplete="off" value="${esc(search)}">
              <button class="x" type="button" data-clear-q aria-label="Clear search" ${search ? '' : 'hidden'}>${icon('x')}</button>
            </div>
            <div class="sortbox">
              <label for="shop-sort">Sort by</label>
              <select class="input" id="shop-sort">${SORTS.map(([v, l]) => `<option value="${v}" ${sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
            </div>
          </div>
          <div class="prices" role="group" aria-label="Price">
            <span class="lbl">Price</span>
            ${PRICES.map(([v, l]) => `<button type="button" class="chip ${price === v ? 'on' : ''}" data-price="${v}" aria-pressed="${price === v}">${esc(l)}</button>`).join('')}
          </div>
        </div>

        <div class="meta-row" ${search.trim() || price !== 'any' ? '' : 'hidden'} id="shop-active">
          <span class="small muted" id="shop-active-txt"></span>
          <button class="reset" type="button" data-clear>Clear filters</button>
        </div>
        <div id="shop-grid">${gridHTML(f)}</div>
      </section>
    </div>`;
  },
  mount(root, param) {
    const f = parse(param);
    const grid = root.querySelector('#shop-grid');
    const count = root.querySelector('#shop-count');
    const input = root.querySelector('#shop-q');
    const xBtn = root.querySelector('[data-clear-q]');
    const active = root.querySelector('#shop-active');
    const activeTxt = root.querySelector('#shop-active-txt');

    const refresh = () => {
      const n = results(f).length;
      grid.innerHTML = gridHTML(f);
      count.textContent = countText(f, n);
      xBtn.hidden = !search;
      const bits = [];
      if (search.trim()) bits.push(`“${search.trim()}”`);
      if (price !== 'any') bits.push((PRICES.find(p => p[0] === price) || PRICES[0])[1]);
      active.hidden = !bits.length;
      activeTxt.textContent = bits.length ? `Filtered by ${bits.join(' · ')}` : '';
      root.querySelectorAll('[data-price]').forEach(b => { const on = b.dataset.price === price; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    };
    refresh();
    // bring the active category chip into view in the scrolling chip row (mobile)
    const row = root.querySelector('.chips'), on = row && row.querySelector('.chip.on');
    if (row && on && row.scrollWidth > row.clientWidth) row.scrollLeft = Math.max(0, on.offsetLeft - row.offsetLeft - 24);

    const onInput = debounce(() => { search = input.value; refresh(); }, 180);
    input.addEventListener('input', onInput);
    input.addEventListener('keydown', e => { if (e.key === 'Escape' && input.value) { input.value = ''; search = ''; refresh(); } });
    root.querySelector('#shop-sort').addEventListener('change', e => { sort = e.target.value; refresh(); });

    const onClick = e => {
      const pb = e.target.closest('[data-price]');
      if (pb) { price = pb.dataset.price; refresh(); return; }
      if (e.target.closest('[data-clear-q]')) { input.value = ''; search = ''; refresh(); input.focus(); return; }
      if (e.target.closest('[data-clear]')) {
        search = ''; price = 'any'; input.value = '';
        if (!base(f).length && f.kind !== 'all') { go('#shop'); return; }
        refresh();
      }
    };
    root.addEventListener('click', onClick);

    const off = S.on(k => { if (k === 'wish' || k === 'edits' || k === 'custom') refresh(); });
    return () => { off(); root.removeEventListener('click', onClick); };
  },
};
