// Full-page bag (#cart): line items, order summary with free-delivery progress, suggestions.
import * as S from '../store.js';
import { esc, money, icon, productCard, lineItem } from '../ui.js';

const STYLE = `<style>
.v-cart .c-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin:26px 0 22px}
.v-cart .c-head h1{margin:0;font-size:clamp(32px,4.4vw,48px)}
.v-cart .c-head .muted{margin:0}
.v-cart .c-grid{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:24px;align-items:start}
.v-cart .c-lines{padding:6px clamp(16px,2.2vw,26px)}
.v-cart .c-lines .line-item{grid-template-columns:96px 1fr auto;gap:16px;padding:18px 0}
.v-cart .c-lines .line-item:last-child{border-bottom:0}
.v-cart .c-lines .thumb{width:96px;height:96px;border-radius:16px}
.v-cart .c-lines .qty button{width:44px;height:44px;display:grid;place-items:center}
.v-cart .c-lines .icon-btn{width:44px!important;height:44px!important}
.v-cart .c-lines .price{font-size:17px!important}
.v-cart .c-side{position:sticky;top:92px;display:grid;gap:14px}
.v-cart .c-sum h2{font-size:22px;margin-bottom:14px}
.v-cart .c-sum .kv{font-size:15px}
.v-cart .c-sum .tot{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding-top:4px}
.v-cart .c-sum .tot b{font:700 17px var(--f-display)}
.v-cart .ship{margin:4px 0 16px;padding:14px;border-radius:14px;border:1px solid var(--line);background:rgba(255,255,255,.03)}
.v-cart .ship p{margin:0 0 10px;font-size:14px;color:var(--mist);display:flex;gap:8px;align-items:center}
.v-cart .ship p .ico{color:var(--violet-hi);width:18px;height:18px}
.v-cart .bar{height:8px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden}
.v-cart .bar i{display:block;height:100%;border-radius:inherit;background:var(--gloss-violet);box-shadow:0 0 12px rgba(124,92,255,.7);transition:width .4s}
.v-cart .perks{display:grid;gap:0;padding:4px 18px}
.v-cart .perk{display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-bottom:1px solid var(--line);font-size:14px;color:var(--mist)}
.v-cart .perk:last-child{border-bottom:0}
.v-cart .perk .ico{color:var(--violet-hi);margin-top:1px}
.v-cart .perk b{color:#fff;font-weight:600;display:block}
.v-cart .c-actions{display:grid;gap:10px;margin-top:16px}
.v-cart .c-more{margin-top:clamp(40px,6vw,72px)}
.v-cart .c-empty{padding:64px 20px}
.v-cart .c-empty .row{justify-content:center}
@media(max-width:960px){.v-cart .c-grid{grid-template-columns:1fr}.v-cart .c-side{position:relative;top:0}}
@media(max-width:760px){
  .v-cart .c-more .products{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:12px;margin:0 calc(-1 * max(4vw,16px));padding:4px max(4vw,16px) 14px;scrollbar-width:none}
  .v-cart .c-more .products::-webkit-scrollbar{display:none}
  .v-cart .c-more .pcard{flex:0 0 74%;scroll-snap-align:start}
}
@media(max-width:520px){
  .v-cart .c-lines .line-item{grid-template-columns:76px 1fr;grid-template-areas:"t i" "t p";row-gap:6px}
  .v-cart .c-lines .line-item>.thumb{grid-area:t;width:76px;height:76px;align-self:start}
  .v-cart .c-lines .line-item>div{grid-area:i}
  .v-cart .c-lines .line-item>.price{grid-area:p;justify-self:start}
}
</style>`;

function suggestions() {
  const inCart = new Set(S.cart().map(l => l.id));
  const cartCats = new Set(S.cart().map(l => l.product.category));
  const list = S.products().filter(p => !inCart.has(p.id));
  const score = p => (cartCats.has(p.category) ? 0 : 2) + (p.tags?.includes('trending') ? 1 : 0) + p.rating / 5;
  return list.sort((a, b) => score(b) - score(a)).slice(0, 4);
}

function body() {
  const lines = S.cart();
  if (!lines.length) {
    return `<div class="glass c-empty empty">${icon('bag')}
      <h2>Your bag is empty</h2>
      <p class="muted">Try something on first — it’s the fun part. Everything you add will wait for you here.</p>
      <div class="row"><a class="btn btn-try" href="#tryon">${icon('camera')} Open the Try-On Studio</a><a class="btn" href="#shop">Browse the shop</a></div>
    </div>`;
  }
  const sub = S.cartSubtotal(), ship = S.shippingFor(sub), total = sub + ship;
  const left = Math.max(0, S.FREE_SHIPPING - sub);
  const pct = Math.min(100, Math.round((sub / S.FREE_SHIPPING) * 100));
  const count = S.cartCount();
  return `<div class="c-grid">
    <div class="glass c-lines" aria-label="Items in your bag">${lines.map(l => lineItem(l)).join('')}</div>
    <aside class="c-side">
      <div class="glass pad c-sum" aria-labelledby="c-sum-h">
        <h2 id="c-sum-h">Order summary</h2>
        <div class="ship">
          <p>${icon('truck')}${left > 0 ? `<span>Add <b class="price" style="font-size:14px">${money(left)}</b> more for free delivery</span>` : '<span><b style="color:#fff">You’ve unlocked free delivery</b></span>'}</p>
          <div class="bar" role="progressbar" aria-label="Progress to free delivery" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div>
        </div>
        <div class="kv"><span class="muted">Subtotal (${count} item${count === 1 ? '' : 's'})</span><span>${money(sub)}</span></div>
        <div class="kv"><span class="muted">Delivery</span><span>${ship ? money(ship) : 'Free'}</span></div>
        <hr class="hr">
        <div class="tot"><b>Total</b><span class="price price-lg">${money(total)}</span></div>
        <div class="c-actions">
          <a class="btn btn-buy btn-lg btn-block" href="#checkout">${icon('lock')} Checkout</a>
          <a class="btn btn-ghost btn-block" href="#shop">${icon('back')} Continue shopping</a>
        </div>
      </div>
      <div class="glass perks">
        <div class="perk">${icon('cash')}<span><b>Cash on delivery</b>Pay when your order reaches you.</span></div>
        <div class="perk">${icon('truck')}<span><b>2–4 working days</b>Delivery to major cities across Pakistan.</span></div>
        <div class="perk">${icon('camera')}<span><b>Not sure about the fit?</b>Open any item and try it on live before you check out.</span></div>
      </div>
    </aside>
  </div>`;
}

function more() {
  const s = suggestions();
  return s.length ? `<div class="sec-head"><div><span class="eyebrow">You might also like</span><h2 style="margin:0">Try these on next</h2></div><a class="btn btn-ghost" href="#shop">See everything ${icon('arrow')}</a></div>
    <div class="products">${s.map(productCard).join('')}</div>` : '';
}

export default {
  title: 'Your bag',
  render() {
    const n = S.cartCount();
    return `<div class="v-cart">${STYLE}<div class="wrap">
      <div class="c-head"><div><span class="eyebrow">Shopping bag</span><h1>Your bag</h1></div><p class="muted" id="c-count">${n ? `${n} item${n === 1 ? '' : 's'} ready to go` : ''}</p></div>
      <div id="c-body">${body()}</div>
      <section class="c-more" id="c-more">${more()}</section>
    </div></div>`;
  },
  mount(root) {
    const off = S.on(k => {
      if (k !== 'cart' && k !== 'edits' && k !== 'custom') return;
      const a = document.activeElement;
      const keep = a && root.contains(a) && a.dataset.key ? `[data-key="${CSS.escape(a.dataset.key)}"][data-act="${a.dataset.act}"]${a.dataset.d ? `[data-d="${a.dataset.d}"]` : ''}` : null;
      const n = S.cartCount();
      root.querySelector('#c-count').textContent = n ? `${n} item${n === 1 ? '' : 's'} ready to go` : '';
      root.querySelector('#c-body').innerHTML = body();
      root.querySelector('#c-more').innerHTML = more();
      if (keep) (root.querySelector(keep) || root.querySelector('#c-body .btn, #c-body a'))?.focus({ preventScroll: true });
    });
    return off;
  },
};
