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

