// Demo store admin: dashboard, products, add/edit product (with try-on template), orders.
// Routes: #admin, #admin-dashboard, #admin-products, #admin-add, #admin-edit-<id>, #admin-orders
import * as S from '../store.js';
import { esc, money, icon, productArt, art, toast, openModal, go, catLabel, zoneLabel, arLevel, ZONE_ICON } from '../ui.js';
import { CATEGORIES } from '../data.js';

const TEMPLATES = {
  hats: [['bucket', 'Bucket hat'], ['cap', 'Baseball cap'], ['beanie', 'Rib beanie'], ['slouchy', 'Slouchy beanie'], ['pompom', 'Pom-pom beanie'], ['beret', 'Beret'], ['fedora', 'Fedora']],
  sunglasses: [['round', 'Round frames'], ['aviator', 'Aviator'], ['wayfarer', 'Wayfarer'], ['cateye', 'Cat-eye']],
  jackets: [['bomber', 'Bomber'], ['denim', 'Denim trucker'], ['puffer', 'Quilted puffer']],
  gloves: [['knit', 'Knit gloves'], ['leather', 'Leather gloves'], ['sport', 'Sport gloves']],
  shoes: [['runner', 'Running shoe'], ['hightop', 'High-top sneaker'], ['loafer', 'Loafer']],
  socks: [['crew', 'Crew socks'], ['stripe', 'Striped socks'], ['ankle', 'Ankle socks']],
};
const DEFAULT_SIZES = { hats: 'S, M, L', sunglasses: 'One size', jackets: 'S, M, L, XL', gloves: 'S, M, L', shoes: '39, 40, 41, 42, 43, 44', socks: 'S, M, L' };
const TRACKER = { head: 'Face landmarks (478 points)', face: 'Face landmarks (478 points)', hands: '21-point hand tracking', body: '33-point body pose', feet: 'Body pose · ankles, heels, toes' };
const STATUSES = ['Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];
const NAV = [
  { id: 'dashboard', label: 'Dashboard', ic: 'chart' },
  { id: 'products', label: 'Products', ic: 'grid' },
  { id: 'add', label: 'Add product', ic: 'plus' },
  { id: 'orders', label: 'Orders', ic: 'truck' },
  { id: 'messages', label: 'Messages', ic: 'mail' },
];
const tplName = (cat, m) => (TEMPLATES[cat] || []).find(t => t[0] === m)?.[1] || m;
const fmtDate = iso => { try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } };
const n0 = v => Number(v) || 0;
let search = '';

const CSS = `<style>
.v-admin .adm-band{padding-top:clamp(26px,4vw,44px);padding-bottom:10px}
.v-admin .adm-top{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:22px}
.v-admin .adm-top h1{font-size:clamp(28px,3.6vw,40px);margin:0}
.v-admin .demo{display:inline-flex;gap:10px;align-items:center;max-width:520px}
.v-admin .demo .ico{color:var(--violet-hi)}
.v-admin .adm{display:grid;grid-template-columns:230px minmax(0,1fr);gap:22px;align-items:start}
.v-admin .side{padding:10px;position:sticky;top:90px}
.v-admin .side a{display:flex;align-items:center;gap:12px;min-height:46px;padding:0 14px;border-radius:12px;color:var(--mist);font:600 15px var(--f-body)}
.v-admin .side a:hover{color:var(--text);background:rgba(47,93,70,0.045)}
.v-admin .side a[aria-current="page"] .ico{color:var(--violet)}
.v-admin .side a[aria-current="page"]{color:var(--violet-lo);background:rgba(47,93,70,0.143);box-shadow:inset 0 0 0 1px rgba(47,93,70,0.27)}
.v-admin .side .sep{height:1px;background:var(--line);margin:8px 6px}
.v-admin .side .tiny{padding:6px 14px 8px;font-size:13px;color:var(--mist)}
.v-admin h2.ph{font-size:clamp(22px,2.6vw,28px);margin:0}
.v-admin .ph-row{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px}
.v-admin .kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:18px}
.v-admin .kpi{padding:18px}
.v-admin .kpi .ic{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:rgba(47,93,70,0.11);border:1px solid rgba(47,93,70,0.21);color:var(--violet-hi);margin-bottom:12px}
.v-admin .kpi b{display:block;font:700 clamp(24px,2.6vw,30px)/1.1 var(--f-display);color:var(--text);overflow-wrap:anywhere}
.v-admin .kpi b.price{color:var(--volt)}
.v-admin .kpi span{font-size:14px;color:var(--mist)}
.v-admin .dash2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;margin-bottom:18px}
.v-admin .funnel{display:grid;gap:14px}
.v-admin .fr{display:grid;grid-template-columns:120px minmax(0,1fr) 64px;gap:12px;align-items:center}
.v-admin .fr .lab{font-size:14px;color:var(--mist)}
.v-admin .fr .bar{height:30px;border-radius:9px;background:linear-gradient(180deg,#EEF3EE,#E8EFE8);box-shadow:inset 0 1px 2px rgba(47,93,70,.08);border:1px solid var(--line);overflow:hidden}
.v-admin .fr .bar i{display:block;height:100%;border-radius:8px;background:var(--gloss-violet);box-shadow:inset 0 1px 0 rgba(255,255,255,.4);min-width:4px;transition:width .4s}
.v-admin .fr:nth-child(2) .bar i{opacity:.85}.v-admin .fr:nth-child(3) .bar i{opacity:.7}.v-admin .fr:nth-child(4) .bar i{opacity:.55}
.v-admin .fr .val{font:700 16px var(--f-display);text-align:right}
.v-admin .fr .pct{display:block;font:500 12px var(--f-body);color:var(--mist)}
.v-admin .tbl td{font-size:15px}
.v-admin .tbl .nm{display:flex;align-items:center;gap:12px;min-width:180px}
.v-admin #adm-ptable th,.v-admin #adm-ptable td{padding:10px 8px}
.v-admin #adm-ptable th:first-child,.v-admin #adm-ptable td:first-child{padding-left:16px}
.v-admin #adm-ptable th:last-child,.v-admin #adm-ptable td:last-child{padding-right:14px}
.v-admin #adm-ptable .acts .btn-sm{padding:0 11px}
.v-admin #adm-ptable td:nth-child(2){white-space:nowrap}
.v-admin .tbl thead th{background:rgba(232,239,232,.55)}
.v-admin .tbl tbody tr:hover td{background:rgba(232,239,232,.35)}
.v-admin .tbl .nm a{font-weight:600;color:var(--text)}
.v-admin .th{width:52px;height:52px;border-radius:12px;flex:none;overflow:hidden;display:grid;place-items:center;background:radial-gradient(circle at 50% 38%,#FFFFFF,#E2EBE2)}
.v-admin .th svg{width:84%;height:84%}
.v-admin .tbl tr.off td{opacity:.55}
.v-admin .tbl tr.off td:last-child{opacity:1}
.v-admin .acts{display:flex;gap:6px;justify-content:flex-end;flex-wrap:nowrap}
.v-admin .st-live{background:rgba(46,139,87,0.14);border-color:rgba(46,139,87,0.5);color:var(--ok)}
.v-admin .st-hid{background:rgba(47,93,70,0.054);border-color:var(--line-2);color:var(--mist)}
.v-admin .st-bad{background:rgba(194,65,59,0.14);border-color:rgba(194,65,59,0.5);color:var(--danger)}
.v-admin .tag-custom{background:rgba(47,93,70,0.054);border-color:var(--line-2);margin-left:6px}
.v-admin .srch{position:relative;flex:1 1 260px;max-width:360px}
.v-admin .srch .ico{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--dim)}
.v-admin .srch .input{padding-left:42px}
.v-admin .hint{display:flex;gap:10px;align-items:flex-start}
.v-admin select.input.sm{min-height:40px;padding:6px 10px;font-size:14px;width:auto;min-width:140px}
/* form */
.v-admin .pf{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:20px;align-items:start}
.v-admin .pf-sec{margin-bottom:18px}
.v-admin .pf-sec h3{display:flex;align-items:center;gap:10px;margin-bottom:4px}
.v-admin .pf-sec h3 .step{width:28px;height:28px;border-radius:9px;display:grid;place-items:center;background:rgba(47,93,70,0.138);border:1px solid rgba(47,93,70,0.27);font:700 13px var(--f-display)}
.v-admin .pf-sec>p.small{margin:0 0 16px}
.v-admin .g2{display:grid;grid-template-columns:1fr 1fr;gap:0 14px}
.v-admin .g3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 14px}
.v-admin .tpls{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px}
.v-admin .tpl{position:relative;display:grid;gap:6px;padding:10px;border-radius:14px;border:1px solid var(--line);background:rgba(47,93,70,0.027);cursor:pointer;text-align:center}
.v-admin .tpl:hover{border-color:var(--line-2)}
.v-admin .tpl:has(input:checked){border-color:rgba(47,93,70,0.48);background:rgba(47,93,70,0.088);box-shadow:0 0 0 1px rgba(47,93,70,0.3)}
.v-admin .tpl:has(input:focus-visible){outline:2px solid var(--violet-hi);outline-offset:2px}
.v-admin .tpl input{position:absolute;opacity:0;pointer-events:none}
.v-admin .tpl .mini{position:relative;aspect-ratio:1;border-radius:10px;background:radial-gradient(circle at 50% 38%,#FFFFFF,#E2EBE2);display:grid;place-items:center}
.v-admin .tpl .mini::after{content:"";position:absolute;left:22%;right:22%;bottom:10%;height:8%;border-radius:50%;background:radial-gradient(rgba(47,93,70,.18),rgba(47,93,70,0) 70%)}
.v-admin .tpl .mini svg{position:relative;z-index:1}
.v-admin .tpl .mini svg{width:80%;height:80%}
.v-admin .tpl span{font:600 13px var(--f-body);color:var(--mist)}
.v-admin .tpl:has(input:checked) span{color:var(--violet-lo)}
.v-admin .crow{display:grid;grid-template-columns:auto 52px minmax(0,1fr) 92px 44px;gap:10px;align-items:center;margin-bottom:10px}
.v-admin .crow .pick{width:24px;height:24px;accent-color:var(--violet)}
.v-admin .crow input[type=color]{width:52px;height:46px;padding:4px;border-radius:12px;border:1px solid var(--line-2);background:rgba(47,93,70,0.045);cursor:pointer}
.v-admin .crow code{font-size:13px;color:var(--dim);text-transform:uppercase}
.v-admin .checks{display:flex;gap:20px;flex-wrap:wrap;min-height:46px;align-items:center}
.v-admin .photo{display:flex;gap:14px;align-items:center;flex-wrap:wrap}
.v-admin .photo .pv{width:96px;height:96px;border-radius:14px;overflow:hidden;border:1px solid var(--line-2);background:rgba(47,93,70,0.036);display:grid;place-items:center;color:var(--dim)}
.v-admin .photo .pv img{width:100%;height:100%;object-fit:cover}
.v-admin .file-btn{position:relative;overflow:hidden}
.v-admin .file-btn input{position:absolute;inset:0;opacity:0;cursor:pointer}
.v-admin .file-btn:focus-within{outline:2px solid var(--violet-hi);outline-offset:3px}
.v-admin .prev{position:sticky;top:90px;padding:16px}
.v-admin .prev .stage{position:relative;aspect-ratio:1;border-radius:16px;overflow:hidden;display:grid;place-items:center;
  background:radial-gradient(circle at 50% 38%,#FFFFFF 0%,#EEF3EE 45%,#E2EBE2 100%)}
.v-admin .prev .stage::after{content:"";position:absolute;left:18%;right:18%;bottom:9%;height:9%;border-radius:50%;background:radial-gradient(rgba(30,43,36,0.158),rgba(30,43,36,0) 70%)}
.v-admin .prev .stage>svg{width:78%;height:78%;position:relative;z-index:1;filter:drop-shadow(0 14px 20px rgba(30,43,36,0.14))}
.v-admin .prev .stage>img{position:absolute;inset:0;z-index:1}
.v-admin .prev .inset{position:absolute;right:10px;bottom:10px;z-index:3;width:38%;aspect-ratio:1;border-radius:14px;border:1px solid var(--line-2);display:grid;place-items:center;align-content:center;background:radial-gradient(circle at 50% 38%,#FFFFFF,#E2EBE2);box-shadow:0 10px 24px rgba(30,43,36,0.158)}
.v-admin .prev .inset svg{width:74%;height:auto}
.v-admin .prev .inset small{font:600 10px var(--f-body);color:var(--mist);margin-top:-2px}
.v-admin .prev .stage .badge{position:absolute;top:10px;left:10px;z-index:2}
.v-admin .prev .live{position:absolute;top:10px;right:10px;z-index:2;font:600 12px var(--f-body);padding:4px 10px;border-radius:999px;color:#fff;background:var(--gloss-violet);border:1px solid rgba(255,255,255,.4);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 4px 12px rgba(47,93,70,.2)}
.v-admin .prev .pname{font:600 19px var(--f-display);color:var(--text);margin:14px 0 2px;overflow-wrap:anywhere}
.v-admin .prev .swrow{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}
.v-admin .prev .swrow button{width:30px;height:30px;border-radius:50%;border:2px solid rgba(255,255,255,.3);padding:0}
.v-admin .prev .swrow button[aria-pressed="true"]{outline:2px solid var(--violet-hi);outline-offset:3px}
.v-admin .prev .trk{display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:12px;background:rgba(47,93,70,0.036);border:1px solid var(--line);font-size:14px;color:var(--mist);margin:12px 0}
.v-admin .prev .trk .ico{color:var(--violet-hi)}
.v-admin .savebar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:flex-end;padding:16px}
.v-admin .err-sum{color:var(--danger);font-size:14px;margin-right:auto}
.v-admin .mini-order{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line)}
.v-admin .mini-order:last-child{border-bottom:0}
@media(max-width:1100px){.v-admin .pf{grid-template-columns:minmax(0,1fr)}.v-admin .prev{position:relative;top:0}
  .v-admin .prev-wrap{order:-1}.v-admin .prev .inner{display:grid;grid-template-columns:160px minmax(0,1fr);gap:16px;align-items:start}.v-admin .prev .pname{margin-top:0}}
@media(max-width:960px){
  .v-admin .adm{grid-template-columns:minmax(0,1fr)}
  .v-admin .side{position:relative;top:0;display:flex;gap:6px;overflow-x:auto;padding:6px;scrollbar-width:none}
  .v-admin .side::-webkit-scrollbar{display:none}
  .v-admin .side a{flex:none;white-space:nowrap;min-height:42px;padding:0 14px}
  .v-admin .side .sep,.v-admin .side .tiny{display:none}
  .v-admin .kpis{grid-template-columns:1fr 1fr}
  .v-admin .dash2{grid-template-columns:minmax(0,1fr)}
}
@media(max-width:560px){
  .v-admin .g2,.v-admin .g3{grid-template-columns:minmax(0,1fr)}
  .v-admin .crow{grid-template-columns:auto 48px minmax(0,1fr) 44px}
  .v-admin .crow code{display:none}
  .v-admin .fr{grid-template-columns:86px minmax(0,1fr) 54px;gap:8px}
  .v-admin .prev .inner{grid-template-columns:112px minmax(0,1fr);gap:12px}
  .v-admin .prev{padding:12px}
  .v-admin .prev .pname{font-size:17px}
  .v-admin .prev .price-lg{font-size:22px}
  .v-admin .prev .trk{margin:8px 0;padding:8px 10px;font-size:13px}
  .v-admin .kpi{padding:14px}
  .v-admin .savebar .btn{flex:1}
  .v-admin .srch{max-width:none}
  .v-admin .side{gap:2px}
  .v-admin .side a{padding:0 10px;gap:6px;font-size:14px}
  .v-admin .side a>.ico{display:none}
  .v-admin .prev .live{display:none}
  .v-admin .prev .inset small{display:none}
  .v-admin .side a.vs{display:none}
}
</style>`;

// ---------------- panels ----------------
function sidebar(tab) {
  const cur = tab === 'edit' ? 'products' : tab;
  return `<nav class="glass side" aria-label="Admin sections">
    ${NAV.map(n => `<a href="#admin-${n.id}" ${cur === n.id ? 'aria-current="page"' : ''}>${icon(n.ic)} ${n.label}</a>`).join('')}
    <div class="sep"></div>
    <a class="vs" href="#shop">${icon('eye')} View store</a>
    <p class="tiny">Changes are saved in this browser and show in the shop straight away.</p>
  </nav>`;
}

function totals() {
  const st = S.stats();
  const t = { view: 0, tryon: 0, add: 0, buy: 0 };
  Object.values(st).forEach(s => { for (const k in t) t[k] += n0(s[k]); });
  return { st, t };
}

function dashboard() {
  const all = S.products({ includeHidden: true });
  const live = all.filter(p => !p.hidden).length;
  const orders = S.orders();
  const revenue = orders.filter(o => !/cancel/i.test(o.status || '')).reduce((n, o) => n + n0(o.total), 0);
  const { st, t } = totals();
  const max = Math.max(t.view, t.tryon, t.add, t.buy, 1);
  const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '—';
  const rows = [['Product views', t.view, ''], ['Try-ons', t.tryon, pct(t.tryon, t.view) + ' of views'], ['Added to bag', t.add, pct(t.add, t.tryon) + ' of try-ons'], ['Bought', t.buy, pct(t.buy, t.add) + ' of adds']];
  const empty = !t.view && !t.tryon && !t.add && !t.buy;
  const top = Object.entries(st).map(([id, s]) => ({ p: S.product(id), s })).filter(x => x.p && n0(x.s.tryon) > 0)
    .sort((a, b) => n0(b.s.tryon) - n0(a.s.tryon)).slice(0, 6);
  return `<div class="ph-row"><h2 class="ph">Dashboard</h2><span class="small dim">Live numbers from this browser</span></div>
  <div class="kpis">
    <div class="glass kpi"><span class="ic">${icon('grid')}</span><b>${live}</b><span>Products live${all.length > live ? ` · ${all.length - live} hidden` : ''}</span></div>
    <div class="glass kpi"><span class="ic">${icon('bag')}</span><b>${orders.length}</b><span>Orders</span></div>
    <div class="glass kpi"><span class="ic">${icon('wallet')}</span><b class="price">${money(revenue)}</b><span>Revenue (excl. cancelled)</span></div>
    <div class="glass kpi"><span class="ic">${icon('camera')}</span><b>${t.tryon}</b><span>Try-on sessions</span></div>
  </div>
  <div class="dash2">
    <section class="glass pad">
      <h3>Try-on funnel</h3>
      <p class="small muted" style="margin-bottom:18px">How shoppers move from looking, to trying on, to buying — across every product.</p>
      <div class="funnel">${rows.map(([l, v, sub]) => `<div class="fr"><span class="lab">${l}</span>
        <span class="bar" role="img" aria-label="${l}: ${v}"><i style="width:${empty ? 0 : Math.max(1.5, v / max * 100)}%"></i></span>
        <span class="val">${v}${sub && !empty ? `<span class="pct">${sub}</span>` : ''}</span></div>`).join('')}</div>
      ${empty ? `<p class="note hint" style="margin:18px 0 0">${icon('sparkle')}<span>No activity yet. Open a few products and try them on in the Try-On Studio — these bars fill in as shoppers browse.</span></p>` : ''}
    </section>
    <section class="glass pad">
      <div class="row between" style="margin-bottom:10px"><h3 style="margin:0">Recent orders</h3><a class="btn btn-sm" href="#admin-orders">All orders ${icon('arrow')}</a></div>
      ${orders.length ? orders.slice(0, 5).map(o => `<div class="mini-order">
          <div><a href="#order-${esc(o.id)}" style="font-weight:600;color:var(--text)">#${esc(o.id)}</a><div class="small dim">${esc(fmtDate(o.date))} · ${esc(custName(o))}</div></div>
          <div style="text-align:right"><span class="price" style="font-size:16px">${money(n0(o.total))}</span><div class="small dim">${esc(o.status || '')}</div></div></div>`).join('')
        : `<p class="note hint" style="margin:8px 0 0">${icon('bag')}<span>No orders yet. Place a test order through checkout and it appears here.</span></p>`}
    </section>
  </div>
  <section class="glass pad">
    <h3>Most tried-on products</h3>
    ${top.length ? `<div class="scroll"><table class="tbl"><thead><tr><th>Product</th><th class="num">Views</th><th class="num">Try-ons</th><th class="num">Added</th><th class="num">Bought</th><th class="num">Try → buy</th></tr></thead><tbody>
      ${top.map(({ p, s }) => `<tr><td><div class="nm"><span class="th">${productArt(p)}</span><div><a href="#p-${esc(p.id)}">${esc(p.name)}</a><div class="small dim">${esc(catLabel(p.category))}</div></div></div></td>
        <td class="num">${n0(s.view)}</td><td class="num">${n0(s.tryon)}</td><td class="num">${n0(s.add)}</td><td class="num">${n0(s.buy)}</td>
        <td class="num">${s.tryon ? Math.round(n0(s.buy) / n0(s.tryon) * 100) + '%' : '—'}</td></tr>`).join('')}
    </tbody></table></div>` : `<p class="muted" style="margin:0">Nothing tried on yet — this table ranks products by try-on sessions once there are some.</p>`}
  </section>`;
}
function custName(o) {
  const c = o.customer;
  if (!c) return 'Guest';
  if (typeof c === 'string') return c;
  return c.name || c.email || 'Guest';
}

function productsPanel() {
  const all = S.products({ includeHidden: true });
  const q = search.trim().toLowerCase();
  const list = q ? all.filter(p => [p.name, p.category, catLabel(p.category), p.model, p.id].join(' ').toLowerCase().includes(q)) : all;
  return `<div class="ph-row"><h2 class="ph">Products <span class="dim" style="font-size:.6em;font-weight:500">${all.length}</span></h2>
    <div class="row" style="flex:1 1 360px;justify-content:flex-end">
      <label class="srch"><span class="sr-only">Search products</span>${icon('search')}<input class="input" id="adm-q" type="search" placeholder="Search name, category, template" value="${esc(search)}" autocomplete="off"></label>
      <a class="btn btn-try" href="#admin-add">${icon('plus')} Add product</a>
    </div></div>
  <div class="glass"><div class="scroll"><table class="tbl" id="adm-ptable">
    <thead><tr><th>Product</th><th>Category</th><th>Try-on type</th><th class="num">Price</th><th class="num">Stock</th><th>Status</th><th class="num"><span class="sr-only">Actions</span></th></tr></thead>
    <tbody>${list.map(p => `<tr class="${p.hidden ? 'off' : ''}">
      <td><div class="nm"><span class="th">${productArt(p)}</span><div><a href="#admin-edit-${esc(p.id)}">${esc(p.name)}</a>${p.custom ? '<span class="badge tag-custom">Added</span>' : ''}<div class="small dim">${esc(tplName(p.category, p.model))}</div></div></div></td>
      <td>${esc(catLabel(p.category))}</td>
      <td style="white-space:nowrap"><span class="row" style="gap:8px;flex-wrap:nowrap">${icon(ZONE_ICON[p.zone] || 'cube')}<span>${esc(zoneLabel(p.zone))}<div class="small dim">${esc(arLevel(p.zone).label)}</div></span></span></td>
      <td class="num"><span class="price" style="font-size:16px">${money(n0(p.price))}</span></td>
      <td class="num">${n0(p.stock) <= 5 ? `<span style="color:var(--danger)">${n0(p.stock)}</span>` : n0(p.stock)}</td>
      <td>${p.hidden ? '<span class="badge st-hid">Hidden</span>' : '<span class="badge st-live">Live</span>'}</td>
      <td><div class="acts">
        <a class="btn btn-sm" href="#admin-edit-${esc(p.id)}">${icon('edit')} Edit</a>
        ${p.hidden ? `<button class="btn btn-sm" data-adm="show" data-id="${esc(p.id)}">${icon('eye')} Show</button>`
          : `<button class="btn btn-sm btn-ghost" data-adm="hide" data-id="${esc(p.id)}">${icon('lock')} Hide</button>`}
        ${p.custom ? `<button class="btn btn-sm btn-ghost" data-adm="del" data-id="${esc(p.id)}" aria-label="Delete ${esc(p.name)}">${icon('trash')}</button>` : ''}
      </div></td></tr>`).join('') || `<tr><td colspan="7" class="muted" style="text-align:center;padding:36px">No products match “${esc(search)}”.</td></tr>`}
    </tbody></table></div></div>
  <p class="small dim" style="margin-top:12px">Hidden products disappear from the shop but keep their data. Sample products can be hidden; products you added can also be deleted.</p>`;
}

function ordersPanel() {
  const orders = S.orders();
  if (!orders.length) return `<div class="ph-row"><h2 class="ph">Orders</h2></div>
    <div class="glass pad empty">${icon('truck')}<h3>No orders yet</h3><p class="muted">Orders placed through checkout in this browser appear here, where you can move them from confirmed to delivered.</p><a class="btn" href="#shop">Open the shop</a></div>`;
  const pay = p => ({ cod: 'Cash on delivery', card: 'Card', wallet: 'Mobile wallet', bank: 'Bank transfer' }[p] || p || '—');
  return `<div class="ph-row"><h2 class="ph">Orders <span class="dim" style="font-size:.6em;font-weight:500">${orders.length}</span></h2></div>
  <div class="glass"><div class="scroll"><table class="tbl">
    <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th class="num">Items</th><th class="num">Total</th><th>Payment</th><th>Status</th></tr></thead>
    <tbody>${orders.map(o => {
      const items = (o.lines || []).reduce((n, l) => n + n0(l.qty || 1), 0);
      const opts = STATUSES.includes(o.status) ? STATUSES : [o.status || 'Confirmed', ...STATUSES];
      return `<tr>
        <td><a href="#order-${esc(o.id)}" style="font-weight:600;color:var(--text);white-space:nowrap">#${esc(o.id)}</a></td>
        <td style="white-space:nowrap">${esc(fmtDate(o.date))}</td>
        <td>${esc(custName(o))}${o.address?.city ? `<div class="small dim">${esc(o.address.city)}</div>` : ''}</td>
        <td class="num">${items}</td>
        <td class="num"><span class="price" style="font-size:16px">${money(n0(o.total))}</span></td>
        <td style="white-space:nowrap">${esc(pay(o.payment))}</td>
        <td><label class="sr-only" for="os-${esc(o.id)}">Status for order ${esc(o.id)}</label>
          <select class="input sm" id="os-${esc(o.id)}" data-adm="status" data-id="${esc(o.id)}">${opts.map(s => `<option ${s === o.status ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></td>
      </tr>`;
    }).join('')}</tbody></table></div></div>`;
}

// ---------------- add / edit product ----------------
function freshState(p) {
  if (p) return {
    editing: true, id: p.id, custom: p.custom, hidden: !!p.hidden, rating: p.rating, reviews: p.reviews,
    name: p.name || '', category: p.category, model: p.model, colors: (p.colors || []).map(c => ({ ...c })), sel: 0,
    sizes: (p.sizes || []).join(', '), price: p.price ?? '', compareAt: p.compareAt || '', stock: p.stock ?? 25, badge: p.badge || '',
    tags: [...(p.tags || [])], desc: p.desc || '', features: (p.features || []).join('\n'), image: p.image || null, lens: p.lens || '#1B1530',
  };
  return { editing: false, name: '', category: 'hats', model: 'bucket', colors: [{ name: 'Forest Sage', hex: '#2F5D46' }, { name: 'Ink', hex: '#1C1F3F' }], sel: 0,
    sizes: DEFAULT_SIZES.hats, price: '', compareAt: '', stock: 25, badge: '', tags: ['new'], desc: '', features: '', image: null, lens: '#1B1530' };
}
function fakeProduct(st, hex) { return { name: st.name || 'New product', model: st.model, category: st.category, lens: st.lens, colors: st.colors, image: st.image }; }
const curHex = st => st.colors[st.sel]?.hex || st.colors[0]?.hex || '#2F5D46';

function tplCards(st) {
  const hex = curHex(st);
  return (TEMPLATES[st.category] || []).map(([m, label]) => `<label class="tpl">
    <input type="radio" name="model" value="${m}" ${st.model === m ? 'checked' : ''}>
    <span class="mini">${art({ name: label, model: m, lens: st.lens }, hex)}</span><span>${label}</span></label>`).join('');
}
function colorRows(st) {
  return st.colors.map((c, i) => `<div class="crow" data-i="${i}">
    <input class="pick" type="radio" name="csel" value="${i}" ${st.sel === i ? 'checked' : ''} aria-label="Preview ${esc(c.name || 'colour ' + (i + 1))}">
    <input type="color" value="${esc(c.hex)}" data-c="hex" aria-label="Colour ${i + 1} swatch">
    <input class="input" value="${esc(c.name)}" data-c="name" placeholder="Colour name" aria-label="Colour ${i + 1} name">
    <code>${esc(c.hex)}</code>
    <button type="button" class="icon-btn" data-f="rmcolor" data-i="${i}" aria-label="Remove colour ${i + 1}" ${st.colors.length < 2 ? 'disabled style="opacity:.4"' : ''}>${icon('x')}</button>
  </div>`).join('');
}
function previewHTML(st) {
  const hex = curHex(st);
  const p = fakeProduct(st);
  const zone = CATEGORIES.find(c => c.id === st.category)?.zone || 'head';
  const price = Number(st.price), was = Number(st.compareAt);
  return `<div class="inner"><div>
    <div class="stage">${st.badge ? `<span class="badge">${esc(st.badge)}</span>` : ''}<span class="live">Live preview</span>${productArt(p, hex)}${st.image ? `<span class="inset" title="Try-on model">${art({ name: p.name, model: st.model, lens: st.lens }, hex)}<small>Try-on model</small></span>` : ''}</div></div>
    <div>
      <div class="pname">${esc(st.name || 'Product name')}</div>
      <div class="small dim">${esc(catLabel(st.category))} · ${esc(tplName(st.category, st.model))}</div>
      <div class="swrow" role="group" aria-label="Preview colour">${st.colors.map((c, i) => `<button type="button" data-f="sel" data-i="${i}" style="background:${esc(c.hex)}" aria-pressed="${st.sel === i}" aria-label="${esc(c.name || 'Colour ' + (i + 1))}" title="${esc(c.name)}"></button>`).join('')}</div>
      <div>${price > 0 ? `<span class="price price-lg">${money(price)}${was > price ? `<s>${money(was)}</s>` : ''}</span>` : '<span class="dim">Set a price</span>'}</div>
      <div class="trk">${icon(ZONE_ICON[zone] || 'cube')}<span><b style="color:var(--text)">${esc(arLevel(zone).label)}</b><br>${esc(TRACKER[zone])}</span></div>
      ${st.image ? `<p class="small dim" style="margin:0 0 10px">Shop cards show your photo. The live try-on still uses the ${esc(tplName(st.category, st.model).toLowerCase())} template in the selected colour.</p>` : ''}
      ${st.editing ? `<a class="btn btn-try btn-block" href="#tryon-${esc(st.id)}">${icon('camera')} Preview try-on</a>`
        : `<button type="button" class="btn btn-try btn-block" disabled>${icon('camera')} Preview try-on</button><p class="small dim" style="margin:8px 0 0;text-align:center">Available after you save.</p>`}
    </div></div>`;
}

function formPanel(st) {
  const cats = CATEGORIES.map(c => `<option value="${c.id}" ${st.category === c.id ? 'selected' : ''}>${esc(c.label)} — ${esc(zoneLabel(c.zone))}</option>`).join('');
  return `<div class="ph-row"><div><a class="small dim" href="#admin-products" style="display:inline-flex;gap:6px;align-items:center">${icon('back')} Products</a>
      <h2 class="ph">${st.editing ? `Edit ${esc(st.name)}` : 'Add a product that can be tried on'}</h2></div>
    ${st.editing ? `<span class="badge ${st.hidden ? 'st-hid' : 'st-live'}">${st.hidden ? 'Hidden' : 'Live'}</span>` : ''}</div>
  <form id="pform" class="pf" novalidate>
    <div>
      <section class="glass pad pf-sec">
        <h3><span class="step">1</span> Basics</h3><p class="small muted">The name becomes the product's web address.</p>
        <div class="field"><label for="f-name">Product name</label><input class="input" id="f-name" name="name" value="${esc(st.name)}" placeholder="e.g. Halo Bucket Hat" maxlength="60"><span class="err" data-err="name"></span></div>
        <div class="field"><label for="f-cat">Category</label><select class="input" id="f-cat" name="category">${cats}</select>
          <span class="small dim" id="f-zone">Try-on zone is set automatically: <b style="color:var(--text)">${esc(zoneLabel(CATEGORIES.find(c => c.id === st.category)?.zone))}</b> · ${esc(arLevel(CATEGORIES.find(c => c.id === st.category)?.zone).label)}</span></div>
      </section>
      <section class="glass pad pf-sec">
        <h3><span class="step">2</span> Try-on template</h3><p class="small muted">Pick the AR model shoppers will wear through their camera.</p>
        <div class="tpls" id="f-tpls" role="radiogroup" aria-label="Try-on template">${tplCards(st)}</div>
        <p class="note" style="margin:14px 0 0">Each try-on template is a ready-made AR model. A live store would also accept a GLB 3D file per product.</p>
      </section>
      <section class="glass pad pf-sec">
        <h3><span class="step">3</span> Colours &amp; sizes</h3><p class="small muted">Every colour recolours both the shop artwork and the try-on model. The dot on the left picks which one the preview shows.</p>
        <div id="f-colors">${colorRows(st)}</div>
        <button type="button" class="btn btn-sm" data-f="addcolor" ${st.colors.length >= 8 ? 'disabled' : ''}>${icon('plus')} Add colour</button>
        <span class="err" data-err="colors" style="display:block;margin-top:6px"></span>
        <div id="f-lens" ${st.category === 'sunglasses' ? '' : 'hidden'} style="margin-top:14px">
          <div class="field" style="margin:0"><label for="f-lens-c">Lens tint</label>
          <div class="row"><input type="color" id="f-lens-c" name="lens" value="${esc(st.lens)}" style="width:52px;height:46px;padding:4px;border-radius:12px;border:1px solid var(--line-2);background:rgba(47,93,70,0.045)"><span class="small dim">Used for the lenses in artwork and try-on.</span></div></div>
        </div>
        <div class="field" style="margin-top:16px"><label for="f-sizes">Sizes <span class="dim">(comma-separated)</span></label><input class="input" id="f-sizes" name="sizes" value="${esc(st.sizes)}" placeholder="S, M, L"><span class="err" data-err="sizes"></span></div>
      </section>
      <section class="glass pad pf-sec">
        <h3><span class="step">4</span> Price &amp; stock</h3><p class="small muted">Prices in PKR, whole rupees.</p>
        <div class="g3">
          <div class="field"><label for="f-price">Price (Rs)</label><input class="input" id="f-price" name="price" type="number" inputmode="numeric" min="1" step="1" value="${esc(st.price)}" placeholder="3499"><span class="err" data-err="price"></span></div>
          <div class="field"><label for="f-was">Compare-at (Rs)</label><input class="input" id="f-was" name="compareAt" type="number" inputmode="numeric" min="0" step="1" value="${esc(st.compareAt)}" placeholder="Optional"><span class="err" data-err="compareAt"></span></div>
          <div class="field"><label for="f-stock">Stock</label><input class="input" id="f-stock" name="stock" type="number" inputmode="numeric" min="0" step="1" value="${esc(st.stock)}"><span class="err" data-err="stock"></span></div>
        </div>
        <div class="g2">
          <div class="field"><label for="f-badge">Badge <span class="dim">(optional)</span></label><input class="input" id="f-badge" name="badge" value="${esc(st.badge)}" maxlength="16" placeholder="e.g. New, Limited"></div>
          <div class="field"><span style="font:600 14px var(--f-body);color:var(--mist)">Show in</span>
            <div class="checks"><label class="check"><input type="checkbox" name="tag" value="new" ${st.tags.includes('new') ? 'checked' : ''}> New in</label>
            <label class="check"><input type="checkbox" name="tag" value="trending" ${st.tags.includes('trending') ? 'checked' : ''}> Trending</label></div></div>
        </div>
      </section>
      <section class="glass pad pf-sec">
        <h3><span class="step">5</span> Description &amp; photo</h3><p class="small muted">Plain, specific words sell better than adjectives.</p>
        <div class="field"><label for="f-desc">Description</label><textarea class="input" id="f-desc" name="desc" placeholder="What it is, what it's made of, how it fits.">${esc(st.desc)}</textarea><span class="err" data-err="desc"></span></div>
        <div class="field"><label for="f-feat">Features <span class="dim">(one per line)</span></label><textarea class="input" id="f-feat" name="features" placeholder="100% cotton twill&#10;Stitched 6 cm brim">${esc(st.features)}</textarea></div>
        <div class="field" style="margin:0"><span style="font:600 14px var(--f-body);color:var(--mist)">Product photo <span class="dim">(optional)</span></span>
          <div class="photo" id="f-photo">${photoHTML(st)}</div>
          <span class="err" data-err="image"></span>
        </div>
      </section>
    </div>
    <div class="prev-wrap"><aside class="glass prev" id="f-prev" aria-live="polite" aria-label="Live preview">${previewHTML(st)}</aside></div>
    <div class="glass savebar" style="grid-column:1/-1">
      <span class="err-sum" id="f-errsum" role="alert"></span>
      <a class="btn btn-ghost" href="#admin-products">Cancel</a>
      <button class="btn btn-try btn-lg" type="submit">${icon('check')} ${st.editing ? 'Save changes' : 'Save product'}</button>
    </div>
  </form>`;
}
function photoHTML(st) {
  return `<span class="pv">${st.image ? `<img src="${esc(st.image)}" alt="Product photo preview">` : icon('upload')}</span>
    <span class="btn btn-sm file-btn">${icon('upload')} ${st.image ? 'Replace photo' : 'Upload photo'}<input type="file" accept="image/*" data-f="photo" aria-label="Upload product photo"></span>
    ${st.image ? `<button type="button" class="btn btn-sm btn-ghost" data-f="rmphoto">${icon('trash')} Remove</button>` : ''}
    <span class="small dim" style="flex-basis:100%">JPG or PNG. Resized to 600 px in your browser before saving.</span>`;
}

function readPhoto(file) {
  return new Promise((res, rej) => {
    if (!file || !/^image\//.test(file.type)) return rej(new Error('Please choose an image file.'));
    if (file.size > 15 * 1024 * 1024) return rej(new Error('That image is over 15 MB.'));
    const fr = new FileReader();
    fr.onerror = () => rej(new Error('Could not read that file.'));
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => rej(new Error('That image could not be opened.'));
      img.onload = () => {
        const k = Math.min(1, 600 / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h); cx.drawImage(img, 0, 0, w, h);
        res(cv.toDataURL('image/jpeg', 0.82));
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

function bindForm(root, st) {
  const f = root.querySelector('#pform'); if (!f) return () => {};
  const $ = s => f.querySelector(s);
  const refreshPrev = () => { $('#f-prev').innerHTML = previewHTML(st); };
  const refreshTpls = () => { $('#f-tpls').innerHTML = tplCards(st); };
  const refreshColors = () => { $('#f-colors').innerHTML = colorRows(st); f.querySelector('[data-f="addcolor"]').disabled = st.colors.length >= 8; };
  const refreshPhoto = () => { $('#f-photo').innerHTML = photoHTML(st); };
  const err = (k, m) => { const e = f.querySelector(`[data-err="${k}"]`); if (e) e.textContent = m || ''; const i = f.querySelector(`[name="${k}"]`); if (i) { i.classList.toggle('bad', !!m); i.setAttribute('aria-invalid', m ? 'true' : 'false'); } };

  const onInput = e => {
    const t = e.target;
    const row = t.closest('.crow');
    if (row && t.dataset.c) {
      const i = Number(row.dataset.i);
      st.colors[i][t.dataset.c] = t.value;
      if (t.dataset.c === 'hex') { row.querySelector('code').textContent = t.value; st.sel = i; row.querySelector('.pick').checked = true; refreshTpls(); }
      refreshPrev(); return;
    }
    switch (t.name) {
      case 'name': st.name = t.value; if (t.value.trim()) err('name'); break;
      case 'sizes': st.sizes = t.value; break;
      case 'price': st.price = t.value; break;
      case 'compareAt': st.compareAt = t.value; break;
      case 'stock': st.stock = t.value; break;
      case 'badge': st.badge = t.value; break;
      case 'desc': st.desc = t.value; break;
      case 'features': st.features = t.value; break;
      case 'lens': st.lens = t.value; refreshTpls(); break;
      default: return;
    }
    refreshPrev();
  };
  const onChange = async e => {
    const t = e.target;
    if (t.name === 'category') {
      const prevDefault = DEFAULT_SIZES[st.category];
      st.category = t.value; st.model = TEMPLATES[st.category][0][0];
      if (!st.sizes.trim() || st.sizes === prevDefault) { st.sizes = DEFAULT_SIZES[st.category]; $('#f-sizes').value = st.sizes; }
      const zone = CATEGORIES.find(c => c.id === st.category).zone;
      $('#f-zone').innerHTML = `Try-on zone is set automatically: <b style="color:var(--text)">${esc(zoneLabel(zone))}</b> · ${esc(arLevel(zone).label)}`;
      $('#f-lens').hidden = st.category !== 'sunglasses';
      refreshTpls(); refreshPrev();
    } else if (t.name === 'model') { st.model = t.value; refreshPrev(); }
    else if (t.name === 'csel') { st.sel = Number(t.value); refreshTpls(); refreshPrev(); }
    else if (t.name === 'tag') { st.tags = [...f.querySelectorAll('[name="tag"]:checked')].map(x => x.value); }
    else if (t.dataset.f === 'photo') {
      err('image');
      try { st.image = await readPhoto(t.files[0]); refreshPhoto(); refreshPrev(); toast('Photo added', 'upload'); }
      catch (ex) { err('image', ex.message); t.value = ''; }
    }
  };
  const onClick = e => {
    const t = e.target.closest('[data-f]'); if (!t || !f.contains(t)) return;
    const a = t.dataset.f;
    if (a === 'addcolor') {
      if (st.colors.length >= 8) return;
      const palette = ['#4E8A6A', '#17181F', '#ECE6DA', '#C9324A', '#2E5A43', '#6F8FBF', '#B5532E', '#F2F2F5'];
      st.colors.push({ name: '', hex: palette[st.colors.length % palette.length] });
      st.sel = st.colors.length - 1; err('colors');
      refreshColors(); refreshTpls(); refreshPrev();
      f.querySelector(`.crow[data-i="${st.sel}"] [data-c="name"]`)?.focus();
    } else if (a === 'rmcolor') {
      if (st.colors.length < 2) return;
      st.colors.splice(Number(t.dataset.i), 1);
      st.sel = Math.min(st.sel, st.colors.length - 1);
      refreshColors(); refreshTpls(); refreshPrev();
    } else if (a === 'sel') {
      st.sel = Number(t.dataset.i);
      const r = f.querySelector(`.crow[data-i="${st.sel}"] .pick`); if (r) r.checked = true;
      refreshTpls(); refreshPrev();
    } else if (a === 'rmphoto') { st.image = null; refreshPhoto(); refreshPrev(); }
  };
  const onSubmit = e => {
    e.preventDefault();
    const name = st.name.trim();
    const price = Number(st.price), was = st.compareAt === '' ? 0 : Number(st.compareAt), stock = Number(st.stock);
    const sizes = st.sizes.split(',').map(s => s.trim()).filter(Boolean);
    const errs = {
      name: name.length < 2 ? 'Give the product a name (at least 2 characters).' : '',
      price: !(price > 0) ? 'Enter a price above zero.' : !Number.isInteger(price) ? 'Use whole rupees.' : '',
      compareAt: was && !(was > price) ? 'Compare-at price should be higher than the price, or empty.' : '',
      stock: st.stock === '' || !Number.isInteger(stock) || stock < 0 ? 'Stock must be 0 or more.' : '',
      sizes: !sizes.length ? 'Add at least one size (e.g. One size).' : '',
      desc: st.desc.trim().length < 10 ? 'Write a short description (10+ characters).' : '',
      colors: st.colors.some(c => !c.name.trim()) ? 'Every colour needs a name.' : '',
    };
    Object.entries(errs).forEach(([k, m]) => err(k, m));
    f.querySelectorAll('.crow [data-c="name"]').forEach((i, n) => i.classList.toggle('bad', !!errs.colors && !st.colors[n].name.trim()));
    const bad = Object.values(errs).filter(Boolean);
    $('#f-errsum').textContent = bad.length ? `Please fix ${bad.length} field${bad.length > 1 ? 's' : ''} above.` : '';
    if (bad.length) { (f.querySelector('.input.bad') || f.querySelector('.crow .bad'))?.focus(); return; }

    let id = st.id;
    if (!st.editing) {
      const baseId = S.slugify(name); id = baseId; let k = 2;
      while (S.product(id)) id = `${baseId}-${k++}`;
    }
    const zone = CATEGORIES.find(c => c.id === st.category).zone;
    const p = {
      id, name, category: st.category, zone, model: st.model, price, compareAt: was || null,
      colors: st.colors.map(c => ({ name: c.name.trim(), hex: c.hex })), sizes,
      rating: st.editing ? st.rating ?? 0 : 0, reviews: st.editing ? st.reviews ?? 0 : 0,
      badge: st.badge.trim(), tags: st.tags, desc: st.desc.trim(),
      features: st.features.split('\n').map(s => s.trim()).filter(Boolean), stock, image: st.image || null, hidden: st.hidden || false,
    };
    if (st.category === 'sunglasses') p.lens = st.lens;
    try { S.saveProduct(p); }
    catch (ex) { $('#f-errsum').textContent = 'Could not save — browser storage may be full. Try a smaller photo.'; return; }
    toast(st.editing ? `Saved changes to ${name}` : `${name} is live in the shop`, 'check');
    go('#admin-products');
  };
  f.addEventListener('input', onInput); f.addEventListener('change', onChange); f.addEventListener('click', onClick); f.addEventListener('submit', onSubmit);
  return () => { f.removeEventListener('input', onInput); f.removeEventListener('change', onChange); f.removeEventListener('click', onClick); f.removeEventListener('submit', onSubmit); };
}

// ---------------- routing within admin ----------------
function parse(param) {
  if (!param) return { tab: 'dashboard' };
  if (param.startsWith('edit-')) return { tab: 'edit', id: param.slice(5) };
  return { tab: NAV.some(n => n.id === param) ? param : 'dashboard' };
}
let formState = null;
function panel(r) {
  if (r.tab === 'products') return productsPanel();
  if (r.tab === 'orders') return ordersPanel();
  if (r.tab === 'messages') return messagesPanel();
  if (r.tab === 'add' || r.tab === 'edit') {
    const p = r.tab === 'edit' ? S.product(r.id) : null;
    if (r.tab === 'edit' && !p) return `<div class="glass pad empty">${icon('search')}<h3>Product not found</h3><p class="muted">It may have been deleted.</p><a class="btn" href="#admin-products">Back to products</a></div>`;
    formState = freshState(p);
    return formPanel(formState);
  }
  return dashboard();
}

export default {
  title: param => {
    const r = parse(param);
    return 'Admin · ' + (r.tab === 'edit' ? 'Edit product' : NAV.find(n => n.id === r.tab)?.label || 'Dashboard');
  },
  render(param) {
    const r = parse(param);
    return `<div class="v-admin">${CSS}<section class="wrap adm-band">
      <div class="adm-top"><div><span class="eyebrow">Store admin</span><h1>RealityStore back office</h1></div>
        ${S.api.ok ? `<p class="note demo" style="margin:0">${icon('lock')}<span><b style="color:var(--text)">Signed in as staff</b> — changes go live in the database.</span><button class="btn btn-sm" data-act="admin-signout">Sign out</button></p>` : `<p class="note demo" style="margin:0">${icon('lock')}<span><b style="color:var(--text)">Offline preview</b> — changes are saved in this browser only.</span></p>`}</div>
      <div class="adm">${sidebar(r.tab)}<div id="adm-main">${panel(r)}</div></div>
    </section></div>`;
  },
  mount(root, param) {
    const r = parse(param);
    const main = root.querySelector('#adm-main');
    let unbindForm = () => {};
    if (r.tab === 'add' || r.tab === 'edit') unbindForm = bindForm(root, formState);

    const filterRows = () => {
      // re-render table body only, keep the search box focused
      const tmp = document.createElement('div'); tmp.innerHTML = productsPanel();
      const nb = tmp.querySelector('#adm-ptable tbody'); const ob = main.querySelector('#adm-ptable tbody');
      if (nb && ob) ob.replaceWith(nb);
    };
    const onInput = e => { if (e.target.id === 'adm-q') { search = e.target.value; filterRows(); } };
    const onChange = e => {
      const t = e.target;
      if (t.dataset.adm === 'status') { S.setOrderStatus(t.dataset.id, t.value); toast(`Order #${t.dataset.id} marked ${t.value}`, 'truck'); }
    };
    const onClick = e => {
      const t = e.target.closest('[data-adm]'); if (!t || !main.contains(t)) return;
      const id = t.dataset.id; const p = S.product(id); if (!p) return;
      if (t.dataset.adm === 'hide') {
        if (p.custom) S.saveProduct({ ...p, hidden: true }); else S.deleteProduct(id);
        toast(`${p.name} hidden from the shop`, 'lock');
      } else if (t.dataset.adm === 'show') {
        if (p.custom) S.saveProduct({ ...p, hidden: false }); else S.restoreProduct(id);
        toast(`${p.name} is live again`, 'eye');
      } else if (t.dataset.adm === 'del') {
        const m = openModal(`<div class="pad" style="padding:26px">
          <h3 style="display:flex;gap:10px;align-items:center">${icon('trash')} Delete ${esc(p.name)}?</h3>
          <p class="muted">This removes the product and its photo from this browser for good. Orders that include it keep their details. If you might sell it again, hide it instead.</p>
          <div class="row" style="justify-content:flex-end;margin-top:18px">
            <button class="btn btn-ghost" data-close>Keep it</button>
            <button class="btn" data-m="hide">${icon('lock')} Hide instead</button>
            <button class="btn" data-m="del" style="border-color:rgba(194,65,59,0.6);color:var(--danger)">${icon('trash')} Delete</button>
          </div></div>`);
        m.el.querySelector('[data-m="del"]').addEventListener('click', () => { m.close(); S.deleteProduct(id); toast(`${p.name} deleted`, 'trash'); });
        m.el.querySelector('[data-m="hide"]').addEventListener('click', () => { m.close(); S.saveProduct({ ...p, hidden: true }); toast(`${p.name} hidden from the shop`, 'lock'); });
        m.el.querySelector('[data-close]').focus();
      }
    };
    main.addEventListener('input', onInput); main.addEventListener('change', onChange); main.addEventListener('click', onClick);
    const off = S.on(k => {
      if (r.tab === 'add' || r.tab === 'edit') return; // never clobber a form being filled in
      if (['edits', 'custom', 'orders', 'messages'].includes(k)) {
        const y = window.scrollY; main.innerHTML = panel(r); window.scrollTo(0, y);
      }
    });
    return () => { off(); unbindForm(); main.removeEventListener('input', onInput); main.removeEventListener('change', onChange); main.removeEventListener('click', onClick); };
  },
};

function messagesPanel() {
  const list = S.messages();
  const contact = list.filter(m => m.kind === 'contact'), news = list.filter(m => m.kind === 'newsletter');
  const when = d => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return `<div class="glass pad" style="margin-bottom:16px">
      <h2 style="font-size:22px">Contact messages <span class="dim" style="font-size:15px">(${contact.length})</span></h2>
      ${contact.length ? contact.map(m => `<div style="padding:14px 0;border-top:1px solid var(--line)">
          <div class="row between"><b>${esc(m.name)}</b><span class="small dim">${esc(when(m.created_at))}</span></div>
          <div class="small muted">${esc(m.email)}${m.order_ref ? ' · Order #' + esc(m.order_ref) : ''}</div>
          <p style="margin:8px 0 0;white-space:pre-wrap">${esc(m.body)}</p></div>`).join('')
        : `<p class="muted" style="margin:0">No messages yet. Messages sent from the Contact page appear here.</p>`}
    </div>
    <div class="glass pad"><h2 style="font-size:22px">Newsletter sign-ups <span class="dim" style="font-size:15px">(${news.length})</span></h2>
      ${news.length ? `<div class="scroll"><table class="tbl"><thead><tr><th>Email</th><th>Joined</th></tr></thead><tbody>${news.map(m => `<tr><td>${esc(m.email)}</td><td>${esc(when(m.created_at))}</td></tr>`).join('')}</tbody></table></div>`
        : `<p class="muted" style="margin:0">No sign-ups yet.</p>`}</div>`;
}
