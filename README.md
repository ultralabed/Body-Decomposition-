# Body Decomposition | 3D layered musculoskeletal atlas

**English** | [繁體中文](README.zh-TW.md)

**Live site: <https://ultralabed.github.io/Body-Decomposition-/>**

A 3D model of the human body that you can rotate with a finger, peel layer by layer, and tap to read about
every muscle and bone. It is made for physical therapy study and patient education.
It runs in the browser with nothing to install, on phones and computers. The interface and all descriptions
come in **English** and **Traditional Chinese**; switch at any time with the `EN` / `中` button at the top.

- **934 selectable structures**: 424 muscle parts, 231 bones and teeth, plus cartilage, intervertebral discs, organs, heart and vessels, and the brain.
- **A real anatomical model**: from [BodyParts3D](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/) (The Database Center for Life Science, Japan).
- **All 553 kinds of structure are described in both languages**: a plain one-sentence summary, origin, insertion, action, innervation, blood supply and a clinical note.

## Open it

**GitHub Pages**

The address is <https://ultralabed.github.io/Body-Decomposition-/>.

The code lives on the `main` branch, and the site is published from the root of `main`:
**Settings → Pages → Source**: choose *Deploy from a branch*, branch `main`, folder `/ (root)`.
Every push to `main` republishes the site automatically; it takes a minute or two.

**On your own computer**

```bash
git clone https://github.com/ultralabed/Body-Decomposition-.git
cd Body-Decomposition-
python3 -m http.server 8000
# open http://localhost:8000 in a browser
```

There is no `npm install` and no build step. (Double-clicking `index.html` does not work: the browser blocks
the model files unless the page comes from a small server like the one above.)

## Features

| Feature | What it does |
| --- | --- |
| Rotate / zoom | One finger rotates, two fingers zoom and move; front, back, left and right buttons; double-tap to fly in |
| Peel | Skin → superficial muscles → intermediate muscles → deep muscles → bones, one tap each |
| Layers | 9 layers, each with its own switch and opacity; show only the left or right side |
| Selection tools | Hide, fade, isolate, fade the rest, multi-select, undo, show everything |
| Info card | Name in both languages, plain summary, origin, insertion, action, innervation, blood supply, clinical note, spoken English name, personal notes |
| Origin / insertion maps | Paints the bone where the muscle attaches: red for origin, blue for insertion |
| Search | English or Chinese, for example `biceps` or 「二頭」 |
| Regions | 12 quick jumps (shoulder, elbow, back, hip, knee, ankle…), with an option to show only that region |
| Muscle groups | 32 functional groups (rotator cuff, core, quadriceps, hamstrings…) |
| Joint movements | 29 animated movements (shoulder, elbow, wrist, hip, knee, ankle, trunk, neck, squat) that highlight prime movers and helpers and give the normal range of motion |
| Quiz | "Name it" and "Find it on the model" questions, a choice of range, and a saved best score |
| Section plane | Cut the body open left–right, top–bottom or front–back |
| Exploded view | Spread all the parts apart |
| X-ray mode | Make everything see-through |
| Language | Switch between English and Traditional Chinese at any time; add `?lang=en` or `?lang=zh` to the address to force one |
| More | Name labels, snapshots, share links, saved views, light / dark, auto-rotate, add to the phone home screen and use offline |

Keyboard (computer): `/` search, `H` hide, `T` fade, `I` isolate, `F` zoom in, `Ctrl+Z` undo, `Esc` clear the selection.

## Folders

```
index.html            the page
css/app.css           styles
js/main.js            start-up
js/core.js            3D engine: loading, colours, picking, camera, section plane, exploded view
js/ui.js              all panels and buttons
js/catalog.js         lists of layers, regions, muscle groups and joint movements
js/motion.js          joint movements (bend deformer)
js/attach.js          origin / insertion maps
js/quiz.js            quiz
js/i18n.js            language switch and the English string table
data/anatomy.json     basic facts for every structure (built from data/src)
data/text-zh.json     Chinese descriptions (built from data/src)
data/text-en.json     English descriptions (built from data/src/en)
data/src/*.json       source files for the Chinese descriptions
data/src/en/*.json    source files for the English descriptions
models/*.glb          compressed 3D models (skeleton, muscles, everything else)
vendor/               three.js
tools/                scripts that turn the BodyParts3D source files into models/*.glb
sw.js                 offline cache
```

## Editing the descriptions

Edit `muscles-*.json` or `other-*.json` in `data/src/` (Chinese) or `data/src/en/` (English), then run:

```bash
cd tools && npm install && node 02-build-data.mjs
```

## Rebuilding the models (rarely needed)

```bash
git clone --depth 1 https://github.com/Kevin-Mattheus-Moerman/BodyParts3D bp3d
cd tools && npm install
node 01-simplify.mjs ../bp3d/assets/BodyParts3D_data/stl ./cache 9   # 9 = about 9 mm² per triangle; smaller is finer
node 02-build-data.mjs
node 03-pack.mjs ./cache
```

The source model has about 26.3 million triangles (1.3 GB). After simplification it has about 1.22 million,
and the three GLB files total about 5 MB.

## Known limits

- **No 3D peripheral nerves or limb vessels**: this release of BodyParts3D does not include them, so innervation and blood supply are text only.
- **Joint movements are illustrative**: they use a bend deformer, not a real skeleton rig, so muscle shapes near a joint are approximate and the shoulder blade does not move.
- **Origin / insertion maps are estimated automatically**: they come from the distance between muscle and bone surfaces, so positions are approximate, and attachments to fascia or other muscles are not shown.
- **Tendons are not coloured separately**: the model builds each muscle and its tendon as one piece.
- **The English descriptions are translated from the Chinese**: both languages carry the same content, so an error in one is an error in both.
- **The text is for study only**: it is compiled from standard anatomy textbooks, details such as nerve root levels differ between textbooks, and it does not replace professional medical judgement.

## Sources and licences

- **3D model**: BodyParts3D, © The Database Center for Life Science, licensed under CC Attribution-Share Alike 2.1 Japan.
  The files in `models/` are simplified, compressed derivatives and carry the same licence (see `models/LICENSE.md`).
  The STL version comes from [Kevin-Mattheus-Moerman/BodyParts3D](https://github.com/Kevin-Mattheus-Moerman/BodyParts3D).
  Citation: Mitsuhashi N, et al. BodyParts3D: 3D structure database for anatomical concepts. *Nucleic Acids Res.* 2009;37:D782–5.
- **three.js**: MIT licence (`vendor/THREE-LICENSE`).
