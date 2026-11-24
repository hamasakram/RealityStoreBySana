// Checkout (#checkout): contact, address, delivery, payment (COD only for now), sticky summary.
import * as S from '../store.js';
import { esc, money, icon, lineItem, toast, go } from '../ui.js';

const CITIES = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta', 'Hyderabad', 'Sialkot', 'Gujranwala', 'Other'];

const STYLE = `<style>
.v-checkout .co-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin:26px 0 22px}
.v-checkout .co-head h1{margin:0;font-size:clamp(32px,4.4vw,48px)}
.v-checkout .co-head a{color:var(--mist);display:inline-flex;gap:6px;align-items:center;min-height:44px}
.v-checkout .co-head a:hover{color:var(--text)}
.v-checkout .co-grid{display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:28px;align-items:start}
.v-checkout form{display:grid;gap:18px;max-width:720px}
.v-checkout .sec h2{font-size:20px;margin:0;display:flex;align-items:center;gap:12px}
.v-checkout .sec .sec-sub{margin:6px 0 18px 44px;font-size:14px;color:var(--dim)}
.v-checkout .step{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;flex:none;font:700 14px var(--f-display);
  background:var(--gloss-violet);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 6px 16px rgba(47,93,70,0.248)}
.v-checkout .two{display:grid;grid-template-columns:1fr 1fr;gap:0 14px;align-items:start}
.v-checkout .sec{box-shadow:var(--shadow)}
.v-checkout .sec h2{color:var(--text)}
.v-checkout .field{margin-bottom:16px}
.v-checkout .field label .opt{color:var(--dim);font-weight:500}
.v-checkout .hint{font-size:13px;color:var(--dim)}
.v-checkout .err:empty{display:none}
.v-checkout .err{display:flex;gap:6px;align-items:center}
.v-checkout select.input{appearance:none;-webkit-appearance:none;padding-right:40px;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%232F5D46' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:right 14px center;background-size:18px}
.v-checkout textarea.input{min-height:84px}
.v-checkout .opts{display:grid;gap:10px}
.v-checkout .radio-card{min-height:64px;align-items:center}
.v-checkout .radio-card .rc-ico{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;flex:none;background:rgba(47,93,70,0.054);border:1px solid var(--line);color:var(--violet-hi)}
.v-checkout .radio-card .rc-txt{flex:1;display:grid;gap:2px}
.v-checkout .radio-card .rc-txt b{font:600 15px var(--f-display);color:var(--text)}
.v-checkout .radio-card .rc-txt span{font-size:13px;color:var(--dim)}
.v-checkout .radio-card.off{opacity:.55;cursor:not-allowed}
.v-checkout .radio-card.off input{cursor:not-allowed}
.v-checkout .soon{font:700 11px var(--f-body);padding:3px 9px;border-radius:999px;border:1px solid var(--line-2);background:var(--sage);color:var(--mist);white-space:nowrap}
.v-checkout .radio-card:has(input:checked) .rc-ico{background:var(--gloss-violet);color:#fff;border-color:transparent}
.v-checkout .radio-card:focus-within{outline:2px solid var(--violet);outline-offset:2px}
.v-checkout .cod-note{margin-top:12px}
.v-checkout .place{display:grid;gap:12px}
.v-checkout .place .note{display:flex;gap:10px;align-items:flex-start}
.v-checkout .place .note .ico{color:var(--violet-hi);margin-top:1px}
.v-checkout .legal{font-size:13px;color:var(--dim);text-align:center;margin:0}
.v-checkout .legal a{color:var(--mist);text-decoration:underline;text-underline-offset:3px}
.v-checkout .co-side{position:sticky;top:92px}
.v-checkout .sum h2{font-size:20px;margin-bottom:6px}
.v-checkout .sum-lines{max-height:min(46vh,420px);overflow:auto;margin:0 -6px;padding:0 6px}
.v-checkout .sum-lines .line-item{grid-template-columns:60px 1fr auto;gap:12px;padding:12px 0}
.v-checkout .sum-lines .thumb{width:60px;height:60px}
.v-checkout .sum-lines .price{font-size:15px!important}
.v-checkout .sum .kv{font-size:15px}
.v-checkout .sum .tot{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.v-checkout .sum .tot b{font:700 17px var(--f-display)}
.v-checkout .sum-edit{display:inline-flex;align-items:center;gap:6px;color:var(--violet-hi);font:600 14px var(--f-body);min-height:44px}
.v-checkout .sum-trust{display:grid;gap:8px;margin-top:14px;font-size:13px;color:var(--dim)}
.v-checkout .sum-trust span{display:flex;gap:8px;align-items:center}
.v-checkout .sum-trust .ico{width:16px;height:16px;color:var(--violet-hi)}
.v-checkout .m-sum{display:none}
.v-checkout .m-sum summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px 18px;min-height:56px;font:600 15px var(--f-display)}
.v-checkout .m-sum summary::-webkit-details-marker{display:none}
.v-checkout .m-sum summary .lbl{display:flex;gap:8px;align-items:center;color:var(--violet-hi)}
.v-checkout .m-sum summary .chev{width:16px;height:16px;transform:rotate(90deg);transition:transform .2s}
.v-checkout .m-sum[open] summary .chev{transform:rotate(-90deg)}
.v-checkout .m-sum .m-body{padding:0 18px 16px}
@media(max-width:980px){
  .v-checkout .co-grid{grid-template-columns:1fr}
  .v-checkout .co-side{display:none}
  .v-checkout .m-sum{display:block;margin-bottom:18px}
  .v-checkout form{max-width:none}
}
@media(max-width:560px){
  .v-checkout .two{grid-template-columns:1fr}
  .v-checkout .sec .sec-sub{margin-left:0}
}
</style>`;

function summaryInner(compact = false) {
  const lines = S.cart(), sub = S.cartSubtotal(), ship = S.shippingFor(sub), n = S.cartCount();
  return `${compact ? '' : `<div class="row between"><h2 style="margin:0">Order summary</h2><a class="sum-edit" href="#cart">${icon('edit')} Edit bag</a></div>`}
    <div class="sum-lines">${lines.map(l => lineItem(l, false)).join('')}</div>
    <div style="margin-top:12px">
      <div class="kv"><span class="muted">Subtotal (${n} item${n === 1 ? '' : 's'})</span><span>${money(sub)}</span></div>
      <div class="kv"><span class="muted">Delivery · Standard</span><span>${ship ? money(ship) : 'Free'}</span></div>
      ${ship ? `<div class="small dim" style="margin:-2px 0 4px">Free delivery on orders over ${money(S.FREE_SHIPPING)}</div>` : ''}
      <hr class="hr">
      <div class="tot"><b>Total</b><span class="price price-lg">${money(sub + ship)}</span></div>
      <div class="small dim" style="margin-top:4px">Pay in cash when it arrives</div>
    </div>
    ${compact ? `<a class="sum-edit" href="#cart">${icon('edit')} Edit bag</a>` : `<div class="sum-trust">
      <span>${icon('truck')} Delivery in 2–4 working days to major cities</span>
      <span>${icon('lock')} Your details are sent securely and used only for delivery</span>
    </div>`}`;
}

function field({ id, label, type = 'text', opt = false, attrs = '', value = '', hint = '' }) {
  return `<div class="field">
    <label for="co-${id}">${esc(label)}${opt ? ' <span class="opt">(optional)</span>' : ''}</label>
    <input class="input" id="co-${id}" name="${id}" type="${type}" value="${esc(value)}" ${attrs} aria-describedby="${hint ? `co-${id}-hint ` : ''}co-${id}-err">
    ${hint ? `<span class="hint" id="co-${id}-hint">${esc(hint)}</span>` : ''}
    <span class="err" id="co-${id}-err" aria-live="polite"></span>
  </div>`;
}

function normPhone(v) {
  let d = String(v || '').replace(/[\s\-().]/g, '');
  if (d.startsWith('+92')) d = '0' + d.slice(3);
  else if (d.startsWith('0092')) d = '0' + d.slice(4);
  else if (/^92 ?3/.test(d) && d.length === 12) d = '0' + d.slice(2);
  return d;
}

function emptyState() {
  const last = S.myOrders()[0];
  return `<div class="glass pad empty">${icon('bag')}
    <h2>Your bag is empty</h2>
    <p class="muted">Add something to your bag and come back here to check out.</p>
    <div class="row" style="justify-content:center">
      <a class="btn btn-try" href="#shop">${icon('grid')} Browse the shop</a>
      ${last ? `<a class="btn" href="#order-${esc(last.id)}">View your last order</a>` : ''}
    </div>
  </div>`;
}

export default {
  title: 'Checkout',
  render() {
    const lines = S.cart();
    const head = `<div class="co-head"><div><span class="eyebrow">Almost yours</span><h1>Checkout</h1></div><a href="#cart">${icon('back')} Back to bag</a></div>`;
    if (!lines.length) return `<div class="v-checkout">${STYLE}<div class="wrap">${head}${emptyState()}</div></div>`;

    const u = S.user() || {};
    const last = S.myOrders()[0] || {};
    const pre = {
      name: u.name || last.customer?.name || '',
      email: u.email || last.customer?.email || '',
      phone: u.phone || last.customer?.phone || '',
      city: last.address?.city || '',
      line: last.address?.line || '',
      area: last.address?.area || '',
      postal: last.address?.postal || '',
    };
    const known = CITIES.includes(pre.city);
    const citySel = pre.city ? (known ? pre.city : 'Other') : '';
    const sub = S.cartSubtotal(), ship = S.shippingFor(sub), total = sub + ship;

    return `<div class="v-checkout">${STYLE}<div class="wrap">
      ${head}
      <details class="glass m-sum" id="co-msum">
        <summary><span class="lbl">${icon('bag')} Show order summary ${icon('arrow', 'chev')}</span><span class="price" id="co-mtotal">${money(total)}</span></summary>
        <div class="m-body" id="co-msum-body">${summaryInner(true)}</div>
      </details>
      <div class="co-grid">
        <form id="co-form" novalidate aria-label="Checkout">
          <section class="glass pad sec" aria-labelledby="h-contact">
            <h2 id="h-contact"><span class="step" aria-hidden="true">1</span>Contact</h2>
            <p class="sec-sub">We’ll use this to confirm your order and arrange delivery.</p>
            ${field({ id: 'name', label: 'Full name', value: pre.name, attrs: 'autocomplete="name" required maxlength="80"' })}
            <div class="two">
              ${field({ id: 'email', label: 'Email', type: 'email', value: pre.email, attrs: 'autocomplete="email" required inputmode="email" maxlength="120"' })}
              ${field({ id: 'phone', label: 'Mobile number', type: 'tel', value: pre.phone, attrs: 'autocomplete="tel" required inputmode="tel" maxlength="16" placeholder="03XXXXXXXXX"', hint: 'Pakistani mobile, e.g. 0300 1234567' })}
            </div>
          </section>

          <section class="glass pad sec" aria-labelledby="h-addr">
            <h2 id="h-addr"><span class="step" aria-hidden="true">2</span>Delivery address</h2>
            <p class="sec-sub">Where should the rider bring it?</p>
            <div class="two">
              <div class="field">
                <label for="co-city">City</label>
                <select class="input" id="co-city" name="city" required autocomplete="address-level2" aria-describedby="co-city-err">
                  <option value="" ${citySel ? '' : 'selected'} disabled>Choose your city</option>
                  ${CITIES.map(c => `<option ${c === citySel ? 'selected' : ''}>${esc(c)}</option>`).join('')}
                </select>
                <span class="err" id="co-city-err" aria-live="polite"></span>
              </div>
              ${field({ id: 'area', label: 'Area / neighbourhood', value: pre.area, attrs: 'autocomplete="address-level3" required maxlength="80" placeholder="e.g. DHA Phase 5"' })}
            </div>
            <div id="co-other-wrap" ${citySel === 'Other' ? '' : 'hidden'}>
              ${field({ id: 'otherCity', label: 'City name', value: known ? '' : pre.city, attrs: 'maxlength="60" autocomplete="address-level2"' })}
            </div>
            ${field({ id: 'line', label: 'Address', value: pre.line, attrs: 'autocomplete="street-address" required maxlength="160" placeholder="House / flat number, street"' })}
            <div class="two">
              ${field({ id: 'postal', label: 'Postal code', opt: true, value: pre.postal, attrs: 'autocomplete="postal-code" inputmode="numeric" maxlength="5" placeholder="5 digits"' })}
              <div></div>
            </div>
            <div class="field">
              <label for="co-note">Delivery note <span class="opt">(optional)</span></label>
              <textarea class="input" id="co-note" name="note" maxlength="200" placeholder="Landmark, gate number or best time to call" aria-describedby="co-note-err"></textarea>
              <span class="err" id="co-note-err" aria-live="polite"></span>
            </div>
          </section>

          <section class="glass pad sec" aria-labelledby="h-ship">
            <h2 id="h-ship"><span class="step" aria-hidden="true">3</span>Delivery method</h2>
            <p class="sec-sub">Delivered to your door by courier.</p>
            <div class="opts" role="radiogroup" aria-labelledby="h-ship">
              <label class="radio-card">
                <input type="radio" name="ship" value="standard" checked>
                <span class="rc-ico">${icon('truck')}</span>
                <span class="rc-txt"><b>Standard delivery</b><span id="co-ship-eta">2–4 working days in major cities</span></span>
                <span class="price" id="co-ship-price" style="font-size:16px">${ship ? money(ship) : 'Free'}</span>
              </label>
            </div>
          </section>

          <section class="glass pad sec" aria-labelledby="h-pay">
            <h2 id="h-pay"><span class="step" aria-hidden="true">4</span>Payment</h2>
            <p class="sec-sub">Pay at your door — more ways to pay are on the way.</p>
            <div class="opts" role="radiogroup" aria-labelledby="h-pay">
              <label class="radio-card">
                <input type="radio" name="pay" value="cod" checked>
                <span class="rc-ico">${icon('cash')}</span>
                <span class="rc-txt"><b>Cash on delivery</b><span>Pay the rider in cash when your order arrives</span></span>
              </label>
              <label class="radio-card off" aria-disabled="true">
                <input type="radio" name="pay" value="wallet" disabled>
                <span class="rc-ico">${icon('wallet')}</span>
                <span class="rc-txt"><b>JazzCash / Easypaisa</b><span>Mobile wallet payment</span></span>
                <span class="soon">Coming soon</span>
              </label>
              <label class="radio-card off" aria-disabled="true">
                <input type="radio" name="pay" value="card" disabled>
                <span class="rc-ico">${icon('card')}</span>
                <span class="rc-txt"><b>Debit / credit card</b><span>Visa, Mastercard</span></span>
                <span class="soon">Coming soon</span>
              </label>
            </div>
            <p class="note cod-note">Please keep <b style="color:var(--text)" id="co-cod-amt">${money(total)}</b> ready. You can check the parcel with the rider before paying.</p>
          </section>

          <div class="place">
            <button class="btn btn-buy btn-lg btn-block" type="submit" id="co-submit">${icon('lock')} <span id="co-btn-txt">Place order · ${money(total)}</span></button>
            <div class="note">${icon('shield')}<span>Pay cash when your order arrives. We’ll confirm by phone before dispatch.</span></div>
            <p class="legal">By placing your order you agree to our <a href="#terms">terms</a> and <a href="#privacy">privacy policy</a>.</p>
          </div>
        </form>

        <aside class="co-side" aria-label="Order summary">
          <div class="glass pad sum" id="co-sum">${summaryInner()}</div>
        </aside>
      </div>
    </div></div>`;
  },

  mount(root) {
    const form = root.querySelector('#co-form');
    if (!form) return;
    let placing = false, tried = false;
    const $ = s => root.querySelector(s);
    const city = $('#co-city'), otherWrap = $('#co-other-wrap');

    const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
    const rules = {
      name: v => v.trim().length < 3 ? 'Please enter your full name.' : (!/\s/.test(v.trim()) ? 'Please add your surname too.' : ''),
      email: v => !v.trim() ? 'Please enter your email.' : (!EMAIL.test(v.trim()) ? 'That email doesn’t look right, e.g. name@example.com' : ''),
      phone: v => !v.trim() ? 'Please enter your mobile number.' : (!/^03\d{9}$/.test(normPhone(v)) ? 'Use a Pakistani mobile number: 03 followed by 9 digits.' : ''),
      city: v => !v ? 'Please choose your city.' : '',
      otherCity: v => city.value === 'Other' && v.trim().length < 2 ? 'Please type your city.' : '',
      area: v => v.trim().length < 2 ? 'Please enter your area or neighbourhood.' : '',
      line: v => v.trim().length < 6 ? 'Please enter your house / flat number and street.' : '',
      postal: v => v.trim() && !/^\d{5}$/.test(v.trim()) ? 'Postal codes in Pakistan have 5 digits.' : '',
    };
    function setErr(name, msg) {
      const el = form.elements[name]; if (!el) return;
      const err = $(`#co-${name}-err`);
      el.classList.toggle('bad', !!msg);
      el.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (err) err.textContent = msg || '';
    }
    function check(name) { const msg = rules[name](form.elements[name].value); setErr(name, msg); return msg; }

    const onInput = e => { const n = e.target.name; if (tried && rules[n]) check(n); else if (rules[n] && e.target.classList.contains('bad')) check(n); };
    const onBlur = e => { const n = e.target.name; if (rules[n] && e.target.value.trim()) check(n); };
    const onCity = () => {
      otherWrap.hidden = city.value !== 'Other';
      $('#co-ship-eta').textContent = city.value === 'Other' ? 'Usually 2–4 working days — smaller cities can take a little longer' : '2–4 working days in major cities';
      if (city.value === 'Other') form.elements.otherCity.focus(); else setErr('otherCity', '');
    };
    const onPhoneBlur = () => { const el = form.elements.phone; const n = normPhone(el.value); if (/^03\d{9}$/.test(n)) el.value = n; };
    form.addEventListener('input', onInput);
    form.addEventListener('focusout', onBlur);
    city.addEventListener('change', onCity);
    form.elements.phone.addEventListener('blur', onPhoneBlur);

    function refreshTotals() {
      const sub = S.cartSubtotal(), ship = S.shippingFor(sub), total = sub + ship;
      $('#co-sum').innerHTML = summaryInner();
      $('#co-msum-body').innerHTML = summaryInner(true);
      $('#co-mtotal').textContent = money(total);
      $('#co-ship-price').textContent = ship ? money(ship) : 'Free';
      $('#co-cod-amt').textContent = money(total);
      $('#co-btn-txt').textContent = `Place order · ${money(total)}`;
    }
    const off = S.on(k => {
      if (placing || k !== 'cart') return;
      if (!S.cart().length) { root.innerHTML = this.render(); return; }
      refreshTotals();
    });

    const onSubmit = e => {
      e.preventDefault();
      tried = true;
      const order = ['name', 'email', 'phone', 'city', 'area', 'otherCity', 'line', 'postal'];
      const bad = order.filter(n => check(n));
      if (bad.length) {
        const el = form.elements[bad[0]];
        el.focus({ preventScroll: true });
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        toast(bad.length === 1 ? 'Please fix the highlighted field' : `Please fix ${bad.length} highlighted fields`, 'edit');
        return;
      }
      const f = form.elements;
      const cityName = f.city.value === 'Other' ? f.otherCity.value.trim() : f.city.value;
      placing = true;
      $('#co-submit').disabled = true;
      const o = S.placeOrder({
        customer: { name: f.name.value.trim().replace(/\s+/g, ' '), email: f.email.value.trim(), phone: normPhone(f.phone.value) },
        address: { city: cityName, line: f.line.value.trim(), area: f.area.value.trim(), postal: f.postal.value.trim() },
        payment: 'cod',
        deliveryNote: f.note.value.trim(),
      });
      if (!o) {
        placing = false; $('#co-submit').disabled = false;
        toast('Your bag is empty — add something first', 'bag');
        root.innerHTML = this.render();
        return;
      }
      go('#order-' + o.id);
    };
    form.addEventListener('submit', onSubmit);

    return () => {
      off();
      form.removeEventListener('input', onInput);
      form.removeEventListener('focusout', onBlur);
      form.removeEventListener('submit', onSubmit);
      city.removeEventListener('change', onCity);
    };
  },
};
