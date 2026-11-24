# Body Decomposition｜3D 肌肉骨骼分層圖

**線上版 / Live site：<https://ultralabed.github.io/Body-Decomposition-/>**

可以用手指旋轉、一層一層剝開、點選每一塊肌肉和骨頭的 3D 人體圖，給物理治療的學習和衛教使用。
打開網頁就能用，不用安裝，手機和電腦都可以。介面和說明有**繁體中文**和**英文**，按右上角的 `EN` / `中` 隨時切換。

> **English** — A 3D layered musculoskeletal atlas for physical therapy study that runs in the browser.
> Rotate, peel layer by layer and tap any of 934 structures to read its origin, insertion, action,
> innervation, blood supply and a clinical note. It also has joint-movement demos, origin/insertion maps,
> muscle groups, a quiz, a section plane and an exploded view. Use the `EN` / `中` button at the top to
> switch between Traditional Chinese and English.

- **934 個可以點的構造**：424 個肌肉零件、231 塊骨頭與牙齒，還有軟骨、椎間盤、內臟、心臟血管、大腦。
- **真人形狀的模型**：來自 [BodyParts3D](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/)（日本生命科學資料庫中心）。
- **553 種構造都有中文和英文說明**：一句白話、起點、止點、動作、神經支配、血液供應、臨床重點。

## 馬上打開

**GitHub Pages**

網址是 <https://ultralabed.github.io/Body-Decomposition-/>。

網站直接從 `claude/3d-anatomy-layers-p1keq1` 分支的根目錄發布（Settings → Pages → *Deploy from a branch*）。
每次把新內容推到這個分支，GitHub 會自動重新發布，大約一兩分鐘後生效。

如果之後想改成從別的分支發布（例如 `main`），到 **Settings → Pages** 把 Branch 換掉就可以。

**在自己電腦上**

```bash
git clone https://github.com/ultralabed/Body-Decomposition-.git
cd Body-Decomposition-
python3 -m http.server 8000
# 瀏覽器打開 http://localhost:8000
```

不需要 `npm install`，也沒有建置步驟。（直接雙擊 `index.html` 不行，瀏覽器會擋住模型檔，一定要經過上面這種小伺服器。）

## 功能

| 功能 | 做什麼 |
| --- | --- |
| 旋轉／縮放 | 一根手指轉、兩根手指放大和搬動；前後左右按鈕；點兩下飛過去 |
| 剝層 | 皮膚 → 淺層肌 → 中層肌 → 深層肌 → 骨骼，一鍵切換 |
| 圖層 | 9 個圖層各自開關、各自調透明度；可以只看左邊或右邊 |
| 選取工具 | 隱藏、變透明、只看這個、其他變淡、多選、復原、全部顯示 |
| 說明卡 | 中英文名稱、白話說明、起點、止點、動作、神經支配、血液供應、臨床重點、朗讀英文、個人筆記 |
| 起點／止點上色 | 在骨頭上把肌肉附著的地方塗色：紅色起點、藍色止點 |
| 搜尋 | 中文或英文都可以，例如「二頭」或 `biceps` |
| 部位 | 12 個快速跳轉（肩膀、手肘、腰背、髖、膝、足踝…），可以只顯示那個部位 |
| 肌群 | 32 組功能性肌群（旋轉肌袖、核心、股四頭肌、膕旁肌…） |
| 關節動作 | 29 個動作動畫（肩、肘、腕、髖、膝、踝、軀幹、頸、深蹲），把主動肌和協同肌亮起來，附正常活動角度 |
| 測驗 | 「看圖選名字」和「在模型上找」兩種題型，可選範圍，會記最高分 |
| 切面 | 左右、上下、前後三個方向把身體切開 |
| 分解圖 | 把所有零件往外散開 |
| X 光模式 | 全部半透明 |
| 語言 | 繁體中文／英文隨時切換；網址加 `?lang=en` 或 `?lang=zh` 可以指定 |
| 其他 | 名稱標籤、截圖、分享連結、儲存畫面、淺色／深色、自動旋轉、可加到手機主畫面並離線使用 |

鍵盤（電腦）：`/` 搜尋、`H` 隱藏、`T` 變透明、`I` 只看這個、`F` 靠近看、`Ctrl+Z` 復原、`Esc` 取消選取。

## 資料夾

```
index.html            網頁本體
css/app.css           樣式
js/main.js            啟動
js/core.js            3D 引擎：載入模型、顏色、點選、鏡頭、切面、分解
js/ui.js              所有面板和按鈕
js/catalog.js         圖層、部位、肌群、關節動作的清單
js/motion.js          關節動作（彎曲變形）
js/attach.js          起點／止點上色
js/quiz.js            測驗
js/i18n.js            語言切換和英文對照表
data/anatomy.json     每個構造的基本資料（由 data/src 產生）
data/text-zh.json     中文說明（由 data/src 產生）
data/text-en.json     英文說明（由 data/src/en 產生）
data/src/*.json       中文說明原始檔，要改說明就改這裡
data/src/en/*.json    英文說明原始檔
models/*.glb          壓縮後的 3D 模型（骨骼、肌肉、其他）
vendor/               three.js
tools/                把 BodyParts3D 原始檔轉成 models/*.glb 的程式
sw.js                 離線快取
```

## 修改文字說明

改 `data/src/`（中文）或 `data/src/en/`（英文）裡的 `muscles-*.json`、`other-*.json`，然後：

```bash
cd tools && npm install && node 02-build-data.mjs
```

## 重新產生模型（一般用不到）

```bash
git clone --depth 1 https://github.com/Kevin-Mattheus-Moerman/BodyParts3D bp3d
cd tools && npm install
node 01-simplify.mjs ../bp3d/assets/BodyParts3D_data/stl ./cache 9   # 9 = 每個三角形約 9 平方公釐，數字越小越精細
node 02-build-data.mjs
node 03-pack.mjs ./cache
```

原始模型約 2,630 萬個三角形（1.3 GB），簡化後約 122 萬個三角形，三個 GLB 檔合計約 5 MB。

## 已知限制

- **沒有周邊神經和四肢血管的 3D 模型**：BodyParts3D 這個版本沒有，所以神經支配和血液供應只有文字。
- **關節動作是示意動畫**：用「彎曲變形」做的，不是真的骨架綁定，肌肉在關節附近的形狀只是近似；肩胛骨不會跟著動。
- **起點／止點上色是自動估算**：依肌肉和骨頭表面的距離算出來，是大概位置；附著在筋膜或其他肌肉上的部分不會顯示。
- **肌腱沒有另外分色**：模型把肌肉和肌腱做成同一塊。
- **英文說明是從中文翻譯來的**：兩種語言內容相同，中文有錯的地方英文也會錯。
- **文字內容僅供學習**：依一般解剖學教科書整理，神經根節等細節各教科書略有出入，不能取代專業醫療判斷。

## 來源與授權

- **3D 模型**：BodyParts3D, © The Database Center for Life Science, licensed under CC Attribution-Share Alike 2.1 Japan。
  `models/` 裡的檔案是簡化、壓縮後的衍生作品，沿用相同授權（見 `models/LICENSE.md`）。
  STL 版本取自 [Kevin-Mattheus-Moerman/BodyParts3D](https://github.com/Kevin-Mattheus-Moerman/BodyParts3D)。
  引用文獻：Mitsuhashi N, et al. BodyParts3D: 3D structure database for anatomical concepts. *Nucleic Acids Res.* 2009;37:D782–5.
- **three.js**：MIT 授權（`vendor/THREE-LICENSE`）。
