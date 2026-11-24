// Entry point: pick the language, start the 3D engine, load the models,
// start the UI.

import * as core from './core.js';
import { initUI, initialLang } from './ui.js';
import { setLang, t } from './i18n.js';

const bar = document.getElementById('load-bar');
const text = document.getElementById('load-text');
const loading = document.getElementById('loading');

async function start() {
  setLang(initialLang());
  try {
    core.init(document.getElementById('gl'), document.getElementById('labels'));
  } catch (err) {
    text.textContent = t('這個裝置或瀏覽器無法開啟 3D（WebGL）。請換一個瀏覽器試試。');
    console.error(err);
    return;
  }
  initUI();
  try {
    await core.load((p) => {
      bar.style.width = Math.round(p * 100) + '%';
      text.textContent = p < 1 ? t('正在載入模型… {n}%', { n: Math.round(p * 100) }) : t('快好了，正在組裝身體…');
    });
    loading.classList.add('done');
    setTimeout(() => loading.remove(), 500);
  } catch (err) {
    text.textContent = t('模型載入失敗，請檢查網路後重新整理頁面。');
    console.error(err);
  }
}
start();

// Offline support (only on a real http(s) origin).
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}

window.__bd = core; // handy for debugging in the console
