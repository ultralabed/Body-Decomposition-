// Quiz mode: "what is this?" (4 choices) and "find it" (tap the model).

import * as THREE from '../vendor/three.module.min.js';
import { app, refresh, focusParts, frameBox, boxOfParts, viewDir, setExtraLabels, text } from './core.js';
import { SYS } from './catalog.js';
import { t, L, keyName, keyAlt } from './i18n.js';

const ASK = new THREE.Color('#ffd23f');
const GOOD = new THREE.Color('#3ddc97');
const BAD = new THREE.Color('#ff6b6b');

const SCOPES = [
  { id: 'm1', name: ['淺層肌肉', 'Superficial'], test: (p) => p.sys === 'muscle' && p.layer === 1 },
  { id: 'mall', name: ['全部肌肉', 'All muscles'], test: (p) => p.sys === 'muscle' },
  { id: 'bone', name: ['骨骼', 'Bones'], test: (p) => p.sys === 'bone' && !/tooth/.test(p.key) },
  { id: 'organ', name: ['內臟血管', 'Organs'], test: (p) => p.sys === 'organ' || (p.sys === 'vessel' && !/coronary|papillary|cardiac|ventricle/.test(p.key)) },
];
const AREAS = [
  { id: 'all', name: ['全身', 'All'], regions: null },
  { id: 'upper', name: ['上肢', 'Arm'], regions: ['shoulder', 'arm', 'forearm', 'hand'] },
  { id: 'lower', name: ['下肢', 'Leg'], regions: ['hip', 'thigh', 'leg', 'foot'] },
  { id: 'trunk', name: ['軀幹', 'Trunk'], regions: ['chest', 'abdomen', 'back', 'pelvis'] },
  { id: 'head', name: ['頭頸', 'Head'], regions: ['head', 'neck'] },
];
const KINDS = [{ id: 'name', name: ['看圖選名字', 'Name it'] }, { id: 'find', name: ['在模型上找', 'Find it'] }, { id: 'mix', name: ['混合', 'Mixed'] }];

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
    if (all.length < 4) { api.toast(t('這個範圍的題目太少，換一個範圍試試')); return; }
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
    const tg = q.target;
    const softT = tg.sys === 'muscle' || tg.sys === 'tendon';
    app.state.overlay = (p) => {
      const soft = p.sys === 'muscle' || p.sys === 'tendon', hard = p.sys === 'bone' || p.sys === 'joint';
      if (q.kind === 'find') {
        if (q.answered && p.key === tg.key) return { visible: true, opacity: 1, tint: GOOD };
        if (q.answered && q.tapped && p === q.tapped && p.key !== tg.key) return { visible: true, opacity: 1, tint: BAD };
        if (p.sys === 'skin') return { visible: false };
        if (softT) return soft ? { visible: true, opacity: 1, pickable: !q.answered } : hard ? { visible: true, opacity: 1, pickable: false } : { visible: false };
        return hard ? { visible: true, opacity: 1, pickable: !q.answered && p.sys === 'bone' } : { visible: false };
      }
      if (p.key === tg.key && (p === tg || !tg.side)) return { visible: true, opacity: 1, tint: q.answered ? GOOD : ASK, pickable: false };
      if (p.sys === 'skin') return { visible: false };
      if (softT) return soft ? { visible: true, opacity: 0.07, pickable: false } : hard ? { visible: true, opacity: 1, pickable: false } : { visible: false };
      if (tg.sys === 'bone') return hard ? { visible: true, opacity: 0.2, pickable: false } : { visible: false };
      return p.sys === tg.sys ? { visible: true, opacity: 0.16, pickable: false } : hard ? { visible: true, opacity: 0.12, pickable: false } : { visible: false };
    };
    setExtraLabels(q.answered ? [{ part: tg, cls: 'good' }] : []);
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
    const seg = (name, list, cur) => `<div class="seg" style="margin-bottom:8px">${list.map((o) => `<button data-act="quiz-set" data-k="${name}" data-v="${o.id}" aria-pressed="${o.id === cur}">${esc(L(o.name))}</button>`).join('')}</div>`;
    if (st.phase === 'setup') {
      const best = api.store.get('quizBest', {})[`${cfg.scope}.${cfg.area}`];
      return `<p class="hint">${t('選好範圍就開始。答錯沒關係，答完會告訴你正確答案在哪裡。')}</p>
        <div class="h3">${t('考什麼')}</div>${seg('scope', SCOPES, cfg.scope)}
        <div class="h3">${t('哪個部位')}</div>${seg('area', AREAS, cfg.area)}
        <div class="h3">${t('怎麼考')}</div>${seg('kind', KINDS, cfg.kind)}
        <div class="h3">${t('幾題')}</div>${seg('n', [5, 10, 20].map((n) => ({ id: n, name: [n + ' 題', String(n)] })), cfg.n)}
        <p class="hint" style="margin-top:10px">${t('這個範圍共有 {n} 個構造', { n: pool().length })}${best !== undefined ? '　·　' + t('你的最高紀錄 {n} 分', { n: best }) : ''}</p>
        <button class="btn primary wide" data-act="quiz-start">${t('開始測驗')}</button>`;
    }
    if (st.phase === 'done') {
      return `<div class="score-big">${t('{n} 分', { n: st.pct })}</div>
        <div class="score-sub">${t('答對 {a} / {b} 題', { a: st.score, b: st.order.length })}${st.isBest ? '　·　' + t('新紀錄！') : ''}</div>
        ${st.wrong.length ? `<div class="h3">${t('答錯的再看一次（點一下就會帶你去看）')}</div><div class="chips" style="margin-bottom:14px">${st.wrong.map((p) => `<button class="chip" data-act="quiz-review" data-key="${esc(p.key)}">${esc(keyName(p.key))}</button>`).join('')}</div>` : `<p class="hint" style="text-align:center">${t('全部答對，太厲害了！')}</p>`}
        <div class="grid2"><button class="btn primary" data-act="quiz-start">${t('再考一次')}</button><button class="btn" data-act="quiz-exit">${t('換範圍')}</button></div>`;
    }
    const q = st.q, tg = q.target;
    const kid = text(tg.key).kid;
    const head = `<div class="quiz-bar"><span>${t('第 {a} / {b} 題', { a: st.i + 1, b: st.order.length })}</span><div class="bar"><i style="width:${(st.i / st.order.length) * 100}%"></i></div><span>${t('答對 {n}', { n: st.score })}</span></div>`;
    const after = q.answered ? `<div class="feedback ${q.correct ? 'good' : 'bad'}">${q.correct ? t('答對了！') : t('答案是「{name}」', { name: esc(tg.name) })}</div>
      ${kid ? `<div class="kid" data-lead="${t('簡單說：')}">${esc(kid)}</div>` : ''}
      <button class="btn primary wide" data-act="quiz-next">${st.i + 1 >= st.order.length ? t('看成績') : t('下一題')}</button>` : '';
    if (q.kind === 'find') {
      return `${head}<div class="quiz-q">${t('請在模型上點出：{name}', { name: esc(keyName(tg.key)) })}<small>${esc(keyAlt(tg.key))}　·　${t('可以轉動、放大模型來找（左右邊都算對）')}</small></div>
        ${q.answered ? after : `<button class="btn wide" data-act="quiz-skip">${t('不知道，看答案')}</button>`}`;
    }
    return `${head}<div class="quiz-q">${t('黃色亮起來的是什麼？')}<small>${esc(L(SYS[tg.sys]) || '')}</small></div>
      ${q.choices.map((c) => {
        const cls = q.answered ? (c.key === tg.key ? 'right' : c === q.tapped ? 'wrong' : '') : '';
        return `<button class="choice ${cls}" data-act="quiz-pick" data-key="${esc(c.key)}" ${q.answered ? 'disabled' : ''}><b>${esc(keyName(c.key))}</b><small>${esc(keyAlt(c.key))}</small></button>`;
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
