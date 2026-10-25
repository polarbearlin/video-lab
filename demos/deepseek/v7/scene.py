# 《大肥鱼 · 自我介绍》v7（90 秒）· 8 张关键帧（Blender 4.2+ / 5.x，EEVEE）
# 先跑 v5/ui.py、v6/ui.py、v7/ui.py（会用到前两版的界面图），渲完再跑 v7/overlay.py 叠章节标题和导航
# blender -b --factory-startup -P demos/deepseek/v7/scene.py -- [--scale 50] [--samples 32] [--frames 1,2,…]
# 第 k 帧 = 第 k 张关键帧。每张是一个独立"片场"（沿 x 轴每隔 20 米一个），镜头逐帧切过去。
import bpy, math, os, sys, argparse, random
from mathutils import Vector, Quaternion, Euler, Matrix

HERE = os.path.dirname(os.path.abspath(__file__)); DS = os.path.dirname(HERE); REPO = os.path.abspath(os.path.join(DS, '../..'))
ap = argparse.ArgumentParser()
ap.add_argument('--model', default=os.path.join(REPO, 'assets/models/dafeiyu_chibi/dafeiyu_chibi.glb'))
ap.add_argument('--out', default=os.path.join(DS, 'build/v7keys'))
ap.add_argument('--frames', default='1,2,3,4,5,6,7,8')
ap.add_argument('--scale', type=int, default=50); ap.add_argument('--samples', type=int, default=32)
A = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
UI6, UI5, UI7 = os.path.join(DS, 'build/v6ui'), os.path.join(DS, 'build/v5ui'), os.path.join(DS, 'build/v7ui')
FONT = os.path.join(REPO, 'assets/fonts/NotoSansSC.ttf')
CH = 0.42; CEN = CH * .5; R = math.radians
def lin(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in c)

# ======================================================================= 基础
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
    try: sc.render.engine = eng; break
    except TypeError: pass
sc.render.resolution_x, sc.render.resolution_y = 1920, 1080; sc.render.resolution_percentage = A.scale
ee = sc.eevee; ee.taa_render_samples = A.samples
for k, v in (('use_raytracing', True), ('use_shadows', True), ('use_gtao', True)):
    if hasattr(ee, k): setattr(ee, k, v)
sc.view_settings.view_transform = 'AgX'
try: sc.view_settings.look = 'AgX - Medium High Contrast'
except Exception: pass

def mat_img(name, path, emit=1.0, coat=.5):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(path); tex.interpolation = 'Cubic'
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = emit
    bs = nt.nodes.new('ShaderNodeBsdfPrincipled'); bs.inputs['Base Color'].default_value = (0, 0, 0, 1); bs.inputs['Roughness'].default_value = .5
    for k, v in (('Coat Weight', coat), ('Coat Roughness', .08)):
        if k in bs.inputs: bs.inputs[k].default_value = v
    add = nt.nodes.new('ShaderNodeAddShader')
    nt.links.new(tex.outputs['Color'], em.inputs['Color']); nt.links.new(em.outputs[0], add.inputs[0]); nt.links.new(bs.outputs[0], add.inputs[1]); nt.links.new(add.outputs[0], out.inputs['Surface'])
    return m
def mat_col(name, hexc, rough=.4, metal=0., emit=0., emit_hex=None):
    m = bpy.data.materials.new(name); m.use_nodes = True; bs = m.node_tree.nodes['Principled BSDF']
    bs.inputs['Base Color'].default_value = (*lin(hexc), 1); bs.inputs['Roughness'].default_value = rough; bs.inputs['Metallic'].default_value = metal
    if emit: bs.inputs['Emission Color'].default_value = (*lin(emit_hex or hexc), 1); bs.inputs['Emission Strength'].default_value = emit
    return m
def box(name, size, loc, mat, bevel=.01, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1); o = bpy.context.object; o.name = name; o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True); o.data.materials.append(mat)
    if bevel: b = o.modifiers.new('bev', 'BEVEL'); b.width = bevel; b.segments = 3
    o.location = loc; o.rotation_euler = rot; return o
def slab(name, w, h, loc, mat, depth=.03, body=None, rot=(0, 0, 0), upright=False):
    """一块带厚度的卡片：正面贴图。upright=True 立起来，正面朝 -Y"""
    bpy.ops.mesh.primitive_plane_add(size=1); o = bpy.context.object; o.name = name; o.scale = (w, h, 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(mat); o.data.materials.append(body or mat_col(name + '_b', '#d8dcea', .4))
    s = o.modifiers.new('t', 'SOLIDIFY'); s.thickness = depth; s.offset = -1; s.material_offset = 1
    b = o.modifiers.new('bev', 'BEVEL'); b.width = min(.012, depth * .4); b.segments = 2
    o.rotation_euler = (R(90), 0, 0) if upright else rot; o.location = loc; return o
BEZEL = mat_col('bezel', '#0a0a0c', .18, metal=.6)
def device(name, w, h, loc, img, emit=.95, border=.05):
    """真实设备：黑色圆角机身 + 屏幕（自发光 + 玻璃清漆）。返回把屏幕上的 (u,v)（左上角为 0,0）换算成世界坐标的函数"""
    loc = Vector(loc)
    box(name + '_body', (w + 2 * border, h + 2 * border, .036), loc + Vector((0, 0, -.016)), BEZEL, bevel=.07)
    bpy.ops.mesh.primitive_plane_add(size=1); o = bpy.context.object; o.name = name; o.scale = (w, h, 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True); o.data.materials.append(mat_img(name + '_m', img, emit)); o.location = loc + Vector((0, 0, .0025))
    return lambda u, v, z=0.: loc + Vector(((u - .5) * w, (.5 - v) * h, .003 + z))

def text3d(name, s, loc, size, hexc, emit=4., depth=.02, rot=(R(80), 0, 0)):
    cu = bpy.data.curves.new(name, 'FONT'); cu.body = s; cu.font = bpy.data.fonts.load(FONT); cu.size = size; cu.extrude = depth; cu.bevel_depth = depth * .3
    cu.align_x = 'CENTER'; cu.align_y = 'CENTER'
    o = bpy.data.objects.new(name, cu); sc.collection.objects.link(o); o.data.materials.append(mat_col(name + '_m', hexc, .3, emit=emit))
    o.location = loc; o.rotation_euler = rot; return o

# 世界、桌面、远处彩色光斑
w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True
BG = w.node_tree.nodes['Background']; BG.inputs['Strength'].default_value = .6
def mat_desk():
    m = bpy.data.materials.new('desk'); m.use_nodes = True; nt = m.node_tree; bs = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1, 6, 1)
    wv = nt.nodes.new('ShaderNodeTexWave'); wv.inputs['Scale'].default_value = 1.2; wv.inputs['Distortion'].default_value = 6; wv.inputs['Detail'].default_value = 4
    cr = nt.nodes.new('ShaderNodeValToRGB'); cr.color_ramp.elements[0].color = (*lin('#140d0b'), 1); cr.color_ramp.elements[1].color = (*lin('#33241c'), 1)
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector']); nt.links.new(mp.outputs[0], wv.inputs['Vector']); nt.links.new(wv.outputs['Color'], cr.inputs[0])
    nt.links.new(cr.outputs[0], bs.inputs['Base Color']); bs.inputs['Roughness'].default_value = .38
    return m
bpy.ops.mesh.primitive_plane_add(size=1, location=(80, 0, -.034)); d_ = bpy.context.object; d_.scale = (220, 60, 1); d_.data.materials.append(mat_desk())
random.seed(7)
for i in range(150):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=random.uniform(.03, .14), location=(random.uniform(-8, 170), random.uniform(3.5, 12), random.uniform(.9, 3.2)), segments=12, ring_count=6)
    bpy.context.object.data.materials.append(mat_col(f'dot{i}', '#000000', emit=random.uniform(2, 7), emit_hex=random.choice(['#ffb35c', '#ffcf7a', '#ff6fa8', '#b07bff', '#5fd8ff', '#fff1d6'])))

# 角色：导入一次，每个片场放一个共享网格的复制体
bpy.ops.import_scene.gltf(filepath=A.model)
SRC = [o for o in bpy.context.selected_objects if o.type == 'MESH']
for o in SRC: o.scale = (CH, CH, CH)
def fish(center, q, sx=1., sz=1.):
    """在身体中心 center 放一个她，朝向四元数 q，压扁拉长 sx/sz"""
    e = bpy.data.objects.new('DFY', None); sc.collection.objects.link(e); e.rotation_mode = 'QUATERNION'
    for o in SRC:
        c = o.copy(); sc.collection.objects.link(c); c.parent = e; c.hide_render = False; c.location = (0, 0, 0)
    e.location = Vector(center) + q @ Vector((0, 0, -CEN * sz)); e.rotation_quaternion = q; e.scale = (sx, sx, sz); return e
for o in SRC: o.hide_render = True; o.location.z = -50
def yawq(d): return Quaternion((0, 0, 1), R(d))

# 镜头、灯（逐帧切机位，灯跟着片场走）
cd = bpy.data.cameras.new('CAM'); cam = bpy.data.objects.new('CAM', cd); sc.collection.objects.link(cam); sc.camera = cam
cd.sensor_fit = 'VERTICAL'; cd.sensor_height = 24; cd.clip_start = .02; cd.dof.use_dof = True; cd.dof.aperture_fstop = 2.2; cam.rotation_mode = 'QUATERNION'
def spot(name, e, hexc):
    ld = bpy.data.lights.new(name, 'SPOT'); ld.energy = e; ld.spot_size = R(55); ld.spot_blend = .7; ld.shadow_soft_size = .04; ld.color = lin(hexc)
    o = bpy.data.objects.new(name, ld); sc.collection.objects.link(o); return o
KEY, RIM = spot('key', 260, '#ffd9b8'), spot('rim', 220, '#c58bff')
SHOTS = {}
def shot(k, loc, look, fov, focus, roll=0., warm=0.):
    SHOTS[k] = (Vector(loc), Vector(look), fov, Vector(focus), roll, warm)
def apply_shot(k):
    loc, look, fov, focus, roll, warm = SHOTS[k]
    cam.location = loc; cam.rotation_quaternion = (look - loc).to_track_quat('-Z', 'Y') @ Quaternion((0, 0, 1), R(roll))
    cd.lens = cd.sensor_height / (2 * math.tan(R(fov) / 2)); cd.dof.focus_distance = (loc - focus).length
    p = Vector((focus.x, focus.y, 0))
    for o, off in ((KEY, (.8, -1.2, 1.5)), (RIM, (-.7, 1.0, 1.0))):
        o.location = p + Vector(off); o.rotation_euler = (focus - o.location).to_track_quat('-Z', 'Y').to_euler()
    KEY.data.color = tuple(a + (b - a) * warm for a, b in zip(lin('#ffd9b8'), lin('#ffb27a')))
    RIM.data.color = tuple(a + (b - a) * warm for a, b in zip(lin('#c58bff'), lin('#ff8fb0')))
    BG.inputs['Color'].default_value = (*[a + (b - a) * warm for a, b in zip(lin('#140d1e'), lin('#2a1622'))], 1)

TAB = (2.6, 2.6 * 1600 / 2400)
X = lambda k: Vector(((k - 1) * 20, 0, 0))

PH = (1.35, 1.35 * 1536 / 1024)
def ring(name, center, r, thick, hexc, emit=6.):
    bpy.ops.mesh.primitive_torus_add(major_radius=r, minor_radius=thick, location=center, major_segments=64, minor_segments=8)
    o = bpy.context.object; o.name = name; o.scale.z = .25; o.data.materials.append(mat_col(name + '_m', hexc, .3, emit=emit)); return o
STK = (.39, .39 * 1.18)   # 贴纸纸片尺寸

# ======================================================================= 1 · 0:04 聊天里的平面贴纸被揭起来，立成一张纸片
S = device('chat1', *TAB, X(1), os.path.join(UI7, 'chat_open2.png'))
slot = S(.42, .464)
hinge = slot + Vector((0, -STK[1] / 2, 0))
st = slab('sticker1', *STK, Vector((0, 0, 0)), mat_img('stk_m', os.path.join(UI7, 'sticker_card.png'), 1.0, coat=.2), depth=.006, body=mat_col('paper', '#f4f1ea', .6))
for v in st.data.vertices: v.co.y += STK[1] / 2          # 原点挪到底边，绕底边翻起来
st.location = hinge + Vector((0, 0, .004)); st.rotation_euler = (R(62), 0, R(-8))
shot(1, slot + Vector((.55, -1.25, .6)), slot + Vector((-.05, .1, .12)), 40, slot + Vector((0, -.1, .15)), roll=-4)

# ======================================================================= 2 · 0:07 转一圈变立体，蹬一下跳出屏幕，屏幕荡开波纹
S = device('chat2', *TAB, X(2), os.path.join(UI7, 'chat_open2.png'))
slot = S(.42, .464)
for i, (r, e) in enumerate(((.18, 8), (.34, 5), (.52, 2.5))): ring(f'rip{i}', slot + Vector((0, 0, .004)), r, .008, '#8fa6ff', e)
c2 = slot + Vector((.02, -.04, .55))
fish(c2, Quaternion((0, 1, 0), R(-10)) @ yawq(-95), .86, 1.2)
for i in range(14):   # 撒出来的纸屑（贴纸的碎片）
    a = i / 14 * math.tau
    box(f'conf{i}', (.03, .02, .002), slot + Vector((math.cos(a) * (.2 + .05 * (i % 3)), math.sin(a) * .18, .12 + .1 * (i % 4))), mat_col(f'cf{i}', random.choice(['#ffffff', '#8fa6ff', '#fb7299', '#ffd36b']), .5, emit=1.5), bevel=0, rot=(i, i * .7, i * 1.3))
shot(2, slot + Vector((.35, -1.55, .5)), slot + Vector((0, .05, .36)), 44, c2)

# ======================================================================= 3 · 0:13 第 1 步 · 我是谁：站在鲸鱼 logo 上，网友："这不就是条大肥鱼吗？"
S = device('logo', *TAB, X(3), os.path.join(UI7, 'logo.png'))
lg = S(.5, .47)
fish(lg + Vector((0, 0, CEN)), yawq(-100), 1., 1.)
slab('cfish', .72, .72 * 400 / 1520, lg + Vector((-.62, .1, .42)), mat_img('cfish_m', os.path.join(UI7, 'c_fish.png'), 1.0), depth=.02, upright=True)
bpy.context.object.rotation_euler = (R(90), 0, R(18))
slab('plate', .55, .55 * 400 / 1200, lg + Vector((.55, .08, .52)), mat_img('plate_m', os.path.join(UI7, 'nameplate.png'), 1.2), depth=.03, upright=True, body=mat_col('plate_b', '#4d6bfe', .3, emit=1))
bpy.context.object.rotation_euler = (R(90), 0, R(-16))
shot(3, lg + Vector((.1, -1.75, .7)), lg + Vector((0, .05, .3)), 42, lg + Vector((0, 0, .22)))

# ======================================================================= 4 · 0:30 第 2 步 · 我火过：英伟达暴跌的绿柱变成滑梯
S = device('stock', *TAB, X(4), os.path.join(UI6, 'stock.png'))
u, v0, v1 = [float(x) for x in open(os.path.join(UI6, 'stock_slide.txt')).read().split()]
top, bot = S(u, v0, .75), S(u, v1 + .05, .02)
mid = (top + bot) / 2; dv = top - bot; L = dv.length; ang = math.atan2(dv.z, math.hypot(dv.x, dv.y))
box('slide', (.13, L, .03), mid, mat_col('slide_m', '#1fc77e', .25, emit=3.5), bevel=.01, rot=(ang, 0, 0))
down = (bot - top).normalized(); nrm = Vector((1, 0, 0)).cross(down).normalized()
if nrm.z < 0: nrm = -nrm
pos = bot.lerp(top, .45) + nrm * .12; up_s = -down
fish(pos, Matrix((nrm, up_s.cross(nrm), up_s)).transposed().to_quaternion() @ Quaternion((0, 0, 1), R(-20)), 1.0, 1.08)
shot(4, pos + Vector((.75, -.95, .45)), pos + Vector((-.22, .15, .05)), 44, pos, roll=12)

# ======================================================================= 5 · 0:38 章末转场：她头朝下扎进屏幕，屏幕上开一个发光的洞
S = device('dive', *PH, X(5), os.path.join(UI6, '../v5ui/scr_comments.png') if False else os.path.join(DS, 'ref/screens/appstore.png'))
hole = S(.5, .55)
bpy.ops.mesh.primitive_cylinder_add(radius=.28, depth=.002, location=hole + Vector((0, 0, .001)), vertices=64); hd = bpy.context.object
hd.data.materials.append(mat_col('hole_m', '#000000', 1.0))
ring('hole_rim', hole + Vector((0, 0, .004)), .29, .012, '#ff6fa8', 7); ring('hole_rim2', hole + Vector((0, 0, .004)), .36, .005, '#8fa6ff', 3)
fish(hole + Vector((0, 0, .02)), Quaternion((0, 1, 0), R(180)) @ Quaternion((0, 0, 1), R(-60)), .92, 1.12)   # 头朝下，下半身已经进洞
shot(5, hole + Vector((.3, -1.15, 1.0)), hole + Vector((0, 0, .1)), 40, hole + Vector((0, 0, .15)), roll=-8)

# ======================================================================= 6 · 0:47 第 3 步 · 我在 B站：深度思考框露馅，她蹦起来去捂
S = device('bili', *PH, X(6), os.path.join(UI5, 'scr_comments.png'))
me6 = S(.55, .72)
fish(me6 + Vector((0, 0, CEN * 1.15 + .15)), Quaternion((0, 1, 0), R(-22)) @ yawq(-125), .9, 1.15)
slab('think6', .82, .82 * 1024 / 1536, me6 + Vector((-.32, .12, .62)), mat_img('think6_m', os.path.join(UI5, 'scr_think33.png'), 1.1), depth=.012, upright=True,
     body=mat_col('think_b', '#4d6bfe', .3, emit=1.5))
slab('q6', .62, .62 * 400 / 1520, me6 + Vector((.25, .36, .025)), mat_img('q6_m', os.path.join(UI5, 'scr_q.png'), 1.0), depth=.02)
shot(6, me6 + Vector((.12, -1.4, .62)), me6 + Vector((-.12, 0, .45)), 40, me6 + Vector((-.1, 0, .3)))

# ======================================================================= 7 · 1:00 第 4 步 · 我每天：凌晨 2:13，主人"睡不着"，她"本鲸陪你"
S = device('lock', *PH, X(7), os.path.join(UI7, 'lock_night.png'), emit=.85)
me7 = S(.74, .8)
fish(me7 + Vector((0, 0, CEN * .9)), yawq(-115) @ Quaternion((0, 1, 0), R(-6)), 1.06, .9)   # 坐在自己那条通知旁边
shot(7, me7 + Vector((-.1, -1.25, .85)), me7 + Vector((-.3, .42, .1)), 42, me7 + Vector((0, 0, .2)), warm=1.)

# ======================================================================= 8 · 1:14 第 5 步 · 这条片子怎么做的：桌面上跳到 Blender 图标，统计卡
DT = (2.6, 2.6 * 1600 / 2560)
S = device('desk', *DT, X(8), os.path.join(UI7, 'desktop.png'), emit=.85)
ic = S(.422, .919)
fish(ic + Vector((0, 0, CEN * .82 + .03)), yawq(-80), 1.12, .82)   # 一屁股砸在 Blender 图标上
box('icon3d', (.12, .12, .03), ic + Vector((0, 0, .015)), mat_col('icon_m', '#ff9a3c', .3, emit=1.5), bevel=.02)
slab('stats', .9, .9 * 700 / 1600, ic + Vector((.62, .05, .36)), mat_img('stats_m', os.path.join(UI7, 'stats.png'), 1.05), depth=.03, upright=True)
bpy.context.object.rotation_euler = (R(90), 0, R(-18))
shot(8, ic + Vector((.15, -1.45, .62)), ic + Vector((.3, .25, .2)), 44, ic + Vector((.3, 0, .25)), warm=.3)

# ======================================================================= 渲染
os.makedirs(A.out, exist_ok=True)
import time
for k in [int(x) for x in A.frames.split(',')]:
    t0 = time.time(); apply_shot(k); sc.render.filepath = os.path.join(A.out, f'key{k}.png'); bpy.ops.render.render(write_still=True)
    print(f'KEY {k} {time.time() - t0:.1f}s')
