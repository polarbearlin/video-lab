// 燃气安全歌 · 风格关键帧（静帧）。renderAt(t) 显示第 floor(t) 张。
window.DEMO = { width: 1080, height: 1920, fps: 30, duration: 6 };

const C = {
  bg: '#F5F1EA', navy: '#2F4858', sage: '#8FB09A', coral: '#E8735A',
  wall: '#EDE4D6', wall2: '#E4D8C6', wood: '#D9B48F', wood2: '#C89F78', cream: '#FBF7F0',
  skin: '#F2C6A0', hair: '#3B3A40', shirt: '#7C97A8', lav: '#B7A6D6', night: '#22313D', gold: '#F2C879',
};
const SW = 6;           // 统一描边粗细
const st = `stroke="${C.navy}" stroke-width="${SW}" stroke-linejoin="round" stroke-linecap="round"`;

// ---------- 通用部件
const tag = (dark = false) => `
  <g transform="translate(70,120)">
    <rect width="292" height="64" rx="32" fill="${dark ? 'rgba(245,241,234,.12)' : C.navy}"/>
    <circle cx="34" cy="32" r="11" fill="${C.coral}"/>
    <text x="58" y="43" font-family="Sans" font-weight="700" font-size="30" fill="${C.cream}">生活安全课 · 01</text>
  </g>`;

// 歌词字幕：关键词用强调色。parts = [[text, color?], ...]
function lyric(parts, y = 1440, dark = false, size = 62) {
  const base = dark ? C.cream : C.navy;
  const spans = parts.map(([s, col]) => `<tspan fill="${col || base}">${s}</tspan>`).join('');
  return `<text x="540" y="${y}" text-anchor="middle" font-family="Wei" font-size="${size}" letter-spacing="4">${spans}</text>
    <rect x="490" y="${y + 34}" width="100" height="6" rx="3" fill="${C.coral}" opacity=".85"/>`;
}

function mom(x, y, s = 1, o = {}) {
  const arm = o.arm || 'down', flip = o.flip ? -1 : 1;
  const armPath = {
    down: `M-46,-150 C-70,-90 -66,-40 -58,-10`,
    reach: `M46,-150 C110,-160 150,-190 190,-215`,
    phone: `M46,-150 C80,-120 70,-190 40,-235`,
    sniff: `M46,-150 C90,-130 70,-205 30,-238`,
  }[arm];
  const hand = { down: [-58, -6], reach: [196, -218], phone: [38, -240], sniff: [28, -240] }[arm];
  return `<g transform="translate(${x},${y}) scale(${s * flip},${s})">
    <ellipse cx="0" cy="8" rx="110" ry="16" fill="${C.navy}" opacity=".12"/>
    <path d="M-70,0 C-78,-80 -70,-150 -50,-185 Q0,-205 50,-185 C70,-150 78,-80 70,0 Z" fill="${C.shirt}" ${st}/>
    <path d="M-40,-150 L40,-150 L52,-6 L-52,-6 Z" fill="${C.cream}" ${st}/>
    <path d="M-40,-150 Q0,-120 40,-150" fill="none" ${st}/>
    <rect x="-18" y="-215" width="36" height="34" fill="${C.skin}" ${st}/>
    <circle cx="0" cy="-262" r="58" fill="${C.skin}" ${st}/>
    <path d="M-58,-262 C-64,-330 50,-345 62,-270 C40,-300 -10,-305 -58,-262 Z" fill="${C.hair}" ${st}/>
    <circle cx="-8" cy="-338" r="26" fill="${C.hair}" ${st}/>
    ${o.face === 'smile'
      ? `<path d="M-26,-262 q8,-8 16,0 M14,-262 q8,-8 16,0" fill="none" ${st}/><path d="M-14,-236 q14,14 28,0" fill="none" ${st}/>`
      : o.face === 'worry'
        ? `<circle cx="-16" cy="-262" r="5" fill="${C.navy}"/><circle cx="22" cy="-262" r="5" fill="${C.navy}"/><path d="M-6,-232 q10,-6 20,0" fill="none" ${st}/><path d="M-30,-282 l16,-6 M18,-288 l16,6" ${st}/>`
        : `<circle cx="-16" cy="-262" r="5" fill="${C.navy}"/><circle cx="22" cy="-262" r="5" fill="${C.navy}"/><path d="M-6,-236 q10,6 20,0" fill="none" ${st}/>`}
    <circle cx="-34" cy="-242" r="10" fill="${C.coral}" opacity=".35"/><circle cx="40" cy="-242" r="10" fill="${C.coral}" opacity=".35"/>
    <path d="${armPath}" fill="none" stroke="${C.navy}" stroke-width="40" stroke-linecap="round"/>
    <path d="${armPath}" fill="none" stroke="${C.shirt}" stroke-width="28" stroke-linecap="round"/>
    <circle cx="${hand[0]}" cy="${hand[1]}" r="17" fill="${C.skin}" ${st}/>
    ${arm === 'phone' ? `<rect x="22" y="-300" width="40" height="70" rx="8" fill="${C.navy}"/>` : ''}
  </g>`;
}

function worker(x, y, s = 1) {
  return `<g transform="translate(${x},${y}) scale(${s})">
    <ellipse cx="0" cy="8" rx="100" ry="15" fill="${C.navy}" opacity=".12"/>
    <path d="M-66,0 C-72,-90 -64,-150 -46,-185 Q0,-200 46,-185 C64,-150 72,-90 66,0 Z" fill="#E9A23B" ${st}/>
    <path d="M-60,-95 H60" stroke="${C.cream}" stroke-width="14"/>
    <rect x="-18" y="-212" width="36" height="30" fill="${C.skin}" ${st}/>
    <circle cx="0" cy="-258" r="54" fill="${C.skin}" ${st}/>
    <path d="M-60,-268 C-58,-330 58,-330 60,-268 Z" fill="${C.cream}" ${st}/><path d="M-62,-268 H84" ${st}/>
    <circle cx="-14" cy="-252" r="5" fill="${C.navy}"/><circle cx="20" cy="-252" r="5" fill="${C.navy}"/><path d="M-8,-226 q12,10 24,0" fill="none" ${st}/>
    <rect x="70" y="-110" width="90" height="64" rx="8" fill="${C.coral}" ${st}/><path d="M95,-110 v-18 h40 v18" fill="none" ${st}/>
    <path d="M50,-160 C80,-130 100,-120 110,-112" fill="none" stroke="${C.navy}" stroke-width="38" stroke-linecap="round"/>
    <path d="M50,-160 C80,-130 100,-120 110,-112" fill="none" stroke="#E9A23B" stroke-width="26" stroke-linecap="round"/>
  </g>`;
}

const spark = (x, y, s = 1, glow = true) => `<g transform="translate(${x},${y}) scale(${s})">
  ${glow ? `<circle r="70" fill="url(#sparkGlow)"/>` : ''}
  <path d="M0,-34 L8,-8 L34,0 L8,8 L0,34 L-8,8 L-34,0 L-8,-8 Z" fill="${C.gold}" stroke="${C.coral}" stroke-width="4" stroke-linejoin="round"/>
</g>`;

const cross = (x, y, s = 1) => `<g transform="translate(${x},${y}) scale(${s}) rotate(-8)">
  <path d="M-60,-60 L60,60 M60,-60 L-60,60" stroke="${C.coral}" stroke-width="26" stroke-linecap="round"/>
</g>`;

const check = (x, y, s = 1) => `<g transform="translate(${x},${y}) scale(${s})">
  <circle r="36" fill="${C.sage}" ${st}/><path d="M-16,0 L-4,13 L18,-12" fill="none" stroke="${C.cream}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
</g>`;

// 漂浮的燃气气流：半透明淡紫色缎带
function gas(x, y, w, a = .5, seed = 0) {
  let out = '';
  for (let i = 0; i < 4; i++) {
    const yy = y + i * 46, ph = seed + i * 1.7, amp = 40 + i * 10;
    let d = `M${x},${yy}`;
    for (let k = 1; k <= 6; k++) d += ` S${x + k * w / 6 - w / 12},${yy + Math.sin(ph + k) * amp} ${x + k * w / 6},${yy + Math.sin(ph + k + .6) * amp * .6}`;
    out += `<path d="${d}" fill="none" stroke="${C.lav}" stroke-width="${26 - i * 4}" stroke-linecap="round" opacity="${a * (1 - i * .18)}"/>`;
  }
  return out;
}

const defs = `<defs>
  <radialGradient id="sparkGlow"><stop offset="0" stop-color="${C.gold}" stop-opacity=".9"/><stop offset=".4" stop-color="${C.coral}" stop-opacity=".35"/><stop offset="1" stop-color="${C.coral}" stop-opacity="0"/></radialGradient>
  <radialGradient id="dark" cx=".62" cy=".5" r=".7"><stop offset="0" stop-color="${C.night}" stop-opacity=".35"/><stop offset="1" stop-color="${C.night}" stop-opacity=".92"/></radialGradient>
  <linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6D9B8"/><stop offset=".6" stop-color="#F5E8D6"/><stop offset="1" stop-color="${C.bg}"/></linearGradient>
  <filter id="soft"><feGaussianBlur stdDeviation="14"/></filter>
</defs>`;

function kitchen() {        // 厨房背景（竖屏）
  return `
  <rect width="1080" height="1920" fill="${C.wall}"/>
  <rect y="0" width="1080" height="260" fill="${C.wall2}"/>
  <!-- 窗 -->
  <g transform="translate(110,430)"><rect width="330" height="380" rx="12" fill="#DCE7E3" ${st}/><path d="M165,0 V380 M0,190 H330" ${st}/>
    <path d="M30,330 q60,-80 120,-30" fill="none" stroke="${C.cream}" stroke-width="10" stroke-linecap="round" opacity=".8"/></g>
  <!-- 油烟机 -->
  <g transform="translate(600,330)"><rect x="70" y="0" width="160" height="150" fill="${C.wall2}" ${st}/><path d="M0,150 H300 L260,250 H40 Z" fill="#CBD3D6" ${st}/>
    <circle cx="230" cy="215" r="13" fill="${C.cream}" ${st}/></g>
  <!-- 台面 -->
  <rect x="0" y="1010" width="1080" height="40" fill="${C.wood}" ${st}/>
  <rect x="0" y="1050" width="1080" height="380" fill="${C.cream}" ${st}/>
  ${[0, 270, 540, 810].map((x) => `<rect x="${x + 20}" y="1080" width="230" height="320" rx="10" fill="none" ${st}/><path d="M${x + 110},1110 h50" ${st}/>`).join('')}
  <!-- 灶台 -->
  <g transform="translate(620,960)"><rect width="260" height="50" rx="10" fill="${C.navy}"/>
    <ellipse cx="70" cy="0" rx="50" ry="12" fill="#55697A"/><ellipse cx="190" cy="0" rx="50" ry="12" fill="#55697A"/>
    <circle cx="70" cy="26" r="11" fill="${C.cream}"/><circle cx="190" cy="26" r="11" fill="${C.cream}"/></g>
  <!-- 燃气阀 -->
  <g transform="translate(900,1180)"><path d="M0,-130 V20" stroke="#E9A23B" stroke-width="16"/><rect x="-34" y="-34" width="68" height="20" rx="10" fill="${C.coral}" ${st}/></g>
  <rect y="1430" width="1080" height="490" fill="${C.wood2}" opacity=".35"/>`;
}

// ---------- 6 张关键帧
const F = [];

// 1 念白「哎，等一下」：伸向开关的手，时间冻结
F.push(() => `
  <rect width="1080" height="1920" fill="${C.wall}"/>
  <rect x="610" y="760" width="250" height="360" rx="26" fill="${C.cream}" ${st}/>
  <rect x="690" y="850" width="90" height="170" rx="16" fill="${C.wall2}" ${st}/><rect x="702" y="862" width="66" height="70" rx="10" fill="${C.cream}" ${st}/>
  <path d="M-40,1180 C200,1150 380,1060 520,960" fill="none" stroke="${C.navy}" stroke-width="128" stroke-linecap="round"/>
  <path d="M-40,1180 C200,1150 380,1060 520,960" fill="none" stroke="${C.shirt}" stroke-width="116" stroke-linecap="round"/>
  <g transform="translate(560,935) rotate(-34)"><rect x="-40" y="-46" width="110" height="92" rx="40" fill="${C.skin}" ${st}/><path d="M60,-20 h60 a16,16 0 0 1 0,32 h-60" fill="${C.skin}" ${st}/></g>
  <rect width="1080" height="1920" fill="url(#dark)"/>
  ${spark(690, 905, 1.1)}
  ${[90, 150, 215].map((r, i) => `<circle cx="660" cy="920" r="${r}" fill="none" stroke="${C.cream}" stroke-width="3" stroke-dasharray="6 14" opacity="${.5 - i * .14}"/>`).join('')}
  ${tag(true)}
  <text x="540" y="470" text-anchor="middle" font-family="Kuai" font-size="150" fill="${C.cream}">哎，等一下</text>
  <text x="540" y="590" text-anchor="middle" font-family="Wei" font-size="64" fill="${C.gold}" letter-spacing="10">手 先 收 回 来</text>
  <g transform="translate(540,1520)" font-family="Sans" text-anchor="middle">
    <rect x="-200" y="-46" width="400" height="70" rx="35" fill="${C.coral}"/>
    <text y="2" font-size="34" font-weight="800" fill="${C.cream}">闻到煤气味 先别动手</text></g>
`);

// 2 主歌一「怪味慢慢飘过来」：厨房全景，气流
F.push(() => `
  ${kitchen()}
  ${gas(560, 820, 520, .55, 1)}
  ${gas(120, 880, 600, .32, 3)}
  ${mom(430, 1330, 1.15, { arm: 'sniff', face: 'worry' })}
  <g transform="translate(560,860)" opacity=".9"><text font-family="Kuai" font-size="58" fill="${C.lav}">?</text><text x="44" y="-40" font-family="Kuai" font-size="44" fill="${C.lav}">?</text></g>
  ${tag()}
  ${lyric([['厨房的'], ['怪味', C.coral], ['慢慢飘过来']], 1600)}
`);

// 3 主歌二「灯别开，也别关」：三个危险动作卡片
F.push(() => {
  const card = (y, icon, title, sub) => `<g transform="translate(90,${y})">
    <rect width="900" height="300" rx="36" fill="${C.cream}" ${st}/>
    <g transform="translate(170,150)">${icon}</g>
    ${spark(255, 75, .7, false)}
    ${cross(170, 150, 1)}
    <text x="350" y="140" font-family="Sans" font-weight="900" font-size="76" fill="${C.navy}">${title}</text>
    <text x="352" y="210" font-family="Sans" font-weight="500" font-size="38" fill="${C.navy}" opacity=".7">${sub}</text></g>`;
  const iconLight = `<rect x="-70" y="-100" width="140" height="200" rx="20" fill="${C.wall}" ${st}/><rect x="-28" y="-60" width="56" height="120" rx="10" fill="${C.cream}" ${st}/>`;
  const iconHood = `<path d="M-100,-20 H100 L70,60 H-70 Z" fill="#CBD3D6" ${st}/><rect x="-30" y="-90" width="60" height="70" fill="${C.wall2}" ${st}/><circle cx="50" cy="30" r="12" fill="${C.cream}" ${st}/>`;
  const iconPhone = `<rect x="-55" y="-100" width="110" height="200" rx="20" fill="${C.navy}"/><rect x="-42" y="-80" width="84" height="150" rx="8" fill="#DCE7E3"/>`;
  return `<rect width="1080" height="1920" fill="${C.bg}"/>
    ${tag()}
    <text x="90" y="380" font-family="Kuai" font-size="96" fill="${C.navy}">这三件事</text>
    <text x="90" y="480" font-family="Kuai" font-size="96" fill="${C.coral}">都会打出火花</text>
    ${card(560, iconLight, '开关灯', '开灯、关灯 都别碰')}
    ${card(900, iconHood, '油烟机', '开关按钮 也别按')}
    ${card(1240, iconPhone, '打电话', '屋里先别急着打')}
    ${lyric([['灯'], ['别开', C.coral], ['，也'], ['别关', C.coral]], 1690)}`;
});

// 4 副歌（高光）「安全四步」：闯关路线
F.push(() => {
  const nodes = [[250, 640, '关阀', '能关就关'], [800, 900, '开窗', '轻轻打开'], [260, 1160, '不碰电', '开关电器都别碰'], [790, 1420, '出门打电话', '到室外再报修']];
  const path = `M250,640 C600,640 800,700 800,900 S260,960 260,1160 S790,1220 790,1420`;
  return `<rect width="1080" height="1920" fill="${C.bg}"/>
    <circle cx="880" cy="380" r="260" fill="${C.sage}" opacity=".16"/>
    ${tag()}
    <text x="90" y="380" font-family="Kuai" font-size="110" fill="${C.navy}">记住这四步</text>
    <path d="${path}" fill="none" stroke="${C.navy}" stroke-width="10" stroke-dasharray="2 26" stroke-linecap="round" opacity=".5"/>
    <path d="M250,640 C600,640 800,700 800,900 S260,960 260,1160" fill="none" stroke="${C.sage}" stroke-width="14" stroke-linecap="round"/>
    ${nodes.map(([x, y, t, s], i) => `<g>
      <circle cx="${x}" cy="${y}" r="92" fill="${i < 3 ? C.cream : C.coral}" ${st}/>
      <text x="${x}" y="${y + 30}" text-anchor="middle" font-family="Sans" font-weight="900" font-size="86" fill="${i < 3 ? C.navy : C.cream}">${i + 1}</text>
      ${i < 3 ? check(x + 70, y - 70, .9) : ''}
      <text x="${x < 540 ? x + 120 : x - 120}" y="${y - 4}" text-anchor="${x < 540 ? 'start' : 'end'}" font-family="Sans" font-weight="900" font-size="62" fill="${C.navy}">${t}</text>
      <text x="${x < 540 ? x + 122 : x - 122}" y="${y + 52}" text-anchor="${x < 540 ? 'start' : 'end'}" font-family="Sans" font-weight="500" font-size="34" fill="${C.navy}" opacity=".65">${s}</text></g>`).join('')}
    <g transform="translate(980,960)" opacity=".85">${[0, 1, 2].map((k) => `<path d="M-150,${k * 34 - 34} q60,-24 120,0" fill="none" stroke="${C.sage}" stroke-width="8" stroke-linecap="round"/>`).join('')}</g>
    ${mom(250, 1600, .55, { arm: 'phone', face: 'smile' })}
    ${lyric([['安全时'], ['关阀', C.sage], ['，轻轻'], ['开门窗', C.sage]], 1720)}`;
});

// 5 Post-Chorus「别逞强，等师傅来检查」：楼下，黄昏
F.push(() => `
  <rect width="1080" height="1920" fill="url(#dusk)"/>
  <circle cx="820" cy="420" r="120" fill="${C.gold}" opacity=".55"/>
  <g transform="translate(140,300)"><rect width="560" height="1050" fill="${C.wall}" ${st}/>
    ${[0, 1, 2, 3].map((r) => [0, 1, 2].map((c) => `<rect x="${50 + c * 170}" y="${70 + r * 210}" width="120" height="140" rx="8" fill="${r === 2 && c === 1 ? '#DCE7E3' : '#E7D9C4'}" ${st}/>`).join('')).join('')}
    <g transform="translate(220,500)" opacity=".9">${[0, 1, 2].map((k) => `<path d="M${k * 40},0 q30,-40 0,-80" fill="none" stroke="${C.sage}" stroke-width="7" stroke-linecap="round"/>`).join('')}</g>
    <rect x="220" y="900" width="130" height="150" rx="10" fill="${C.wood}" ${st}/></g>
  <rect y="1350" width="1080" height="570" fill="#E6DCCB"/><path d="M0,1350 H1080" ${st}/>
  ${mom(330, 1560, 1.0, { arm: 'phone', face: 'smile' })}
  ${worker(780, 1580, 1.0)}
  ${tag()}
  ${lyric([['别逞强，等'], ['师傅', C.coral], ['来检查']], 1730)}
`);

// 6 尾声「今天换我，叮嘱你一下」：妈妈看手机 + 口诀落版
F.push(() => `
  <rect width="1080" height="1920" fill="${C.bg}"/>
  <circle cx="540" cy="760" r="430" fill="${C.gold}" opacity=".18"/>
  ${mom(440, 1180, 1.25, { arm: 'phone', face: 'smile' })}
  <g transform="translate(640,430)">
    <rect width="300" height="300" rx="28" fill="${C.cream}" ${st}/>
    <rect x="22" y="22" width="256" height="70" rx="20" fill="${C.sage}"/><text x="44" y="68" font-family="Sans" font-weight="700" font-size="30" fill="${C.cream}">妈，你也是</text>
    <rect x="22" y="110" width="210" height="70" rx="20" fill="${C.wall2}"/><text x="44" y="156" font-family="Sans" font-weight="700" font-size="30" fill="${C.navy}">照顾好自己</text>
    <path d="M40,300 l-40,50 l70,-50" fill="${C.cream}" ${st}/>
    <text x="230" y="250" font-family="Kuai" font-size="60" fill="${C.coral}">♥</text></g>
  ${tag()}
  <g transform="translate(540,1330)" text-anchor="middle">
    <rect x="-450" y="-80" width="900" height="300" rx="40" fill="${C.navy}"/>
    <text y="-10" font-family="Wei" font-size="44" fill="${C.gold}" letter-spacing="6">今天换我，叮嘱你一下</text>
    ${['关阀', '开窗', '不碰电', '出门再打电话'].map((s, i) => {
      const xs = [-330, -170, 0, 245][i], w = [130, 130, 170, 290][i];
      return `<rect x="${xs - w / 2}" y="40" width="${w}" height="76" rx="38" fill="${i === 3 ? C.coral : C.sage}"/><text x="${xs}" y="92" font-family="Sans" font-weight="900" font-size="38" fill="${C.cream}">${s}</text>`;
    }).join('')}
    <text y="190" font-family="Sans" font-weight="500" font-size="30" fill="${C.cream}" opacity=".7">转给爸妈 · 这条真的能救命</text>
  </g>
`);

const art = document.getElementById('art');
window.renderAt = async (t) => {
  const i = Math.min(F.length - 1, Math.floor(t + 1e-6));
  art.innerHTML = `<svg viewBox="0 0 1080 1920" width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">${defs}${F[i]()}</svg>`;
};
(async () => {
  await Promise.all([document.fonts.load('60px Kuai', '哎等一下这三件事都会打出火花记住四步'), document.fonts.load('60px Wei', '手先收回来厨房的怪味慢慢飘过来灯别开也关安全时阀轻门窗逞强等师傅检查今天换我叮嘱你'),
    document.fonts.load('900 60px Sans', '生活安全课闻到煤气味先别动手开关灯油烟机打电话都碰按钮屋里急着关阀窗不电出门再能就轻轻打到室外报修妈你也是照顾好自己转给爸这条真的救命一二三四01')]);
  window.__ready = true;
})();
