// 《老板画饼》15 秒片段（41.0–57.0 s）风格探索：3 套风格 × 5 个节点。
// renderAt(t)：第 floor(t) 张，0–4 = S1 实物拼贴，5–9 = S2 马克笔手绘，10–14 = S3 条漫。
window.DEMO = { width: 1080, height: 1920, fps: 30, duration: 15 };

const ST = '/assets/stock/';
const CAP = ['只是未来的账 不能糊里糊涂认', '老板画饼别画大', '五百块买不走我的家', '合同白纸黑字查一查', '社保按月不能差'];
const K = { ink: '#1E1E1E', red: '#C8322B', yel: '#F5D547', white: '#FAF7F0', blue: '#7FA7C9', green: '#4F8A5B', pink: '#E9A3A0', kraft: '#C9A57A' };
const img = (f, x, y, w, h, r = 0, o = '') => `<image href="${ST}${f}" x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" transform="translate(${x},${y}) rotate(${r})" ${o}/>`;
const tile = (f, a = 1) => `<g opacity="${a}">${[0, 1].map((i) => `<image href="${ST}${f}" x="0" y="${i * 1080}" width="1080" height="1080"/>`).join('')}</g>`;
const washi = (x, y, w, r, n = 12, a = .9) => `<image href="/assets/textures/washi/washi_solid_${n}.png" x="${x - w / 2}" y="${y - 26}" width="${w}" height="52" preserveAspectRatio="none" transform="rotate(${r},${x},${y})" opacity="${a}"/>`;

// 小陈：女生，短发齐刘海 + 小马尾
function chen(p) {
  const { top, skin, ink, sw, hair = '#2A2A2A', expr = 'calm', shade = '' } = p;
  const s = `stroke="${ink}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"`;
  const face = {
    calm: `<circle cx="-28" cy="-330" r="8" fill="${ink}"/><circle cx="28" cy="-330" r="8" fill="${ink}"/><path d="M-14,-288 q14,10 28,0" fill="none" ${s}/>`,
    side: `<path d="M-40,-332 h22 M18,-332 h22" ${s}/><circle cx="-22" cy="-330" r="6" fill="${ink}"/><circle cx="34" cy="-330" r="6" fill="${ink}"/><path d="M-12,-286 q16,-8 30,4" fill="none" ${s}/>`,
    smile: `<path d="M-38,-332 q10,-12 20,0 M18,-332 q10,-12 20,0" fill="none" ${s}/><path d="M-22,-294 q22,24 44,0" fill="none" ${s}/>`,
    think: `<circle cx="-28" cy="-334" r="8" fill="${ink}"/><circle cx="28" cy="-334" r="8" fill="${ink}"/><path d="M-12,-288 h24" ${s}/>`,
    firm: `<circle cx="-28" cy="-330" r="8" fill="${ink}"/><circle cx="28" cy="-330" r="8" fill="${ink}"/><path d="M-46,-358 l28,8 M18,-350 l28,-8" ${s}/><path d="M-16,-288 h32" ${s}/>`,
  }[expr];
  return `
    <path d="M78,-372 C130,-360 140,-300 110,-262 C128,-300 112,-340 70,-350 Z" fill="${hair}" ${s}/>
    <path d="M-140,0 C-140,-130 -104,-218 0,-224 C104,-218 140,-130 140,0 Z" fill="${top}" ${s}/>
    ${shade ? `<path d="M40,-218 C104,-208 140,-130 140,0 L66,0 Z" fill="${shade}" opacity=".9"/>` : ''}
    <path d="M-50,-214 L0,-160 L50,-214" fill="none" ${s}/>
    <rect x="-22" y="-262" width="44" height="44" fill="${skin}" ${s}/>
    <ellipse cx="0" cy="-322" rx="78" ry="84" fill="${skin}" ${s}/>
    <path d="M-84,-300 C-100,-410 -30,-440 10,-430 C70,-436 104,-390 86,-300 C80,-340 70,-360 50,-366 C20,-350 -30,-350 -60,-366 C-74,-350 -80,-330 -84,-300 Z" fill="${hair}" ${s}/>
    <circle cx="-80" cy="-300" r="8" fill="${K.red}"/>
    ${face}
    <circle cx="-48" cy="-300" r="12" fill="${K.pink}" opacity=".6"/><circle cx="48" cy="-300" r="12" fill="${K.pink}" opacity=".6"/>`;
}

const defs = `
  <filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="6" dy="16" stdDeviation="12" flood-color="#2a1a08" flood-opacity=".38"/></filter>
  <filter id="shs" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="3" dy="8" stdDeviation="6" flood-color="#2a1a08" flood-opacity=".35"/></filter>
  <filter id="rough"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="3" seed="3"/><feDisplacementMap in="SourceGraphic" scale="8"/></filter>
  <filter id="marker"><feTurbulence type="fractalNoise" baseFrequency=".02" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="6"/></filter>
  <filter id="ink"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="5" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.3 1.45" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter>
  <filter id="kraftMul"><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"/></filter>
  <pattern id="dots" patternUnits="userSpaceOnUse" width="14" height="14" patternTransform="rotate(45)"><circle cx="7" cy="7" r="3" fill="#1E1E1E"/></pattern>
  <pattern id="dotsS" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)"><circle cx="5" cy="5" r="1.7" fill="#1E1E1E"/></pattern>
  <pattern id="pw" patternUnits="userSpaceOnUse" width="1080" height="1080"><image href="${ST}tex/Paper001_1080.jpg" width="1080" height="1080"/></pattern>`;

// 纸片
const sheet = (x, y, w, h, r, body = '', o = {}) => `<g transform="translate(${x},${y}) rotate(${r})" filter="url(#sh)"><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="${o.fill || 'url(#pw)'}" ${o.torn ? 'filter="url(#rough)"' : ''}/>${body}</g>`;
// 剪纸人物：先画一圈白边，再画本体
const cut = (x, y, s, body, r = 0) => `<g transform="translate(${x},${y}) rotate(${r}) scale(${s})" filter="url(#sh)"><g>${body.replace(/fill="[^"]*"/g, `fill="${K.white}"`).replace(/stroke="[^"]*"/g, `stroke="${K.white}"`).replace(/stroke-width="[^"]*"/g, 'stroke-width="36"')}</g>${body}</g>`;
// 马克笔线稿人物：白色填充 + 抖动描边
const doodle = (x, y, s, body, r = 0) => `<g transform="translate(${x},${y}) rotate(${r}) scale(${s})" filter="url(#marker)">${body}</g>`;
const tagS = (c = K.yel, bg = K.ink) => `<g transform="translate(70,110)"><rect width="300" height="64" fill="${bg}"/>${txt(24, 44, '打工人社保课 · 02', 30, { c, w: 800 })}</g>`;
const capBar = (s, o = {}) => `<g filter="url(#shs)"><rect x="80" y="1610" width="920" height="120" fill="${o.bg || K.ink}" ${o.rough ? 'filter="url(#rough)"' : ''}/>${txt(540, 1690, s, 54, { f: 'Wei', w: 400, c: o.c || K.white, a: 'middle' })}</g>`;

// 角色调色
const bossP = (m, expr) => m === 'cut' ? { suit: '#3B3F4A', skin: '#F1C7A3', ink: K.ink, sw: 6, expr, shade: '#2E323B' }
  : m === 'doodle' ? { suit: K.white, skin: K.white, ink: K.ink, sw: 7, expr, shirt: K.white, tie: K.red, hair: K.ink }
    : { suit: 'url(#dots)', skin: K.white, ink: K.ink, sw: 8, expr, shirt: K.white, tie: K.yel, hair: K.ink };
const chenP = (m, expr) => m === 'cut' ? { top: '#D9786B', skin: '#F1C7A3', ink: K.ink, sw: 6, expr, shade: '#C2655A' }
  : m === 'doodle' ? { top: K.white, skin: K.white, ink: K.ink, sw: 7, expr, hair: K.ink }
    : { top: 'url(#dotsS)', skin: K.white, ink: K.ink, sw: 8, expr, hair: K.ink };
const person = (m, x, y, s, body, r) => (m === 'cut' ? cut : m === 'doodle' ? doodle : (x2, y2, s2, b, r2 = 0) => `<g transform="translate(${x2},${y2}) rotate(${r2}) scale(${s2})">${b}</g>`)(x, y, s, body, r);

// 马克笔画的饼
function pie(x, y, R, o = {}) {
  const sw = o.sw || 12, col = o.col || K.ink;
  let s = `<g transform="translate(${x},${y}) rotate(${o.r || 0})" filter="url(#marker)">`;
  if (o.fill) s += `<ellipse rx="${R}" ry="${R * .82}" fill="${o.fill}"/>`;
  s += `<ellipse rx="${R}" ry="${R * .82}" fill="none" stroke="${col}" stroke-width="${sw}"/><ellipse rx="${R * .86}" ry="${R * .7}" fill="none" stroke="${col}" stroke-width="${sw * .5}" opacity=".7"/>`;
  const Rn = rng(9);
  for (let i = 0; i < 26; i++) { const a = Rn() * 6.28, rr = Math.sqrt(Rn()) * R * .7; s += `<ellipse cx="${Math.cos(a) * rr}" cy="${Math.sin(a) * rr * .82}" rx="${sw * .7}" ry="${sw * .4}" fill="${col}" transform="rotate(${Rn() * 180},${Math.cos(a) * rr},${Math.sin(a) * rr * .82})"/>`; }
  s += [-1, 0, 1].map((k) => `<path d="M${k * R * .35},${-R * .95} q${-30},-50 0,-100 q30,-50 0,-100" fill="none" stroke="${col}" stroke-width="${sw * .6}" stroke-linecap="round"/>`).join('');
  return s + '</g>';
}
// 马克笔手写字
const mk = (x, y, s, size, col = K.ink, r = 0, f = 'Kuai') => `<g filter="url(#marker)">${txt(x, y, s, size, { f, w: 400, c: col, extra: `transform="rotate(${r},${x},${y})"` })}</g>`;
const arrow = (x1, y1, x2, y2, col = K.ink, sw = 8) => `<g filter="url(#marker)"><path d="M${x1},${y1} Q${(x1 + x2) / 2 + 60},${(y1 + y2) / 2 - 80} ${x2},${y2}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round"/><path d="M${x2 - 30},${y2 - 26} L${x2},${y2} L${x2 - 36},${y2 + 14}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
// 计算器屏幕盖一层自己的读数
const calc = (x, y, w, r, val) => { const h = w * 668 / 480; return `<g transform="translate(${x},${y}) rotate(${r})" filter="url(#sh)">${img('cut/calculator_02.png', 0, 0, w, h)}<rect x="${-w * .34}" y="${-h * .41}" width="${w * .66}" height="${h * .13}" rx="6" fill="#C9D1B6"/>${txt(w * .28, -h * .31, val, w * .12, { w: 800, a: 'end', c: '#222' })}</g>`; };
// 手机屏幕：社保缴费记录
const phone = (x, y, w, r) => { const h = w * 827 / 458, sx = -w * .5 + w * .045, sy = -h * .5 + h * .03, sw2 = w * .74, sh2 = h * .78; return `<g transform="translate(${x},${y}) rotate(${r})" filter="url(#sh)">
  <rect x="${sx}" y="${sy}" width="${sw2}" height="${sh2}" rx="${w * .07}" fill="#FFFFFF"/>
  ${txt(sx + 26, sy + 80, '掌上12333', w * .085, { w: 900, c: '#1F5FAF' })}${txt(sx + 26, sy + 120, '个人缴费记录', w * .05, { w: 500, c: '#777' })}
  ${[1, 2, 3, 4, 5, 6, 7].map((m, i) => { const ok = i !== 5, yy = sy + 150 + i * sh2 * .105; return `<rect x="${sx + 16}" y="${yy}" width="${sw2 - 32}" height="${sh2 * .088}" rx="10" fill="${ok ? '#EEF3EA' : '#FBE3E0'}"/>${txt(sx + 32, yy + sh2 * .06, `2026-0${m}`, w * .055, { w: 600 })}${txt(sx + sw2 - 32, yy + sh2 * .06, ok ? '已缴 ✓' : '未缴 ✕', w * .055, { w: 900, a: 'end', c: ok ? K.green : K.red })}`; }).join('')}
  ${img('cut/hand_holding_smartphone_01.png', 0, 0, w, h)}</g>`; };

// ------------------------------------------------------------ 构图（S1/S2 共用，m = 'cut' | 'doodle'）
function F1(m) {   // 只是未来的账 不能糊里糊涂认
  const bg = m === 'cut' ? tile('tex/Cardboard002_1080.jpg') : tile('tex/Paper004_1080.jpg');
  return `${bg}
    ${sheet(560, 720, 780, 860, -3, `
      ${txt(-320, -330, '未来的账', 76, { f: 'Wei', w: 400 })}<path d="M-320,-300 H320" stroke="${K.ink}" stroke-width="3"/>
      ${[['看病', '医保'], ['失业', '失业金'], ['老了', '养老金'], ['工伤', '工伤保险']].map(([a, b], i) => txt(-320, -200 + i * 110, a, 56, { f: 'Wei', w: 400 }) + `<path d="M-180,${-215 + i * 110} H90" stroke="${K.ink}" stroke-width="2" stroke-dasharray="4 10"/>` + txt(320, -200 + i * 110, b, 56, { f: 'Wei', w: 400, a: 'end', c: K.red })).join('')}
      ${txt(-320, 300, '一笔都不能糊涂', 52, { f: 'Kuai', w: 400, c: K.red })}`, { torn: true })}
    ${washi(560, 300, 260, 2)}
    ${calc(820, 1200, 300, 10, '????')}
    ${person(m, 300, 1560, .95, chen(chenP(m, 'think')))}
    ${m === 'doodle' ? mk(420, 1140, '?', 120, K.red, 10) + arrow(420, 1180, 700, 1100, K.ink) : ''}
    ${tagS()}${capBar(CAP[0], m === 'doodle' ? { bg: K.white, c: K.ink, rough: 1 } : {})}`;
}
function F2(m) {   // 老板画饼别画大
  const bg = m === 'cut' ? tile('tex/Cardboard002_1080.jpg') : tile('tex/Paper004_1080.jpg');
  return `${bg}
    ${m === 'cut' ? sheet(540, 820, 980, 1080, 1, '', { torn: true }) : ''}
    ${pie(600, 760, 330, { sw: 14, fill: m === 'cut' ? '#F3D9A4' : '' })}
    ${mk(330, 470, '每月+500', 70, K.red, -10)}${mk(700, 420, '前途无量', 64, K.ink, 8)}${mk(760, 1110, '以后升职', 58, K.ink, -6)}${mk(250, 1080, '画大饼', 80, K.red, -8)}
    ${person(m, 260, 1560, 1.05, boss(bossP(m, 'laugh')))}
    <g transform="translate(420,1120) rotate(-38)" filter="url(#sh)"><rect x="-16" y="-120" width="32" height="200" rx="8" fill="${K.ink}"/><rect x="-16" y="-120" width="32" height="40" rx="6" fill="${K.red}"/></g>
    ${person(m, 880, 1600, .62, chen(chenP(m, 'side')))}
    ${mk(760, 1240, '……', 70, K.ink, 0)}
    ${tagS()}${capBar(CAP[1], m === 'doodle' ? { bg: K.white, c: K.ink, rough: 1 } : {})}`;
}
function F3(m) {   // 五百块买不走我的家
  const bg = m === 'cut' ? tile('tex/Cardboard002_1080.jpg') : tile('tex/Paper004_1080.jpg');
  return `${bg}
    ${img('cut/cardboard_box_08.png', 560, 1080, 760, 603, -2, 'filter="url(#sh)"')}
    <g transform="translate(560,760)" ${m === 'doodle' ? 'filter="url(#marker)"' : 'filter="url(#sh)"'}>
      <path d="M-200,40 L0,-150 L200,40 V260 H-200 Z" fill="${m === 'cut' ? K.white : 'none'}" stroke="${K.ink}" stroke-width="10" stroke-linejoin="round"/>
      <rect x="-50" y="120" width="100" height="140" fill="${m === 'cut' ? K.yel : 'none'}" stroke="${K.ink}" stroke-width="8"/><rect x="90" y="80" width="70" height="70" fill="${m === 'cut' ? '#BFD7EA' : 'none'}" stroke="${K.ink}" stroke-width="8"/>
      <path d="M0,-40 c-30,-40 -80,-10 -60,30 l60,50 l60,-50 c20,-40 -30,-70 -60,-30 Z" fill="${K.red}"/></g>
    ${sheet(300, 470, 360, 170, -10, `${txt(0, 30, '¥500', 96, { w: 900, a: 'middle', c: '#2C5A3A' })}`, { fill: '#DDE8D5' })}
    <g transform="translate(300,470) rotate(-10)">${txt(0, 20, '✕', 220, { w: 900, a: 'middle', c: K.red, extra: 'opacity=".9"' })}</g>
    ${mk(560, 360, '买不走', 110, K.ink, 4)}
    ${person(m, 860, 1600, .78, chen(chenP(m, 'firm')))}
    ${washi(560, 820, 200, -6, 14)}
    ${tagS()}${capBar(CAP[2], m === 'doodle' ? { bg: K.white, c: K.ink, rough: 1 } : {})}`;
}
function F4(m) {   // 合同白纸黑字查一查
  const bg = m === 'cut' ? tile('tex/Cardboard002_1080.jpg') : tile('tex/Paper004_1080.jpg');
  return `${bg}
    ${sheet(420, 760, 680, 960, -4, `
      ${txt(0, -380, '劳 动 合 同', 60, { f: 'Serif', w: 900, a: 'middle', ls: 10 })}
      ${['第七条 社会保险', '甲方应依法为乙方缴纳', '养老、医疗、失业、工伤', '等社会保险费。'].map((l, i) => txt(-280, -260 + i * 66, l, 40, { f: 'Serif', w: i ? 500 : 900 })).join('')}
      <rect x="-286" y="-160" width="560" height="200" fill="${K.yel}" opacity=".6" style="mix-blend-mode:multiply"/>
      ${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M-280,${120 + i * 50} H${200 - (i % 3) * 60}" stroke="#999" stroke-width="6"/>`).join('')}`)}
    ${phone(730, 1110, 520, 6)}
    ${mk(160, 1380, '白纸黑字', 96, K.red, -8)}
    ${washi(420, 300, 220, -3, 12)}
    ${tagS()}${capBar(CAP[3], m === 'doodle' ? { bg: K.white, c: K.ink, rough: 1 } : {})}`;
}
function F5(m) {   // 社保按月不能差
  const bg = m === 'cut' ? tile('tex/Cardboard002_1080.jpg') : tile('tex/Paper004_1080.jpg');
  return `${bg}
    ${sheet(540, 820, 900, 1040, 1, `
      ${txt(0, -430, '2026 · 社保缴费', 58, { f: 'Serif', w: 900, a: 'middle', ls: 6 })}
      ${Array.from({ length: 12 }, (_, i) => { const cx = -300 + (i % 3) * 300, cy = -300 + Math.floor(i / 3) * 190, done = i < 10;
        return `<rect x="${cx - 130}" y="${cy - 70}" width="260" height="160" fill="none" stroke="${K.ink}" stroke-width="3"/>${txt(cx - 110, cy - 26, `${i + 1}月`, 38, { f: 'Serif', w: 700 })}
          ${done ? `<g transform="translate(${cx + 40},${cy + 30}) rotate(${-14 + (i * 7) % 20})" filter="url(#ink)"><circle r="52" fill="none" stroke="${K.red}" stroke-width="7"/>${txt(0, 14, '已缴', 34, { f: 'Serif', w: 900, a: 'middle', c: K.red })}</g>` : ''}`; }).join('')}`)}
    ${img('cut/stamp_one.png', 760, 1300, 300, 334, 8, 'filter="url(#sh)"')}
    ${mk(160, 1520, '按月', 100, K.red, -6)}${mk(380, 1530, '不能差', 100, K.ink, -3)}
    ${tagS()}${capBar(CAP[4], m === 'doodle' ? { bg: K.white, c: K.ink, rough: 1 } : {})}`;
}

// ------------------------------------------------------------ S3 条漫 × 牛皮纸
const panel = (x, y, w, h, body, fill = '#FFFFFF') => `<g filter="url(#shs)"><clipPath id="c${x}_${y}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/><g clip-path="url(#c${x}_${y})">${body}</g><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${K.ink}" stroke-width="9"/></g>`;
const speed = (cx, cy, n = 60, r0 = 260, r1 = 1400, seed = 1) => { const R = rng(seed); let s = ''; for (let i = 0; i < n; i++) { const a = i / n * 6.283 + R() * .05; s += `<path d="M${cx + Math.cos(a) * r0},${cy + Math.sin(a) * r0} L${cx + Math.cos(a + .012) * r1},${cy + Math.sin(a + .012) * r1} L${cx + Math.cos(a - .012) * r1},${cy + Math.sin(a - .012) * r1} Z" fill="${K.ink}" opacity="${.4 + R() * .5}"/>`; } return s; };
const burst = (x, y, r, text, size, rot = -6) => { let d = ''; for (let i = 0; i <= 36; i++) { const a = i / 36 * 6.283, rr = i % 2 ? r : r * .72; d += (i ? 'L' : 'M') + `${x + Math.cos(a) * rr * 1.25},${y + Math.sin(a) * rr}`; } return `<path d="${d}Z" fill="${K.yel}" stroke="${K.ink}" stroke-width="8" stroke-linejoin="round"/>${txt(x, y + size * .35, text, size, { f: 'Kuai', w: 400, a: 'middle', extra: `transform="rotate(${rot},${x},${y})"` })}`; };
const sfx = (x, y, s, size, r = -10) => `<g transform="translate(${x},${y}) rotate(${r})">${txt(0, 0, s, size, { f: 'Kuai', w: 400, c: K.white, extra: `stroke="${K.ink}" stroke-width="14" paint-order="stroke" stroke-linejoin="round"` })}</g>`;
const kraftBg = tile('tex/Paper004_1080.jpg');
const S3 = [
  () => `${kraftBg}
    ${panel(60, 170, 960, 640, `${txt(110, 300, '未来的账', 90, { f: 'Kuai', w: 400 })}${[['看病', '医保'], ['老了', '养老金']].map(([a, b], i) => txt(120, 420 + i * 100, `${a} → ${b}`, 56, { w: 900 })).join('')}${calc(820, 560, 280, 10, '????')}`)}
    ${panel(60, 840, 960, 740, `<rect x="60" y="840" width="960" height="740" fill="url(#dotsS)" opacity=".12"/><g transform="translate(540,1600) scale(1.3)">${chen(chenP('comic', 'think'))}</g>${sfx(150, 1000, '嗯……', 90, -8)}`)}
    ${tagS()}${capBar(CAP[0])}`,
  () => `${kraftBg}
    ${panel(60, 170, 960, 1410, `<rect x="60" y="170" width="960" height="1410" fill="${K.yel}" opacity=".35"/>${speed(600, 700, 60, 360, 1400, 3)}${pie(600, 700, 320, { sw: 14, fill: '#F3D9A4' })}
      ${mk(300, 420, '每月+500', 66, K.red, -10)}${mk(720, 1060, '前途无量', 60, K.ink, -6)}
      <g transform="translate(300,1600) scale(1.15)">${boss(bossP('comic', 'laugh'))}</g>${sfx(620, 1200, '画!', 150, 8)}`)}
    <g transform="translate(860,1450) rotate(6)">${panel(-170, -170, 340, 340, `<g transform="translate(0,190) scale(.6)">${chen(chenP('comic', 'side'))}</g>`.replace('translate(0,190)', 'translate(0,190)'), '#FFFFFF')}</g>
    ${tagS()}${capBar(CAP[1])}`,
  () => `${kraftBg}
    ${panel(60, 170, 960, 1410, `${speed(540, 860, 70, 300, 1400, 5)}<rect x="60" y="170" width="960" height="1410" fill="#fff" opacity=".4"/>
      ${img('cut/cardboard_box_08.png', 540, 1080, 700, 555, -2, 'filter="url(#sh)"')}
      <g transform="translate(540,760)"><path d="M-180,40 L0,-130 L180,40 V240 H-180 Z" fill="${K.white}" stroke="${K.ink}" stroke-width="10" stroke-linejoin="round"/><path d="M0,-30 c-30,-40 -80,-10 -60,30 l60,50 l60,-50 c20,-40 -30,-70 -60,-30 Z" fill="${K.red}"/></g>
      ${burst(300, 420, 170, '买不走!', 90)}`)}
    ${tagS()}${capBar(CAP[2])}`,
  () => `${kraftBg}
    ${panel(60, 170, 620, 900, `${txt(370, 300, '劳动合同', 64, { f: 'Serif', w: 900, a: 'middle', ls: 8 })}${['第七条 社会保险', '甲方应依法为乙方', '缴纳社会保险费。'].map((l, i) => txt(110, 420 + i * 70, l, 42, { f: 'Serif', w: i ? 500 : 900 })).join('')}<rect x="104" y="370" width="520" height="220" fill="${K.yel}" opacity=".6" style="mix-blend-mode:multiply"/>${sfx(110, 900, '查!', 140, -10)}`)}
    ${panel(60, 1100, 620, 480, `<g transform="translate(370,1620) scale(.9)">${chen(chenP('comic', 'firm'))}</g>`)}
    ${phone(800, 1050, 520, 8)}
    ${tagS()}${capBar(CAP[3])}`,
  () => `${kraftBg}
    ${panel(60, 170, 960, 1410, `${Array.from({ length: 12 }, (_, i) => { const cx = 240 + (i % 3) * 300, cy = 380 + Math.floor(i / 3) * 260; return `<rect x="${cx - 130}" y="${cy - 100}" width="260" height="220" fill="${i < 10 ? '#fff' : K.yel}" stroke="${K.ink}" stroke-width="6"/>${txt(cx - 110, cy - 50, `${i + 1}月`, 40, { w: 900 })}${i < 10 ? `<g transform="translate(${cx + 30},${cy + 30}) rotate(-12)" filter="url(#ink)"><circle r="56" fill="none" stroke="${K.red}" stroke-width="8"/>${txt(0, 14, '已缴', 36, { f: 'Serif', w: 900, a: 'middle', c: K.red })}</g>` : ''}`; }).join('')}`)}
    ${img('cut/stamp_one.png', 840, 1320, 300, 334, 10, 'filter="url(#sh)"')}
    ${burst(300, 1420, 150, '不能差!', 76)}
    ${tagS()}${capBar(CAP[4])}`,
];

const ALL = [F1, F2, F3, F4, F5].map((f) => () => f('cut')).concat([F1, F2, F3, F4, F5].map((f) => () => f('doodle')), S3);
const art = document.getElementById('art');
window.renderAt = async (t) => {
  const i = Math.min(ALL.length - 1, Math.floor(t + 1e-6));
  art.innerHTML = `<svg viewBox="0 0 1080 1920" width="1080" height="1920" xmlns="http://www.w3.org/2000/svg"><defs>${defs}</defs>${ALL[i]()}</svg>`;
  await Promise.all([...art.querySelectorAll('image')].map((im) => new Promise((r) => { const I = new Image(); I.onload = I.onerror = r; I.src = im.getAttribute('href'); })));
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
};
(async () => {
  const s = CAP.join('') + '打工人社保课02未来的账看病医保失业金老了养老金工伤保险一笔都不能糊涂每月+500前途无量以后升职画大饼……¥买不走劳动合同第七条社会甲方应依法为乙方缴纳养老医疗等费白纸黑字掌上12333个人记录已缴未2026按月嗯画!查→?';
  await Promise.all([document.fonts.load('60px Kuai', s), document.fonts.load('60px Wei', s), document.fonts.load('900 60px Sans', s + '0123456789✓✕'), document.fonts.load('900 60px Serif', s), document.fonts.load('500 60px Serif', s), document.fonts.load('500 60px Sans', s)]);
  window.__ready = true;
})();
