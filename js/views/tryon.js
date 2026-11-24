// Try-On Studio: #tryon and #tryon-<productId>
import * as S from '../store.js';
import { esc, money, icon, priceTag, productArt, toast, openModal, go, catLabel, arLevel, ZONE_ICON } from '../ui.js';
import { ZONES } from '../data.js';

let engine = null;
let state = null;

const ERRORS = {
  denied: ['Camera access is blocked', 'Tap the camera or lock icon in your address bar, choose <b>Allow</b> for the camera, then try again. If you opened this inside a preview window, open the live store in your browser instead.'],
  nocamera: ['No camera found', 'We couldn’t find a camera on this device. Try on your phone, or plug in a webcam.'],
  busy: ['Your camera is busy', 'Another app or tab is using the camera. Close it, then try again.'],
  insecure: ['A secure connection is needed', 'Browsers only open the camera on secure (https) pages. Open the store at its https address.'],
  unsupported: ['This browser can’t open the camera', 'Use a recent Chrome, Safari, Edge or Samsung Internet.'],
  model: ['The try-on model didn’t load', 'Check your internet connection and try again. The model loads once, then works smoothly.'],
};
const LOST_HINT = {
  head: 'Face the camera — we’ll place it on your head',
  face: 'Look at the camera — we’re finding your eyes',
  hands: 'Hold one or both hands up in front of the camera',
  body: 'Step back so your shoulders and hips are in frame',
  feet: 'Prop the phone low and step back — whole body and feet in frame',
};

function pick(param) {
  const p = (param && S.product(param)) || S.product('nova-bucket-hat') || S.products()[0];
  return p;
}

export default {
  title: param => { const p = param && S.product(param); return p ? `Try on ${p.name}` : 'Try-On Studio'; },
  render(param) {
    const p = pick(param);
    state = { p, color: p.colors?.[0] || { name: '', hex: '#2F5D46' }, size: p.sizes?.[0] || '', zone: p.zone, tracked: new Set() };
    return `<div class="v-tryon">
<style>
.v-tryon .layout{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);gap:22px;align-items:start}
@media(max-width:960px){.v-tryon .layout{grid-template-columns:1fr}}
.v-tryon .top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:18px 0 14px}
.v-tryon .top h1{font-size:clamp(26px,3.4vw,38px);margin:0}
.v-tryon .ar-stage{max-height:min(78vh,760px)}
.v-tryon .ar-stage{background-clip:padding-box}
.v-tryon .ar-stage:has(.ov:not([hidden])){background:#F4F0E8;border-color:rgba(47,93,70,.18);box-shadow:0 24px 60px rgba(47,93,70,.12),0 2px 8px rgba(30,43,36,.05)}
.v-tryon .ov{position:absolute;inset:0;z-index:5;display:grid;place-items:center;padding:22px;text-align:center;color:var(--text);
  background:linear-gradient(180deg,rgba(255,255,255,.7),rgba(255,255,255,0) 42%),
    radial-gradient(460px 340px at 50% 36%,rgba(232,239,232,.95),rgba(232,239,232,0) 70%),
    radial-gradient(600px 420px at 100% 100%,rgba(143,184,160,.22),rgba(143,184,160,0) 65%),
    linear-gradient(165deg,#FDFBF7 0%,#F6F2EA 55%,#E8EFE8 100%)}
.v-tryon .ov::after{content:"";position:absolute;inset:0;pointer-events:none;border-radius:inherit;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(255,255,255,.4)}
.v-tryon .ov .spinner{border-color:rgba(47,93,70,.16);border-top-color:var(--violet)}
.v-tryon .ov[hidden]{display:none}
.v-tryon .ov .in{max-width:420px;display:grid;gap:12px;justify-items:center}
.v-tryon .ov .cam{width:86px;height:86px;border-radius:50%;display:grid;place-items:center;color:#fff;background:var(--gloss-violet);border:3px solid rgba(255,255,255,.85);box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 14px 40px rgba(47,93,70,0.28)}
.v-tryon .ov .cam .ico{width:40px;height:40px;stroke-width:1.6}
.v-tryon .ov h2{font-size:clamp(22px,3vw,30px);margin:6px 0 0}
.v-tryon .ov p{color:var(--mist);margin:0}
.v-tryon .ov .tiny{font-size:13px;color:var(--dim);display:flex;flex-wrap:wrap;justify-content:center;gap:4px 6px;align-items:center}
.v-tryon .ov .tiny .ico{width:15px;height:15px}
.v-tryon .ghost-wrap{position:relative;display:grid;place-items:center;width:200px;height:180px}
.v-tryon .ghost-wrap::before{content:"";position:absolute;left:18px;right:18px;bottom:8px;height:34px;border-radius:50%;
  background:radial-gradient(closest-side,rgba(255,255,255,.95),#E2EBE2 70%,rgba(220,230,220,0));box-shadow:0 10px 24px rgba(47,93,70,.12)}
.v-tryon .ghost-art{position:relative;width:160px;height:160px;opacity:.97;filter:drop-shadow(0 16px 22px rgba(47,93,70,.16));animation:floaty 4s ease-in-out infinite}
.v-tryon .ov .tiny a{color:var(--violet-hi);font-weight:600}
.v-tryon .ov p b{color:var(--violet-lo)}
@keyframes floaty{50%{transform:translateY(-8px) rotate(-2deg)}}
.v-tryon .corners .ar-corner{opacity:.7}
.v-tryon .tl{top:16px;left:16px;border-right:0;border-bottom:0;border-radius:10px 0 0 0}.v-tryon .tr{top:16px;right:16px;border-left:0;border-bottom:0;border-radius:0 10px 0 0}
.v-tryon .bl{bottom:84px;left:16px;border-right:0;border-top:0;border-radius:0 0 0 10px}.v-tryon .br{bottom:84px;right:16px;border-left:0;border-top:0;border-radius:0 0 10px 0}
.v-tryon .pill{position:absolute;top:16px;left:62px;padding:6px 12px;border-radius:999px;color:#fff;background:rgba(30,43,36,0.72);border:1px solid rgba(255,255,255,.22);font:700 12px var(--f-body)}
.v-tryon .ar-hint{top:auto;bottom:86px;background:rgba(30,43,36,0.72)}
.v-tryon .ctrl{position:absolute;left:0;right:0;bottom:0;padding:14px;display:flex;justify-content:center;align-items:center;gap:14px;
  background:linear-gradient(180deg,rgba(30,43,36,0),rgba(30,43,36,0.45))}
.v-tryon .ctrl .icon-btn{width:50px;height:50px;color:#fff;background:rgba(30,43,36,0.7);border-color:rgba(255,255,255,.25)}
.v-tryon .ctrl .icon-btn:hover{background:rgba(30,43,36,0.85)}
.v-tryon .ar-hint{color:#fff;border-color:rgba(255,255,255,.2)}
.v-tryon .shutter{width:66px;height:66px;border-radius:50%;border:4px solid #fff;background:var(--gloss-violet);box-shadow:0 0 0 4px rgba(47,93,70,0.193),0 10px 26px rgba(30,43,36,0.175)}
.v-tryon .shutter:active{transform:scale(.95)}
.v-tryon .panel{display:grid;gap:16px}
.v-tryon .pinfo{display:grid;grid-template-columns:84px 1fr;gap:14px;align-items:center}
.v-tryon .pinfo .th{width:84px;height:84px;border-radius:16px;display:grid;place-items:center;background:radial-gradient(circle at 50% 38%,#FFFFFF,#E2EBE2)}
.v-tryon .pinfo .th svg{width:82%;height:82%}
.v-tryon .pinfo h2{font-size:21px;margin:0 0 2px}
.v-tryon .opts{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.v-tryon .label{font:600 13px var(--f-body);color:var(--mist);margin-bottom:8px;display:block}
.v-tryon .ztabs{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px}
.v-tryon .ztabs .chip{flex:none}
.v-tryon .rail{display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;padding:2px 2px 8px}
.v-tryon .mini{flex:none;width:118px;scroll-snap-align:start;border-radius:14px;padding:8px;border:1px solid var(--line);background:rgba(47,93,70,0.036);text-align:left;display:grid;gap:4px}
.v-tryon .mini.on{border-color:rgba(47,93,70,0.45);background:rgba(47,93,70,0.088)}
.v-tryon .mini .a{aspect-ratio:1;border-radius:10px;display:grid;place-items:center;background:radial-gradient(circle at 50% 38%,#FFFFFF,#E2EBE2)}
.v-tryon .mini .a svg{width:80%;height:80%}
.v-tryon .mini b{font:600 12.5px var(--f-display);line-height:1.2}
.v-tryon .mini .price{font-size:13px}
.v-tryon input[type=range]{width:100%;accent-color:var(--violet);height:30px}
.v-tryon .fitrow{display:grid;grid-template-columns:70px 1fr;gap:10px;align-items:center;font-size:14px;color:var(--mist)}
.v-tryon .buyrow{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media(max-width:600px){.v-tryon .ar-stage{aspect-ratio:3/4;border-radius:18px}.v-tryon .bl,.v-tryon .br{bottom:84px}}
</style>
<section class="wrap">
  <div class="top">
    <div><span class="eyebrow">Try-On Studio</span><h1>Wear it live</h1></div>
    <a class="btn btn-ghost btn-sm" href="#p-${esc(p.id)}" id="to-product">${icon('back')} Product details</a>
  </div>
  <div class="layout">
    <div>
      <div class="ar-stage" id="stage">
        <div class="mirror"><video playsinline muted></video><canvas class="gl"></canvas><canvas class="fx"></canvas></div>
        <div class="ar-hud corners" id="hud" hidden>
          <span class="ar-corner tl"></span><span class="ar-corner tr"></span><span class="ar-corner bl"></span><span class="ar-corner br"></span>
          <span class="pill"><span class="live-dot"></span>LIVE</span>
          <div class="ar-hint" id="hint">Starting…</div>
          <div class="ctrl">
            <button class="icon-btn" id="flip" aria-label="Switch camera">${icon('flip')}</button>
            <button class="shutter" id="snap" aria-label="Take a snapshot"></button>
            <button class="icon-btn" id="stopcam" aria-label="Turn camera off">${icon('x')}</button>
          </div>
        </div>
        <div class="ov" id="ov-intro">
          <div class="in">
            <div class="ghost-wrap"><div class="ghost-art" id="ghost">${productArt(p, state.color.hex)}</div></div>
            <h2>Let’s see it on you</h2>
            <p id="intro-tip">${esc(arLevel(p.zone).tip)} We need your camera to place the <b>${esc(p.name)}</b> on you.</p>
            <button class="btn btn-try btn-lg" id="start">${icon('camera')} Allow camera &amp; start</button>
            <span class="tiny">${icon('lock')} <span>Processed on your device, never uploaded or recorded.</span> <a href="#privacy" style="text-decoration:underline">How we handle your camera</a></span>
          </div>
        </div>
        <div class="ov" id="ov-load" hidden><div class="in"><div class="spinner"></div><h2 id="load-title">Opening your camera…</h2><p id="load-sub">Your browser will ask for permission.</p></div></div>
        <div class="ov" id="ov-err" hidden><div class="in"><div class="cam">${icon('camera')}</div><h2 id="err-title"></h2><p id="err-text"></p>
          <div class="row" style="justify-content:center"><button class="btn btn-try" id="retry">${icon('refresh')} Try again</button><a class="btn" href="#p-${esc(p.id)}" id="err-product">View product</a></div></div></div>
      </div>
    </div>

    <aside class="panel">
      <div class="glass pad" id="pcard"></div>
      <div class="glass pad">
        <span class="label">Switch product</span>
        <div class="ztabs" id="ztabs">${ZONES.map(z => `<button class="chip ${z.id === p.zone ? 'on' : ''}" data-zone="${z.id}">${icon(ZONE_ICON[z.id])}${esc(z.label)}</button>`).join('')}</div>
        <div class="rail" id="rail" style="margin-top:12px"></div>
      </div>
      <div class="glass pad">
        <div class="row between" style="margin-bottom:8px"><span class="label" style="margin:0">Adjust the fit</span><button class="btn btn-ghost btn-sm" id="fit-reset">Reset</button></div>
        <div class="fitrow"><label for="fit-size">Size</label><input type="range" id="fit-size" min="0.8" max="1.25" step="0.01" value="1"></div>
        <div class="fitrow"><label for="fit-lift">Height</label><input type="range" id="fit-lift" min="-0.15" max="0.15" step="0.005" value="0"></div>
        <p class="small dim" style="margin:6px 0 0" id="fit-note"></p>
      </div>
    </aside>
  </div>
</section></div>`;
  },

  mount(root, param) {
    const $ = s => root.querySelector(s);
    const stage = $('#stage');
    const show = id => ['#ov-intro', '#ov-load', '#ov-err'].forEach(o => { $(o).hidden = o !== id; });
    const setHint = t => { $('#hint').textContent = t; };

    // Size suggestion from the live head measurement (head products with sizes in cm)
    function pickSize(p, cm) {
      let best = null, bestD = 1e9;
      for (const label of p.sizes || []) {
        const r = label.match(/(\d{2})\s*[–-]\s*(\d{2})\s*cm/) || label.match(/(\d{2})\s*cm/);
        if (!r) continue;
        const lo = +r[1], hi = +(r[2] || r[1]);
        const dist = cm < lo ? lo - cm : cm > hi ? cm - hi : 0;
        if (dist < bestD) { bestD = dist; best = label; }
      }
      return best;
    }
    function sizeHint() {
      const p = state.p;
      if (p.zone !== 'head') return '';
      if (!state.headCm) return engine ? `<p class="small muted" id="fit-measure" style="margin:12px 0 0">${icon('sparkle')} Look straight at the camera — we’re measuring your head size…</p>` : '';
      const sug = pickSize(p, state.headCm);
      return `<div class="note" id="fit-measure" style="margin-top:12px;display:grid;gap:8px">
        <span>${icon('sparkle')} Your head is about <b>${state.headCm} cm</b> around${sug ? ` — we suggest <b>${esc(sug)}</b>` : ''}.</span>
        ${sug && sug !== state.size && p.sizes.length > 1 ? `<button class="btn btn-sm" id="use-size" data-s="${esc(sug)}">Use ${esc(sug)}</button>` : ''}
        <span class="small dim">Estimated from the camera (your iris is the ruler). For an exact size, measure with a tape above your ears.</span></div>`;
    }
    function renderCard() {
      const { p, color, size } = state;
      $('#pcard').innerHTML = `
        <div class="pinfo"><div class="th">${productArt(p, color.hex)}</div>
          <div><span class="small dim">${esc(catLabel(p.category))} · ${esc(arLevel(p.zone).label)}</span><h2>${esc(p.name)}</h2>${priceTag(p)}</div></div>
        <hr class="hr">
        ${p.colors?.length ? `<span class="label">Colour · <span style="color:var(--text)">${esc(color.name)}</span></span>
        <div class="opts" id="colors">${p.colors.map((c, i) => `<button class="sw sw-lg ${c.name === color.name ? 'on' : ''}" style="background:${esc(c.hex)}" data-i="${i}" aria-label="${esc(c.name)}" aria-pressed="${c.name === color.name}"></button>`).join('')}</div>` : ''}
        ${p.sizes?.length > 1 ? `<span class="label" style="margin-top:14px">Size</span><div class="opts" id="sizes">${p.sizes.map(s => `<button class="chip ${s === size ? 'on' : ''}" data-s="${esc(s)}">${esc(s)}</button>`).join('')}</div>` : ''}
        ${sizeHint()}
        <div class="buyrow" style="margin-top:16px">
          <button class="btn btn-buy" data-act="buy" data-id="${esc(p.id)}" data-color="${esc(color.name)}" data-size="${esc(size)}">Buy now</button>
          <button class="btn" data-act="add" data-id="${esc(p.id)}" data-color="${esc(color.name)}" data-size="${esc(size)}">${icon('bag')} Add to bag</button>
        </div>`;
      $('#pcard').querySelectorAll('#colors button').forEach(b => b.addEventListener('click', () => {
        state.color = p.colors[+b.dataset.i]; renderCard(); updateGhost();
        if (engine) engine.setColor(state.color.hex);
      }));
      $('#pcard').querySelectorAll('#sizes button').forEach(b => b.addEventListener('click', () => { state.size = b.dataset.s; renderCard(); }));
      $('#pcard').querySelector('#use-size')?.addEventListener('click', e => { state.size = e.currentTarget.dataset.s; renderCard(); toast('Size ' + state.size + ' selected', 'check'); });
      $('#to-product').href = '#p-' + p.id; $('#err-product').href = '#p-' + p.id;
      $('#fit-note').textContent = p.zone === 'feet' ? 'Feet try-on is a beta preview — it follows your ankles, heels and toes.' : p.zone === 'body' ? 'Jackets are a live preview of colour and style, not an exact drape.' : 'Nudge the size or height if it sits a little off.';
    }
    function updateGhost() { $('#ghost').innerHTML = productArt(state.p, state.color.hex); }
    function renderRail() {
      const list = S.products().filter(x => x.zone === state.zone);
      $('#rail').innerHTML = list.map(x => `<button class="mini ${x.id === state.p.id ? 'on' : ''}" data-id="${esc(x.id)}" aria-pressed="${x.id === state.p.id}">
        <span class="a">${productArt(x)}</span><b>${esc(x.name)}</b><span class="price">${money(x.price)}</span></button>`).join('') || '<p class="muted small">No products here yet.</p>';
      $('#rail').querySelectorAll('.mini').forEach(b => b.addEventListener('click', () => switchProduct(b.dataset.id)));
    }
    async function switchProduct(id) {
      const p = S.product(id); if (!p) return;
      state.p = p; state.color = p.colors?.[0] || state.color; state.size = p.sizes?.[0] || '';
      state.zone = p.zone;
      root.querySelectorAll('#ztabs .chip').forEach(c => c.classList.toggle('on', c.dataset.zone === p.zone));
      renderCard(); renderRail(); updateGhost();
      $('#intro-tip').innerHTML = `${esc(arLevel(p.zone).tip)} We need your camera to place the <b>${esc(p.name)}</b> on you.`;
      document.title = `Try on ${p.name} · RealityStore`;
      if (engine && engine.running) {
        setHint('Loading ' + p.name + '…');
        try { await engine.setProduct(p, state.color.hex); } catch (e) { fail(e); }
      }
    }

    async function start() {
      show('#ov-load'); $('#load-title').textContent = 'Opening your camera…'; $('#load-sub').textContent = 'Your browser will ask for permission — tap Allow.';
      try {
        const { TryOnEngine } = await import('../ar/engine.js');
        engine = new TryOnEngine(stage, {
          onStatus: s => {
            if (s === 'model') { $('#load-title').textContent = 'Loading the try-on model…'; $('#load-sub').textContent = 'This happens once; after that it’s instant.'; }
            if (s === 'live') { show(null); $('#hud').hidden = false; setHint(LOST_HINT[state.p.zone]); renderCard(); }
          },
          onMeasure: ({ headCm }) => {
            if (Math.abs((state.headCm || 0) - headCm) >= 0.5) { state.headCm = headCm; renderCard(); }
          },
          onTrack: (ok, lostMs) => {
            if (ok) {
              setHint(`${state.p.name} · ${state.color.name}`);
              if (!state.tracked.has(state.p.id)) { state.tracked.add(state.p.id); S.track('tryon', state.p.id); }
            } else if (lostMs > 700) setHint(LOST_HINT[state.p.zone]);
          },
        });
        engine.setFit({ scale: +$('#fit-size').value, lift: +$('#fit-lift').value });
        await engine.start(state.p, state.color.hex);
      } catch (e) { fail(e); }
    }
    function fail(e) {
      console.warn('try-on error', e, e && e.cause);
      const code = (e && e.code) || 'model';
      const [t, msg] = ERRORS[code] || ERRORS.model;
      if (engine) { engine.stop(); engine = null; }
      $('#hud').hidden = true;
      $('#err-title').textContent = t; $('#err-text').innerHTML = msg;
      show('#ov-err');
    }
    function stopCam() {
      if (engine) { engine.stop(); engine = null; }
      $('#hud').hidden = true; show('#ov-intro');
      $('#start').innerHTML = icon('camera') + ' Turn camera back on';
    }

    $('#start').addEventListener('click', start);
    $('#retry').addEventListener('click', start);
    $('#stopcam').addEventListener('click', stopCam);
    $('#flip').addEventListener('click', async () => {
      if (!engine) return;
      try { await engine.flipCamera(); setHint(engine.facing === 'user' ? 'Front camera' : 'Back camera'); }
      catch (e) { toast('This device has only one camera', 'camera'); }
    });
    $('#snap').addEventListener('click', () => {
      if (!engine) return;
      let url;
      try { url = engine.snapshot(`${state.p.name} · ${state.color.name}`); } catch (e) { toast('Couldn’t take a snapshot', 'camera'); return; }
      stage.animate?.([{ filter: 'brightness(2)' }, { filter: 'none' }], { duration: 260 });
      const fname = `realitystore-${state.p.id}.jpg`;
      const m = openModal(`<div class="pad" style="display:grid;gap:14px">
        <div class="row between"><h3 style="margin:0">Your look</h3><button class="icon-btn" data-close aria-label="Close">${icon('x')}</button></div>
        <img src="${url}" alt="Snapshot wearing ${esc(state.p.name)}" style="width:100%;border-radius:16px;border:1px solid var(--line)">
        <div class="row" style="justify-content:space-between"><span><b>${esc(state.p.name)}</b> <span class="dim">· ${esc(state.color.name)}</span></span>${priceTag(state.p)}</div>
        <div class="row">
          <button class="btn btn-try" id="m-save">${icon('heart')} Save to my looks</button>
          <a class="btn" href="${url}" download="${fname}">${icon('download')} Download</a>
          ${navigator.share ? `<button class="btn" id="m-share">${icon('share')} Share</button>` : ''}
          <button class="btn btn-buy" data-act="buy" data-id="${esc(state.p.id)}" data-color="${esc(state.color.name)}" data-size="${esc(state.size)}">Buy now</button>
        </div>
        <p class="small dim" style="margin:0">Snapshots stay in your browser unless you share or download them.</p></div>`);
      m.el.querySelector('#m-save').addEventListener('click', e => { S.addLook(url, state.p.id, state.color.name); toast('Saved to My looks', 'heart'); e.currentTarget.disabled = true; });
      m.el.querySelector('#m-share')?.addEventListener('click', async () => {
        try { const blob = await (await fetch(url)).blob(); const file = new File([blob], fname, { type: 'image/jpeg' });
          await navigator.share({ files: [file], title: 'My RealityStore look', text: `Trying on the ${state.p.name}` }); } catch (e) { /* cancelled */ }
      });
      m.el.querySelector('[data-act="buy"]').addEventListener('click', () => m.close());
    });
    root.querySelectorAll('#ztabs .chip').forEach(c => c.addEventListener('click', () => {
      state.zone = c.dataset.zone;
      root.querySelectorAll('#ztabs .chip').forEach(x => x.classList.toggle('on', x === c));
      renderRail();
      const first = S.products().find(x => x.zone === state.zone);
      if (first && state.p.zone !== state.zone) switchProduct(first.id);
    }));
    const fitChange = () => engine && engine.setFit({ scale: +$('#fit-size').value, lift: +$('#fit-lift').value });
    $('#fit-size').addEventListener('input', fitChange); $('#fit-lift').addEventListener('input', fitChange);
    $('#fit-reset').addEventListener('click', () => { $('#fit-size').value = 1; $('#fit-lift').value = 0; fitChange(); });
    const onVis = () => { if (document.hidden && engine) stopCam(); };
    document.addEventListener('visibilitychange', onVis);

    renderCard(); renderRail();
    return () => { document.removeEventListener('visibilitychange', onVis); if (engine) { engine.stop(); engine = null; } };
  },
};
