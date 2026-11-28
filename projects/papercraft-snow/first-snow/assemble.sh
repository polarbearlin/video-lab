#!/bin/bash
# scene60.js = this film's parts + scene.js's palette, cottage frame, pieces and cottage (shared verbatim with the demo)
cd "$(dirname "$0")"
{ cat part1.js; echo; sed -n '42,56p' ../scene.js; echo
  echo '// ---- 2. the cottage frame -----------------------------------------------------------------------------------------------'
  sed -n '58,63p' ../scene.js; cat part2.js part3.js; echo; sed -n '126,236p' ../scene.js; echo; sed -n '238,347p' ../scene.js; cat part6.js part7.js; } > scene60.js
node --check scene60.js
