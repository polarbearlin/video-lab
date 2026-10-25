# 《请证明你不是机器人》v6 · 8 张关键帧（Blender 4.2+ / 5.x，EEVEE）
# 先跑 python3 demos/deepseek/v6/ui.py 和 python3 demos/deepseek/v5/ui.py（用到 v5 的真实界面图）
# blender -b --factory-startup -P demos/deepseek/v6/scene.py -- [--scale 50] [--samples 32] [--frames 1,2,…]
# 第 k 帧 = 第 k 张关键帧。每张是一个独立"片场"（沿 x 轴每隔 20 米一个），镜头逐帧切过去。
import bpy, math, os, sys, argparse, random
from mathutils import Vector, Quaternion, Euler, Matrix

HERE = os.path.dirname(os.path.abspath(__file__)); DS = os.path.dirname(HERE); REPO = os.path.abspath(os.path.join(DS, '../..'))
ap = argparse.ArgumentParser()
ap.add_argument('--model', default=os.path.join(REPO, 'assets/models/dafeiyu_chibi/dafeiyu_chibi.glb'))
ap.add_argument('--out', default=os.path.join(DS, 'build/v6keys'))
ap.add_argument('--frames', default='1,2,3,4,5,6,7,8')
ap.add_argument('--scale', type=int, default=50); ap.add_argument('--samples', type=int, default=32)
A = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
UI6, UI5 = os.path.join(DS, 'build/v6ui'), os.path.join(DS, 'build/v5ui')
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

# ======================================================================= 1 · 0.8s 勾选框被坐塌，把她弹飞
S = device('captcha', *TAB, X(1), os.path.join(UI6, 'captcha_on.png'), emit=.42)
cb = S(.315, .4375)
slab('check', .17, .17, cb + Vector((0, 0, .03)), mat_img('check_m', os.path.join(UI6, 'check.png'), 1.0), depth=.03, body=mat_col('check_b', '#16a34a', .3, emit=.8))
bpy.context.object.scale = (1.15, 1.15, .35)   # 被坐扁
c1 = cb + Vector((.18, -.08, .42))
fish(c1, Quaternion(Vector((1, .4, .2)).normalized(), R(-68)) @ yawq(-80), .84, 1.24)   # 被弹飞：身体拉长、往后翻
for i in range(5):   # 飞出去的轨迹残影（发光小点连成弧线）
    p = cb.lerp(c1, i / 5) + Vector((0, 0, .06 * math.sin(i / 5 * math.pi)))
    bpy.ops.mesh.primitive_uv_sphere_add(radius=.012 + .004 * i, location=p); bpy.context.object.data.materials.append(mat_col(f'tr{i}', '#ffffff', emit=6, emit_hex='#9fffc0'))
for i in range(10):   # 弹飞时溅起的小光点
    a = i / 10 * math.tau; box(f'spark{i}', (.015, .015, .015), cb + Vector((math.cos(a) * .2, math.sin(a) * .2, .06 + .05 * (i % 3))), mat_col(f'sp{i}', '#ffffff', emit=8, emit_hex='#9fffc0'), bevel=0)
shot(1, cb + Vector((.85, -1.3, .85)), cb + Vector((.12, .05, .22)), 40, c1 + Vector((0, 0, -.1)), roll=-6)

# ======================================================================= 2 · 5.0s 她就是拼图块，太胖，助跑撞进缺口被挤扁
S = device('puzzle', *TAB, X(2), os.path.join(UI6, 'puzzle.png'), emit=.45)
gap = S(.628, .449)
fish(gap + Vector((-.03, 0, CEN * 1.18)), yawq(-108) @ Quaternion((1, 0, 0), R(-10)), .62, 1.18)   # 挤成瘦高条，脸朝镜头
for i in range(6):   # 撞击的速度线
    box(f'line{i}', (.18 - .02 * i, .008, .008), gap + Vector((-.32 - .03 * i, -.12 + .05 * i, .15 + .04 * (i % 3))), mat_col(f'ln{i}', '#ffffff', emit=5), bevel=0)
shot(2, gap + Vector((-.55, -1.3, .8)), gap + Vector((-.1, .05, .18)), 40, gap + Vector((0, 0, .2)), roll=4)

# ======================================================================= 3 · 8.5s 英伟达暴跌的绿 K 线变成滑梯
S = device('stock', *TAB, X(3), os.path.join(UI6, 'stock.png'))
u, v0, v1 = [float(x) for x in open(os.path.join(UI6, 'stock_slide.txt')).read().split()]
top, bot = S(u, v0, .75), S(u, v1 + .05, .02)
mid = (top + bot) / 2; dv = top - bot; L = dv.length
ang = math.atan2(dv.z, math.hypot(dv.x, dv.y))
slide = box('slide', (.13, L, .03), mid, mat_col('slide_m', '#1fc77e', .25, emit=3.5), bevel=.01, rot=(ang, 0, 0))
down = (bot - top).normalized(); nrm = Vector((1, 0, 0)).cross(down).normalized()
if nrm.z < 0: nrm = -nrm
pos = bot.lerp(top, .45) + nrm * (.03 + .09)
up_s = -down; basis = Matrix((nrm, up_s.cross(nrm), up_s)).transposed()   # 仰面躺着、脚朝前滑下去（脸朝上，镜头看得到表情）
fish(pos, basis.to_quaternion() @ Quaternion((0, 0, 1), R(-20)), 1.0, 1.08)
text3d('loss', '单日蒸发约 6000 亿美元', pos + Vector((-.3, .5, .2)), .085, '#1fc77e', 3.5, rot=(R(72), 0, R(38)))
shot(3, pos + Vector((.75, -.95, .45)), pos + Vector((-.22, .15, .05)), 44, pos, roll=12)

# ======================================================================= 4 · 12.5s "你好"气泡雪崩，把她埋了，只露呆毛
S = device('chat', *TAB, X(4), os.path.join(UI5, 'scr_chat_b.png'))
c4 = S(.5, .62)
bm = mat_img('bubble_m', os.path.join(UI6, 'bubble.png'), 1.2, coat=.3); bb = mat_col('bubble_b', '#3550d8', .3)
random.seed(3)
for i in range(170):
    r = .7 * math.sqrt(random.random()); a = random.uniform(0, math.tau)
    h = .5 * (1 - (r / .7) ** 1.6) * random.uniform(.75, 1.05)
    slab(f'bub{i}', .28, .12, c4 + Vector((math.cos(a) * r, math.sin(a) * r, h)), bm, depth=.035, body=bb,
         rot=(random.uniform(-.9, .9), random.uniform(-.9, .9), random.uniform(0, math.tau)))
fish(c4 + Vector((0, 0, .42)), yawq(-80), 1., 1.)   # 只有头顶露出来
busy = slab('busy', .9, .9 * 440 / 1000, c4 + Vector((.35, .22, .52)), mat_img('busy_m', os.path.join(UI5, 'scr_busy.png'), 1.0), depth=.03,
            body=mat_col('busy_b', '#ffb040', .4, emit=1.5), rot=(R(-12), R(8), R(-6)))
shot(4, c4 + Vector((.55, -1.75, 1.45)), c4 + Vector((.05, .05, .3)), 40, c4 + Vector((0, 0, .45)))

# ======================================================================= 5 · 16s B站评论区满屏是她，"你是不是 AI？"砸下来把她压扁
PH = (1.35, 1.35 * 1536 / 1024)
S = device('bili', *PH, X(5), os.path.join(UI5, 'scr_comments.png'))
me5 = S(.62, .78)
fish(me5 + Vector((0, 0, CEN * .62)), yawq(-110) @ Quaternion((0, 1, 0), R(-10)), 1.32, .62)
slab('q5', .7, .7 * 400 / 1520, me5 + Vector((-.3, -.24, .05)), mat_img('q5_m', os.path.join(UI5, 'scr_q.png'), 1.0), depth=.03, rot=(R(-4), R(6), R(8)))
for i in range(8):
    a = i / 8 * math.tau; box(f'dust{i}', (.02, .02, .02), me5 + Vector((-.3 + math.cos(a) * .42, -.24 + math.sin(a) * .2, .04)), mat_col(f'du{i}', '#ffffff', emit=4), bevel=0)
shot(5, me5 + Vector((.35, -1.35, .85)), me5 + Vector((-.15, -.1, .08)), 42, me5 + Vector((-.1, -.1, .1)), roll=-5)

# ======================================================================= 6 · 19.5s 深度思考框把内心戏公开了，她蹦起来去捂
S = device('bili2', *PH, X(6), os.path.join(UI5, 'scr_comments.png'))
me6 = S(.55, .72)
fish(me6 + Vector((0, 0, CEN * 1.15 + .15)), Quaternion((0, 1, 0), R(-22)) @ yawq(-125), .9, 1.15)
slab('think6', .82, .82 * 1024 / 1536, me6 + Vector((-.32, .12, .62)), mat_img('think6_m', os.path.join(UI5, 'scr_think33.png'), 1.1), depth=.012, upright=True,
     body=mat_col('think_b', '#4d6bfe', .3, emit=1.5))
slab('reply6', .62, .62 * 400 / 1520, me6 + Vector((.12, .38, .025)), mat_img('reply6_m', os.path.join(UI5, 'scr_reply.png'), 1.0), depth=.02)
shot(6, me6 + Vector((.12, -1.4, .62)), me6 + Vector((-.12, 0, .45)), 40, me6 + Vector((-.1, 0, .3)))

# ======================================================================= 7 · 25.5s 主人："没关系，我知道你是谁。你是我的大肥鱼。"（暖光）
S = device('owner', *TAB, X(7), os.path.join(UI6, 'owner.png'))
me7 = S(.6, .6)
fish(me7 + Vector((0, 0, CEN * .9)), yawq(-35) @ Quaternion((0, 1, 0), R(-14)), 1.06, .9)   # 坐着，抬头看主人的话
shot(7, me7 + Vector((.75, -1.05, .5)), me7 + Vector((.12, .22, .22)), 38, me7 + Vector((0, 0, .2)), warm=1.)

# ======================================================================= 8 · 29s 她把勾选框推到镜头前："☐ 我也不是机器人"
S = device('end_tab', *TAB, X(8) + Vector((0, .6, 0)), os.path.join(UI6, 'owner.png'), emit=.8)
device('end_phone', *PH, X(8) + Vector((-2.3, .9, 0)), os.path.join(UI5, 'scr_comments.png'), emit=.8)
c8 = S(.5, .95)
card = slab('endcard', .7, .7 * 600 / 1600, c8 + Vector((.12, -.25, .135)), mat_img('end_m', os.path.join(UI6, 'endcard.png'), 1.1), depth=.04, upright=True)
card.rotation_euler = (R(90), 0, R(-14))
fish(c8 + Vector((-.42, -.16, CEN)), Quaternion((1, 0, 0), R(-14)) @ yawq(-55), 1.04, .95)   # 在卡片左后方，身体前倾往前推
shot(8, c8 + Vector((.1, -1.45, .45)), c8 + Vector((-.15, .1, .2)), 44, c8 + Vector((-.1, -.2, .2)), warm=.6)

# ======================================================================= 渲染
os.makedirs(A.out, exist_ok=True)
import time
for k in [int(x) for x in A.frames.split(',')]:
    t0 = time.time(); apply_shot(k); sc.render.filepath = os.path.join(A.out, f'key{k}.png'); bpy.ops.render.render(write_still=True)
    print(f'KEY {k} {time.time() - t0:.1f}s')
