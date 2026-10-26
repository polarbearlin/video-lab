# 《大肥鱼 · 自我介绍》v10 · 前 30 秒（暗转亮 · 发布会舞台 · 分区手办材质）（Blender 4.2+ / 5.x，EEVEE）
# 先准备素材：bash demos/deepseek/v10/render.sh prep
# 预览： blender -b --factory-startup -P demos/deepseek/v10/scene.py -- --stills 30,75,100,170,200,250,290,330,390,440,520,560,650,700,760,800,880 --scale 30
# 整片： blender -b --factory-startup -P demos/deepseek/v10/scene.py -- --render [--frames 1-450]（已渲的帧会跳过，断了重跑即可）
import bpy, math, os, sys, re, json, argparse, random
from mathutils import Vector, Quaternion, Matrix

HERE = os.path.dirname(os.path.abspath(__file__)); DS = os.path.dirname(HERE); REPO = os.path.abspath(os.path.join(DS, '../..'))
sys.path.insert(0, HERE)
import plan as P
from figure import figure
ap = argparse.ArgumentParser()
ap.add_argument('--model', default=os.path.join(REPO, 'assets/models/dafeiyu_chibi/dafeiyu_chibi.glb'))
ap.add_argument('--out', default=os.path.join(DS, 'build/v10render'))
ap.add_argument('--stills', default=''); ap.add_argument('--frames', default=''); ap.add_argument('--render', action='store_true')
ap.add_argument('--scale', type=int, default=100); ap.add_argument('--samples', type=int, default=64)
A = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
UI = {k: os.path.join(DS, f'build/v{k}ui') for k in (5, 6, 7, 8, 9, 10)}
FR = json.load(open(os.path.join(UI[10], 'frames.json')))
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

# ======================================================================= 渲染设置
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
    try: sc.render.engine = eng; break
    except TypeError: pass
sc.render.fps = FPS; sc.frame_start, sc.frame_end = 1, P.N
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

# ======================================================================= 材质 / 物件工具
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
    d = os.path.join(UI[10], 'seq_' + name); os.makedirs(d, exist_ok=True)
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
def img_size(path): im = bpy.data.images.load(path, check_existing=True); return im.size[0], im.size[1]
def bubble_obj(name, h):
    path = os.path.join(UI[9], name + '.png'); w0, h0 = img_size(path)
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
def whale3d(name, loc, height, yaw=0.):
    d = re.search(r' d="([^"]+)"', open(os.path.join(DS, 'whale.svg')).read()).group(1)
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '2D'; cu.fill_mode = 'BOTH'; cu.extrude = 2.2; cu.bevel_depth = .5; cu.bevel_resolution = 4
    closes, cur = [], None
    for cmd, args in re.findall(r'([MLCZmlcz])([^MLCZmlcz]*)', d):
        n = [float(x) for x in re.findall(r'-?\d*\.?\d+(?:e-?\d+)?', args)]
        if cmd == 'M':
            if cur and len(cur) > 1: closes.append(cur)
            cur = [[(n[0], -n[1]), None, None]] + [[(n[i], -n[i + 1]), None, None] for i in range(2, len(n), 2)]
        elif cmd == 'L': cur += [[(n[i], -n[i + 1]), None, None] for i in range(0, len(n), 2)]
        elif cmd == 'C':
            for i in range(0, len(n), 6): cur[-1][2] = (n[i], -n[i + 1]); cur.append([(n[i + 4], -n[i + 5]), (n[i + 2], -n[i + 3]), None])
        elif cmd in 'Zz' and cur: closes.append(cur); cur = None
    if cur and len(cur) > 1: closes.append(cur)
    for c in closes:
        if len(c) > 1 and math.dist(c[0][0], c[-1][0]) < 1e-3: c[0][1] = c[-1][1]; c.pop()
        sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(c) - 1); sp.use_cyclic_u = True
        for k, (co, hi, ho) in enumerate(c):
            bp = sp.bezier_points[k]; bp.co = (*co, 0); bp.handle_left = (*(hi or co), 0); bp.handle_right = (*(ho or co), 0)
            bp.handle_left_type = bp.handle_right_type = 'FREE' if (hi or ho) else 'VECTOR'
    o = bpy.data.objects.new(name, cu); sc.collection.objects.link(o); o.data.materials.append(mat_col(name + '_m', '#4d6bfe', .2, coat=1., emit=.25))
    bpy.context.view_layer.objects.active = o; o.select_set(True); bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY'); o.select_set(False)
    s_ = height / 42; o.scale = (s_, s_, s_); o.rotation_euler = (R(90), 0, R(yaw)); o.location = V(*loc, height / 2); return o
def text3d(name, s, loc, size, hexc, rot=(R(90), 0, 0), depth=.18, font=FONT):
    cu = bpy.data.curves.new(name, 'FONT'); cu.body = s; cu.font = bpy.data.fonts.load(font); cu.size = size; cu.extrude = depth; cu.align_x = 'CENTER'; cu.align_y = 'BOTTOM'
    o = bpy.data.objects.new(name, cu); sc.collection.objects.link(o); o.data.materials.append(mat_col(name + '_m', hexc, .25, coat=.8)); o.location = loc; o.rotation_euler = rot; return o
def key(o, f, loc=None, rot=None, scale=None):
    if loc is not None: o.location = loc; o.keyframe_insert('location', frame=f)
    if rot is not None:
        if o.rotation_mode == 'QUATERNION': o.rotation_quaternion = rot; o.keyframe_insert('rotation_quaternion', frame=f)
        else: o.rotation_euler = rot; o.keyframe_insert('rotation_euler', frame=f)
    if scale is not None: o.scale = scale; o.keyframe_insert('scale', frame=f)
HIDE = V(0, 0, -60)

# ======================================================================= 世界：暗色房间 + 发布会舞台
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
bpy.ops.mesh.primitive_plane_add(size=1, location=(5, 0, -.03)); bpy.context.object.scale = (40, 24, 1); bpy.context.object.data.materials.append(STAGE)
bpy.ops.mesh.primitive_cylinder_add(radius=6, depth=40, vertices=96, location=(5, 3, 5.97), rotation=(0, R(90), 0)); cyl = bpy.context.object
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='DESELECT'); bpy.ops.object.mode_set(mode='OBJECT')
for v_ in cyl.data.vertices:
    wv_ = cyl.matrix_world @ v_.co; v_.select = wv_.y < 3.05 or wv_.z > 6
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.delete(type='VERT'); bpy.ops.object.mode_set(mode='OBJECT'); cyl.data.materials.append(STAGE)
bpy.ops.mesh.primitive_plane_add(size=1, location=(5, 9, 6)); wl = bpy.context.object; wl.scale = (40, 1, 12); wl.rotation_euler = (R(90), 0, 0); wl.data.materials.append(STAGE)

# ---- 暗场：聊天平板 + 贴纸 + 屏幕上的传送门
dTAB = P.TAB; DC = V(*P.DARK_C, 0)
chat_m, chat_iu = mat_img('dchat_m', seq_dir('dchat', [os.path.join(UI[10], f'chat_{i:03d}.png') for i in range(FR['chat_n'])]), .9, seq=True)
device(DC, *dTAB, chat_m)
def dark_at(u, v, z=0.): return DC + V((u - .5) * dTAB[0], (.5 - v) * dTAB[1], .003 + z)
SX0, SY0, SX1, SY1 = P.STICKER['px']
SLOT = dark_at((SX0 + SX1) / 2 / 1536, (SY0 + SY1) / 2 / 1024); SW = (SX1 - SX0) / 1536 * dTAB[0]; SH = (SY1 - SY0) / 1024 * dTAB[1]
stk = card('sticker', SW, SH, V(0, 0, 0), mat_img('stk_m', os.path.join(UI[7], 'sticker.png'), 1.0, coat=.1, alpha=True))
for v_ in stk.data.vertices: v_.co.y += SH / 2
stk.rotation_mode = 'QUATERNION'; HINGE = SLOT + V(0, -SH / 2, .004)
DPORT = dark_at(.62, .55)
dpd = portal_disc('dpd', DPORT + V(0, 0, .002), .26, strength=1.2); dpr = ring('dpr', DPORT + V(0, 0, .004), .27, .011, '#cfe0ff', 5)
dpl = bpy.data.lights.new('dpl', 'POINT'); dpl.energy = 0; dpl.color = lin('#9fb8ff'); dplo = bpy.data.objects.new('dpl', dpl); sc.collection.objects.link(dplo); dplo.location = DPORT + V(0, 0, .15)

# ---- 舞台：设备、立体鲸鱼、出口传送门、道具
device(V(*P.DEV['logo']['c'], 0), *P.DEV['logo']['size'], mat_img('logo_m', os.path.join(UI[7], 'logo.png'), .95, coat=0, spec=0), light=True)
store_m, store_iu = mat_img('store_m', seq_dir('store', [os.path.join(UI[8], f'store_{p}.png') for p in range(6)]), .95, coat=0, spec=0, seq=True)
device(V(*P.DEV['store']['c'], 0), *P.DEV['store']['size'], store_m, light=True)
device(V(*P.DEV['stock']['c'], 0), *P.DEV['stock']['size'], mat_img('stock_m', os.path.join(UI[6], 'stock.png'), .95, coat=0, spec=0), light=True)
device(V(*P.DEV['chat']['c'], 0), *P.DEV['chat']['size'], mat_img('schat_m', os.path.join(UI[5], 'scr_chat_b.png'), .95, coat=0, spec=0), light=True)
whale3d('whale', P.WHALE, 1.15, yaw=-12)
PROT = (R(90), 0, R(-8)); PC = V(*P.PORTAL)   # 出口传送门基本正对镜头
spd = portal_disc('spd', PC, .42, rot=PROT); spr = ring('spr', PC, .43, .016, '#9fb8ff', 6, rot=PROT)
c_card = card('ccard', .9, .9 * 400 / 1520, HIDE, mat_img('ccard_m', os.path.join(UI[9], 'c1.png'), 1.1), depth=.02); c_card.rotation_mode = 'XYZ'
plate = card('plate', .5, .5 * 400 / 1200, HIDE, mat_img('plate_m', os.path.join(UI[7], 'nameplate.png'), 1.2), depth=.03, body=mat_col('plate_b', '#4d6bfe', .3, emit=1)); plate.rotation_mode = 'XYZ'
board_top = card('board_top', .62, .62 * 370 / 860, V(0, 0, .028), mat_img('board_m', os.path.join(UI[9], 'b_fire_q.png'), 1.0, coat=.2, alpha=True))
board = box('board', (.66, .26, .05), HIDE, mat_col('board_b', '#f4f6fb', .25, coat=.6), bevel=.03); board_top.parent = board; board.rotation_mode = 'XYZ'
ICON_P = V(*P.at('store', P.STORE_ICON_U if hasattr(P, 'STORE_ICON_U') else 180 / 1024, P.store_row_v(0)))
icon = box('icon', (.17, .16, .1), ICON_P + V(0, 0, .05), mat_col('icon_b', '#ffffff', .2, coat=.8), bevel=.03)
icon_top = card('icon_top', .16, .148, V(0, 0, .051), mat_img('icon_m', os.path.join(UI[9], 'ds_icon.png'), 1.0, coat=.3)); icon_top.parent = icon
for v_ in icon.data.vertices: v_.co.z += .05
icon.location = ICON_P
random.seed(11)
CONF = []
for i in range(46):
    a = random.uniform(0, math.tau); sp_ = random.uniform(.6, 1.6); up = random.uniform(1.5, 3.2)
    o = box(f'conf{i}', (.03, .012, .002), HIDE, mat_col(f'cf{i}', random.choice(['#ff6fa8', '#ffd36b', '#4d6bfe', '#5fd8ff', '#22c55e']), .4, emit=1.2), bevel=0)
    CONF.append((o, V(math.cos(a) * sp_, math.sin(a) * sp_ * .6, up), V(random.uniform(-9, 9), random.uniform(-9, 9), random.uniform(-9, 9))))
u_, v0, v1 = [float(x) for x in open(os.path.join(UI[6], 'stock_slide.txt')).read().split()]
STOP, SBOT = V(*P.at('stock', u_, v0 - .05, .45)), V(*P.at('stock', u_, v1 + .05, .02))
dv = STOP - SBOT; SANG = math.atan2(dv.z, math.hypot(dv.x, dv.y))
slide = box('slide', (.13, dv.length, .03), SBOT, mat_col('slide_m', '#1fc77e', .25, emit=2.5, coat=.6), bevel=.01)
for v_ in slide.data.vertices: v_.co.y += dv.length / 2
DOWN = (SBOT - STOP).normalized(); NRM = V(1, 0, 0).cross(DOWN).normalized()
if NRM.z < 0: NRM = -NRM
Q_SLIDE = Matrix((NRM, (-DOWN).cross(NRM), -DOWN)).transposed().to_quaternion() @ Quaternion((0, 0, 1), R(-25))
num = text3d('num', '5890 亿美元', V(*P.NUMBER, 0), 1.3, '#0b8f55', rot=(R(90), 0, R(-8)), font=FUN)
NUM_LOC = num.location.copy()
w0, h0 = img_size(os.path.join(UI[9], 'num7s.png'))
numcap = card('numcap', .3 * w0 / h0, .3, HIDE, mat_img('numcap_m', os.path.join(UI[9], 'num7s.png'), 1.0, coat=0, alpha=True), rot=(R(90), 0, R(-8)))
CHAT_C = V(*P.at('chat', .5, .6))
bm = mat_img('bub_m', os.path.join(UI[6], 'bubble.png'), 1.1, coat=.2); bb = mat_col('bub_b', '#3550d8', .3)
random.seed(3); RAINB = []
for i in range(80):
    r_ = .62 * math.sqrt(random.random()); a = random.uniform(0, math.tau); h = .4 * (1 - (r_ / .62) ** 1.6) * random.uniform(.75, 1.05)
    o = card(f'rb{i}', .36, .155, HIDE, bm, depth=.03, body=bb); o.rotation_mode = 'XYZ'
    t0 = P.RAIN[0] + (P.RAIN[1] - P.RAIN[0] - .5) * (1 - h / .42) * random.uniform(.6, 1.) ; RAINB.append((o, CHAT_C + V(math.cos(a) * r_, math.sin(a) * r_, h), t0, V(random.uniform(-.9, .9), random.uniform(-.9, .9), random.uniform(0, math.tau))))
PILE_TOP = .36
umb = card('umb', .62, .62 * 440 / 1000, HIDE, mat_img('umb_m', os.path.join(UI[5], 'scr_busy.png'), 1.3), depth=.025, body=mat_col('umb_b', '#ffb040', .4, emit=1.2)); umb.rotation_mode = 'XYZ'
BUBS = {n: bubble_obj(n, .2 if who == 'her' else .17) for _a, _b, n, who in P.LINES}

# ======================================================================= 角色（分区手办材质）
bpy.ops.import_scene.gltf(filepath=A.model)
dfy = bpy.data.objects.new('DFY', None); sc.collection.objects.link(dfy); dfy.rotation_mode = 'QUATERNION'
HER = bpy.data.collections.new('HER'); sc.collection.children.link(HER)
for o in list(bpy.context.selected_objects):
    if o.parent is None: o.parent = dfy
    if o.type == 'MESH':
        o.scale = (CH, CH, CH); HER.objects.link(o)
        for m in o.data.materials: figure(m)
def yawq(d): return Quaternion((0, 0, 1), R(d))
def place(center, q, sx=1., sz=1.): return V(center) + q @ V(0, 0, -CEN * sz), q, (sx, sx, sz)
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
def face(a, b_, bias=-95):
    d = V(b_) - V(a); d.z = 0
    if d.length < .05: return bias
    yd = math.degrees(math.atan2(d.y, d.x)); diff = (yd - bias + 180) % 360 - 180; return bias + max(-40, min(40, diff))

# 冲浪板的路径：从 logo 平板左边飞到 App Store 左边
B0 = V(*P.at('logo', .25, .6, .45)); B1 = V(*P.at('store', -.2, .62, .5)); BIN = B0 + V(4.5, -.6, .3)
def board_pos(t):
    if t < P.BOARD_IN[0]: return None
    if t < P.BOARD_IN[1]: k = smooth((t - P.BOARD_IN[0]) / (P.BOARD_IN[1] - P.BOARD_IN[0])); return BIN.lerp(B0, k) + V(0, 0, .03 * math.sin(t * 8))
    if t < P.SURF[0]: return B0 + V(0, 0, .02 * math.sin(t * 6))
    if t < P.SURF[1]: k = smooth((t - P.SURF[0]) / (P.SURF[1] - P.SURF[0])); return B0.lerp(B1, k) + V(0, 0, .35 * math.sin(math.pi * k))
    if t < P.SURF[1] + .9: k = (t - P.SURF[1]) / .9; return B1 + V(-1.5 * k * k, .4 * k, 1.2 * k * k)
    return None
def hop_pt(i, t):
    tl, dev, u, v, o = P.HOPS[i]
    if o.get('onto_board'): return board_pos(t) + V(-.05, 0, .03) if board_pos(t) else B0
    if o.get('store'): return V(*P.at('store', 180 / 1024, P.store_row_v(P.lift_pos(t)))) + V(0, 0, .1 * smooth((t - P.ICON_POP) / .25) if t > P.ICON_POP else 0)
    return V(*P.at(dev, u, v))

def her(t):
    S = P.STICKER
    if t < S['swap']: return None
    if t < P.DIVE[0] - .1:
        a0, a1 = S['spin']; return place(SLOT + V(0, .05, CEN), yawq(-90 + 360 * smooth((t - a0) / (a1 - a0))))
    if t < P.CUT:   # 扑进屏幕上的传送门：前倾、头朝下，钻进去
        if t < P.DIVE[0]: c, q, sx, sz = hop_pose(t, P.DIVE[0], P.DIVE[1], SLOT, DPORT, .3, -90, -90); return place(c, q, sx, sz)
        u = clamp01((t - P.DIVE[0]) / (P.DIVE[1] - P.DIVE[0]))
        c = SLOT.lerp(DPORT, u) + V(0, 0, CEN + .35 * math.sin(math.pi * min(u, .6) / .6) - (1.3 * (u - .6) / .4 if u > .6 else 0))
        q = Quaternion((1, 0, 0), R(150 * smooth(u))) @ yawq(-90); return place(c, q, .9, 1.15)
    # 舞台：从传送门飞出来
    h0 = P.HOPS[0]
    if t < h0[0] + .4 and t >= h0[0] - h0[4]['air'] - .01:
        c, q, sx, sz = hop_pose(t, h0[0] - h0[4]['air'], h0[0], PC - V(0, 0, CEN), hop_pt(0, t), .9, -60, -100, spin=1); return place(c, q, sx, sz)
    if t < h0[0] - h0[4]['air']: return place(PC, yawq(-60))
    # 冲浪
    if P.SURF[0] - .02 <= t < P.HOPS[4][0] - P.HOPS[4][4]['air'] - .1:
        bp = board_pos(t); return place(bp + V(-.05, 0, .055 + CEN * .9), yawq(-60) @ Quaternion(V(1, 0, 0), R(10 * math.sin(t * 5))) @ Quaternion(V(0, 1, 0), R(-15)), 1.05, .9)
    # App Store 被顶飞 → 滑梯
    if t >= P.LAUNCH - .1 and t < P.SLIDE_LAND:
        p0 = V(*P.at('store', 180 / 1024, P.store_row_v(0))) + V(0, 0, .1)
        c, q, sx, sz = hop_pose(t, P.LAUNCH, P.SLIDE_LAND, p0, STOP + NRM * .02, .75, -95, -110, flip=1, lean=0)
        if t > P.SLIDE_LAND - .15: q = q.slerp(Q_SLIDE, smooth((t - (P.SLIDE_LAND - .15)) / .15))
        return place(c, q, sx, sz)
    if P.SLIDE_LAND <= t < P.SLIDE_END:
        k = ((t - P.SLIDE_LAND) / (P.SLIDE_END - P.SLIDE_LAND)) ** 1.6; return place(STOP.lerp(SBOT, .05 + .9 * k) + NRM * .12, Q_SLIDE @ Quaternion((1, 0, 0), R(6 * math.sin(t * 14))))
    if P.SLIDE_END <= t < P.HOPS[5][0] - P.HOPS[5][4]['air'] - .1:
        c, q, sx, sz = hop_pose(t, P.SLIDE_END - .25, P.SLIDE_END, SBOT, SBOT + V(.12, -.15, -.02), .1, -100, -100); return place(c, q, sx, sz)
    # 被"你好"埋住 → 顶着弹窗钻出来
    if t >= P.POP_OUT - .1:
        top = CHAT_C + V(0, 0, PILE_TOP)
        if t < P.HOPS[7][0] - P.HOPS[7][4]['air'] - .1:
            c, q, sx, sz = hop_pose(t, P.POP_OUT, P.POP_OUT + .3, CHAT_C, top, .25, -95, -95); return place(c, q, sx, sz)
        c, q, sx, sz = hop_pose(t, P.HOPS[7][0] - .45, P.HOPS[7][0], top, top, .3, -95, -95, spin=1); return place(c, q, sx, sz)
    # 普通跳跃
    i = 0
    while i + 1 < len(P.HOPS) and t >= P.HOPS[i + 1][0] - P.HOPS[i + 1][4].get('air', .4) - .1: i += 1
    tl, dev, u, v, o = P.HOPS[i]
    prev = SBOT + V(.12, -.15, -.02) if i == 5 else (hop_pt(i - 1, t) if i > 0 else PC)
    if o.get('onto_board') and t >= tl: bp = board_pos(t); return place(bp + V(-.05, 0, .055 + CEN * .9), yawq(-60), 1.05, .9)
    p1 = hop_pt(i, t); y0 = face(prev, p1); y1 = y0 + (-100 - y0) * smooth((t - tl) / .3) if t > tl else y0
    c, q, sx, sz = hop_pose(t, tl - o.get('air', .4), tl, prev, p1, o.get('h', .2), y0, y1, spin=o.get('spin', 0))
    if t > tl + .4:
        br = .02 * math.sin((t - tl) * math.tau * P.BPM / 60 / 2); sz -= br; sx += br * .5
    if o.get('store'):
        for tt in P.LIFT:
            e = t - tt
            if 0 <= e < .3: sz -= .18 * math.exp(-e * 12) * math.cos(e * 30)
    # 踢评论卡：身体后仰一下；被名字牌砸扁
    e = t - P.KICK
    if 0 <= e < .45: q = q @ Quaternion(V(0, 1, 0), R(-22 * math.sin(math.pi * e / .45)))
    if between(t, P.SQUASH):
        e = (t - P.SQUASH[0]) / (P.SQUASH[1] - P.SQUASH[0]); sq = .55 * (1 - smooth((e - .7) / .3)); sz, sx = 1 - sq, 1 + sq * .6
        c = p1 + V(0, 0, CEN * sz)
    return place(c, q, sx, sz)

# ======================================================================= 镜头 + 灯
cd = bpy.data.cameras.new('CAM'); cam = bpy.data.objects.new('CAM', cd); sc.collection.objects.link(cam); sc.camera = cam
cd.sensor_fit = 'VERTICAL'; cd.sensor_height = 24; cd.clip_start = .02; cd.dof.use_dof = True; cd.dof.aperture_fstop = 4.0; cam.rotation_mode = 'QUATERNION'
def spot(name, e, hexc):
    ld = bpy.data.lights.new(name, 'SPOT'); ld.energy = e; ld.spot_size = R(24); ld.spot_blend = .8; ld.shadow_soft_size = .05; ld.color = lin(hexc)
    o = bpy.data.objects.new(name, ld); sc.collection.objects.link(o)
    try: o.light_linking.receiver_collection = HER
    except Exception: pass
    return o
KEY_L, RIM_L = spot('key', 220, '#fff0e0'), spot('rim', 260, '#b9c8ff')
sl = bpy.data.lights.new('soft', 'AREA'); sl.size = 8; sl.energy = 0; SOFT = bpy.data.objects.new('soft', sl); sc.collection.objects.link(SOFT)
def cam_target(spec, hc):
    if spec == 'her': return hc
    if spec[0] == 'mix': return V(*P.at(spec[1], spec[2], spec[3], .1)).lerp(hc, spec[4])
    return V(*P.at(spec[0], spec[1], spec[2], .05))
SPR = {}
def spring(k_, target, stiff=90.):
    dt = 1 / FPS; c_ = 2 * math.sqrt(stiff) * .95
    if k_ not in SPR: SPR[k_] = [V(target), V(0, 0, 0)]; return V(target)
    p, v = SPR[k_]
    for _ in range(4): a = (V(target) - p) * stiff - v * c_; v += a * dt / 4; p += v * dt / 4
    return p.copy()

# ======================================================================= 逐帧打关键帧
last_c = SLOT + V(0, 0, CEN); cam_pos = V(0, 0, 0)
for f in range(1, P.N + 1):
    t = (f - 1) / FPS; stage = t >= P.CUT
    hs = her(t)
    if hs is None: key(dfy, f, loc=HIDE, rot=yawq(0), scale=(1, 1, 1))
    else: loc, q, s = hs; key(dfy, f, loc=loc, rot=q, scale=s); last_c = loc + q @ V(0, 0, CEN * s[2])
    # 暗场：聊天状态、贴纸、屏幕上的传送门
    chat_iu.frame_offset = FR['chat'][f - 1]; chat_iu.keyframe_insert('frame_offset', frame=f)
    S_ = P.STICKER
    if P.REPLY_T <= t < S_['swap']:
        a, z = S_['peel']; lift = 90 * smooth((t - a) / (z - a)) if t >= a else 0
        a2, z2 = S_['spin']; th = 360 * smooth((t - a2) / (z2 - a2)) if t >= a2 else 0; pop = back_out((t - P.REPLY_T) / .3)
        key(stk, f, loc=HINGE, rot=Quaternion((0, 0, 1), R(th)) @ Quaternion((1, 0, 0), R(lift)), scale=(pop, pop, pop))
    else: key(stk, f, loc=HIDE, rot=Quaternion(), scale=(1, 1, 1))
    po = back_out((t - P.PORTAL_OPEN[0]) / (P.PORTAL_OPEN[1] - P.PORTAL_OPEN[0])) if t >= P.PORTAL_OPEN[0] else .001
    for o in (dpd, dpr): key(o, f, scale=(po, po, po if o is dpd else max(po, .001)))
    dpl.energy = 80 * clamp01(po); dpl.keyframe_insert('energy', frame=f)
    # 舞台出口传送门：飞出来以后收起
    ps = 1. if t < 6.4 else max(.001, 1 - smooth((t - 6.4) / .4))
    for o in (spd, spr): key(o, f, scale=(ps, ps, ps))
    # 网友评论卡：飞进来 → 被踢飞
    CT = V(*P.at('logo', .2, .6, .32))
    if t < P.CARD_IN[0]: key(c_card, f, loc=HIDE, rot=(R(90), 0, 0))
    elif t < P.KICK:
        k = back_out((t - P.CARD_IN[0]) / (P.CARD_IN[1] - P.CARD_IN[0]), 1.2); key(c_card, f, loc=(CT + V(-2.2, 0, .6)).lerp(CT, k) + V(0, 0, .015 * math.sin(t * 4)), rot=(R(88), 0, R(-6)))
    else:
        e = t - P.KICK; key(c_card, f, loc=CT + V(-2.6 * e, -.4 * e, 2.2 * e - 2.4 * e * e), rot=(R(88) + 8 * e, R(-14) - 6 * e, R(-6) + 5 * e))
    # 名字牌：砸下来 → 压在她头上 → 滑到旁边立住
    a, z = P.PLATE; ph = V(*P.at('logo', .36, .62))
    if t < a: key(plate, f, loc=HIDE, rot=(R(80), 0, 0))
    elif t < P.SQUASH[1]:
        hz = CH * (1 - .55) + .03 if t >= z else 2.2 * (1 - clamp01((t - a) / (z - a)) ** 2) + CH
        key(plate, f, loc=ph + V(0, 0, hz), rot=(R(80), 0, R(-8)))
    else:
        k = smooth((t - P.SQUASH[1]) / .35); key(plate, f, loc=(ph + V(0, 0, CH * .45 + .03)).lerp(ph + V(.35, .15, .12), k), rot=(R(80) + R(10) * k, 0, R(-8)))
    # 冲浪板
    bp = board_pos(t); key(board, f, loc=bp if bp else HIDE, rot=(R(12), R(-8), R(15)))
    # 电梯 + 图标弹起 + 彩带
    store_iu.frame_offset = int(round(P.lift_pos(t))); store_iu.keyframe_insert('frame_offset', frame=f)
    ip = smooth((t - P.ICON_POP) / .25); key(icon, f, scale=(1, 1, max(.001, ip)))
    for o, vel, spin in CONF:
        e = t - P.CONFETTI
        if 0 <= e < 2.2: key(o, f, loc=ICON_P + V(0, 0, .3) + vel * e + V(0, 0, -2.2 * e * e), rot=tuple(spin * e))
        else: key(o, f, loc=HIDE, rot=(0, 0, 0))
    # 绿柱：竖起来 → 倒下变滑梯；"5890 亿美元"砸下来；说明文字
    rise = smooth((t - P.BAR_RISE[0]) / (P.BAR_RISE[1] - P.BAR_RISE[0])); fall = smooth((t - P.BAR_FALL[0]) / (P.BAR_FALL[1] - P.BAR_FALL[0]))
    key(slide, f, rot=(R(90) + (SANG - R(90)) * fall, 0, 0), scale=(1, max(.001, rise), 1))
    a, z = P.NUM_DROP
    key(num, f, loc=NUM_LOC + V(0, 0, 50 if t < a else 3.0 * (1 - clamp01((t - a) / (z - a)) ** 2)))
    s = back_out((t - P.NUM_DROP[1] - .2) / .3) * (1 - smooth((t - P.NUM_DROP[1] - 2.2) / .3)) + .001 if t > P.NUM_DROP[1] + .2 else .001   # 停 2 秒就收起，不再卡在画面角落
    key(numcap, f, loc=NUM_LOC + V(0, -.05, 1.6), scale=(s, s, s))
    # "你好"雨 + 弹窗
    for o, rest, t0, rot in RAINB:
        if t < t0: key(o, f, loc=HIDE, rot=(0, 0, 0))
        else:
            e = t - t0; fallz = max(0., 2.4 - 9.8 * e * e / 2); bounce = .03 * math.exp(-(e - .7) * 8) * abs(math.sin((e - .7) * 20)) if fallz == 0 and e > .7 else 0
            key(o, f, loc=rest + V(0, 0, fallz + bounce), rot=tuple(rot + V(3 * fallz, 2 * fallz, 0)))
    a, z = P.POPUP_DROP
    if t < a: key(umb, f, loc=HIDE, rot=(0, 0, 0))
    elif t < P.POP_OUT + .15:
        key(umb, f, loc=CHAT_C + V(0, 0, .44 + 2.0 * (1 - clamp01((t - a) / (z - a)) ** 2)), rot=(R(6), R(-4), R(3)))
    else: key(umb, f, loc=last_c + V(0, .02, CEN + .1), rot=(R(55), R(-6), R(4)))
    # 台词气泡：跟着她头顶，或固定位置；弹出 / 收起
    for a, z, n, who in P.LINES:
        o = BUBS[n]
        if not (a <= t < z): key(o, f, loc=HIDE, scale=(1, 1, 1)); continue
        s = back_out((t - a) / .25) * (1 - smooth((t - (z - .2)) / .2))
        base = last_c + V(.18, -.05, .42) if who == 'her' else V(*P.at('chat', .3, .45, .55))
        yaw = math.degrees(math.atan2(cam_pos.y - base.y, cam_pos.x - base.x)) + 90
        key(o, f, loc=base, rot=(R(90), 0, R(yaw)), scale=(max(s, .001),) * 3)
    # 镜头
    if not stage:
        i = 0
        while i + 1 < len(P.DARK_CAM) and P.DARK_CAM[i + 1][0] <= t: i += 1
        def dframe(sg): look = dark_at(*sg[1]); return look, look + V(sg[2]), sg[3]
        look, pos, fov = dframe(P.DARK_CAM[i])
        if i > 0:
            k = smooth((t - P.DARK_CAM[i][0]) / .7)
            if k < 1: l0, p0, f0 = dframe(P.DARK_CAM[i - 1]); look, pos, fov = l0.lerp(look, k), p0.lerp(pos, k), f0 + (fov - f0) * k
        if t >= P.FLASH[0]:   # 镜头钻进传送门
            k = smooth((t - P.FLASH[0]) / (P.CUT - P.FLASH[0])); pos = pos.lerp(DPORT + V(0, -.05, .12), k); look = look.lerp(DPORT + V(0, .1, -.3), k)
        pos, look = spring('dp', pos, 120.), spring('dl', look, 140.)
    else:
        i = 0
        while i + 1 < len(P.CAM) and P.CAM[i + 1][0] <= t: i += 1
        def frame(sg): tg = cam_target(sg[1], last_c); return tg, tg + V(sg[2]), sg[3]
        look, pos, fov = frame(P.CAM[i])
        if i > 0:
            k = smooth((t - P.CAM[i][0]) / .6)
            if k < 1: l0, p0, f0 = frame(P.CAM[i - 1]); look, pos, fov = l0.lerp(look, k), p0.lerp(pos, k), f0 + (fov - f0) * k
        pos, look = spring('sp', pos), spring('sl', look, 110.)
    cam_pos = pos
    cam.location = pos; cam.rotation_quaternion = (look - pos).to_track_quat('-Z', 'Y')
    cam.keyframe_insert('location', frame=f); cam.keyframe_insert('rotation_quaternion', frame=f)
    cd.lens = cd.sensor_height / (2 * math.tan(R(fov) / 2)); cd.keyframe_insert('lens', frame=f)
    cd.dof.focus_distance = (pos - last_c).length; cd.dof.keyframe_insert('focus_distance', frame=f)
    cdir = pos - last_c; cdir.z = 0; cdir = cdir.normalized() if cdir.length > 1e-3 else V(0, -1, 0); side = V(-cdir.y, cdir.x, 0)
    for o, off in ((KEY_L, cdir * 1.1 + side * .6 + V(0, 0, 1.4)), (RIM_L, -cdir * .9 - side * .4 + V(0, 0, .9))):
        o.location = last_c + off; o.rotation_euler = (last_c - o.location).to_track_quat('-Z', 'Y').to_euler()
        o.keyframe_insert('location', frame=f); o.keyframe_insert('rotation_euler', frame=f)
    SOFT.location = V(last_c.x, last_c.y - .6, 4.5); SOFT.keyframe_insert('location', frame=f)
    sl.energy = 1100 if stage else 0; sl.keyframe_insert('energy', frame=f)
    BG.inputs['Color'].default_value = (*(lin('#dfe3ea') if stage else lin('#140d1e')), 1); BG.inputs['Color'].keyframe_insert('default_value', frame=f)
    BG.inputs['Strength'].default_value = 1.0 if stage else .6; BG.inputs['Strength'].keyframe_insert('default_value', frame=f)

# 逐帧都有关键帧：插值改成线性（换图、灯光开关用常量）
for ad in [o.animation_data for o in list(bpy.data.objects) + [cd, sl, dpl, w.node_tree] + [m.node_tree for m in (chat_m, store_m)]]:
    act = ad.action if ad else None
    if not act: continue
    fcs = list(getattr(act, 'fcurves', []))
    for layer in getattr(act, 'layers', []):
        for s_ in layer.strips:
            for cb in s_.channelbags: fcs += list(cb.fcurves)
    for fc in fcs:
        const = any(k in fc.data_path for k in ('frame_offset', 'energy', 'default_value'))
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
