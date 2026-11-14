```
# 卡黄素材包（样片）manifest。仅供个人剪辑参考，不得二次商用或公开发布。版权归原作者、原演出方及原上传平台所有。来源均为当时可公开访问的页面，未编造。本批次按要求只收5条视频，未继续收图。
```

上面这一段是 `manifest.csv` 第一行的原文（文件本身带 UTF-8 BOM，正文从 `#` 开始）。

## 先看这几条

- `weibo/kahuang_01.jpg` 是这批里**唯一真正的同框照片**（李艺彤、黄婷婷一起入画）。
- `weibo/single_not_together_02.jpg` 是单人照，不是同框。
- `videos/02_houhuiyouqi_ti_liyitong.mp4` 只有黄婷婷出镜，没有李艺彤同框。
- `03_yedie_1st_best30.mp4` 画面带优酷水印。
- `05_aihen_3rd_best30_clip.mp4` 画面带腾讯视频水印。
- 这是 **10 组样片**。后续批次等用户看完再加，不要自行补素材。

10 组是：

| 组 | 内容 |
|---|---|
| 1 | `01_yedie_official_mv_clip.mp4`，《夜蝶》官方 MV 片段 |
| 2 | `02_houhuiyouqi_ti_liyitong.mp4`，《后会友期》观察室，只有黄婷婷 |
| 3 | `03_yedie_1st_best30.mp4`，第一届年度金曲大赏《夜蝶》全片，优酷水印 |
| 4 | `04_renyu_4th_best50_clip.mp4`，第四届年度金曲大赏《人鱼》片段 |
| 5 | `05_aihen_3rd_best30_clip.mp4`，第三届年度金曲大赏《爱恨的泪》片段，腾讯视频水印 |
| 6 | `liyitong_1110_01.jpg`–`09.jpg`，李艺彤单人照 9 张 |
| 7 | `huangtingting_1111_01.jpg`–`09.jpg`，黄婷婷单人照 9 张 |
| 8 | `fan_compare_01.jpg`、`fan_compare_02.jpg`，粉丝对比用的微博截图 2 张 |
| 9 | `kahuang_01.jpg`，同框合影 |
| 10 | `single_not_together_02.jpg`，单人照 |

微博页面在整理时打不开。图片的「原发布者」写 `weibo/urls.txt` 里那条帖子的 uid，再加上画面上看得见的水印，没有把 uid 猜成昵称。

## 素材清单

时长和分辨率是用 ffprobe 对原文件量的，和 `manifest.csv` 写的一致：01 / 04 / 05 为 180 秒，03 为 163.5 秒，02 为 21.7 秒。01 的帧率是 24000/1001（约 23.98fps）。上传到草稿 Release 之后又下载回来比对过，四个文件的 SHA256 与 `SHA256SUMS` 一致。

| 文件名 | 类型 | 内容 | 时长/分辨率 | 存放位置 | 来源 URL | 原发布者 |
|---|---|---|---|---|---|---|
| `01_yedie_official_mv_clip.mp4` | 视频 / 官方 MV 剪辑 | SNH48《夜蝶》正式版 MV（李艺彤、黄婷婷）。全片 05:57 中的 02:30–05:30，含秘密花园同框、门廊、伸手牵住、沙发相拥。H.264+AAC。 | 180.012 秒 / 1920×1080 / 23.98fps | 草稿 Release 资产，不进 git：https://github.com/polarbearlin/video-lab/releases/download/untagged-92aa9c65df77c675a60e/01_yedie_official_mv_clip.mp4 | https://www.youtube.com/watch?v=N5dr6lNP5ec | YouTube 频道 SNH48 China（SNH48 官方频道）。版权归 SNH48 / 丝芭传媒等原权利人。 |
| `02_houhuiyouqi_ti_liyitong.mp4` | 视频 / 综艺切片 | 芒果 TV《后会友期》观察室。黄婷婷谈拿第三时的第一、第二名，以及现在是否还联系。片中只有黄婷婷，没有李艺彤。未再裁。 | 21.664 秒 / 1920×1080 / 30fps | `demos/kahuang/videos/02_houhuiyouqi_ti_liyitong.mp4` | https://weibo.com/1642591402/RnPGp9tkF | 微博 新浪娱乐（uid 1642591402）。节目版权属芒果 TV。 |
| `03_yedie_1st_best30.mp4` | 视频 / 金曲舞台 | SNH48 第一届年度金曲大赏《夜蝶》，黄婷婷、李艺彤同台，含近距离互动和阶梯上的下跪。全片保留。画面带优酷水印。 | 163.492 秒 / 1280×720 / 25fps | 草稿 Release 资产，不进 git：https://github.com/polarbearlin/video-lab/releases/download/untagged-92aa9c65df77c675a60e/03_yedie_1st_best30.mp4 | https://www.youtube.com/watch?v=G7Yu-ine0vQ | YouTube 频道 prn（@prnprnprn），转载。舞台原版权属 SNH48 等。 |
| `04_renyu_4th_best50_clip.mp4` | 视频 / 金曲舞台剪辑 | SNH48 第四届年度金曲大赏 BEST50《人鱼》（2018-02-03）。原片 03:51，本文件为 00:40–03:40，去掉开头会场空镜，留到收束趴台。 | 180.032 秒 / 1920×1080 / 25fps | 草稿 Release 资产，不进 git：https://github.com/polarbearlin/video-lab/releases/download/untagged-92aa9c65df77c675a60e/04_renyu_4th_best50_clip.mp4 | https://www.youtube.com/watch?v=USYiVnLaBfw | YouTube 频道 sis ofrurie（@sisofrurie2223），转载。舞台原版权属 SNH48 等。 |
| `05_aihen_3rd_best30_clip.mp4` | 视频 / 金曲舞台剪辑 | SNH48 第三届年度金曲大赏《爱恨的泪》TOP2（2017-01-07）。原片 03:48，本文件从 00:10 起 3 分钟，去掉片头标题卡。画面带腾讯视频水印。 | 180.032 秒 / 1280×720 / 25fps | 草稿 Release 资产，不进 git：https://github.com/polarbearlin/video-lab/releases/download/untagged-92aa9c65df77c675a60e/05_aihen_3rd_best30_clip.mp4 | https://www.youtube.com/watch?v=91kbBUV2c44 | YouTube 频道 prn（@prnprnprn），转载。画面水印为腾讯视频。舞台原版权属 SNH48 等。 |
| `weibo/kahuang_01.jpg` | 图片 / 同框 | 李艺彤与黄婷婷同框合影（深色校服、格子袖口），右下角水印 `@R_sun_H`。本包唯一真正同框照片。 | 3072×4096 | `demos/kahuang/weibo/kahuang_01.jpg` | https://weibo.com/7499234386/Qo1EDaLgq | 微博 uid 7499234386。画面水印 `@R_sun_H`。 |
| `weibo/single_not_together_02.jpg` | 图片 / 单人 | 单人近照（黑金饰边上衣、白衬衫、黑领带）。不是同框。 | 1433×2048 | `demos/kahuang/weibo/single_not_together_02.jpg` | https://weibo.com/6417116437/Qp50wA1Mr | 微博 uid 6417116437。 |
| `weibo/fan_compare_01.jpg` | 图片 / 微博截图 | 手机截图：微博 App 里李艺彤主页的一条九宫格，文案「这样的那样的」。用来对照，不是同框原片。 | 1179×2556 | `demos/kahuang/weibo/fan_compare_01.jpg` | https://weibo.com/7807859950/RqUqVqayJ | 微博 uid 7807859950。 |
| `weibo/fan_compare_02.jpg` | 图片 / 微博截图 | 手机截图：微博 App 里黄婷婷主页的一条九宫格，文案「偷闲把酒，不问俗事～」。用来对照，不是同框原片。 | 1179×2556 | `demos/kahuang/weibo/fan_compare_02.jpg` | https://weibo.com/7807859950/RqUqVqayJ | 微博 uid 7807859950。 |
| `weibo/liyitong_1110_01.jpg` | 图片 / 单人 | 李艺彤单人照，同一帖第 1/9 张。灰细条纹外套近景，画面水印 `@李艺彤`。不是同框。 | 1704×2272 | `demos/kahuang/weibo/liyitong_1110_01.jpg` | https://weibo.com/3700233717/RqKOLzpEf | 微博 uid 3700233717。画面水印 `@李艺彤`。 |
| `weibo/liyitong_1110_02.jpg` | 图片 / 单人 | 李艺彤单人照，同一帖第 2/9 张。不是同框。 | 1704×2272 | `demos/kahuang/weibo/liyitong_1110_02.jpg` | https://weibo.com/3700233717/RqKOLzpEf | 微博 uid 3700233717。 |
| `weibo/liyitong_1110_03.jpg` | 图片 / 单人 | 李艺彤单人照，同一帖第 3/9 张。不是同框。 | 2314×3086 | `demos/kahuang/weibo/liyitong_1110_03.jpg` | https://weibo.com/3700233717/RqKOLzpEf | 微博 uid 3700233717。 |
| `weibo/liyitong_1110_04.jpg` | 图片 / 单人 | 李艺彤单人照，同一帖第 4/9 张。不是同框。 | 2314×3086 | `demos/kahuang/weibo/liyitong_1110_04.jpg` | https://weibo.com/3700233717/RqKOLzpEf | 微博 uid 3700233717。 |
| `weibo/liyitong_1110_05.jpg` | 图片 / 单人 | 李艺彤单人照，同一帖第 5/9 张。不是同框。 | 3020×4032 | `demos/kahuang/weibo/liyitong_1110_05.jpg` | https://weibo.com/3700233717/RqKOLzpEf | 微博 uid 3700233717。 |
| `weibo/liyitong_1110_06.jpg` | 图片 / 单人 | 李艺彤单人照，同一帖第 6/9 张。不是同框。 | 3020×4032 | `demos/kahuang/weibo/liyitong_1110_06.jpg` | https://weibo.com/3700233717/RqKOLzpEf | 微博 uid 3700233717。 |
| `weibo/liyitong_1110_07.jpg` | 图片 / 单人 | 李艺彤单人照，同一帖第 7/9 张。不是同框。 | 1206×1608 | `demos/kahuang/weibo/liyitong_1110_07.jpg` | https://weibo.com/3700233717/RqKOLzpEf | 微博 uid 3700233717。 |
| `weibo/liyitong_1110_08.jpg` | 图片 / 单人 | 李艺彤单人照，同一帖第 8/9 张。不是同框。 | 1440×1920 | `demos/kahuang/weibo/liyitong_1110_08.jpg` | https://weibo.com/3700233717/RqKOLzpEf | 微博 uid 3700233717。 |
| `weibo/liyitong_1110_09.jpg` | 图片 / 单人 | 李艺彤单人照，同一帖第 9/9 张。不是同框。 | 3020×4032 | `demos/kahuang/weibo/liyitong_1110_09.jpg` | https://weibo.com/3700233717/RqKOLzpEf | 微博 uid 3700233717。 |
| `weibo/huangtingting_1111_01.jpg` | 图片 / 单人 | 黄婷婷单人胶片照，同一帖第 1/9 张。画面日期水印为 2025-09-25（拍摄日期，不是帖子日期）。不是同框。 | 3342×2303 | `demos/kahuang/weibo/huangtingting_1111_01.jpg` | https://weibo.com/7735668873/RqT2Njoso | 微博 uid 7735668873。 |
| `weibo/huangtingting_1111_02.jpg` | 图片 / 单人 | 黄婷婷单人胶片照，同一帖第 2/9 张。不是同框。 | 3342×2303 | `demos/kahuang/weibo/huangtingting_1111_02.jpg` | https://weibo.com/7735668873/RqT2Njoso | 微博 uid 7735668873。 |
| `weibo/huangtingting_1111_03.jpg` | 图片 / 单人 | 黄婷婷单人胶片照，同一帖第 3/9 张。不是同框。 | 3342×2303 | `demos/kahuang/weibo/huangtingting_1111_03.jpg` | https://weibo.com/7735668873/RqT2Njoso | 微博 uid 7735668873。 |
| `weibo/huangtingting_1111_04.jpg` | 图片 / 单人 | 黄婷婷单人胶片照，同一帖第 4/9 张。不是同框。 | 3342×2303 | `demos/kahuang/weibo/huangtingting_1111_04.jpg` | https://weibo.com/7735668873/RqT2Njoso | 微博 uid 7735668873。 |
| `weibo/huangtingting_1111_05.jpg` | 图片 / 单人 | 黄婷婷单人胶片照，同一帖第 5/9 张。画面日期水印为 2025-08-16。不是同框。 | 3342×2303 | `demos/kahuang/weibo/huangtingting_1111_05.jpg` | https://weibo.com/7735668873/RqT2Njoso | 微博 uid 7735668873。 |
| `weibo/huangtingting_1111_06.jpg` | 图片 / 单人 | 黄婷婷单人胶片照，同一帖第 6/9 张。不是同框。 | 3342×2303 | `demos/kahuang/weibo/huangtingting_1111_06.jpg` | https://weibo.com/7735668873/RqT2Njoso | 微博 uid 7735668873。 |
| `weibo/huangtingting_1111_07.jpg` | 图片 / 单人 | 黄婷婷单人胶片照，同一帖第 7/9 张。不是同框。 | 3342×2303 | `demos/kahuang/weibo/huangtingting_1111_07.jpg` | https://weibo.com/7735668873/RqT2Njoso | 微博 uid 7735668873。 |
| `weibo/huangtingting_1111_08.jpg` | 图片 / 单人 | 黄婷婷单人胶片照，同一帖第 8/9 张。不是同框。 | 3342×2303 | `demos/kahuang/weibo/huangtingting_1111_08.jpg` | https://weibo.com/7735668873/RqT2Njoso | 微博 uid 7735668873。 |
| `weibo/huangtingting_1111_09.jpg` | 图片 / 单人 | 黄婷婷单人胶片照，同一帖第 9/9 张。不是同框。 | 3342×2303 | `demos/kahuang/weibo/huangtingting_1111_09.jpg` | https://weibo.com/7735668873/RqT2Njoso | 微博 uid 7735668873。 |
| `weibo/urls.txt` | 索引 | 图片文件名、微博大图 URL、帖子 URL 的对照，制表符分隔。 | — | `demos/kahuang/weibo/urls.txt` | 见文件内各行 | 见各图片行。 |

大图直链和帖子的逐行对应在 `weibo/urls.txt`。`manifest.csv` 只登记了 5 条视频。

## Release 资产

01 / 03 / 04 / 05 用原文件上传，没有从 YouTube 重新下载。这是草稿，不是正式版。标签名是 `kahuang-footage`；草稿页面的地址用的是 GitHub 的 untagged 链接（和本仓库 `epstein-footage` 草稿一样）。未登录时直链会 404，用已登录的 `gh release download kahuang-footage` 下载。

Release 页面：https://github.com/polarbearlin/video-lab/releases/tag/untagged-92aa9c65df77c675a60e

| 文件 | 下载 |
|---|---|
| `01_yedie_official_mv_clip.mp4` | https://github.com/polarbearlin/video-lab/releases/download/untagged-92aa9c65df77c675a60e/01_yedie_official_mv_clip.mp4 |
| `03_yedie_1st_best30.mp4` | https://github.com/polarbearlin/video-lab/releases/download/untagged-92aa9c65df77c675a60e/03_yedie_1st_best30.mp4 |
| `04_renyu_4th_best50_clip.mp4` | https://github.com/polarbearlin/video-lab/releases/download/untagged-92aa9c65df77c675a60e/04_renyu_4th_best50_clip.mp4 |
| `05_aihen_3rd_best30_clip.mp4` | https://github.com/polarbearlin/video-lab/releases/download/untagged-92aa9c65df77c675a60e/05_aihen_3rd_best30_clip.mp4 |

仓库根目录 `.gitignore` 忽略全部 `*.mp4`，只把 `demos/kahuang/videos/02_houhuiyouqi_ti_liyitong.mp4` 排除在外。用下面的命令把四条大视频下载到 `videos/` 后，它们会保持未跟踪，不要 `git add -f`。

`preview/` 和 `tmp/` 不在这个包里。`SHA256SUMS` 里 `./SHA256SUMS` 那一行是空文件的摘要（`e3b0c442…`），对文件自身永远对不上；核对时看其余各行即可。01 / 03 / 04 / 05 还没下载到本目录时，这四行也会报找不到文件。

## Claude Code 怎么看这些素材

```bash
git fetch origin collab/kahuang-footage
git checkout collab/kahuang-footage
```

- 说明和清单：`demos/kahuang/README.md`、`demos/kahuang/MATERIALS.md`、`demos/kahuang/manifest.csv`
- 图片：`demos/kahuang/weibo/`（对照表是 `demos/kahuang/weibo/urls.txt`）
- 短视频（在仓库里）：`demos/kahuang/videos/02_houhuiyouqi_ti_liyitong.mp4`
- 四条大视频（草稿 Release，需要已登录并且对这个仓库有权限的 `gh`）：

```bash
gh release download kahuang-footage -D demos/kahuang/videos \
  -p '01_yedie_official_mv_clip.mp4' \
  -p '03_yedie_1st_best30.mp4' \
  -p '04_renyu_4th_best50_clip.mp4' \
  -p '05_aihen_3rd_best30_clip.mp4'
```

下载之后可以在 `demos/kahuang` 下核对字节（四条大视频就位时，除了 `SHA256SUMS` 自指那一行，其余都应是 OK）：

```bash
cd demos/kahuang
sha256sum -c SHA256SUMS
```
