// Language support: 繁體中文 (zh) and English (en).
//
// - UI sentences are written in Chinese in the code as t('中文') and looked
//   up in the EN table below when the language is English. A key may end in
//   "@something" to tell two uses of the same Chinese word apart; that
//   suffix is never shown.
// - Lists in catalog.js store pairs [中文, English]; L(pair) picks one.
// - Structure names: Chinese comes from data/anatomy.json, English is the
//   BodyParts3D name itself.

let lang = 'zh';
let info = {};

export const getLang = () => lang;
export function setLang(l) { lang = l === 'en' ? 'en' : 'zh'; }
export function setInfo(i) { info = i; }

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const zhName = (key) => info[key]?.zh || key;
const zhPart = (p) => (p.side === 'R' ? '右' : p.side === 'L' ? '左' : '') + zhName(p.key);

// Name in the current language, and "alt" = the same name in the other one.
export const keyName = (key) => (lang === 'en' ? cap(key) : zhName(key));
export const keyAlt = (key) => (lang === 'en' ? zhName(key) : key);
export const partName = (p) => (lang === 'en' ? cap(p.en) : zhPart(p));
export const partAlt = (p) => (lang === 'en' ? zhPart(p) : p.en);

export const L = (pair) => (Array.isArray(pair) ? pair[lang === 'en' ? 1 : 0] : pair);

export function t(key, vars) {
  let s = lang === 'en' ? EN[key] : undefined;
  if (s === undefined) {
    if (lang === 'en') (globalThis.__i18nMissing ||= new Set()).add(key);
    s = key.replace(/@\w+$/, '');
  }
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  return s;
}

// Fixed text in index.html: data-t="中文" sets the text, and
// data-t-attr="placeholder=中文|title=中文" sets attributes.
export function applyStatic(root = document) {
  for (const el of root.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
  for (const el of root.querySelectorAll('[data-t-attr]')) {
    for (const pair of el.dataset.tAttr.split('|')) {
      const i = pair.indexOf('=');
      el.setAttribute(pair.slice(0, i), t(pair.slice(i + 1)));
    }
  }
}

const EN = {
  // tabs and panel titles
  '圖層': 'Layers', '部位': 'Regions', '肌群': 'Groups', '動作@tab': 'Motion', '測驗': 'Quiz', '工具': 'Tools',
  '關節動作': 'Joint movements', '說明': 'Info',
  // page chrome
  '3D 肌肉骨骼分層圖': '3D layered musculoskeletal atlas',
  '正在載入模型…': 'Loading the model…',
  '正在載入模型… {n}%': 'Loading the model… {n}%',
  '快好了，正在組裝身體…': 'Almost there, putting the body together…',
  '模型載入失敗，請檢查網路後重新整理頁面。': 'The model could not be loaded. Check your connection and reload the page.',
  '這個裝置或瀏覽器無法開啟 3D（WebGL）。請換一個瀏覽器試試。': 'This device or browser cannot show 3D (WebGL). Please try another browser.',
  '模型：BodyParts3D © 日本生命科學資料庫中心（DBCLS），CC BY-SA 2.1 JP': 'Model: BodyParts3D © The Database Center for Life Science (DBCLS), CC BY-SA 2.1 JP',
  '3D 人體模型': '3D model of the human body',
  '搜尋肌肉、骨頭…（中文或英文）': 'Search muscles, bones…',
  '搜尋構造': 'Search structures', '清除搜尋': 'Clear search',
  '視角': 'View', '前': 'F', '後': 'B', '左': 'L', '右': 'R',
  '前面': 'Front view', '後面': 'Back view', '左側面': 'Left side view', '右側面': 'Right side view',
  '重設視角': 'Reset view', '復原上一步': 'Undo', '全部顯示': 'Show everything',
  '關閉面板': 'Close panel', '主選單': 'Main menu', '剝層': 'Peel',
  // selection
  '{name}（左右兩側）': '{name} (both sides)',
  '{name}（{n} 個部分）': '{name} ({n} parts)',
  '已選 {n} 個構造': '{n} structures selected',
  '、': ', ', '：': ': ',
  '全部都回來了': 'Everything is back',
  '找不到，換個字試試（例如「二頭」或 biceps）': 'Nothing found. Try another word, for example "biceps".',
  '其他構造已變淡。按左邊的「全部顯示」可以恢復': 'Everything else is faded. Tap "Show everything" on the left to bring it back.',
  '隱藏': 'Hide', '變透明': 'Fade', '只看這個': 'Isolate', '其他變淡': 'Fade rest', '靠近看': 'Zoom in', '多選': 'Multi',
  '多選開啟：一個一個點，可以選很多個': 'Multi-select on: tap one after another to pick several',
  '多選關閉': 'Multi-select off',
  '已隱藏。按左邊的復原箭頭可以叫回來': 'Hidden. Tap the undo arrow on the left to bring it back.',
  // layers
  '{name}透明度': '{name} opacity', '{n} 種': '{n}',
  '打開或關掉每一層，拉桿可以讓它變透明。右邊的「剝層」是一鍵版本。': 'Switch each layer on or off; the slider makes it see-through. "Peel" on the right is the one-tap version.',
  '只看身體的一邊': 'Show one side of the body',
  '兩邊': 'Both', '只看右邊': 'Right only', '只看左邊': 'Left only',
  '全部構造清單（點名字會帶你去看）': 'All structures (tap a name to go there)',
  '顯示或隱藏': 'Show or hide',
  // regions
  '點一下就飛過去看那個部位（手腳以右邊為主）。': 'Tap to fly to that part of the body (limbs: the right side).',
  '只顯示這個部位': 'Show only this region',
  '把其他部位的肌肉骨頭先收起來，畫面比較乾淨': 'Put away the muscles and bones of other regions for a cleaner view',
  // groups and motions
  '常一起工作的肌肉。點一下，這群肌肉會亮起來，其他的會變淡。': 'Muscles that work together. Tap a group to light it up and fade the rest.',
  '{name}：亮起來的就是（共 {n} 條）': '{name}: the highlighted ones ({n} muscles)',
  '選一個動作：模型會動給你看，而且把「負責出力的肌肉」亮起來。': 'Pick a movement: the model performs it and the muscles doing the work light up.',
  '簡單說：': 'In short:', '正常角度': 'Normal range',
  '暫停': 'Pause', '播放': 'Play', '動作進度': 'Movement progress',
  '右邊': 'Right', '左邊': 'Left',
  '主要出力的肌肉（金色）': 'Prime movers (gold)', '幫忙的肌肉（青色）': 'Helpers (teal)',
  '其他肌肉變淡': 'Fade other muscles', '只留下有出力的肌肉，比較好看清楚': 'Keep only the working muscles so they are easy to see',
  '結束這個動作': 'End this movement',
  '動作是用「彎曲變形」模擬的示意動畫，肌肉在關節附近的形狀只是近似，不是精確的生物力學模擬。': 'The movement is an illustrative animation made with a bend deformer. Muscle shapes near the joint are approximate; this is not a precise biomechanical simulation.',
  // info card
  '還沒選東西。在模型上點一塊肌肉或骨頭，這裡就會出現它的說明。': 'Nothing selected yet. Tap a muscle or bone on the model and its description appears here.',
  '你選了 {n} 個構造。點名字看單一個的說明。': 'You selected {n} structures. Tap a name to read about just that one.',
  '關閉起點／止點': 'Hide origin / insertion', '在骨頭上顯示起點／止點': 'Show origin / insertion on the bones',
  '左右兩側': 'Both sides', '右側': 'Right', '左側': 'Left',
  '起點': 'Origin', '止點': 'Insertion', '動作': 'Action', '神經支配': 'Innervation', '血液供應': 'Blood supply',
  '關閉起止點': 'Hide attachments', '看起點／止點': 'Origin / insertion',
  '只選右邊': 'Right side only', '左右一起選': 'Select both sides',
  '選整塊肌肉（{n} 部分）': 'Whole muscle ({n} parts)',
  '唸出英文名稱': 'Say the English name', '臨床重點': 'Clinical note',
  '我的筆記（只存在這台裝置）': 'My notes (saved on this device only)',
  '例如：觸診位置、牽拉方式、上課重點…': 'For example: where to palpate, how to stretch, class notes…',
  '模型編號': 'Model ID',
  '紅色＝起點': 'Red = origin', '藍色＝止點': 'Blue = insertion', '紫色＝兩端都在這塊骨頭': 'Purple = both ends on this bone',
  '顏色是用「肌肉離骨頭表面夠近的地方」自動算出來的，是大概位置；附在筋膜或其他肌肉上的部分不會顯示。': 'The colours are worked out automatically from where the muscle lies close to the bone surface, so they are approximate. Attachments to fascia or to other muscles are not shown.',
  '在 {n} 塊骨頭上標出了附著位置': 'Attachments marked on {n} bones',
  '這條肌肉沒有貼在骨頭上的部分（或模型上離骨頭太遠），所以沒有顏色': 'This muscle does not touch a bone in the model, so nothing is coloured',
  '這個瀏覽器不支援朗讀': 'This browser cannot read text aloud',
  // tools
  '顯示': 'Display',
  'X 光模式': 'X-ray mode', '全部變成半透明，一次看穿裡面': 'Make everything see-through',
  '名稱標籤': 'Name labels', '選到的構造旁邊顯示名字': 'Show a name next to selected structures',
  '自動旋轉': 'Auto-rotate', '模型自己慢慢轉': 'The model turns slowly by itself',
  '淺色背景': 'Light background', '白天或投影時比較清楚': 'Easier to see in daylight or on a projector',
  '切開來看（切面）': 'Cut it open (section plane)',
  '打開切面': 'Section plane', '像切蛋糕一樣把身體切開，看裡面一層一層': 'Slice the body like a cake to see the layers inside',
  '左右切': 'Left–right', '上下切': 'Top–bottom', '前後切': 'Front–back',
  '切面位置': 'Plane position', '換看另一邊': 'Show the other half',
  '分解圖（把零件散開）': 'Exploded view (spread the parts)', '分解程度': 'How far apart',
  '儲存與分享': 'Save & share', '截圖': 'Snapshot', '分享': 'Share', '存畫面': 'Save view',
  '我存的畫面': 'Saved views', '刪除': 'Delete', '我寫過筆記的構造': 'Structures with my notes',
  '其他': 'More', '操作教學': 'How to use', '關於與授權': 'About & licence',
  '目前畫面的截圖': 'Snapshot of the current view',
  '手機：長按圖片就能儲存或分享。電腦：按下面的按鈕下載。': 'Phone: press and hold the picture to save or share it. Computer: use the button below.',
  '下載圖片': 'Download image', '關閉': 'Close',
  '連結已複製，貼給別人就能看到同一個畫面': 'Link copied. Anyone who opens it sees the same view.',
  '連結已放到網址列，可以直接複製': 'The link is now in the address bar, ready to copy.',
  '畫面存好了，在下面的清單裡': 'View saved. It is in the list below.',
  // help and about
  '怎麼玩': 'How to use',
  '一根手指': 'One finger', '在模型上滑：轉動模型': 'Drag on the model to rotate it',
  '兩根手指': 'Two fingers', '張開或捏合：放大縮小；一起移動：搬動模型': 'Pinch to zoom; drag together to move the model',
  '點一下': 'Tap', '選一塊肌肉或骨頭，它會變亮藍色': 'Select a muscle or bone; it turns bright blue',
  '點兩下': 'Double-tap', '飛過去靠近看': 'Fly in for a closer look',
  '右邊剝層': 'Peel (right)', '像剝洋蔥，一層一層往裡面看': 'Like an onion: look deeper one layer at a time',
  '滑鼠': 'Mouse', '左鍵轉、右鍵搬、滾輪放大縮小': 'Left button rotates, right button moves, wheel zooms',
  '選到東西後，下面會出現工具：隱藏、變透明、只看這個、其他變淡。左邊的箭頭可以復原上一步。': 'After you select something, tools appear at the bottom: Hide, Fade, Isolate, Fade rest. The arrow on the left undoes the last step.',
  '開始': 'Start', '關於': 'About',
  'Body Decomposition 是給物理治療學習用的 3D 肌肉骨骼分層圖，共 {n} 個可以點選的構造。': 'Body Decomposition is a 3D layered musculoskeletal atlas for physical therapy study, with {n} selectable structures.',
  '3D 模型': '3D model', '文字說明': 'Text', '程式': 'Code',
  'BodyParts3D, © The Database Center for Life Science（日本生命科學資料庫中心），以 CC 姓名標示-相同方式分享 2.1 日本 授權。本專案將原始模型簡化、壓縮後使用，衍生的模型檔沿用相同授權。': 'BodyParts3D, © The Database Center for Life Science, licensed under CC Attribution-Share Alike 2.1 Japan. This project uses a simplified, compressed version of the original model; the derived model files carry the same licence.',
  '依一般解剖學教科書內容整理，僅供學習參考，不能取代專業醫療判斷。神經根節與附著點細節各教科書略有出入。': 'Compiled from standard anatomy textbooks for study only; it does not replace professional medical judgement. Nerve root levels and attachment details differ slightly between textbooks.',
  '使用 three.js（MIT 授權）。': 'Built with three.js (MIT licence).',
  // quiz
  '這個範圍的題目太少，換一個範圍試試': 'Too few structures in this range. Try another one.',
  '選好範圍就開始。答錯沒關係，答完會告訴你正確答案在哪裡。': 'Choose what to practise and start. Wrong answers are fine: you are shown the right one each time.',
  '考什麼': 'What', '哪個部位': 'Where', '怎麼考': 'How', '幾題': 'Questions',
  '這個範圍共有 {n} 個構造': 'This range has {n} structures',
  '你的最高紀錄 {n} 分': 'your best: {n}',
  '開始測驗': 'Start quiz', '{n} 分': '{n} / 100',
  '答對 {a} / {b} 題': '{a} of {b} correct', '新紀錄！': 'New best!',
  '答錯的再看一次（點一下就會帶你去看）': 'Review the ones you missed (tap to go there)',
  '全部答對，太厲害了！': 'All correct. Well done!',
  '再考一次': 'Try again', '換範圍': 'Change range',
  '第 {a} / {b} 題': 'Question {a} of {b}', '答對 {n}': '{n} correct',
  '答對了！': 'Correct!', '答案是「{name}」': 'The answer is "{name}"',
  '看成績': 'See score', '下一題': 'Next',
  '請在模型上點出：{name}': 'Tap this on the model: {name}',
  '可以轉動、放大模型來找（左右邊都算對）': 'Rotate and zoom to find it (either side counts)',
  '不知道，看答案': 'I don\'t know, show me',
  '黃色亮起來的是什麼？': 'What is the yellow structure?',
};
