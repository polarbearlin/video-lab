// 《社保这件事》风格探索：A 票据拼贴 / B 职场条漫 / E 2.5D 写字楼，各 7 张关键帧。
// renderAt(t)：第 floor(t) 张，0–6 = A，7–13 = B，14–20 = E。
window.DEMO = { width: 1080, height: 1920, fps: 30, duration: 21 };

const LY = [
  '"社保咱就不交了，每月多给你五百，行吧？"',
  '这笔账 你得慢慢算一下',
  '万一生病 万一失业 等到退休',
  '"不交社保"的约定 不算话',
  '打开手机 查一查',
  '十一月一号 新规出发',
  '"老板，社保咱按规定交吧。"',
];

// ---------- 小工具
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; }
const T = (x, y, r = 0, s = 1) => `transform="translate(${x},${y}) rotate(${r}) scale(${s})"`;
const txt = (x, y, s, size, o = {}) => `<text x="${x}" y="${y}" font-family="${o.f || 'Sans'}" font-weight="${o.w || 700}" font-size="${size}" fill="${o.c || '#1E1E1E'}" text-anchor="${o.a || 'start'}" ${o.ls ? `letter-spacing="${o.ls}"` : ''} ${o.extra || ''}>${s}</text>`;

// ---------- 人物（半身像，原点在胸口底部中心）
function boss(p) {
  const { suit, skin, ink, sw, hair = '#2A2A2A', shirt = '#FFFFFF', tie = '#C8322B', expr = 'laugh', shade = '' } = p;
  const s = `stroke="${ink}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"`;
  return `
    <path d="M-175,0 C-175,-150 -125,-245 0,-252 C125,-245 175,-150 175,0 Z" fill="${suit}" ${s}/>
    ${shade ? `<path d="M40,-245 C120,-235 170,-150 175,0 L60,0 Z" fill="${shade}" opacity=".9"/>` : ''}
    <path d="M-48,-246 L0,-140 L48,-246 Z" fill="${shirt}" ${s}/>
    <path d="M-13,-232 L13,-232 L20,-150 L0,-118 L-20,-150 Z" fill="${tie}" ${s}/>
    <path d="M-48,-246 L-20,-180 L-70,-170 Z M48,-246 L20,-180 L70,-170 Z" fill="${suit}" ${s}/>
    <rect x="-28" y="-290" width="56" height="50" fill="${skin}" ${s}/>
    <ellipse cx="0" cy="-345" rx="92" ry="96" fill="${skin}" ${s}/>
    <path d="M-92,-352 C-96,-450 70,-470 94,-380 C70,-420 10,-428 -30,-402 C-50,-390 -80,-380 -92,-352 Z" fill="${hair}" ${s}/>
    <ellipse cx="-96" cy="-330" rx="14" ry="22" fill="${skin}" ${s}/><ellipse cx="96" cy="-330" rx="14" ry="22" fill="${skin}" ${s}/>
    ${expr === 'laugh'
      ? `<path d="M-52,-352 q16,-16 32,0 M20,-352 q16,-16 32,0" fill="none" ${s}/><path d="M-44,-300 Q0,-250 44,-300 Z" fill="#7A2A22" ${s}/>`
      : expr === 'shock' ? `<circle cx="-34" cy="-350" r="9" fill="${ink}"/><circle cx="34" cy="-350" r="9" fill="${ink}"/><ellipse cx="0" cy="-292" rx="16" ry="20" fill="#7A2A22" ${s}/>`
        : `<path d="M-52,-352 q16,-12 32,0 M20,-352 q16,-12 32,0" fill="none" ${s}/><path d="M-30,-296 q30,22 60,0" fill="none" ${s}/>`}
    <circle cx="-62" cy="-318" r="14" fill="#E8735A" opacity=".35"/><circle cx="62" cy="-318" r="14" fill="#E8735A" opacity=".35"/>`;
}
function wang(p) {
  const { top, skin, ink, sw, hair = '#2A2A2A', expr = 'calm', badge = '#FFFFFF', shade = '' } = p;
  const s = `stroke="${ink}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"`;
  const face = {
    calm: `<circle cx="-30" cy="-338" r="8" fill="${ink}"/><circle cx="30" cy="-338" r="8" fill="${ink}"/><path d="M-16,-292 q16,10 32,0" fill="none" ${s}/>`,
    doubt: `<circle cx="-30" cy="-338" r="8" fill="${ink}"/><circle cx="30" cy="-338" r="8" fill="${ink}"/><path d="M-50,-372 l34,6 M18,-368 l34,-10" ${s}/><path d="M-14,-290 h28" ${s}/>`,
    think: `<path d="M-40,-338 h20 M20,-338 h20" ${s}/><path d="M-10,-292 q12,-6 24,0" fill="none" ${s}/>`,
    smile: `<path d="M-40,-340 q10,-12 20,0 M20,-340 q10,-12 20,0" fill="none" ${s}/><path d="M-24,-298 q24,24 48,0" fill="none" ${s}/>`,
    firm: `<circle cx="-30" cy="-338" r="8" fill="${ink}"/><circle cx="30" cy="-338" r="8" fill="${ink}"/><path d="M-48,-366 l30,8 M18,-358 l30,-8" ${s}/><path d="M-18,-292 h36" ${s}/>`,
  }[expr];
  return `
    <path d="M-150,0 C-150,-140 -110,-230 0,-236 C110,-230 150,-140 150,0 Z" fill="${top}" ${s}/>
    ${shade ? `<path d="M40,-230 C110,-220 150,-140 150,0 L70,0 Z" fill="${shade}" opacity=".9"/>` : ''}
    <path d="M-60,-226 Q0,-170 60,-226" fill="none" ${s}/>
    <path d="M-40,-210 L-6,-90 M40,-210 L6,-90" stroke="#C8322B" stroke-width="${sw}" fill="none"/>
    <rect x="-34" y="-96" width="68" height="84" rx="8" fill="${badge}" ${s}/><rect x="-20" y="-80" width="40" height="22" rx="4" fill="${ink}" opacity=".7"/>
    <rect x="-24" y="-270" width="48" height="44" fill="${skin}" ${s}/>
    <ellipse cx="0" cy="-330" rx="80" ry="86" fill="${skin}" ${s}/>
    <path d="M-82,-336 C-100,-420 -40,-450 10,-436 C60,-450 104,-410 82,-340 L70,-380 L50,-360 L40,-394 L10,-372 L-10,-400 L-34,-370 L-52,-396 L-66,-362 Z" fill="${hair}" ${s}/>
    <circle cx="-30" cy="-338" r="26" fill="none" ${s}/><circle cx="30" cy="-338" r="26" fill="none" ${s}/><path d="M-4,-338 h8" ${s}/>
    ${face}`;
}

// ============================================================ A 票据拼贴
const A = { kraft: '#E6D8BC', ink: '#1E1E1E', red: '#C8322B', yel: '#F5D547', white: '#FAF7F0', blue: '#7FA7C9', green: '#5E8C6A' };
const aDefs = `
  <pattern id="pw" patternUnits="userSpaceOnUse" width="1080" height="1920"><image href="paperw.jpg" width="1080" height="1920"/></pattern>
  <filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="6" dy="14" stdDeviation="10" flood-color="#3a2a14" flood-opacity=".32"/></filter>
  <filter id="rough"><feTurbulence type="fractalNoise" baseFrequency=".04" numOctaves="3" seed="3"/><feDisplacementMap in="SourceGraphic" scale="9"/></filter>
  <filter id="ink"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="5" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.3 1.45" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter>`;
const paper = (x, y, w, h, r = 0, body = '', o = {}) => `<g ${T(x, y, r)} filter="url(#sh)"><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="${o.fill || 'url(#pw)'}" ${o.torn ? 'filter="url(#rough)"' : ''}/>${body}</g>`;
const tape = (x, y, w, r, img = 12) => `<image href="/assets/textures/washi/washi_solid_${img}.png" x="${x - w / 2}" y="${y - 28}" width="${w}" height="56" preserveAspectRatio="none" transform="rotate(${r},${x},${y})" opacity=".85"/>`;
const stamp = (x, y, text, r = -12, s = 1, col = A.red) => `<g ${T(x, y, r, s)} filter="url(#ink)" opacity=".9">
  <rect x="-170" y="-80" width="340" height="160" rx="18" fill="none" stroke="${col}" stroke-width="12"/><rect x="-154" y="-64" width="308" height="128" rx="10" fill="none" stroke="${col}" stroke-width="4"/>
  ${txt(0, 34, text, 96, { f: 'Serif', w: 900, c: col, a: 'middle', ls: 10 })}</g>`;
const cutout = (x, y, s, body) => `<g ${T(x, y, 0, s)} filter="url(#sh)"><g stroke="${A.white}" stroke-width="34" stroke-linejoin="round" fill="${A.white}">${body.replace(/fill="[^"]*"/g, `fill="${A.white}"`).replace(/stroke="[^"]*"/g, `stroke="${A.white}"`).replace(/stroke-width="[^"]*"/g, 'stroke-width="34"')}</g>${body}</g>`;
const bubbleA = (x, y, w, h, lines, r = -2, o = {}) => paper(x, y, w, h, r, `${lines.map((l, i) => txt(-w / 2 + 40, -h / 2 + 78 + i * 68, l, o.size || 52, { f: o.f || 'Sans', w: 900, c: o.c || A.ink })).join('')}`, { torn: true });
const hl = (x, y, w, h = 34, r = -1) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${A.yel}" opacity=".75" transform="rotate(${r},${x},${y})" style="mix-blend-mode:multiply"/>`;
const capA = (s) => `<g filter="url(#sh)"><rect x="80" y="1600" width="920" height="120" fill="${A.ink}"/>${txt(540, 1680, s, 50, { f: 'Wei', w: 400, c: A.white, a: 'middle' })}</g>`;
const tagA = `<g ${T(70, 110)}><rect width="300" height="64" fill="${A.ink}"/>${txt(24, 44, '打工人社保课 · 02', 30, { c: A.yel, w: 800 })}</g>`;
const bgA = `<image href="kraft.jpg" width="1080" height="1920"/>`;
const bossA = (expr) => boss({ suit: '#3B3F4A', skin: '#F1C7A3', ink: A.ink, sw: 6, expr, shade: '#2E323B' });
const wangA = (expr) => wang({ top: A.blue, skin: '#F1C7A3', ink: A.ink, sw: 6, expr, shade: '#6A93B5' });

const FA = [
  // 1 念白：工资条 + 剪贴人物 + 对话
  () => `${bgA}
    ${paper(560, 1180, 760, 560, 3, `
      ${txt(-330, -200, '工 资 条', 54, { f: 'Serif', w: 900, ls: 12 })}${txt(330, -200, '2026.10', 34, { a: 'end', w: 500 })}
      <path d="M-330,-170 H330" stroke="${A.ink}" stroke-width="3" stroke-dasharray="10 8"/>
      ${[['基本工资', '6,000.00'], ['绩效', '800.00'], ['社保（个人）', '0.00'], ['公积金', '0.00']].map(([k, v], i) => txt(-330, -100 + i * 72, k, 40, { w: 500 }) + txt(330, -100 + i * 72, v, 40, { a: 'end', w: 600 })).join('')}
      <ellipse cx="270" cy="58" rx="110" ry="46" fill="none" stroke="${A.red}" stroke-width="7" transform="rotate(-6,270,58)"/>
      ${txt(150, 210, '+500 现金', 64, { f: 'Kuai', c: A.red, w: 400 })}`)}
    ${tape(300, 905, 220, -14)}${tape(830, 940, 200, 10, 14)}
    ${cutout(380, 860, .9, bossA('laugh'))}
    ${bubbleA(640, 360, 760, 230, ['社保咱就不交了，', '每月多给你五百，行吧？'], -3)}
    ${cutout(880, 1700, .6, wangA('doubt'))}
    ${paper(560, 1600, 360, 110, 4, txt(-150, 18, '……等一下，老板。', 40, { f: 'Wei', w: 400 }), { torn: true })}
    ${tagA}`,
  // 2 这笔账慢慢算：计算器纸带
  () => `${bgA}
    <g ${T(560, 820, -4)} filter="url(#sh)"><rect x="-190" y="-620" width="380" height="1160" fill="url(#pw)"/>
      ${txt(0, -540, '— 这 笔 账 —', 40, { f: 'Serif', a: 'middle', w: 900, ls: 4 })}
      ${[['每月多拿', '+500'], ['一年多拿', '+6,000'], ['', ''], ['医疗保险', '✕'], ['养老保险', '✕'], ['失业保险', '✕'], ['工伤保险', '✕'], ['生育保险', '✕'], ['缴费年限', '0 个月']].map(([k, v], i) => k ? txt(-150, -440 + i * 84, k, 40, { w: 500 }) + txt(150, -440 + i * 84, v, 40, { a: 'end', w: 800, c: v === '✕' ? A.red : A.ink }) : '').join('')}
      <path d="M-150,330 H150" stroke="${A.ink}" stroke-width="4"/><path d="M-150,342 H150" stroke="${A.ink}" stroke-width="2"/>
      ${txt(0, 430, '真的划算吗？', 58, { f: 'Kuai', a: 'middle', c: A.red, w: 400 })}
      <path d="M-190,540 l20,-16 20,16 20,-16 20,16 20,-16 20,16 20,-16 20,16 20,-16 20,16 20,-16 20,16 20,-16 20,16 20,-16 20,16 20,-16 20,16 V560 H-190 Z" fill="${A.kraft}"/></g>
    ${hl(380, 470, 360)}${hl(380, 556, 360)}
    <g ${T(560, 1440, 3)} filter="url(#sh)"><rect x="-260" y="-80" width="520" height="420" rx="40" fill="#3B3F4A"/><rect x="-210" y="-40" width="420" height="90" rx="10" fill="#C9D3C0"/>${txt(190, 30, '6000', 64, { a: 'end', w: 800 })}
      ${[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => `<rect x="${-200 + c * 104}" y="${80 + r * 80}" width="88" height="62" rx="12" fill="${c === 3 ? A.red : A.white}"/>`).join('')).join('')}</g>
    ${tape(560, 210, 240, 3)}
    ${tagA}${capA(LY[1])}`,
  // 3 万一：三张拍立得
  () => `${bgA}
    ${[['住院', '医药费谁来报？', -6, 300, 470, 'hospital'], ['失业', '没收入 谁来接？', 5, 760, 760, 'box'], ['退休', '养老钱在哪？', -3, 330, 1130, 'old']].map(([t, q, r, x, y, ic], i) => paper(x, y, 440, 520, r, `
      <rect x="-190" y="-230" width="380" height="330" fill="#D9D2C2"/>
      ${ic === 'hospital' ? `<rect x="-130" y="-60" width="260" height="70" rx="12" fill="${A.white}" stroke="${A.ink}" stroke-width="5"/><rect x="-140" y="10" width="280" height="20" fill="${A.ink}"/><circle cx="-80" cy="-80" r="34" fill="#F1C7A3" stroke="${A.ink}" stroke-width="5"/><rect x="70" y="-190" width="60" height="60" fill="${A.white}" stroke="${A.red}" stroke-width="6"/><path d="M100,-180 v40 M80,-160 h40" stroke="${A.red}" stroke-width="10"/>`
        : ic === 'box' ? `<path d="M-120,-40 L120,-40 L100,80 L-100,80 Z" fill="#C89F78" stroke="${A.ink}" stroke-width="5"/><path d="M-120,-40 L-80,-90 L80,-90 L120,-40" fill="none" stroke="${A.ink}" stroke-width="5"/><rect x="-40" y="-150" width="40" height="70" fill="${A.blue}" stroke="${A.ink}" stroke-width="4"/><circle cx="40" cy="-120" r="26" fill="#5E8C6A" stroke="${A.ink}" stroke-width="4"/>`
          : `<circle cx="0" cy="-90" r="56" fill="#F1C7A3" stroke="${A.ink}" stroke-width="5"/><path d="M-56,-100 C-50,-160 50,-160 56,-100 C30,-130 -30,-130 -56,-100Z" fill="#DDD" stroke="${A.ink}" stroke-width="5"/><path d="M-110,90 C-110,0 -60,-30 0,-30 C60,-30 110,0 110,90Z" fill="#8C7A6B" stroke="${A.ink}" stroke-width="5"/><path d="M90,-20 v110" stroke="${A.ink}" stroke-width="8"/>`}
      ${txt(-180, 170, '万一', 34, { w: 500, c: '#777' })}${txt(-110, 172, t, 62, { f: 'Serif', w: 900 })}
      ${txt(-180, 230, q, 36, { f: 'Wei', w: 400, c: A.red })}`) + tape(x - 40, y - 268, 180, r * 2 - 4, i % 2 ? 14 : 12)).join('')}
    ${txt(780, 1240, '?', 260, { f: 'Kuai', c: A.red, w: 400, extra: 'opacity=".85" transform="rotate(12,780,1240)"' })}
    ${tagA}${capA(LY[2])}`,
  // 4 约定不算话：协议 + 无效章
  () => `${bgA}
    ${paper(540, 880, 820, 1060, -2, `
      ${txt(0, -420, '补 充 协 议', 64, { f: 'Serif', w: 900, a: 'middle', ls: 14 })}
      ${['甲方：××科技有限公司', '乙方：王××', '', '经双方协商一致，乙方自愿', '放弃缴纳社会保险，甲方每月', '额外支付补贴伍佰元整。'].map((l, i) => txt(-340, -300 + i * 70, l, 40, { f: 'Serif', w: 500 })).join('')}
      ${hl(-344, 40, 560, 40, 0).replace('<rect', '<rect')}
      ${txt(-340, 330, '乙方签字：', 38, { f: 'Serif', w: 500 })}${txt(-140, 334, '王小明', 64, { f: 'Wei', w: 400, c: '#2A3D7A' })}
      <ellipse cx="160" cy="320" rx="38" ry="48" fill="${A.red}" opacity=".75" filter="url(#ink)"/>`)}
    ${stamp(560, 820, '无 效', -14, 1.6)}
    ${paper(760, 1440, 520, 210, 4, `${txt(-230, -40, '2025.9.1 起', 40, { w: 900, c: A.red })}${txt(-230, 20, '约定或承诺"不缴社保"', 36, { w: 600 })}${txt(-230, 72, '法院认定无效', 36, { w: 600 })}`, { fill: A.yel })}
    ${tape(760, 1340, 160, -8, 14)}
    ${tagA}${capA(LY[3])}`,
  // 5 查一查：大字报 + 手机
  () => `<rect width="1080" height="1920" fill="${A.yel}"/>
    ${txt(540, 520, '查', 420, { f: 'Sans', w: 900, a: 'middle', c: A.ink })}${txt(540, 900, '一查', 330, { f: 'Sans', w: 900, a: 'middle', c: A.ink })}
    <g ${T(700, 1250, 8)} filter="url(#sh)"><rect x="-230" y="-420" width="460" height="840" rx="56" fill="${A.ink}"/><rect x="-206" y="-390" width="412" height="780" rx="36" fill="${A.white}"/>
      ${txt(-176, -320, '掌上12333', 40, { w: 900, c: '#1F5FAF' })}${txt(-176, -270, '个人缴费记录', 30, { w: 500, c: '#666' })}
      ${['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'].map((m, i) => { const ok = i !== 4; return `<rect x="-180" y="${-220 + i * 92}" width="360" height="76" rx="12" fill="${ok ? '#EEF3EA' : '#FBE3E0'}"/>${txt(-160, -170 + i * 92, m, 32, { w: 600 })}${txt(160, -170 + i * 92, ok ? '已缴 ✓' : '未缴 ✕', 32, { w: 900, a: 'end', c: ok ? A.green : A.red })}`; }).join('')}</g>
    <g ${T(300, 1300, -10)}>${stamp(0, 0, '自己查', 0, .9, A.red)}</g>
    <g ${T(70, 110)}><rect width="300" height="64" fill="${A.ink}"/>${txt(24, 44, '打工人社保课 · 02', 30, { c: A.yel, w: 800 })}</g>
    ${capA(LY[4])}`,
  // 6 新规：剪报 + 日历
  () => `${bgA}
    ${paper(560, 640, 860, 700, 2, `
      ${txt(-390, -280, '社 会 · 民 生', 30, { f: 'Serif', w: 700, c: '#555', ls: 6 })}<path d="M-390,-260 H390" stroke="${A.ink}" stroke-width="4"/>
      ${txt(-390, -160, '11月1日起', 92, { f: 'Serif', w: 900 })}
      ${txt(-390, -40, '欠缴社保', 92, { f: 'Serif', w: 900 })}${txt(-390, 80, '最高罚3倍', 92, { f: 'Serif', w: 900, c: A.red })}
      <path d="M-390,120 H390" stroke="${A.ink}" stroke-width="2"/>
      ${['税务总局2026年第20号公告：用人单位不缴、少缴', '社保费，经责令限期缴纳仍未缴的，可处欠缴数额', '1倍以上3倍以下罚款。'].map((l, i) => txt(-390, 175 + i * 48, l, 30, { f: 'Serif', w: 500, c: '#333' })).join('')}`, { torn: true })}
    ${hl(170, 330, 420, 70, 2)}
    ${paper(320, 1320, 380, 440, -6, `<rect x="-190" y="-220" width="380" height="110" fill="${A.red}"/>${txt(0, -145, '2026 · 十一月', 40, { a: 'middle', c: A.white, w: 800 })}${txt(0, 120, '1', 300, { f: 'Serif', w: 900, a: 'middle' })}`)}
    ${tape(320, 1100, 150, 6)}
    ${paper(790, 1300, 380, 230, 5, `${txt(-160, -40, '划重点', 44, { f: 'Kuai', w: 400, c: A.red })}${txt(-160, 20, '先责令限期', 38, { w: 700 })}${txt(-160, 76, '仍不缴才罚', 38, { w: 700 })}`, { fill: A.yel })}
    ${tagA}${capA(LY[5])}`,
  // 7 尾声：新工资条 + 已缴章 + 两人
  () => `${bgA}
    ${paper(540, 760, 760, 600, -2, `
      ${txt(-330, -220, '工 资 条', 54, { f: 'Serif', w: 900, ls: 12 })}${txt(330, -220, '2026.11', 34, { a: 'end', w: 500 })}
      <path d="M-330,-190 H330" stroke="${A.ink}" stroke-width="3" stroke-dasharray="10 8"/>
      ${[['基本工资', '6,000.00'], ['绩效', '800.00'], ['社保（个人）', '-612.00'], ['单位同时为你缴纳', '✓']].map(([k, v], i) => txt(-330, -110 + i * 76, k, 40, { w: 500 }) + txt(330, -110 + i * 76, v, 40, { a: 'end', w: 700, c: v === '✓' ? A.green : A.ink })).join('')}`)}
    ${stamp(690, 960, '已 缴', -10, 1.1, A.green)}
    ${cutout(330, 1500, .72, bossA('smile'))}${cutout(760, 1520, .7, wangA('smile'))}
    ${tape(540, 470, 220, -4)}
    ${tagA}${capA(LY[6])}`,
];

// ============================================================ B 职场条漫
const B = { ink: '#111111', yel: '#FFD23F', white: '#FFFFFF', grey: '#BDBDBD', paper: '#F4F1EA' };
const bDefs = `
  <pattern id="dots" patternUnits="userSpaceOnUse" width="14" height="14" patternTransform="rotate(45)"><circle cx="7" cy="7" r="3.2" fill="#111"/></pattern>
  <pattern id="dotsS" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)"><circle cx="5" cy="5" r="1.7" fill="#111"/></pattern>
  <pattern id="dotsY" patternUnits="userSpaceOnUse" width="16" height="16" patternTransform="rotate(45)"><rect width="16" height="16" fill="${B.yel}"/><circle cx="8" cy="8" r="3" fill="#E0A800"/></pattern>`;
const panel = (x, y, w, h, body, o = {}) => `<g><clipPath id="pc${x}_${y}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${o.fill || B.white}"/><g clip-path="url(#pc${x}_${y})">${body}</g>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${B.ink}" stroke-width="10"/></g>`;
const speed = (cx, cy, n = 60, r0 = 260, r1 = 1400, seed = 1) => { const R = rng(seed); let s = ''; for (let i = 0; i < n; i++) { const a = i / n * 6.283 + R() * .05, w = 2 + R() * 6; s += `<path d="M${cx + Math.cos(a) * r0},${cy + Math.sin(a) * r0} L${cx + Math.cos(a + .012) * r1},${cy + Math.sin(a + .012) * r1} L${cx + Math.cos(a - .012) * r1},${cy + Math.sin(a - .012) * r1} Z" fill="${B.ink}" opacity="${.5 + R() * .5}"/>`; void w; } return s; };
const bubbleB = (x, y, w, h, lines, tail = [0, 1], o = {}) => `<g ${T(x, y)}><path d="M${tail[0] * w * .3 - 30},${h / 2 - 10} L${tail[0] * w * .3 + tail[1] * 60},${h / 2 + 70} L${tail[0] * w * .3 + 30},${h / 2 - 10}" fill="${B.white}" stroke="${B.ink}" stroke-width="6" stroke-linejoin="round"/>
  <ellipse rx="${w / 2}" ry="${h / 2}" fill="${o.fill || B.white}" stroke="${B.ink}" stroke-width="6"/><path d="M${tail[0] * w * .3 - 26},${h / 2 - 14} H${tail[0] * w * .3 + 26}" stroke="${o.fill || B.white}" stroke-width="10"/>
  ${lines.map((l, i) => txt(0, -((lines.length - 1) * (o.size || 48) * .6) + i * (o.size || 48) * 1.2 + (o.size || 48) * .36, l, o.size || 48, { f: o.f || 'Sans', w: 900, a: 'middle' })).join('')}</g>`;
const burst = (x, y, r, text, size, o = {}) => { let d = ''; const n = 18; for (let i = 0; i <= n * 2; i++) { const a = i / (n * 2) * 6.283, rr = i % 2 ? r : r * .72; d += (i ? 'L' : 'M') + `${x + Math.cos(a) * rr * 1.25},${y + Math.sin(a) * rr}`; } return `<path d="${d}Z" fill="${o.fill || B.yel}" stroke="${B.ink}" stroke-width="8" stroke-linejoin="round"/>${txt(x, y + size * .35, text, size, { f: 'Kuai', w: 400, a: 'middle', c: B.ink, extra: `transform="rotate(${o.r || -6},${x},${y})"` })}`; };
const sfxB = (x, y, s, size, r = -10) => `<g ${T(x, y, r)}>${txt(0, 0, s, size, { f: 'Kuai', w: 400, c: B.white, extra: `stroke="${B.ink}" stroke-width="14" paint-order="stroke" stroke-linejoin="round"` })}</g>`;
const capB = (s) => `<rect x="60" y="1640" width="960" height="120" fill="${B.ink}"/>${txt(540, 1718, s, 50, { f: 'Wei', w: 400, c: B.yel, a: 'middle' })}`;
const tagB = `<g ${T(60, 70)}><rect width="300" height="60" fill="${B.yel}" stroke="${B.ink}" stroke-width="6"/>${txt(22, 42, '打工人社保课 · 02', 30, { w: 900 })}</g>`;
const bgB = `<rect width="1080" height="1920" fill="${B.paper}"/>`;
const bossB = (expr) => boss({ suit: 'url(#dots)', skin: B.white, ink: B.ink, sw: 8, expr, shirt: B.white, tie: B.yel, hair: B.ink });
const wangB = (expr) => wang({ top: 'url(#dotsS)', skin: B.white, ink: B.ink, sw: 8, expr, hair: B.ink, badge: B.yel });

const FB = [
  () => `${bgB}
    ${panel(60, 160, 960, 820, `<rect x="60" y="160" width="960" height="820" fill="url(#dotsY)" opacity=".5"/>${speed(540, 700, 50, 320, 1200, 2)}
      <g ${T(400, 990, 0, 1.25)}>${bossB('laugh')}</g>
      <g ${T(760, 700, 14)}>${[0, 1, 2, 3].map((i) => `<rect x="${-60 + i * 14}" y="${-90 - i * 6}" width="130" height="64" fill="#F2E6B8" stroke="${B.ink}" stroke-width="5" transform="rotate(${-20 + i * 12})"/>`).join('')}${txt(0, -40, '¥', 50, { w: 900, a: 'middle' })}</g>
      ${bubbleB(640, 300, 700, 220, ['社保咱就不交了，', '每月多给你五百，行吧？'], [-1, -1], { size: 44 })}
      ${sfxB(800, 560, '哈哈', 96, 12)}`)}
    ${panel(60, 1010, 960, 600, `${speed(540, 1300, 70, 200, 900, 4).replace(/fill="#111111"/g, 'fill="#111"')}
      <rect x="60" y="1010" width="960" height="600" fill="${B.white}" opacity=".55"/>
      <g ${T(540, 1700, 0, 1.6)}>${wangB('doubt')}</g>
      ${bubbleB(330, 1110, 420, 130, ['……等一下，老板。'], [1, 1], { size: 40, f: 'Wei' })}
      <path d="M770,1150 q20,40 0,70 q-20,-30 0,-70" fill="#8FD3F4" stroke="${B.ink}" stroke-width="5"/>`)}
    ${tagB}`,
  () => `${bgB}
    ${panel(60, 160, 960, 1440, `<g ${T(360, 1600, 0, 1.5)}>${wangB('think')}</g>
      <g ${T(720, 600)}><circle cx="-180" cy="420" r="18" fill="${B.white}" stroke="${B.ink}" stroke-width="6"/><circle cx="-130" cy="350" r="30" fill="${B.white}" stroke="${B.ink}" stroke-width="6"/>
        <path d="M-260,-60 C-300,-260 -60,-320 20,-250 C120,-330 320,-240 270,-80 C340,20 260,200 120,170 C40,270 -160,240 -200,150 C-330,130 -330,-20 -260,-60 Z" fill="${B.white}" stroke="${B.ink}" stroke-width="7"/>
        ${txt(0, -150, '+500 / 月', 54, { w: 900, a: 'middle' })}${txt(0, -70, '× 12 = 6000', 54, { w: 900, a: 'middle' })}
        ${txt(0, 30, '可是……', 50, { f: 'Wei', w: 400, a: 'middle' })}${txt(0, 110, '医疗？养老？失业？', 46, { w: 900, a: 'middle', c: '#B00' })}</g>
      <g ${T(260, 520, -8)}><rect x="-120" y="-150" width="240" height="300" rx="20" fill="url(#dots)" stroke="${B.ink}" stroke-width="7"/><rect x="-90" y="-120" width="180" height="70" fill="${B.white}" stroke="${B.ink}" stroke-width="5"/>${txt(70, -68, '6000', 44, { w: 900, a: 'end' })}
        ${[0, 1, 2].map((r) => [0, 1, 2].map((c) => `<rect x="${-90 + c * 64}" y="${-30 + r * 56}" width="52" height="42" rx="8" fill="${B.white}" stroke="${B.ink}" stroke-width="4"/>`).join('')).join('')}</g>
      ${sfxB(150, 920, '嗯……', 90, -8)}`)}
    ${tagB}${capB(LY[1])}`,
  () => `${bgB}
    ${[['万一生病', 'hospital'], ['万一失业', 'box'], ['等到退休', 'old']].map(([t, ic], i) => panel(60 + (i === 1 ? 120 : 0), 160 + i * 490, 840, 460, `
      <rect x="0" y="0" width="1080" height="1920" fill="url(#dotsS)" opacity=".18"/>
      ${ic === 'hospital' ? `<g ${T(560, 560 + i * 490)}><rect x="-220" y="-110" width="440" height="110" rx="16" fill="${B.white}" stroke="${B.ink}" stroke-width="7"/><circle cx="-140" cy="-150" r="56" fill="${B.white}" stroke="${B.ink}" stroke-width="7"/><path d="M-160,-150 h40" stroke="${B.ink}" stroke-width="6"/><rect x="140" y="-300" width="90" height="90" fill="${B.yel}" stroke="${B.ink}" stroke-width="6"/><path d="M185,-290 v70 M150,-255 h70" stroke="${B.ink}" stroke-width="12"/></g>`
        : ic === 'box' ? `<g ${T(640, 490 + i * 490)}><path d="M-160,-90 L160,-90 L130,90 L-130,90 Z" fill="url(#dots)" stroke="${B.ink}" stroke-width="7"/><rect x="-60" y="-210" width="60" height="120" fill="${B.white}" stroke="${B.ink}" stroke-width="6"/><circle cx="70" cy="-150" r="44" fill="${B.yel}" stroke="${B.ink}" stroke-width="6"/></g>`
          : `<g ${T(600, 510 + i * 490, 0, .9)}><circle cx="0" cy="-200" r="80" fill="${B.white}" stroke="${B.ink}" stroke-width="7"/><path d="M-80,-210 C-70,-300 70,-300 80,-210 C40,-260 -40,-260 -80,-210 Z" fill="${B.grey}" stroke="${B.ink}" stroke-width="7"/><path d="M-40,-200 h20 M20,-200 h20" stroke="${B.ink}" stroke-width="6"/><path d="M-160,40 C-160,-80 -80,-110 0,-110 C80,-110 160,-80 160,40 Z" fill="url(#dotsS)" stroke="${B.ink}" stroke-width="7"/><path d="M180,-90 v160" stroke="${B.ink}" stroke-width="10"/></g>`}
      <rect x="${60 + (i === 1 ? 120 : 0)}" y="${160 + i * 490}" width="300" height="100" fill="${B.ink}"/>${txt(80 + (i === 1 ? 120 : 0), 228 + i * 490, t, 56, { f: 'Kuai', w: 400, c: B.yel })}
      ${txt(840 + (i === 1 ? 120 : 0), 280 + i * 490, '？', 160, { f: 'Kuai', w: 400, a: 'end' })}`)).join('')}
    ${tagB}${capB(LY[2])}`,
  () => `${bgB}
    ${panel(60, 160, 960, 1440, `${speed(540, 860, 80, 300, 1400, 7)}<rect x="60" y="160" width="960" height="1440" fill="${B.white}" opacity=".35"/>
      <g ${T(540, 860, -6)}><rect x="-330" y="-430" width="660" height="860" fill="${B.white}" stroke="${B.ink}" stroke-width="8"/>
        ${txt(0, -330, '补充协议', 64, { f: 'Serif', w: 900, a: 'middle', ls: 10 })}${['乙方自愿放弃缴纳', '社会保险，甲方每月', '额外支付五百元。'].map((l, i) => txt(-270, -200 + i * 70, l, 44, { f: 'Serif', w: 600 })).join('')}
        ${txt(-270, 260, '乙方：', 44, { f: 'Serif', w: 600 })}${txt(-130, 266, '王小明', 64, { f: 'Wei', w: 400 })}</g>
      ${burst(560, 900, 280, '无效!!', 170)}
      ${sfxB(130, 1450, '啪!', 130, -14)}`)}
    <g ${T(560, 1460, 2)}><rect x="-330" y="-70" width="660" height="140" fill="${B.yel}" stroke="${B.ink}" stroke-width="7"/>${txt(0, -8, '2025.9.1起 "不缴社保"约定', 38, { w: 900, a: 'middle' })}${txt(0, 44, '法院认定无效', 38, { w: 900, a: 'middle' })}</g>
    ${tagB}${capB(LY[3])}`,
  () => `<rect width="1080" height="1920" fill="${B.yel}"/>${speed(540, 1100, 90, 380, 1600, 9)}
    <g ${T(560, 1150, -8)}><rect x="-240" y="-440" width="480" height="880" rx="60" fill="${B.ink}"/><rect x="-212" y="-408" width="424" height="816" rx="40" fill="${B.white}"/>
      ${txt(-180, -330, '掌上12333', 44, { w: 900 })}${txt(-180, -280, '个人缴费记录', 30, { w: 600, c: '#555' })}
      ${['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'].map((m, i) => { const ok = i !== 4; return `<rect x="-184" y="${-230 + i * 96}" width="368" height="80" rx="10" fill="${ok ? B.white : B.yel}" stroke="${B.ink}" stroke-width="5"/>${txt(-164, -178 + i * 96, m, 34, { w: 700 })}${txt(164, -178 + i * 96, ok ? '已缴 ✓' : '未缴 ✕', 34, { w: 900, a: 'end' })}`; }).join('')}</g>
    <g ${T(300, 1420, 0, .9)}><path d="M-60,40 C-120,-40 -110,-140 -40,-170 L60,-150 C100,-100 90,0 40,60 Z" fill="${B.white}" stroke="${B.ink}" stroke-width="8"/></g>
    ${txt(540, 420, '查一查!', 230, { f: 'Kuai', w: 400, a: 'middle', c: B.white, extra: `stroke="${B.ink}" stroke-width="22" paint-order="stroke" stroke-linejoin="round" transform="rotate(-6,540,420)"` })}
    ${tagB}${capB(LY[4])}`,
  () => `${bgB}
    ${panel(60, 160, 960, 1440, `<rect x="60" y="160" width="960" height="1440" fill="${B.ink}"/>${speed(540, 760, 70, 260, 1300, 11).replace(/fill="#111111"/g, `fill="${B.white}"`)}
      <g ${T(540, 760)}><rect x="-260" y="-300" width="520" height="560" rx="20" fill="${B.white}" stroke="${B.ink}" stroke-width="8"/><rect x="-260" y="-300" width="520" height="140" fill="${B.yel}" stroke="${B.ink}" stroke-width="8"/>
        ${txt(0, -205, '十一月', 70, { f: 'Kuai', w: 400, a: 'middle' })}${txt(0, 200, '1', 360, { f: 'Serif', w: 900, a: 'middle' })}</g>
      ${burst(760, 1250, 200, '最高3倍!', 92, { r: 8 })}
      <g ${T(330, 1300, -8)}><rect x="-200" y="-90" width="400" height="180" fill="${B.white}" stroke="${B.ink}" stroke-width="7"/>${txt(0, -12, '新规出发', 66, { f: 'Kuai', w: 400, a: 'middle' })}${txt(0, 54, '欠缴社保的单位注意', 30, { w: 900, a: 'middle' })}</g>
      ${sfxB(110, 420, '咚!', 140, -12)}`)}
    ${tagB}${capB(LY[5])}`,
  () => `${bgB}
    ${panel(60, 160, 960, 1440, `<rect x="60" y="160" width="960" height="1440" fill="url(#dotsY)" opacity=".45"/>
      <g ${T(330, 1600, 0, 1.25)}>${bossB('smile')}</g><g ${T(770, 1600, 0, 1.2)}>${wangB('smile')}</g>
      ${bubbleB(720, 420, 620, 230, ['老板，社保', '咱按规定交吧。'], [1, 1], { size: 52, f: 'Wei' })}
      ${bubbleB(300, 760, 360, 140, ['好，按规定来！'], [-1, 1], { size: 40 })}
      ${[0, 1, 2, 3, 4].map((i) => `<path d="M${540 + Math.cos(i * 1.25) * 90},${980 + Math.sin(i * 1.25) * 60} l14,-30" stroke="${B.ink}" stroke-width="6" stroke-linecap="round"/>`).join('')}`)}
    ${tagB}${capB(LY[6])}`,
];

// ============================================================ E 2.5D 写字楼
const E = { bg: '#EEF1F4', bg2: '#E3E8EE', navy: '#2D3A4A', teal: '#2BB3A3', orange: '#F29E4C', red: '#E05A47', white: '#FFFFFF', wall: '#F7F4EE', blue: '#5B8DEF', yel: '#F6C445' };
const C30 = Math.cos(Math.PI / 6), S30 = .5;
const P = (x, y, z) => [(x - y) * C30, (x + y) * S30 - z];
const poly = (pts, fill, o = '') => `<path d="M${pts.map((p) => p.join(',')).join(' L')} Z" fill="${fill}" stroke="${E.navy}" stroke-width="3" stroke-linejoin="round" ${o}/>`;
function box(x, y, z, w, d, h, top, left, right) {
  const a = P(x, y, z + h), b = P(x + w, y, z + h), c = P(x + w, y + d, z + h), e = P(x, y + d, z + h);
  const b0 = P(x + w, y, z), c0 = P(x + w, y + d, z), e0 = P(x, y + d, z);
  return poly([e, c, c0, e0], left) + poly([c, b, b0, c0], right) + poly([a, b, c, e], top);
}
const shadeOf = (hex, k) => { const n = parseInt(hex.slice(1), 16); const r = Math.round(((n >> 16) & 255) * k), g = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k); return `rgb(${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)})`; };
const cube = (x, y, z, w, d, h, col) => box(x, y, z, w, d, h, col, shadeOf(col, .86), shadeOf(col, .72));
function isoMan(x, y, z, col, o = {}) {
  const [px, py] = P(x, y, z);
  return `<g transform="translate(${px},${py}) scale(${o.s || 1})">
    <ellipse cx="0" cy="0" rx="26" ry="13" fill="${E.navy}" opacity=".15"/>
    <path d="M-18,0 L-18,-52 Q0,-64 18,-52 L18,0 Z" fill="${col}" stroke="${E.navy}" stroke-width="3"/>
    ${o.tie ? `<path d="M-3,-58 L3,-58 L4,-30 L0,-24 L-4,-30 Z" fill="${E.red}"/>` : ''}
    <circle cx="0" cy="-78" r="17" fill="#F1C7A3" stroke="${E.navy}" stroke-width="3"/>
    <path d="M-17,-80 C-16,-102 16,-102 17,-82 C8,-92 -8,-94 -17,-80 Z" fill="${o.hair || '#2A2A2A'}"/>
    ${o.glasses ? `<circle cx="-6" cy="-78" r="5" fill="none" stroke="${E.navy}" stroke-width="2"/><circle cx="7" cy="-78" r="5" fill="none" stroke="${E.navy}" stroke-width="2"/>` : ''}</g>`;
}
const coin = (x, y, z, s = 1) => { const [px, py] = P(x, y, z); return `<g transform="translate(${px},${py}) scale(${s})"><ellipse rx="22" ry="11" cy="6" fill="#C9962F"/><ellipse rx="22" ry="11" fill="${E.yel}" stroke="${E.navy}" stroke-width="2.5"/>${txt(0, 5, '¥', 14, { w: 900, a: 'middle', c: E.navy })}</g>`; };
const isoLabel = (x, y, z, s, col = E.navy, size = 34) => { const [px, py] = P(x, y, z); return txt(px, py, s, size, { w: 900, a: 'middle', c: col }); };
const capE = (s) => `<rect x="90" y="1620" width="900" height="110" rx="55" fill="${E.navy}"/>${txt(540, 1693, s, 48, { f: 'Wei', w: 400, c: E.white, a: 'middle' })}`;
const tagE = `<g ${T(70, 110)}><rect width="310" height="64" rx="32" fill="${E.white}" stroke="${E.navy}" stroke-width="3"/><circle cx="34" cy="32" r="11" fill="${E.teal}"/>${txt(58, 43, '打工人社保课 · 02', 30, { w: 800, c: E.navy })}</g>`;
const bgE = `<rect width="1080" height="1920" fill="${E.bg}"/><circle cx="880" cy="380" r="300" fill="${E.bg2}"/><circle cx="160" cy="1500" r="240" fill="${E.bg2}"/>`;
const world = (x, y, s, body) => `<g transform="translate(${x},${y}) scale(${s})">${body}</g>`;
const bubbleE = (x, y, w, lines, o = {}) => `<g ${T(x, y)}><rect x="${-w / 2}" y="-${40 + lines.length * 34}" width="${w}" height="${40 + lines.length * 68}" rx="34" fill="${o.fill || E.white}" stroke="${E.navy}" stroke-width="4"/><path d="M${o.tx || -30},${lines.length * 34} l${o.tdx || -20},40 l50,-40" fill="${o.fill || E.white}" stroke="${E.navy}" stroke-width="4" stroke-linejoin="round"/><path d="M${(o.tx || -30) - 2},${lines.length * 34 - 2} h54" stroke="${o.fill || E.white}" stroke-width="7"/>${lines.map((l, i) => txt(0, -lines.length * 34 + 54 + i * 68, l, o.size || 40, { w: 900, a: 'middle', c: o.c || E.navy })).join('')}</g>`;
function office() {    // 一间等轴办公室
  return cube(0, 0, -20, 520, 420, 20, '#DCD3C4') +
    poly([P(0, 0, 0), P(520, 0, 0), P(520, 0, 360), P(0, 0, 360)], E.wall) + poly([P(0, 0, 0), P(0, 420, 0), P(0, 420, 360), P(0, 0, 360)], shadeOf(E.wall, .92)) +
    poly([P(200, 0, 160), P(360, 0, 160), P(360, 0, 300), P(200, 0, 300)], '#CFE3F2') +
    poly([P(0, 120, 120), P(0, 260, 120), P(0, 260, 260), P(0, 120, 260)], '#E7C9A0') +
    cube(180, 160, 0, 220, 110, 90, '#B98A5E') + cube(220, 180, 90, 80, 50, 6, E.navy) + poly([P(240, 190, 96), P(290, 190, 96), P(290, 190, 150), P(240, 190, 150)], '#9FC4E8');
}
const FE = [
  () => `${bgE}${world(560, 760, 1.5, office() + isoMan(140, 300, 0, E.navy, { tie: 1 }) + isoMan(430, 240, 0, E.blue, { glasses: 1 }) + coin(200, 260, 70) + coin(215, 250, 85) + coin(190, 245, 100))}
    ${bubbleE(380, 470, 620, ['社保咱就不交了，', '每月多给你五百，行吧？'], { size: 38, tx: -60 })}
    ${bubbleE(760, 1300, 380, ['……等一下，老板。'], { size: 34, tx: 40, tdx: 10 })}
    ${tagE}`,
  () => `${bgE}${world(540, 980, 1.35, (() => {
      let s = cube(-260, -40, -20, 520, 520, 20, '#DCD3C4');
      for (let i = 0; i < 12; i++) s += coin(-180 + (i % 6) * 10, 40, 10 + i * 12, 1.1);
      s += isoLabel(-150, 40, 190, '+500 × 12', E.navy, 30);
      [['医疗', E.teal], ['养老', E.blue], ['失业', E.orange], ['工伤', '#9B7BD8']].forEach(([n, c], i) => { s += cube(40 + i * 0, 40 + i * 110, 0, 160, 70, 100, '#FFFFFF') + isoLabel(120, 75 + i * 110, 116, n, c, 30) + isoLabel(210, 75 + i * 110, 60, '✕', E.red, 46); });
      return s;
    })())}
    ${txt(540, 420, '这笔账', 110, { f: 'Kuai', w: 400, a: 'middle', c: E.navy })}${txt(540, 540, '多拿的 vs 少了的', 54, { w: 800, a: 'middle', c: E.orange })}
    ${tagE}${capE(LY[1])}`,
  () => `${bgE}${world(500, 1250, .95, (() => {
      let s = '';
      const floors = [['退休', '#F3E6D3', '养老钱在哪？'], ['失业', '#E6EEF5', '谁来接住你？'], ['生病', '#EAF4F1', '医药费谁报？']];
      floors.forEach(([n, col, q], i) => {
        const z = (2 - i) * 300;
        s += cube(-300, -200, z, 600, 400, 20, '#D5CCBE') + poly([P(-300, -200, z + 20), P(300, -200, z + 20), P(300, -200, z + 280), P(-300, -200, z + 280)], col) + poly([P(-300, -200, z + 20), P(-300, 200, z + 20), P(-300, 200, z + 280), P(-300, -200, z + 280)], shadeOf(col, .93));
        if (n === '生病') s += cube(-100, -60, z + 20, 240, 110, 50, E.white) + isoMan(-40, -10, z + 70, '#9FC4E8', { s: .9 }) + cube(180, -150, z + 20, 30, 30, 160, '#C7D0D8');
        if (n === '失业') s += cube(-60, -40, z + 20, 140, 100, 70, '#C89F78') + isoMan(160, 40, z + 20, E.blue, { glasses: 1 });
        if (n === '退休') s += isoMan(0, 0, z + 20, '#8C7A6B', { hair: '#DDDDDD' }) + cube(120, -60, z + 20, 100, 100, 60, '#B98A5E');
        const [qx, qy] = P(300, -200, z + 200); s += `<g transform="translate(${qx - 40},${qy})"><rect x="-10" y="-50" width="250" height="110" rx="20" fill="#fff" stroke="#2D3A4A" stroke-width="3"/>` + txt(10, -6, `万一${n}`, 36, { w: 900, c: E.navy }) + txt(10, 40, q, 28, { w: 700, c: E.red }) + '</g>';
      });
      return s;
    })())}
    ${tagE}${capE(LY[2])}`,
  () => `${bgE}${world(540, 1000, 1.6, cube(-220, -160, -20, 440, 320, 20, '#DCD3C4') + cube(-160, -100, 0, 320, 220, 110, '#B98A5E') +
      poly([P(-110, -60, 110), P(110, -60, 110), P(110, 120, 110), P(-110, 120, 110)], E.white) + [0, 1, 2, 3].map((i) => poly([P(-80, -30 + i * 30, 111), P(70, -30 + i * 30, 111), P(70, -22 + i * 30, 111), P(-80, -22 + i * 30, 111)], '#B8C2CC', 'stroke-width="0"')).join(''))}
    <g ${T(560, 900, -12)} opacity=".92"><rect x="-200" y="-90" width="400" height="180" rx="20" fill="none" stroke="${E.red}" stroke-width="14"/>${txt(0, 40, '无 效', 110, { f: 'Serif', w: 900, a: 'middle', c: E.red, ls: 16 })}</g>
    ${txt(540, 420, '"不交社保"的约定', 72, { w: 900, a: 'middle', c: E.navy })}${txt(540, 520, '签了字也不算数', 56, { w: 800, a: 'middle', c: E.red })}
    <g ${T(540, 1380)}><rect x="-360" y="-60" width="720" height="120" rx="24" fill="${E.white}" stroke="${E.navy}" stroke-width="3"/>${txt(0, 14, '2025.9.1 起 · 最高法司法解释（二）', 36, { w: 700, a: 'middle', c: E.navy })}</g>
    ${tagE}${capE(LY[3])}`,
  () => `${bgE}${world(540, 1250, 1.2, cube(-300, -300, -20, 600, 600, 20, '#DCD3C4') + isoMan(200, 120, 0, E.blue, { glasses: 1, s: 1.3 }))}
    <g ${T(470, 1000, -4)}><rect x="-210" y="-400" width="420" height="800" rx="50" fill="${E.navy}"/><rect x="-188" y="-372" width="376" height="744" rx="32" fill="${E.white}"/>
      ${txt(-160, -300, '掌上12333', 40, { w: 900, c: E.blue })}${txt(-160, -254, '个人缴费记录', 28, { w: 600, c: '#667' })}
      ${['01', '02', '03', '04', '05', '06'].map((m, i) => { const ok = i !== 4; return `<rect x="-164" y="${-210 + i * 92}" width="328" height="76" rx="14" fill="${ok ? '#E7F4EF' : '#FBE3E0'}"/>${txt(-144, -160 + i * 92, '2026-' + m, 32, { w: 700, c: E.navy })}${txt(144, -160 + i * 92, ok ? '已缴 ✓' : '未缴 ✕', 32, { w: 900, a: 'end', c: ok ? E.teal : E.red })}`; }).join('')}</g>
    ${txt(540, 400, '打开手机 查一查', 86, { f: 'Kuai', w: 400, a: 'middle', c: E.navy })}${txt(540, 500, '掌上12333 · 个人缴费记录', 44, { w: 700, a: 'middle', c: E.teal })}
    ${tagE}${capE(LY[4])}`,
  () => `${bgE}${world(540, 1060, 1.4, cube(-260, -200, -20, 520, 400, 20, '#DCD3C4') + cube(-150, -60, 0, 200, 60, 260, E.white) + cube(-150, -60, 200, 200, 60, 60, E.red) + isoLabel(-50, -60, 220, '十一月', E.white, 30) + isoLabel(-40, -60, 90, '1', E.navy, 120) +
      cube(100, 40, 0, 90, 40, 40, '#8C6A4A') + cube(130, 20, 40, 30, 80, 120, '#8C6A4A') + box(60, 0, 140, 160, 120, 60, '#A57F59', '#8C6A4A', '#755838'))}
    ${txt(540, 420, '11月1日起', 96, { w: 900, a: 'middle', c: E.navy })}${txt(540, 540, '欠缴社保 最高罚3倍', 70, { w: 900, a: 'middle', c: E.red })}
    <g ${T(540, 1420)}><rect x="-380" y="-60" width="760" height="120" rx="24" fill="${E.white}" stroke="${E.navy}" stroke-width="3"/>${txt(0, 14, '先责令限期，仍不缴才罚 · 税务总局公告', 34, { w: 700, a: 'middle', c: E.navy })}</g>
    ${tagE}${capE(LY[5])}`,
  () => `${bgE}${world(540, 1180, 1.05, (() => {
      let s = cube(-340, -300, -20, 680, 600, 20, '#DCD3C4');
      s += box(-120, -120, 0, 240, 240, 520, E.white, shadeOf(E.wall, .9), shadeOf(E.wall, .78));
      for (let f = 0; f < 4; f++) for (let k = 0; k < 3; k++) { s += poly([P(-110 + k * 75, 121, 60 + f * 110), P(-60 + k * 75, 121, 60 + f * 110), P(-60 + k * 75, 121, 130 + f * 110), P(-110 + k * 75, 121, 130 + f * 110)], '#CFE3F2'); }
      [['养老', E.blue], ['医疗', E.teal], ['失业', E.orange], ['工伤', '#9B7BD8']].forEach(([n, c], i) => { const y = -240 + i * 150; s += box(140, y, 20, 180, 30, 30, c, shadeOf(c, .85), shadeOf(c, .7)) + cube(320, y - 30, 0, 90, 90, 110, c) + isoLabel(365, y + 15, 130, n, E.navy, 26); for (let j = 0; j < 3; j++) s += coin(170 + j * 50, y + 15, 70, .7); });
      s += isoMan(-200, 160, 0, E.navy, { tie: 1 }) + isoMan(-120, 240, 0, E.blue, { glasses: 1 });
      return s;
    })())}
    ${txt(540, 420, '每一份社保', 90, { f: 'Kuai', w: 400, a: 'middle', c: E.navy })}${txt(540, 530, '都接好了', 90, { f: 'Kuai', w: 400, a: 'middle', c: E.teal })}
    ${tagE}${capE(LY[6])}`,
];

// ---------- 合成
const ALL = [...FA.map((f) => [f, aDefs]), ...FB.map((f) => [f, bDefs]), ...FE.map((f) => [f, ''])];
const art = document.getElementById('art');
window.renderAt = async (t) => {
  const i = Math.min(ALL.length - 1, Math.floor(t + 1e-6)), [f, d] = ALL[i];
  art.innerHTML = `<svg viewBox="0 0 1080 1920" width="1080" height="1920" xmlns="http://www.w3.org/2000/svg"><defs>${d}</defs>${f()}</svg>`;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await Promise.all([...art.querySelectorAll('image')].map((im) => im.decode ? im.decode().catch(() => {}) : null));
};
(async () => {
  const s = LY.join('') + '工资条基本绩效社保个人公积金现金这笔账每月多拿一年医疗养老失业工伤生育缴费年限个真的划算吗住院医药费谁来报没收入接退休钱在哪万补充协议甲方乙方科技有限公司王经双方商致自愿放弃缴纳社会险额外支付补贴伍佰元整签字小明无效起约定或承诺法院认定掌上个人记录已未缴自己查民罚倍税务总局第号公告用单位少责令限期仍可处欠数以下划重点先才十一月已为你同时嗯可是啪咚哈好按规来每份都接了多的少新出发注意最高司法解释二打工人课';
  await Promise.all(['Kuai', 'Wei'].map((f) => document.fonts.load(`60px ${f}`, s)).concat([document.fonts.load('900 60px Sans', s + '0123456789¥✓✕+-×=./?？'), document.fonts.load('900 60px Serif', s), document.fonts.load('500 60px Serif', s), document.fonts.load('500 60px Sans', s)]));
  window.__ready = true;
})();
