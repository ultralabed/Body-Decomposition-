// Static lists shown in the UI: layers, body regions, functional muscle
// groups and joint movements. Text is Traditional Chinese.

export const GROUPS = [
  { id: 'skin', zh: '皮膚', hint: '身體最外面的外衣' },
  { id: 'm1', zh: '淺層肌肉', hint: '皮膚底下第一層，摸得到的肌肉' },
  { id: 'm2', zh: '中層肌肉', hint: '藏在淺層肌肉下面' },
  { id: 'm3', zh: '深層肌肉', hint: '最裡面、貼著骨頭的肌肉' },
  { id: 'bone', zh: '骨骼', hint: '撐起身體的骨頭和牙齒' },
  { id: 'joint', zh: '軟骨與椎間盤', hint: '骨頭之間的軟墊和連接' },
  { id: 'organ', zh: '內臟', hint: '肺、肝、胃、腸、腎…' },
  { id: 'vessel', zh: '心臟與血管', hint: '心臟和大條的動脈、靜脈' },
  { id: 'nerve', zh: '腦與神經', hint: '大腦、小腦、腦幹' },
];

export const PEEL = ['皮膚', '淺層肌', '中層肌', '深層肌', '骨骼'];

export const SYS_ZH = {
  skin: '皮膚', muscle: '肌肉', tendon: '肌腱／韌帶／筋膜', bone: '骨骼', joint: '軟骨／椎間盤',
  organ: '內臟', vessel: '心血管', nerve: '神經系統',
};
export const LAYER_ZH = { 1: '淺層', 2: '中層', 3: '深層' };
export const REGION_ZH = {
  head: '頭部', neck: '頸部', chest: '胸部', abdomen: '腹部', back: '背部', pelvis: '骨盆',
  shoulder: '肩部', arm: '上臂', forearm: '前臂', hand: '手部', hip: '髖部', thigh: '大腿', leg: '小腿', foot: '足部',
};
export const REGION_ORDER = Object.keys(REGION_ZH);

// Quick jumps. `regions` = which region tags belong to it (used for
// "only show this area"); `anchor` picks the spot to frame.
// dir = direction from the body towards the camera (x: body-left, y: up, z: front).
export const REGIONS = [
  { id: 'all', zh: '全身', regions: null, dir: [0, 0.05, 1] },
  { id: 'head', zh: '頭部', regions: ['head'], dir: [-0.45, 0.05, 1] },
  { id: 'neck', zh: '頸部', regions: ['neck', 'head'], frame: ['neck'], dir: [-0.6, 0.1, 1] },
  { id: 'shoulder', zh: '肩膀', regions: ['shoulder', 'arm', 'chest', 'back', 'neck'], anchor: 'shoulder', r: 0.2, dir: [-0.7, 0.15, 1] },
  { id: 'elbow', zh: '手肘', regions: ['arm', 'forearm'], anchor: 'elbow', r: 0.17, dir: [-0.5, 0.05, 1] },
  { id: 'hand', zh: '手腕手掌', regions: ['forearm', 'hand'], anchor: 'wrist', r: 0.15, dir: [-0.3, 0.1, 1] },
  { id: 'chest', zh: '胸部', regions: ['chest', 'shoulder'], frame: ['chest'], dir: [0, 0.05, 1] },
  { id: 'abdomen', zh: '腹部', regions: ['abdomen', 'pelvis'], frame: ['abdomen'], dir: [0, 0.05, 1] },
  { id: 'back', zh: '腰背', regions: ['back', 'neck', 'shoulder', 'pelvis', 'hip'], frame: ['back'], dir: [0.25, 0.1, -1] },
  { id: 'hip', zh: '髖部骨盆', regions: ['hip', 'pelvis', 'thigh'], anchor: 'hip', r: 0.24, dir: [-0.8, 0.05, 0.8] },
  { id: 'knee', zh: '膝蓋', regions: ['thigh', 'leg'], anchor: 'knee', r: 0.19, dir: [-0.5, 0.05, 1] },
  { id: 'ankle', zh: '足踝', regions: ['leg', 'foot'], anchor: 'ankle', r: 0.17, dir: [-1, 0.2, 0.7] },
];

// Functional muscle groups. `match` is a regular expression tested against
// the English structure name (without left/right).
export const MUSCLE_GROUPS = [
  { cat: '肩與上肢', items: [
    { zh: '旋轉肌袖', en: 'Rotator cuff', kid: '四條小肌肉像袖子一樣抱住肩膀的球，讓手臂轉動時不會跑掉。', match: '^(supraspinatus|infraspinatus muscle|teres minor|subscapularis)$' },
    { zh: '三角肌', en: 'Deltoid', kid: '蓋在肩膀上的三角形肌肉，把手臂往前、往旁邊、往後抬起來。', match: 'part of deltoid' },
    { zh: '肩胛穩定肌', en: 'Scapular stabilisers', kid: '把肩胛骨穩穩貼在背上的肌肉，手才有穩固的底座可以出力。', match: 'serratus anterior|rhomboid|part of trapezius|levator scapulae|pectoralis minor' },
    { zh: '斜方肌', en: 'Trapezius', kid: '背上像風箏的大肌肉，聳肩、夾背、把肩胛骨往下拉都靠它。', match: 'part of trapezius' },
    { zh: '胸大肌', en: 'Pectoralis major', kid: '胸前的大扇形肌肉，做伏地挺身和抱東西時用力。', match: 'pectoralis major' },
    { zh: '肱二頭肌', en: 'Biceps brachii', kid: '上臂前面的「小老鼠」，彎手肘、翻手掌朝上。', match: 'biceps brachii' },
    { zh: '肱三頭肌', en: 'Triceps brachii', kid: '上臂後面的肌肉，把彎起來的手肘伸直。', match: 'triceps brachii' },
    { zh: '前臂屈肌群', en: 'Forearm flexors', kid: '前臂掌心那一面的肌肉，彎手腕、握拳頭。', match: 'flexor carpi|palmaris longus|flexor digitorum (superficialis|profundus)|flexor pollicis longus|pronator' },
    { zh: '前臂伸肌群', en: 'Forearm extensors', kid: '前臂手背那一面的肌肉，把手腕和手指翹起來。', match: 'extensor carpi|^extensor digitorum$|extensor digiti minimi|extensor indicis|extensor pollicis|abductor pollicis longus|brachioradialis|supinator|anconeus' },
    { zh: '大魚際肌群', en: 'Thenar muscles', kid: '大拇指根部鼓鼓的那團肉，讓拇指能和其他手指對捏。', match: 'abductor pollicis brevis|flexor pollicis brevis|opponens pollicis|adductor pollicis' },
    { zh: '小魚際肌群', en: 'Hypothenar muscles', kid: '小指根部的那團肉，負責小指的活動。', match: '(abductor digiti minimi|flexor digiti minimi brevis|opponens digiti minimi) of hand' },
  ] },
  { cat: '軀幹與頭頸', items: [
    { zh: '核心肌群', en: 'Core', kid: '像一個桶子包住肚子和腰，讓身體中心穩穩的。', match: 'transversus abdominis|multifidus|^diaphragm$|internal oblique|pubococcygeus|iliococcygeus|puborectalis|coccygeus' },
    { zh: '腹肌群', en: 'Abdominal wall', kid: '肚子前面和兩側的肌肉，彎腰、轉身、咳嗽都靠它們。', match: 'rectus abdominis|external oblique|internal oblique|transversus abdominis|pyramidalis' },
    { zh: '豎脊肌', en: 'Erector spinae', kid: '脊椎兩旁長長的肌肉，讓你站直、往後仰。', match: 'iliocostalis|longissimus|spinalis' },
    { zh: '深層背肌（橫突棘肌）', en: 'Transversospinales', kid: '緊貼脊椎的小肌肉，一節一節微調、穩定脊椎。', match: 'multifidus|semispinalis|rotator' },
    { zh: '骨盆底肌', en: 'Pelvic floor', kid: '骨盆最下面像吊床的肌肉，托住內臟、幫忙憋尿。', match: 'coccygeus|iliococcygeus|pubococcygeus|puborectalis|external anal sphincter' },
    { zh: '呼吸肌', en: 'Muscles of respiration', kid: '讓胸腔變大變小、把空氣吸進吐出的肌肉。', match: '^diaphragm$|intercostal|scalenus|serratus posterior|levatores costarum' },
    { zh: '斜角肌', en: 'Scalenes', kid: '脖子兩側的三條肌肉，側彎脖子、用力吸氣時拉高肋骨。', match: 'scalenus' },
    { zh: '枕下肌群', en: 'Suboccipitals', kid: '後腦勺下面的四對小肌肉，負責點頭和轉頭的細微動作。', match: 'rectus capitis posterior|obliquus capitis' },
    { zh: '咀嚼肌', en: 'Muscles of mastication', kid: '讓下巴咬合、磨碎食物的肌肉。', match: 'masseter|temporalis|pterygoid' },
  ] },
  { cat: '髖與下肢', items: [
    { zh: '臀肌群', en: 'Gluteals', kid: '屁股的三層肌肉，站起來、走路時讓骨盆不歪掉。', match: 'gluteus' },
    { zh: '髂腰肌', en: 'Iliopsoas', kid: '從腰椎和骨盆連到大腿的深層肌肉，把大腿往上抬。', match: '^iliacus$|psoas major' },
    { zh: '深層髖外旋肌', en: 'Deep external rotators', kid: '屁股深處的六條小肌肉，把大腿向外轉。', match: 'piriformis|obturator|gemellus|quadratus femoris' },
    { zh: '股四頭肌', en: 'Quadriceps femoris', kid: '大腿前面的四條肌肉，把膝蓋伸直、踢球、爬樓梯。', match: 'rectus femoris|vastus' },
    { zh: '膕旁肌（腿後肌）', en: 'Hamstrings', kid: '大腿後面的肌肉，彎膝蓋、把大腿往後帶。', match: 'biceps femoris|semitendinosus|semimembranosus' },
    { zh: '內收肌群', en: 'Hip adductors', kid: '大腿內側的肌肉，把兩條腿夾起來。', match: '^adductor (longus|brevis|magnus|minimus)$|gracilis|pectineus' },
    { zh: '鵝足肌群', en: 'Pes anserinus', kid: '三條肌肉的肌腱在膝蓋內側下方排成鵝掌的形狀。', match: 'sartorius|gracilis|semitendinosus' },
    { zh: '小腿三頭肌', en: 'Triceps surae', kid: '小腿肚的肌肉，墊腳尖、跳躍、往前推進。', match: 'gastrocnemius|soleus|plantaris|calcaneal tendon' },
    { zh: '小腿前側肌群', en: 'Anterior compartment', kid: '小腿前面的肌肉，把腳板和腳趾往上勾。', match: 'tibialis anterior|extensor digitorum longus|extensor hallucis longus|fibularis tertius' },
    { zh: '腓骨肌群', en: 'Fibularis (peroneal) group', kid: '小腿外側的肌肉，把腳板往外翻，預防扭到腳。', match: 'fibularis (longus|brevis)' },
    { zh: '小腿後深層肌群', en: 'Deep posterior compartment', kid: '小腿深處的肌肉，撐住足弓、彎腳趾。', match: 'tibialis posterior|flexor digitorum longus|flexor hallucis longus|popliteus' },
    { zh: '足底內在肌', en: 'Intrinsic foot muscles', kid: '腳掌裡的小肌肉，撐住足弓、讓腳趾抓地。', match: 'of foot|abductor hallucis|flexor digitorum brevis|flexor accessorius|flexor hallucis brevis|adductor hallucis|extensor (digitorum|hallucis) brevis' },
  ] },
];

// Joint movements. Each step bends one joint; angles in degrees.
// `prime` / `assist` are regular expressions on the English name;
// a "R:" / "L:" prefix limits the match to one side, otherwise the
// movement's own side (or both for the trunk) is used.
const S = (joint, axis, to, from = 0) => ({ joint, axis, from, to });
export const MOTIONS = [
  { cat: '肩關節', items: [
    { id: 'sh-flex', zh: '肩屈曲', en: 'Shoulder flexion', rom: '0–180°（盂肱關節約 120°，其餘靠肩胛骨上轉）', kid: '手臂往前舉高，像舉手發問。', steps: [S('shoulder', 'flex', 110)], view: 'side',
      prime: ['clavicular part of deltoid', 'clavicular part of pectoralis major', 'coracobrachialis'], assist: ['biceps brachii'] },
    { id: 'sh-ext', zh: '肩伸展', en: 'Shoulder extension', rom: '0–60°', kid: '手臂往後擺，像走路時手往後甩。', steps: [S('shoulder', 'flex', -50)], view: 'side',
      prime: ['latissimus dorsi', 'teres major', 'spinal part of deltoid'], assist: ['long head of triceps brachii'] },
    { id: 'sh-abd', zh: '肩外展', en: 'Shoulder abduction', rom: '0–180°', kid: '手臂往旁邊抬高，像小鳥張開翅膀。', steps: [S('shoulder', 'abd', 95)], view: 'front',
      prime: ['acromial part of deltoid', 'supraspinatus'], assist: ['clavicular part of deltoid', 'spinal part of deltoid'] },
    { id: 'sh-add', zh: '肩內收', en: 'Shoulder adduction', rom: '從外展位回到身體旁', kid: '把張開的手臂夾回身體旁邊。', steps: [S('shoulder', 'abd', 0, 90)], view: 'front',
      prime: ['pectoralis major', 'latissimus dorsi', 'teres major'], assist: ['coracobrachialis', 'long head of triceps brachii'] },
    { id: 'sh-er', zh: '肩外旋', en: 'Shoulder external rotation', rom: '0–90°', kid: '手肘彎著貼在身邊，把前臂往外打開。', steps: [S('elbow', 'flex', 90, 90), S('shoulder', 'rot', 60)], view: 'top',
      prime: ['infraspinatus', 'teres minor'], assist: ['spinal part of deltoid'] },
    { id: 'sh-ir', zh: '肩內旋', en: 'Shoulder internal rotation', rom: '0–70°', kid: '手肘彎著貼在身邊，把前臂往肚子方向關起來。', steps: [S('elbow', 'flex', 90, 90), S('shoulder', 'rot', -65)], view: 'top',
      prime: ['subscapularis', 'pectoralis major', 'latissimus dorsi', 'teres major'], assist: ['clavicular part of deltoid'] },
  ] },
  { cat: '手肘與手腕', items: [
    { id: 'el-flex', zh: '肘屈曲', en: 'Elbow flexion', rom: '0–150°', kid: '把手肘彎起來，像把食物送到嘴邊。', steps: [S('elbow', 'flex', 135)], view: 'side',
      prime: ['brachialis', 'biceps brachii', 'brachioradialis'], assist: ['pronator teres'] },
    { id: 'el-ext', zh: '肘伸展', en: 'Elbow extension', rom: '從屈曲回到 0°', kid: '把彎著的手肘伸直，像把東西推開。', steps: [S('elbow', 'flex', 0, 130)], view: 'side',
      prime: ['triceps brachii'], assist: ['anconeus'] },
    { id: 'wr-flex', zh: '腕屈曲', en: 'Wrist flexion', rom: '0–80°', kid: '手掌往手心方向彎下去。', steps: [S('wrist', 'flex', 70)], view: 'side',
      prime: ['flexor carpi radialis', 'flexor carpi ulnaris', 'palmaris longus'], assist: ['flexor digitorum superficialis', 'flexor digitorum profundus'] },
    { id: 'wr-ext', zh: '腕伸展', en: 'Wrist extension', rom: '0–70°', kid: '手背往上翹，像叫人「停」的手勢。', steps: [S('wrist', 'flex', -65)], view: 'side',
      prime: ['extensor carpi radialis longus', 'extensor carpi radialis brevis', 'extensor carpi ulnaris'], assist: ['^extensor digitorum$'] },
  ] },
  { cat: '髖關節', items: [
    { id: 'hip-flex', zh: '髖屈曲', en: 'Hip flexion', rom: '0–120°', kid: '把大腿往前抬高，像原地踏步。', steps: [S('knee', 'flex', 70), S('hip', 'flex', 100)], view: 'side',
      prime: ['^iliacus$', 'psoas major', 'rectus femoris'], assist: ['sartorius', 'tensor fasciae latae', 'pectineus'] },
    { id: 'hip-ext', zh: '髖伸展', en: 'Hip extension', rom: '0–20°', kid: '把大腿往後踢，像走路時後腳往後推。', steps: [S('hip', 'flex', -25)], view: 'side',
      prime: ['gluteus maximus', 'long head of biceps femoris', 'semitendinosus', 'semimembranosus'], assist: ['adductor magnus'] },
    { id: 'hip-abd', zh: '髖外展', en: 'Hip abduction', rom: '0–45°', kid: '把腿往旁邊抬開。', steps: [S('hip', 'abd', 42)], view: 'front',
      prime: ['gluteus medius', 'gluteus minimus'], assist: ['tensor fasciae latae'] },
    { id: 'hip-add', zh: '髖內收', en: 'Hip adduction', rom: '從外展位回到中線（可再過中線 20–30°）', kid: '把張開的腿夾回來。', steps: [S('hip', 'abd', 0, 40)], view: 'front',
      prime: ['adductor longus', 'adductor brevis', 'adductor magnus', 'gracilis'], assist: ['pectineus'] },
    { id: 'hip-er', zh: '髖外旋', en: 'Hip external rotation', rom: '0–45°', kid: '把大腿向外轉，腳尖朝外。', steps: [S('hip', 'rot', 42)], view: 'front',
      prime: ['piriformis', 'obturator internus', 'obturator externus', 'gemellus', 'quadratus femoris'], assist: ['gluteus maximus', 'sartorius'] },
    { id: 'hip-ir', zh: '髖內旋', en: 'Hip internal rotation', rom: '0–40°', kid: '把大腿向內轉，腳尖朝內。', steps: [S('hip', 'rot', -35)], view: 'front',
      prime: ['gluteus minimus', 'gluteus medius'], assist: ['tensor fasciae latae'] },
  ] },
  { cat: '膝與踝', items: [
    { id: 'kn-flex', zh: '膝屈曲', en: 'Knee flexion', rom: '0–135°', kid: '把膝蓋彎起來，腳跟靠近屁股。', steps: [S('knee', 'flex', 125)], view: 'side',
      prime: ['biceps femoris', 'semitendinosus', 'semimembranosus'], assist: ['gastrocnemius', 'gracilis', 'sartorius', 'popliteus'] },
    { id: 'kn-ext', zh: '膝伸展', en: 'Knee extension', rom: '從屈曲回到 0°', kid: '把彎著的膝蓋伸直，像踢球。', steps: [S('knee', 'flex', 0, 110)], view: 'side',
      prime: ['rectus femoris', 'vastus lateralis', 'vastus medialis', 'vastus intermedius'], assist: [] },
    { id: 'an-df', zh: '踝背屈', en: 'Ankle dorsiflexion', rom: '0–20°', kid: '把腳板往上勾，用腳跟走路。', steps: [S('ankle', 'flex', 22)], view: 'side',
      prime: ['tibialis anterior'], assist: ['extensor digitorum longus', 'extensor hallucis longus', 'fibularis tertius'] },
    { id: 'an-pf', zh: '踝蹠屈', en: 'Ankle plantarflexion', rom: '0–50°', kid: '把腳板往下踩，像墊腳尖。', steps: [S('ankle', 'flex', -45)], view: 'side',
      prime: ['gastrocnemius', 'soleus'], assist: ['plantaris', 'tibialis posterior', 'flexor hallucis longus', 'flexor digitorum longus', 'fibularis longus', 'fibularis brevis'] },
  ] },
  { cat: '軀幹與頸部', both: true, items: [
    { id: 'tr-flex', zh: '軀幹前彎', en: 'Trunk flexion', rom: '0–80°（腰椎約 40–60°）', kid: '身體往前彎，像鞠躬。', steps: [S('trunk', 'flex', 55)], view: 'side',
      prime: ['rectus abdominis'], assist: ['external oblique', 'internal oblique', 'psoas major'] },
    { id: 'tr-ext', zh: '軀幹後仰', en: 'Trunk extension', rom: '0–25°', kid: '身體往後仰，像伸懶腰。', steps: [S('trunk', 'flex', -28)], view: 'side',
      prime: ['iliocostalis', 'longissimus thoracis', 'spinalis thoracis'], assist: ['multifidus', 'quadratus lumborum', 'semispinalis thoracis'] },
    { id: 'tr-side', zh: '軀幹右側彎', en: 'Trunk lateral flexion', rom: '0–35°', kid: '身體往右邊倒，像小茶壺倒水。', steps: [S('trunk', 'side', 30)], view: 'front',
      prime: ['R:quadratus lumborum', 'R:external oblique', 'R:internal oblique'], assist: ['R:iliocostalis', 'R:longissimus thoracis', 'R:rectus abdominis'] },
    { id: 'tr-rot', zh: '軀幹向左旋轉', en: 'Trunk rotation', rom: '0–45°', kid: '上半身轉向左邊，像回頭看後面。', steps: [S('trunk', 'rot', 40)], view: 'front',
      prime: ['R:external oblique', 'L:internal oblique'], assist: ['multifidus', 'rotator'] },
    { id: 'nk-flex', zh: '頸前屈', en: 'Neck flexion', rom: '0–50°', kid: '低頭，下巴靠近胸口。', steps: [S('neck', 'flex', 45)], view: 'side',
      prime: ['sternocleidomastoid', 'longus colli', 'longus capitis'], assist: ['scalenus anterior'] },
    { id: 'nk-ext', zh: '頸後仰', en: 'Neck extension', rom: '0–60°', kid: '抬頭看天花板。', steps: [S('neck', 'flex', -45)], view: 'side',
      prime: ['splenius capitis', 'semispinalis capitis', 'descending part of trapezius'], assist: ['splenius cervicis', 'rectus capitis posterior', 'longissimus capitis'] },
    { id: 'nk-side', zh: '頸右側彎', en: 'Neck lateral flexion', rom: '0–45°', kid: '耳朵靠向右邊肩膀。', steps: [S('neck', 'side', 38)], view: 'front',
      prime: ['R:scalenus', 'R:sternocleidomastoid'], assist: ['R:levator scapulae', 'R:splenius capitis', 'R:descending part of trapezius'] },
    { id: 'nk-rot', zh: '頸向左旋轉', en: 'Neck rotation', rom: '0–80°', kid: '轉頭看左邊。', steps: [S('neck', 'rot', 60)], view: 'front',
      prime: ['R:sternocleidomastoid', 'L:splenius capitis'], assist: ['L:obliquus capitis inferior', 'L:longissimus capitis'] },
  ] },
  { cat: '功能性動作', both: true, items: [
    { id: 'squat', zh: '深蹲', en: 'Squat', rom: '髖 ~95°、膝 ~110°、踝背屈 ~25°', kid: '像要坐椅子一樣蹲下去再站起來，腳掌一直踩在地上。', planted: true,
      steps: [S('ankle', 'flex', 25), S('knee', 'flex', 110), S('hip', 'flex', 97)], view: 'side',
      prime: ['gluteus maximus', 'rectus femoris', 'vastus lateralis', 'vastus medialis', 'vastus intermedius'], assist: ['soleus', 'adductor magnus', 'biceps femoris', 'semitendinosus', 'semimembranosus', 'iliocostalis', 'longissimus thoracis'] },
  ] },
];
