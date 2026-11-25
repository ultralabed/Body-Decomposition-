// Static lists shown in the UI: layers, body regions, functional muscle
// groups and joint movements.
// Text that is shown to people is written as a pair: [繁體中文, English].
// Use L(pair) from i18n.js to pick the current language.

export const GROUPS = [
  { id: 'skin', name: ['皮膚', 'Skin'], hint: ['身體最外面的外衣', 'The body\'s outer coat'] },
  { id: 'm1', name: ['淺層肌肉', 'Superficial muscles'], hint: ['皮膚底下第一層，摸得到的肌肉', 'First layer under the skin — the ones you can feel'] },
  { id: 'm2', name: ['中層肌肉', 'Intermediate muscles'], hint: ['藏在淺層肌肉下面', 'Hidden under the superficial layer'] },
  { id: 'm3', name: ['深層肌肉', 'Deep muscles'], hint: ['最裡面、貼著骨頭的肌肉', 'Deepest layer, lying against the bones'] },
  { id: 'bone', name: ['骨骼', 'Bones'], hint: ['撐起身體的骨頭和牙齒', 'Bones and teeth that hold the body up'] },
  { id: 'joint', name: ['軟骨與椎間盤', 'Cartilage & discs'], hint: ['骨頭之間的軟墊和連接', 'Soft cushions and links between bones'] },
  { id: 'organ', name: ['內臟', 'Organs'], hint: ['肺、肝、胃、腸、腎…', 'Lungs, liver, stomach, intestines, kidneys…'] },
  { id: 'vessel', name: ['心臟與血管', 'Heart & vessels'], hint: ['心臟和大條的動脈、靜脈', 'The heart and the large arteries and veins'] },
  { id: 'nerve', name: ['腦與神經', 'Brain & nerves'], hint: ['大腦、小腦、腦幹', 'Cerebrum, cerebellum and brainstem'] },
];

export const PEEL = [['皮膚', 'Skin'], ['淺層肌', 'Superf.'], ['中層肌', 'Middle'], ['深層肌', 'Deep'], ['骨骼', 'Bones']];

export const SYS = {
  skin: ['皮膚', 'Skin'], muscle: ['肌肉', 'Muscle'], tendon: ['肌腱／韌帶／筋膜', 'Tendon / ligament / fascia'], bone: ['骨骼', 'Bone'],
  joint: ['軟骨／椎間盤', 'Cartilage / disc'], organ: ['內臟', 'Organ'], vessel: ['心血管', 'Cardiovascular'], nerve: ['神經系統', 'Nervous system'],
};
export const LAYER = { 1: ['淺層', 'Superficial'], 2: ['中層', 'Intermediate'], 3: ['深層', 'Deep'] };
export const REGION = {
  head: ['頭部', 'Head'], neck: ['頸部', 'Neck'], chest: ['胸部', 'Chest'], abdomen: ['腹部', 'Abdomen'], back: ['背部', 'Back'], pelvis: ['骨盆', 'Pelvis'],
  shoulder: ['肩部', 'Shoulder'], arm: ['上臂', 'Upper arm'], forearm: ['前臂', 'Forearm'], hand: ['手部', 'Hand'],
  hip: ['髖部', 'Hip'], thigh: ['大腿', 'Thigh'], leg: ['小腿', 'Lower leg'], foot: ['足部', 'Foot'],
};
export const REGION_ORDER = Object.keys(REGION);

// Quick jumps. `regions` = which region tags belong to it (used for
// "only show this area"); `anchor` picks the spot to frame.
// dir = direction from the body towards the camera (x: body-left, y: up, z: front).
export const REGIONS = [
  { id: 'all', name: ['全身', 'Full body'], regions: null, dir: [0, 0.05, 1] },
  { id: 'head', name: ['頭部', 'Head'], regions: ['head'], dir: [-0.45, 0.05, 1] },
  { id: 'neck', name: ['頸部', 'Neck'], regions: ['neck', 'head'], frame: ['neck'], dir: [-0.6, 0.1, 1] },
  { id: 'shoulder', name: ['肩膀', 'Shoulder'], regions: ['shoulder', 'arm', 'chest', 'back', 'neck'], anchor: 'shoulder', r: 0.2, dir: [-0.7, 0.15, 1] },
  { id: 'elbow', name: ['手肘', 'Elbow'], regions: ['arm', 'forearm'], anchor: 'elbow', r: 0.17, dir: [-0.5, 0.05, 1] },
  { id: 'hand', name: ['手腕手掌', 'Wrist & hand'], regions: ['forearm', 'hand'], anchor: 'wrist', r: 0.15, dir: [-0.3, 0.1, 1] },
  { id: 'chest', name: ['胸部', 'Chest'], regions: ['chest', 'shoulder'], frame: ['chest'], dir: [0, 0.05, 1] },
  { id: 'abdomen', name: ['腹部', 'Abdomen'], regions: ['abdomen', 'pelvis'], frame: ['abdomen'], dir: [0, 0.05, 1] },
  { id: 'back', name: ['腰背', 'Back'], regions: ['back', 'neck', 'shoulder', 'pelvis', 'hip'], frame: ['back'], dir: [0.25, 0.1, -1] },
  { id: 'hip', name: ['髖部骨盆', 'Hip & pelvis'], regions: ['hip', 'pelvis', 'thigh'], anchor: 'hip', r: 0.24, dir: [-0.8, 0.05, 0.8] },
  { id: 'knee', name: ['膝蓋', 'Knee'], regions: ['thigh', 'leg'], anchor: 'knee', r: 0.19, dir: [-0.5, 0.05, 1] },
  { id: 'ankle', name: ['足踝', 'Ankle & foot'], regions: ['leg', 'foot'], anchor: 'ankle', r: 0.17, dir: [-1, 0.2, 0.7] },
];

// Functional muscle groups. `match` is a regular expression tested against
// the English structure name (without left/right).
const G = (zh, en, kidZh, kidEn, match) => ({ name: [zh, en], kid: [kidZh, kidEn], match });
export const MUSCLE_GROUPS = [
  { cat: ['肩與上肢', 'Shoulder & upper limb'], items: [
    G('旋轉肌袖', 'Rotator cuff', '四條小肌肉像袖子一樣抱住肩膀的球，讓手臂轉動時不會跑掉。', 'Four small muscles hug the ball of the shoulder like a cuff so it stays in place when the arm moves.', '^(supraspinatus|infraspinatus muscle|teres minor|subscapularis)$'),
    G('三角肌', 'Deltoid', '蓋在肩膀上的三角形肌肉，把手臂往前、往旁邊、往後抬起來。', 'The triangle-shaped cap on the shoulder that lifts the arm forward, sideways and backward.', 'part of deltoid'),
    G('肩胛穩定肌', 'Scapular stabilisers', '把肩胛骨穩穩貼在背上的肌肉，手才有穩固的底座可以出力。', 'Muscles that hold the shoulder blade steady on the back, giving the arm a firm base to push from.', 'serratus anterior|rhomboid|part of trapezius|levator scapulae|pectoralis minor'),
    G('斜方肌', 'Trapezius', '背上像風箏的大肌肉，聳肩、夾背、把肩胛骨往下拉都靠它。', 'The big kite-shaped muscle of the upper back: it shrugs, squeezes and pulls down the shoulder blades.', 'part of trapezius'),
    G('胸大肌', 'Pectoralis major', '胸前的大扇形肌肉，做伏地挺身和抱東西時用力。', 'The large fan-shaped chest muscle that works when you do push-ups or hug something.', 'pectoralis major'),
    G('肱二頭肌', 'Biceps brachii', '上臂前面的「小老鼠」，彎手肘、翻手掌朝上。', 'The bulge on the front of the upper arm: it bends the elbow and turns the palm up.', 'biceps brachii'),
    G('肱三頭肌', 'Triceps brachii', '上臂後面的肌肉，把彎起來的手肘伸直。', 'The muscle on the back of the upper arm that straightens a bent elbow.', 'triceps brachii'),
    G('前臂屈肌群', 'Forearm flexors', '前臂掌心那一面的肌肉，彎手腕、握拳頭。', 'Muscles on the palm side of the forearm that bend the wrist and make a fist.', 'flexor carpi|palmaris longus|flexor digitorum (superficialis|profundus)|flexor pollicis longus|pronator'),
    G('前臂伸肌群', 'Forearm extensors', '前臂手背那一面的肌肉，把手腕和手指翹起來。', 'Muscles on the back of the forearm that lift the wrist and fingers.', 'extensor carpi|^extensor digitorum$|extensor digiti minimi|extensor indicis|extensor pollicis|abductor pollicis longus|brachioradialis|supinator|anconeus'),
    G('大魚際肌群', 'Thenar muscles', '大拇指根部鼓鼓的那團肉，讓拇指能和其他手指對捏。', 'The fleshy pad at the base of the thumb that lets the thumb pinch against the fingers.', 'abductor pollicis brevis|flexor pollicis brevis|opponens pollicis|adductor pollicis'),
    G('小魚際肌群', 'Hypothenar muscles', '小指根部的那團肉，負責小指的活動。', 'The pad at the base of the little finger that moves the little finger.', '(abductor digiti minimi|flexor digiti minimi brevis|opponens digiti minimi) of hand'),
  ] },
  { cat: ['軀幹與頭頸', 'Trunk, head & neck'], items: [
    G('核心肌群', 'Core', '像一個桶子包住肚子和腰，讓身體中心穩穩的。', 'A barrel of muscles around the belly and lower back that keeps the middle of the body steady.', 'transversus abdominis|multifidus|^diaphragm$|internal oblique|pubococcygeus|iliococcygeus|puborectalis|coccygeus'),
    G('腹肌群', 'Abdominal wall', '肚子前面和兩側的肌肉，彎腰、轉身、咳嗽都靠它們。', 'Muscles on the front and sides of the belly used to bend, twist and cough.', 'rectus abdominis|external oblique|internal oblique|transversus abdominis|pyramidalis'),
    G('豎脊肌', 'Erector spinae', '脊椎兩旁長長的肌肉，讓你站直、往後仰。', 'Long muscles on both sides of the spine that keep you upright and bend you backward.', 'iliocostalis|longissimus|spinalis'),
    G('深層背肌（橫突棘肌）', 'Transversospinales', '緊貼脊椎的小肌肉，一節一節微調、穩定脊椎。', 'Small muscles right on the spine that fine-tune and steady it one segment at a time.', 'multifidus|semispinalis|rotator'),
    G('骨盆底肌', 'Pelvic floor', '骨盆最下面像吊床的肌肉，托住內臟、幫忙憋尿。', 'A hammock of muscle at the bottom of the pelvis that holds up the organs and helps you hold your pee.', 'coccygeus|iliococcygeus|pubococcygeus|puborectalis|external anal sphincter'),
    G('呼吸肌', 'Muscles of respiration', '讓胸腔變大變小、把空氣吸進吐出的肌肉。', 'Muscles that make the chest bigger and smaller to breathe air in and out.', '^diaphragm$|intercostal|scalenus|serratus posterior|levatores costarum'),
    G('斜角肌', 'Scalenes', '脖子兩側的三條肌肉，側彎脖子、用力吸氣時拉高肋骨。', 'Three muscles on each side of the neck that tilt the neck and lift the ribs on a deep breath.', 'scalenus'),
    G('枕下肌群', 'Suboccipitals', '後腦勺下面的四對小肌肉，負責點頭和轉頭的細微動作。', 'Four pairs of tiny muscles under the back of the skull for small nodding and turning movements.', 'rectus capitis posterior|obliquus capitis'),
    G('咀嚼肌', 'Muscles of mastication', '讓下巴咬合、磨碎食物的肌肉。', 'Muscles that close the jaw and grind food.', 'masseter|temporalis|pterygoid'),
  ] },
  { cat: ['髖與下肢', 'Hip & lower limb'], items: [
    G('臀肌群', 'Gluteals', '屁股的三層肌肉，站起來、走路時讓骨盆不歪掉。', 'Three layers of buttock muscle that help you stand up and keep the pelvis level when you walk.', 'gluteus'),
    G('髂腰肌', 'Iliopsoas', '從腰椎和骨盆連到大腿的深層肌肉，把大腿往上抬。', 'A deep muscle from the lower spine and pelvis to the thigh that lifts the thigh up.', '^iliacus$|psoas major'),
    G('深層髖外旋肌', 'Deep external rotators', '屁股深處的六條小肌肉，把大腿向外轉。', 'Six small muscles deep in the buttock that turn the thigh outward.', 'piriformis|obturator|gemellus|quadratus femoris'),
    G('股四頭肌', 'Quadriceps femoris', '大腿前面的四條肌肉，把膝蓋伸直、踢球、爬樓梯。', 'Four muscles on the front of the thigh that straighten the knee for kicking and climbing stairs.', 'rectus femoris|vastus'),
    G('膕旁肌（腿後肌）', 'Hamstrings', '大腿後面的肌肉，彎膝蓋、把大腿往後帶。', 'Muscles on the back of the thigh that bend the knee and pull the thigh backward.', 'biceps femoris|semitendinosus|semimembranosus'),
    G('內收肌群', 'Hip adductors', '大腿內側的肌肉，把兩條腿夾起來。', 'Inner-thigh muscles that squeeze the legs together.', '^adductor (longus|brevis|magnus|minimus)$|gracilis|pectineus'),
    G('鵝足肌群', 'Pes anserinus', '三條肌肉的肌腱在膝蓋內側下方排成鵝掌的形狀。', 'Three tendons that fan out like a goose\'s foot just below the inner side of the knee.', 'sartorius|gracilis|semitendinosus'),
    G('小腿三頭肌', 'Triceps surae', '小腿肚的肌肉，墊腳尖、跳躍、往前推進。', 'The calf muscles used to stand on tiptoe, jump and push off.', 'gastrocnemius|soleus|plantaris|calcaneal tendon'),
    G('小腿前側肌群', 'Anterior compartment', '小腿前面的肌肉，把腳板和腳趾往上勾。', 'Muscles on the front of the shin that pull the foot and toes upward.', 'tibialis anterior|extensor digitorum longus|extensor hallucis longus|fibularis tertius'),
    G('腓骨肌群', 'Fibularis (peroneal) group', '小腿外側的肌肉，把腳板往外翻，預防扭到腳。', 'Muscles on the outside of the lower leg that turn the sole outward and guard against ankle sprains.', 'fibularis (longus|brevis)'),
    G('小腿後深層肌群', 'Deep posterior compartment', '小腿深處的肌肉，撐住足弓、彎腳趾。', 'Deep calf muscles that hold up the arch of the foot and curl the toes.', 'tibialis posterior|flexor digitorum longus|flexor hallucis longus|popliteus'),
    G('足底內在肌', 'Intrinsic foot muscles', '腳掌裡的小肌肉，撐住足弓、讓腳趾抓地。', 'Small muscles inside the foot that support the arch and let the toes grip the ground.', 'of foot|abductor hallucis|flexor digitorum brevis|flexor accessorius|flexor hallucis brevis|adductor hallucis|extensor (digitorum|hallucis) brevis'),
  ] },
];

// Joint movements. Each step bends one joint; angles in degrees.
// `prime` / `assist` are regular expressions on the English name;
// a "R:" / "L:" prefix limits the match to one side, otherwise the
// movement's own side (or both for the trunk) is used.
const S = (joint, axis, to, from = 0) => ({ joint, axis, from, to });
const M = (id, name, rom, kid, steps, view, prime, assist, extra = {}) => ({ id, name, rom, kid, steps, view, prime, assist, ...extra });
export const MOTIONS = [
  { cat: ['肩關節', 'Shoulder'], items: [
    M('sh-flex', ['肩屈曲', 'Shoulder flexion'], ['0–180°（盂肱關節約 120°，其餘靠肩胛骨上轉）', '0–180° (about 120° at the glenohumeral joint; the rest is scapular upward rotation)'], ['手臂往前舉高，像舉手發問。', 'Lift the arm forward and up, like raising your hand in class.'],
      [S('shoulder', 'flex', 110)], 'side', ['clavicular part of deltoid', 'clavicular part of pectoralis major', 'coracobrachialis'], ['biceps brachii']),
    M('sh-ext', ['肩伸展', 'Shoulder extension'], ['0–60°', '0–60°'], ['手臂往後擺，像走路時手往後甩。', 'Swing the arm backward, like the back-swing when you walk.'],
      [S('shoulder', 'flex', -50)], 'side', ['latissimus dorsi', 'teres major', 'spinal part of deltoid'], ['long head of triceps brachii']),
    M('sh-abd', ['肩外展', 'Shoulder abduction'], ['0–180°', '0–180°'], ['手臂往旁邊抬高，像小鳥張開翅膀。', 'Lift the arm out to the side, like a bird opening its wing.'],
      [S('shoulder', 'abd', 95)], 'front', ['acromial part of deltoid', 'supraspinatus'], ['clavicular part of deltoid', 'spinal part of deltoid']),
    M('sh-add', ['肩內收', 'Shoulder adduction'], ['從外展位回到身體旁', 'From the abducted position back to the side'], ['把張開的手臂夾回身體旁邊。', 'Bring the raised arm back down to your side.'],
      [S('shoulder', 'abd', 0, 90)], 'front', ['pectoralis major', 'latissimus dorsi', 'teres major'], ['coracobrachialis', 'long head of triceps brachii']),
    M('sh-er', ['肩外旋', 'Shoulder external rotation'], ['0–90°', '0–90°'], ['手肘彎著貼在身邊，把前臂往外打開。', 'With the elbow bent at your side, swing the forearm outward like opening a door.'],
      [S('elbow', 'flex', 90, 90), S('shoulder', 'rot', 60)], 'top', ['infraspinatus', 'teres minor'], ['spinal part of deltoid']),
    M('sh-ir', ['肩內旋', 'Shoulder internal rotation'], ['0–70°', '0–70°'], ['手肘彎著貼在身邊，把前臂往肚子方向關起來。', 'With the elbow bent at your side, swing the forearm in toward the belly.'],
      [S('elbow', 'flex', 90, 90), S('shoulder', 'rot', -65)], 'top', ['subscapularis', 'pectoralis major', 'latissimus dorsi', 'teres major'], ['clavicular part of deltoid']),
  ] },
  { cat: ['手肘與手腕', 'Elbow & wrist'], items: [
    M('el-flex', ['肘屈曲', 'Elbow flexion'], ['0–150°', '0–150°'], ['把手肘彎起來，像把食物送到嘴邊。', 'Bend the elbow, like bringing food to your mouth.'],
      [S('elbow', 'flex', 135)], 'side', ['brachialis', 'biceps brachii', 'brachioradialis'], ['pronator teres']),
    M('el-ext', ['肘伸展', 'Elbow extension'], ['從屈曲回到 0°', 'From flexion back to 0°'], ['把彎著的手肘伸直，像把東西推開。', 'Straighten the bent elbow, like pushing something away.'],
      [S('elbow', 'flex', 0, 130)], 'side', ['triceps brachii'], ['anconeus']),
    M('wr-flex', ['腕屈曲', 'Wrist flexion'], ['0–80°', '0–80°'], ['手掌往手心方向彎下去。', 'Bend the hand toward the palm side.'],
      [S('wrist', 'flex', 70)], 'side', ['flexor carpi radialis', 'flexor carpi ulnaris', 'palmaris longus'], ['flexor digitorum superficialis', 'flexor digitorum profundus']),
    M('wr-ext', ['腕伸展', 'Wrist extension'], ['0–70°', '0–70°'], ['手背往上翹，像叫人「停」的手勢。', 'Tip the back of the hand up, like a "stop" sign.'],
      [S('wrist', 'flex', -65)], 'side', ['extensor carpi radialis longus', 'extensor carpi radialis brevis', 'extensor carpi ulnaris'], ['^extensor digitorum$']),
  ] },
  { cat: ['髖關節', 'Hip'], items: [
    M('hip-flex', ['髖屈曲', 'Hip flexion'], ['0–120°', '0–120°'], ['把大腿往前抬高，像原地踏步。', 'Lift the thigh up in front, like marching on the spot.'],
      [S('knee', 'flex', 70), S('hip', 'flex', 100)], 'side', ['^iliacus$', 'psoas major', 'rectus femoris'], ['sartorius', 'tensor fasciae latae', 'pectineus']),
    M('hip-ext', ['髖伸展', 'Hip extension'], ['0–20°', '0–20°'], ['把大腿往後踢，像走路時後腳往後推。', 'Move the thigh backward, like the push-off leg when walking.'],
      [S('hip', 'flex', -25)], 'side', ['gluteus maximus', 'long head of biceps femoris', 'semitendinosus', 'semimembranosus'], ['adductor magnus']),
    M('hip-abd', ['髖外展', 'Hip abduction'], ['0–45°', '0–45°'], ['把腿往旁邊抬開。', 'Lift the leg out to the side.'],
      [S('hip', 'abd', 42)], 'front', ['gluteus medius', 'gluteus minimus'], ['tensor fasciae latae']),
    M('hip-add', ['髖內收', 'Hip adduction'], ['從外展位回到中線（可再過中線 20–30°）', 'From abduction back to the midline (and 20–30° past it)'], ['把張開的腿夾回來。', 'Bring the lifted leg back in.'],
      [S('hip', 'abd', 0, 40)], 'front', ['adductor longus', 'adductor brevis', 'adductor magnus', 'gracilis'], ['pectineus']),
    M('hip-er', ['髖外旋', 'Hip external rotation'], ['0–45°', '0–45°'], ['把大腿向外轉，腳尖朝外。', 'Turn the thigh outward so the toes point out.'],
      [S('hip', 'rot', 42)], 'front', ['piriformis', 'obturator internus', 'obturator externus', 'gemellus', 'quadratus femoris'], ['gluteus maximus', 'sartorius']),
    M('hip-ir', ['髖內旋', 'Hip internal rotation'], ['0–40°', '0–40°'], ['把大腿向內轉，腳尖朝內。', 'Turn the thigh inward so the toes point in.'],
      [S('hip', 'rot', -35)], 'front', ['gluteus minimus', 'gluteus medius'], ['tensor fasciae latae']),
  ] },
  { cat: ['膝與踝', 'Knee & ankle'], items: [
    M('kn-flex', ['膝屈曲', 'Knee flexion'], ['0–135°', '0–135°'], ['把膝蓋彎起來，腳跟靠近屁股。', 'Bend the knee so the heel moves toward the buttock.'],
      [S('knee', 'flex', 125)], 'side', ['biceps femoris', 'semitendinosus', 'semimembranosus'], ['gastrocnemius', 'gracilis', 'sartorius', 'popliteus']),
    M('kn-ext', ['膝伸展', 'Knee extension'], ['從屈曲回到 0°', 'From flexion back to 0°'], ['把彎著的膝蓋伸直，像踢球。', 'Straighten the bent knee, like kicking a ball.'],
      [S('knee', 'flex', 0, 110)], 'side', ['rectus femoris', 'vastus lateralis', 'vastus medialis', 'vastus intermedius'], []),
    M('an-df', ['踝背屈', 'Ankle dorsiflexion'], ['0–20°', '0–20°'], ['把腳板往上勾，用腳跟走路。', 'Pull the foot up toward the shin, like walking on your heels.'],
      [S('ankle', 'flex', 22)], 'side', ['tibialis anterior'], ['extensor digitorum longus', 'extensor hallucis longus', 'fibularis tertius']),
    M('an-pf', ['踝蹠屈', 'Ankle plantarflexion'], ['0–50°', '0–50°'], ['把腳板往下踩，像墊腳尖。', 'Point the foot down, like standing on tiptoe.'],
      [S('ankle', 'flex', -45)], 'side', ['gastrocnemius', 'soleus'], ['plantaris', 'tibialis posterior', 'flexor hallucis longus', 'flexor digitorum longus', 'fibularis longus', 'fibularis brevis']),
  ] },
  { cat: ['軀幹與頸部', 'Trunk & neck'], both: true, items: [
    M('tr-flex', ['軀幹前彎', 'Trunk flexion'], ['0–80°（腰椎約 40–60°）', '0–80° (about 40–60° from the lumbar spine)'], ['身體往前彎，像鞠躬。', 'Bend the body forward, like taking a bow.'],
      [S('trunk', 'flex', 55)], 'side', ['rectus abdominis'], ['external oblique', 'internal oblique', 'psoas major']),
    M('tr-ext', ['軀幹後仰', 'Trunk extension'], ['0–25°', '0–25°'], ['身體往後仰，像伸懶腰。', 'Lean the body backward, like a big stretch.'],
      [S('trunk', 'flex', -28)], 'side', ['iliocostalis', 'longissimus thoracis', 'spinalis thoracis'], ['multifidus', 'quadratus lumborum', 'semispinalis thoracis']),
    M('tr-side', ['軀幹右側彎', 'Trunk lateral flexion (right)'], ['0–35°', '0–35°'], ['身體往右邊倒，像小茶壺倒水。', 'Tip the body to the right, like a little teapot pouring.'],
      [S('trunk', 'side', 30)], 'front', ['R:quadratus lumborum', 'R:external oblique', 'R:internal oblique'], ['R:iliocostalis', 'R:longissimus thoracis', 'R:rectus abdominis']),
    M('tr-rot', ['軀幹向左旋轉', 'Trunk rotation (to the left)'], ['0–45°', '0–45°'], ['上半身轉向左邊，像回頭看後面。', 'Twist the upper body to the left, like looking behind you.'],
      [S('trunk', 'rot', 40)], 'front', ['R:external oblique', 'L:internal oblique'], ['multifidus', 'rotator']),
    M('nk-flex', ['頸前屈', 'Neck flexion'], ['0–50°', '0–50°'], ['低頭，下巴靠近胸口。', 'Nod the head down, chin toward the chest.'],
      [S('neck', 'flex', 45)], 'side', ['sternocleidomastoid', 'longus colli', 'longus capitis'], ['scalenus anterior']),
    M('nk-ext', ['頸後仰', 'Neck extension'], ['0–60°', '0–60°'], ['抬頭看天花板。', 'Look up at the ceiling.'],
      [S('neck', 'flex', -45)], 'side', ['splenius capitis', 'semispinalis capitis', 'descending part of trapezius'], ['splenius cervicis', 'rectus capitis posterior', 'longissimus capitis']),
    M('nk-side', ['頸右側彎', 'Neck lateral flexion (right)'], ['0–45°', '0–45°'], ['耳朵靠向右邊肩膀。', 'Tip the ear toward the right shoulder.'],
      [S('neck', 'side', 38)], 'front', ['R:scalenus', 'R:sternocleidomastoid'], ['R:levator scapulae', 'R:splenius capitis', 'R:descending part of trapezius']),
    M('nk-rot', ['頸向左旋轉', 'Neck rotation (to the left)'], ['0–80°', '0–80°'], ['轉頭看左邊。', 'Turn the head to look left.'],
      [S('neck', 'rot', 60)], 'front', ['R:sternocleidomastoid', 'L:splenius capitis'], ['L:obliquus capitis inferior', 'L:longissimus capitis']),
  ] },
  { cat: ['功能性動作', 'Functional movement'], both: true, items: [
    M('squat', ['深蹲', 'Squat'], ['髖 ~95°、膝 ~110°、踝背屈 ~25°', 'Hip ~95°, knee ~110°, ankle dorsiflexion ~25°'], ['像要坐椅子一樣蹲下去再站起來，腳掌一直踩在地上。', 'Sit down as if onto a chair and stand back up, keeping the feet flat on the floor.'],
      [S('ankle', 'flex', 25), S('knee', 'flex', 110), S('hip', 'flex', 97)], 'side',
      ['gluteus maximus', 'rectus femoris', 'vastus lateralis', 'vastus medialis', 'vastus intermedius'],
      ['soleus', 'adductor magnus', 'biceps femoris', 'semitendinosus', 'semimembranosus', 'iliocostalis', 'longissimus thoracis'], { planted: true }),
  ] },
];

// Pairs of opposite movements: the prime movers of one are the antagonists
// of the other.
const OPP_PAIRS = [['sh-flex', 'sh-ext'], ['sh-abd', 'sh-add'], ['sh-er', 'sh-ir'], ['el-flex', 'el-ext'], ['wr-flex', 'wr-ext'],
  ['hip-flex', 'hip-ext'], ['hip-abd', 'hip-add'], ['hip-er', 'hip-ir'], ['kn-flex', 'kn-ext'], ['an-df', 'an-pf'], ['tr-flex', 'tr-ext'], ['nk-flex', 'nk-ext']];
export const OPPOSITE = Object.fromEntries(OPP_PAIRS.flatMap(([a, b]) => [[a, b], [b, a]]));

// Peripheral nerves. `match` is tested (case-insensitive) against the English
// innervation text of each muscle when the data is built (tools/02-build-data.mjs),
// which stores the matching ids on the muscle as `nv`.
const N = (id, zh, en, match) => ({ id, name: [zh, en], match });
export const NERVES = [
  { cat: ['上肢', 'Upper limb'], items: [
    N('accessory', '副神經（第 11 對腦神經）', 'Accessory nerve (CN XI)', 'accessory nerve'),
    N('dorsal-scapular', '肩胛背神經', 'Dorsal scapular nerve', 'dorsal scapular'),
    N('long-thoracic', '胸長神經', 'Long thoracic nerve', 'long thoracic'),
    N('suprascapular', '肩胛上神經', 'Suprascapular nerve', 'suprascapular'),
    N('subscapular', '肩胛下神經', 'Subscapular nerves', 'subscapular nerve'),
    N('thoracodorsal', '胸背神經', 'Thoracodorsal nerve', 'thoracodorsal'),
    N('pectoral', '胸內側與胸外側神經', 'Medial & lateral pectoral nerves', 'pectoral nerve'),
    N('subclavius', '鎖骨下肌神經', 'Nerve to subclavius', 'nerve to subclavius'),
    N('axillary', '腋神經', 'Axillary nerve', 'axillary nerve'),
    N('musculocutaneous', '肌皮神經', 'Musculocutaneous nerve', 'musculocutaneous'),
    N('radial', '橈神經（含後骨間神經）', 'Radial nerve (incl. posterior interosseous)', 'radial nerve|posterior interosseous'),
    N('median', '正中神經（含前骨間神經）', 'Median nerve (incl. anterior interosseous)', 'median nerve|anterior interosseous'),
    N('ulnar', '尺神經', 'Ulnar nerve', 'ulnar nerve'),
  ] },
  { cat: ['下肢', 'Lower limb'], items: [
    N('femoral', '股神經', 'Femoral nerve', 'femoral nerve'),
    N('obturator', '閉孔神經', 'Obturator nerve', 'obturator nerve'),
    N('superior-gluteal', '臀上神經', 'Superior gluteal nerve', 'superior gluteal'),
    N('inferior-gluteal', '臀下神經', 'Inferior gluteal nerve', 'inferior gluteal'),
    N('sacral-branches', '薦神經叢的直接分支', 'Direct branches of the sacral plexus', 'nerve to (obturator internus|piriformis|quadratus femoris)'),
    N('tibial', '脛神經（含坐骨神經脛側）', 'Tibial nerve (incl. tibial part of sciatic)', 'tibial nerve|tibial division'),
    N('common-fibular', '腓總神經（坐骨神經腓側）', 'Common fibular part of the sciatic nerve', 'common fibular'),
    N('deep-fibular', '腓深神經', 'Deep fibular nerve', 'deep fibular'),
    N('superficial-fibular', '腓淺神經', 'Superficial fibular nerve', 'superficial fibular'),
    N('medial-plantar', '足底內側神經', 'Medial plantar nerve', 'medial plantar'),
    N('lateral-plantar', '足底外側神經', 'Lateral plantar nerve', 'lateral plantar'),
  ] },
  { cat: ['頭頸與軀幹', 'Head, neck & trunk'], items: [
    N('facial', '顏面神經（第 7 對腦神經）', 'Facial nerve (CN VII)', 'facial nerve'),
    N('trigeminal', '三叉神經下頜支（V3）', 'Mandibular division of the trigeminal nerve (V3)', 'mandibular nerve|mandibular division|V3'),
    N('cervical', '頸神經前支（含頸襻）', 'Anterior rami of cervical nerves (incl. ansa cervicalis)', 'ansa cervicalis|hypoglossal|anterior rami of (the )?cervical|anterior rami of C\\d|anterior rami \\(lateral part\\)'),
    N('suboccipital', '枕下神經', 'Suboccipital nerve', 'suboccipital nerve'),
    N('phrenic', '膈神經', 'Phrenic nerve', 'phrenic nerve'),
    N('intercostal', '肋間神經（含胸腹神經、肋下神經）', 'Intercostal, thoracoabdominal & subcostal nerves', 'intercostal nerve|thoracoabdominal|subcostal'),
    N('lumbar-branches', '腰神經叢的直接分支', 'Direct branches of the lumbar plexus', 'anterior rami of (the )?lumbar|anterior rami of T12'),
    N('posterior-rami', '脊神經後支', 'Posterior rami of spinal nerves', 'posterior rami|posterior ramus'),
    N('pudendal', '陰部神經與骨盆底分支', 'Pudendal nerve & pelvic floor branches', 'pudendal|levator ani|anterior rami of the sacral'),
  ] },
];
export const ROOTS = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12', 'L1', 'L2', 'L3', 'L4', 'L5', 'S1', 'S2', 'S3', 'S4', 'S5'];

// Strength-training exercises: which muscles do the work.
// prime = main movers, assist = helpers, stab = stabilisers.
// Patterns are regular expressions on the English name. They refer to the
// working side unless prefixed: "B:" both sides, "O:" the opposite side.
// `joints` lists related joint movements (ids from MOTIONS).
const X = (id, name, kid, note, view, prime, assist, stab, joints) => ({ id, name, kid, note, view, prime, assist, stab, joints });
export const EXERCISES = [
  X('bss', ['保加利亞分腿蹲', 'Bulgarian split squat'],
    ['後腳放在椅子上，用前腳蹲下去再站起來，一次練一條腿。', 'Put the back foot up on a bench, then squat down and stand up on the front leg: one leg at a time.'],
    ['前腳的臀大肌和股四頭肌出力最多。臀中肌負責不讓骨盆歪掉、膝蓋往內倒。後腳的股直肌和髂腰肌這時是被拉長的。身體越往前傾，臀部和腿後出力越多；身體越直，股四頭肌出力越多。',
      'The gluteus maximus and quadriceps of the front leg do most of the work. Gluteus medius keeps the pelvis level and stops the knee falling inward. On the rear leg, rectus femoris and iliopsoas are being lengthened. Leaning the trunk forward shifts work to the glutes and hamstrings; staying upright shifts it to the quadriceps.'],
    'side',
    ['gluteus maximus', 'rectus femoris', 'vastus lateralis', 'vastus medialis', 'vastus intermedius'],
    ['adductor magnus', 'long head of biceps femoris', 'semitendinosus', 'semimembranosus', 'soleus'],
    ['gluteus medius', 'gluteus minimus', 'tensor fasciae latae', 'B:transversus abdominis', 'B:external oblique', 'B:iliocostalis lumborum', 'B:longissimus thoracis', 'B:multifidus'],
    ['hip-ext', 'kn-ext']),
  X('ohp', ['單手肩推', 'Single-arm shoulder press'],
    ['一隻手把重量從肩膀旁邊往上推到頭頂。', 'Push a weight from beside the shoulder straight up overhead with one arm.'],
    ['三角肌前束和中束把手臂抬起來，肱三頭肌把手肘伸直。要推到頭頂，肩胛骨必須往上轉，這靠前鋸肌和上、下斜方肌。因為只有一邊拿重量，另一側的腹斜肌和腰方肌要出力，身體才不會歪向一邊。',
      'The front and middle deltoid raise the arm and triceps straightens the elbow. Reaching overhead needs the shoulder blade to rotate upward, which is done by serratus anterior with the upper and lower trapezius. Because the load is on one side, the obliques and quadratus lumborum of the other side work to stop the trunk leaning over.'],
    'front',
    ['clavicular part of deltoid', 'acromial part of deltoid', 'triceps brachii'],
    ['clavicular part of pectoralis major', 'serratus anterior', 'descending part of trapezius', 'ascending part of trapezius', 'supraspinatus'],
    ['infraspinatus', 'teres minor', 'subscapularis', 'O:external oblique', 'O:internal oblique', 'O:quadratus lumborum', 'B:transversus abdominis'],
    ['sh-abd', 'sh-flex', 'el-ext']),
  X('sldl', ['單腿硬舉', 'Single-leg deadlift'],
    ['單腳站著，身體往前彎、另一隻腳往後抬，再用屁股的力量站直。', 'Stand on one leg, hinge forward as the other leg lifts behind you, then use your bottom muscles to stand tall again.'],
    ['站立腳的臀大肌和膕旁肌負責把身體拉回直立。臀中肌讓骨盆保持水平、不往旁邊掉。豎脊肌讓背保持平直。小腿和足部的肌肉一直在微調平衡。',
      'Gluteus maximus and the hamstrings of the standing leg pull the trunk back upright. Gluteus medius keeps the pelvis level so it does not drop to the side. The erector spinae keep the back flat, and the lower-leg and foot muscles make constant small corrections for balance.'],
    'back',
    ['gluteus maximus', 'long head of biceps femoris', 'semitendinosus', 'semimembranosus'],
    ['adductor magnus', 'B:iliocostalis lumborum', 'B:longissimus thoracis', 'B:^spinalis thoracis$'],
    ['gluteus medius', 'gluteus minimus', 'B:multifidus', 'B:quadratus lumborum', 'B:transversus abdominis', 'tibialis posterior', 'tibialis anterior', 'fibularis longus', 'fibularis brevis', 'soleus'],
    ['hip-ext']),
  X('bench', ['單手臥推', 'Single-arm bench press'],
    ['躺在椅子上，用一隻手把重量從胸口旁邊往上推。', 'Lie on a bench and push a weight up from beside the chest with one arm.'],
    ['胸大肌把手臂往身體中間推，三角肌前束幫忙，肱三頭肌把手肘伸直。旋轉肌袖把肩膀的球穩在窩裡。因為只有一邊在推，身體會想往一邊轉，另一側的腹斜肌要出力抵抗。',
      'Pectoralis major drives the arm toward the midline, the front deltoid helps, and triceps straightens the elbow. The rotator cuff keeps the ball of the shoulder centred in its socket. With the load on one side the trunk wants to roll, so the obliques work to resist the rotation.'],
    'front',
    ['pectoralis major'],
    ['clavicular part of deltoid', 'triceps brachii', 'serratus anterior', 'coracobrachialis'],
    ['supraspinatus', 'infraspinatus', 'teres minor', 'subscapularis', 'O:external oblique', 'internal oblique', 'B:transversus abdominis'],
    ['sh-flex', 'el-ext']),
  X('row', ['單手划船', 'Single-arm row'],
    ['身體往前傾，用一隻手把重量拉向腰邊，像在拉割草機的繩子。', 'Lean forward and pull a weight up toward your waist with one arm, like starting a lawnmower.'],
    ['先把肩胛骨往後夾（菱形肌、中斜方肌），再用背闊肌把手肘往後拉；肱二頭肌、肱肌、肱橈肌幫忙彎手肘。豎脊肌和腹斜肌負責不讓身體跟著轉。前臂屈肌負責握緊。',
      'First squeeze the shoulder blade back (rhomboids and middle trapezius), then latissimus dorsi pulls the elbow backward while biceps, brachialis and brachioradialis bend the elbow. The erector spinae and obliques stop the trunk from twisting, and the forearm flexors hold the grip.'],
    'back',
    ['latissimus dorsi', 'rhomboid major', 'rhomboid minor', 'transverse part of trapezius'],
    ['teres major', 'spinal part of deltoid', 'ascending part of trapezius', 'biceps brachii', '^brachialis$', 'brachioradialis'],
    ['infraspinatus', 'teres minor', 'B:iliocostalis lumborum', 'B:longissimus thoracis', 'B:multifidus', 'O:external oblique', 'internal oblique', 'flexor digitorum superficialis', 'flexor digitorum profundus'],
    ['sh-ext', 'el-flex']),
];

// ---- more exercises, so that most muscles have something that trains them.
// `both: true` = a two-sided exercise (patterns then mean both sides).
// `cat` groups the list in the UI.
export const EXERCISE_CATS = [
  { id: 'mine', name: ['我的訓練', 'My training'] },
  { id: 'lower', name: ['下肢', 'Lower body'] },
  { id: 'upper', name: ['上肢與肩胛', 'Upper body & shoulder blade'] },
  { id: 'core', name: ['核心與頸部', 'Core & neck'] },
];
for (const x of EXERCISES) x.cat = 'mine';
const E = (id, cat, both, name, kid, view, prime, assist = [], stab = [], joints = []) => ({ id, cat, both, name, kid, view, prime, assist, stab, joints });
EXERCISES.push(
  // lower body
  E('squat', 'lower', true, ['深蹲', 'Squat'], ['像要坐椅子一樣蹲下去再站起來，兩腳一起出力。', 'Sit down as if onto a chair and stand back up, both legs working together.'], 'side',
    ['gluteus maximus', 'rectus femoris', 'vastus lateralis', 'vastus medialis', 'vastus intermedius'],
    ['adductor magnus', 'biceps femoris', 'semitendinosus', 'semimembranosus', 'soleus'],
    ['iliocostalis lumborum', 'longissimus thoracis', 'multifidus', 'transversus abdominis', 'external oblique', 'gluteus medius'], ['hip-ext', 'kn-ext']),
  E('deadlift', 'lower', true, ['硬舉', 'Deadlift'], ['背打直，用屁股和腿後的力量把地上的重量拉起來。', 'With a flat back, use your bottom and the back of your thighs to lift a weight off the floor.'], 'back',
    ['gluteus maximus', 'biceps femoris', 'semitendinosus', 'semimembranosus', 'iliocostalis lumborum', 'longissimus thoracis'],
    ['adductor magnus', 'rectus femoris', 'vastus lateralis', 'vastus medialis', 'vastus intermedius', 'latissimus dorsi', 'descending part of trapezius', 'transverse part of trapezius'],
    ['multifidus', 'quadratus lumborum', 'transversus abdominis', 'external oblique', 'rhomboid major', 'flexor digitorum superficialis', 'flexor digitorum profundus'], ['hip-ext']),
  E('bridge', 'lower', true, ['臀推／橋式', 'Hip thrust / glute bridge'], ['躺著把屁股往上頂高，夾緊屁股。', 'Lie on your back and push your hips up high, squeezing your bottom.'], 'side',
    ['gluteus maximus'], ['biceps femoris', 'semitendinosus', 'semimembranosus', 'adductor magnus'], ['gluteus medius', 'transversus abdominis', 'iliocostalis lumborum', 'multifidus'], ['hip-ext']),
  E('hip-abd', 'lower', false, ['側躺抬腿／彈力帶側走', 'Side-lying leg raise / banded side step'], ['把腿往旁邊抬開，練屁股側邊。', 'Lift the leg out to the side to work the side of your bottom.'], 'side',
    ['gluteus medius', 'gluteus minimus'], ['tensor fasciae latae', 'gluteus maximus'], ['quadratus lumborum', 'external oblique', 'internal oblique'], ['hip-abd']),
  E('clamshell', 'lower', false, ['蚌殼式', 'Clamshell'], ['側躺、膝蓋彎著，像蚌殼一樣把上面的膝蓋打開。', 'Lie on your side with knees bent and open the top knee like a clam.'], 'back',
    ['piriformis', 'obturator internus', 'obturator externus', 'gemellus', 'quadratus femoris', 'gluteus medius'], ['gluteus maximus', 'gluteus minimus'], ['external oblique', 'multifidus'], ['hip-er']),
  E('adductor', 'lower', true, ['夾球／哥本哈根側棒式', 'Adductor squeeze / Copenhagen plank'], ['兩腿往中間夾緊，練大腿內側。', 'Squeeze the legs together to work the inner thighs.'], 'front',
    ['adductor longus', 'adductor brevis', 'adductor magnus', 'gracilis'], ['pectineus', 'adductor minimus'], ['external oblique', 'internal oblique', 'transversus abdominis'], ['hip-add']),
  E('leg-ext', 'lower', true, ['腿伸展', 'Leg extension'], ['坐著把小腿往前踢直，專門練大腿前面。', 'Sitting down, straighten the knee against resistance to work the front of the thigh.'], 'front',
    ['rectus femoris', 'vastus lateralis', 'vastus medialis', 'vastus intermedius'], [], [], ['kn-ext']),
  E('leg-curl', 'lower', true, ['腿彎舉／北歐腿彎舉', 'Hamstring curl / Nordic curl'], ['把腳跟往屁股方向彎，專門練大腿後面。', 'Bend the heel toward your bottom to work the back of the thigh.'], 'back',
    ['biceps femoris', 'semitendinosus', 'semimembranosus'], ['gastrocnemius', 'gracilis', 'sartorius', 'popliteus'], [], ['kn-flex']),
  E('calf-raise', 'lower', true, ['提踵（墊腳尖）', 'Calf raise'], ['站著把腳跟抬高、墊起腳尖。膝蓋彎著做會更練到比目魚肌。', 'Stand and rise up onto your toes. Doing it with bent knees works soleus more.'], 'back',
    ['gastrocnemius', 'soleus'], ['plantaris', 'tibialis posterior', 'fibularis longus', 'fibularis brevis', 'flexor hallucis longus', 'flexor digitorum longus'], [], ['an-pf']),
  E('toe-raise', 'lower', true, ['勾腳尖（脛前肌抬腳）', 'Toe raise / tibialis raise'], ['腳跟踩地，把腳尖往上勾。', 'Keep the heels down and pull the toes up toward the shins.'], 'front',
    ['tibialis anterior'], ['extensor digitorum longus', 'extensor hallucis longus', 'fibularis tertius'], [], ['an-df']),
  E('knee-raise', 'lower', true, ['抬膝／懸吊抬腿', 'Knee raise / hanging leg raise'], ['把膝蓋往胸口抬高，練把大腿抬起來的肌肉。', 'Lift the knees toward the chest to work the muscles that raise the thigh.'], 'front',
    ['^iliacus$', 'psoas major', 'rectus femoris'], ['sartorius', 'tensor fasciae latae', 'pectineus', 'rectus abdominis'], ['external oblique', 'transversus abdominis'], ['hip-flex']),
  E('eversion', 'lower', false, ['彈力帶足外翻', 'Banded ankle eversion'], ['用彈力帶套住腳，把腳板往外翻，預防扭到腳。', 'With a band around the foot, turn the sole outward. It helps protect against ankle sprains.'], 'side',
    ['fibularis longus', 'fibularis brevis'], ['fibularis tertius', 'extensor digitorum longus']),
  E('short-foot', 'lower', true, ['縮足運動', 'Short-foot exercise'], ['腳趾不捲起來，把足弓往上拱，練腳掌裡的小肌肉。', 'Without curling the toes, draw the arch of the foot upward to work the small muscles inside the foot.'], 'side',
    ['abductor hallucis', 'flexor digitorum brevis', 'flexor hallucis brevis', 'flexor accessorius'], ['tibialis posterior', 'abductor digiti minimi of foot', 'lumbrical of foot']),
  // upper body and shoulder blade
  E('push-up', 'upper', true, ['伏地挺身', 'Push-up'], ['趴著用手把身體推離地面。', 'Face down, push your body away from the floor with your arms.'], 'front',
    ['pectoralis major', 'triceps brachii', 'clavicular part of deltoid'], ['serratus anterior', 'coracobrachialis', 'anconeus'],
    ['rectus abdominis', 'transversus abdominis', 'external oblique', 'infraspinatus', 'subscapularis', 'gluteus maximus'], ['sh-flex', 'el-ext']),
  E('pull-up', 'upper', true, ['引體向上／滑輪下拉', 'Pull-up / lat pulldown'], ['抓著單槓把身體往上拉，或坐著把橫桿往下拉。', 'Hang from a bar and pull yourself up, or sit and pull a bar down.'], 'back',
    ['latissimus dorsi', 'teres major'], ['biceps brachii', '^brachialis$', 'brachioradialis', 'rhomboid major', 'rhomboid minor', 'ascending part of trapezius', 'transverse part of trapezius', 'spinal part of deltoid', 'pectoralis minor'],
    ['infraspinatus', 'teres minor', 'rectus abdominis', 'flexor digitorum superficialis', 'flexor digitorum profundus'], ['sh-add', 'el-flex']),
  E('lateral-raise', 'upper', true, ['側平舉', 'Lateral raise'], ['手臂往兩旁抬到跟肩膀一樣高。', 'Lift the arms out to the sides up to shoulder height.'], 'front',
    ['acromial part of deltoid', 'supraspinatus'], ['clavicular part of deltoid', 'spinal part of deltoid', 'descending part of trapezius', 'serratus anterior'], ['infraspinatus', 'subscapularis'], ['sh-abd']),
  E('reverse-fly', 'upper', true, ['反向飛鳥／面拉', 'Reverse fly / face pull'], ['身體前傾，手臂往後張開，把肩胛骨往中間夾。', 'Leaning forward, open the arms backward and squeeze the shoulder blades together.'], 'back',
    ['spinal part of deltoid', 'transverse part of trapezius', 'rhomboid major', 'rhomboid minor'], ['infraspinatus', 'teres minor', 'ascending part of trapezius'], ['iliocostalis', 'longissimus thoracis']),
  E('ext-rot', 'upper', false, ['彈力帶肩外旋', 'Banded external rotation'], ['手肘貼在身邊，把前臂往外打開，練旋轉肌袖後面兩條。', 'Elbow tucked at your side, swing the forearm outward to work the two cuff muscles at the back.'], 'back',
    ['infraspinatus', 'teres minor'], ['spinal part of deltoid'], ['supraspinatus', 'transverse part of trapezius', 'rhomboid major'], ['sh-er']),
  E('int-rot', 'upper', false, ['彈力帶肩內旋', 'Banded internal rotation'], ['手肘貼在身邊，把前臂往肚子方向拉，練肩胛下肌。', 'Elbow tucked at your side, pull the forearm in toward the belly to work subscapularis.'], 'front',
    ['subscapularis'], ['pectoralis major', 'latissimus dorsi', 'teres major', 'clavicular part of deltoid'], [], ['sh-ir']),
  E('shrug', 'upper', true, ['聳肩', 'Shrug'], ['手拿重量，把肩膀往耳朵方向聳高。', 'Holding weights, lift the shoulders up toward the ears.'], 'back',
    ['descending part of trapezius', 'levator scapulae'], ['rhomboid major', 'rhomboid minor', 'transverse part of trapezius'], ['flexor digitorum superficialis', 'flexor digitorum profundus']),
  E('push-up-plus', 'upper', true, ['伏地挺身加強版／靠牆滑動', 'Push-up plus / wall slide'], ['手伸直後再把背往上頂一點，讓肩胛骨往前滑，練前鋸肌。', 'With arms straight, push a little further so the shoulder blades slide forward. This targets serratus anterior.'], 'side',
    ['serratus anterior'], ['pectoralis minor', 'pectoralis major', 'ascending part of trapezius'], ['rectus abdominis', 'transversus abdominis']),
  E('prone-y', 'upper', true, ['俯臥 Y 字上舉', 'Prone Y raise'], ['趴著，手臂往斜上方抬成 Y 字，練下斜方肌。', 'Lying face down, lift the arms up and out into a Y to work the lower trapezius.'], 'back',
    ['ascending part of trapezius'], ['transverse part of trapezius', 'serratus anterior', 'spinal part of deltoid', 'infraspinatus', 'supraspinatus'], ['iliocostalis thoracis', 'longissimus thoracis']),
  E('curl', 'upper', true, ['二頭彎舉', 'Biceps curl'], ['手拿重量把手肘彎起來。手掌朝內（錘式）會更練到肱橈肌。', 'Bend the elbow holding a weight. With the palm facing in (hammer curl) brachioradialis works harder.'], 'front',
    ['biceps brachii', '^brachialis$'], ['brachioradialis', 'pronator teres'], ['clavicular part of deltoid', 'flexor carpi radialis'], ['el-flex']),
  E('triceps-ext', 'upper', true, ['三頭下壓／過頭伸展', 'Triceps pushdown / overhead extension'], ['把彎著的手肘用力伸直。手舉過頭做會更練到長頭。', 'Straighten the bent elbow against resistance. Doing it overhead works the long head more.'], 'back',
    ['triceps brachii'], ['anconeus'], [], ['el-ext']),
  E('wrist-curl', 'upper', true, ['腕屈曲彎舉', 'Wrist curl'], ['前臂放在桌上、手心朝上，把手腕往上捲。', 'Forearm on a table, palm up, curl the wrist upward.'], 'front',
    ['flexor carpi radialis', 'flexor carpi ulnaris', 'palmaris longus'], ['flexor digitorum superficialis', 'flexor digitorum profundus'], [], ['wr-flex']),
  E('rev-wrist-curl', 'upper', true, ['腕伸展彎舉', 'Reverse wrist curl'], ['前臂放在桌上、手心朝下，把手背往上翹。常用來練網球肘相關的肌肉。', 'Forearm on a table, palm down, lift the back of the hand. Often used for the muscles involved in tennis elbow.'], 'back',
    ['extensor carpi radialis', 'extensor carpi ulnaris'], ['^extensor digitorum$', 'extensor digiti minimi', 'extensor indicis'], [], ['wr-ext']),
  E('grip', 'upper', true, ['握力訓練', 'Grip squeeze'], ['用力捏握力器或握住重物不放。', 'Squeeze a gripper hard, or hold on to something heavy.'], 'front',
    ['flexor digitorum superficialis', 'flexor digitorum profundus', 'flexor pollicis longus'], ['adductor pollicis', 'flexor pollicis brevis', 'opponens pollicis', 'flexor digiti minimi brevis of hand', 'palmar interossei', 'lumbricals of hand'], ['extensor carpi radialis']),
  E('pro-sup', 'upper', true, ['前臂旋前旋後（握錘子轉）', 'Forearm pronation / supination'], ['手握錘子，把手掌轉朝下再轉朝上。', 'Holding a hammer, turn the palm down and then up.'], 'front',
    ['pronator teres', 'pronator quadratus', 'supinator'], ['biceps brachii', 'brachioradialis']),
  E('finger-band', 'upper', true, ['手指張開（橡皮筋）', 'Finger spread with a band'], ['把橡皮筋套在手指上，用力把手指和拇指張開。', 'Put a rubber band around the fingers and thumb and spread them apart.'], 'back',
    ['dorsal interossei of hand', 'abductor digiti minimi of hand', '^extensor digitorum$'], ['abductor pollicis brevis', 'abductor pollicis longus', 'extensor pollicis brevis', 'extensor pollicis longus', 'extensor indicis']),
  E('towel-curl', 'lower', true, ['腳趾抓毛巾', 'Towel curl'], ['用腳趾把地上的毛巾一點一點抓過來。', 'Use your toes to scrunch a towel toward you along the floor.'], 'side',
    ['flexor digitorum brevis', 'flexor hallucis brevis', 'flexor digitorum longus', 'flexor hallucis longus'], ['lumbrical of foot', 'plantar interosseous of foot', 'dorsal interossei of foot', 'adductor hallucis', 'flexor digiti minimi brevis of foot', 'flexor accessorius']),
  // core and neck
  E('crunch', 'core', true, ['捲腹', 'Crunch / curl-up'], ['躺著把上半身捲起來一點，肚子用力。', 'Lying on your back, curl the upper body up a little using the tummy muscles.'], 'front',
    ['rectus abdominis'], ['external oblique', 'internal oblique', 'pyramidalis'], [], ['tr-flex']),
  E('plank', 'core', true, ['棒式／死蟲式', 'Plank / dead bug'], ['身體撐成一直線不動，肚子收緊。', 'Hold the body in one straight line without moving, tummy pulled in.'], 'front',
    ['transversus abdominis', 'rectus abdominis'], ['external oblique', 'internal oblique'], ['serratus anterior', 'gluteus maximus', 'rectus femoris', 'multifidus']),
  E('side-plank', 'core', false, ['側棒式', 'Side plank'], ['側躺用一隻手肘把身體撐起來成一直線，練身體側邊。', 'On your side, prop the body up on one elbow in a straight line to work the side of the trunk.'], 'front',
    ['external oblique', 'internal oblique', 'quadratus lumborum'], ['gluteus medius', 'gluteus minimus', 'B:transversus abdominis'], ['B:rectus abdominis', 'iliocostalis lumborum', 'serratus anterior'], ['tr-side']),
  E('twist', 'core', true, ['俄羅斯轉體／抗旋轉推', 'Russian twist / Pallof press'], ['坐著把上半身左右轉，或站著抵抗彈力帶把你拉歪。', 'Sitting, turn the trunk from side to side; or stand and resist a band that tries to twist you.'], 'front',
    ['external oblique', 'internal oblique'], ['rectus abdominis', 'transversus abdominis', 'multifidus', 'rotator'], [], ['tr-rot']),
  E('bird-dog', 'core', true, ['鳥狗式', 'Bird dog'], ['四足跪姿，把對側的手和腳同時伸直，背不能晃。', 'On hands and knees, stretch out the opposite arm and leg together without letting the back wobble.'], 'back',
    ['multifidus', 'iliocostalis lumborum', 'longissimus thoracis'], ['gluteus maximus', 'semispinalis thoracis', 'rotator'], ['transversus abdominis', 'external oblique', 'internal oblique', 'gluteus medius']),
  E('back-ext', 'core', true, ['背伸展／超人式', 'Back extension / superman'], ['趴著把上半身往上抬離地面。', 'Lying face down, lift the upper body off the floor.'], 'back',
    ['iliocostalis', 'longissimus thoracis', '^spinalis thoracis$'], ['multifidus', 'semispinalis thoracis', 'gluteus maximus', 'biceps femoris', 'semitendinosus', 'semimembranosus', 'quadratus lumborum'], [], ['tr-ext']),
  E('breathing', 'core', true, ['腹式呼吸', 'Diaphragmatic breathing'], ['吸氣時讓肚子鼓起來，練最主要的呼吸肌。', 'Let the belly rise as you breathe in. This works the main breathing muscle.'], 'front',
    ['^diaphragm$'], ['external intercostal', 'scalenus', 'transversus abdominis']),
  E('kegel', 'core', true, ['凱格爾運動', 'Pelvic floor (Kegel) exercise'], ['像憋尿一樣把骨盆底往上收緊，停一下再放鬆。', 'Tighten and lift the pelvic floor as if holding in pee, hold, then relax.'], 'front',
    ['pubococcygeus', 'puborectalis', 'iliococcygeus', 'coccygeus', 'external anal sphincter'], ['transversus abdominis']),
  E('chin-tuck', 'core', true, ['收下巴（深層頸屈肌訓練）', 'Chin tuck (deep neck flexors)'], ['把下巴往後收、做出雙下巴，練脖子前面深層的肌肉。', 'Draw the chin straight back to make a double chin. This works the deep muscles at the front of the neck.'], 'side',
    ['longus colli', 'longus capitis'], ['rectus capitis anterior'], [], ['nk-flex']),
  E('neck-ext', 'core', true, ['頸後伸等長收縮', 'Isometric neck extension'], ['手放在後腦勺，頭往後頂手但不動，練脖子後面。', 'Hand behind the head, press the head back into the hand without moving to work the back of the neck.'], 'back',
    ['splenius capitis', 'semispinalis capitis', 'splenius cervicis', 'semispinalis cervicis'], ['descending part of trapezius', 'longissimus capitis', 'rectus capitis posterior', 'obliquus capitis'], [], ['nk-ext']),
  E('neck-side', 'core', false, ['頸側彎等長收縮', 'Isometric neck side-bend'], ['手放在頭側，頭往旁邊頂手但不動，練脖子側邊。', 'Hand on the side of the head, press sideways into the hand without moving to work the side of the neck.'], 'front',
    ['scalenus', 'sternocleidomastoid'], ['levator scapulae', 'splenius capitis', 'descending part of trapezius'], [], ['nk-side']),
);
