// Ask: question → gather sources → Claude answers with numbered citations back to those sources.
import * as api from '../api.js';
import { getKey, setKey, forgetKey, gatherSources, answer, explainError } from '../ask.js';
import { html, raw, esc, $, toast, miniMarkdown } from '../ui.js';
import { toInternal } from '../links.js';

const history = []; // this visit's questions and answers

/**
 * Build the answer HTML from the final message: text blocks plus citation markers.
 * Citations point at a provided source (document_index) or a web page Claude found (url);
 * web pages are appended to the source list as they are first cited.
 */
function renderAnswer(msg, sources) {
  let body = '';
  const used = new Set();
  const all = [...sources];
  const indexOf = (c) => {
    if (c.url) {
      let i = all.findIndex((x) => x.url === c.url);
      if (i < 0) { all.push({ kind: 'Web page', title: c.title || c.url, url: c.url }); i = all.length - 1; }
      return i;
    }
    return c.document_index ?? null;
  };
  for (const block of msg.content) {
    if (block.type !== 'text') continue;
    body += block.text;
    const nums = [...new Set((block.citations || []).map(indexOf).filter((n) => n != null))];
    for (const n of nums) used.add(n);
    if (nums.length) body += nums.map((n) => `${n}`).join('');
  }
  const htmlBody = miniMarkdown(body).replace(/(\d+)/g, (_, n) => {
    const s = all[Number(n)];
    return s ? `<sup><a href="#src-${Number(n) + 1}" class="cite-ref" title="${esc(s.title)}">${Number(n) + 1}</a></sup>` : '';
  });
  return { htmlBody, used, all };
}

function sourcesHTML(sources, used) {
  return html`<ol class="sources">${sources.map((s, i) => raw(html`<li id="src-${i + 1}" class="${used.has(i) ? 'used' : ''}">
    <a href="${toInternal(s.url) || s.url}">${s.title}</a> <span class="meta">${s.kind}${used.has(i) ? ' · cited' : ''}</span></li>`))}</ol>`;
}

export function askView(view, arg) {
  const preset = decodeURIComponent(arg || '');
  if (api.DEMO) {
    view.innerHTML = html`<section class="section-head"><h2>Ask</h2></section>
      <div class="grid"><article class="card wide"><h3>💬 Ask a question</h3><div class="body"><p class="muted live-note">Ask sends your question and the sources it finds to Claude over the internet, so it isn't part of this demo. In the full app you add your own Anthropic API key and ask anything; answers cite Wikipedia articles and research papers.</p></div></article></div>`;
    return;
  }
  const hasKey = !!getKey();
  view.innerHTML = html`<section class="section-head">
      <h2>Ask</h2>
      <p class="muted">Ask a question in any language. rexx finds relevant Wikipedia articles and research papers, then Claude writes an answer that cites them, so you can check every claim.</p>
    </section>
    <div class="grid ask-grid">
      <article class="card wide">
        <h3>💬 Your question</h3>
        <div class="body">
          <form id="aform" class="ask-form">
            <label class="sr-only" for="aq">Question</label>
            <textarea id="aq" rows="3" placeholder="e.g. Why did the Mughal Empire decline? · How do mRNA vaccines work? · What caused the 2008 financial crisis?">${preset}</textarea>
            <label class="check web-check"><input type="checkbox" id="aweb"> Also search the live web (for recent events; about 1 US cent per search)</label>
            <div class="ask-row"><button type="submit" id="ago" ${hasKey ? '' : 'disabled'}>Ask</button><button type="button" class="ghost" id="astop" hidden>Stop</button><span class="meta" id="astatus"></span></div>
          </form>
          <div id="aout"></div>
        </div>
      </article>
      <article class="card wide" id="keycard">
        <h3>🔑 Your Anthropic API key</h3>
        <div class="body" id="keybody"></div>
      </article>
    </div>`;

  const keyBody = $('#keybody');
  const drawKey = () => {
    const k = getKey();
    if (k) {
      keyBody.innerHTML = html`<p>A key ending in <code>…${k.slice(-4)}</code> is set. It is sent only to Anthropic (api.anthropic.com) when you ask a question.</p>
        <button type="button" class="ghost" id="kforget">Remove key from this device</button>`;
      $('#kforget').addEventListener('click', () => { forgetKey(); $('#ago').disabled = true; drawKey(); toast('Key removed.'); });
    } else {
      keyBody.innerHTML = html`<p>Answers are written by Claude, Anthropic's AI model, using your own API key. Create one in the <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener" data-external="1">Claude Console ↗</a>. Each question usually costs a few US cents, billed to your Anthropic account.</p>
        <form id="kform" class="tool-form">
          <label class="sr-only" for="kin">API key</label>
          <input id="kin" type="password" placeholder="sk-ant-…" autocomplete="off" spellcheck="false">
          <label class="check"><input type="checkbox" id="krem"> Remember on this device</label>
          <button type="submit">Use this key</button>
        </form>
        <p class="meta">Your key stays in this browser and goes only to Anthropic. rexx.space has no server and never sees it. Only remember it on a device you trust; anyone using this browser profile could use it.</p>`;
      $('#kform').addEventListener('submit', (e) => {
        e.preventDefault();
        const v = $('#kin').value.trim();
        if (!/^sk-ant-/.test(v)) { toast('That doesn\'t look like an Anthropic API key. Keys start with sk-ant-.'); return; }
        setKey(v, $('#krem').checked);
        $('#ago').disabled = false;
        drawKey();
        toast('Key set. Ask away.');
      });
    }
  };
  drawKey();

  const out = $('#aout'), status = $('#astatus'), stopBtn = $('#astop'), go = $('#ago'), web = $('#aweb');
  try { web.checked = localStorage.getItem('rexx-ask-web') === '1'; } catch { /* ignore */ }
  web.addEventListener('change', () => { try { localStorage.setItem('rexx-ask-web', web.checked ? '1' : '0'); } catch { /* ignore */ } });
  const drawHistory = () => {
    out.innerHTML = history.map((h) => html`<section class="answer">
      <p class="q-line">${h.q}</p>
      <div class="answer-body">${raw(h.answerHTML)}</div>
      ${h.sources.length ? raw(html`<details class="src-list" open><summary>Sources (${h.sources.length})</summary>${raw(h.sourcesHTML)}</details>`) : ''}
    </section>`).reverse().join('');
  };
  drawHistory();

  let ctrl = null;
  stopBtn.addEventListener('click', () => ctrl?.abort());
  $('#aform').addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = $('#aq').value.trim();
    if (!q || !getKey()) return;
    if (!navigator.onLine) { toast('Asking needs a connection.'); return; }
    go.disabled = true; stopBtn.hidden = false;
    const live = document.createElement('section');
    live.className = 'answer';
    live.innerHTML = html`<p class="q-line">${q}</p><div class="answer-body streaming"></div>`;
    out.prepend(live);
    const body = live.querySelector('.answer-body');
    let sources = [];
    ctrl = new AbortController();
    try {
      sources = await gatherSources(q, (m) => { status.textContent = m; });
      status.textContent = sources.length ? `Reading ${sources.length} sources…` : 'No sources found; answering from general knowledge…';
      let text = '';
      let pending = false;
      const msg = await answer(q, sources, (delta) => {
        text += delta;
        if (!pending) { pending = true; requestAnimationFrame(() => { body.innerHTML = miniMarkdown(text); pending = false; }); }
        status.textContent = 'Writing…';
      }, ctrl.signal, { webSearch: web.checked });
      if (msg.stop_reason === 'refusal') {
        body.innerHTML = '<p class="muted">Claude declined to answer this question. Try rephrasing it.</p>';
        history.push({ q, answerHTML: body.innerHTML, sources: [], sourcesHTML: '' });
      } else {
        const { htmlBody, used, all } = renderAnswer(msg, sources);
        const note = msg.stop_reason === 'max_tokens' ? '<p class="meta">The answer was cut off because it reached the length limit.</p>' : '';
        history.push({ q, answerHTML: htmlBody + note, sources: all, sourcesHTML: sourcesHTML(all, used) });
      }
      status.textContent = '';
      drawHistory();
    } catch (err) {
      body.classList.remove('streaming');
      body.innerHTML = html`<p class="error-text">${await explainError(err)}</p>`;
      status.textContent = '';
    } finally {
      go.disabled = !getKey(); stopBtn.hidden = true; ctrl = null;
    }
  });

  if (preset && hasKey) $('#aform').requestSubmit();
}
