// 《国王的弟弟被抓了》各段画面。由 index.html 拼进页面（见 tools/assemble.py）。
// k = 本段内时间（秒），b.kw('词') = 该词在本段旁白里出现的时间。
const B = {};
const SEC = { '钩子': 0, '第一层': 1, '第二层': 2, '第三层': 3, '第四层': 4, '第五层': 5, '结尾': 6 };

// ---------- 系列包装 ----------
function bug(dark) {
  ctx.fillStyle = C.ink2; ctx.fillRect(56, 44, 28, 40); ctx.fillStyle = C.marker; ctx.fillRect(56, 58, 28, 12);
  text('爱泼斯坦案', 98, 76, '28px Black', dark ? C.white : C.ink);
  text('国王的弟弟被抓了，抓他的却不是那桩指控', 98 + tw('爱泼斯坦案', '28px Black') + 16, 74, '400 20px NSC', dark ? C.grey : C.sub);
}
function layers(n, dark) {   // 右上角：一层一层剥
  if (n < 1 || n > 5) return; const x0 = W - 380, y0 = 50;
  text('第' + '一二三四五'[n - 1] + '层', x0 - 16, y0 + 26, '700 24px NSC', dark ? C.white : C.ink, 'right');
  for (let i = 0; i < 5; i++) { ctx.fillStyle = i < n ? C.marker : (dark ? '#2A2A2E' : '#D8D0C2'); ctx.fillRect(x0 + i * 62, y0 + 6, 54, 22); }
}
function frame(mode, b) { bg(mode); const dark = mode !== 'paper'; bug(dark); layers(SEC[b.sec], dark); return dark; }
function head(n, title, p, dark) {   // 每层开头的章节头
  alpha(clamp(p / 0.3), () => {
    text(n, 90, 250, '900 120px Serif', dark ? C.white : C.ink); text(title, 90 + tw(n, '900 120px Serif') + 26, 240, '900 72px Serif', dark ? C.white : C.ink);
    ctx.fillStyle = C.marker; ctx.fillRect(90, 280, 1740 * easeOut(p / 0.6), 6);
  });
}
function redact(x, y, w, h, p) { if (p <= 0) return; ctx.fillStyle = C.ink2; ctx.fillRect(x, y, w * easeOut(p / 0.35), h); }
function strikeLine(x, y, w, p, col = C.red) { if (p <= 0) return; ctx.strokeStyle = col; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w * easeOut(p / 0.3), y - 6 * easeOut(p / 0.3)); ctx.stroke(); }
function src(s, dark = true) { chip(s, 90, 1046, dark); }   // 画面角标（出处），旁白不念
function crown(cx, cy, s, col, p) {
  if (p <= 0) return; ctx.save(); ctx.globalAlpha *= clamp(p * 3); ctx.translate(cx, cy); ctx.scale(s, s); ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(-100, 60); ctx.lineTo(-100, -20); ctx.lineTo(-55, 20); ctx.lineTo(0, -60); ctx.lineTo(55, 20); ctx.lineTo(100, -20); ctx.lineTo(100, 60); ctx.closePath(); ctx.fill();
  ctx.fillRect(-100, 72, 200, 22); ctx.restore();
}
function emailCard(x, y, w, p, k) {   // 示意邮件
  if (p <= 0) return; const e = easeOut(p / 0.4); ctx.save(); ctx.globalAlpha *= clamp(p * 3); ctx.translate(0, (1 - e) * 50);
  ctx.fillStyle = '#FBFAF7'; ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 24; ctx.fillRect(x, y, w, 470); ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#E9E4DA'; ctx.fillRect(x, y, w, 64); text('转发：官方出访报告', x + 30, y + 44, '700 28px NSC', C.ink);
  text('收件人', x + 30, y + 120, '400 24px NSC', C.sub); text('杰弗里·爱泼斯坦', x + 140, y + 120, '700 28px NSC', C.ink);
  text('时间', x + 30, y + 170, '400 24px NSC', C.sub); text('2010', x + 140, y + 170, '600 30px Num', C.ink);
  for (let i = 0; i < 4; i++) redact(x + 30, y + 210 + i * 46, (i === 3 ? 0.55 : 0.92) * (w - 60), 26, p - 0.2 - i * 0.08);
  ['香港', '越南', '新加坡'].forEach((s, i) => alpha(clamp((k - 1.5 - i * 0.35) / 0.3), () => { const f = '700 28px NSC', ww = tw(s, f) + 40, xx = x + 30 + i * 170;
    ctx.fillStyle = C.marker; ctx.fillRect(xx, y + 396, ww, 46); text(s, xx + 20, y + 429, f, C.ink); }));
  text('示意 · 内容据美联社报道', x + w - 24, y + 456, '400 18px NSC', C.sub, 'right');
  ctx.restore();
}
function timeline(items, x, y, w, k, dark) {   // items: [[时间, 标题, 出现时刻]]
  ctx.fillStyle = dark ? '#3A3A40' : C.rule; ctx.fillRect(x, y, w, 4);
  items.forEach(([d, s, at], i) => { const xx = x + (w / (items.length - 1)) * i, p = k - at; if (p <= 0) return;
    alpha(clamp(p / 0.3), () => { ctx.fillStyle = C.marker; ctx.beginPath(); ctx.arc(xx, y + 2, 14, 0, 7); ctx.fill();
      text(d, xx, y - 40, '600 56px Num', dark ? C.white : C.ink, 'center'); text(s, xx, y + 76, '700 42px NSC', dark ? C.white : C.ink, 'center'); }); });
}
function pages(x, y, k, p) {   // 文件堆：一摞一摞长出来
  if (p <= 0) return; const n = Math.floor(clamp(p / 1.6) * 30), rnd = mulberry(7);
  for (let i = 0; i < 30; i++) { const r = rnd(), r2 = rnd(); if (i >= n) continue; const col = i % 6, row = Math.floor(i / 6);
    ctx.save(); ctx.translate(x + col * 150 + r * 10, y - row * 46 + r2 * 6); ctx.rotate((r - 0.5) * 0.06);
    ctx.fillStyle = '#FBFAF7'; ctx.fillRect(0, 0, 130, 40); ctx.fillStyle = C.ink2; ctx.fillRect(14, 12, 60 + r * 40, 6); ctx.fillRect(14, 24, 40 + r2 * 50, 6); ctx.restore(); }
}
function voteBar(x, y, w, yes, no, p) {
  if (p <= 0) return; const e = easeOut(p / 0.8), tot = yes + no;
  ctx.fillStyle = '#2A2A2E'; ctx.fillRect(x, y, w, 60); ctx.fillStyle = C.marker; ctx.fillRect(x, y, w * yes / tot * e, 60);
  ctx.fillStyle = C.red; ctx.fillRect(x + w - w * no / tot - 4, y, Math.max(6, w * no / tot), 60);
  num(yes, x, y - 30, 120, C.white, p, { label: '赞成' }); num(no, x + w, y - 30, 120, C.red, p, { align: 'right', label: '反对' });
}

// ---------- 钩子 ----------
B.h1 = (k, b) => { const d = frame('dark', b);
  if (k < 0.35) {   // 封面帧
    crown(1690, 300, 1.15, C.marker, 1); text('国王的弟弟被抓了', 120, 470, '150px Black', C.white); text('抓他的，却不是那桩指控', 120, 640, '110px Black', C.marker);
    text('爱泼斯坦案 · 2026', 124, 760, '700 48px NSC', C.grey); return; }
  crown(W / 2 + 520, 470, 1.6, '#26262B', 1);
  big('2026.02.19', 120, 330, 110, C.grey, k - 0.1, 'left', 'Num');
  big('66 岁生日', 120, 500, 150, C.white, k - b.kw('六十六'));
  big('被警察带走了', 120, 700, 150, C.marker, k - b.kw('被警察'));
  stamp('被捕', 1480, 700, k - b.kw('带走') - 0.1, -0.12, C.red);
  alpha(clamp((k - b.kw('亲弟弟')) / 0.3), () => chip('英国国王查尔斯三世的弟弟 · 安德鲁', 124, 800));
};
B.h2 = (k, b) => { frame('dark', b);
  text('近', 300, 560, '900 120px Serif', C.white); num(400, 430, 600, 300, C.marker, k - 0.1, { suffix: ' 年' });
  big('英国重要王室成员', 300, 760, 80, C.white, k - b.kw('英国重要'));
  big('头一回被捕', 300, 880, 110, C.white, k - b.kw('头一回'));
  src('美联社');
};
B.h3 = (k, b) => { frame('paper', b);
  text('抓他的理由', 120, 300, '700 48px NSC', C.sub);
  big('那桩性侵指控', 120, 470, 120, C.ink, k - b.kw('不是那桩')); strikeLine(110, 432, 760, k - b.kw('不是那桩') - 0.5);
  big('几封邮件', 120, 700, 150, C.ink, k - b.kw('几封邮件')); marker(120, 718, tw('几封邮件', '150px Black'), 20, k - b.kw('几封邮件') - 0.2);
  alpha(clamp((k - b.kw('爱泼斯坦文件')) / 0.3), () => { for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(1180 + i * 70, 360 + i * 60); ctx.rotate(-0.06 + i * 0.05);
    ctx.fillStyle = '#FBFAF7'; ctx.shadowColor = 'rgba(0,0,0,.2)'; ctx.shadowBlur = 18; ctx.fillRect(0, 0, 460, 300); ctx.shadowColor = 'transparent';
    text('✉', 30, 80, '60px NSC', C.ink); redact(110, 50, 300, 22, 1); redact(30, 130, 400, 18, 1); redact(30, 170, 340, 18, 1); ctx.restore(); } });
};
B.h4 = (k, b) => { frame('dark', b);
  const col = (x, name, n, p, c) => { alpha(clamp(p / 0.3), () => { text(name, x, 380, '900 80px Serif', C.white, 'center'); }); num(n, x, 720, 320, c, p, { align: 'center' }); };
  col(620, '英国', 2, k - b.kw('英国抓了'), C.marker); text('被捕', 620, 820, '700 40px NSC', C.grey, 'center');
  col(1300, '美国', 0, k - b.kw('美国'), C.white); alpha(clamp((k - b.kw('一个没抓')) / 0.3), () => text('因文件被捕 · 截至 2026 年 4 月初', 1300, 820, '700 34px NSC', C.grey, 'center'));
  ctx.fillStyle = '#2A2A2E'; ctx.fillRect(958, 330, 4, 520);
  src('NPR 2026-04-03');
};
B.h5 = (k, b) => { frame('night', b);
  big('这周', 120, 380, 90, C.grey, k - 0.05);
  big('民主党拿下众议院', 120, 560, 130, C.white, k - b.kw('民主党'));
  big('说要接着查', 120, 740, 130, C.marker, k - b.kw('接着查'));
  src('美联社计票 · 2026-11-04');
};
B.h6 = (k, b) => { frame('dark', b);
  const p = k - b.kw('一层一层'); for (let i = 0; i < 5; i++) alpha(clamp((p - i * 0.12) / 0.25), () => { const s = 1 - i * 0.14; ctx.strokeStyle = i === 0 ? C.marker : '#3A3A40'; ctx.lineWidth = 6; ctx.strokeRect(W / 2 + 330 - 300 * s, 560 - 260 * s, 600 * s, 520 * s); });
  big('爱泼斯坦案', 120, 420, 120, C.white, k - 0.05); big('到底卡在哪？', 120, 600, 150, C.marker, k - b.kw('卡在哪'));
  alpha(clamp(p / 0.3), () => text('我们一层一层剥', 124, 720, '700 48px NSC', C.grey));
};

// ---------- 第一层 ----------
B.a1 = (k, b) => { const d = frame('paper', b); head('一', '几封什么邮件', k, d);
  emailCard(1000, 360, 800, k - b.kw('文件里'), k - b.kw('文件里'));
  alpha(clamp((k - b.kw('贸易特使')) / 0.3), () => { text('2010 年', 120, 460, '600 64px Num', C.ink); text('英国国际贸易特使', 120, 540, '700 56px NSC', C.ink); });
  alpha(clamp((k - b.kw('转给了')) / 0.3), () => { text('→ 转给爱泼斯坦', 120, 660, '700 56px NSC', C.ink); marker(120, 676, tw('→ 转给爱泼斯坦', '700 56px NSC'), 14, k - b.kw('转给了') - 0.2); });
  src('美联社 · 邮件"似乎显示"', false);
};
B.a2 = (k, b) => { frame('dark', b);
  const p = k - 0.15; const m = Math.min(5, Math.max(0, (p - 0.2) / 1.6 * 5));
  text('收到', 300, 360, '700 56px NSC', C.grey); text('转出', 1300, 360, '700 56px NSC', C.grey);
  ctx.fillStyle = '#2A2A2E'; ctx.fillRect(300, 420, 1320, 16); ctx.fillStyle = C.marker; ctx.fillRect(300, 420, 1320 * m / 5, 16);
  num(5, W / 2, 720, 320, C.marker, p, { align: 'center', suffix: ' 分钟' });
  alpha(clamp((k - 0.2) / 0.3), () => text('看起来', W / 2, 820, '700 40px NSC', C.grey, 'center'));
  src('美联社');
};
B.a3 = (k, b) => { frame('dark', b);
  const p = k - b.kw('十一'); ctx.strokeStyle = '#2A2A2E'; ctx.lineWidth = 26; ctx.beginPath(); ctx.arc(560, 560, 220, 0, 7); ctx.stroke();
  ctx.strokeStyle = C.marker; ctx.beginPath(); ctx.arc(560, 560, 220, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 11 / 12 * easeOut(p / 1.2)); ctx.stroke();
  num(11, 560, 610, 180, C.white, p, { align: 'center' }); text('小时', 560, 680, '700 44px NSC', C.grey, 'center');
  big('放人', 1000, 500, 120, C.white, k - b.kw('放人')); big('没有起诉', 1000, 680, 120, C.marker, k - b.kw('没有起诉'));
};
B.a4 = (k, b) => { const d = frame('paper', b);
  nameCard(120, 330, '曼德尔森', '英国前驻美大使', k - b.kw('曼德尔森'), { tag: '2.23 被捕' });
  alpha(clamp((k - b.kw('涉嫌同一项')) / 0.3), () => text('涉嫌同一项：公职行为不当', 120, 640, '700 44px NSC', C.ink));
  quoteCard(860, 330, 940, ['没被指控任何性方面的问题'], '美联社', k - b.kw('没被指控'));
  quoteCard(860, 600, 940, ['逮捕源于"毫无根据的说法"'], '他的律师', k - b.kw('律师说'));
};
B.a5 = (k, b) => { const d = frame('dark', b);
  big('5 月', 120, 380, 110, C.grey, k - 0.05, 'left', 'Num');
  big('警方扩大调查', 120, 560, 130, C.white, k - b.kw('扩大'));
  alpha(clamp((k - b.kw('可能的')) / 0.3), () => { text('可能的性不当行为', 120, 720, '700 70px NSC', C.marker); text('也在调查范围内', 120, 810, '700 50px NSC', C.white); });
  src('美联社 2026-05-22');
};
B.a6 = (k, b) => { const d = frame('paper', b);
  nameCard(120, 360, '安德鲁', '国王查尔斯三世的弟弟', k - 0.05, { tag: '未被起诉' });
  big('一直否认', 820, 470, 120, C.ink, k - b.kw('否认')); big('任何不当行为', 820, 620, 90, C.ink, k - b.kw('不当行为'));
  alpha(clamp((k - b.kw('到目前')) / 0.3), () => text('截至公开报道', 824, 700, '700 34px NSC', C.sub));
};

// ---------- 第二层 ----------
B.b1 = (k, b) => { const d = frame('dark', b); head('二', '那桩指控', k, d);
  alpha(clamp((k - 0.1) / 0.3), () => text('那桩侵犯指控，来自一个女人', 124, 420, '700 48px NSC', C.grey));
  big('弗吉尼亚·朱弗雷', 120, 620, 140, C.white, k - 0.5, 'left', 'Serif');
  alpha(clamp((k - 0.9) / 0.3), () => text('Virginia Giuffre', 124, 710, 'italic 56px Quote', C.grey));
};
B.b2 = (k, b) => { const d = frame('paper', b);
  text('她的说法', 120, 300, '700 40px NSC', C.sub);
  const node = (x, s, sub, p) => alpha(clamp(p / 0.3), () => { ctx.fillStyle = '#FBFAF7'; ctx.fillRect(x, 420, 480, 220); text(s, x + 240, 520, '700 54px NSC', C.ink, 'center'); text(sub, x + 240, 590, '400 28px NSC', C.sub, 'center'); });
  node(120, '海湖庄园', '特朗普的私人俱乐部', k - 0.15);
  node(720, '马克斯韦尔', '把她带到身边', k - 0.6);
  node(1320, '爱泼斯坦', '', k - 1.05);
  for (const [x, at] of [[600, 0.5], [1200, 0.95]]) alpha(clamp((k - at) / 0.3), () => text('→', x + 60, 550, '700 60px NSC', C.sub, 'center'));
  alpha(clamp((k - b.kw('还没成年')) / 0.3), () => chip('当时还没成年', 124, 380, false));
  stamp('马克斯韦尔否认', 960, 780, k - b.kw('否认'), -0.08, C.red);
};
B.b3 = (k, b) => { const d = frame('dark', b);
  alpha(clamp(k / 0.4), () => { ctx.fillStyle = '#E9E4DA'; ctx.fillRect(1240, 260, 520, 680); ctx.fillStyle = C.ink2; ctx.fillRect(1240, 260, 26, 680);
    text('不属于', 1500, 520, '900 80px Serif', C.ink, 'center'); text('任何人的女孩', 1500, 620, '900 64px Serif', C.ink, 'center'); text('回忆录 · 2025.10', 1500, 860, '400 26px NSC', C.sub, 'center'); });
  text('她在回忆录里写', 120, 320, '700 40px NSC', C.grey);
  big('17 岁 · 伦敦', 120, 480, 110, C.white, k - b.kw('十七'));
  big('王子一猜就中', 120, 640, 110, C.marker, k - b.kw('一猜'));
  alpha(clamp((k - b.kw('她指控')) / 0.3), () => text('她指控：那一年遭到了他的侵犯', 124, 760, '700 46px NSC', C.white));
  src('书封为示意排版，非原书封面');
};
B.b4 = (k, b) => { const d = frame('dark', b);
  alpha(clamp((k - 0.05) / 0.3), () => { text('2019 · 王子上电视', 120, 330, '700 40px NSC', C.grey); text('"完全不记得见过她"', 120, 430, '700 64px NSC', C.white); });
  quoteCard(120, 560, 1680, ['"我们俩之中，只有一个人在说真话。"'], '朱弗雷 · BBC《全景》2019', k - b.kw('她回了'), true);
  src('BBC《新闻之夜》2019 / BBC《全景》2019');
};
B.b5 = (k, b) => { const d = frame('paper', b);
  big('2022', 120, 420, 160, C.ink, k - 0.05, 'left', 'Num'); big('庭外和解', 120, 600, 140, C.ink, k - b.kw('庭外'));
  stamp('未承认责任', 1300, 520, k - b.kw('没有承认'), -0.1, C.red);
};
B.b6 = (k, b) => { const d = frame('dark', b);
  timeline([['2025.04', '在家中去世', 0.1], ['2025.10', '遗作出版', b.kw('遗作')], ['+9 天', '"王子"称号被收回', b.kw('九天后')]], 300, 560, 1320, k, true);
  alpha(clamp((k - b.kw('称号')) / 0.3), () => { text('王子', W / 2 + 660, 820, '900 70px Serif', C.white, 'center'); strikeLine(W / 2 + 590, 796, 150, k - b.kw('称号') - 0.3); });
};

// ---------- 第三层 ----------
B.c1 = (k, b) => { const d = frame('night', b); head('三', '"就在我桌上"', k, d);
  alpha(clamp((k - 0.6) / 0.3), () => { text('2025.02 · 福克斯采访', 120, 420, '700 40px NSC', C.grey); text('问：会不会公布客户名单？', 120, 500, '700 50px NSC', C.white); });
  big('"就在我桌上。"', 120, 700, 140, C.marker, k - b.kw('就在我桌上'));
  alpha(clamp((k - b.kw('就在我桌上')) / 0.3), () => { text('司法部长 邦迪', 124, 790, '700 36px NSC', C.grey);
    ctx.fillStyle = '#3A2E22'; ctx.fillRect(1300, 760, 520, 26); ctx.fillStyle = '#E9D9A6'; ctx.fillRect(1420, 700, 260, 60); ctx.fillStyle = '#CDB97C'; ctx.fillRect(1420, 700, 260, 10); });
  src('Fox News 2025-02-21');
};
B.c2 = (k, b) => { const d = frame('night', b);
  big('5 个月后', 120, 380, 90, C.grey, k - 0.05);
  big('根本没有客户名单', 120, 560, 120, C.white, k - b.kw('根本没有'));
  stamp('没有名单', 1500, 520, k - b.kw('根本没有') - 0.3, -0.12, C.red);
  alpha(clamp((k - b.kw('解释')) / 0.3), () => text('白宫和司法部解释：她指的是整个案卷', 124, 700, '700 46px NSC', C.marker));
  src('美联社 2025-07-08');
};
B.c3 = (k, b) => { const d = frame('dark', b);
  text('众议院表决《爱泼斯坦文件透明法》', 120, 300, '700 44px NSC', C.grey);
  voteBar(120, 470, 1680, 427, 1, k - b.kw('四百二十七'));
  pages(240, 820, k, k - b.kw('三百多万页'));
  alpha(clamp((k - b.kw('三百多万页')) / 0.3), () => { num(3, 1640, 800, 150, C.marker, k - b.kw('三百多万页'), { suffix: '00 万+', align: 'right' }); text('页', 1760, 800, '700 64px NSC', C.white, 'right'); });
  src('众议院书记官 2025 年第 289 号表决 / 美国司法部 2026-01-30');
};
B.c4 = (k, b) => { const d = frame('paper', b);
  nameCard(120, 380, '邦迪', '美国司法部长', k - 0.05, { strike: k - b.kw('下台'), tag: '2026.04 下台' });
  alpha(clamp((k - b.kw('此前')) / 0.3), () => text('此前，两党都在批评她处理文件的方式', 820, 500, '700 46px NSC', C.ink));
  src('NPR 2026-04-03', false);
};

// ---------- 第四层 ----------
B.d1 = (k, b) => { const d = frame('dark', b); head('四', '你听过的名字', k, d);
  big('300 多万页里', 120, 450, 90, C.grey, k - 0.2); big('有很多你听过的名字', 120, 580, 100, C.white, k - b.kw('你听过'));
  alpha(clamp((k - b.kw('先分清')) / 0.3), () => { ctx.fillStyle = C.ink2; ctx.fillRect(0, 640, W, 260); text('被提到', 420, 830, '900 150px Serif', C.white, 'center'); text('≠', 960, 830, '600 190px Num', C.marker, 'center'); text('犯罪', 1460, 830, '900 150px Serif', C.white, 'center'); });
};
B.d2 = (k, b) => { const d = frame('dark', b);
  text('马斯克跟特朗普闹翻那天', 160, 260, '700 44px NSC', C.grey);
  const p = k - 0.6; if (p > 0) { const e = easeOut(p / 0.4); ctx.save(); ctx.globalAlpha *= clamp(p * 3); ctx.translate(0, (1 - e) * 40);
    ctx.fillStyle = '#16181D'; ctx.fillRect(160, 300, 1600, 380); text('马斯克 · X 帖子 · 2025.06 · 文字转录', 210, 360, '400 24px NSC', C.grey);
    text('"Time to drop the really big bomb: [Trump] is in the Epstein files."', 210, 460, 'italic 50px Quote', C.white);
    text('该扔真正的大炸弹了：特朗普在爱泼斯坦文件里。', 210, 580, '700 48px NSC', C.marker); ctx.restore(); }
  stamp('已删除', 1560, 660, k - b.kw('删了'), -0.12, C.red);
  alpha(clamp((k - b.kw('没给证据')) / 0.3), () => text('没给任何证据', 160, 780, '700 50px NSC', C.white));
  src('法新社 2025-06');
};
B.d3 = (k, b) => { const d = frame('paper', b);
  card(IM.portrait_trump_2025, 120, 280, 420, 520, { src: '白宫官方肖像（公有领域）', p: k - 0.05, zoom: 1.2, fy: 0.2 });
  alpha(clamp((k - 0.2) / 0.3), () => text('后来公开的文件里', 680, 310, '700 40px NSC', C.sub));
  alpha(clamp((k - b.kw('私人飞机')) / 0.3), () => { text('九十年代', 680, 380, '700 56px NSC', C.ink); text('坐过爱泼斯坦私人飞机的记录', 680, 460, '700 56px NSC', C.ink); });
  alpha(clamp((k - b.kw('闹翻之前')) / 0.3), () => text('看起来在他说的两人闹翻之前', 684, 530, '700 36px NSC', C.sub));
  alpha(clamp((k - b.kw('除了')) / 0.3), () => { ctx.fillStyle = C.ink2; ctx.fillRect(680, 590, 1120, 100); text('除马克斯韦尔外，文件提到的人无一被控罪', 710, 655, '700 42px NSC', C.white); });
  alpha(clamp((k - b.kw('否认')) / 0.3), () => text('特朗普：一直否认知道爱泼斯坦的罪行', 684, 770, '700 40px NSC', C.ink));
  src('半岛电视台 2026-01-30', false);
};
B.d4 = (k, b) => { const d = frame('dark', b);
  timeline([['2026.01', '拒绝作证', b.kw('拒绝')], ['', '"藐视国会"程序', b.kw('藐视')], ['2026.02', '答应接受取证', b.kw('才答应')]], 300, 420, 1320, k, true);
  big('克林顿夫妇', 120, 300, 70, C.white, k - 0.05);
  alpha(clamp((k - b.kw('克林顿说')) / 0.3), () => text('克林顿：他不知道爱泼斯坦的罪行', 120, 640, '700 44px NSC', C.white));
  quoteCard(120, 700, 1680, ['"没人指控他们有不当行为。"'], '共和党籍众议院监督委员会主席', k - b.kw('连共和党'), true);
  src('NPR 2026-01-13 / 监督委员会 2026-02-03');
};

// ---------- 第五层 ----------
B.e1 = (k, b) => { const d = frame('dark', b); head('五', '为什么一个没抓', k, d);
  big('美国，一个没抓', 120, 420, 90, C.white, k - 0.2);
  quoteCard(120, 500, 1680, ['"我们不能凭空制造证据。"'], '副司法部长 布兰奇', k - b.kw('不能'), true);
  src('美联社');
};
B.e2 = (k, b) => { const d = frame('paper', b);
  nameCard(120, 300, '马克斯韦尔', '已定罪 · 刑期 20 年', k - 0.05);
  timeline([['2025.07', '和副部长谈了两天', b.kw('当面谈')], ['2026.02', '国会：援引第五修正案', b.kw('第五修正案')]], 980, 430, 620, k, false);
  alpha(clamp((k - b.kw('律师开价')) / 0.3), () => { ctx.fillStyle = C.marker; ctx.fillRect(760, 640, 1040, 140); text('律师开价：给豁免或特赦，她就说', 800, 728, '700 52px NSC', C.ink); });
  src('NPR 2026-02-10', false);
};

// ---------- 结尾 ----------
B.z1 = (k, b) => { frame('paper', b);
  big('卡在哪？', 120, 300, 90, C.ink, k - 0.05);
  const colm = (x, a, s, p0, p) => { alpha(clamp(p0 / 0.3), () => { text(a, x, 460, '900 90px Serif', C.ink); text('卡在', x, 580, '700 50px NSC', C.sub); ctx.fillStyle = C.rule; ctx.fillRect(x, 640, 640, 100); });
    alpha(clamp(p / 0.3), () => { ctx.fillStyle = C.paper; ctx.fillRect(x, 630, 700, 120); text(s, x, 720, '900 110px Serif', C.ink); marker(x, 736, tw(s, '900 110px Serif'), 18, p - 0.3); }); };
  colm(120, '英国', '起不起诉', k - 0.4, k - b.kw('英国卡在')); colm(1000, '美国', '证据在哪', k - 0.7, k - b.kw('美国卡在'));
  alpha(clamp((k - b.kw('理解')) / 0.3), () => text('我们的理解', 1800, 300, '700 34px NSC', C.sub, 'right'));
};
B.z2 = (k, b) => { frame('night', b);
  big('"就在我桌上"', 120, 480, 130, C.white, k - 0.05); strikeLine(110, 440, 900, k - b.kw('根本没有'));
  big('→ 根本没有名单', 120, 680, 110, C.marker, k - b.kw('根本没有'));
};
B.z3 = (k, b) => { frame('night', b);
  big('2027.01', 120, 420, 150, C.white, k - 0.05, 'left', 'Num'); big('新国会开张', 120, 600, 120, C.white, k - b.kw('开张'));
  quoteCard(120, 680, 1680, ['监督委员会会"接过接力棒"'], '一位民主党议员（他的看法）', k - b.kw('接力棒'), true);
};
B.z4 = (k, b) => { bg('dark');
  for (let i = 0; i < 5; i++) alpha(clamp((k - 0.2 - i * 0.12) / 0.3), () => { const s = 1 - i * 0.14; ctx.strokeStyle = i === 0 ? C.marker : '#3A3A40'; ctx.lineWidth = 6; ctx.strokeRect(W / 2 - 520 * s, H / 2 - 300 * s - 40, 1040 * s, 600 * s); });
  big('关注我', W / 2, H / 2 - 20, 150, C.white, k - b.kw('关注'), 'center');
  alpha(clamp((k - b.kw('下一层')) / 0.3), () => text('下一层剥开那天，接着讲', W / 2, H / 2 + 90, '700 56px NSC', C.marker, 'center'));
  alpha(clamp((k - 3.5) / 0.6), () => text('爱泼斯坦案 · 国王的弟弟被抓了', W / 2, H - 120, '400 26px NSC', C.grey, 'center'));
};
