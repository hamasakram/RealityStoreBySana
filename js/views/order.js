// Order confirmation (#order-<id>)
import * as S from '../store.js';
import { esc, money, icon, productArt, toast } from '../ui.js';

const PAY = { cod: 'Cash on delivery', wallet: 'JazzCash / Easypaisa', card: 'Debit / credit card' };

const STYLE = `<style>
.v-order{padding-top:28px}
.v-order .o-hero{text-align:center;padding:clamp(34px,5vw,60px) clamp(18px,4vw,40px);overflow:hidden}
.v-order .o-hero .orb.a{width:340px;height:340px;left:50%;top:-120px;transform:translateX(-50%);background:var(--violet);opacity:.4}
.v-order .o-check{width:96px;height:96px;margin:0 auto 22px;border-radius:50%;display:grid;place-items:center;position:relative;
  background:var(--gloss-violet);box-shadow:inset 0 2px 0 rgba(255,255,255,.6),inset 0 -8px 18px rgba(40,20,140,.5),0 18px 40px rgba(124,92,255,.55);
  animation:ocpop .6s cubic-bezier(.2,1.4,.4,1) both}
.v-order .o-check::before{content:"";position:absolute;inset:-12px;border-radius:50%;border:1px solid rgba(168,148,255,.45);animation:ocring 1.6s ease-out .2s both}
.v-order .o-check::after{content:"";position:absolute;left:18%;right:18%;top:8%;height:34%;border-radius:50%;background:linear-gradient(180deg,rgba(255,255,255,.55),rgba(255,255,255,0))}
.v-order .o-check .ico{width:48px;height:48px;stroke-width:2.6;color:#fff;position:relative;z-index:1}
@keyframes ocpop{from{transform:scale(.4);opacity:0}to{transform:none;opacity:1}}
@keyframes ocring{from{transform:scale(.7);opacity:0}50%{opacity:1}to{transform:scale(1.15);opacity:0}}
.v-order .o-hero h1{font-size:clamp(32px,4.6vw,50px);margin-bottom:10px}
.v-order .o-hero p{max-width:56ch;margin:0 auto 22px}
.v-order .o-meta{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;max-width:880px;margin:0 auto;text-align:left}
.v-order .o-meta>div{padding:14px 16px;border-radius:14px;border:1px solid var(--line);background:rgba(255,255,255,.04)}
.v-order .o-meta .k{font-size:13px;color:var(--dim);display:block;margin-bottom:4px}
.v-order .o-meta .v{font:600 15px var(--f-display);color:#fff;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.v-order .o-copy{background:none;border:1px solid var(--line-2);border-radius:999px;min-height:30px;padding:0 10px;font:600 12px var(--f-body);color:var(--mist);display:inline-flex;gap:4px;align-items:center}
.v-order .o-copy:hover{color:#fff}
.v-order .o-copy .ico{width:14px;height:14px}
.v-order .o-meta .v.o-status{display:block}
.v-order .o-status::before{content:"";display:inline-block;vertical-align:middle;margin:-2px 8px 0 0;width:8px;height:8px;border-radius:50%;background:var(--ok);box-shadow:0 0 10px var(--ok)}
.v-order .o-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:22px;margin-top:22px;align-items:start}
.v-order .o-col{display:grid;gap:22px}
.v-order h2{font-size:20px;margin-bottom:6px}
.v-order .o-line{display:grid;grid-template-columns:72px 1fr auto;gap:14px;align-items:center;padding:14px 0;border-bottom:1px solid var(--line)}
.v-order .o-line:last-of-type{border-bottom:0}
.v-order .o-line .thumb{width:72px;height:72px;border-radius:14px;background:radial-gradient(circle at 50% 38%,#2F2A86,#14173E);display:grid;place-items:center;color:var(--violet-hi)}
.v-order .o-line .thumb svg{width:80%;height:80%}
.v-order .o-line .thumb img{width:100%;height:100%;object-fit:cover;border-radius:14px}
.v-order .o-line .nm{font:600 15px var(--f-display)}
.v-order .o-line .price{font-size:16px}
.v-order .o-tot .kv{font-size:15px}
.v-order .o-tot .tot{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.v-order .o-tot .tot b{font:700 17px var(--f-display)}
.v-order .o-info{display:grid;gap:4px;color:var(--mist);font-size:15px;font-style:normal}
.v-order .o-info b{color:#fff;font-weight:600}
.v-order .o-row{display:flex;gap:12px;align-items:flex-start}
.v-order .o-row>.ico{color:var(--violet-hi);margin-top:3px}
.v-order .o-nextsec{margin-top:22px}
.v-order .steps{list-style:none;margin:14px 0 0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}
.v-order .steps li:not(:last-child)::after{display:none}
@media(max-width:760px){.v-order .steps{grid-template-columns:1fr;gap:0}.v-order .steps li:not(:last-child)::after{display:block}}
.v-order .steps li{display:grid;grid-template-columns:40px 1fr;gap:14px;position:relative;padding-bottom:18px}
.v-order .steps li:last-child{padding-bottom:0}
.v-order .steps li:not(:last-child)::after{content:"";position:absolute;left:19px;top:42px;bottom:2px;width:2px;background:linear-gradient(var(--violet),rgba(124,92,255,.1))}
.v-order .steps .n{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;border:1px solid rgba(168,148,255,.5);background:rgba(124,92,255,.15);color:var(--violet-hi)}
.v-order .steps li.done .n{background:var(--gloss-violet);color:#fff;border-color:rgba(255,255,255,.3);box-shadow:0 6px 16px rgba(124,92,255,.45)}
.v-order .steps b{display:block;font:600 16px var(--f-display);color:#fff;margin:8px 0 2px}
.v-order .steps span{color:var(--mist);font-size:14px}
.v-order .o-actions{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:28px}
@media(max-width:900px){.v-order .o-grid{grid-template-columns:1fr}.v-order .o-meta{grid-template-columns:1fr 1fr}}
@media(max-width:420px){.v-order .o-actions .btn{width:100%}.v-order .o-line{grid-template-columns:60px 1fr auto;gap:10px}.v-order .o-line .thumb{width:60px;height:60px}}
</style>`;

function fmtDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  try { return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); }
  catch (e) { return d.toDateString(); }
}

function lineRow(l) {
  const p = S.product(l.id);
  const hex = p?.colors?.find(c => c.name === l.color)?.hex;
  const thumb = p ? `<a class="thumb" href="#p-${esc(l.id)}" aria-label="${esc(l.name)}">${productArt(p, hex)}</a>` : `<span class="thumb">${icon('cube')}</span>`;
  return `<div class="o-line">
    ${thumb}
    <div>
      ${p && !p.hidden ? `<a class="nm" href="#p-${esc(l.id)}">${esc(l.name)}</a>` : `<span class="nm">${esc(l.name)}</span>`}
      <div class="small dim">${esc(l.color || '')}${l.size ? ' · ' + esc(l.size) : ''}</div>
      <div class="small dim">Qty ${esc(l.qty)} × ${money(l.price)}</div>
    </div>
    <span class="price">${money(l.qty * l.price)}</span>
  </div>`;
}

export default {
  title: 'Order confirmed',
  render(id) {
    const o = S.order(id);
    if (!o) {
      return `<div class="v-order">${STYLE}<section class="wrap band"><div class="glass pad empty">${icon('search')}
        <h2>We couldn’t find that order</h2>
        <p class="muted">Orders are saved in the browser they were placed in. Check the order number, or look in My orders.</p>
        <div class="row" style="justify-content:center"><a class="btn" href="#orders">My orders</a><a class="btn btn-ghost" href="#shop">Keep shopping</a></div>
      </div></section></div>`;
    }
    const first = String(o.customer?.name || '').trim().split(/\s+/)[0] || 'you';
    const a = o.address || {};
    const items = (o.lines || []).reduce((n, l) => n + (Number(l.qty) || 0), 0);
    const cod = o.payment === 'cod';
    return `<div class="v-order">${STYLE}<div class="wrap">
      <section class="glass o-hero" aria-labelledby="o-h">
        <span class="orb a" aria-hidden="true"></span>
        <div class="o-check" aria-hidden="true">${icon('check')}</div>
        <span class="eyebrow">Order placed</span>
        <h1 id="o-h">Thank you, ${esc(first)}</h1>
        <p class="muted">Your order is in. Keep your order number handy — you can follow it any time in My orders.</p>
        <div class="o-meta">
          <div><span class="k">Order number</span><span class="v"><span id="o-id">${esc(o.id)}</span><button type="button" class="o-copy" id="o-copy" aria-label="Copy order number">Copy</button></span></div>
          <div><span class="k">Placed on</span><span class="v">${esc(fmtDate(o.date))}</span></div>
          <div><span class="k">Status</span><span class="v o-status">${esc(o.status || 'Confirmed')}</span></div>
          <div><span class="k">Payment</span><span class="v">${esc(PAY[o.payment] || o.payment || '')}</span></div>
        </div>
      </section>

      <div class="o-grid">
        <div class="o-col">
          <section class="glass pad" aria-labelledby="o-items">
            <div class="row between"><h2 id="o-items" style="margin:0">Your items</h2><span class="small dim">${items} item${items === 1 ? '' : 's'}</span></div>
            <div>${(o.lines || []).map(lineRow).join('')}</div>
            <hr class="hr">
            <div class="o-tot">
              <div class="kv"><span class="muted">Subtotal</span><span>${money(o.subtotal || 0)}</span></div>
              <div class="kv"><span class="muted">Delivery</span><span>${o.shipping ? money(o.shipping) : 'Free'}</span></div>
              <hr class="hr">
              <div class="tot"><b>${cod ? 'To pay on delivery' : 'Total'}</b><span class="price price-lg">${money(o.total || 0)}</span></div>
            </div>
          </section>
        </div>
        <div class="o-col">
          <section class="glass pad" aria-labelledby="o-addr">
            <h2 id="o-addr">Delivery</h2>
            <div class="o-row">${icon('pin')}<address class="o-info">
              <b>${esc(o.customer?.name || '')}</b>
              <span>${esc(a.line || '')}</span>
              <span>${esc([a.area, a.city].filter(Boolean).join(', '))}${a.postal ? ' ' + esc(a.postal) : ''}</span>
              <span>${esc(o.customer?.phone || '')}${o.customer?.email ? ' · ' + esc(o.customer.email) : ''}</span>
            </address></div>
            ${o.deliveryNote ? `<div class="o-row" style="margin-top:12px">${icon('edit')}<span class="o-info"><b>Note for the rider</b><span>${esc(o.deliveryNote)}</span></span></div>` : ''}
            <hr class="hr">
            <div class="o-row">${icon(cod ? 'cash' : 'card')}<span class="o-info"><b>${esc(PAY[o.payment] || o.payment || '')}</b><span>${cod ? `Please keep ${money(o.total || 0)} ready for the rider.` : 'Payment details are with your order.'}</span></span></div>
          </section>


        </div>
      </div>

      <section class="glass pad o-nextsec" aria-labelledby="o-next">
            <h2 id="o-next">What happens next</h2>
            <ol class="steps">
              <li class="done"><span class="n">${icon('check')}</span><div><b>Order confirmed</b><span>We’ve got your order and will start preparing and packing it.</span></div></li>
              <li><span class="n">${icon('truck')}</span><div><b>On its way</b><span>Delivery usually takes 2–4 working days in major cities.</span></div></li>
              <li><span class="n">${icon(cod ? 'cash' : 'bag')}</span><div><b>${cod ? 'Check it, then pay' : 'Enjoy it'}</b><span>${cod ? 'Look over your parcel with the rider, then pay in cash.' : 'Your parcel is handed over at your door.'}</span></div></li>
            </ol>
          </section>
      <p class="note" style="margin:22px auto 0;max-width:760px;text-align:center">${o.pending ? 'Sending your order to RealityStore… keep this page open for a moment.' : o.failed ? 'This order could not be placed. Please check your details and try again, or contact us.' : 'Your order is with the RealityStore team. Pay cash when it arrives — we\u2019ll call to confirm before dispatch.'}</p>
      <div class="o-actions">
        <a class="btn btn-lg" href="#orders">${icon('truck')} Track in my orders</a>
        <a class="btn btn-ghost btn-lg" href="#shop">Keep shopping ${icon('arrow')}</a>
        <a class="btn btn-try btn-lg" href="#tryon">${icon('camera')} Try something else on</a>
      </div>
    </div></div>`;
  },
  mount(root) {
    const btn = root.querySelector('#o-copy');
    if (!btn) return;
    const onCopy = async () => {
      const id = root.querySelector('#o-id').textContent;
      try { await navigator.clipboard.writeText(id); toast('Order number copied', 'check'); }
      catch (e) { toast(`Your order number is ${id}`, 'check'); }
    };
    btn.addEventListener('click', onCopy);
    return () => btn.removeEventListener('click', onCopy);
  },
};
