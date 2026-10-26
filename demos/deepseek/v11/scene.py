# 《大肥鱼 · 自我介绍》v11 · 后 60 秒（30–90 秒，帧 901–2700）（Blender 4.2+ / 5.x，EEVEE）
# 接着 v10 的最后一帧：同一个发布会舞台往右走 —— B站 评论区（鱼灾 + 思考框露馅）→ 深夜锁屏到早安 → 电脑桌面（这条片子怎么做的）→ 钻传送门回到暗场聊天 → 变回贴纸。
# 先准备素材：bash demos/deepseek/v11/render.sh prep
# 预览： blender -b --factory-startup -P demos/deepseek/v11/scene.py -- --stills 1000,1200,1300 --scale 30
# 整片： blender -b --factory-startup -P demos/deepseek/v11/scene.py -- --render [--frames 901-1500]（已渲的帧会跳过，断了重跑即可）
import bpy, math, os, sys, json, argparse, random, glob
from mathutils import Vector, Quaternion, Matrix

HERE = os.path.dirname(os.path.abspath(__file__)); DS = os.path.dirname(HERE); REPO = os.path.abspath(os.path.join(DS, '../..'))
sys.path.insert(0, HERE)
import plan as P
sys.path.insert(0, os.path.join(DS, 'v10'))
from figure import figure
ap = argparse.ArgumentParser()
ap.add_argument('--model', default=os.path.join(REPO, 'assets/models/dafeiyu_chibi/dafeiyu_chibi.glb'))
ap.add_argument('--out', default=os.path.join(DS, 'build/v11render'))
ap.add_argument('--stills', default=''); ap.add_argument('--frames', default=''); ap.add_argument('--render', action='store_true')
ap.add_argument('--scale', type=int, default=100); ap.add_argument('--samples', type=int, default=64)
A = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
UI = {k: os.path.join(DS, f'build/v{k}ui') for k in (5, 6, 7, 9, 10, 11)}
FR = json.load(open(os.path.join(UI[11], 'frames.json')))
FONT = os.path.join(REPO, 'assets/fonts/NotoSansSC.ttf'); FUN = os.path.join(REPO, 'assets/fonts/ZCOOLKuaiLe-Regular.ttf')   # 立体大字用静态字体（可变字体做立体字会重影）
CH = 0.42; CEN = CH * .5; R = math.radians; FPS = P.FPS
V = lambda *p: Vector(p if len(p) == 3 else p[0])
def lin(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in c)
def smooth(a): a = max(0., min(1., a)); return a * a * (3 - 2 * a)
def clamp01(a): return max(0., min(1., a))
def back_out(a, s=1.7): a = clamp01(a) - 1; return a * a * ((s + 1) * a + s) + 1
def between(t, ab): return ab[0] <= t < ab[1]
def ramp(t, ab): return smooth((t - ab[0]) / (ab[1] - ab[0]))
def mixc(a, b, k): return tuple(x + (y - x) * k for x, y in zip(a, b))

# ======================================================================= 渲染设置
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
    try: sc.render.engine = eng; break
    except TypeError: pass
sc.render.fps = FPS; sc.frame_start, sc.frame_end = P.F0, P.F1
sc.render.resolution_x, sc.render.resolution_y = 1920, 1080; sc.render.resolution_percentage = A.scale
ee = sc.eevee; ee.taa_render_samples = A.samples
for k, v in (('use_raytracing', True), ('use_shadows', True), ('use_gtao', True)):
    if hasattr(ee, k): setattr(ee, k, v)
sc.render.use_motion_blur = True
if hasattr(sc.render, 'motion_blur_shutter'): sc.render.motion_blur_shutter = .3
sc.view_settings.view_transform = 'AgX'
try: sc.view_settings.look = 'AgX - Medium High Contrast'
except Exception: pass
sc.render.image_settings.file_format = 'PNG'; sc.render.use_overwrite = False; sc.render.use_placeholder = True

# ======================================================================= 材质 / 物件工具（和 v10 一样）
def mat_img(name, path, emit=1.0, coat=.25, alpha=False, spec=.5, seq=False):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(path); tex.interpolation = 'Cubic'
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = emit
    bs = nt.nodes.new('ShaderNodeBsdfPrincipled'); bs.inputs['Base Color'].default_value = (0, 0, 0, 1); bs.inputs['Roughness'].default_value = .5
    for k, v in (('Coat Weight', coat), ('Coat Roughness', .12), ('Specular IOR Level', spec)):
        if k in bs.inputs: bs.inputs[k].default_value = v
    add = nt.nodes.new('ShaderNodeAddShader')
    nt.links.new(tex.outputs['Color'], em.inputs['Color']); nt.links.new(em.outputs[0], add.inputs[0]); nt.links.new(bs.outputs[0], add.inputs[1])
    if alpha:
        tr = nt.nodes.new('ShaderNodeBsdfTransparent'); mx = nt.nodes.new('ShaderNodeMixShader')
        nt.links.new(tex.outputs['Alpha'], mx.inputs[0]); nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(add.outputs[0], mx.inputs[2]); nt.links.new(mx.outputs[0], out.inputs['Surface'])
        if hasattr(m, 'surface_render_method'): m.surface_render_method = 'DITHERED'
    else: nt.links.new(add.outputs[0], out.inputs['Surface'])
    if seq:
        tex.image.source = 'SEQUENCE'; iu = tex.image_user; iu.frame_duration = 1; iu.frame_start = 1; iu.use_auto_refresh = True; iu.use_cyclic = False
        return m, iu
    return m
def seq_dir(name, paths):
    d = os.path.join(UI[11], 'seq_' + name); os.makedirs(d, exist_ok=True)
    for i, p in enumerate(paths):
        dst = os.path.join(d, f'{i + 1:04d}.png')
        if os.path.lexists(dst): os.remove(dst)
        os.symlink(os.path.abspath(p), dst)
    return os.path.join(d, '0001.png')
def mat_col(name, hexc, rough=.4, metal=0., emit=0., emit_hex=None, coat=0.):
    m = bpy.data.materials.new(name); m.use_nodes = True; bs = m.node_tree.nodes['Principled BSDF']
    bs.inputs['Base Color'].default_value = (*lin(hexc), 1); bs.inputs['Roughness'].default_value = rough; bs.inputs['Metallic'].default_value = metal
    if coat and 'Coat Weight' in bs.inputs: bs.inputs['Coat Weight'].default_value = coat
    if emit: bs.inputs['Emission Color'].default_value = (*lin(emit_hex or hexc), 1); bs.inputs['Emission Strength'].default_value = emit
    return m
def box(name, size, loc, mat, bevel=.01, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1); o = bpy.context.object; o.name = name; o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True); o.data.materials.append(mat)
    if bevel: b_ = o.modifiers.new('bev', 'BEVEL'); b_.width = bevel; b_.segments = 3
    o.location = loc; o.rotation_euler = rot; return o
def card(name, w, h, loc, mat, depth=0., rot=(0, 0, 0), body=None):
    bpy.ops.mesh.primitive_plane_add(size=1); o = bpy.context.object; o.name = name; o.scale = (w, h, 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True); o.data.materials.append(mat)
    if depth:
        o.data.materials.append(body or mat_col(name + '_b', '#d8dcea', .4))
        s_ = o.modifiers.new('t', 'SOLIDIFY'); s_.thickness = depth; s_.offset = -1; s_.material_offset = 1
        b_ = o.modifiers.new('bev', 'BEVEL'); b_.width = min(.012, depth * .4); b_.segments = 2
    o.location = loc; o.rotation_euler = rot; return o
def hinged(o, h):   # 把卡片的轴心挪到下边缘：绕 X 转 90° 就"立起来"
    for v_ in o.data.vertices: v_.co.y += h / 2
    o.rotation_mode = 'XYZ'; return o
def img_size(path): im = bpy.data.images.load(path, check_existing=True); return im.size[0], im.size[1]
def bubble_obj(name, h):
    path = os.path.join(UI[11], name + '.png'); w0, h0 = img_size(path)
    o = card(name, h * w0 / h0, h, V(0, 0, -50), mat_img(name + '_m', path, 1.0, coat=0, alpha=True)); o.rotation_mode = 'XYZ'; return o
BEZEL_D = mat_col('bezel_d', '#0a0a0c', .18, metal=.6); BEZEL_L = mat_col('bezel_l', '#c9ccd3', .22, metal=.85)
def device(c, w, h, mat, light=False, border=.05):
    c = V(c)
    box('body', (w + 2 * border, h + 2 * border, .036), c + V(0, 0, -.016), BEZEL_L if light else BEZEL_D, bevel=.07)
    return card('screen', w, h, c + V(0, 0, .0025), mat)
def ring(name, center, r, thick, hexc, emit=6., rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=r, minor_radius=thick, location=center, rotation=rot, major_segments=72, minor_segments=10)
    o = bpy.context.object; o.name = name; o.data.materials.append(mat_col(name + '_m', hexc, .3, emit=emit)); return o
def portal_disc(name, center, r, rot=(0, 0, 0), strength=2.2):
    bpy.ops.mesh.primitive_circle_add(radius=r, fill_type='NGON', location=center, rotation=rot, vertices=64); o = bpy.context.object; o.name = name
    m = bpy.data.materials.new(name + '_m'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); tc = nt.nodes.new('ShaderNodeTexCoord'); gr = nt.nodes.new('ShaderNodeTexGradient'); gr.gradient_type = 'SPHERICAL'
    mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1 / r, 1 / r, 1 / r)
    cr = nt.nodes.new('ShaderNodeValToRGB'); cr.color_ramp.elements[0].color = (*lin('#3a63ff'), 1); cr.color_ramp.elements[1].color = (1, 1, 1, 1); cr.color_ramp.elements[1].position = .7
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = strength
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector']); nt.links.new(mp.outputs[0], gr.inputs['Vector']); nt.links.new(gr.outputs['Fac'], cr.inputs[0]); nt.links.new(cr.outputs[0], em.inputs['Color']); nt.links.new(em.outputs[0], out.inputs['Surface'])
    o.data.materials.append(m); return o
def text3d(name, s, loc, size, hexc, rot=(R(90), 0, 0), depth=.18, font=FONT):
    cu = bpy.data.curves.new(name, 'FONT'); cu.body = s; cu.font = bpy.data.fonts.load(font); cu.size = size; cu.extrude = depth; cu.align_x = 'CENTER'; cu.align_y = 'BOTTOM'
    o = bpy.data.objects.new(name, cu); sc.collection.objects.link(o); o.data.materials.append(mat_col(name + '_m', hexc, .25, coat=.8)); o.location = loc; o.rotation_euler = rot; return o
def sphere(name, r, loc, mat, seg=24):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=seg // 2); o = bpy.context.object; o.name = name; o.data.materials.append(mat)
    bpy.ops.object.shade_smooth(); return o
def key(o, f, loc=None, rot=None, scale=None):
    if loc is not None: o.location = loc; o.keyframe_insert('location', frame=f)
    if rot is not None:
        if o.rotation_mode == 'QUATERNION': o.rotation_quaternion = rot; o.keyframe_insert('rotation_quaternion', frame=f)
        else: o.rotation_euler = rot; o.keyframe_insert('rotation_euler', frame=f)
    if scale is not None: o.scale = scale; o.keyframe_insert('scale', frame=f)
HIDE = V(0, 0, -60)
at = lambda dev, u, v, z=0.: V(*P.at(dev, u, v, z))

# ======================================================================= 世界：暗色房间 + 发布会舞台（和 v10 相同）
w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True; BG = w.node_tree.nodes['Background']
def mat_desk():
    m = bpy.data.materials.new('desk'); m.use_nodes = True; nt = m.node_tree; bs = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (.15, 1.2, 1)
    wv = nt.nodes.new('ShaderNodeTexWave'); wv.inputs['Scale'].default_value = .5; wv.inputs['Distortion'].default_value = 2.5; wv.inputs['Detail'].default_value = 3
    cr = nt.nodes.new('ShaderNodeValToRGB'); cr.color_ramp.elements[0].color = (*lin('#2a1a12'), 1); cr.color_ramp.elements[1].color = (*lin('#5a3c28'), 1)
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector']); nt.links.new(mp.outputs[0], wv.inputs['Vector']); nt.links.new(wv.outputs['Color'], cr.inputs[0])
    nt.links.new(cr.outputs[0], bs.inputs['Base Color']); bs.inputs['Roughness'].default_value = .4; return m
bpy.ops.mesh.primitive_plane_add(size=1, location=(P.DARK_C[0], 0, -.034)); bpy.context.object.scale = (24, 24, 1); bpy.context.object.data.materials.append(mat_desk())
random.seed(7)
for i in range(50):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=random.uniform(.03, .12), location=(P.DARK_C[0] + random.uniform(-6, 6), random.uniform(3.5, 9), random.uniform(.9, 3)), segments=12, ring_count=6)
    bpy.context.object.data.materials.append(mat_col(f'dot{i}', '#000000', emit=random.uniform(2, 6), emit_hex=random.choice(['#ffb35c', '#ff6fa8', '#b07bff', '#5fd8ff'])))
STAGE = mat_col('stage', '#e9eaee', .32, coat=.3)
bpy.ops.mesh.primitive_plane_add(size=1, location=(10, 0, -.03)); bpy.context.object.scale = (60, 24, 1); bpy.context.object.data.materials.append(STAGE)
bpy.ops.mesh.primitive_cylinder_add(radius=6, depth=60, vertices=96, location=(10, 3, 5.97), rotation=(0, R(90), 0)); cyl = bpy.context.object
for v_ in cyl.data.vertices:
    wv_ = cyl.matrix_world @ v_.co; v_.select = wv_.y < 3.05 or wv_.z > 6
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.delete(type='VERT'); bpy.ops.object.mode_set(mode='OBJECT'); cyl.data.materials.append(STAGE)
bpy.ops.mesh.primitive_plane_add(size=1, location=(10, 9, 6)); wl = bpy.context.object; wl.scale = (60, 1, 12); wl.rotation_euler = (R(90), 0, 0); wl.data.materials.append(STAGE)

# ---- 暗场：聊天平板（最后的"谢谢你"）+ 贴纸位 + 屏幕上的传送门
dTAB = P.TAB; DC = V(*P.DARK_C, 0)
echat_m, echat_iu = mat_img('echat_m', seq_dir('echat', [os.path.join(UI[11], f'echat_{i:03d}.png') for i in range(FR['echat_n'])]), .9, seq=True)
device(DC, *dTAB, echat_m)
def dark_at(u, v, z=0.): return DC + V((u - .5) * dTAB[0], (.5 - v) * dTAB[1], .003 + z)
SX0, SY0, SX1, SY1 = 530, 345, 700, 560   # 和 v10 的贴纸位一样
SLOT = dark_at((SX0 + SX1) / 2 / 1536, (SY0 + SY1) / 2 / 1024); SW = (SX1 - SX0) / 1536 * dTAB[0]; SH = (SY1 - SY0) / 1024 * dTAB[1]
stk = card('sticker', SW, SH, V(0, 0, 0), mat_img('stk_m', os.path.join(UI[7], 'sticker.png'), 1.0, coat=.1, alpha=True))
for v_ in stk.data.vertices: v_.co.y += SH / 2
stk.rotation_mode = 'QUATERNION'; HINGE = SLOT + V(0, -SH / 2, .004)
DPORT = dark_at(.62, .55); DSTAND = dark_at(.42, .7)
dpd = portal_disc('dpd', DPORT + V(0, 0, .002), .26, strength=1.2); dpr = ring('dpr', DPORT + V(0, 0, .004), .27, .011, '#cfe0ff', 5)
dpl = bpy.data.lights.new('dpl', 'POINT'); dpl.energy = 0; dpl.color = lin('#9fb8ff'); dplo = bpy.data.objects.new('dpl', dpl); sc.collection.objects.link(dplo); dplo.location = DPORT + V(0, 0, .15)

# ---- 舞台上 v10 留下的东西（30 秒这一帧镜头还看得到）：股票平板 + 倒下的绿滑梯 + 5890 + 对话平板和"你好"堆
device(V(*P.DEV['chat']['c'], 0), *P.DEV['chat']['size'], mat_img('schat_m', os.path.join(UI[5], 'scr_chat_b.png'), .95, coat=0, spec=0), light=True)
STOCK = dict(c=(6.95, 0.25), size=(2.6, 2.6 * 1600 / 2400))
def stock_at(u, v, z=0.): w_, h_ = STOCK['size']; return V(STOCK['c'][0] + (u - .5) * w_, STOCK['c'][1] + (.5 - v) * h_, z)
device(V(*STOCK['c'], 0), *STOCK['size'], mat_img('stock_m', os.path.join(UI[6], 'stock.png'), .95, coat=0, spec=0), light=True)
u_, v0, v1 = [float(x) for x in open(os.path.join(UI[6], 'stock_slide.txt')).read().split()]
STOP, SBOT = stock_at(u_, v0 - .05, .45), stock_at(u_, v1 + .05, .02); dv = STOP - SBOT
slide = box('slide', (.13, dv.length, .03), SBOT, mat_col('slide_m', '#1fc77e', .25, emit=2.5, coat=.6), bevel=.01)
for v_ in slide.data.vertices: v_.co.y += dv.length / 2
slide.rotation_euler = (math.atan2(dv.z, math.hypot(dv.x, dv.y)), 0, 0)
NUM_LOC = V(6.55, 1.55, 0); text3d('num', '5890 亿美元', NUM_LOC, 1.3, '#0b8f55', rot=(R(90), 0, R(-8)), font=FUN)
# （v10 里的"一天蒸发"小卡 2 秒后就收起了，这里不再摆）
CHAT_C = at('chat', .5, .6); PILE = CHAT_C + V(0, 0, P.PILE_TOP)
bm = mat_img('bub_m', os.path.join(UI[6], 'bubble.png'), 1.1, coat=.2); bb = mat_col('bub_b', '#3550d8', .3)
random.seed(3)   # 和 v10 一模一样的随机序列 → "你好"堆的形状完全接得上
for i in range(80):
    r_ = .62 * math.sqrt(random.random()); a = random.uniform(0, math.tau); h = .4 * (1 - (r_ / .62) ** 1.6) * random.uniform(.75, 1.05)
    o = card(f'rb{i}', .36, .155, HIDE, bm, depth=.03, body=bb); o.rotation_mode = 'XYZ'
    random.uniform(.6, 1.); rot = V(random.uniform(-.9, .9), random.uniform(-.9, .9), random.uniform(0, math.tau))
    o.location = CHAT_C + V(math.cos(a) * r_, math.sin(a) * r_, h); o.rotation_euler = tuple(rot)
umb = card('umb', .62, .62 * 440 / 1000, HIDE, mat_img('umb_m', os.path.join(UI[5], 'scr_busy.png'), 1.3), depth=.025, body=mat_col('umb_b', '#ffb040', .4, emit=1.2)); umb.rotation_mode = 'XYZ'

# ---- 第 3 步：B站 评论区手机 + 彩虹滚动条 + "你是不是 AI？"卡 + 深度思考框
device(V(*P.DEV['bili']['c'], 0), *P.DEV['bili']['size'], mat_img('bili_m', os.path.join(UI[5], 'scr_comments.png'), .95, coat=0, spec=0), light=True)
RU, RV0, RV1 = P.RAIL
RT, RB = at('bili', RU, RV0, .34), at('bili', RU, RV1, .04); rdv = RT - RB; RANG = math.atan2(rdv.z, rdv.y)
def mat_rainbow():
    m = bpy.data.materials.new('rainbow'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    mp = nt.nodes.new('ShaderNodeMapRange'); mp.inputs['From Min'].default_value = 0; mp.inputs['From Max'].default_value = rdv.length
    cr = nt.nodes.new('ShaderNodeValToRGB'); els = cr.color_ramp.elements
    cols = ['#ff5f8f', '#ffb347', '#ffe36b', '#5fe08a', '#5fd8ff', '#7b8bff', '#c77dff']
    els[0].color = (*lin(cols[0]), 1); els[1].position = 1.; els[1].color = (*lin(cols[-1]), 1)
    for i, c_ in enumerate(cols[1:-1]): e_ = els.new((i + 1) / (len(cols) - 1)); e_.color = (*lin(c_), 1)
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 2.6
    nt.links.new(tc.outputs['Object'], sep.inputs[0]); nt.links.new(sep.outputs['Y'], mp.inputs['Value']); nt.links.new(mp.outputs[0], cr.inputs[0])
    nt.links.new(cr.outputs[0], em.inputs['Color']); nt.links.new(em.outputs[0], out.inputs['Surface']); return m
rail = box('rail', (.06, rdv.length, .03), RB, mat_rainbow(), bevel=.012)
for v_ in rail.data.vertices: v_.co.y += rdv.length / 2
rail.rotation_mode = 'XYZ'; rail.rotation_euler = (RANG, 0, 0)
RN = Quaternion((1, 0, 0), RANG) @ V(0, 0, 1)                  # 滚动条表面的法线
Q_RIDE = Quaternion((1, 0, 0), RANG - R(14)) @ Quaternion((0, 0, 1), R(-90))   # 坐在滚动条上往下滑（稍微后仰）
B = at(*P.BASE_B)
qcard = card('qcard', .95, .95 * 400 / 1520, HIDE, mat_img('q_m', os.path.join(UI[5], 'scr_q.png'), 1.1, coat=0), depth=.025, body=mat_col('q_b', '#2a2d36', .4)); qcard.rotation_mode = 'XYZ'
QC = at('bili', .34, P.QCARD_V)
THINK = sorted(glob.glob(os.path.join(UI[11], 'think*.png')))
think_m, think_iu = mat_img('think_m', seq_dir('think', THINK), .8, coat=0, spec=0, seq=True)
think = card('think', .95, .95 * 1150 / 3072, HIDE, think_m, depth=.02, body=mat_col('think_b', '#f4f6fb', .4)); think.rotation_mode = 'XYZ'
TP = B + V(-.62, .55, .42)

# ---- 第 4 步：锁屏（夜里 → 早上）+ 月亮、星星、太阳
LOCKS = ['lock_empty', 'lock_night', 'lock_night2', 'lock_flip0', 'lock_flip1', 'lock_flip2', 'lock_m0', 'lock_morning']
lock_m, lock_iu = mat_img('lock_m', seq_dir('lock', [os.path.join(UI[11], n + '.png') for n in LOCKS]), .95, coat=0, spec=0, seq=True)
device(V(*P.DEV['lock']['c'], 0), *P.DEV['lock']['size'], lock_m, light=True)
def lock_state(t):
    if t < P.NOTE1: return 0
    if t < P.NOTE2: return 1
    if t < P.FLIP[0]: return 2
    if t < P.FLIP[0] + 1.05: return 3 + int((t - P.FLIP[0]) / .35)
    return 6 if t < P.NOTE3 else 7
LC = V(*P.DEV['lock']['c'], 0)
moon = sphere('moon', .13, HIDE, mat_col('moon_m', '#fff3c4', .5, emit=7))
sun = sphere('sun', .17, HIDE, mat_col('sun_m', '#ffb347', .5, emit=9))
random.seed(5); STARS = []
for i in range(36):
    o = sphere(f'star{i}', random.uniform(.008, .02), HIDE, mat_col(f'st{i}', '#ffffff', emit=random.uniform(6, 14)), seg=8)
    STARS.append((o, LC + V(random.uniform(-2.2, 2.2), random.uniform(.8, 2.2), random.uniform(.15, 1.1)), random.uniform(0, math.tau)))

ZZ = [text3d(f'z{i}', 'Z', HIDE, .07 + .025 * i, '#9fb8ff', depth=.012) for i in range(3)]
for o in ZZ: o.data.materials[0] = mat_col('zz_m', '#cfe0ff', .3, emit=4)

# ---- 第 5 步：电脑桌面 + Dock 图标小方块 + 立起来的窗口 + 统计卡 + 彩带 + 传送门
device(V(*P.DEV['desk']['c'], 0), *P.DEV['desk']['size'], mat_img('desk_m', os.path.join(UI[7], 'desktop.png'), .95, coat=0, spec=0), light=True)
ICONS = []
for n, u, v in P.DESK_ICONS:
    o = box(n, (.075, .075, .03), at('desk', u, v), mat_col(n + '_b', '#f4f6fb', .25, coat=.6), bevel=.012)
    for v_ in o.data.vertices: v_.co.z += .015
    top = card(n + '_t', .07, .07, V(0, 0, .0305), mat_img(n + '_m', os.path.join(UI[11], n + '.png'), 1.0, coat=.3)); top.parent = o
    ICONS.append(o)
ICON_TOP = .03
WINS = {}
for n, img, wh in (('code', 'win_code.png', 1120 / 720), ('render', 'win_render0.png', 1200 / 800)):
    ww = 1.0; hh = ww / wh
    if n == 'render':
        rend_m, rend_iu = mat_img('rend_m', seq_dir('render', [os.path.join(UI[11], f'win_render{s}.png') for s in range(7)]), 1.0, coat=0, spec=0, seq=True); m_ = rend_m
    else: m_ = mat_img('code_m', os.path.join(UI[11], img), 1.0, coat=0, spec=0)
    o = hinged(card('win_' + n, ww, hh, HIDE, m_, depth=.02, body=mat_col(n + '_wb', '#2b2b30', .4)), hh)
    WINS[n] = (o, at('desk', *P.WIN[n], .008))
SW_, SH_ = 1.3, 1.3 * 700 / 1600
stats = hinged(card('stats', SW_, SH_, HIDE, mat_img('stats_m', os.path.join(UI[7], 'stats.png'), .8, coat=0, spec=0), depth=.025, body=mat_col('stats_b', '#e9edf8', .3)), SH_)
STATS_P = at('desk', *P.STATS_UV, .008)
random.seed(11); CONF = []
for i in range(46):
    a = random.uniform(0, math.tau); sp_ = random.uniform(.6, 1.6); up = random.uniform(1.5, 3.2)
    o = box(f'conf{i}', (.03, .012, .002), HIDE, mat_col(f'cf{i}', random.choice(['#ff6fa8', '#ffd36b', '#4d6bfe', '#5fd8ff', '#22c55e']), .4, emit=1.2), bevel=0)
    CONF.append((o, V(math.cos(a) * sp_, math.sin(a) * sp_ * .6, up), V(random.uniform(-9, 9), random.uniform(-9, 9), random.uniform(-9, 9))))
def portal_img(name, center, r, img, rot):
    bpy.ops.mesh.primitive_circle_add(radius=r, fill_type='NGON', location=center, rotation=rot, vertices=64); o = bpy.context.object; o.name = name
    m = bpy.data.materials.new(name + '_m'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); tc = nt.nodes.new('ShaderNodeTexCoord')
    mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (.36 / r, .54 / r, 1); mp.inputs['Location'].default_value = (.5, .5, 0)
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(img); tex.extension = 'EXTEND'
    mg = nt.nodes.new('ShaderNodeMapping'); mg.inputs['Scale'].default_value = (1 / r, 1 / r, 1 / r)
    gr = nt.nodes.new('ShaderNodeTexGradient'); gr.gradient_type = 'SPHERICAL'
    cr = nt.nodes.new('ShaderNodeValToRGB'); cr.color_ramp.elements[0].position = .0; cr.color_ramp.elements[0].color = (*lin('#bcd0ff'), 1); cr.color_ramp.elements[1].position = .3; cr.color_ramp.elements[1].color = (0, 0, 0, 1)
    mx = nt.nodes.new('ShaderNodeMixRGB'); mx.blend_type = 'ADD'; mx.inputs[0].default_value = 1
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 1.4
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector']); nt.links.new(mp.outputs[0], tex.inputs['Vector']); nt.links.new(tc.outputs['Object'], mg.inputs['Vector']); nt.links.new(mg.outputs[0], gr.inputs['Vector'])
    nt.links.new(gr.outputs['Fac'], cr.inputs[0]); nt.links.new(tex.outputs['Color'], mx.inputs[1]); nt.links.new(cr.outputs[0], mx.inputs[2]); nt.links.new(mx.outputs[0], em.inputs['Color']); nt.links.new(em.outputs[0], out.inputs['Surface'])
    o.data.materials.append(m); return o
PR_ = .3; DP = at('desk', *P.PORTAL_UV, PR_ + .02)   # 立在桌面上、正对镜头的门，门里就是开头那个暗色聊天
kpd = portal_img('kpd', DP, PR_, os.path.join(UI[11], 'echat_000.png'), (R(90), 0, 0)); kpr = ring('kpr', DP + V(0, -.004, 0), PR_ + .01, .016, '#9fb8ff', 7, rot=(R(90), 0, 0))
kpl = bpy.data.lights.new('kpl', 'POINT'); kpl.energy = 0; kpl.color = lin('#9fb8ff'); kplo = bpy.data.objects.new('kpl', kpl); sc.collection.objects.link(kplo); kplo.location = DP + V(0, -.25, 0)

# ---- 暗场结尾：爱心
hm = mat_img('heart_m', os.path.join(UI[11], 'heart.png'), 1.6, coat=0, alpha=True)
random.seed(9); HEARTS = [(card(f'heart{i}', .075, .075, HIDE, hm), random.uniform(-.2, .2), random.uniform(0, math.tau), P.HEARTS + .12 * i) for i in range(7)]
for o, *_ in HEARTS: o.rotation_mode = 'XYZ'
BUBS = {n: bubble_obj(n, .13 if n == 'a_end' else .2) for _a, _b, n, who in P.LINES if who == 'her'}

# ======================================================================= 角色（分区手办材质）+ 7 个小分身（鱼灾）
bpy.ops.import_scene.gltf(filepath=A.model)
dfy = bpy.data.objects.new('DFY', None); sc.collection.objects.link(dfy); dfy.rotation_mode = 'QUATERNION'
HER = bpy.data.collections.new('HER'); sc.collection.children.link(HER)
MESHES = []
for o in list(bpy.context.selected_objects):
    if o.parent is None: o.parent = dfy
    if o.type == 'MESH':
        o.scale = (CH, CH, CH); HER.objects.link(o); MESHES.append(o)
        for m in o.data.materials: figure(m)
CLONES = []
for i in range(len(P.CLONES)):
    e_ = bpy.data.objects.new(f'CL{i}', None); sc.collection.objects.link(e_); e_.rotation_mode = 'QUATERNION'; e_.location = HIDE
    for o in MESHES:
        c_ = o.copy(); c_.parent = e_; c_.matrix_parent_inverse = o.matrix_parent_inverse.copy(); c_.hide_render = False; HER.objects.link(c_)
    CLONES.append(e_)
CS = .62   # 小分身的大小
def yawq(d): return Quaternion((0, 0, 1), R(d))
def place(center, q, sx=1., sz=1., k=1.): return V(center) + q @ V(0, 0, -CEN * sz * k), q, (sx * k, sx * k, sz * k)
def hop_pose(t, t0, t1, p0, p1, h, yaw0, yaw1, flip=0., spin=0., lean=24.):
    p0, p1 = V(p0), V(p1); d = p1 - p0; d.z = 0; L = d.length
    dv_ = d.normalized() if L > 1e-4 else V(math.cos(R(yaw1)), math.sin(R(yaw1)), 0); ax = V(0, 0, 1).cross(dv_)
    if t < t0:
        a = clamp01((t - (t0 - .1)) / .1); sq = .24 * smooth(a)
        return p0 + V(0, 0, CEN * (1 - sq)), Quaternion(ax, R(-8 * a)) @ yawq(yaw0), 1 + sq * .5, 1 - sq
    if t < t1:
        u = (t - t0) / (t1 - t0); e = 1 - (1 - u) ** 1.5; st = .22 * (1 - u) ** 2 + .1 * u ** 4
        pitch = (lean * math.sin(math.pi * u) if L > .05 else 0) + 360 * flip * smooth(u)
        q = Quaternion(ax, R(pitch)) @ yawq(yaw0 + (yaw1 - yaw0) * smooth(u) + 360 * spin * smooth(u))
        return p0.lerp(p1, e) + V(0, 0, CEN * (1 + st) + h * 4 * u * (1 - u)), q, 1 - st * .4, 1 + st
    d2 = t - t1; sq = .3 * math.exp(-d2 * 14) * math.cos(d2 * 30); tf = (14 if L > .05 else 6) * math.exp(-d2 * 9) * math.sin(d2 * 22)
    return p1 + V(0, 0, CEN * (1 - sq)), Quaternion(ax, R(tf)) @ yawq(yaw1), 1 + sq * .5, 1 - sq
def face(a, b_, bias=-95, lim=40):
    d = V(b_) - V(a); d.z = 0
    if d.length < .05: return bias
    yd = math.degrees(math.atan2(d.y, d.x)); diff = (yd - bias + 180) % 360 - 180; return bias + max(-lim, min(lim, diff))
def breathe(t, t0, sx, sz):
    br = .02 * math.sin((t - t0) * math.tau * P.BPM / 60 / 2); return sx + br * .5, sz - br

H = P.HOPS
def air(i): return H[i][4].get('air', .4)
def hp(i):
    tl, dev, u, v, o = H[i]
    if i == 2: return RT + RN * .01
    p = at(dev, u, v)
    if 'icon' in o: p += V(0, 0, ICON_TOP)
    return p
def prevpt(i): return PILE if i == 0 else RB if i == 3 else B if i == 4 else hp(i - 1)
def hop_i(t):
    i = 0
    while i + 1 < len(H) and t >= H[i + 1][0] - air(i + 1) - .1: i += 1
    return i
def generic(t):
    i = hop_i(t); tl, dev, u, v, o = H[i]; prev, p1 = prevpt(i), hp(i)
    y0 = face(prev, p1); y1 = y0 + (-100 - y0) * smooth((t - tl) / .3) if t > tl else y0
    if i == 0 and t < tl - air(i): y0 = y1 = -95
    c, q, sx, sz = hop_pose(t, tl - air(i), tl, prev, p1, o.get('h', .2), y0, y1, spin=o.get('spin', 0))
    if t > tl + .4: sx, sz = breathe(t, tl, sx, sz)
    return c, q, sx, sz

REACH_A = [min(.3, (P.REACH[k] - (P.REACH[k - 1] if k else P.REACH[0] - .35)) * .92) for k in range(len(P.REACH))]
YAW_TP = face(B, TP)
def her(t):
    """返回 (中心, 朝向, 横向缩放, 纵向缩放)，None = 不在画面里"""
    # ---- 暗场结尾
    if t >= P.CUT:
        if t < P.EMERGE[0]: return None
        if t < P.BACK[0]:
            if t < P.SHY[0] or t >= P.SHY[1] + .6:
                c, q, sx, sz = hop_pose(t, *P.EMERGE, DPORT - V(0, 0, .45), DSTAND, .5, -60, -95, flip=1)
                if t > P.EMERGE[1] + .5: sx, sz = breathe(t, P.EMERGE[1], sx, sz)
                return c, q, sx, sz
            # 被谢谢了：害羞地扭来扭去，中间开心地转一圈
            e = t - P.SHY[0]; tm = (P.SHY[0] + P.SHY[1]) / 2
            if tm - .3 <= t < tm + .4: c, q, sx, sz = hop_pose(t, tm - .3, tm + .1, DSTAND, DSTAND, .25, -95, -95, spin=1)
            else:
                c = DSTAND + V(0, 0, CEN); q = yawq(-95 + 22 * math.sin(e * 7)) @ Quaternion((0, 1, 0), R(8 * math.sin(e * 7 + 1))); sx, sz = 1, 1
            return c, q, sx, sz
        top = SLOT + V(0, .05, 0)
        if t < P.BACK[0] + .4: return hop_pose(t, P.BACK[0], P.BACK[0] + .4, DSTAND, top, .3, -95, -95)
        return None   # 换成平面贴纸
    # ---- 钻进桌面上的传送门
    dive_t0 = H[-1][0] + .3
    if t >= dive_t0:
        a, z = P.DIVE
        p0 = hp(len(H) - 1)
        if t < a: yy = -100 + 190 * smooth((t - dive_t0) / .5); return hop_pose(t, a, z, p0, p0, .3, yy, yy)   # 转身面朝门，蹲一下
        if t > z + .05: return None
        u = clamp01((t - a) / (z - a)); dst = DP + V(0, .35, 0)
        c = p0.lerp(dst, u ** 1.3) + V(0, 0, CEN + .1 * math.sin(math.pi * u) - (CEN - (DP.z - p0.z)) * smooth(u))
        if c.y > DP.y - .02: return None   # 穿过门就看不见了
        k = 1 - .45 * smooth(u); return c, Quaternion((1, 0, 0), R(-80 * smooth(u * 1.6))) @ yawq(90), .9 * k, 1.15 * k
    # ---- 30 秒：站在"你好"堆上，把头上的弹窗甩掉
    if 30.1 <= t < 30.9: return hop_pose(t, P.UMB_TOSS - .1, P.UMB_TOSS + .25, PILE, PILE, .14, -95, -95)
    # ---- 彩虹滚动条
    if H[2][0] <= t < H[3][0] - air(3) - .1:
        if t < P.RIDE[0]:
            c, q, sx, sz = generic(t); k = smooth((t - (P.RIDE[0] - .3)) / .3); return c, q.slerp(Q_RIDE, k), sx, sz
        k = clamp01((t - P.RIDE[0]) / (P.RIDE[1] - P.RIDE[0])) ** 1.35
        return RT.lerp(RB, k) + RN * (CEN * .85 + .03), Q_RIDE @ Quaternion((0, 1, 0), R(7 * math.sin(t * 13))), 1.05, .85
    # ---- B站：被问"是不是 AI" → 思考框露馅 → 蹦起来去捂 → 被小鱼们笑 → 泄气 → 被扑倒
    if H[3][0] + .3 <= t < H[4][0] - air(4):
        if between(t, (P.Q_DROP[1], P.Q_DROP[1] + .35)): return hop_pose(t, P.Q_DROP[1] + .02, P.Q_DROP[1] + .3, B, B, .16, -95, -95)
        if P.REACH[0] - REACH_A[0] <= t < P.REACH[-1] + .25:
            k = 0
            while k + 1 < len(P.REACH) and t >= P.REACH[k + 1] - REACH_A[k + 1]: k += 1
            c, q, sx, sz = hop_pose(t, P.REACH[k] - REACH_A[k], P.REACH[k], B, B, .28 + .07 * k, YAW_TP, YAW_TP)
            u = clamp01((t - (P.REACH[k] - REACH_A[k])) / REACH_A[k]); q = Quaternion((1, 0, 0), R(-28 * math.sin(math.pi * u))) @ q   # 身子往思考框那边够
            return c, q, sx, sz
        if P.REACH[-1] + .25 <= t < P.SLUMP:   # 气得原地跺脚
            e = t - P.REACH[-1]; c = B + V(0, 0, CEN + .03 * abs(math.sin(e * 16))); return c, yawq(-95 + 14 * math.sin(e * 22)), 1., 1. - .05 * abs(math.sin(e * 16))
        if t >= P.SLUMP:   # 泄气 → 被压扁
            k = smooth((t - P.SLUMP) / .45); kk = smooth((t - P.PILE_ON[0] - .3) / .6)
            sz = 1 - .32 * k - .2 * kk; sx = 1 + .22 * k + .1 * kk
            c = B + V(0, 0, CEN * sz); q = yawq(-95) @ Quaternion((1, 0, 0), R(12 * k))
            if t > H[4][0] - air(4) - .25:   # 憋气……蹦出来
                e = (t - (H[4][0] - air(4) - .25)) / .25; sz -= .1 * e; c = B + V(0, 0, CEN * sz)
            return c, q, sx, sz
        c, q, sx, sz = generic(t)
        if H[3][0] + .5 < t < P.Q_DROP[0]: q = yawq(-95 + 38 * math.sin((t - H[3][0]) * 2.6))   # 左右看：好多自己！
        if P.Q_DROP[1] + .35 <= t < P.REACH[0] - REACH_A[0]: q = yawq(-95 + 10 * math.sin((t - P.Q_DROP[1]) * 3))
        return c, q, sx, sz
    # ---- 锁屏：犯困 → 时间翻页吓醒
    if H[5][0] + .5 <= t < H[6][0] - air(6) - .1:
        L_ = hp(5)
        if P.NOTE2 + .7 <= t < P.FLIP[0]:
            k = smooth((t - P.NOTE2 - .7) / 1.2); e = t - P.NOTE2
            q = yawq(-95) @ Quaternion((1, 0, 0), R(k * (14 + 6 * math.sin(e * 1.7)))) @ Quaternion((0, 1, 0), R(k * 8 * math.sin(e * .9)))
            br = .035 * math.sin(e * 2.2) * k; return L_ + V(0, 0, CEN * (1 - .06 * k - br)), q, 1 + .03 * k + br * .5, 1 - .06 * k - br
        if between(t, (P.FLIP[0], P.FLIP[0] + .45)): return hop_pose(t, P.FLIP[0] + .05, P.FLIP[0] + .35, L_, L_, .22, -95, -95)
    return generic(t)

# ---- 小分身：从头像里蹦出来 → 欢呼 → 被吓到 → 笑 → 扑上来 → 被弹飞
CL_P = [at('bili', .1, v) + V(0, -.12, 0) for v in P.CLONE_V]
PILE_OFF = [V(-.11, .02, 0), V(.11, .02, 0), V(0, .1, 0), V(-.06, -.04, .17), V(.07, -.03, .17), V(0, .04, .31), V(0, 0, .44)]
random.seed(21); BURST = [V(math.cos(a_) * 1.4, math.sin(a_) * .9, 2.1 + random.uniform(0, .6)) for a_ in [random.uniform(0, math.tau) for _ in CLONES]]
def clone(i, t, hc):
    t0 = P.CLONES[i]; p = CL_P[i]; ce = CEN * CS
    if t < t0: return None
    e = t - t0
    if e < .4:
        k = back_out(e / .28); return p + V(0, -.12 * smooth(e / .4), .3 * math.sin(math.pi * e / .4)), yawq(-95 + 360 * smooth(e / .4)), (CS * k,) * 3
    yaw = face(p, hc, -95, 60)
    if t < P.Q_DROP[1]:   # 跟着节拍欢呼
        b_ = abs(math.sin(math.pi * t * P.BPM / 60 + i)); return p + V(0, 0, .04 * b_), yawq(yaw) @ Quaternion((0, 1, 0), R(10 * math.sin(t * 6 + i))), (CS * (1 + .06 * b_), CS * (1 + .06 * b_), CS * (1 - .08 * b_))
    if t < P.Q_DROP[1] + .4: u = (t - P.Q_DROP[1]) / .4; return p + V(0, 0, .12 * math.sin(math.pi * u)), yawq(face(p, QC, -95, 70)), (CS,) * 3
    ta = P.PILE_ON[0] + .13 * i; tb = ta + .45; dst = B + PILE_OFF[i] + V(0, 0, CEN * .7)
    if t < P.LAUGH[0]: return p, yawq(face(p, TP, -95, 70)), (CS,) * 3
    if t < ta:   # 笑得前仰后合
        ph = t * 15 + i * 1.3; return p + V(0, 0, .05 * abs(math.sin(ph))), yawq(yaw) @ Quaternion((0, 1, 0), R(22 * math.sin(ph * .5))) @ Quaternion((1, 0, 0), R(-15 * abs(math.sin(ph * .5)))), (CS,) * 3
    tbst = H[4][0] - air(4)
    if t < tb: u = (t - ta) / (tb - ta); return p.lerp(dst, u) + V(0, 0, .35 * 4 * u * (1 - u)), yawq(face(p, dst, -95, 90)) @ Quaternion((1, 0, 0), R(-30 * math.sin(math.pi * u))), (CS,) * 3
    if t < tbst: return dst + V(0, 0, .01 * math.sin(t * 20 + i)), yawq(-95 + 30 * math.sin(i * 2.1)) @ Quaternion((1, 0, 0), R(-20)), (CS,) * 3
    e = t - tbst
    if e > 1.1: return None
    return dst + BURST[i] * e + V(0, 0, -4.5 * e * e), yawq(-95 + 600 * e) @ Quaternion((1, 0, 0), R(400 * e)), (CS * (1 - smooth((e - .7) / .4)) + .001,) * 3

# ======================================================================= 镜头 + 灯
cd = bpy.data.cameras.new('CAM'); cam = bpy.data.objects.new('CAM', cd); sc.collection.objects.link(cam); sc.camera = cam
cd.sensor_fit = 'VERTICAL'; cd.sensor_height = 24; cd.clip_start = .02; cd.dof.use_dof = True; cd.dof.aperture_fstop = 4.0; cam.rotation_mode = 'QUATERNION'
def spot(name, e, hexc):
    ld = bpy.data.lights.new(name, 'SPOT'); ld.energy = e; ld.spot_size = R(24); ld.spot_blend = .8; ld.shadow_soft_size = .05; ld.color = lin(hexc)
    o = bpy.data.objects.new(name, ld); sc.collection.objects.link(o)
    try: o.light_linking.receiver_collection = HER
    except Exception: pass
    return o, ld
(KEY_L, key_d), (RIM_L, rim_d) = spot('key', 220, '#fff0e0'), spot('rim', 260, '#b9c8ff')
sl = bpy.data.lights.new('soft', 'AREA'); sl.size = 8; sl.energy = 0; SOFT = bpy.data.objects.new('soft', sl); sc.collection.objects.link(SOFT)
def cam_target(spec, hc):
    if spec == 'her': return hc
    if spec[0] == 'mix': return at(spec[1], spec[2], spec[3], .1).lerp(hc, spec[4])
    return at(spec[0], spec[1], spec[2], .05)
SPR = {}
def spring(k_, target, stiff=90.):
    dt = 1 / FPS; c_ = 2 * math.sqrt(stiff) * .95
    if k_ not in SPR: SPR[k_] = [V(target), V(0, 0, 0)]; return V(target)
    p, v = SPR[k_]
    for _ in range(4): a = (V(target) - p) * stiff - v * c_; v += a * dt / 4; p += v * dt / 4
    return p.copy()
# 灯光氛围：舞台（白）→ 深夜（蓝黑）→ 早上（暖）→ 舞台；暗场
STAGE_W, NIGHT_W, DAWN_W, DARK_W = lin('#dfe3ea'), lin('#141a33'), lin('#ffe0c0'), lin('#140d1e')
def mood(t):
    """返回 (世界颜色, 世界亮度, 柔光亮度, 柔光颜色, 夜晚程度 0–1, 早晨程度 0–1)"""
    if t >= P.CUT: return DARK_W, .6, 0., (1, 1, 1), 0., 0.
    n = ramp(t, P.NIGHT) * (1 - ramp(t, P.DAWN)); m = ramp(t, P.DAWN) * (1 - ramp(t, (62.8, 63.8)))
    col = mixc(mixc(STAGE_W, NIGHT_W, n), DAWN_W, m); st = 1 - .85 * n - .1 * m
    return col, st, 1100 * (1 - .96 * n) - 150 * m, mixc((1, 1, 1), lin('#ffd2a1'), m), n, m

# ======================================================================= 逐帧打关键帧
last_c = PILE + V(0, 0, CEN); cam_pos = V(0, 0, 0); umb_rest = None
for f in range(P.F0, P.F1 + 1):
    t = (f - 1) / FPS; dark = t >= P.CUT
    hs = her(t)
    if hs is None: key(dfy, f, loc=HIDE, rot=yawq(0), scale=(1, 1, 1))
    else: loc, q, s = place(*hs); key(dfy, f, loc=loc, rot=q, scale=s); last_c = loc + q @ V(0, 0, CEN * s[2])
    # 小分身
    for i, o in enumerate(CLONES):
        cs_ = clone(i, t, last_c) if 33.0 < t < 50.0 else None
        if cs_ is None: key(o, f, loc=HIDE, rot=yawq(0), scale=(1, 1, 1))
        else: c_, q_, s_ = cs_; key(o, f, loc=c_ + q_ @ V(0, 0, -CEN * s_[2]) + V(0, 0, CEN * s_[2]), rot=q_, scale=s_)
    # 暗场：聊天状态、贴纸躺回去、屏幕上的传送门
    echat_iu.frame_offset = FR['echat'][f - FR['echat_f0']] if f >= FR['echat_f0'] else 0; echat_iu.keyframe_insert('frame_offset', frame=f)
    if t >= P.BACK[0] + .4:
        e = t - (P.BACK[0] + .4); lift = 90 * (1 - smooth(e / .3)); bounce = 6 * math.exp(-max(0, e - .3) * 10) * math.sin(max(0, e - .3) * 25) if e > .3 else 0
        key(stk, f, loc=HINGE, rot=Quaternion((1, 0, 0), R(lift + bounce)), scale=(1, 1, 1))
    else: key(stk, f, loc=HIDE, rot=Quaternion(), scale=(1, 1, 1))
    po = back_out((t - P.EMERGE[0] + .5) / .35) * (1 - smooth((t - P.EMERGE[1] - .3) / .4)) if t >= P.EMERGE[0] - .5 else 0
    for o in (dpd, dpr): key(o, f, scale=(max(po, .001),) * 3)
    dpl.energy = 80 * clamp01(po); dpl.keyframe_insert('energy', frame=f)
    # 桌面上的传送门
    ko = back_out((t - P.PORTAL_OPEN[0]) / (P.PORTAL_OPEN[1] - P.PORTAL_OPEN[0])) if t >= P.PORTAL_OPEN[0] else 0
    for o in (kpd, kpr): key(o, f, scale=(max(ko, .001),) * 3)
    kpl.energy = 120 * clamp01(ko); kpl.keyframe_insert('energy', frame=f)
    # 弹窗：从头上甩出去，落到台面上
    if t < P.UMB_TOSS: key(umb, f, loc=last_c + V(0, .02, CEN + .1), rot=(R(55), R(-6), R(4)))
    else:
        e = t - P.UMB_TOSS; p_ = PILE + V(0, .02, CEN * 2 + .1) + V(1.1 * e, .9 * e, 2.4 * e - 4.9 * e * e)
        if p_.z < .02 or umb_rest:
            umb_rest = umb_rest or V(p_.x, p_.y, .02); key(umb, f, loc=umb_rest, rot=(0, 0, R(30)))
        else: key(umb, f, loc=p_, rot=(R(55) + 9 * e, R(-6) + 4 * e, R(4) + 6 * e))
    # 彩虹滚动条：她跳上去之前长出来，滑完收起
    gr = smooth((t - (H[2][0] - .5)) / .4) * (1 - smooth((t - (H[3][0] + .4)) / .4))
    key(rail, f, scale=(1, max(gr, .001), 1))
    # "你是不是 AI？"卡：砸下来 → 立着 → 倒下收起
    a, z = P.Q_DROP
    if t < a or t > P.THINK_OUT + .5: key(qcard, f, loc=HIDE, rot=(R(78), 0, 0))
    else:
        dz = 2.2 * (1 - clamp01((t - a) / (z - a)) ** 2); e = t - z; wob = 6 * math.exp(-e * 8) * math.sin(e * 26) if e > 0 else 0
        out_ = smooth((t - P.THINK_OUT) / .4); key(qcard, f, loc=QC + V(0, 0, .14 + dz - .12 * out_), rot=(R(78 + wob) - R(78) * out_, 0, R(-4)), scale=(1 - out_ + .001,) * 3)
    # 深度思考框：弹出来，内心戏一个字一个字冒出来；她每蹦一下，框就往上躲一下
    nt_ = len(THINK); k = clamp01((t - P.THINK_TYPE[0]) / (P.THINK_TYPE[1] - P.THINK_TYPE[0]))
    think_iu.frame_offset = min(nt_ - 1, int(math.ceil(k * (nt_ - 1)))); think_iu.keyframe_insert('frame_offset', frame=f)
    if P.THINK_IN <= t < P.THINK_OUT + .3:
        s = back_out((t - P.THINK_IN) / .3) * (1 - smooth((t - P.THINK_OUT) / .3)); dodge = sum(.09 * math.exp(-(t - r) * 5) for r in P.REACH if t >= r - .12)
        key(think, f, loc=TP + V(0, 0, dodge + .02 * math.sin(t * 3)), rot=(R(62), 0, R(14)), scale=(max(s, .001),) * 3)
    else: key(think, f, loc=HIDE, rot=(R(80), 0, R(12)), scale=(1, 1, 1))
    # 锁屏 + 月亮 + 星星 + 太阳
    lock_iu.frame_offset = lock_state(t); lock_iu.keyframe_insert('frame_offset', frame=f)
    col, wst, se, scol, nk, mk = mood(t)
    if 46.5 < t < 64:
        ms = nk + .001; key(moon, f, loc=LC + V(-.75, 1.0, .75 - 1.0 * ramp(t, P.DAWN)), scale=(ms,) * 3)
        sk = ramp(t, P.DAWN) * (1 - ramp(t, (62.8, 63.6))); key(sun, f, loc=LC + V(.8, 1.1, -.25 + 1.05 * ramp(t, (P.DAWN[0], P.DAWN[1] + .8))), scale=(sk + .001,) * 3)
        for o, p_, ph in STARS: tw = nk * (.7 + .3 * math.sin(t * 3 + ph)); key(o, f, loc=p_, scale=(tw + .001,) * 3)
    elif f == P.F0 or abs(t - 64) < .04 or abs(t - 46.5) < .04:
        for o in [moon, sun] + [s_[0] for s_ in STARS]: key(o, f, loc=HIDE, scale=(.001,) * 3)
    # 犯困：头上飘 zzz
    for i, o in enumerate(ZZ):
        if P.NOTE2 + 1.2 <= t < P.FLIP[0]:
            e = ((t - P.NOTE2 - 1.2) / 1.6 + i / 3) % 1; s = math.sin(math.pi * e) + .001
            key(o, f, loc=last_c + V(.1 + .12 * e, -.02, CEN + .08 + .3 * e), rot=(R(90), 0, R(-10 + 20 * math.sin(e * 6))), scale=(s, s, s))
        elif abs(t - P.NOTE2 - 1.17) < .04 or abs(t - P.FLIP[0]) < .04 or f == P.F0: key(o, f, loc=HIDE, scale=(.001,) * 3)
    # Dock 图标被踩：压下去再弹起来
    for j, o in enumerate(ICONS):
        hop = [h_ for h_ in H if h_[4].get('icon') == j]; sq = 0
        if hop:
            e = t - hop[0][0]
            if 0 <= e < .6: sq = .55 * math.exp(-e * 8) * math.cos(e * 22)
        key(o, f, scale=(1 + sq * .4, 1 + sq * .4, max(.05, 1 - sq)))
    # 代码窗口 / 渲染窗口：从屏幕里"立"起来，统计卡出来前倒下收起
    for n, tw_ in (('code', P.WIN_CODE), ('render', P.WIN_RENDER)):
        o, p_ = WINS[n]
        if t < tw_ or t > P.WIN_FOLD[1] + .05: key(o, f, loc=HIDE, rot=(0, 0, 0), scale=(1, 1, 1)); continue
        up = back_out((t - tw_) / .45, 1.4) * (1 - ramp(t, P.WIN_FOLD)); s = min(1, (t - tw_) / .15) * (1 - ramp(t, P.WIN_FOLD)) + .001
        key(o, f, loc=p_, rot=(R(70) * up, 0, R(8 if n == 'code' else -8)), scale=(s, s, s))
    rend_iu.frame_offset = min(6, max(0, int((t - P.TILES[0]) / (P.TILES[1] - P.TILES[0]) * 6 + .999))); rend_iu.keyframe_insert('frame_offset', frame=f)
    if P.STATS <= t < P.STATS_FOLD[1] + .05:
        up = back_out((t - P.STATS) / .5, 1.5) * (1 - ramp(t, P.STATS_FOLD)); s = min(1, (t - P.STATS) / .15) * (1 - ramp(t, P.STATS_FOLD)) + .001
        key(stats, f, loc=STATS_P, rot=(R(64) * up, 0, 0), scale=(s, s, s))
    else: key(stats, f, loc=HIDE, rot=(0, 0, 0), scale=(1, 1, 1))
    e = t - P.STATS
    if -.1 <= e < 2.3:
        for o, vel, spin in CONF:
            if 0 <= e < 2.2: key(o, f, loc=STATS_P + V(0, 0, .65) + vel * e + V(0, 0, -2.2 * e * e), rot=tuple(spin * e))
            else: key(o, f, loc=HIDE, rot=(0, 0, 0))
    elif f == P.F0:
        for o, *_ in CONF: key(o, f, loc=HIDE, rot=(0, 0, 0))
    # 爱心：从她头上冒出来往上飘
    for o, dx, ph, th in HEARTS:
        e = t - th
        if 0 <= e < 1.6:
            s = back_out(e / .25) * (1 - smooth((e - 1.2) / .4)) + .001; base = DSTAND + V(dx, -.05, CH + .05)
            yaw = math.degrees(math.atan2(cam_pos.y - base.y, cam_pos.x - base.x)) + 90
            key(o, f, loc=base + V(.05 * math.sin(e * 5 + ph), 0, .45 * e), rot=(R(90), 0, R(yaw)), scale=(s, s, s))
        elif f == P.F0 or abs(e - 1.6) < .04 or abs(e + .04) < .04: key(o, f, loc=HIDE, scale=(1, 1, 1))
    # 镜头
    if dark:
        i = 0
        while i + 1 < len(P.DARK_CAM) and P.DARK_CAM[i + 1][0] <= t: i += 1
        def dframe(sg): look = dark_at(*sg[1]); return look, look + V(sg[2]), sg[3]
        look, pos, fov = dframe(P.DARK_CAM[i])
        if i > 0:
            k = smooth((t - P.DARK_CAM[i][0]) / .8)
            if k < 1: l0, p0, f0 = dframe(P.DARK_CAM[i - 1]); look, pos, fov = l0.lerp(look, k), p0.lerp(pos, k), f0 + (fov - f0) * k
        k = smooth((t - P.CUT) / .9)   # 镜头从传送门里退出来
        if k < 1: pos = (DPORT + V(0, -.05, .12)).lerp(pos, k); look = (DPORT + V(0, .1, -.3)).lerp(look, k)
        if 'dp' not in SPR: SPR['dp'] = [V(pos), V(0, 0, 0)]; SPR['dl'] = [V(look), V(0, 0, 0)]
        pos, look = spring('dp', pos, 160.), spring('dl', look, 160.)
    else:
        i = 0
        while i + 1 < len(P.CAM) and P.CAM[i + 1][0] <= t: i += 1
        def frame(sg): tg = cam_target(sg[1], last_c); return tg, tg + V(sg[2]), sg[3]
        look, pos, fov = frame(P.CAM[i])
        if i > 0:
            k = smooth((t - P.CAM[i][0]) / .6)
            if k < 1: l0, p0, f0 = frame(P.CAM[i - 1]); look, pos, fov = l0.lerp(look, k), p0.lerp(pos, k), f0 + (fov - f0) * k
        if t >= P.FLASH[0] - .3:   # 镜头跟着她钻进门里
            k = smooth((t - (P.FLASH[0] - .3)) / (P.CUT - P.FLASH[0] + .3)); pos = pos.lerp(DP + V(0, -.12, 0), k); look = look.lerp(DP + V(0, 1., 0), k)
        pos, look = spring('sp', pos, 90. if t < P.FLASH[0] - .3 else 400.), spring('sl', look, 110. if t < P.FLASH[0] - .3 else 400.)
    cam_pos = pos
    cam.location = pos; cam.rotation_quaternion = (look - pos).to_track_quat('-Z', 'Y')
    cam.keyframe_insert('location', frame=f); cam.keyframe_insert('rotation_quaternion', frame=f)
    cd.lens = cd.sensor_height / (2 * math.tan(R(fov) / 2)); cd.keyframe_insert('lens', frame=f)
    cd.dof.focus_distance = (pos - last_c).length; cd.dof.keyframe_insert('focus_distance', frame=f)
    # 台词气泡（她的）：跟着头顶，面朝镜头
    for a, z, n, who in P.LINES:
        if who != 'her': continue
        o = BUBS[n]
        if not (a <= t < z): key(o, f, loc=HIDE, scale=(1, 1, 1)); continue
        s = back_out((t - a) / .25) * (1 - smooth((t - (z - .2)) / .2))
        base = last_c + (V(.12, -.04, .3) if dark else V(.18, -.05, .42))
        yaw = math.degrees(math.atan2(cam_pos.y - base.y, cam_pos.x - base.x)) + 90
        key(o, f, loc=base, rot=(R(90), 0, R(yaw)), scale=(max(s, .001),) * 3)
    # 灯：主光 / 轮廓光只照她（夜里偏暖、偏暗）
    cdir = pos - last_c; cdir.z = 0; cdir = cdir.normalized() if cdir.length > 1e-3 else V(0, -1, 0); side = V(-cdir.y, cdir.x, 0)
    for o, off in ((KEY_L, cdir * 1.1 + side * .6 + V(0, 0, 1.4)), (RIM_L, -cdir * .9 - side * .4 + V(0, 0, .9))):
        o.location = last_c + off; o.rotation_euler = (last_c - o.location).to_track_quat('-Z', 'Y').to_euler()
        o.keyframe_insert('location', frame=f); o.keyframe_insert('rotation_euler', frame=f)
    key_d.energy = 220 * (1 - .45 * nk); key_d.color = mixc(lin('#fff0e0'), lin('#ffc890'), max(nk, mk)); key_d.keyframe_insert('energy', frame=f); key_d.keyframe_insert('color', frame=f)
    rim_d.energy = 260 * (1 + .3 * nk); rim_d.keyframe_insert('energy', frame=f)
    SOFT.location = V(last_c.x, last_c.y - .6, 4.5); SOFT.keyframe_insert('location', frame=f)
    sl.energy = se; sl.color = scol; sl.keyframe_insert('energy', frame=f); sl.keyframe_insert('color', frame=f)
    BG.inputs['Color'].default_value = (*col, 1); BG.inputs['Color'].keyframe_insert('default_value', frame=f)
    BG.inputs['Strength'].default_value = wst; BG.inputs['Strength'].keyframe_insert('default_value', frame=f)

# 逐帧都有关键帧：插值改成线性（换图用常量；灯光、天色是逐帧算好的，线性即可，暗场切换那一帧另外处理）
for ad in [o.animation_data for o in list(bpy.data.objects) + [cd, sl, key_d, rim_d, dpl, kpl, w.node_tree] + [m.node_tree for m in (echat_m, think_m, lock_m, rend_m)]]:
    act = ad.action if ad else None
    if not act: continue
    fcs = list(getattr(act, 'fcurves', []))
    for layer in getattr(act, 'layers', []):
        for s_ in layer.strips:
            for cb in s_.channelbags: fcs += list(cb.fcurves)
    for fc in fcs:
        const = 'frame_offset' in fc.data_path
        for kp in fc.keyframe_points: kp.interpolation = 'CONSTANT' if const else 'LINEAR'

os.makedirs(A.out, exist_ok=True)
if A.stills:
    import time
    for f in [int(x) for x in A.stills.split(',')]:
        t0 = time.time(); sc.frame_set(f); sc.render.filepath = os.path.join(A.out, f'still_{f:04d}.png'); sc.render.use_overwrite = True
        bpy.ops.render.render(write_still=True); print(f'STILL {f} {time.time() - t0:.1f}s')
elif A.render:
    if A.frames: a, z = A.frames.split('-'); sc.frame_start, sc.frame_end = int(a), int(z)
    sc.render.filepath = os.path.join(A.out, 'f_'); bpy.ops.render.render(animation=True)
