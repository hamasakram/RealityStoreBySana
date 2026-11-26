// Information pages: how it works, camera & privacy, FAQ, delivery & returns, contact, about, terms.
import * as S from '../store.js';
import { esc, money, icon, toast } from '../ui.js';

const contactLog = []; // kept for this page; also sent to the store's database

const PV_LINE = 'We’re testing before we stock. Try them on and vote — the most-wanted products are the ones we’ll bring to the store.';
const BASE_PAGES = [
  { id: 'how-it-works', nav: 'How try-on works', ic: 'camera', eyebrow: 'Try-On Studio', title: 'How live try-on works',
    lede: 'Your camera becomes a mirror. RealityStore finds your face, hands or body in the picture and places the product on you as you move — all inside your browser.' },
  { id: 'privacy', nav: 'Camera & privacy', ic: 'shield', eyebrow: 'Your camera, your call', title: 'Camera & privacy',
    lede: 'Try-on needs your camera, so here is exactly what happens to the picture — and what does not.' },
  { id: 'faq', nav: 'FAQ', ic: 'sparkle', eyebrow: 'Help centre', title: 'Frequently asked questions',
    lede: 'Quick answers about try-on, sizing, delivery, returns and paying.' },
  { id: 'returns', nav: 'Delivery & returns', ic: 'truck', eyebrow: 'Help centre', title: 'Delivery & returns',
    lede: 'Fast delivery across Pakistan, and a simple 7-day return if something is not right.' },
  { id: 'contact', nav: 'Contact us', ic: 'mail', eyebrow: 'Help centre', title: 'Contact us',
    lede: 'A question about an order, a size or the try-on? Send us a message.' },
  { id: 'about', nav: 'About RealityStore', ic: 'cube', eyebrow: 'The idea', title: 'About RealityStore',
    lede: 'An online store built around one simple promise: try it on before you buy it.' },
  { id: 'terms', nav: 'Terms', ic: 'lock', eyebrow: 'The small print', title: 'Terms of use',
    lede: 'The basic rules for using the store, in plain language.' },
];
// Preview mode: nothing ships yet, so the delivery page becomes the launch page (same #returns route).
const PV_OVERRIDES = {
  'how-it-works': { lede: 'Your camera becomes a mirror. RealityStore finds your face, hands or body and places the product on you as you move — then you tell us if you want it.' },
  faq: { lede: 'Quick answers about the test, voting, try-on and when the store opens.' },
  returns: { nav: 'When we launch', ic: 'star', eyebrow: 'Public test', title: 'When will RealityStore launch?',
    lede: 'Not yet — and on purpose. ' + PV_LINE },
  contact: { lede: 'A question about the test, a product or the try-on? Send us a message.' },
};
const pages = () => S.isPreview() ? BASE_PAGES.map(p => ({ ...p, ...(PV_OVERRIDES[p.id] || {}) })) : BASE_PAGES;

const CSS = `<style>
.v-info .i-band{padding-top:clamp(26px,4vw,48px)}
.v-info .i-hero{padding:clamp(24px,4vw,46px);overflow:hidden}
.v-info .i-hero{background:linear-gradient(120deg,rgba(255,255,255,.96) 0%,rgba(255,255,255,.82) 55%,rgba(232,239,232,.9) 100%)}
.v-info .i-hero .orb.a{width:380px;height:380px;right:-120px;top:-190px;background:radial-gradient(circle,rgba(143,184,160,.55),rgba(232,239,232,0) 70%);filter:blur(28px);opacity:.9}
.v-info .i-hero .orb.b{width:260px;height:260px;left:34%;bottom:-180px;background:radial-gradient(circle,rgba(232,239,232,1),rgba(232,239,232,0) 70%);filter:blur(24px);opacity:.9}
.v-info .i-hero .ic-big{width:58px;height:58px;border-radius:18px;display:grid;place-items:center;background:var(--gloss-violet);margin-bottom:16px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.55),0 10px 26px rgba(47,93,70,0.275)}
.v-info .i-hero .ic-big{color:#fff}
.v-info .i-hero .ic-big .ico{width:28px;height:28px;color:#fff}
.v-info .i-hero h1{font-size:clamp(30px,4.4vw,50px);margin-bottom:10px}
.v-info .i-hero p{max-width:62ch;font-size:17px;margin:0}
.v-info .i-layout{display:grid;grid-template-columns:240px minmax(0,1fr);gap:24px;align-items:start;margin-top:24px}
.v-info .i-nav{padding:10px;position:sticky;top:90px}
.v-info .i-nav h4{font:600 13px var(--f-body);color:var(--mist);margin:6px 12px 8px}
.v-info .i-nav a{display:flex;align-items:center;gap:12px;min-height:44px;padding:0 12px;border-radius:12px;color:var(--mist);font:600 15px var(--f-body)}
.v-info .i-nav a:hover{color:var(--text);background:rgba(47,93,70,0.045)}
.v-info .i-nav a[aria-current="page"] .ico{color:var(--violet)}
.v-info .i-nav a[aria-current="page"]{color:var(--violet-lo);background:rgba(47,93,70,0.143);box-shadow:inset 0 0 0 1px rgba(47,93,70,0.27)}
.v-info .i-main{display:grid;gap:18px}
.v-info .i-main h2{font-size:clamp(22px,2.6vw,28px)}
.v-info .i-main p,.v-info .i-main li{color:var(--mist)}
.v-info .i-main ul.ticks{list-style:none;padding:0;margin:0;display:grid;gap:12px}
.v-info .i-main ul.ticks li{display:flex;gap:12px;align-items:flex-start}
.v-info .i-main ul.ticks li .ico{color:var(--violet-hi);margin-top:2px}
.v-info .i-main ul.ticks b,.v-info .i-main p b{color:var(--text)}
.v-info .steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.v-info .step{padding:18px}
.v-info .step .n{font:800 13px var(--f-display);color:var(--violet-hi);display:block;margin-bottom:10px}
.v-info .step .ic{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;background:rgba(47,93,70,0.099);border:1px solid rgba(47,93,70,0.21);color:var(--violet-hi);margin-bottom:12px}
.v-info .step h3{font-size:17px}
.v-info .step p{margin:0;font-size:15px}
.v-info .cards2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.v-info .cards3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.v-info .mini{padding:18px;border-radius:16px;border:1px solid var(--line);background:rgba(47,93,70,0.032)}
.v-info .mini h3{display:flex;gap:10px;align-items:center;font-size:17px}
.v-info .mini h3 .ico{color:var(--violet-hi)}
.v-info .mini p:last-child,.v-info .mini ol:last-child{margin-bottom:0}
.v-info ol.how{margin:0;padding-left:20px;display:grid;gap:6px;color:var(--mist)}
.v-info .tbl td:first-child{white-space:nowrap}
.v-info .lvl{display:inline-block;padding:3px 9px;border-radius:999px;font:700 12px var(--f-body);border:1px solid var(--line-2);background:rgba(47,93,70,0.054);white-space:nowrap}
.v-info .lvl.l3{background:rgba(47,93,70,0.165);border-color:rgba(47,93,70,0.33)}
.v-info .lvl.l2{background:rgba(47,93,70,0.088);border-color:rgba(47,93,70,0.24)}
.v-info .cta{display:flex;gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap}
.v-info .cta h2{margin:0 0 4px}
.v-info .cta p{margin:0}
.v-info .faq-list details.faq:last-child{border-bottom:0}
.v-info .faq-list summary{min-height:44px;align-items:center}
.v-info .faq-list details.faq p{margin:0 0 16px;max-width:70ch}
.v-info .contact{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:18px;align-items:start}
.v-info .two{display:grid;grid-template-columns:1fr 1fr;gap:0 14px}
.v-info .cdet{display:grid;gap:14px}
.v-info .cdet .r{display:flex;gap:12px;align-items:flex-start}
.v-info .cdet .r .ic{width:42px;height:42px;flex:none;border-radius:12px;display:grid;place-items:center;background:rgba(47,93,70,0.099);border:1px solid rgba(47,93,70,0.21);color:var(--violet-hi)}
.v-info .cdet .r b{display:block;color:var(--text);overflow-wrap:anywhere}
.v-info .cdet .r span{font-size:14px;color:var(--mist)}
.v-info .sample{display:inline-block;font:700 11px var(--f-body);padding:3px 8px;border-radius:999px;border:1px dashed var(--line-2);color:var(--mist);margin-left:6px;vertical-align:middle}
.v-info .ok-panel{text-align:center;padding:clamp(28px,4vw,48px)}
.v-info .ok-panel .ok-ic{width:64px;height:64px;border-radius:50%;margin:0 auto 14px;display:grid;place-items:center;background:rgba(46,139,87,0.14);border:1px solid rgba(46,139,87,0.5);color:var(--ok)}
.v-info .ok-panel .ok-ic .ico{width:30px;height:30px}
.v-info .ok-panel blockquote{margin:16px auto;max-width:52ch;text-align:left;padding:14px 16px;border-radius:12px;border:1px solid var(--line);background:rgba(47,93,70,0.036);color:var(--mist);white-space:pre-wrap;overflow-wrap:anywhere}
.v-info .brand{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.v-info .brand .sw{width:auto;height:96px;border-radius:14px;border:1px solid var(--line-2);margin-bottom:12px;display:grid;place-items:center}
.v-info .brand .sw .price{font-size:26px}
.v-info .tmpl{display:flex;gap:12px;align-items:flex-start;border-color:rgba(194,65,59,0.45);background:rgba(194,65,59,0.08)}
.v-info .tmpl .ico{color:var(--danger);margin-top:1px}
.v-info .terms h3{margin-top:4px}
.v-info .faq-list summary .q-new{font:700 11px var(--f-body);padding:2px 8px;border-radius:999px;background:rgba(47,93,70,.12);color:var(--violet-lo);margin-left:8px;vertical-align:middle}
.v-info .launch-steps .step.now{border-color:rgba(47,93,70,.45);box-shadow:0 0 0 1px rgba(47,93,70,.25),var(--shadow)}
.v-info .launch-steps .step.now .n{display:inline-flex;gap:6px;align-items:center}
.v-info .launch-steps .step.now .n::after{content:"We are here";font:700 11px var(--f-body);padding:2px 8px;border-radius:999px;background:var(--gloss-violet);color:#fff}
.v-info .nl{display:flex;gap:10px;flex-wrap:wrap}
.v-info .nl .input{flex:1 1 240px}
.v-info .nl .btn{flex:none}
.v-info .terms section+section{border-top:1px solid var(--line);padding-top:18px;margin-top:18px}
@media(max-width:1000px){.v-info .steps{grid-template-columns:repeat(2,minmax(0,1fr))}.v-info .cards3{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:900px){
  .v-info .i-layout{grid-template-columns:minmax(0,1fr);gap:16px;margin-top:16px}
  .v-info .i-nav{position:relative;top:0;display:flex;gap:6px;overflow-x:auto;padding:6px;scrollbar-width:none}
  .v-info .i-nav::-webkit-scrollbar{display:none}
  .v-info .i-nav h4{display:none}
  .v-info .i-nav a{flex:none;white-space:nowrap}
  .v-info .contact{grid-template-columns:minmax(0,1fr)}
}
@media(max-width:600px){
  .v-info .steps,.v-info .cards2,.v-info .cards3,.v-info .brand,.v-info .two{grid-template-columns:minmax(0,1fr)}
  .v-info .cta .btn{width:100%}
  .v-info .i-hero p{font-size:16px}
}
</style>`;

const tick = (b, t) => `<li>${icon('check')}<span>${b ? `<b>${b}</b> ` : ''}${t}</span></li>`;

// ---------------- pages ----------------
function howItWorks() {
  const steps = [
    ['grid', 'Pick something', 'Open any product and tap <b>Try on</b>, or go straight to the Try-On Studio and browse from there.'],
    ['camera', 'Allow the camera', 'Your browser asks once. The video is processed on your phone or computer — it is never uploaded.'],
    ['eye', 'Line up and move', 'Face the camera, raise a hand or step back. The product follows you as you turn and tilt.'],
    S.isPreview() ? ['heart', 'Snap, compare, vote', 'Switch colours live, save a snapshot, then tap <b>I want this</b> and tell us what you would pay.']
      : ['sparkle', 'Snap, compare, buy', 'Switch colours live, save a snapshot to your looks, and add your favourite to the bag.'],
  ];
  return `<section class="glass pad"><h2>Four steps, about ten seconds</h2>
      <p>There is nothing to install. Try-on runs on the web page itself using MediaPipe, Google's on-device tracking models, with the product drawn on top of your camera picture.</p>
      <div class="steps">${steps.map(([ic, h, p], i) => `<div class="glass step"><span class="n">Step ${i + 1}</span><span class="ic">${icon(ic)}</span><h3>${h}</h3><p>${p}</p></div>`).join('')}</div>
    </section>
    <section class="glass pad"><h2>What tracks what</h2>
      <p>Each body part uses a different tracking model. We are upfront about which ones are fully live and which are still a preview.</p>
      <div class="scroll"><table class="tbl"><thead><tr><th>Body part</th><th>Products</th><th>How it's tracked</th><th>Try-on</th></tr></thead><tbody>
        <tr><td><span class="row" style="gap:8px;flex-wrap:nowrap">${icon('head')} Head &amp; face</span></td><td>Hats, caps, sunglasses</td><td>Face landmarks — 478 points mapped across your face, including head tilt and turn</td><td><span class="lvl l3">Live 3D</span></td></tr>
        <tr><td><span class="row" style="gap:8px;flex-wrap:nowrap">${icon('hand')} Hands</span></td><td>Gloves</td><td>21-point hand tracking — every knuckle and fingertip, palm or back</td><td><span class="lvl l3">Live</span></td></tr>
        <tr><td><span class="row" style="gap:8px;flex-wrap:nowrap">${icon('hand')} Nails</span></td><td>Nail paint</td><td>The same hand tracking paints every fingernail — show the back of your hand</td><td><span class="lvl l3">Live</span></td></tr>
        <tr><td><span class="row" style="gap:8px;flex-wrap:nowrap">${icon('shirt')} Body</span></td><td>Jackets</td><td>33-point body pose — shoulders, elbows and hips place and size the jacket</td><td><span class="lvl l2">Live preview</span></td></tr>
        <tr><td><span class="row" style="gap:8px;flex-wrap:nowrap">${icon('shoe')} Feet</span></td><td>Shoes, socks</td><td>Body pose ankles, heels and toes — needs your full body in frame</td><td><span class="lvl">Preview · beta</span></td></tr>
      </tbody></table></div>
      <p class="small dim" style="margin:12px 0 0">Jackets and footwear are flat overlays that follow your pose rather than full 3D garments, so treat them as a guide to colour and style, not exact fit.</p>
    </section>
    <div class="cards2">
      <section class="glass pad"><h2 style="font-size:22px">Works on</h2><ul class="ticks">
        ${tick('Android:', 'recent Chrome or Samsung Internet.')}
        ${tick('iPhone & iPad:', 'Safari on a recent iOS version (Chrome on iPhone works too).')}
        ${tick('Desktop & laptop:', 'Chrome, Edge, Safari or Firefox with a webcam.')}
        ${tick('Secure link:', 'browsers only allow the camera on https pages.')}
      </ul><p class="small dim" style="margin:14px 0 0">Older or low-power phones may run more slowly — the product still shows, it just moves a little behind you.</p></section>
      <section class="glass pad"><h2 style="font-size:22px">Tips for a great fit</h2><ul class="ticks">
        <li>${icon('sun')}<span><b>Face the light.</b> A window in front of you beats a lamp behind you.</span></li>
        <li>${icon('head')}<span><b>Arm's length for hats and glasses</b> — about 40–60 cm, whole face in view.</span></li>
        <li>${icon('hand')}<span><b>Hands up, fingers spread</b> for gloves — and the back of your hand for nail paint — about 30 cm from the lens.</span></li>
        <li>${icon('shirt')}<span><b>Step back 1.5–2 m</b> for jackets, and further for shoes so your feet are in frame.</span></li>
        <li>${icon('flip')}<span><b>Plain background helps</b>, and take off hats before trying another one.</span></li>
      </ul></section>
    </div>
    ${S.isPreview() ? `<p class="note" style="margin:0"><b>Right now RealityStore is a public test.</b> ${PV_LINE}</p>` : ''}
    <section class="glass pad cta"><div><h2>Ready to see it on you?</h2><p>${S.isPreview() ? 'One product per category. Try one on in seconds.' : 'Pick anything from the catalogue and try it in seconds.'}</p></div>
      <a class="btn btn-try btn-lg" href="#tryon">${icon('camera')} Open the Try-On Studio</a></section>`;
}

function privacy() {
  return `<section class="glass pad"><h2>The short version</h2><ul class="ticks">
      ${tick('Processed on your device.', 'The camera picture is analysed inside your browser, on your own phone or computer.')}
      ${tick('Never uploaded, never recorded.', 'No video or images from the camera are sent to RealityStore or anyone else, and nothing is recorded.')}
      ${tick('Off when you leave.', 'The camera turns off as soon as you leave the try-on page or close the tab.')}
      ${tick('Snapshots only when you tap.', 'A picture is saved only when you press the snapshot button — and it is stored in your browser, not on our servers.')}
      ${tick('You stay in control.', 'You can say no, or take back permission at any time in your browser settings.')}
    </ul></section>
    <section class="glass pad"><h2>Why the camera permission?</h2>
      <p>Your browser will not let any website use the camera without asking you first. When you open try-on, it shows a prompt such as “Allow this site to use your camera?”. Tap <b>Allow</b> to try things on. If you tap <b>Block</b>, the rest of the store still works normally — you just won't see the live mirror.</p>
      <p style="margin:0">The tracking models (the part that finds your face, hands and body) are downloaded once with the page and run locally, so they work without sending your picture anywhere.</p>
    </section>
    <section class="glass pad"><h2>Turn camera access on or off</h2>
      <div class="cards2">
        <div class="mini"><h3>${icon('phone')} Chrome on Android</h3><ol class="how">
          <li>Tap the icon to the left of the web address.</li>
          <li>Tap <b>Permissions</b> (or <b>Site settings</b>).</li>
          <li>Set <b>Camera</b> to Allow or Block, then reload.</li></ol>
          <p class="small dim" style="margin:10px 0 0">For all sites: Chrome menu ⋮ → Settings → Site settings → Camera.</p></div>
        <div class="mini"><h3>${icon('phone')} Safari on iPhone</h3><ol class="how">
          <li>Tap <b>aA</b> (or the page menu) in the address bar.</li>
          <li>Tap <b>Website Settings</b>.</li>
          <li>Set <b>Camera</b> to Ask, Allow or Deny, then reload.</li></ol>
          <p class="small dim" style="margin:10px 0 0">For all sites: Settings → Apps → Safari → Camera (on older iOS: Settings → Safari → Camera).</p></div>
      </div>
    </section>
    <section class="glass pad"><h2>What the store keeps</h2>
      <div class="cards2">
        ${S.isPreview() ? `<div class="mini"><h3>${icon('heart')} Your votes</h3><p>Which products you want, your category pick and the prices you’d pay — linked only to a random id made in your browser, not to your name, face or camera.</p></div>`
          : `<div class="mini"><h3>${icon('truck')} To deliver your order</h3><p>Your name, phone, delivery address, what you ordered and how you chose to pay. We need these to get the parcel to you and to handle returns.</p></div>`}
        <div class="mini"><h3>${icon('user')} If you make an account</h3><p>Your name and email, plus your wishlist, orders and saved looks so you can find them again.</p></div>
        <div class="mini"><h3>${icon('chart')} Simple shop counts</h3><p>How often products are viewed, tried on and bought — counted per product, not linked to your face or camera.</p></div>
        <div class="mini"><h3>${icon('x')} What we never keep</h3><p>Camera video, face or body measurements, or card numbers. Card payments are not taken on this site yet.</p></div>
      </div>
      <p class="note" style="margin:16px 0 0">${S.isPreview() ? 'Votes, suggestions, launch sign-ups and contact messages' : 'Orders and contact messages'} are stored securely in RealityStore’s database so we can deliver and reply. Your wishlist, bag, saved looks and account profile stay in your own browser; clearing this site’s data removes them.</p>
    </section>`;
}

const link = (h, t) => `<a href="#${h}" style="color:var(--violet-hi)">${t}</a>`;
// [question, answer, isNew]
const PREVIEW_FAQ = () => [
  ['Can I buy now?', `Not yet — we’re testing. RealityStore shows one product per category so we can learn what people really want before we buy any stock. Try them on, tap <b>I want this</b> on the ones you like, and ${link('vote', 'leave your email on the vote page')} to hear the moment the store opens.`, true],
  ['What happens to my vote?', 'Every “I want this”, category pick and price answer is counted per product. When the test ends, the most-wanted products are the ones we order and bring to the store, and the price answers help us set a fair launch price. The counts you see on each product are the real totals so far.', true],
  ['Is voting anonymous?', 'Yes. Your browser makes a random id the first time you vote and keeps it, so you can change your votes later. No account, name or email is needed. Clearing this site’s data starts you with a new id.', true],
  ['When will RealityStore launch?', `There is no date yet: we open once the votes show what people want and that stock has arrived. ${link('returns', 'Read how the launch works')}.`, true],
  ['Can I suggest something else to stock?', `Please do. The ${link('vote', 'vote page')} has a short “What else should we stock?” box. Your email is optional.`, true],
];
const COMMON_FAQ = () => [
  ['How does the try-on work?', 'When you tap Try on, your browser opens the camera and tracking models find your face, hands or body in each frame. RealityStore then draws the product in the right place, size and angle, so it moves with you. See <a href="#how-it-works" style="color:var(--violet-hi)">How try-on works</a> for the details.'],
  ['Is my camera recorded or uploaded?', 'No. The video is processed on your own device, inside the browser. Nothing from the camera is uploaded or recorded. Snapshots are only saved when you tap the snapshot button, and only in your browser. Read more on <a href="#privacy" style="color:var(--violet-hi)">Camera &amp; privacy</a>.'],
  ['Why does it ask for camera permission?', 'Browsers always ask before a website can use your camera — it is a safety feature. You only need to allow it for the try-on. Everything else in the store works without it.'],
  ['It says the camera is blocked. What do I do?', 'You (or your browser) said no earlier. Open the site settings for this page — the icon next to the web address on Chrome, or aA → Website Settings on Safari — set Camera to Allow and reload. Also close other apps that might be using the camera, like video calls.'],
  ['Which phones and browsers work?', 'Recent Chrome or Samsung Internet on Android, Safari on iPhone and iPad, and Chrome, Edge, Safari or Firefox on a laptop with a webcam. Very old phones may run the try-on slowly.'],
  ['How accurate are the sizes?', 'Try-on is great for judging style, colour and proportion — how wide a frame looks on your face, or how a hat sits. It does not measure you, so please use the size guide on each product page for fit. ' + (S.isPreview() ? '' : ' If the size is wrong, exchanges are easy.')],
  ['Why do jackets and shoes look less detailed?', 'Hats, glasses and gloves are tracked closely in 3D. Jackets are a live preview that follows your shoulders and hips, and shoes and socks are in beta: they need your whole body, including your feet, in the frame. Use them for colour and style rather than exact fit.'],
];
const SHOP_FAQ = () => [
  [`How long does delivery take, and what does it cost?`, `Usually 2–4 working days in major cities and 4–7 elsewhere. Delivery is free on orders over ${money(S.FREE_SHIPPING)}; below that it is a flat ${money(S.SHIPPING_FEE)}.`],
  ['Can I return something?', 'Yes — within 7 days of delivery for unused items with the tags still on. You can also exchange for another size or colour. See <a href="#returns" style="color:var(--violet-hi)">Delivery &amp; returns</a>.'],
  ['How can I pay?', 'Cash on delivery is available across Pakistan — you pay the rider when the parcel arrives. Online payment options are being set up and will be listed at checkout when they are ready.']
];
const FAQ = () => S.isPreview() ? [...PREVIEW_FAQ(), ...COMMON_FAQ()] : [...COMMON_FAQ(), ...SHOP_FAQ()];
function faq() {
  return `<section class="glass pad faq-list">${FAQ().map(([q, a, nw], i) => `<details class="faq" ${i === 0 ? 'open' : ''}><summary><span>${q}${nw ? '<span class="q-new">Test</span>' : ''}</span></summary><p>${a}</p></details>`).join('')}</section>
    <section class="glass pad cta"><div><h2>Still stuck?</h2><p>${S.isPreview() ? 'Send us a message — we read every one.' : 'Send us a message and include your order number if you have one.'}</p></div>
      <a class="btn btn-lg" href="#contact">${icon('mail')} Contact us</a></section>`;
}

function launch() {
  const n = S.products().length;
  const steps = [
    ['camera', 'Test', `${n} products, one per category. You try them on and vote.`, true],
    ['chart', 'Count', 'We add up “I want this” votes, category picks and price answers.'],
    ['bag', 'Stock', 'We order the most-wanted products — and only those.'],
    ['sparkle', 'Open', 'The store opens for orders, and everyone on the list hears first.'],
  ];
  return `<section class="glass pad"><h2>No launch date yet</h2>
      <p>We would rather open late with products people want than open early with stock nobody asked for. The store opens when two things are true: the votes show clearly what people want, and that stock has arrived.</p>
      <p style="margin:0">Until then, nothing can be bought on RealityStore — there is no checkout, no payment and no delivery.</p></section>
    <section class="glass pad"><h2>How the launch works</h2>
      <div class="steps launch-steps">${steps.map(([ic, h, p, now], i) => `<div class="glass step ${now ? 'now' : ''}"><span class="n">Step ${i + 1}</span><span class="ic">${icon(ic)}</span><h3>${h}</h3><p>${p}</p></div>`).join('')}</div>
    </section>
    <section class="glass pad" id="launch-news"><h2>Hear when it opens</h2>
      <p>Leave your email and we’ll send one message when the store opens. That’s all we use it for.</p>
      <form class="nl" id="launch-form" novalidate>
        <label class="sr-only" for="ln-email">Email</label>
        <input class="input" id="ln-email" name="email" type="email" autocomplete="email" inputmode="email" placeholder="you@example.com">
        <button class="btn btn-try" type="submit">${icon('mail')} Tell me at launch</button>
      </form>
      <span class="err" id="ln-err" role="alert"></span>
    </section>
    <div class="cards2">
      <section class="glass pad"><h2 style="font-size:22px">Delivery &amp; returns</h2><p style="margin:0">Delivery areas, fees and the returns policy will be published here before the first sale. Nothing is promised until then.</p></section>
      <section class="glass pad"><h2 style="font-size:22px">Help decide</h2><p>Your votes decide which products open the store.</p>
        <div class="row"><a class="btn btn-try" href="#tryon">${icon('camera')} Try them on</a><a class="btn" href="#vote">${icon('chart')} Vote</a></div></section>
    </div>`;
}

function returns() {
  const free = `<span class="price" style="font-size:inherit">${money(S.FREE_SHIPPING)}</span>`;
  const fee = `<span class="price" style="font-size:inherit">${money(S.SHIPPING_FEE)}</span>`;
  return `<div class="cards3">
      <div class="glass pad"><span class="eyebrow">${icon('truck')}</span><h3>2–4 working days</h3><p style="margin:0">Karachi, Lahore, Islamabad, Rawalpindi and other major cities. 4–7 days elsewhere.</p></div>
      <div class="glass pad"><span class="eyebrow">${icon('bag')}</span><h3>Free over ${free}</h3><p style="margin:0">Smaller orders have a flat ${fee} delivery fee, shown before you pay.</p></div>
      <div class="glass pad"><span class="eyebrow">${icon('refresh')}</span><h3>7-day returns</h3><p style="margin:0">Changed your mind? Send unused items back within 7 days of delivery.</p></div>
    </div>
    <section class="glass pad"><h2>Delivery</h2><ul class="ticks">
      ${tick('Order confirmation', 'straight away on screen, and your order appears under My account → Orders.')}
      ${tick('Packed within 1 working day', 'for orders placed before 3 pm, Monday to Saturday.')}
      ${tick('Cash on delivery', 'available everywhere we deliver — please keep the exact amount ready if you can.')}
      ${tick('Not home?', 'The courier usually calls ahead and tries again the next working day.')}
    </ul></section>
    <section class="glass pad"><h2>Returns &amp; exchanges</h2>
      <div class="cards2">
        <div class="mini"><h3>${icon('check')} Can be returned</h3><p>Unused items in their original condition, with tags and packaging, within 7 days of delivery. Refunds go back the way you paid, or to a bank account or mobile wallet for cash-on-delivery orders.</p></div>
        <div class="mini"><h3>${icon('x')} Cannot be returned</h3><p>Worn, washed or damaged items, and socks once opened, for hygiene reasons — unless they arrived faulty.</p></div>
        <div class="mini"><h3>${icon('refresh')} Exchanges</h3><p>Wrong size or colour? Ask for an exchange and we send the new one once the original is on its way back, subject to stock.</p></div>
        <div class="mini"><h3>${icon('shield')} Faulty or wrong item</h3><p>Tell us within 48 hours with a photo. We collect it and replace or refund it at no cost to you.</p></div>
      </div>
    </section>
    <section class="glass pad"><h2>How to start a return</h2>
      <div class="steps">
        <div class="glass step"><span class="n">Step 1</span><span class="ic">${icon('bag')}</span><h3>Find your order</h3><p>Your order number is under <a href="#orders" style="color:var(--violet-hi)">My account → Orders</a>.</p></div>
        <div class="glass step"><span class="n">Step 2</span><span class="ic">${icon('mail')}</span><h3>Message us</h3><p>Use the <a href="#contact" style="color:var(--violet-hi)">contact form</a> with the order number and what you'd like to return.</p></div>
        <div class="glass step"><span class="n">Step 3</span><span class="ic">${icon('download')}</span><h3>Pack it up</h3><p>Put the item back in its packaging with the tags on.</p></div>
        <div class="glass step"><span class="n">Step 4</span><span class="ic">${icon('truck')}</span><h3>We collect it</h3><p>A courier picks it up, and your refund or exchange follows once it's checked.</p></div>
      </div>
    </section>`;
}

function contact() {
  return `<div class="contact">
    <div id="contact-box">${contactForm()}</div>
    <aside class="glass pad cdet">
      <h3 style="margin:0">Other ways to reach us <span class="sample">Sample details</span></h3>
      <div class="r"><span class="ic">${icon('mail')}</span><div><b>hello@realitystorebysana.vercel.app</b><span>Replies within one working day</span></div></div>
      <div class="r"><span class="ic">${icon('phone')}</span><div><b>+92 300 0000000</b><span>Mon–Sat, 10 am – 7 pm PKT</span></div></div>
      <div class="r"><span class="ic">${icon('pin')}</span><div><b>Online only</b><span>We deliver across Pakistan</span></div></div>
      <p class="note" style="margin:4px 0 0">Sample contact details — replace them with the store's real email and phone before launch.</p>
      <a class="btn" href="#faq">${icon('sparkle')} Check the FAQ first</a>
    </aside>
  </div>`;
}
function contactForm() {
  return `<form class="glass pad" id="contact-form" novalidate>
    <h2 style="font-size:24px">Send a message</h2>
    <p class="muted" style="margin-bottom:20px">Fields marked optional can be left empty.</p>
    <div class="two">
      <div class="field"><label for="c-name">Your name</label><input class="input" id="c-name" name="name" autocomplete="name"><span class="err" data-err="name"></span></div>
      <div class="field"><label for="c-email">Email</label><input class="input" id="c-email" name="email" type="email" autocomplete="email" inputmode="email"><span class="err" data-err="email"></span></div>
    </div>
    <div class="field" ${S.isPreview() ? 'hidden' : ''}><label for="c-order">Order number <span class="dim">(optional)</span></label><input class="input" id="c-order" name="order" placeholder="e.g. RS7K2M9QXA" autocapitalize="characters"><span class="err" data-err="order"></span></div>
    <div class="field"><label for="c-msg">Message</label><textarea class="input" id="c-msg" name="message" rows="5" placeholder="How can we help?"></textarea><span class="err" data-err="message"></span></div>
    <button class="btn btn-try btn-lg" type="submit">${icon('mail')} Send message</button>
  </form>`;
}
function contactDone(m) {
  return `<div class="glass ok-panel" tabindex="-1" id="contact-ok">
    <div class="ok-ic">${icon('check')}</div>
    <h2 style="font-size:26px">Thanks, ${esc(m.name.split(' ')[0])} — message received</h2>
    <p class="muted" style="max-width:52ch;margin:0 auto">Your message has reached the RealityStore team. We’ll reply to your email.</p>
    <blockquote>${m.order ? `<b style="color:var(--text)">Order #${esc(m.order)}</b>\n` : ''}${esc(m.message)}</blockquote>
    <button class="btn" data-info="again">${icon('edit')} Send another message</button>
  </div>`;
}

function about() {
  return `<section class="glass pad"><h2>What RealityStore is</h2>
      <p>RealityStore is an online accessories and outerwear store — hats, sunglasses, jackets, gloves, nail paint, shoes and socks — where every product can be tried on live through your phone or laptop camera before you buy it.</p>
      <p style="margin:0">The camera becomes a mirror, and the product appears on you, moving as you move.</p>
      ${S.isPreview() ? `<p class="note" style="margin:14px 0 0"><b>Right now we’re in a public test.</b> ${PV_LINE}</p>` : ''}</section>
    <section class="glass pad"><h2>Why try-on?</h2>
      <p>Buying accessories online is mostly guesswork. Will these frames be too wide? Does this colour work with my skin tone? Is a bucket hat really me? Photos on a model don't answer that.</p>
      <ul class="ticks">
        ${tick('Less guesswork.', 'See the shape, scale and colour on your own face and body.')}
        ${tick('Fewer returns.', 'When you know what you are getting, fewer parcels come back — better for you and for the planet.')}
        ${tick('More fun.', 'Flick through colours, snap a look, compare it with another. Shopping that feels like a fitting room.')}
      </ul></section>
    <section class="glass pad"><h2>Three colours, one idea</h2>
      <p>The whole store is built from three colours, each with a single job.</p>
      <div class="brand">
        <div><div class="sw" style="background:var(--ink)"></div><h3>Soft Cream</h3><p class="small" style="margin:0">The background. Warm and calm, so the products stand out.</p></div>
        <div><div class="sw" style="background:var(--sage)"></div><h3>Light Sage Mist</h3><p class="small" style="margin:0">The surfaces — cards, panels and product plinths.</p></div>
        <div><div class="sw" style="background:var(--gloss-violet)"></div><h3>Forest Sage</h3><p class="small" style="margin:0">Every action: try-on, vote and send buttons, counts and active states.</p></div>
      </div></section>
    <section class="glass pad"><h2>A note on honesty</h2>
      <p>${S.isPreview() ? 'This is a public test, not a shop yet. Prices are expected prices and may change after the vote. The vote counts you see are real totals, and there are no customer reviews or press quotes because we have not earned any yet.' : 'This is a working store in development. The products, prices and ratings you see are sample data, and there are no customer reviews or press quotes on this site because we have not earned any yet.'}</p>
      <p style="margin:0">What is real: the try-on runs live on your device, and your camera picture never leaves it.</p></section>
    <section class="glass pad cta"><div><h2>See it for yourself</h2><p>Try on a hat in under ten seconds.</p></div>
      <a class="btn btn-try btn-lg" href="#tryon">${icon('camera')} Open the Try-On Studio</a></section>`;
}

function terms() {
  const sec = (h, p) => `<section><h3>${h}</h3><p style="margin:0">${p}</p></section>`;
  return `<p class="note tmpl" style="margin:0">${icon('lock')}<span><b style="color:var(--text)">Template — not legal advice.</b> These terms are a plain-language placeholder for a store in development. They must be reviewed and completed by a qualified lawyer before RealityStore takes real orders.</span></p>
    <section class="glass pad terms">
      ${sec('1. Who we are', 'RealityStore is an online store selling accessories and outerwear in Pakistan. Full business name, address and registration details will be added here before launch.')}
      ${sec('2. Using the store', 'You can browse, try products on with your camera and place orders. Please use the site lawfully and do not try to disrupt it or misuse other people’s details.')}
      ${sec('3. Products and prices', 'Prices are in Pakistani rupees (PKR) and include applicable taxes unless stated. We try to show colours accurately, but screens and cameras vary. If a price is clearly wrong, we will contact you before sending the order.')}
      ${sec('4. Virtual try-on', 'Try-on is a visual guide to style and colour, not a measurement. It does not guarantee fit, so please check the size information for each product. The camera feed is processed on your device as described on the Camera &amp; privacy page.')}
      ${sec('5. Orders and payment', 'An order is confirmed when you receive an order number. Cash on delivery is paid to the courier on arrival. We may cancel an order if an item is out of stock, in which case any payment is refunded in full.')}
      ${sec('6. Delivery, returns and refunds', 'Delivery times, fees and the 7-day return policy are set out on the Delivery &amp; returns page and form part of these terms. Your legal rights as a consumer are not affected.')}
      ${sec('7. Accounts', 'You are responsible for the details you give us. Account profiles are currently stored in your own browser.')}
      ${sec('8. Liability', 'To be completed by a lawyer: limits of liability, as allowed under applicable Pakistani consumer protection law.')}
      ${sec('9. Changes and contact', 'We may update these terms; the date below will change when we do. Questions? Use the contact page.')}
      <p class="small dim" style="margin:18px 0 0">Template last edited: November 2026.</p>
    </section>`;
}

const BODY = { 'how-it-works': howItWorks, privacy, faq, returns: () => (S.isPreview() ? launch() : returns()), contact, about, terms };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

export default {
  title: param => pages().find(p => p.id === param)?.nav || 'Help',
  render(param) {
    const PAGES = pages();
    const pg = PAGES.find(p => p.id === param) || PAGES[0];
    return `<div class="v-info">${CSS}<section class="wrap i-band">
      <header class="glass i-hero"><span class="orb a"></span><span class="orb b"></span>
        <span class="ic-big">${icon(pg.ic)}</span>
        <span class="eyebrow">${pg.eyebrow}</span>
        <h1>${pg.title}</h1>
        <p class="muted">${pg.lede}</p>
      </header>
      <div class="i-layout">
        <nav class="glass i-nav" aria-label="Help and information"><h4>Help &amp; info</h4>
          ${PAGES.map(p => `<a href="#${p.id}" ${p.id === pg.id ? 'aria-current="page"' : ''}>${icon(p.ic)} ${p.nav}</a>`).join('')}
        </nav>
        <div class="i-main">${BODY[pg.id]()}</div>
      </div>
    </section></div>`;
  },
  mount(root, param) {
    if (param === 'returns' && S.isPreview()) {
      const onSub = e => {
        if (e.target.id !== 'launch-form') return;
        e.preventDefault();
        const f = e.target, v = f.email.value.trim(), err = root.querySelector('#ln-err');
        if (!EMAIL_RE.test(v)) { err.textContent = 'Please enter a valid email.'; f.email.classList.add('bad'); f.email.focus(); return; }
        err.textContent = ''; f.email.classList.remove('bad');
        const btn = f.querySelector('button'); btn.disabled = true;
        const done = () => { f.outerHTML = `<p class="note" style="margin:0"><b>You’re on the list.</b> We’ll email ${esc(v)} once, when the store opens.</p>`; };
        S.sendMessage('newsletter', { email: v }).then(done)
          .catch(ex => { btn.disabled = false; toast(ex.message === 'offline' ? 'You seem to be offline — please try again in a moment' : ex.message, 'mail'); });
      };
      root.addEventListener('submit', onSub);
      return () => root.removeEventListener('submit', onSub);
    }
    if (param !== 'contact') return;
    const box = () => root.querySelector('#contact-box');
    const onSubmit = e => {
      if (e.target.id !== 'contact-form') return;
      e.preventDefault();
      const f = e.target;
      const v = k => f[k].value.trim();
      const errs = {
        name: v('name').length < 2 ? 'Please tell us your name.' : '',
        email: !v('email') ? 'Please enter your email so we could reply.' : !EMAIL_RE.test(v('email')) ? 'That email doesn’t look right.' : '',
        order: v('order') && !/^[A-Za-z0-9-]{4,20}$/.test(v('order')) ? 'Order numbers are letters and digits, like RS7K2M9QXA.' : '',
        message: v('message').length < 10 ? 'Please write a little more (10+ characters).' : '',
      };
      Object.entries(errs).forEach(([k, m]) => {
        f.querySelector(`[data-err="${k}"]`).textContent = m;
        f[k].classList.toggle('bad', !!m); f[k].setAttribute('aria-invalid', m ? 'true' : 'false');
      });
      if (Object.values(errs).some(Boolean)) { f.querySelector('.bad')?.focus(); return; }
      const m = { name: v('name'), email: v('email'), order: v('order').toUpperCase().replace(/^#/, ''), message: v('message'), date: new Date().toISOString() };
      contactLog.push(m);
      const btn = f.querySelector('[type=submit]'); btn.disabled = true;
      S.sendMessage('contact', { name: m.name, email: m.email, order: m.order, message: m.message })
        .then(() => { box().innerHTML = contactDone(m); root.querySelector('#contact-ok')?.focus(); })
        .catch(err => { btn.disabled = false; toast(err.message === 'offline' ? 'You seem to be offline — please try again in a moment' : err.message, 'mail'); });
    };
    const onClick = e => {
      if (e.target.closest('[data-info="again"]')) { box().innerHTML = contactForm(); root.querySelector('#c-name')?.focus(); }
    };
    root.addEventListener('submit', onSubmit);
    root.addEventListener('click', onClick);
    return () => { root.removeEventListener('submit', onSubmit); root.removeEventListener('click', onClick); };
  },
};
