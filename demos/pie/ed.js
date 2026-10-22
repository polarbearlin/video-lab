// 《老板画饼》15 秒 · 杂志编辑排版版。renderAt(t)，t ∈ [0,16)，0 = 歌曲 41.0 s。
window.DEMO = { width: 1080, height: 1920, fps: 30, duration: 16 };

const C = { paper: '#F1ECE2', ink: '#141414', red: '#C9361F', grey: '#8A857C', rule: '#141414' };
const M = 72;                                   // 页边距
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const eOut = (t) => 1 - Math.pow(1 - clamp(t), 4);
const eIO = (t) => { t = clamp(t); return t < .5 ? 8 * t ** 4 : 1 - Math.pow(-2 * t + 2, 4) / 2; };
const eBack = (t) => { t = clamp(t); const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

let LY = [];
const ch = (li, ci) => LY[li].chars[Math.min(ci, LY[li].chars.length - 1)];
const T = (s, x, y, size, o = {}) => `<text x="${x}" y="${y}" font-family="${o.f || 'Serif'}" font-weight="${o.w || 900}" font-size="${size}" fill="${o.c || C.ink}" text-anchor="${o.a || 'start'}" ${o.ls ? `letter-spacing="${o.ls}"` : ''} ${o.op !== undefined ? `opacity="${o.op}"` : ''} ${o.x || ''}>${s}</text>`;
// 遮罩揭示：内容从下往上露出
let mid = 0;
function reveal(p, x, y, w, h, body, dir = 'up') {
  if (p <= 0) return '';
  const id = 'm' + (mid++), q = eOut(p);
  const r = dir === 'up' ? `x="${x}" y="${y + h * (1 - q)}" width="${w}" height="${h * q}"` : `x="${x}" y="${y}" width="${w * q}" height="${h}"`;
  const dy = dir === 'up' ? (1 - q) * h * .35 : 0;
  return `<clipPath id="${id}"><rect ${r}/></clipPath><g clip-path="url(#${id})"><g transform="translate(0,${dy})">${body}</g></g>`;
}
const rule = (x1, y, x2, p, w = 2, col = C.rule) => p <= 0 ? '' : `<path d="M${x1},${y} H${lerp(x1, x2, eOut(p))}" stroke="${col}" stroke-width="${w}"/>`;
// 逐字揭示（每个字在它被唱到的时刻浮现）
function sung(text, li, x, y, size, t, o = {}) {
  let hz = -1, cx = x, s = '';
  for (const c of text) {
    if (/[一-鿿]/.test(c)) hz++;
    const tc = ch(li, Math.max(0, hz) + (o.offset || 0)), p = eOut(prog(t, tc - .06, tc + .22));
    const adv = /[，、 ]/.test(c) ? size * .5 : size * (o.track || 1.02);
    if (p > 0) s += T(c, cx, y + (1 - p) * size * .25, size, { ...o, op: p });
    cx += adv;
  }
  return s;
}

// ---------- 页面框架（全程不动）
function chrome(t, page) {
  const a = eOut(prog(t, 0, .5));
  return `<g opacity="${a}">
    ${T('打工人社保课', M, 120, 30, { f: 'Sans', w: 700 })}
    ${T('ISSUE 02 — SOCIAL INSURANCE', 1080 - M, 120, 26, { f: 'Sans', w: 500, a: 'end', ls: 3, c: C.grey })}
    <path d="M${M},146 H${1080 - M}" stroke="${C.ink}" stroke-width="3"/><path d="M${M},154 H${1080 - M}" stroke="${C.ink}" stroke-width="1"/>
    <path d="M${M},1760 H${1080 - M}" stroke="${C.ink}" stroke-width="1"/>
    ${T(`P. ${page}`, 1080 - M, 1806, 30, { f: 'InsI', w: 400, a: 'end' })}
    ${T('老板画饼 · 第一节副歌', M, 1806, 24, { f: 'Sans', w: 500, c: C.grey, ls: 2 })}</g>`;
}
// 底部歌词：左侧红色竖条 + 宋体
function lyric(t) {
  let li = -1; for (let i = 0; i < LY.length; i++) if (t >= LY[i].start - .15 && t < LY[i].end + .2) li = i;
  if (li < 0) return '';
  const L = LY[li], out = eOut(prog(t, L.end, L.end + .2));
  return `<g opacity="${1 - out}"><rect x="${M}" y="1622" width="8" height="${84 * eOut(prog(t, L.start - .15, L.start + .15))}" fill="${C.red}"/>
    ${sung(L.text, li, M + 36, 1690, 52, t, { w: 600 })}</g>`;
}

// ---------- 段落
function sec1(t) {                    // 0–3.3 未来的账
  const out = eIO(prog(t, 3.05, 3.35));
  const items = [['看病', '医疗保险'], ['失业', '失业保险'], ['老了', '养老保险'], ['受伤', '工伤保险']];
  let s = '';
  s += reveal(prog(t, .05, .6), M, 250, 600, 230, T('未来', M, 450, 220, {}));
  s += reveal(prog(t, .5, 1.05), M, 470, 600, 230, T('的账', M, 670, 220, {}));
  s += `<g>${T('账', 1080 - 40, 1240, 760, { a: 'end', c: C.ink, op: .07 })}</g>`;
  s += T('The ledger nobody reads.', M, 760, 40, { f: 'InsI', w: 400, op: eOut(prog(t, 1.0, 1.5)), c: C.grey });
  items.forEach(([a, b], i) => {
    const t0 = 1.5 + i * .3, y = 900 + i * 130;
    s += rule(M, y + 40, 1080 - M, prog(t, t0 - .1, t0 + .4), 1);
    s += reveal(prog(t, t0, t0 + .35), 0, y - 70, 1080, 120, T(a, M, y, 64, { w: 900 }) + T(b, 1080 - M, y, 40, { f: 'Sans', w: 400, a: 'end', c: C.grey }));
    s += T(`0${i + 1}`, M + 200, y, 34, { f: 'InsI', w: 400, c: C.grey, op: eOut(prog(t, t0 + .1, t0 + .4)) });
  });
  const q = eBack(prog(t, ch(0, 9), ch(0, 9) + .35));      // 「糊涂」时打一个红色问号
  if (q > 0) s += `<g transform="translate(870,560) scale(${q})">${T('?', 0, 90, 300, { f: 'InsI', w: 400, c: C.red, a: 'middle' })}</g>`;
  return `<g transform="translate(0,${-out * 80})" opacity="${1 - out}">${s}</g>`;
}

function sec2(t) {                    // 3.3–6.3 老板画饼别画大
  const out = eIO(prog(t, 6.0, 6.3));
  const draw = eIO(prog(t, 3.45, 4.5));                          // 红笔画圆
  const big = eBack(prog(t, ch(1, 6) - .05, ch(1, 6) + .45));   // 「大」：饼猛地变大
  const R = 300 * (1 + .55 * big);
  const L = 2 * Math.PI * 300 * 1.1;
  let s = '';
  s += reveal(prog(t, 3.3, 3.8), M, 230, 800, 300, T('画饼', M, 470, 250, {}));
  s += T('n. 老板许下、永远兑现不了的承诺', M + 8, 540, 30, { f: 'Sans', w: 400, c: C.grey, op: eOut(prog(t, 3.6, 4.1)) });
  // 饼：手绘红圈 + 芝麻
  s += `<g transform="translate(560,1020)">
    <path d="M${R},0 C${R},${R * .56} ${R * .56},${R} 0,${R} C${-R * .56},${R} ${-R},${R * .56} ${-R},0 C${-R},${-R * .56} ${-R * .56},${-R} 0,${-R} C${R * .6},${-R} ${R * 1.05},${-R * .5} ${R * 1.02},${R * .08}"
      fill="none" stroke="${C.red}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${L}" stroke-dashoffset="${L * (1 - draw)}" transform="rotate(-80)"/>
    ${draw > .95 ? Array.from({ length: 22 }, (_, i) => { const a = i * 2.4, rr = Math.sqrt((i * 37 % 22) / 22) * R * .72; const p = eOut(prog(t, 4.5 + i * .02, 4.7 + i * .02)); return `<ellipse cx="${Math.cos(a) * rr}" cy="${Math.sin(a) * rr}" rx="${9 * p}" ry="${5 * p}" fill="${C.ink}" transform="rotate(${i * 40},${Math.cos(a) * rr},${Math.sin(a) * rr})"/>`; }).join('') : ''}
    ${T('¥500', 0, 30, 130 * (1 + .2 * big), { f: 'InsI', w: 400, a: 'middle', op: eOut(prog(t, 4.0, 4.4)) })}
    ${T('/ 每月', 0, 100, 34, { f: 'Sans', w: 500, a: 'middle', c: C.grey, op: eOut(prog(t, 4.2, 4.6)) })}</g>`;
  // 引线标注
  [['前途无量', 220, 760, 360, 870], ['以后升职', 830, 760, 700, 870], ['年底分红', 840, 1380, 720, 1240]].forEach(([w, x, y, x2, y2], i) => {
    const p = prog(t, 4.6 + i * .18, 4.9 + i * .18);
    if (p <= 0) return;
    s += `<path d="M${x},${y + 14} L${lerp(x, x2, eOut(p))},${lerp(y + 14, y2, eOut(p))}" stroke="${C.ink}" stroke-width="1.5"/><circle cx="${x2}" cy="${y2}" r="${5 * eOut(p)}" fill="${C.ink}"/>
      ${T(w, x, y, 34, { f: 'Sans', w: 500, a: x < 540 ? 'end' : 'start', op: eOut(p) })}`;
  });
  // 「别画大」：横线划掉
  const strike = prog(t, ch(1, 4), ch(1, 4) + .3);
  if (strike > 0) s += `<path d="M${M},420 L${lerp(M, 640, eOut(strike))},${420 - 30 * eOut(strike)}" stroke="${C.red}" stroke-width="16" stroke-linecap="round"/>`;
  return `<g opacity="${1 - out}" transform="translate(0,${-out * 80})">${s}</g>`;
}

function sec3(t) {                    // 6.3–9.4 五百块买不走我的家
  const out = eIO(prog(t, 9.15, 9.45));
  let s = '';
  s += reveal(prog(t, 6.2, 6.7), M, 250, 940, 460, T('¥500', M - 10, 640, 440, { f: 'InsI', w: 400 }));
  const st = prog(t, ch(2, 3) - .02, ch(2, 3) + .25);           // 「买」：一刀划掉
  if (st > 0) s += `<path d="M${M - 20},560 L${lerp(M - 20, 1010, eOut(st))},${lerp(560, 400, eOut(st))}" stroke="${C.red}" stroke-width="22" stroke-linecap="round"/>`;
  s += rule(M, 780, 1080 - M, prog(t, 6.6, 7.2), 2);
  s += reveal(prog(t, ch(2, 4) - .05, ch(2, 4) + .4), M, 820, 900, 200, T('买不走', M, 980, 160, {}));
  s += reveal(prog(t, ch(2, 7) - .05, ch(2, 7) + .4), M, 1030, 900, 330, T('我的家', M, 1300, 260, { c: C.red }));
  // 线描小房子
  const hp = eIO(prog(t, 7.6, 8.6)), HL = 1200;
  s += `<g transform="translate(900,1420) scale(.7)"><path d="M-110,40 L0,-70 L110,40 V180 H-110 Z M-30,180 V100 H30 V180" fill="none" stroke="${C.ink}" stroke-width="5" stroke-linejoin="round" stroke-dasharray="${HL}" stroke-dashoffset="${HL * (1 - hp)}"/></g>`;
  s += T('房租、看病、养老，', M, 1440, 34, { f: 'Sans', w: 400, c: C.grey, op: eOut(prog(t, 7.9, 8.3)) });
  s += T('都不是五百块的事。', M, 1490, 34, { f: 'Sans', w: 400, c: C.grey, op: eOut(prog(t, 8.1, 8.5)) });
  return `<g opacity="${1 - out}" transform="translate(0,${-out * 80})">${s}</g>`;
}

function sec4(t) {                    // 9.4–12.8 合同白纸黑字查一查
  const out = eIO(prog(t, 12.55, 12.85));
  let s = '';
  // 右侧：双色调手机照片
  const ph = eOut(prog(t, 9.4, 10.0));
  s += `<g opacity="${ph}" transform="translate(${lerp(80, 0, ph)},0)">
    <clipPath id="phc"><rect x="560" y="230" width="${1080 - M - 560}" height="1080"/></clipPath>
    <g clip-path="url(#phc)"><rect x="560" y="230" width="448" height="1080" fill="#E2DCCF"/>
      <image href="/assets/stock/cut/hand_holding_smartphone_01.png" x="520" y="280" width="560" height="1011" filter="url(#duo)"/>
      <g transform="translate(578,330)">
        ${T('掌上12333', 40, 70, 34, { f: 'Sans', w: 900 })}${T('缴费记录', 40, 112, 24, { f: 'Sans', w: 500, c: C.grey })}
        ${[1, 2, 3, 4, 5, 6, 7].map((m, i) => { const p = eOut(prog(t, 10.2 + i * .09, 10.5 + i * .09)), bad = i === 5; return p <= 0 ? '' : `<g opacity="${p}"><path d="M40,${150 + i * 74} H360" stroke="${C.ink}" stroke-width="1" opacity=".3"/>${T(`2026.0${m}`, 40, 190 + i * 74, 28, { f: 'InsI', w: 400 })}${T(bad ? '未缴' : '已缴', 360, 190 + i * 74, 26, { f: 'Sans', w: 900, a: 'end', c: bad ? C.red : C.ink })}</g>`; }).join('')}
      </g></g>
    ${T('FIG. 1 — 你的缴费记录，自己查', 560, 1350, 22, { f: 'Sans', w: 500, c: C.grey, ls: 1 })}</g>`;
  // 左侧：合同摘录
  s += reveal(prog(t, 9.45, 9.95), M, 230, 460, 240, T('白纸', M, 420, 200, {}));
  s += reveal(prog(t, ch(3, 4) - .05, ch(3, 4) + .45), M, 450, 460, 240, T('黑字', M, 640, 200, {}));
  s += rule(M, 720, 500, prog(t, 10.0, 10.6), 2);
  s += T('劳动合同 · 第七条', M, 790, 30, { f: 'Sans', w: 700, op: eOut(prog(t, 10.2, 10.6)) });
  ['甲方应依法为乙方', '缴纳养老、医疗、', '失业、工伤等', '社会保险费。'].forEach((l, i) => { s += T(l, M, 870 + i * 64, 42, { w: 500, op: eOut(prog(t, 10.4 + i * .1, 10.8 + i * .1)) }); });
  const hl = eIO(prog(t, ch(3, 7) - .1, ch(3, 8) + .2));        // 「查一查」：红线划过重点
  if (hl > 0) s += `<rect x="${M}" y="902" width="${400 * hl}" height="10" fill="${C.red}"/><rect x="${M}" y="966" width="${Math.max(0, 400 * (hl * 2 - 1))}" height="10" fill="${C.red}"/>`;
  s += `<g transform="translate(${M + 150},1280) scale(${eBack(prog(t, ch(3, 7), ch(3, 7) + .3))})">${T('查一查', 0, 0, 96, { a: 'middle', c: C.red })}</g>`;
  return `<g opacity="${1 - out}" transform="translate(0,${-out * 80})">${s}</g>`;
}

function sec5(t) {                    // 12.8–16 社保按月不能差
  let s = '';
  s += reveal(prog(t, 12.75, 13.25), M, 230, 940, 260, T('按月', M, 450, 230, {}));
  s += T('Every month counts.', M + 520, 450, 46, { f: 'InsI', w: 400, c: C.grey, op: eOut(prog(t, 13.1, 13.6)) });
  // 12 宫格：依次点亮
  const gx = M, gy = 540, cw = (1080 - 2 * M) / 3, chh = 190;
  for (let i = 0; i < 12; i++) {
    const x = gx + (i % 3) * cw, y = gy + Math.floor(i / 3) * chh, t0 = 13.2 + i * .14;
    const p = prog(t, t0, t0 + .25);
    s += `<rect x="${x}" y="${y}" width="${cw}" height="${chh}" fill="none" stroke="${C.ink}" stroke-width="1.5" opacity="${eOut(prog(t, 12.9 + i * .03, 13.2 + i * .03))}"/>`;
    s += T(String(i + 1).padStart(2, '0'), x + 24, y + 70, 64, { f: 'InsI', w: 400, op: eOut(prog(t, 12.9 + i * .03, 13.2 + i * .03)) });
    if (p > 0) s += `<rect x="${x + cw - 70}" y="${y + chh - 70}" width="${44 * eBack(p)}" height="${44 * eBack(p)}" fill="${C.ink}"/>${T('已缴', x + 24, y + chh - 30, 28, { f: 'Sans', w: 700, op: eOut(p) })}`;
  }
  const fin = eBack(prog(t, ch(4, 4) - .05, ch(4, 4) + .4));    // 「不能差」
  if (fin > 0) s += `<g transform="translate(540,1500) scale(${fin}) rotate(-4)"><rect x="-300" y="-110" width="600" height="190" fill="${C.red}"/>${T('不能差', 0, 40, 130, { a: 'middle', c: C.paper })}</g>`;
  return s;
}

const SECS = [[0, 3.35, sec1], [3.0, 6.3, sec2], [6.0, 9.45, sec3], [9.1, 12.85, sec4], [12.5, 16, sec5]];
const art = document.getElementById('art');
window.renderAt = async (t) => {
  mid = 0;
  const page = 41 + Math.floor(t / 3.2);
  const body = SECS.filter(([a, b]) => t >= a && t < b).map(([, , f]) => f(t)).join('');
  const end = eIO(prog(t, 15.4, 16));
  art.innerHTML = `<svg viewBox="0 0 1080 1920" width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
    <defs><filter id="duo"><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="table" tableValues="0.08 0.95"/><feFuncG type="table" tableValues="0.08 0.93"/><feFuncB type="table" tableValues="0.08 0.89"/></feComponentTransfer></filter></defs>
    <image href="/assets/stock/tex/Paper001_1080.jpg" width="1080" height="1080" opacity=".5"/><image href="/assets/stock/tex/Paper001_1080.jpg" y="1080" width="1080" height="1080" opacity=".5"/>
    <rect width="1080" height="1920" fill="${C.paper}" opacity=".55"/>
    ${chrome(t, page)}${body}${lyric(t)}
    ${end > 0 ? `<rect width="1080" height="1920" fill="${C.paper}" opacity="${end}"/>` : ''}</svg>`;
  await Promise.all([...art.querySelectorAll('image')].map((im) => new Promise((r) => { const I = new Image(); I.onload = I.onerror = r; I.src = im.getAttribute('href'); })));
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
};
(async () => {
  LY = await (await fetch('lyrics.json')).json();
  const s = LY.map((l) => l.text).join('') + '打工人社保课老板画饼第一节副歌未来的账看病医疗保险失业受伤工伤养老n许下永远兑现不了承诺每月前途无量以后升职年底分红买走我家房租都是五百块事掌上缴费记录已未你自己查白纸黑字劳动合同第七条甲方应依法为乙缴纳等社会费按差';
  await Promise.all([document.fonts.load('900 60px Serif', s), document.fonts.load('500 60px Serif', s), document.fonts.load('600 60px Serif', s), document.fonts.load('400 60px Sans', s), document.fonts.load('700 60px Sans', s + 'ISSUEOCALNRFG—.0123456789'), document.fonts.load('60px Ins', '¥0123456789'), document.fonts.load('60px InsI', 'The ledger nobody reads.Every month counts.P0123456789¥?.—FIG')]);
  window.__ready = true;
})();
