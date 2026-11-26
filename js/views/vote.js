// Results & voting (#vote): most-wanted leaderboard, category race, "what would you pay?", suggestions, launch email.
// Every number here comes from the store (S.voteTotals etc.) — nothing is invented. Re-renders live on S.on('votes').
import * as S from '../store.js';
import { esc, money, icon, productArt, catLabel, ZONE_ICON, wantBtn, pct, plural, launchForm, bindLaunchForm, toast } from '../ui.js';
import { CATEGORIES } from '../data.js';

const catOrder = id => CATEGORIES.findIndex(c => c.id === id);
const sum = o => Object.values(o || {}).reduce((a, b) => a + (b || 0), 0);

// ---------------- stats strip ----------------
function statsHTML() {
  const t = S.voteTotals(), mine = S.myVotes();
  const myCount0 = mine.want.length + (mine.category ? 1 : 0) + Object.keys(mine.price || {}).length;
  const people = Math.max(t.people || 0, myCount0 ? 1 : 0); // you count, even before the server answers
  const wants = S.products().reduce((n, p) => n + S.wantCount(p.id), 0);
  const cats = sum(S.categoryVotes());
  const myCount = mine.want.length + (mine.category ? 1 : 0) + Object.keys(mine.price || {}).length;
  return `<ul class="stats">
    <li class="glass"><span class="s-ico">${icon('user')}</span><span><b>${people ? people.toLocaleString('en-US') : '0'}</b><span>${people === 1 ? 'person has voted' : 'people have voted'}</span></span></li>
    <li class="glass"><span class="s-ico">${icon('heart')}</span><span><b>${wants.toLocaleString('en-US')}</b><span>“I want this” votes</span></span></li>
    <li class="glass"><span class="s-ico">${icon('grid')}</span><span><b>${cats.toLocaleString('en-US')}</b><span>category picks</span></span></li>
    <li class="glass mine"><span class="s-ico">${icon('check')}</span><span><b>${myCount}</b><span>${myCount === 1 ? 'vote from you' : 'votes from you'}</span></span></li>
  </ul>
  ${!people && !wants && !cats ? `<p class="note first">${icon('sparkle')}<span><b>No votes yet — be the first to vote.</b> Try something on, tap “I want this”, and your vote shows up here straight away.</span></p>` : ''}`;
}

// ---------------- leaderboard ----------------
function leaderboardHTML() {
  const list = S.products();
  if (!list.length) return `<div class="glass empty">${icon('cube')}<h3>No test products yet</h3><p class="muted">The line-up is being set up. Check back soon.</p></div>`;
  const total = list.reduce((n, p) => n + S.wantCount(p.id), 0);
  const ranked = [...list].sort((a, b) => S.wantCount(b.id) - S.wantCount(a.id) || catOrder(a.category) - catOrder(b.category));
  let rank = 0, prev = -1;
  const lead = ranked.length && S.wantCount(ranked[0].id);
  const soleLeader = lead > 0 && (ranked.length < 2 || S.wantCount(ranked[1].id) < lead);
  return `<ol class="lb">${ranked.map((p, i) => {
    const n = S.wantCount(p.id), sh = pct(n, total);
    if (n !== prev) { rank = i + 1; prev = n; }
    const top = soleLeader && i === 0;
    return `<li class="glass lb-row ${top ? 'top' : ''} ${S.wantsIt(p.id) ? 'mine' : ''}">
      <span class="rank ${n ? '' : 'none'}" aria-label="${n ? `Rank ${rank}` : 'No votes yet'}">${n ? rank : '–'}</span>
      <a class="thumb" href="#p-${esc(p.id)}" aria-label="${esc(p.name)}">${productArt(p)}</a>
      <div class="lb-main">
        <div class="lb-title">
          <a class="lb-name" href="#p-${esc(p.id)}">${esc(p.name)}</a>
          ${top ? `<span class="badge lead-b">${icon('star')} Most wanted</span>` : ''}
        </div>
        <span class="lb-sub">${icon(ZONE_ICON[p.zone] || 'sparkle')}${esc(catLabel(p.category))} · Expected ${money(p.price)}</span>
        <div class="lb-bar"><span class="bar" role="img" aria-label="${sh}% of “I want this” votes"><i style="width:${sh}%"></i></span>
          <span class="lb-n"><b>${sh}%</b> ${n ? `· ${plural(n, 'person wants', 'people want')} this` : '· no votes yet'}</span></div>
      </div>
      <div class="lb-acts">
        <a class="btn btn-try btn-sm" href="#tryon-${esc(p.id)}" aria-label="Try on ${esc(p.name)}">${icon('camera')} Try on</a>
        ${wantBtn(p)}
      </div>
    </li>`;
  }).join('')}</ol>`;
}

// ---------------- category race ----------------
function raceHTML() {
  const cv = S.categoryVotes(), mine = S.myCategory();
  const total = CATEGORIES.reduce((n, c) => n + (cv[c.id] || 0), 0);
  const max = Math.max(0, ...CATEGORIES.map(c => cv[c.id] || 0));
  return `<div class="glass race">
    <ul class="race-list">${CATEGORIES.map(c => {
      const n = cv[c.id] || 0, sh = pct(n, total), on = mine === c.id, lead = n > 0 && n === max && CATEGORIES.filter(x => (cv[x.id] || 0) === max).length === 1;
      return `<li class="race-row ${on ? 'on' : ''}">
        <span class="r-ico">${icon(ZONE_ICON[c.zone] || 'sparkle')}</span>
        <div class="r-main">
          <div class="r-top"><b>${esc(c.label)}</b>${lead ? `<span class="badge lead-b">Leading</span>` : ''}<span class="r-n"><b>${sh}%</b> · ${plural(n, 'vote')}</span></div>
          <span class="bar" role="img" aria-label="${esc(c.label)}: ${sh}% of category votes"><i style="width:${sh}%"></i></span>
        </div>
        <button type="button" class="btn btn-sm r-pick ${on ? 'on' : ''}" data-cat="${esc(c.id)}" aria-pressed="${on}" aria-label="${on ? 'Your pick' : 'Pick'}: ${esc(c.label)}">${on ? `${icon('check')} Your pick` : 'Pick this'}</button>
      </li>`;
    }).join('')}</ul>
    <p class="small muted race-foot">${mine ? `You picked <b>${esc(catLabel(mine))}</b>. Change your mind any time — one pick per person.` : total ? 'Pick one to add your vote. One pick per person.' : 'No picks yet — be the first. One pick per person.'}</p>
  </div>`;
}

// ---------------- what would you pay ----------------
function payHTML() {
  return `<div class="pay">${S.products().map(p => {
    const choices = S.priceChoices(p), mine = S.myPrice(p.id), st = S.priceStats(p.id);
    return `<article class="glass pay-card">
      <div class="pay-head">
        <a class="thumb" href="#p-${esc(p.id)}" aria-label="${esc(p.name)}">${productArt(p)}</a>
        <div><span class="pay-cat">${esc(catLabel(p.category))}</span><a class="pay-name" href="#p-${esc(p.id)}">${esc(p.name)}</a>
          <span class="pay-exp">Expected price <b>${money(p.price)}</b></span></div>
      </div>
      <div class="pay-chips" role="group" aria-label="What would you pay for ${esc(p.name)}?">
        ${choices.map(v => `<button type="button" class="chip ${mine === v ? 'on' : ''}" data-pay="${esc(p.id)}" data-v="${v}" aria-pressed="${mine === v}">${mine === v ? icon('check') : ''}${money(v)}</button>`).join('')}
      </div>
      <p class="pay-stat small">${st && st.n > 0
        ? `${icon('chart')}<span>Average answer <b>${money(st.avg)}</b> from ${plural(st.n, 'person', 'people')}</span>`
        : `<span class="dim">No answers yet${mine ? '' : ' — yours will be the first'}.</span>`}${mine ? `<span class="you">You said ${money(mine)}</span>` : ''}</p>
    </article>`;
  }).join('')}</div>`;
}

// ---------------- suggestion form ----------------
function suggestHTML() {
  return `<form class="glass pad suggest" id="suggest-form" novalidate>
    <span class="eyebrow">Your ideas</span>
    <h2 id="suggest">What else should we stock?</h2>
    <p class="muted">Tell us a product, brand, colour or style you’d like to try on next. Name and email are optional.</p>
    <div class="field"><label for="sg-cat">Category</label>
      <select class="input" id="sg-cat" name="category">
        ${CATEGORIES.map(c => `<option value="${esc(c.id)}">${esc(c.label)}</option>`).join('')}
        <option value="other">Something else</option>
      </select></div>
    <div class="field"><label for="sg-msg">Your suggestion</label>
      <textarea class="input" id="sg-msg" name="message" maxlength="1000" placeholder="e.g. A black leather cap, or kids’ sunglasses" required></textarea>
      <span class="err" id="sg-err" aria-live="polite"></span></div>
    <div class="two">
      <div class="field"><label for="sg-name">Name <span class="dim">(optional)</span></label><input class="input" id="sg-name" name="name" autocomplete="name" maxlength="80"></div>
      <div class="field"><label for="sg-email">Email <span class="dim">(optional)</span></label><input class="input" id="sg-email" name="email" type="email" inputmode="email" autocomplete="email" maxlength="120"></div>
    </div>
    <button class="btn btn-buy btn-block" type="submit">${icon('sparkle')} Send suggestion</button>
  </form>`;
}
function suggestDone(cat) {
  return `<div class="glass pad suggest done" id="suggest-form" tabindex="-1">
    <span class="done-ico">${icon('check')}</span>
    <h2 id="suggest">Thanks — got it</h2>
    <p class="muted">Your ${cat === 'other' ? '' : esc(catLabel(cat).toLowerCase()) + ' '}idea is with the RealityStore team. Popular requests go into the next test line-up.</p>
    <button class="btn" type="button" data-again>${icon('plus')} Suggest something else</button>
  </div>`;
}

const CSS = `<style>
.v-vote{overflow-x:clip}
.v-vote .head{position:relative;padding:4px 0 6px}
.v-vote .head .orb{width:520px;height:420px;right:-200px;top:-200px;filter:none;opacity:1;background:radial-gradient(closest-side,rgba(143,184,160,.32),rgba(143,184,160,0))}
.v-vote .breadcrumbs .here{color:var(--mist)}
.v-vote h1{font-size:clamp(30px,4vw,46px);margin:0 0 8px}
.v-vote .lede{max-width:64ch;color:var(--mist);margin:0}
.v-vote .lede b{color:var(--text);font-weight:600}
.v-vote .head .row{margin-top:18px}
.v-vote section.sec{margin-top:clamp(30px,4vw,50px)}
.v-vote .stats{list-style:none;margin:22px 0 0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.v-vote .stats li{display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:18px}
.v-vote .stats li>span:last-child{display:flex;flex-direction:column;line-height:1.25;font-size:13px;color:var(--mist)}
.v-vote .stats b{font:800 24px/1.1 var(--f-display);color:var(--violet)}
.v-vote .s-ico{flex:none;width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:rgba(47,93,70,.09);border:1px solid rgba(47,93,70,.2)}
.v-vote .s-ico .ico{color:var(--violet)}
.v-vote .stats li.mine .s-ico{background:var(--gloss-violet);border-color:transparent}
.v-vote .stats li.mine .s-ico .ico{color:#fff}
.v-vote .note.first{display:flex;gap:10px;align-items:flex-start;margin:12px 0 0}
.v-vote .note.first .ico{color:var(--violet);margin-top:1px}

.v-vote .lb{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.v-vote .lb-row{display:grid;grid-template-columns:40px 72px minmax(0,1fr) auto;gap:16px;align-items:center;padding:12px 16px 12px 12px;border-radius:18px}
.v-vote .lb-row.top{border-color:rgba(47,93,70,.4)}
.v-vote .lb-row.mine{background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(232,239,232,.8))}
.v-vote .rank{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font:800 17px var(--f-display);color:#fff;background:var(--gloss-violet);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 6px 14px rgba(47,93,70,.22)}
.v-vote .rank.none{background:rgba(47,93,70,.08);color:var(--dim);box-shadow:none;border:1px solid var(--line)}
.v-vote .thumb{width:72px;height:72px;border-radius:14px;overflow:hidden;display:grid;place-items:center;background:radial-gradient(circle at 50% 38%,#FFFFFF,#E2EBE2)}
.v-vote .thumb svg{width:84%;height:84%}
.v-vote .lb-main{display:grid;gap:5px}
.v-vote .lb-title{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.v-vote .lb-name{font:600 16px var(--f-display);color:var(--text)}
.v-vote .lead-b{display:inline-flex;align-items:center;gap:4px;background:var(--gloss-violet);color:#fff;border-color:transparent}
.v-vote .lead-b .ico{width:12px;height:12px}
.v-vote .lb-sub{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--dim)}
.v-vote .lb-sub .ico{width:14px;height:14px;color:var(--violet-hi)}
.v-vote .lb-bar{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center}
.v-vote .lb-n{font-size:13px;color:var(--mist);white-space:nowrap}
.v-vote .lb-n b,.v-vote .r-n b{font:700 15px var(--f-display);color:var(--violet)}
.v-vote .lb-acts{display:flex;gap:8px}

.v-vote .two-col{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr);gap:18px;align-items:start}
.v-vote .race{padding:10px 18px 16px;border-radius:20px}
.v-vote .race-list{list-style:none;margin:0;padding:0}
.v-vote .race-row{display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:14px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line)}
.v-vote .r-ico{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:rgba(47,93,70,.09);border:1px solid rgba(47,93,70,.2)}
.v-vote .r-ico .ico{color:var(--violet)}
.v-vote .race-row.on .r-ico{background:var(--gloss-violet);border-color:transparent}
.v-vote .race-row.on .r-ico .ico{color:#fff}
.v-vote .r-main{display:grid;gap:7px}
.v-vote .r-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.v-vote .r-top>b{font:600 15px var(--f-display)}
.v-vote .r-n{margin-left:auto;font-size:13px;color:var(--mist);white-space:nowrap}
.v-vote .r-pick{min-width:112px;color:var(--violet);border-color:rgba(47,93,70,.42)}
.v-vote .r-pick.on{color:#fff;background:var(--gloss-violet);border-color:rgba(255,255,255,.35)}
.v-vote .r-pick .ico{width:15px;height:15px}
.v-vote .race-foot{margin:12px 0 0}
.v-vote .why{padding:22px;border-radius:20px}
.v-vote .why ul{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:10px}
.v-vote .why li{display:flex;gap:10px;align-items:flex-start;color:var(--mist);font-size:15px}
.v-vote .why li .ico{flex:none;width:20px;height:20px;padding:3px;border-radius:50%;background:var(--gloss-violet);color:#fff;stroke-width:2.6;margin-top:1px}

.v-vote .pay{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.v-vote .pay-card{padding:14px;border-radius:18px;display:grid;gap:12px;align-content:start}
.v-vote .pay-head{display:grid;grid-template-columns:60px minmax(0,1fr);gap:12px;align-items:center}
.v-vote .pay-head .thumb{width:60px;height:60px;border-radius:12px}
.v-vote .pay-head>div{display:flex;flex-direction:column;line-height:1.3}
.v-vote .pay-cat{font:600 11px var(--f-body);color:var(--dim);text-transform:uppercase;letter-spacing:.05em}
.v-vote .pay-name{font:600 15px var(--f-display);color:var(--text)}
.v-vote .pay-exp{font-size:13px;color:var(--mist)}
.v-vote .pay-exp b{color:var(--violet);font-family:var(--f-display)}
.v-vote .pay-chips{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.v-vote .pay-chips .chip{justify-content:center;cursor:pointer;min-height:40px;font-size:14px}
.v-vote .pay-chips .chip .ico{width:14px;height:14px;stroke-width:2.6}
.v-vote .pay-stat{display:flex;align-items:center;gap:6px 10px;flex-wrap:wrap;margin:0;color:var(--mist)}
.v-vote .pay-stat>.ico{width:15px;height:15px;color:var(--violet-hi)}
.v-vote .pay-stat b{color:var(--text)}
.v-vote .pay-stat .you{margin-left:auto;font-weight:600;color:var(--violet)}

.v-vote .bottom{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:18px;align-items:start}
.v-vote .suggest{border-radius:22px}
.v-vote .suggest h2,.v-vote .launch h2{font-size:clamp(24px,2.8vw,32px)}
.v-vote .suggest .two{display:grid;grid-template-columns:1fr 1fr;gap:0 12px}
.v-vote .suggest.done{text-align:center;padding-block:40px}
.v-vote .done-ico{width:56px;height:56px;border-radius:50%;margin:0 auto 14px;display:grid;place-items:center;background:var(--gloss-violet)}
.v-vote .done-ico .ico{width:28px;height:28px;color:#fff;stroke-width:2.6}
.v-vote .suggest.done p{max-width:44ch;margin:0 auto 18px}
.v-vote .launch{border-radius:22px;background:radial-gradient(360px 260px at 90% 0%,rgba(143,184,160,.34),rgba(143,184,160,0) 70%),linear-gradient(160deg,#FFFFFF,var(--sage))}
.v-vote .sec-head h2{margin:0}

@media(max-width:1100px){
  .v-vote .pay{grid-template-columns:repeat(2,minmax(0,1fr))}
  .v-vote .stats{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media(max-width:900px){
  .v-vote .two-col,.v-vote .bottom{grid-template-columns:minmax(0,1fr)}
  .v-vote .lb-row{grid-template-columns:36px 64px minmax(0,1fr);gap:12px}
  .v-vote .lb-acts{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr}
  .v-vote .lb-acts .btn{width:100%}
  .v-vote .rank{width:36px;height:36px;font-size:15px}
  .v-vote .thumb{width:64px;height:64px}
}
@media(max-width:620px){
  .v-vote .pay{grid-template-columns:minmax(0,1fr)}
  .v-vote .pay-chips{grid-template-columns:repeat(4,minmax(0,1fr))}
  .v-vote .pay-chips .chip{padding:0 4px;font-size:12.5px}
  .v-vote .pay-chips .chip .ico{display:none}
  .v-vote .stats{gap:10px}
  .v-vote .stats li{padding:12px;gap:10px}
  .v-vote .s-ico{width:36px;height:36px;border-radius:10px}
  .v-vote .s-ico .ico{width:18px;height:18px}
  .v-vote .stats b{font-size:20px}
  .v-vote .lb-row{padding:12px;grid-template-columns:30px 56px minmax(0,1fr);gap:10px}
  .v-vote .rank{width:30px;height:30px;font-size:14px}
  .v-vote .thumb{width:56px;height:56px;border-radius:12px}
  .v-vote .lb-name{font-size:15px;line-height:1.25}
  .v-vote .lb-bar{grid-template-columns:minmax(0,1fr)}
  .v-vote .lb-n{white-space:normal}
  .v-vote .race{padding:4px 14px 14px}
  .v-vote .race-row{grid-template-columns:34px minmax(0,1fr);gap:10px}
  .v-vote .r-ico{width:34px;height:34px;border-radius:10px}
  .v-vote .r-ico .ico{width:18px;height:18px}
  .v-vote .r-pick{grid-column:1/-1;width:100%}
  .v-vote .r-n{margin-left:0;width:100%}
  .v-vote .suggest .two{grid-template-columns:minmax(0,1fr)}
  .v-vote .head .row .btn{flex:1 1 auto}
}
</style>`;

export default {
  title: 'Results & voting',
  render() {
    return `<div class="v-vote">${CSS}
      <section class="wrap">
        <header class="head">
          <div class="orb"></div>
          <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="#home">Home</a><span aria-hidden="true">/</span><span class="here" aria-current="page">Results &amp; voting</span></nav>
          <span class="eyebrow">Live results</span>
          <h1>Results &amp; voting</h1>
          <p class="lede"><b>We’re testing before we stock.</b> Try them on and vote — the most-wanted products are the ones we’ll bring to the store. These numbers update as people vote.</p>
          <div class="row"><a class="btn btn-try" href="#tryon">${icon('camera')} Start trying on</a><a class="btn" href="#shop">${icon('grid')} See the line-up</a></div>
          <div id="v-stats" aria-live="polite">${statsHTML()}</div>
        </header>

        <section class="sec" aria-labelledby="h-lb">
          <div class="sec-head"><div><span class="eyebrow">I want this</span><h2 id="h-lb">Most wanted</h2></div>
            <p>Ranked by “I want this” votes. Percentages are each product’s share of all those votes.</p></div>
          <div id="v-lb">${leaderboardHTML()}</div>
        </section>

        <section class="sec" aria-labelledby="h-race">
          <div class="sec-head"><div><span class="eyebrow">Category race</span><h2 id="h-race">Which category should we launch first?</h2></div></div>
          <div class="two-col">
            <div id="v-race">${raceHTML()}</div>
            <aside class="glass why">
              <h3>How we use your votes</h3>
              <ul>
                <li>${icon('check')}<span>The winning category is the first one we buy stock for.</span></li>
                <li>${icon('check')}<span>The most-wanted products get ordered first.</span></li>
                <li>${icon('check')}<span>Your “what would you pay?” answers help set the launch price.</span></li>
                <li>${icon('check')}<span>Votes are anonymous — no account, no camera images stored.</span></li>
              </ul>
            </aside>
          </div>
        </section>

        <section class="sec" aria-labelledby="h-pay">
          <div class="sec-head"><div><span class="eyebrow">Price check</span><h2 id="h-pay">What would you pay?</h2></div>
            <p>Expected prices may change after the vote. Tap what you’d honestly pay for each piece.</p></div>
          <div id="v-pay">${payHTML()}</div>
        </section>

        <section class="sec bottom" aria-label="Suggestions and launch updates">
          <div id="v-suggest">${suggestHTML()}</div>
          <div class="glass pad launch">
            <span class="eyebrow">Not open yet</span>
            <h2>Tell me when it launches</h2>
            <p class="muted">One email when the winning products are in stock. We won’t share your address.</p>
            ${launchForm('vote-notify')}
          </div>
        </section>
      </section>
    </div>`;
  },
  mount(root) {
    const $ = s => root.querySelector(s);
    // keep keyboard focus on the same control after a live re-render
    const focusKey = () => {
      const a = document.activeElement; if (!a || !root.contains(a)) return null;
      if (a.dataset.cat) return `[data-cat="${a.dataset.cat}"]`;
      if (a.dataset.pay) return `[data-pay="${a.dataset.pay}"][data-v="${a.dataset.v}"]`;
      if (a.dataset.act === 'want') return `#v-lb [data-act="want"][data-id="${a.dataset.id}"]`;
      return null;
    };
    const rerender = () => {
      const fk = focusKey();
      $('#v-stats').innerHTML = statsHTML();
      $('#v-lb').innerHTML = leaderboardHTML();
      $('#v-race').innerHTML = raceHTML();
      $('#v-pay').innerHTML = payHTML();
      if (fk) root.querySelector(fk)?.focus({ preventScroll: true });
    };
    const off = S.on(k => { if (k === 'votes') rerender(); });

    const onClick = e => {
      const c = e.target.closest('[data-cat]');
      if (c) {
        if (S.myCategory() !== c.dataset.cat) { S.voteCategory(c.dataset.cat); toast(`Your pick: ${catLabel(c.dataset.cat)}`, 'check'); }
        return;
      }
      const pb = e.target.closest('[data-pay]');
      if (pb) {
        const v = Number(pb.dataset.v);
        if (S.myPrice(pb.dataset.pay) !== v) { S.votePrice(pb.dataset.pay, v); toast(`Thanks — you’d pay ${money(v)}`, 'check'); }
        return;
      }
      if (e.target.closest('[data-again]')) {
        $('#v-suggest').innerHTML = suggestHTML(); bindSuggest(); $('#sg-msg').focus();
      }
    };
    root.addEventListener('click', onClick);

    const bindSuggest = () => {
      const f = $('#suggest-form'); if (!f || f.tagName !== 'FORM') return;
      f.addEventListener('submit', async e => {
        e.preventDefault();
        const err = $('#sg-err');
        const message = f.message.value.trim(), category = f.category.value;
        const name = f.name.value.trim(), email = f.email.value.trim();
        err.textContent = ''; f.message.classList.remove('bad'); f.email.classList.remove('bad');
        if (message.length < 3) { err.textContent = 'Tell us what you’d like us to stock.'; f.message.classList.add('bad'); f.message.focus(); return; }
        if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = 'That email doesn’t look right — or leave it empty.'; f.email.classList.add('bad'); f.email.focus(); return; }
        const btn = f.querySelector('button[type="submit"]'); btn.disabled = true;
        try {
          const data = { message, category };
          if (name) data.name = name;
          if (email) data.email = email;
          if (S.api.ok) await S.sendMessage('suggestion', data);
          $('#v-suggest').innerHTML = suggestDone(category);
          $('#suggest-form').focus({ preventScroll: true });
        } catch (ex) {
          err.textContent = 'That didn’t send — please try again. (' + ex.message + ')';
          btn.disabled = false;
        }
      });
    };
    bindSuggest();
    const offLaunch = bindLaunchForm(root);

    // arriving from "Suggest a product" on the Try & vote page
    if (S.session.voteFocus === 'suggest') {
      S.session.voteFocus = null;
      requestAnimationFrame(() => setTimeout(() => $('#v-suggest')?.scrollIntoView({ block: 'start' }), 30));
    }
    return () => { off(); offLaunch(); root.removeEventListener('click', onClick); };
  },
};
