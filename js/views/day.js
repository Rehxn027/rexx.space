// On this day, for any date of the year: events, births, deaths and observances.
import * as api from '../api.js';
import { html, raw, $, slot, card, qlink } from '../ui.js';

const pad = (n) => String(n).padStart(2, '0');

export function dayView(view, arg) {
  const now = new Date();
  const [mm, dd] = (arg && /^\d{2}-\d{2}$/.test(arg) ? arg : `${pad(now.getMonth() + 1)}-${pad(now.getDate())}`).split('-').map(Number);
  const label = new Date(2000, mm - 1, dd).toLocaleDateString('en', { month: 'long', day: 'numeric' });
  view.innerHTML = html`<section class="section-head">
      <h2>On ${label}</h2>
      <p class="muted">What happened on this day in history: events, people born and died, and observances.</p>
    </section>
    <form class="tool-form" id="dform">
      <label for="dpick">Pick a date</label>
      <input type="date" id="dpick" value="2000-${pad(mm)}-${pad(dd)}">
      <button type="submit">Go</button>
      <a class="ghost btn" href="#/day/${pad(now.getMonth() + 1)}-${pad(now.getDate())}">Today</a>
    </form>
    <div class="grid">
      ${raw(card('⏳ Events', null, { wide: true }))}
      ${raw(card('🎂 Born', null))}
      ${raw(card('🕯️ Died', null))}
      ${raw(card('🎉 Holidays and observances', null, { optional: true }))}
    </div>`;
  $('#dform').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('#dpick').value;
    if (v) location.hash = `#/day/${v.slice(5)}`;
  });
  const [ev, born, died, hol] = view.querySelectorAll('.card .body');
  const d = api.onThisDay(mm, dd);
  const pageLink = (e) => (e.pages?.[0] ? raw(qlink(e.pages[0].titles?.normalized || e.pages[0].title, '→')) : '');
  const sorted = (xs) => (xs || []).slice().sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
  slot(ev, d, (x) => x.events?.length && html`<ul class="timeline">${sorted(x.events).map((e) => raw(html`<li><span class="yr">${e.year}</span><p>${e.text} ${pageLink(e)}</p></li>`))}</ul>`);
  const people = (xs) => html`<ul class="list">${sorted(xs).slice(-40).reverse().map((e) => raw(html`<li><b>${e.year}</b> · ${e.text} ${pageLink(e)}</li>`))}</ul>`;
  slot(born, d, (x) => x.births?.length && people(x.births));
  slot(died, d, (x) => x.deaths?.length && people(x.deaths));
  slot(hol, d, (x) => x.holidays?.length && html`<ul class="list">${x.holidays.map((e) => raw(html`<li>${e.text} ${pageLink(e)}</li>`))}</ul>`);
}
