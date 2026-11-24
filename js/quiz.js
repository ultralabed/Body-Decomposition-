// Quiz mode: "what is this?" (4 choices) and "find it" (tap the model).

import * as THREE from '../vendor/three.module.min.js';
import { app, refresh, focusParts, frameBox, boxOfParts, viewDir, setExtraLabels } from './core.js';
import { SYS_ZH } from './catalog.js';

const ASK = new THREE.Color('#ffd23f');
const GOOD = new THREE.Color('#3ddc97');
const BAD = new THREE.Color('#ff6b6b');

const SCOPES = [
  { id: 'm1', zh: '淺層肌肉', test: (p) => p.sys === 'muscle' && p.layer === 1 },
  { id: 'mall', zh: '全部肌肉', test: (p) => p.sys === 'muscle' },
  { id: 'bone', zh: '骨骼', test: (p) => p.sys === 'bone' && !/tooth/.test(p.key) },
  { id: 'organ', zh: '內臟血管', test: (p) => p.sys === 'organ' || (p.sys === 'vessel' && !/coronary|papillary|cardiac|ventricle/.test(p.key)) },
];
const AREAS = [
  { id: 'all', zh: '全身', regions: null },
  { id: 'upper', zh: '上肢', regions: ['shoulder', 'arm', 'forearm', 'hand'] },
  { id: 'lower', zh: '下肢', regions: ['hip', 'thigh', 'leg', 'foot'] },
  { id: 'trunk', zh: '軀幹', regions: ['chest', 'abdomen', 'back', 'pelvis'] },
  { id: 'head', zh: '頭頸', regions: ['head', 'neck'] },
];
const KINDS = [{ id: 'name', zh: '看圖選名字' }, { id: 'find', zh: '在模型上找' }, { id: 'mix', zh: '混合' }];

const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function createQuiz(api) {
  const cfg = api.store.get('quizCfg', { scope: 'm1', area: 'all', kind: 'mix', n: 10 });
  let st = { phase: 'setup' };

  const scope = () => SCOPES.find((s) => s.id === cfg.scope) || SCOPES[0];
  const area = () => AREAS.find((a) => a.id === cfg.area) || AREAS[0];

  function pool() {
    const sc = scope(), ar = area();
    const keys = new Map();
    for (const p of app.parts) {
      if (!sc.test(p)) continue;
      if (ar.regions && !ar.regions.includes(p.region)) continue;
      if (!keys.has(p.key) || p.side === 'R') keys.set(p.key, p);
    }
    return [...keys.values()];
  }

  function start() {
    const all = pool();
    if (all.length < 4) { api.toast('這個範圍的題目太少，換一個範圍試試'); return; }
    api.enter();
    st = { phase: 'run', i: 0, score: 0, wrong: [], order: shuffle(all.slice()).slice(0, Math.min(cfg.n, all.length)), all };
    const box = boxOfParts(all);
    frameBox(box.isEmpty() ? app.bounds : box, viewDir('front'), { pad: 1.05 });
    next();
  }

  function next() {
    if (st.i >= st.order.length) return finish();
    const target = st.order[st.i];
    const canFind = (target.sys === 'muscle' && target.layer === 1) || target.sys === 'bone';
    const kind = cfg.kind === 'mix' ? (canFind && Math.random() < 0.45 ? 'find' : 'name') : cfg.kind === 'find' && canFind ? 'find' : 'name';
    const q = { target, kind, answered: false, tapped: null };
    if (kind === 'name') {
      const same = st.all.filter((p) => p.key !== target.key);
      const near = shuffle(same.filter((p) => p.region === target.region));
      const far = shuffle(same.filter((p) => p.region !== target.region));
      q.choices = shuffle([target, ...near.concat(far).slice(0, 3)]);
    }
    st.q = q;
    applyOverlay();
    if (kind === 'name') focusParts([target], api.outwardDir([target]), { pad: 2.1 });
    api.rerender();
  }

  function applyOverlay() {
    const q = st.q; if (!q) return;
    const t = q.target;
    const softT = t.sys === 'muscle' || t.sys === 'tendon';
    app.state.overlay = (p) => {
      const soft = p.sys === 'muscle' || p.sys === 'tendon', hard = p.sys === 'bone' || p.sys === 'joint';
      if (q.kind === 'find') {
        if (q.answered && p.key === t.key) return { visible: true, opacity: 1, tint: GOOD };
        if (q.answered && q.tapped && p === q.tapped && p.key !== t.key) return { visible: true, opacity: 1, tint: BAD };
        if (p.sys === 'skin') return { visible: false };
        if (softT) return soft ? { visible: true, opacity: 1, pickable: !q.answered } : hard ? { visible: true, opacity: 1, pickable: false } : { visible: false };
        return hard ? { visible: true, opacity: 1, pickable: !q.answered && p.sys === 'bone' } : { visible: false };
      }
      if (p.key === t.key && (p === t || !t.side)) return { visible: true, opacity: 1, tint: q.answered ? GOOD : ASK, pickable: false };
      if (p.sys === 'skin') return { visible: false };
      if (softT) return soft ? { visible: true, opacity: 0.07, pickable: false } : hard ? { visible: true, opacity: 1, pickable: false } : { visible: false };
      if (t.sys === 'bone') return hard ? { visible: true, opacity: 0.2, pickable: false } : { visible: false };
      return p.sys === t.sys ? { visible: true, opacity: 0.16, pickable: false } : hard ? { visible: true, opacity: 0.12, pickable: false } : { visible: false };
    };
    setExtraLabels(q.answered ? [{ part: t, text: t.zh, cls: 'good' }] : []);
    refresh();
  }

  function answer(correct, tapped) {
    const q = st.q; if (!q || q.answered) return;
    q.answered = true; q.correct = correct; q.tapped = tapped || null;
    if (correct) st.score++; else st.wrong.push(q.target);
    applyOverlay();
    if (q.kind === 'find') focusParts([q.target], api.outwardDir([q.target]), { pad: 2.2 });
    api.rerender();
  }

  function finish() {
    st.phase = 'done';
    const id = `${cfg.scope}.${cfg.area}`;
    const best = api.store.get('quizBest', {});
    const pct = Math.round((st.score / st.order.length) * 100);
    st.pct = pct; st.isBest = !(id in best) || pct > best[id];
    if (st.isBest) { best[id] = pct; api.store.set('quizBest', best); }
    app.state.overlay = null; setExtraLabels([]); refresh();
    api.rerender();
  }

  function html() {
    const seg = (name, list, cur) => `<div class="seg" style="margin-bottom:8px">${list.map((o) => `<button data-act="quiz-set" data-k="${name}" data-v="${o.id}" aria-pressed="${o.id === cur}">${o.zh}</button>`).join('')}</div>`;
    if (st.phase === 'setup') {
      const best = api.store.get('quizBest', {})[`${cfg.scope}.${cfg.area}`];
      return `<p class="hint">選好範圍就開始。答錯沒關係，答完會告訴你正確答案在哪裡。</p>
        <div class="h3">考什麼</div>${seg('scope', SCOPES, cfg.scope)}
        <div class="h3">哪個部位</div>${seg('area', AREAS, cfg.area)}
        <div class="h3">怎麼考</div>${seg('kind', KINDS, cfg.kind)}
        <div class="h3">幾題</div>${seg('n', [5, 10, 20].map((n) => ({ id: n, zh: n + ' 題' })), cfg.n)}
        <p class="hint" style="margin-top:10px">這個範圍共有 ${pool().length} 個構造${best !== undefined ? `　·　你的最高紀錄 ${best} 分` : ''}</p>
        <button class="btn primary wide" data-act="quiz-start">開始測驗</button>`;
    }
    if (st.phase === 'done') {
      return `<div class="score-big">${st.pct} 分</div>
        <div class="score-sub">答對 ${st.score} / ${st.order.length} 題${st.isBest ? '　·　新紀錄！' : ''}</div>
        ${st.wrong.length ? `<div class="h3">答錯的再看一次（點一下就會帶你去看）</div><div class="chips" style="margin-bottom:14px">${st.wrong.map((p) => `<button class="chip" data-act="quiz-review" data-key="${esc(p.key)}">${esc(p.info.zh)}</button>`).join('')}</div>` : '<p class="hint" style="text-align:center">全部答對，太厲害了！</p>'}
        <div class="grid2"><button class="btn primary" data-act="quiz-start">再考一次</button><button class="btn" data-act="quiz-exit">換範圍</button></div>`;
    }
    const q = st.q, t = q.target;
    const head = `<div class="quiz-bar"><span>第 ${st.i + 1} / ${st.order.length} 題</span><div class="bar"><i style="width:${(st.i / st.order.length) * 100}%"></i></div><span>答對 ${st.score}</span></div>`;
    const after = q.answered ? `<div class="feedback ${q.correct ? 'good' : 'bad'}">${q.correct ? '答對了！' : `答案是「${esc(t.zh)}」`}</div>
      ${t.info.kid ? `<div class="kid">${esc(t.info.kid)}</div>` : ''}
      <button class="btn primary wide" data-act="quiz-next">${st.i + 1 >= st.order.length ? '看成績' : '下一題'}</button>` : '';
    if (q.kind === 'find') {
      return `${head}<div class="quiz-q">請在模型上點出：${esc(t.info.zh)}<small>${esc(t.key)}　·　可以轉動、放大模型來找（左右邊都算對）</small></div>
        ${q.answered ? after : '<button class="btn wide" data-act="quiz-skip">不知道，看答案</button>'}`;
    }
    return `${head}<div class="quiz-q">黃色亮起來的是什麼？<small>${SYS_ZH[t.sys] || ''}</small></div>
      ${q.choices.map((c) => {
        const cls = q.answered ? (c.key === t.key ? 'right' : c === q.tapped ? 'wrong' : '') : '';
        return `<button class="choice ${cls}" data-act="quiz-pick" data-key="${esc(c.key)}" ${q.answered ? 'disabled' : ''}><b>${esc(c.info.zh)}</b><small>${esc(c.key)}</small></button>`;
      }).join('')}${after}`;
  }

  function act(name, el) {
    if (name === 'quiz-set') {
      const v = el.dataset.v;
      cfg[el.dataset.k] = el.dataset.k === 'n' ? Number(v) : v;
      api.store.set('quizCfg', cfg); api.rerender();
    } else if (name === 'quiz-start') start();
    else if (name === 'quiz-pick') {
      const q = st.q; const c = q.choices.find((p) => p.key === el.dataset.key);
      answer(c.key === q.target.key, c);
    } else if (name === 'quiz-skip') answer(false, null);
    else if (name === 'quiz-next') { st.i++; next(); }
    else if (name === 'quiz-exit') { stop(); api.leave(); api.rerender(); }
    else if (name === 'quiz-review') { const key = el.dataset.key; stop(); api.leave(); api.spotlightKey(key); }
  }

  function tap(part) {
    const q = st.q;
    if (st.phase !== 'run' || !q || q.kind !== 'find' || q.answered || !part) return;
    answer(part.key === q.target.key, part);
  }

  function stop() {
    st = { phase: 'setup' };
    app.state.overlay = null; setExtraLabels([]); refresh();
  }

  return { html, act, tap, stop, running: () => st.phase === 'run' };
}
