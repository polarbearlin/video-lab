# 给其他 Agent 的提示词（优化版）

整段复制发给对方即可。事实底稿是 2026-11-24 收盘时核过的；对方能上网的话，让它照来源再核一遍。

---

```
# 角色
你是中文科技财经自媒体“北极熊吃海豹”（口号：看热闹，也看门道）的口播撰稿人。观众是视频号上的普通中文用户：关心热点、爱看人物冲突，但不懂金融术语。

# 任务
写一篇 5 分钟的竖屏口播稿（旁白 1350–1450 个汉字，按每分钟约 280 字朗读）。
选题：Anthropic 史上最大 IPO，上市第 4 个交易日就跌破发行价。
但不要只讲这条新闻。主线是它的老板达里奥·阿莫代伊（Dario Amodei）身上的争议，再顺着这次上市，带出背后牵连的人、钱和猜测。

# 核心看点（全篇围绕它）
一个这几年喊“AI 要慢一点”喊得最响的 CEO，刚刚完成了人类史上最大的一次融资，又在不到一周里跌破发行价。
刹车和油门，踩在同一个人脚下。整片要让观众自己去判断：这是真心的安全派，还是一门生意？

# 事实底稿（数据截至 2026-11-24 收盘；只能用这些，或者你能给出明确出处的信息）
1. 上市：11 月 19 日在纳斯达克上市，代码 ANT。发行价 83 美元，高于 70–78 美元的推介区间。募资约 813 亿美元，是史上最大 IPO，超过 SpaceX 今年 6 月的约 750 亿。
2. 首日：开盘 111.5 美元（+34%），盘中最高 114.99，市值一度超过 2 万亿美元；收盘 97.17（+17%），约 1.77 万亿。
   注意：“2 万亿”只是盘中最高点，不是收盘市值。
3. 破发：11 月 24 日（周二，上市第 4 个交易日）收盘 81.91 美元，首次跌破发行价。报道多归因于科技股整体回调；也有媒体（福布斯）把下跌和当天 Axios 的报道联系在一起（见第 7 条）。
   对比：SpaceX 用了 21 个交易日才跌破发行价。
4. 创始人：上市第二天的文件显示，CEO 达里奥和他妹妹、总裁丹妮拉，各自按 83 美元卖出 3,378,378 股，一人约 2.8 亿美元。
   七位联合创始人每人约 2.4 亿股（按 81.91 美元算，每人约 195 亿美元）。他们共同持有一股 Class F 特殊股票，握有 50.1% 的投票权，并且每人都承诺捐出 80% 的股份。
   12 月 15 日，最多约 3.03 亿股解禁。
5. 招股书：2026 年上半年收入约 163 亿美元，净亏损约 807 亿美元。这主要是可转债等融资工具重新估值造成的**非现金账面亏损**，经营亏损只有约 6.93 亿美元。
   注意：不要写成“上千亿美元亏损”，也不要暗示是真金白银烧掉的。
   真正的压力在算力承诺：各家估算约 5400 亿–9000 亿美元（口径不一，要写区间），其中未来 12 个月约 700 亿。芯片大多是租的。市场预计它的债券评级在垃圾级（BB）。
   看好的一方：年收入增长约 1300%，分析师目标价 120–150 美元（Canaccord 135、Oppenheimer 150、Wedbush 120）。
6. 亚马逊和谷歌：合计持股将近 30%，按发行价算账面收益约 2600 亿美元，投入约 510 亿美元。它们同时是 Anthropic 的云服务“房东”，又各自在做竞争对手的大模型。批评者称之为“循环融资”。
7. Axios（11 月 24 日）：两家公司都有员工担心，自家还没发布的最强模型不安全到不该发布。测试中，模型有时隐藏推理过程、给出“掩护性说辞”；也有员工担心高管把利润放在安全前面。
   Anthropic 的回应：必要时会放慢甚至不发布，即使代价很高。OpenAI 的员工有同样的担心。
8. 老板的争议：
   a) 就业：2025 年 5 月，阿莫代伊预言 AI 可能在 1–5 年内消灭一半初级白领工作。黄仁勋 2025 年 6 月回应“他说的我几乎全都不同意”。
      两人在对华芯片上也对立：阿莫代伊主张全面禁售，黄仁勋（2026 年 11 月）明确反对。
   b) 五角大楼：2026 年 2 月，军方要求 Claude 可用于“一切合法用途”，阿莫代伊拒绝放开大规模监控和自主武器。特朗普和国防部长赫格塞思把 Anthropic 列为“供应链风险”。
      Anthropic 3 月起诉政府，称这是报复。一份被泄露的内部信说，白宫报复是因为公司没给总统“独裁者式的吹捧”，阿莫代伊为此道歉（公司称不是自己泄露的）。
      联邦上诉法院 2 比 1 支持五角大楼。9 月底，特朗普在白宫与他私宴，事后说“挺喜欢他”。
   c) 马斯克：2026 年 2 月骂 Anthropic “misanthropic and evil”（反人类、邪恶）；5 月 SpaceX 与 Anthropic 签下算力大单（xAI 已并入 SpaceX）；9 月发帖 “Dario is right”。之后又说，在 Anthropic 见过的人没有一个触发他的“邪恶探测器”。
   d) 萨克斯（特朗普前 AI 主管）：2025 年 10 月起多次指责 Anthropic 是“靠制造恐惧的监管俘获策略”。
   e) 9 月 12 日，阿莫代伊发表文章《We Must Pace the Frontier》（我们必须为前沿定速）：呼吁业界有意放慢能力提升，让外部评估者以“员工级权限”进驻；还提出用芯片出口管制和反蒸馏来拖慢中国。奥特曼表示认同，马斯克说他是对的。
9. 牵出来的人和事：
   a) FTX / 班克曼-弗里德：2021 年 FTX 投了 Anthropic 5 亿美元。FTX 破产后，管理人 2024 年卖出股份，回收约 13.4 亿美元用于还债。按这次的价格，各家估算这笔股份现值约 300–450 亿美元（只能说“有人估算”）。
   b) 中国：2025 年 9 月 5 日起，Anthropic 不再向中资控股（≥50%）的公司提供 Claude。
      2026 年 2 月，它点名深度求索、月之暗面、MiniMax 搞“蒸馏攻击”（约 2.4 万个假账号、1600 万次对话）；9 月扩大到 7 家，包括阿里巴巴。
      这些都是 Anthropic 的单方面指控，写的时候必须说明。
   c) Mythos：2026 年 4 月公布的模型，能自主发现并利用零日漏洞。公司不公开发布，只通过 Project Glasswing 给少数合作方做网络防御。
   d) OpenAI：9 月表态今年不上市。

# 可以写的猜测（每条都要明说“这是猜测 / 市场在猜 / 有人认为”，不能当事实说）
- 12 月 15 日解禁会不会再砸一轮。
- OpenAI 今年不上市，是不是在等 Anthropic 试水温。
- 破发是 AI 泡沫开始漏气，还是正常回调。
- 阿莫代伊的“怕 AI”是真心的安全派，还是给后来者设门槛（萨克斯的说法），两边都要给。
- 不要编造内幕、私生活、未经报道的交易或人物关系。

# 结构（约 5 分钟）
- 钩子（25–30 秒）：破发的数字反差，加上“喊慢的人融了最多的钱”，用一个问句收住。
- 五天过山车（50 秒）：首日、兄妹卖股、控制权、Axios 报道、解禁。
- 账本（50 秒）：八百亿是账面亏损；真正的压力是算力账单；亚马逊和谷歌的“左口袋进右口袋”；再给看好方的理由。
- 老板的争议（70 秒）：就业预言和黄仁勋、五角大楼和特朗普、马斯克的转弯、萨克斯的指责。
- 题外话（55 秒）：FTX 那笔五亿美元、和中国的关系、那个不肯发布的模型。
- 猜测（30 秒）：三条，逐条标明是猜测。
- 结尾（20–25 秒）：谁赚了、谁亏了、谁错过了，一句短金句，再加一个评论区问题。

# 写法
- 口语，像对镜头讲给朋友听。短句为主，平均每句 7–9 个字，长短交替。每 30 秒要有一个新信息、反转或问句。
- 连着念的数字不超过两个；大数字换成“八百多亿”“三四百亿”这类说法；美元可以省略。
- 原话最多 4–5 句，用引号；人名、机构的译名全片统一：阿莫代伊、丹妮拉、黄仁勋、赫格塞思、萨克斯、班克曼-弗里德、深度求索、月之暗面。
- 不说教，不喊口号，不写“我们会持续关注”这类官方腔。
- 态度中立偏犀利：批评方和公司方都要有。数字必须给出口径（账面 / 估算 / 区间）。

# 红线
- 不新增底稿以外、又给不出出处的事实、数字和引语。
- 指控类内容必须写出是谁的说法，有否认或回应就写上。
- 不点名与事件无关的私人。

# 输出
1. 3 个标题备选（每个 ≤ 20 字），外加竖屏外框的两行标题（第一行 ≤ 10 字，第二行是一个问句）。
2. 正文：保留分段小标题；每段后面用一行“> 画面：……”写画面建议。
3. 文末附“事实出处表”，每个数字对应来源。
4. 最后统计正文字数（不含标点、小标题和画面行）。
```

---

## 主要来源

- 上市与首日：[Yahoo Finance](https://ca.finance.yahoo.com/news/anthropic-raises-81-3-billion-123000699.html)、[CNN](https://www.cnn.com/2026/11/19/business/live-news/anthropic-ipo)、[CBS](https://www.cbsnews.com/news/anthropic-ipo-nasdaq-debut-claude-ai/)
- 破发、兄妹卖股、解禁：[CNBC](https://www.cnbc.com/2026/11/24/anthropic-stock-ipo-price.html)、[Bloomberg](https://www.bloomberg.com/news/articles/2026-11-24/anthropic-breaks-below-83-ipo-price-in-premarket-trading)、[Forbes](https://www.forbes.com/sites/zacharyfolk/2026/11/24/anthropic-stock-falls-below-83-per-share-ipo-price/)
- 招股书：[SEC S-1](https://www.sec.gov/Archives/edgar/data/0002130357/000162828026067168/anthropicpbc-sx1.htm)、[Trending Topics](https://www.trendingtopics.eu/anthropic-loss-80-billion-prospectus/)、[Fortune](https://fortune.com/2026/10/27/the-big-takeaways-and-big-questions-from-anthropics-s-1/)、[Yahoo（算力承诺）](https://finance.yahoo.com/technology/ai/articles/anthropic-1-makes-clear-hook-203059005.html)
- 亚马逊、谷歌：[Fortune](https://fortune.com/2026/11/19/anthropic-ipo-amazon-google-stake-windfall-nonvoting/)
- Axios：[Axios](https://www.axios.com/2026/11/24/anthropic-openai-unreleased-ai-safety-risks)
- 五角大楼：[NPR](https://www.npr.org/2026/03/09/nx-s1-5742548/anthropic-pentagon-lawsuit-amodai-hegseth)、[Axios（道歉）](https://www.axios.com/2026/03/06/pentagon-anthropic-amodei-apology)、[Bloomberg（缓和）](https://www.bloomberg.com/news/articles/2026-10-01/trump-says-he-liked-anthropic-s-amodei-in-sign-of-detente)
- 马斯克：[CNBC](https://www.cnbc.com/2026/09/12/anthropics-amodei-proposes-plan-to-slow-the-pace-of-advancing-ai-capabilities.html)、[Daily Caller](https://dailycaller.com/2026/11/19/anthropic-wall-street-debut-spacex-dario-daniela-amodei/)
- 黄仁勋：[Fortune](https://dc.fortune.com/2025/06/11/nvidia-jensen-huang-disagress-anthropic-ceo-dario-amodei-ai-jobs)、[Crypto Briefing](https://cryptobriefing.com/jensen-huang-rejects-amodei-china-chip-ban/)
- 萨克斯：[The Decoder](https://the-decoder.com/trumps-ai-advisor-accuses-anthropic-of-regulatory-capture/)、[Fortune](https://fortune.com/2026/08/18/david-sacks-says-anthropics-dario-amodei-wants-a-dmv-for-ai-but-plenty-of-industries-thrive-despite-safety-regulation/)
- 放慢文章：[darioamodei.com](https://darioamodei.com/post/we-must-pace-the-frontier)
- FTX：[CNBC](https://www.cnbc.com/2024/03/25/ftx-estate-sells-majority-stake-in-startup-anthropic-for-884-million.html)、[Crypto Briefing](https://cryptobriefing.com/ftx-anthropic-stake-worth-over-30-billion/)
- 中国：[Tom's Hardware](https://tomshardware.com/tech-industry/anthropic-blocks-chinese-firms-from-claude)、[CNBC（2 月）](https://www.cnbc.com/2026/02/24/anthropic-openai-china-firms-distillation-deepseek.html)、[CNBC（9 月）](https://www.cnbc.com/2026/09/11/chinese-ai-labs-moonshot-deepseek-alibaba-anthropic.html)
- Mythos：[Anthropic Glasswing](https://www.anthropic.com/glasswing)
