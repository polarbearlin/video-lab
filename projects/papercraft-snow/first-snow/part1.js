// 第一场雪 / First Snow: the 60 s film (1920x1080, 30 fps), the approved 10 s demo's world carried on: the snow-forest
// cottage, the door, the butler (北极熊管家) and the lady (大馋猫小姐, now wrapped in a blanket), hot cocoa and the
// scarf, the cocoa-foam moustache and the handkerchief, a sled ride under the streetlamps to the frozen lake, a little
// chubby cat snowman with twig whiskers, her head on his shoulder, and the paper book half closing on the lit cottage.
// harness.js and lib/ are the papercraft skill's (unchanged); palette, ground, pieces and cottage are scene.js's.
//
// FILM (cuts on the story beats; each line lands inside the shot of the one who speaks: voice60.js)
//   0-6 wide crane-in on the cottage | 6-12 the door opens, he steps out, catches a flake, "小姐，下雪了。"
//   12-18 she rushes out, shivers, scolds | 18-24 cocoa from behind his back, the scarf, "哼，这还差不多。" under the lamp
//   24-32 close: the sip, the foam moustache, his stifled laugh, "笑什么笑！", the handkerchief
//   32-38.4 tracking the sled under the lamps ("慢点慢点——好吧，再快一点！") | 38.4-42 wide follow, the pines bow and spring
//   42-44.4 the cat snowman pops up, "像您。" | 44.4-50 her: "哪里像！……眼睛挺像的。"
//   50-56 the two on the sled by the lake, her head on his shoulder | 56-60 the camera rises, the page folds up halfway
// LOOK (the Korean-drama brief): warm practicals behind the subject (a moving backlight on the speaker), streetlamp
//   pools, heavy goose-feather flakes plus soft out-of-focus flakes before the lens, slow push-ins, a narrow focus band
import * as THREE from 'three';
import * as P2 from 'papercraft/lib/paperkit-2d.js';
import { makeCard, boxFold, layeredCard, cardClips } from 'papercraft/lib/paperkit-3d.js';
import * as EX from 'papercraft/examples/countryside.js';
import { createLife } from 'papercraft/lib/paper-life.js';
import { FLAP_PRESETS } from 'papercraft/lib/paper-sound.js';
import { createHarness } from '../harness.js';
import { buildFigures } from '../figures.js';
import { createFlakes, flakeGeometry } from '../flakes.js';
import { renderSoundtrack } from './score60.js';
import { LINES, ENV, DURATION } from './voice60.js';
