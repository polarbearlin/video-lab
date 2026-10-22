// 生活安全课 01 · 闻到煤气味（歌曲版）· 1080×1920 · 79.2 s
// 每一帧都是时间 t 的纯函数：renderAt(t) 重建整张 SVG。
window.DEMO = { width: 1080, height: 1920, fps: 30, duration: 79.2 };

const C = {
  bg: '#F5F1EA', navy: '#2F4858', sage: '#8FB09A', sageD: '#6F9580', coral: '#E8735A',
  wall: '#EDE4D6', wall2: '#E4D8C6', wood: '#D9B48F', wood2: '#C89F78', cream: '#FBF7F0',
  skin: '#F2C6A0', hair: '#3B3A40', shirt: '#7C97A8', lav: '#B7A6D6', night: '#22313D', gold: '#F2C879',
  glass: '#DCE7E3', steel: '#CBD3D6', orange: '#E9A23B',
};
const SW = 6;
const st = `stroke="${C.navy}" stroke-width="${SW}" stroke-linejoin="round" stroke-linecap="round"`;

// ---------- 缓动 / 时间工具
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const eOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
const eIn = (t) => Math.pow(clamp(t), 3);
const eIO = (t) => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const eBack = (t) => { t = clamp(t); const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
// 弹出：0 → 1.15 → 1（约 8 帧）
const pop = (t, t0, d = .28) => t < t0 ? 0 : eBack((t - t0) / d);
const fade = (t, t0, d = .25) => clamp((t - t0) / d);
const wig = (t, f = 2, a = 1, s = 0) => Math.sin(t * f * 6.283 + s) * a;
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; }

let LY = [];                        // 歌词时间轴（lyrics_timed.json）
const charT = (li, ci) => LY[li].chars[Math.min(ci, LY[li].chars.length - 1)];
const lineStart = (li) => LY[li].start;

const G = (tr, body, extra = '') => `<g transform="${tr}" ${extra}>${body}</g>`;
const at = (x, y, s = 1, r = 0) => `translate(${x},${y}) rotate(${r}) scale(${s})`;

// ---------- 通用部件
const tag = (dark = false) => `<g transform="translate(70,120)">
    <rect width="292" height="64" rx="32" fill="${dark ? 'rgba(245,241,234,.14)' : C.navy}"/>
    <circle cx="34" cy="32" r="11" fill="${C.coral}"/>
    <text x="58" y="43" font-family="Sans" font-weight="700" font-size="30" fill="${C.cream}">生活安全课 · 01</text></g>`;

// 卡拉 OK 式字幕：按逐字时间浮现，关键词变色
const KEY = {
  2: { '怪味': C.coral }, 3: { '开灯': C.coral }, 4: { '危险': C.coral }, 5: { '收回来': C.coral },
  6: { '别开': C.coral, '别关': C.coral }, 7: { '别按': C.coral }, 8: { '别急着打': C.coral }, 9: { '室外': C.sageD },
  10: { '关阀': C.sageD, '开门窗': C.sageD }, 11: { '别碰': C.coral }, 12: { '别逞强': C.coral }, 13: { '室外': C.sageD, '打电话': C.sageD },
  14: { '别逞强': C.coral }, 15: { '师傅': C.sageD }, 17: { '照顾好自己': C.coral }, 18: { '路上小心': C.coral }, 19: { '叮嘱你': C.coral },
};
function caption(t, dark = false, y = 1585) {
  let li = -1;
  for (let i = 0; i < LY.length; i++) if (t >= LY[i].start - .2 && t < LY[i].end + .25) li = i;
  if (li < 2) return '';
  const L = LY[li], text = [...L.text], base = dark ? C.cream : C.navy;
  const out = fade(t, L.end, .25);
  const colors = text.map(() => base);
  for (const [k, col] of Object.entries(KEY[li] || {})) { const i = L.text.indexOf(k); if (i >= 0) for (let j = 0; j < k.length; j++) colors[i + j] = col; }
  let hz = -1;
  const times = text.map((ch) => { if (/[一-鿿]/.test(ch)) hz++; return L.chars[Math.max(0, hz)]; });
  const size = 64, w = text.reduce((a, ch) => a + (/[，]/.test(ch) ? size * .55 : size + 4), 0);
  let x = 540 - w / 2, s = '';
  text.forEach((ch, i) => {
    const adv = /[，]/.test(ch) ? size * .55 : size + 4;
    const p = eOut(prog(t, times[i] - .12, times[i] + .14));
    s += `<text x="${x + adv / 2}" y="${y + (1 - p) * 18}" text-anchor="middle" font-family="Wei" font-size="${size}" fill="${colors[i]}" opacity="${p * (1 - out)}">${ch}</text>`;
    x += adv;
  });
  const bar = eOut(prog(t, L.start - .1, L.start + .3)) * (1 - out);
  const bgA = eOut(prog(t, L.start - .2, L.start + .1)) * (1 - out);
  const plate = `<rect x="${540 - w / 2 - 44}" y="${y - 62}" width="${w + 88}" height="112" rx="56" fill="${dark ? C.night : C.cream}" opacity="${.88 * bgA}"/>`;
  return `<g>${plate}${s}<rect x="${540 - 50 * bar}" y="${y + 36}" width="${100 * bar}" height="6" rx="3" fill="${C.coral}" opacity=".85"/></g>`;
}

// 人物：hand = 手的局部坐标（相对脚底中心，未缩放），可插值做动作
function mom(x, y, s = 1, o = {}) {
  const flip = o.flip ? -1 : 1, hand = o.hand || [-58, -6], bob = o.bob || 0;
  const sh = [46, -150], ctl = o.ctl || [(sh[0] + hand[0]) / 2 + 40, (sh[1] + hand[1]) / 2 + 30];
  const arm = `M${sh[0]},${sh[1]} Q${ctl[0]},${ctl[1]} ${hand[0]},${hand[1]}`;
  const face = o.face || 'calm', blink = o.blink;
  const eyes = blink ? `<path d="M-22,-262 h12 M16,-262 h12" ${st}/>`
    : face === 'smile' ? `<path d="M-26,-262 q8,-8 16,0 M14,-262 q8,-8 16,0" fill="none" ${st}/>`
      : `<circle cx="-16" cy="-262" r="5" fill="${C.navy}"/><circle cx="22" cy="-262" r="5" fill="${C.navy}"/>`;
  const mouth = face === 'smile' ? `<path d="M-14,-236 q14,14 28,0" fill="none" ${st}/>` : face === 'worry' ? `<path d="M-6,-232 q10,-6 20,0" fill="none" ${st}/><path d="M-30,-284 l16,-6 M18,-290 l16,6" ${st}/>`
    : face === 'oh' ? `<ellipse cx="4" cy="-234" rx="8" ry="10" fill="${C.navy}"/>` : `<path d="M-6,-236 q10,6 20,0" fill="none" ${st}/>`;
  return `<g transform="translate(${x},${y}) scale(${s * flip},${s})">
    <ellipse cx="0" cy="8" rx="110" ry="16" fill="${C.navy}" opacity=".12"/>
    <g transform="translate(0,${bob})">
    ${o.back ? `<path d="${arm.replace('46,-150', '-46,-150')}" fill="none" stroke="${C.navy}" stroke-width="40" stroke-linecap="round"/>` : ''}
    <path d="M-70,0 C-78,-80 -70,-150 -50,-185 Q0,-205 50,-185 C70,-150 78,-80 70,0 Z" fill="${C.shirt}" ${st}/>
    <path d="M-40,-150 L40,-150 L52,-6 L-52,-6 Z" fill="${C.cream}" ${st}/>
    <path d="M-40,-150 Q0,-120 40,-150" fill="none" ${st}/>
    <rect x="-18" y="-215" width="36" height="34" fill="${C.skin}" ${st}/>
    <circle cx="0" cy="-262" r="58" fill="${C.skin}" ${st}/>
    <path d="M-58,-262 C-64,-330 50,-345 62,-270 C40,-300 -10,-305 -58,-262 Z" fill="${C.hair}" ${st}/>
    <circle cx="-8" cy="-338" r="26" fill="${C.hair}" ${st}/>
    ${eyes}${mouth}
    <circle cx="-34" cy="-242" r="10" fill="${C.coral}" opacity=".35"/><circle cx="40" cy="-242" r="10" fill="${C.coral}" opacity=".35"/>
    <path d="${arm}" fill="none" stroke="${C.navy}" stroke-width="40" stroke-linecap="round"/>
    <path d="${arm}" fill="none" stroke="${C.shirt}" stroke-width="28" stroke-linecap="round"/>
    <circle cx="${hand[0]}" cy="${hand[1]}" r="17" fill="${C.skin}" ${st}/>
    ${o.phone ? `<rect x="${hand[0] - 18}" y="${hand[1] - 64}" width="40" height="70" rx="8" fill="${C.navy}"/>` : ''}
    </g></g>`;
}

function worker(x, y, s = 1, o = {}) {
  const bob = o.bob || 0;
  return `<g transform="translate(${x},${y}) scale(${s * (o.flip ? -1 : 1)},${s})">
    <ellipse cx="0" cy="8" rx="100" ry="15" fill="${C.navy}" opacity=".12"/><g transform="translate(0,${bob})">
    <path d="M-66,0 C-72,-90 -64,-150 -46,-185 Q0,-200 46,-185 C64,-150 72,-90 66,0 Z" fill="${C.orange}" ${st}/>
    <path d="M-62,-95 H62" stroke="${C.cream}" stroke-width="14"/>
    <rect x="-18" y="-212" width="36" height="30" fill="${C.skin}" ${st}/>
    <circle cx="0" cy="-258" r="54" fill="${C.skin}" ${st}/>
    <path d="M-60,-268 C-58,-330 58,-330 60,-268 Z" fill="${C.cream}" ${st}/><path d="M-62,-268 H84" ${st}/>
    <circle cx="-14" cy="-252" r="5" fill="${C.navy}"/><circle cx="20" cy="-252" r="5" fill="${C.navy}"/><path d="M-8,-226 q12,10 24,0" fill="none" ${st}/>
    <rect x="70" y="-110" width="90" height="64" rx="8" fill="${C.coral}" ${st}/><path d="M95,-110 v-18 h40 v18" fill="none" ${st}/>
    <path d="M50,-160 C80,-130 100,-120 110,-112" fill="none" stroke="${C.navy}" stroke-width="38" stroke-linecap="round"/>
    <path d="M50,-160 C80,-130 100,-120 110,-112" fill="none" stroke="${C.orange}" stroke-width="26" stroke-linecap="round"/>
    </g></g>`;
}

const spark = (x, y, s = 1, glow = 1, r = 0) => `<g transform="${at(x, y, s, r)}">
  ${glow ? `<circle r="70" fill="url(#sparkGlow)" opacity="${glow}"/>` : ''}
  <path d="M0,-34 L8,-8 L34,0 L8,8 L0,34 L-8,8 L-34,0 L-8,-8 Z" fill="${C.gold}" stroke="${C.coral}" stroke-width="4" stroke-linejoin="round"/></g>`;
// 画出来的 ✕：两笔依次划出
function cross(x, y, s, p) {
  if (p <= 0) return '';
  const a = eOut(p / .5), b = eOut((p - .45) / .5), L = 170;
  return `<g transform="${at(x, y, s, -8)}">
    <path d="M-60,-60 L60,60" stroke="${C.coral}" stroke-width="26" stroke-linecap="round" stroke-dasharray="${L}" stroke-dashoffset="${L * (1 - a)}"/>
    ${b > 0 ? `<path d="M60,-60 L-60,60" stroke="${C.coral}" stroke-width="26" stroke-linecap="round" stroke-dasharray="${L}" stroke-dashoffset="${L * (1 - b)}"/>` : ''}</g>`;
}
const check = (x, y, s = 1) => s <= 0 ? '' : `<g transform="${at(x, y, s)}">
  <circle r="36" fill="${C.sage}" ${st}/><path d="M-16,0 L-4,13 L18,-12" fill="none" stroke="${C.cream}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></g>`;
const ring = (x, y, p, col = C.cream, R = 260) => p <= 0 || p >= 1 ? '' : `<circle cx="${x}" cy="${y}" r="${R * eOut(p)}" fill="none" stroke="${col}" stroke-width="${10 * (1 - p)}" opacity="${1 - p}"/>`;

// 燃气缎带（流动）
function gasRibbons(x, y, w, a, seed, t, grow = 1) {
  let out = '';
  for (let i = 0; i < 4; i++) {
    const yy = y + i * 44, ph = seed + i * 1.7 + t * (.9 + i * .15), amp = 34 + i * 10;
    let d = `M${x},${yy}`;
    for (let k = 1; k <= 6; k++) d += ` S${x - k * w / 6 + w / 12},${yy + Math.sin(ph + k) * amp} ${x - k * w / 6},${yy + Math.sin(ph + k + .6) * amp * .6}`;
    const L = w * 1.4;
    out += `<path d="${d}" fill="none" stroke="${C.lav}" stroke-width="${26 - i * 4}" stroke-linecap="round" opacity="${a * (1 - i * .18)}" stroke-dasharray="${L}" stroke-dashoffset="${L * (1 - clamp(grow - i * .12))}"/>`;
  }
  return out;
}
// 燃气雾（从地面上涨），level = 顶部 y
function gasFog(level, t, a = .35) {
  let d = `M0,1920 L0,${level}`;
  for (let x = 0; x <= 1080; x += 60) d += ` L${x},${level + Math.sin(x * .012 + t * 1.6) * 22 + Math.sin(x * .03 - t * 2.3) * 9}`;
  d += ' L1080,1920 Z';
  return `<path d="${d}" fill="${C.lav}" opacity="${a}"/>`;
}

const defs = `<defs>
  <radialGradient id="sparkGlow"><stop offset="0" stop-color="${C.gold}" stop-opacity=".9"/><stop offset=".4" stop-color="${C.coral}" stop-opacity=".35"/><stop offset="1" stop-color="${C.coral}" stop-opacity="0"/></radialGradient>
  <linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6D9B8"/><stop offset=".6" stop-color="#F5E8D6"/><stop offset="1" stop-color="${C.bg}"/></linearGradient>
  <radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#3a2a1a" stop-opacity="0"/><stop offset="1" stop-color="#3a2a1a" stop-opacity=".18"/></radialGradient>
</defs>`;

// ---------- 世界：厨房（场景 1–2 共用一个连续镜头）
const SWITCH = [200, 1000];
function kitchen(t) {
  return `
  <rect x="-600" y="-600" width="2280" height="3120" fill="${C.wall}"/>
  <rect x="-600" y="-600" width="2280" height="860" fill="${C.wall2}"/>
  <!-- 门框 + 开关 -->
  <rect x="-200" y="560" width="300" height="880" fill="${C.wall2}" ${st}/>
  <rect x="${SWITCH[0] - 50}" y="${SWITCH[1] - 70}" width="100" height="140" rx="14" fill="${C.cream}" ${st}/>
  <rect x="${SWITCH[0] - 18}" y="${SWITCH[1] - 42}" width="36" height="84" rx="8" fill="${C.wall2}" ${st}/>
  <!-- 窗 -->
  <g transform="translate(330,420)"><rect width="250" height="320" rx="12" fill="${C.glass}" ${st}/><path d="M125,0 V320 M0,160 H250" ${st}/>
    <path d="M24,280 q50,-70 100,-26" fill="none" stroke="${C.cream}" stroke-width="10" stroke-linecap="round" opacity=".8"/></g>
  <!-- 油烟机 -->
  <g transform="translate(640,330)"><rect x="70" y="0" width="160" height="150" fill="${C.wall2}" ${st}/><path d="M0,150 H300 L260,250 H40 Z" fill="${C.steel}" ${st}/>
    <circle cx="230" cy="215" r="13" fill="${C.cream}" ${st}/></g>
  <!-- 台面 -->
  <rect x="330" y="1010" width="1350" height="40" fill="${C.wood}" ${st}/>
  <rect x="330" y="1050" width="1350" height="400" fill="${C.cream}" ${st}/>
  ${[370, 640, 910].map((x) => `<rect x="${x + 20}" y="1080" width="230" height="330" rx="10" fill="none" ${st}/><path d="M${x + 110},1110 h50" ${st}/>`).join('')}
  <g transform="translate(660,960)"><rect width="260" height="50" rx="10" fill="${C.navy}"/>
    <ellipse cx="70" cy="0" rx="50" ry="12" fill="#55697A"/><ellipse cx="190" cy="0" rx="50" ry="12" fill="#55697A"/>
    <circle cx="70" cy="26" r="11" fill="${C.cream}"/><circle cx="190" cy="26" r="11" fill="${C.cream}"/></g>
  <g transform="translate(960,1200)"><path d="M0,-150 V30" stroke="${C.orange}" stroke-width="16"/><rect x="-34" y="-36" width="68" height="20" rx="10" fill="${C.coral}" ${st}/></g>
  <rect x="-600" y="1450" width="2280" height="1200" fill="#E2D2BC"/><path d="M-600,1450 H1680" ${st}/>`;
}

function camera(cx, cy, z, body) { return `<g transform="translate(540,960) scale(${z}) translate(${-cx},${-cy})">${body}</g>`; }

// ---------- 场景 1+2：念白 + 主歌一（0 – 22.6）
function sceneKitchen(t) {
  // 镜头：开场特写开关 → 拉远全景 → 推近妈妈 → 拉远（看不出来）→ 再推近开关
  const keys = [[0, 280, 960, 2.5], [3.9, 280, 960, 2.5], [5.2, 540, 960, 1.0], [8.8, 540, 960, 1.0], [10.4, 420, 930, 1.22], [13.0, 430, 940, 1.22],
    [14.4, 540, 960, .96], [17.6, 540, 960, .98], [18.4, 320, 1000, 1.6], [21.0, 310, 1000, 1.7], [22.6, 250, 1000, 2.3]];
  let k = 0; while (k < keys.length - 2 && t > keys[k + 1][0]) k++;
  const [t0, x0, y0, z0] = keys[k], [t1, x1, y1, z1] = keys[k + 1], q = eIO(prog(t, t0, t1));
  const cx = lerp(x0, x1, q), cy = lerp(y0, y1, q), z = lerp(z0, z1, q);

  // 妈妈：站在开关右边，面朝左
  const mx = 440, my = 1500, ms = 1.3;
  const toLocal = ([wx, wy]) => [-(wx - mx) / ms, (wy - my) / ms];
  const rest = [-58, -6], sniff = [30, -238], reachT = toLocal([SWITCH[0] + 6, SWITCH[1] + 4]), near = toLocal([SWITCH[0] + 70, SWITCH[1] + 40]);
  let hand = rest, face = 'calm';
  // 0–4：伸手 → 「哎」冻结 → 「手先收回来」收回
  if (t < 4.4) {
    const r1 = eOut(prog(t, 0, .71)), back = eIO(prog(t, 2.86, 3.7));
    const fz = t > .71 && t < .95 ? Math.sin((t - .71) * 60) * 4 * (1 - prog(t, .71, .95)) : 0;
    hand = [lerp(lerp(rest[0], near[0], .2), near[0], r1) + fz, lerp(lerp(rest[1], near[1], .2), near[1], r1)];
    hand = [lerp(hand[0], rest[0], back), lerp(hand[1], rest[1], back)];
    face = t > .71 ? 'oh' : 'calm';
  } else if (t < 8.6) { hand = [lerp(rest[0], sniff[0], eIO(prog(t, 4.6, 5.4))), lerp(rest[1], sniff[1], eIO(prog(t, 4.6, 5.4)))]; face = 'worry'; }
  else if (t < 17.8) { const b = eIO(prog(t, 8.6, 9.2)); hand = [lerp(sniff[0], rest[0], b), lerp(sniff[1], rest[1], b)]; face = t > 13.3 ? 'worry' : 'calm'; }
  else {
    const r = eOut(prog(t, 17.88, 18.3)), back = eIO(prog(t, 19.9, 20.7));
    const fz = t > 18.24 && t < 18.5 ? Math.sin((t - 18.24) * 60) * 4 * (1 - prog(t, 18.24, 18.5)) : 0;
    hand = [lerp(rest[0], near[0], r) + fz, lerp(rest[1], near[1], r)];
    hand = [lerp(hand[0], rest[0], back), lerp(hand[1], rest[1], back)];
    face = t > 18.24 ? 'oh' : 'calm';
  }
  const blink = (t % 3.7) > 3.55;

  let w = kitchen(t);
  // 燃气缎带：从灶台飘向左边
  const gGrow = prog(t, 4.2, 7.6);
  if (gGrow > 0) w += gasRibbons(800, 900, 760, .5 * (1 - .4 * prog(t, 13.3, 14.4)), 1, t, gGrow * 1.4) + gasRibbons(900, 760, 600, .3, 4, t, gGrow * 1.2);
  // 看不出来：燃气雾上涨 + 浓度计
  const fogP = eIO(prog(t, 13.3, 16.6));
  if (fogP > 0) w += gasFog(lerp(1500, 620, fogP), t, .3 * fogP);
  w += mom(mx, my, ms, { flip: true, hand, face, blink, ctl: t < 4.4 || t >= 17.8 ? undefined : undefined });
  // 问号
  const qm = fade(t, 5.2, .3) * (1 - fade(t, 8.6, .3));
  if (qm > 0) w += `<g opacity="${qm}" font-family="Kuai" fill="${C.lav}"><text x="${590 + wig(t, .7, 6)}" y="${980 + wig(t, .9, 8)}" font-size="70">?</text><text x="${645 + wig(t, .6, 5, 1)}" y="${910 + wig(t, .8, 8, 2)}" font-size="50">?</text></g>`;
  // 想法气泡：开灯看看
  const tb = pop(t, 9.4, .35) * (1 - fade(t, 12.9, .3));
  if (tb > 0) w += `<g transform="${at(640, 880, tb)}"><circle cx="-90" cy="120" r="12" fill="${C.cream}" ${st}/><circle cx="-60" cy="80" r="18" fill="${C.cream}" ${st}/>
    <rect x="-40" y="-120" width="260" height="170" rx="80" fill="${C.cream}" ${st}/>
    <g transform="translate(40,-36)"><circle r="34" fill="${C.gold}" ${st}/><rect x="-16" y="30" width="32" height="22" rx="4" fill="${C.steel}" ${st}/></g>
    <text x="140" y="-18" text-anchor="middle" font-family="Kuai" font-size="44" fill="${C.navy}">开灯</text><text x="140" y="30" text-anchor="middle" font-family="Kuai" font-size="40" fill="${C.navy}">看看?</text></g>`;
  // 开关火花：伸手时
  const sp1 = t < 4 ? fade(t, .2, .3) * (1 - fade(t, 3.3, .4)) : t > 17.9 ? fade(t, 18.0, .2) * (1 - fade(t, 20.4, .4)) : 0;
  if (sp1 > 0) w += spark(SWITCH[0] + 40, SWITCH[1] - 50, .55 * sp1 * (1 + wig(t, 5, .12)), sp1, t * 40);
  w += ring(SWITCH[0], SWITCH[1], prog(t, .71, 1.5), C.gold, 220) + ring(SWITCH[0], SWITCH[1], prog(t, 18.24, 19.0), C.coral, 240);
  // ✋ 停止手势（第二次）
  const stp = pop(t, 18.24, .3) * (1 - fade(t, 20.6, .3));
  if (stp > 0) w += `<g transform="${at(SWITCH[0] + 130, SWITCH[1] - 230, stp * .8, wig(t, 1.2, 4))}"><circle r="74" fill="${C.coral}" ${st}/>
    <path d="M-30,30 V-22 M-12,30 V-40 M6,30 V-40 M24,30 V-26 M-30,30 Q-34,56 0,58 Q34,56 36,20 L44,-6" fill="none" stroke="${C.cream}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/></g>`;

  let s = camera(cx, cy, z, w);
  // 浓度计（屏幕空间）
  if (fogP > 0 && t < 18) {
    const a = fade(t, 13.4, .3) * (1 - fade(t, 17.4, .4)), lvl = eIO(prog(t, 13.5, 16.6));
    s += `<g transform="translate(900,560)" opacity="${a}"><rect x="-40" y="0" width="80" height="560" rx="40" fill="${C.cream}" ${st}/>
      <rect x="-22" y="${18 + 524 * (1 - lvl)}" width="44" height="${524 * lvl}" rx="22" fill="${lvl > .7 ? C.coral : C.lav}"/>
      <path d="M-40,170 h24" ${st}/><text x="0" y="620" text-anchor="middle" font-family="Sans" font-weight="800" font-size="32" fill="${C.navy}">燃气浓度</text>
      <text x="0" y="-26" text-anchor="middle" font-family="Sans" font-weight="900" font-size="30" fill="${C.coral}" opacity="${fade(t, 15.4, .3)}">危险</text></g>`;
    s += `<text x="540" y="380" text-anchor="middle" font-family="Kuai" font-size="84" fill="${C.navy}" opacity="${fade(t, 14.7, .3) * (1 - fade(t, 17.4, .3))}">燃气，<tspan fill="${C.coral}">看不见</tspan></text>`;
  }
  // 开场暗场 + 大字
  const dark = 1 - eIO(prog(t, 3.9, 5.0));
  if (dark > 0) {
    s += `<rect width="1080" height="1920" fill="${C.night}" opacity="${.8 * dark}"/>
      <circle cx="${540 + (SWITCH[0] - 280) * 2.5}" cy="${960 + (SWITCH[1] - 960) * 2.5}" r="${380}" fill="url(#sparkGlow)" opacity="${.25 * dark}"/>`;
    const a1 = pop(t, .71, .3), out = 1 - fade(t, 3.7, .35);
    const ch = ['等', '一', '下'].map((c, i) => { const p = pop(t, charT(0, i + 1), .26); return `<text x="${505 + i * 150}" y="470" text-anchor="middle" font-family="Kuai" font-size="150" fill="${C.cream}" transform="translate(${505 + i * 150},420) scale(${p}) translate(${-(505 + i * 150)},-420)" opacity="${clamp(p)}">${c}</text>`; }).join('');
    s += `<g opacity="${out}"><g transform="${at(250, 420, a1)}"><text x="0" y="50" text-anchor="middle" font-family="Kuai" font-size="150" fill="${C.cream}">哎，</text></g>${ch}
      ${[...'手先收回来'].map((c, i) => { const p = eOut(prog(t, charT(1, i) - .1, charT(1, i) + .15)); return `<text x="${300 + i * 120}" y="${600 + (1 - p) * 16}" text-anchor="middle" font-family="Wei" font-size="72" fill="${C.gold}" opacity="${p}">${c}</text>`; }).join('')}</g>`;
    s += `<g opacity="${dark}">${tag(true)}</g>`;
  }
  if (dark < 1) s += `<g opacity="${1 - dark}">${tag()}</g>`;
  return s;
}

// ---------- 场景 3：主歌二 · 三张卡片（22.6 – 33.6）
function iconLight(t, flipT) { const up = flipT; return `<rect x="-70" y="-100" width="140" height="200" rx="20" fill="${C.wall}" ${st}/><rect x="-28" y="-60" width="56" height="120" rx="10" fill="${C.cream}" ${st}/><rect x="-20" y="${lerp(-52, 4, up)}" width="40" height="48" rx="8" fill="${C.navy}"/>`; }
function iconHood(press) { return `<path d="M-100,-20 H100 L70,60 H-70 Z" fill="${C.steel}" ${st}/><rect x="-30" y="-90" width="60" height="70" fill="${C.wall2}" ${st}/><circle cx="50" cy="30" r="${13 - press * 4}" fill="${press > .5 ? C.gold : C.cream}" ${st}/>`; }
function iconPhone(t, ringA) { return `<g transform="rotate(${wig(t, 9, 7 * ringA)})"><rect x="-55" y="-100" width="110" height="200" rx="20" fill="${C.navy}"/><rect x="-42" y="-80" width="84" height="150" rx="8" fill="${C.glass}"/>
  <path d="M-16,-20 q-14,30 10,50 l12,-10 -14,-14 -6,6 q-8,-8 -2,-24 l6,2 4,-18 Z" fill="${C.navy}"/></g>`; }
function sceneCards(t) {
  let s = `<rect width="1080" height="1920" fill="${C.bg}"/>${tag()}`;
  const outAll = eIO(prog(t, 28.95, 29.45));
  const h1 = eOut(prog(t, 21.9, 22.6)), h2 = eOut(prog(t, 22.1, 22.8));
  s += `<g transform="translate(0,${-outAll * 1400})" opacity="${1 - outAll}">
    <text x="90" y="${380 + (1 - h1) * 40}" font-family="Kuai" font-size="96" fill="${C.navy}" opacity="${h1}">这三件事</text>
    <text x="90" y="${480 + (1 - h2) * 40}" font-family="Kuai" font-size="96" fill="${C.coral}" opacity="${h2}">都可能打出火花</text>`;
  const card = (i, t0, icon, title, sub, xT, sparkT) => {
    const p = eBack(prog(t, t0 - .12, t0 + .3)), y = 560 + i * 330;
    if (p <= 0) return '';
    const sp = sparkT.map((ts) => { const q = prog(t, ts, ts + .5); return q > 0 && q < 1 ? spark(255 + 20 * q, 85 - 30 * q, .9 * (1 - q) + .3, 1 - q, q * 90) : ''; }).join('');
    return `<g transform="translate(${90 + (1 - p) * 900},${y})">
      <rect width="900" height="290" rx="36" fill="${C.cream}" ${st}/>
      <g transform="translate(170,145)">${icon}</g>${sp}${cross(170, 145, 1, prog(t, xT, xT + .4))}
      <text x="350" y="140" font-family="Sans" font-weight="900" font-size="76" fill="${C.navy}">${title}</text>
      <text x="352" y="208" font-family="Sans" font-weight="500" font-size="38" fill="${C.navy}" opacity=".7">${sub}</text></g>`;
  };
  const sw = t < charT(6, 2) ? 0 : t < charT(6, 5) ? eOut(prog(t, charT(6, 2), charT(6, 2) + .12)) : 1 - eOut(prog(t, charT(6, 5), charT(6, 5) + .12));
  s += card(0, lineStart(6), iconLight(t, sw), '开关灯', '开灯、关灯 都别碰', charT(6, 5) + .15, [charT(6, 2), charT(6, 5)]);
  s += card(1, lineStart(7), iconHood(prog(t, charT(7, 8), charT(7, 8) + .1) * (1 - prog(t, charT(7, 8) + .4, charT(7, 8) + .5))), '油烟机', '开关按钮 也别按', charT(7, 8) + .1, [charT(7, 8)]);
  s += card(2, lineStart(8), iconPhone(t, fade(t, 27.1, .2) * (1 - fade(t, 28.6, .2))), '打电话', '屋里先别急着打', charT(8, 6), [charT(8, 6)]);
  s += `</g>`;
  // 咱们到室外：门打开，人走出去
  const dp = eOut(prog(t, 29.15, 29.75));
  if (dp > 0) {
    const open = eIO(prog(t, 29.7, 30.5)), walk = eIO(prog(t, 30.2, 31.6));
    const dive = eIn(prog(t, 32.2, 33.6));
    const z = 1 + dive * 9;
    s += `<g transform="translate(540,1000) scale(${dp * z}) translate(-540,-1000)">
      <rect x="380" y="640" width="320" height="560" rx="14" fill="${C.sage}" opacity=".35"/>
      <rect x="380" y="640" width="320" height="560" rx="14" fill="#F3E9D2" ${st}/>
      <path d="M380,640 L${lerp(700, 470, open)},${lerp(640, 600, open)} L${lerp(700, 470, open)},${lerp(1200, 1240, open)} L380,1200 Z" fill="${C.wood}" ${st}/>
      <circle cx="${lerp(660, 455, open)}" cy="930" r="10" fill="${C.navy}"/>
      ${[0, 1, 2].map((k) => `<path d="M${560 + k * 40},${760 + k * 20} q30,-30 60,0" fill="none" stroke="${C.sage}" stroke-width="7" stroke-linecap="round" opacity="${open}"/>`).join('')}
      ${mom(lerp(250, 560, walk), 1200, .55, { hand: [-58, -6], face: 'calm', bob: Math.abs(Math.sin(t * 9)) * -10 * (walk > 0 && walk < 1), flip: false })}
      <text x="540" y="560" text-anchor="middle" font-family="Kuai" font-size="92" fill="${C.sageD}" opacity="${fade(t, charT(9, 2), .3)}">先到室外</text></g>`;
  }
  return s;
}

// ---------- 场景 4：副歌 · 安全四步路线（33.6 – 50.6）
const NODES = [[250, 720, '关阀', '能关就关', 33.56, 34.89], [800, 1080, '开窗', '轻轻打开', 35.76, 36.6], [260, 1440, '不碰电', '开关电器都别碰', 37.18, 38.9], [790, 1800, '出门打电话', '到室外再报修', 46.92, 49.62]];
const ROUTE = `M250,720 C600,720 800,800 800,1080 S260,1160 260,1440 S790,1520 790,1800`;
function valveIcon(r) { return `<g transform="rotate(${r})"><rect x="-48" y="-10" width="96" height="20" rx="10" fill="${C.coral}" ${st}/></g><circle r="10" fill="${C.navy}"/>`; }
function sceneRoute(t) {
  // 镜头沿路线往下走
  const cyKeys = [[33.0, 880], [35.4, 900], [36.2, 1150], [37.0, 1250], [38.6, 1350], [42.0, 1380], [46.6, 1460], [48.6, 1700], [50.6, 1760]];
  let k = 0; while (k < cyKeys.length - 2 && t > cyKeys[k + 1][0]) k++;
  const cy = lerp(cyKeys[k][1], cyKeys[k + 1][1], eIO(prog(t, cyKeys[k][0], cyKeys[k + 1][0])));
  const punch = 1 + .06 * Math.exp(-Math.pow((t - 39.95) / .25, 2));
  let w = `<rect x="-400" y="-400" width="1880" height="3000" fill="${C.bg}"/>
    <circle cx="880" cy="480" r="260" fill="${C.sage}" opacity=".16"/><circle cx="160" cy="1700" r="200" fill="${C.gold}" opacity=".12"/>
    <text x="90" y="560" font-family="Kuai" font-size="110" fill="${C.navy}">记住这四步</text>
    <path d="${ROUTE}" fill="none" stroke="${C.navy}" stroke-width="10" stroke-dasharray="2 26" stroke-linecap="round" opacity=".45"/>`;
  // 已完成的路线：绿色描出来
  const segP = [prog(t, 34.9, 35.8), prog(t, 36.6, 37.2), prog(t, 46.6, 48.4)];
  const total = segP.reduce((a, b) => a + b, 0) / 3;
  w += `<path d="${ROUTE}" fill="none" stroke="${C.sage}" stroke-width="14" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${1 - total}"/>`;
  NODES.forEach(([x, y, title, sub, t0, tc], i) => {
    const p = pop(t, t0 - .1, .3); if (p <= 0) return;
    const done = t > tc, right = x < 540;
    w += `<g transform="${at(x, y, p)}"><circle r="92" fill="${done ? C.cream : i === 3 ? C.coral : C.cream}" ${st}/>`;
    if (i === 0) w += valveIcon(lerp(0, 90, eIO(prog(t, 34.3, 34.9))));
    else if (i === 1) { const o = eIO(prog(t, 35.76, 36.4)); w += `<rect x="-46" y="-50" width="92" height="100" rx="6" fill="${C.glass}" ${st}/><path d="M0,-50 V50" ${st}/><path d="M0,-50 L${lerp(0, -30, o)},-60 L${lerp(0, -30, o)},60 L0,50" fill="${C.cream}" ${st} opacity="${o}"/>`; }
    else if (i === 2) w += `<path d="M-30,-20 h60 v24 a30,30 0 0 1 -60,0 Z" fill="${C.steel}" ${st}/><path d="M-14,-20 v-24 M14,-20 v-24 M0,34 v26" ${st}/>${cross(0, 0, .55, prog(t, 37.9, 38.3))}`;
    else w += `<rect x="-40" y="-60" width="80" height="120" rx="8" fill="${C.wood}" ${st}/><circle cx="24" cy="0" r="7" fill="${C.navy}"/>`;
    w += `</g>${check(x + 70, y - 70, pop(t, tc, .3) * .9)}
      <text x="${right ? x + 120 : x - 120}" y="${y - 4}" text-anchor="${right ? 'start' : 'end'}" font-family="Sans" font-weight="900" font-size="64" fill="${C.navy}" opacity="${fade(t, t0, .3)}">${title}</text>
      <text x="${right ? x + 122 : x - 122}" y="${y + 52}" text-anchor="${right ? 'start' : 'end'}" font-family="Sans" font-weight="500" font-size="34" fill="${C.navy}" opacity="${.65 * fade(t, t0 + .15, .3)}">${sub}</text>`;
  });
  // 开窗：风吹走燃气
  const wind = prog(t, 35.9, 37.4);
  if (wind > 0 && wind < 1) w += [0, 1, 2, 3].map((k2) => { const q = clamp(wind * 1.4 - k2 * .12); return `<path d="M${700 - q * 500},${1040 + k2 * 30} q60,-24 120,0" fill="none" stroke="${C.sage}" stroke-width="8" stroke-linecap="round" opacity="${(1 - q) * .9}"/><circle cx="${560 - q * 600}" cy="${1000 + k2 * 40 + wig(t, 2, 10, k2)}" r="${16 - k2 * 2}" fill="${C.lav}" opacity="${(1 - q) * .7}"/>`; }).join('');
  // 第四步：小人沿路线走到门口
  if (t > 46.5) {
    const q = eIO(prog(t, 46.9, 48.6));
    const px = lerp(260, 700, q), py = lerp(1440, 1800, q) + Math.sin(q * Math.PI) * -60;
    w += mom(px, py + 60, .5, { hand: t > 49.3 ? [24, -238] : [-58, -6], phone: t > 49.3, face: 'smile', bob: q < 1 ? Math.abs(Math.sin(t * 9)) * -10 : 0 });
    const rp = fade(t, 49.3, .2);
    if (rp > 0) w += `<g opacity="${rp}">${[0, 1, 2].map((k2) => `<path d="M${px + 40 + k2 * 18},${py - 160 - k2 * 14} q20,20 0,40" fill="none" stroke="${C.sage}" stroke-width="6" stroke-linecap="round" opacity="${.5 + .5 * Math.sin(t * 8 - k2)}"/>`).join('')}</g>`;
  }
  let s = camera(540, cy, punch, w);
  // 记住了吗？
  const rm = pop(t, 39.85, .3) * (1 - fade(t, 41.9, .3));
  if (rm > 0) s += `<g transform="${at(540, 900, rm, wig(t, 1.6, 3))}"><rect x="-330" y="-110" width="660" height="200" rx="100" fill="${C.navy}"/><text y="30" text-anchor="middle" font-family="Kuai" font-size="104" fill="${C.cream}">记住了吗<tspan fill="${C.gold}">？</tspan></text></g>`;
  // 没法安全处理，就别逞强：警示卡
  const wc = eBack(prog(t, 42.3, 42.75)) * (1 - eIO(prog(t, 46.5, 46.95)));
  if (wc > 0) s += `<g transform="translate(${(1 - wc) * -1100},0)">
    <rect x="90" y="600" width="900" height="560" rx="44" fill="${C.cream}" stroke="${C.coral}" stroke-width="10"/>
    <rect x="90" y="600" width="900" height="110" rx="44" fill="${C.coral}"/><rect x="90" y="660" width="900" height="50" fill="${C.coral}"/>
    <text x="540" y="680" text-anchor="middle" font-family="Sans" font-weight="900" font-size="54" fill="${C.cream}">⚠ 处理不了，别逞强</text>
    <g transform="translate(300,960)">${mom(0, 120, .62, { hand: [70, -180], face: 'worry' })}<path d="M60,-120 l70,-70" stroke="${C.steel}" stroke-width="18" stroke-linecap="round"/>${cross(80, -120, .9, prog(t, charT(12, 9), charT(12, 9) + .4))}</g>
    <text x="520" y="880" font-family="Sans" font-weight="900" font-size="58" fill="${C.navy}">阀门关不上</text>
    <text x="520" y="960" font-family="Sans" font-weight="900" font-size="58" fill="${C.navy}">味道越来越大</text>
    <text x="520" y="1050" font-family="Sans" font-weight="700" font-size="46" fill="${C.coral}" opacity="${fade(t, 44.6, .3)}">→ 马上离开</text></g>`;
  return s + tag();
}

// ---------- 场景 5：楼下 · 等师傅（50.6 – 69.4）
function building(t) {
  return `<g transform="translate(140,250)"><rect width="560" height="1050" fill="${C.wall}" ${st}/>
    ${[0, 1, 2, 3].map((r) => [0, 1, 2].map((c) => `<rect x="${50 + c * 170}" y="${70 + r * 210}" width="120" height="140" rx="8" fill="${r === 2 && c === 1 ? C.glass : '#E7D9C4'}" ${st}/>`).join('')).join('')}
    <g transform="translate(220,500)">${[0, 1, 2].map((k) => `<path d="M${k * 40},${-wig(t, .8, 8, k)} q30,-40 0,-80" fill="none" stroke="${C.sage}" stroke-width="7" stroke-linecap="round" opacity=".9"/>`).join('')}</g>
    <rect x="220" y="900" width="130" height="150" rx="10" fill="${C.wood}" ${st}/></g>`;
}
function sceneStreet(t) {
  const zKeys = [[50.6, 540, 960, 1], [63.8, 540, 960, 1], [65.6, 360, 1010, 1.7], [68.6, 360, 990, 1.85], [69.4, 380, 1080, 2.6]];
  let k = 0; while (k < zKeys.length - 2 && t > zKeys[k + 1][0]) k++;
  const q = eIO(prog(t, zKeys[k][0], zKeys[k + 1][0]));
  const cx = lerp(zKeys[k][1], zKeys[k + 1][1], q), cy = lerp(zKeys[k][2], zKeys[k + 1][2], q), z = lerp(zKeys[k][3], zKeys[k + 1][3], q);
  let w = `<rect x="-400" y="-400" width="1880" height="2720" fill="url(#dusk)"/>
    <circle cx="820" cy="${440 + (t - 50) * 3}" r="120" fill="${C.gold}" opacity=".55"/>
    ${building(t)}
    <rect x="-400" y="1300" width="1880" height="900" fill="#E6DCCB"/><path d="M-400,1300 H1480" ${st}/>`;
  // 师傅走进来
  const wk = eOut(prog(t, 55.6, 57.6));
  const wx = lerp(1250, 790, wk);
  const callEnd = t > 57.6;
  w += mom(330, 1440, 1.0, { hand: callEnd ? [-58, -6] : [24, -238], phone: !callEnd, face: t > 60.4 ? 'smile' : 'calm', blink: (t % 3.3) > 3.15 });
  if (callEnd) w += `<g transform="${at(250, 1100, pop(t, 57.7, .3))}"><path d="M0,0 q-10,-40 20,-50 M30,-10 q20,-30 40,-10" fill="none" stroke="${C.coral}" stroke-width="7" stroke-linecap="round"/></g>`;
  w += worker(wx, 1450, 1.0, { flip: true, bob: wk < 1 ? Math.abs(Math.sin(t * 8)) * -10 : 0 });
  // 检测仪：滴滴
  if (t > 57.8 && t < 60.2) w += `<g transform="translate(${wx - 150},1240)"><rect x="-26" y="-60" width="52" height="90" rx="10" fill="${C.navy}"/><circle cx="0" cy="-30" r="12" fill="${Math.floor(t * 4) % 2 ? C.sage : C.cream}"/></g>`;
  // 回忆气泡：你总说我让人放心不下
  const mem = pop(t, 60.3, .4) * (1 - fade(t, 64.6, .4));
  if (mem > 0) w += `<g transform="${at(560, 760, mem)}"><circle r="230" fill="#F3E3C6" ${st}/>
    <clipPath id="mc"><circle r="224"/></clipPath><g clip-path="url(#mc)" opacity=".95">
      <rect x="-240" y="60" width="480" height="200" fill="#E6D3B3"/>
      ${mom(-80, 170, .55, { hand: [70, -250], face: 'smile' })}
      <g transform="translate(90,170) scale(.42)">
        <ellipse cx="0" cy="8" rx="80" ry="14" fill="${C.navy}" opacity=".12"/>
        <path d="M-50,0 C-56,-60 -50,-110 -36,-140 Q0,-155 36,-140 C50,-110 56,-60 50,0 Z" fill="${C.coral}" ${st}/>
        <rect x="-62" y="-130" width="40" height="90" rx="12" fill="${C.sage}" ${st}/>
        <circle cx="0" cy="-196" r="46" fill="${C.skin}" ${st}/><path d="M-46,-200 C-44,-250 44,-250 46,-200 C30,-230 -30,-230 -46,-200 Z" fill="${C.hair}" ${st}/>
        <circle cx="-14" cy="-196" r="5" fill="${C.navy}"/><circle cx="14" cy="-196" r="5" fill="${C.navy}"/></g>
      <text x="0" y="-90" text-anchor="middle" font-family="Wei" font-size="40" fill="${C.navy}" opacity=".8">"路上慢点儿"</text></g>
    <circle cx="-150" cy="260" r="20" fill="#F3E3C6" ${st}/><circle cx="-200" cy="320" r="12" fill="#F3E3C6" ${st}/></g>`;
  // 爱心飘起
  if (t > 64.8) for (let i = 0; i < 6; i++) { const q2 = prog(t, 64.9 + i * .35, 66.9 + i * .35); if (q2 > 0 && q2 < 1) w += `<text x="${300 + (i % 3) * 60 + wig(t, .7, 14, i)}" y="${1100 - q2 * 260}" font-family="Kuai" font-size="${36 + (i % 2) * 14}" fill="${C.coral}" opacity="${(1 - q2) * .9}">♥</text>`; }
  let s = camera(cx, cy, z, w);
  // 别逞强 ×2
  const b1 = pop(t, 50.63, .3) * (1 - fade(t, 55.2, .3)), b2 = pop(t, 53.68, .3) * (1 - fade(t, 55.2, .3));
  if (b1 > 0) s += `<g transform="${at(330, 470, b1, -6 + wig(t, 1.4, 2))}"><rect x="-210" y="-90" width="420" height="160" rx="30" fill="${C.coral}"/><text y="30" text-anchor="middle" font-family="Kuai" font-size="100" fill="${C.cream}">别逞强</text></g>`;
  if (b2 > 0) s += `<g transform="${at(720, 680, b2, 5 + wig(t, 1.3, 2, 1))}"><rect x="-210" y="-90" width="420" height="160" rx="30" fill="${C.cream}" stroke="${C.coral}" stroke-width="8"/><text y="30" text-anchor="middle" font-family="Kuai" font-size="100" fill="${C.coral}">别逞强</text></g>`;
  return s + tag();
}

// ---------- 场景 6：手机聊天 + 落版（69.4 – 79.2）
function scenePhone(t) {
  const zin = 1 - eOut(prog(t, 69.0, 69.9));
  const fin = eIO(prog(t, 76.6, 77.6));
  let s = `<rect width="1080" height="1920" fill="${C.bg}"/>`;
  const ph = `<g transform="translate(540,760) scale(${lerp(.84, .56, fin) * (1 + zin * .4)}) translate(-540,-880)" opacity="${1 - zin * .6}">
    <rect x="130" y="180" width="820" height="1420" rx="80" fill="${C.navy}"/>
    <rect x="160" y="210" width="760" height="1360" rx="56" fill="${C.cream}"/>
    <rect x="160" y="210" width="760" height="150" rx="56" fill="${C.wall2}"/><rect x="160" y="300" width="760" height="60" fill="${C.wall2}"/>
    <circle cx="260" cy="295" r="40" fill="${C.skin}" ${st}/><path d="M220,290 C218,250 300,245 302,292 C286,272 240,270 220,290 Z" fill="${C.hair}"/>
    <text x="330" y="310" font-family="Sans" font-weight="800" font-size="46" fill="${C.navy}">妈妈</text>
    <text x="540" y="430" text-anchor="middle" font-family="Sans" font-size="28" fill="${C.navy}" opacity=".45">上周 08:12</text>
    ${bubble(t, 'L', 480, '路上小心啊，到了说一声', charT(18, 5) - .2)}
    <text x="540" y="740" text-anchor="middle" font-family="Sans" font-size="28" fill="${C.navy}" opacity="${.45 * fade(t, 73.6, .3)}">今天 19:30</text>
    ${bubble(t, 'R', 790, '今天换我，叮嘱你一下 ❤', lineStart(19) - .1)}
    ${videoCard(t, 950, charT(19, 4) - .1)}
  </g>`;
  s += ph;
  // 落版
  if (fin > 0) {
    const chips = ['关阀', '开窗', '不碰电', '出门再打电话'];
    s += `<g transform="translate(0,${(1 - fin) * 500})" opacity="${fin}">
      <rect x="90" y="1390" width="900" height="330" rx="44" fill="${C.navy}"/>
      <text x="540" y="1480" text-anchor="middle" font-family="Wei" font-size="48" fill="${C.gold}" letter-spacing="6">闻到煤气味，记住这四步</text>
      ${chips.map((c, i) => { const xs = [210, 375, 560, 800][i], w = [140, 140, 180, 300][i], p = pop(t, 77.3 + i * .16, .28);
        return `<g transform="${at(xs, 1572, p)}"><rect x="${-w / 2}" y="-38" width="${w}" height="76" rx="38" fill="${i === 3 ? C.coral : C.sage}"/><text y="14" text-anchor="middle" font-family="Sans" font-weight="900" font-size="38" fill="${C.cream}">${c}</text></g>`; }).join('')}
      <text x="540" y="1680" text-anchor="middle" font-family="Sans" font-weight="500" font-size="32" fill="${C.cream}" opacity="${.75 * fade(t, 78.0, .3)}">转给爸妈 · 这条真的能救命</text></g>`;
  }
  return s + tag();
}
function bubble(t, side, y, text, t0) {
  const p = pop(t, t0, .3); if (p <= 0) return '';
  const w = text.length * 46 + 70, x = side === 'L' ? 200 : 880 - w, ox = side === 'L' ? x : x + w;
  return `<g transform="translate(${ox},${y + 50}) scale(${p}) translate(${-ox},${-(y + 50)})">
    <rect x="${x}" y="${y}" width="${w}" height="110" rx="34" fill="${side === 'L' ? C.wall2 : C.sage}"/>
    <text x="${x + 35}" y="${y + 70}" font-family="Sans" font-weight="700" font-size="44" fill="${side === 'L' ? C.navy : C.cream}">${text}</text></g>`;
}
function videoCard(t, y, t0) {
  const p = pop(t, t0, .32); if (p <= 0) return '';
  return `<g transform="translate(880,${y}) scale(${p}) translate(-880,${-y})">
    <rect x="460" y="${y}" width="420" height="380" rx="30" fill="${C.navy}"/>
    <rect x="480" y="${y + 20}" width="380" height="250" rx="18" fill="${C.wall}"/>
    <rect x="600" y="${y + 70}" width="60" height="90" rx="10" fill="${C.cream}" ${st}/>${spark(650, y + 70, .4, .6)}${cross(630, y + 115, .5, 1)}
    <circle cx="760" cy="${y + 145}" r="44" fill="rgba(47,72,88,.75)"/><path d="M748,${y + 122} L782,${y + 145} L748,${y + 168} Z" fill="${C.cream}"/>
    <text x="500" y="${y + 330}" font-family="Sans" font-weight="800" font-size="34" fill="${C.cream}">闻到煤气味，先别动手</text></g>`;
}

// ---------- 转场 + 合成
const SCENES = [[0, 22.6, sceneKitchen], [22.6, 33.5, sceneCards], [33.5, 50.5, sceneRoute], [50.5, 69.3, sceneStreet], [69.3, 79.3, scenePhone]];
function compose(t) {
  // 1→2 圆形扩散（从开关放出）；2→3 门内俯冲（场景 3 自己放大门）；3→4 上推；4→5 缩放入手机
  if (t >= 21.4 && t < 22.6) {
    const p = eIO(prog(t, 21.4, 22.5)), sx = 540 + (SWITCH[0] - 250) * 2.3, sy = 960 + (SWITCH[1] - 1000) * 2.3;
    return `${sceneKitchen(t)}<clipPath id="iris"><circle cx="${sx}" cy="${sy}" r="${p * 2300}"/></clipPath>
      <circle cx="${sx}" cy="${sy}" r="${p * 2300 + 30}" fill="${C.coral}"/>
      <g clip-path="url(#iris)">${sceneCards(t)}</g>`;
  }
  if (t >= 33.1 && t < 33.9) {
    const p = eIO(prog(t, 33.1, 33.9));
    return `${sceneRoute(t)}<rect width="1080" height="1920" fill="${C.sage}" opacity="${1 - p}"/>`;
  }
  if (t >= 50.1 && t < 50.9) {
    const p = eIO(prog(t, 50.1, 50.9));
    return `<g transform="translate(0,${-p * 1920})">${sceneRoute(t)}</g><g transform="translate(0,${(1 - p) * 1920})">${sceneStreet(t)}</g>`;
  }
  if (t >= 69.0 && t < 69.5) {
    const p = eIO(prog(t, 69.0, 69.5));
    return `${sceneStreet(t)}<g opacity="${p}">${scenePhone(t)}</g>`;
  }
  const s = SCENES.find(([a, b]) => t >= a && t < b) || SCENES[SCENES.length - 1];
  return s[2](t);
}

const art = document.getElementById('art');
window.renderAt = async (t) => {
  const dark = t < 4.6 ? 1 - eIO(prog(t, 3.9, 4.6)) : 0;
  const endFade = prog(t, 78.6, 79.2);
  art.innerHTML = `<svg viewBox="0 0 1080 1920" width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">${defs}
    ${compose(t)}${caption(t, dark > .5)}
    <rect width="1080" height="1920" fill="url(#vig)"/>
    ${endFade > 0 ? `<rect width="1080" height="1920" fill="${C.bg}" opacity="${endFade}"/>` : ''}</svg>`;
};
(async () => {
  LY = await (await fetch('lyrics_timed.json')).json();
  const all = LY.map((l) => l.text).join('') + '这三件事都可能打出火花先到室外记住四步了吗燃气看不见浓度危险开灯看看';
  await Promise.all([document.fonts.load('60px Kuai', all + '别逞强？'), document.fonts.load('60px Wei', all + '路上慢点儿闻到煤气味，记住这四步'),
    document.fonts.load('900 60px Sans', '生活安全课01开关灯油烟机打电话都碰按钮屋里急着关阀窗不电出门再能就轻轻打到室外报修妈你也是照顾好自己转给爸这条真的救命处理了别逞强阀门上味道越来越大马离开⚠路小心到说一声今天换我叮嘱下上周闻煤气先动手燃浓度危险'),
    document.fonts.load('500 60px Sans', '开灯关都别碰按钮也屋里先急着打能就轻轻到室外再报修电器上周今天')]);
  window.__ready = true;
})();
