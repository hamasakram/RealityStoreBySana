// Staff sign-in for the admin panel (shown when the live database is connected).
import * as S from '../store.js';
import { icon, toast, go } from '../ui.js';

export default {
  title: 'Staff sign-in',
  render() {
    return `<div class="v-alog"><style>
.v-alog .card{max-width:460px;margin:clamp(40px,8vw,90px) auto;display:grid;gap:14px}
.v-alog .badge-ic{width:64px;height:64px;border-radius:18px;display:grid;place-items:center;background:var(--gloss-violet);box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 12px 30px rgba(124,92,255,.5)}
.v-alog .badge-ic .ico{width:30px;height:30px}
</style><section class="wrap"><form class="glass pad card" id="alog" novalidate>
  <div class="badge-ic">${icon('lock')}</div>
  <div><span class="eyebrow">Store admin</span><h1 style="font-size:32px;margin:0">Staff sign-in</h1></div>
  <p class="muted" style="margin:0">Enter the RealityStore admin key to manage products, orders and messages.</p>
  <div class="field" style="margin:0"><label for="akey">Admin key</label>
    <input class="input" id="akey" name="key" type="password" autocomplete="current-password" required>
    <span class="err" id="aerr" role="alert"></span></div>
  <button class="btn btn-try btn-lg" type="submit">${icon('lock')} Sign in</button>
  <a class="small dim" href="#home">Back to the store</a>
</form></section></div>`;
  },
  mount(root) {
    const f = root.querySelector('#alog');
    f.querySelector('input').focus();
    const onSubmit = async e => {
      e.preventDefault();
      const key = f.key.value.trim(), err = root.querySelector('#aerr'), btn = f.querySelector('button');
      if (!key) { err.textContent = 'Please enter the admin key.'; return; }
      btn.disabled = true; err.textContent = '';
      try { await S.adminSignIn(key); toast('Signed in as staff', 'lock'); go(location.hash === '#admin' || !location.hash.startsWith('#admin') ? '#admin' : location.hash); }
      catch (ex) { err.textContent = ex.message; btn.disabled = false; f.key.focus(); }
    };
    f.addEventListener('submit', onSubmit);
    return () => f.removeEventListener('submit', onSubmit);
  },
};
