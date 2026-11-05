#!/usr/bin/env python3
# 拼页面：page_head.html + 复用小件 + beats.js + page_tail.html → index.html
import re
helpers = open('tools/helpers.js').read()
out = open('page_head.html').read() + '\n' + helpers + '\n' + open('beats.js').read() + '\n' + open('page_tail.html').read()
open('index.html', 'w').write(out); print('index.html', len(out.splitlines()), 'lines')
