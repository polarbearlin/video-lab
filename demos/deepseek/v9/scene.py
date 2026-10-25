# 《大肥鱼 · 自我介绍》v9 · 暗转亮（发布会舞台）· 8 张关键帧（Blender 4.2+ / 5.x，EEVEE）
# 先跑 v5/v6/v7/v8/v9 的 ui.py。  blender -b --factory-startup -P demos/deepseek/v9/scene.py -- [--scale 50] [--samples 32] [--frames 1,2,…]
# 1–2 张在暗色房间（聊天、钻进传送门），3–8 张在明亮的发布会舞台。每张一个独立片场，沿 x 轴每 20 米一个。
import bpy, math, os, sys, re, argparse, random
from mathutils import Vector, Quaternion, Matrix

HERE = os.path.dirname(os.path.abspath(__file__)); DS = os.path.dirname(HERE); REPO = os.path.abspath(os.path.join(DS, '../..'))
ap = argparse.ArgumentParser()
ap.add_argument('--model', default=os.path.join(REPO, 'assets/models/dafeiyu_chibi/dafeiyu_chibi.glb'))
ap.add_argument('--out', default=os.path.join(DS, 'build/v9keys'))
ap.add_argument('--frames', default='1,2,3,4,5,6,7,8')
ap.add_argument('--scale', type=int, default=50); ap.add_argument('--samples', type=int, default=32)
A = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
UI = {k: os.path.join(DS, f'build/v{k}ui') for k in (5, 6, 7, 8, 9)}
FONT = os.path.join(REPO, 'assets/fonts/NotoSansSC.ttf')
CH = 0.42; CEN = CH * .5; R = math.radians; V = lambda *p: Vector(p if len(p) == 3 else p[0])
def lin(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in c)

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

# ======================================================================= 材质 / 物件
def mat_img(name, path, emit=1.0, coat=.25, alpha=False, spec=.5):
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
    return m
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
def card(name, w, h, loc, mat, depth=.0, rot=(0, 0, 0), body=None):
    """一张卡片（立着时 rot=(90°,0,朝向)）。depth>0 时有厚度"""
    bpy.ops.mesh.primitive_plane_add(size=1); o = bpy.context.object; o.name = name; o.scale = (w, h, 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True); o.data.materials.append(mat)
    if depth:
        o.data.materials.append(body or mat_col(name + '_b', '#d8dcea', .4))
        s_ = o.modifiers.new('t', 'SOLIDIFY'); s_.thickness = depth; s_.offset = -1; s_.material_offset = 1
        b_ = o.modifiers.new('bev', 'BEVEL'); b_.width = min(.012, depth * .4); b_.segments = 2
    o.location = loc; o.rotation_euler = rot; return o
def bubble(name, h, loc, yaw=0.):
    """对话气泡：立在空中、朝向镜头（透明底贴图）"""
    path = os.path.join(UI[9], name + '.png'); img = bpy.data.images.load(path); w = h * img.size[0] / img.size[1]
    return card(name, w, h, loc, mat_img(name + '_m', path, 1.0, coat=0, alpha=True), rot=(R(90), 0, R(yaw)))
BEZEL_D = mat_col('bezel_d', '#0a0a0c', .18, metal=.6)
BEZEL_L = mat_col('bezel_l', '#c9ccd3', .22, metal=.85)
def device(name, w, h, loc, img, emit=.95, light=False, border=.05):
    """设备：机身（暗场黑色 / 亮场银色）+ 屏幕。返回 (u,v)→世界坐标 的函数"""
    loc = V(loc)
    box(name + '_body', (w + 2 * border, h + 2 * border, .036), loc + V(0, 0, -.016), BEZEL_L if light else BEZEL_D, bevel=.07)
    card(name, w, h, loc + V(0, 0, .0025), mat_img(name + '_m', img, emit, coat=0 if light else .25, spec=0 if light else .5))
    return lambda u, v, z=0.: loc + V((u - .5) * w, (.5 - v) * h, .003 + z)
def ring(name, center, r, thick, hexc, emit=6., rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=r, minor_radius=thick, location=center, rotation=rot, major_segments=72, minor_segments=10)
    o = bpy.context.object; o.name = name; o.data.materials.append(mat_col(name + '_m', hexc, .3, emit=emit)); return o
def portal_disc(name, center, r, rot=(0, 0, 0)):
    """传送门里面：中心白、边缘蓝的发光圆盘"""
    bpy.ops.mesh.primitive_circle_add(radius=r, fill_type='NGON', location=center, rotation=rot, vertices=64); o = bpy.context.object; o.name = name
    m = bpy.data.materials.new(name + '_m'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); tc = nt.nodes.new('ShaderNodeTexCoord'); gr = nt.nodes.new('ShaderNodeTexGradient'); gr.gradient_type = 'SPHERICAL'
    mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1 / r, 1 / r, 1 / r)
    cr = nt.nodes.new('ShaderNodeValToRGB'); cr.color_ramp.elements[0].color = (*lin('#3a63ff'), 1); cr.color_ramp.elements[1].color = (1, 1, 1, 1); cr.color_ramp.elements[1].position = .7
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 2.2
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector']); nt.links.new(mp.outputs[0], gr.inputs['Vector']); nt.links.new(gr.outputs['Fac'], cr.inputs[0]); nt.links.new(cr.outputs[0], em.inputs['Color']); nt.links.new(em.outputs[0], out.inputs['Surface'])
    o.data.materials.append(m); return o
def text3d(name, s, loc, size, hexc, rot=(R(90), 0, 0), depth=.06, emit=.3, bevel=True):
    cu = bpy.data.curves.new(name, 'FONT'); cu.body = s; cu.font = bpy.data.fonts.load(FONT); cu.size = size; cu.extrude = depth; cu.bevel_depth = depth * .25 if bevel else 0; cu.bevel_resolution = 3
    cu.align_x = 'CENTER'; cu.align_y = 'BOTTOM'
    o = bpy.data.objects.new(name, cu); sc.collection.objects.link(o); o.data.materials.append(mat_col(name + '_m', hexc, .25, emit=emit, coat=.8))
    o.location = loc; o.rotation_euler = rot; return o
def whale3d(name, loc, height, yaw=0.):
    """立体鲸鱼 logo：把 whale.svg 的路径挤出来"""
    d = re.search(r' d="([^"]+)"', open(os.path.join(DS, 'whale.svg')).read()).group(1)
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '2D'; cu.fill_mode = 'BOTH'; cu.extrude = 2.2; cu.bevel_depth = .5; cu.bevel_resolution = 4
    cur = None; last = None
    toks = re.findall(r'([MLCZmlcz])([^MLCZmlcz]*)', d)
    for cmd, args in toks:
        n = [float(x) for x in re.findall(r'-?\d*\.?\d+(?:e-?\d+)?', args)]
        if cmd == 'M':
            if cur and len(cur) > 1: closes.append(cur)
            cur = [[(n[0], -n[1]), None, None]]
            for i in range(2, len(n), 2): cur.append([(n[i], -n[i + 1]), None, None])
        elif cmd == 'L':
            for i in range(0, len(n), 2): cur.append([(n[i], -n[i + 1]), None, None])
        elif cmd == 'C':
            for i in range(0, len(n), 6): cur[-1][2] = (n[i], -n[i + 1]); cur.append([(n[i + 4], -n[i + 5]), (n[i + 2], -n[i + 3]), None])
        elif cmd in 'Zz' and cur:
            closes.append(cur); cur = None
    if cur and len(cur) > 1: closes.append(cur)
    for c in closes:
        if len(c) > 1 and math.dist(c[0][0], c[-1][0]) < 1e-3: c[0][1] = c[-1][1]; c.pop()
        sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(c) - 1); sp.use_cyclic_u = True
        for k, (co, hi, ho) in enumerate(c):
            bp = sp.bezier_points[k]; bp.co = (*co, 0); bp.handle_left = (*(hi or co), 0); bp.handle_right = (*(ho or co), 0)
            bp.handle_left_type = bp.handle_right_type = 'FREE' if (hi or ho) else 'VECTOR'
    o = bpy.data.objects.new(name, cu); sc.collection.objects.link(o)
    o.data.materials.append(mat_col(name + '_m', '#4d6bfe', .2, coat=1., emit=.25))
    bpy.context.view_layer.objects.active = o; o.select_set(True); bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY'); o.select_set(False)
    s_ = height / 42; o.scale = (s_, s_, s_); o.rotation_euler = (R(90), 0, R(yaw)); o.location = V(loc) + V(0, 0, height / 2); return o
closes = []

# ======================================================================= 世界：暗色房间（1–2）+ 明亮发布会舞台（3–8）
w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True; BG = w.node_tree.nodes['Background']
def mat_desk():
    m = bpy.data.materials.new('desk'); m.use_nodes = True; nt = m.node_tree; bs = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (.15, 1.2, 1)
    wv = nt.nodes.new('ShaderNodeTexWave'); wv.inputs['Scale'].default_value = .5; wv.inputs['Distortion'].default_value = 2.5; wv.inputs['Detail'].default_value = 3
    cr = nt.nodes.new('ShaderNodeValToRGB'); cr.color_ramp.elements[0].color = (*lin('#2a1a12'), 1); cr.color_ramp.elements[1].color = (*lin('#5a3c28'), 1)
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector']); nt.links.new(mp.outputs[0], wv.inputs['Vector']); nt.links.new(wv.outputs['Color'], cr.inputs[0])
    nt.links.new(cr.outputs[0], bs.inputs['Base Color']); bs.inputs['Roughness'].default_value = .4; return m
bpy.ops.mesh.primitive_plane_add(size=1, location=(10, 0, -.034)); bpy.context.object.scale = (60, 30, 1); bpy.context.object.data.materials.append(mat_desk())
random.seed(7)
for i in range(60):   # 暗色房间里的彩色光斑（只放在前两个片场后面）
    bpy.ops.mesh.primitive_uv_sphere_add(radius=random.uniform(.03, .12), location=(random.uniform(-5, 26), random.uniform(3.5, 9), random.uniform(.9, 3)), segments=12, ring_count=6)
    bpy.context.object.data.materials.append(mat_col(f'dot{i}', '#000000', emit=random.uniform(2, 6), emit_hex=random.choice(['#ffb35c', '#ff6fa8', '#b07bff', '#5fd8ff'])))
STAGE = mat_col('stage', '#e9eaee', .32, coat=.3)
def stage(x):
    """发布会舞台：浅灰地面 + 弧形背景墙（无缝），盖住暗色桌面"""
    bpy.ops.mesh.primitive_plane_add(size=1, location=(x, 0, -.03)); f = bpy.context.object; f.scale = (19.5, 14, 1); f.data.materials.append(STAGE)
    bpy.ops.mesh.primitive_cylinder_add(radius=5, depth=19.5, vertices=96, location=(x, 2, 4.97), rotation=(0, R(90), 0)); cyl = bpy.context.object
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='DESELECT'); bpy.ops.object.mode_set(mode='OBJECT')
    for v in cyl.data.vertices: v.select = not (v.co.x > 0 and v.co.y > 0) if False else (cyl.matrix_world @ v.co).y < 2.05 or (cyl.matrix_world @ v.co).z > 5
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.delete(type='VERT'); bpy.ops.object.mode_set(mode='OBJECT')
    cyl.data.materials.append(STAGE)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(x, 7, 5)); wall = bpy.context.object; wall.scale = (19.5, 1, 10); wall.rotation_euler = (R(90), 0, 0); wall.data.materials.append(STAGE)
for k in range(3, 9): stage((k - 1) * 20)

# 角色：手办 PVC 质感，每个片场一个共享网格的复制体
bpy.ops.import_scene.gltf(filepath=A.model)
SRC = [o for o in bpy.context.selected_objects if o.type == 'MESH']
for o in SRC:
    o.scale = (CH, CH, CH)
    for m in o.data.materials:
        nt = m.node_tree; bs = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'); bs.inputs['Roughness'].default_value = .38
        for k, v in (('Coat Weight', .6), ('Coat Roughness', .12), ('Specular IOR Level', .6)):
            if k in bs.inputs: bs.inputs[k].default_value = v
        tex = next((n for n in nt.nodes if n.type == 'TEX_IMAGE'), None)
        if tex and bs.inputs['Base Color'].is_linked:
            hs = nt.nodes.new('ShaderNodeHueSaturation'); hs.inputs['Saturation'].default_value = 1.15; hs.inputs['Value'].default_value = 1.1
            nt.links.new(tex.outputs['Color'], hs.inputs['Color']); nt.links.new(hs.outputs[0], bs.inputs['Base Color'])
HER = bpy.data.collections.new('HER'); sc.collection.children.link(HER)
def fish(center, q, sx=1., sz=1.):
    e = bpy.data.objects.new('DFY', None); sc.collection.objects.link(e); e.rotation_mode = 'QUATERNION'
    for o in SRC:
        c = o.copy(); HER.objects.link(c); c.parent = e; c.hide_render = False; c.location = (0, 0, 0)
    e.location = V(center) + q @ V(0, 0, -CEN * sz); e.rotation_quaternion = q; e.scale = (sx, sx, sz); return e
for o in SRC: o.hide_render = True; o.location.z = -50
def yawq(d): return Quaternion((0, 0, 1), R(d))

# 镜头 + 灯：她有自己的主光 / 轮廓光（灯光链接只照她）；亮场再加一盏大柔光箱照整个舞台
cd = bpy.data.cameras.new('CAM'); cam = bpy.data.objects.new('CAM', cd); sc.collection.objects.link(cam); sc.camera = cam
cd.sensor_fit = 'VERTICAL'; cd.sensor_height = 24; cd.clip_start = .02; cd.dof.use_dof = True; cd.dof.aperture_fstop = 3.2; cam.rotation_mode = 'QUATERNION'
def light(name, kind, e, hexc, size=.1):
    ld = bpy.data.lights.new(name, kind); ld.energy = e; ld.color = lin(hexc)
    if kind == 'SPOT': ld.spot_size = R(24); ld.spot_blend = .8; ld.shadow_soft_size = .05
    if kind == 'AREA': ld.size = size
    o = bpy.data.objects.new(name, ld); sc.collection.objects.link(o); return o
KEY_L, RIM_L = light('key', 'SPOT', 220, '#fff0e0'), light('rim', 'SPOT', 260, '#b9c8ff')
for l_ in (KEY_L, RIM_L):
    try: l_.light_linking.receiver_collection = HER
    except Exception: pass
SOFT = light('softbox', 'AREA', 900, '#ffffff', 6.)   # 发布会顶光
SHOTS = {}
def shot(k, loc, look, fov, focus, roll=0., bright=True, fstop=3.2):
    SHOTS[k] = (V(loc), V(look), fov, V(focus), roll, bright, fstop)
def apply_shot(k):
    loc, look, fov, focus, roll, bright, fstop = SHOTS[k]
    cam.location = loc; cam.rotation_quaternion = (look - loc).to_track_quat('-Z', 'Y') @ Quaternion((0, 0, 1), R(roll))
    cd.lens = cd.sensor_height / (2 * math.tan(R(fov) / 2)); cd.dof.focus_distance = (loc - focus).length; cd.dof.aperture_fstop = fstop
    cdir = loc - focus; cdir.z = 0; cdir.normalize(); side = V(-cdir.y, cdir.x, 0)
    for o, off in ((KEY_L, cdir * 1.1 + side * .6 + V(0, 0, 1.4)), (RIM_L, -cdir * .9 - side * .4 + V(0, 0, .9))):
        o.location = focus + off; o.rotation_euler = (focus - o.location).to_track_quat('-Z', 'Y').to_euler()
    SOFT.location = V(focus.x, focus.y - .5, 4.5); SOFT.rotation_euler = (0, 0, 0); SOFT.data.energy = 900 if bright else 0
    BG.inputs['Color'].default_value = (*(lin('#dfe3ea') if bright else lin('#140d1e')), 1); BG.inputs['Strength'].default_value = 1.0 if bright else .6
X = lambda k: V((k - 1) * 20, 0, 0)
TAB = (2.6, 2.6 * 1024 / 1536); PH = (1.2, 1.2 * 1536 / 1024)

# ======================================================================= 1 · 0:02 暗：主人"大肥鱼，介绍下你自己？"→ 贴纸揭起来
S = device('chat1', *TAB, X(1), os.path.join(UI[7], 'chat_v9.png'))
slot = S(615 / 1536, 455 / 1024); SW, SH = 170 / 1536 * TAB[0], 215 / 1024 * TAB[1]
stk = card('sticker', SW, SH, V(0, 0, 0), mat_img('stk_m', os.path.join(UI[7], 'sticker.png'), 1.0, coat=.1, alpha=True))
for v in stk.data.vertices: v.co.y += SH / 2
stk.location = slot + V(0, -SH / 2, .004); stk.rotation_euler = (R(78), 0, R(-10))
shot(1, slot + V(.55, -1.05, 1.15), slot + V(.38, .25, .05), 42, slot + V(0, -.1, .15), bright=False)

# ======================================================================= 2 · 0:04 暗：变成立体的她，头朝下钻进屏幕上开的传送门
S = device('chat2', *TAB, X(2), os.path.join(UI[7], 'chat_v9.png'))
pc = S(.62, .55)
portal_disc('pd2', pc + V(0, 0, .002), .3); ring('pr2', pc + V(0, 0, .004), .31, .013, '#cfe0ff', 8)
pl = light('portal_light', 'POINT', 60, '#9fb8ff'); pl.location = pc + V(0, 0, .15)
fish(pc + V(0, .16, .36), Quaternion((1, 0, 0), R(32)) @ yawq(-90), .9, 1.15)   # 扑向传送门的一瞬间：脸朝镜头、身体前倾
for i in range(12):
    a = i / 12 * math.tau; box(f'spk2_{i}', (.015, .015, .015), pc + V(math.cos(a) * .4, math.sin(a) * .4, .05 + .12 * (i % 3)), mat_col(f'sk2{i}', '#ffffff', emit=8, emit_hex='#bcd0ff'), bevel=0)
shot(2, pc + V(.2, -1.25, .6), pc + V(0, .1, .25), 40, pc + V(0, .15, .32), roll=-6, bright=False)

# ======================================================================= 3 · 0:06 亮：从舞台上空的传送门飞出来，长抛物线飞向立体鲸鱼 logo
c3 = X(3)
portal_disc('pd3', c3 + V(-1.6, .6, 1.1), .42, rot=(R(90), 0, R(-35))); ring('pr3', c3 + V(-1.6, .6, 1.1), .43, .016, '#9fb8ff', 6, rot=(R(90), 0, R(-35)))
whale3d('whale3', c3 + V(1.3, 1.1, 0), 1.25, yaw=-15)
f3 = c3 + V(-.35, .2, 1.05)
fish(f3, Quaternion(V(0, 1, 0), R(28)) @ yawq(-55), .86, 1.22)   # 空中前倾、拉长
for i in range(9):   # 抛物线轨迹的光点
    u = i / 9; p = (c3 + V(-1.45, .55, 1.05)).lerp(f3, u) + V(0, 0, .12 * math.sin(u * math.pi))
    bpy.ops.mesh.primitive_uv_sphere_add(radius=.012 + .006 * u, location=p); bpy.context.object.data.materials.append(mat_col(f'tr3{i}', '#ffffff', emit=6, emit_hex='#9fb8ff'))
shot(3, f3 + V(.35, -1.25, .15), f3 + V(.25, .5, -.15), 46, f3, fstop=3.5)

# ======================================================================= 4 · 0:09 亮【我是谁】："本鲸，DeepSeek 家的 AI！" 网友："这不就是条大肥鱼吗？" 她一脚把评论卡踢飞
c4 = X(4)
S = device('logo4', 2.0, 2.0 * 1600 / 2400, c4, os.path.join(UI[7], 'logo.png'), light=True)
me4 = S(.68, .62)
fish(me4 + V(0, 0, CEN + .03), Quaternion(V(1, 0, 0), R(-14)) @ yawq(-115), 1.0, 1.04)   # 抬脚踢：身体后仰
card('c4a', 1.0, 1.0 * 400 / 1520, me4 + V(-.78, -.2, .4), mat_img('c4a_m', os.path.join(UI[9], 'c1.png'), 1.1), depth=.02, rot=(R(84), R(-14), R(-8)))   # 正对镜头的大评论卡，刚被踢飞
for i in range(6):   # 踢出去的速度线
    box(f'ln4_{i}', (.18 - .02 * i, .006, .006), me4 + V(-.12 - .04 * i, -.1 + .03 * i, .2 + .05 * (i % 3)), mat_col(f'ln4{i}', '#9fb8ff', emit=4), bevel=0, rot=(0, 0, R(160)))
bubble('b_whale', .26, me4 + V(.32, -.05, .66), yaw=-5)
shot(4, me4 + V(-.3, -1.75, .85), me4 + V(-.25, .1, .38), 42, me4 + V(-.2, -.1, .3))

# ======================================================================= 5 · 0:13 亮【我火过】：主人的消息气泡飞过来，她跳上去冲浪
c5 = X(5)
device('store5', *PH, c5 + V(1.4, .7, 0), os.path.join(UI[8], 'store_5.png'), light=True)
bub = card('ride5', .62, .62 * 370 / 860, c5 + V(-.14, .1, .525), mat_img('ride5_m', os.path.join(UI[9], 'b_fire_q.png'), 1.0, coat=.2, alpha=True), rot=(R(14), R(-8), R(15)))   # 消息气泡当冲浪板
box('ride5_base', (.66, .26, .05), c5 + V(-.2, .1, .49), mat_col('ride_b', '#f4f6fb', .25, coat=.6), bevel=.03, rot=(R(12), R(-8), R(15)))
fish(c5 + V(-.47, .06, .56 + CEN * .9), Quaternion(V(1, 0, 0), R(10)) @ Quaternion(V(0, 1, 0), R(-15)) @ yawq(-60), 1.05, .9)   # 压低重心冲浪
for i in range(7):
    box(f'ln5_{i}', (.25 - .02 * i, .006, .006), c5 + V(-.75 - .05 * i, .0 + .05 * i, .45 + .05 * (i % 3)), mat_col(f'ln5{i}', '#ffffff', emit=4), bevel=0, rot=(0, 0, R(15)))
bubble('b_fire_a', .2, c5 + V(-.15, .1, 1.02), yaw=-5)
shot(5, c5 + V(.05, -1.6, 1.35), c5 + V(.15, .3, .55), 44, c5 + V(-.2, .1, .7))

# ======================================================================= 6 · 0:17 亮：榜单把她顶到第 1，DeepSeek 图标从屏幕里立起来，彩带炸开
c6 = X(6)
S = device('store6', *PH, c6, os.path.join(UI[8], 'store_0.png'), light=True)
ic = S(180 / 1024, 304 / 1536)
box('icon6', (.17, .16, .1), ic + V(0, 0, .05), mat_col('icon6_b', '#ffffff', .2, coat=.8), bevel=.03)
card('icon6_top', .16, .148, ic + V(0, 0, .101), mat_img('icon6_m', os.path.join(UI[9], 'ds_icon.png'), 1.0, coat=.3))
fish(ic + V(0, 0, .1 + CEN * .88), yawq(-80), 1.1, .88)   # 踩在第 1 名的图标上，被顶得一压
random.seed(11)
for i in range(40):
    a = random.uniform(0, math.tau); r_ = random.uniform(.15, .7)
    box(f'conf{i}', (.03, .012, .002), ic + V(math.cos(a) * r_, math.sin(a) * r_ * .6, random.uniform(.15, .9)), mat_col(f'cf{i}', random.choice(['#ff6fa8', '#ffd36b', '#4d6bfe', '#5fd8ff', '#22c55e']), .4, emit=1.2), bevel=0, rot=(random.uniform(0, 3), random.uniform(0, 3), random.uniform(0, 3)))
shot(6, ic + V(.5, -1.15, .75), ic + V(.25, .05, .2), 42, ic + V(0, 0, .25))

# ======================================================================= 7 · 0:20 亮：巨大的"5890 亿美元"砸到台上，英伟达绿柱倒下变滑梯，她滑下去
c7 = X(7)
S = device('stock7', 2.6, 2.6 * 1600 / 2400, c7, os.path.join(UI[6], 'stock.png'), light=True)
text3d('num7', '5890 亿美元', c7 + V(-.3, 1.25, 0), 1.3, '#0b8f55', rot=(R(90), 0, R(-8)), depth=.18, emit=0, bevel=False)
bubble('num7s', .3, c7 + V(-.3, 1.2, 1.55), yaw=-8)   # 说明文字用贴图（可变字体挤出会糊）
u, v0, v1 = [float(x) for x in open(os.path.join(UI[6], 'stock_slide.txt')).read().split()]
top, bot = S(u, v0 - .05, .45), S(u, v1 + .05, .02); dv = top - bot; ang = math.atan2(dv.z, math.hypot(dv.x, dv.y))
box('slide7', (.13, dv.length, .03), (top + bot) / 2, mat_col('slide7_m', '#1fc77e', .25, emit=2.5, coat=.6), bevel=.01, rot=(ang, 0, 0))
down = (bot - top).normalized(); nrm = V(1, 0, 0).cross(down).normalized()
if nrm.z < 0: nrm = -nrm
p7 = bot.lerp(top, .5) + nrm * .12
fish(p7, Matrix((nrm, (-down).cross(nrm), -down)).transposed().to_quaternion() @ Quaternion((0, 0, 1), R(-25)), 1.0, 1.06)
for i in range(10):
    a = i / 10 * math.tau; box(f'dust7_{i}', (.03, .03, .03), c7 + V(-.35 + math.cos(a) * 1.3, 1.35 + math.sin(a) * .25, .03), mat_col(f'du7{i}', '#ffffff', .6), bevel=.01)
shot(7, c7 + V(.55, -2.3, 1.2), c7 + V(.45, .7, .6), 46, c7 + V(.4, .5, .3), fstop=8)

# ======================================================================= 8 · 0:27 亮：被"你好"淹没，顶着"服务器繁忙"弹窗当雨伞钻出来："人太多啦～"
c8 = X(8)
S = device('chat8', *TAB, c8, os.path.join(UI[5], 'scr_chat_b.png'), light=True)
pile = S(.55, .6)
bm = mat_img('bub_m', os.path.join(UI[6], 'bubble.png'), 1.1, coat=.2); bb = mat_col('bub_b', '#3550d8', .3)
random.seed(3)
for i in range(80):
    r_ = .65 * math.sqrt(random.random()); a = random.uniform(0, math.tau); h = .42 * (1 - (r_ / .65) ** 1.6) * random.uniform(.75, 1.05)
    card(f'bub{i}', .36, .155, pile + V(math.cos(a) * r_, math.sin(a) * r_, h), bm, depth=.03, body=bb, rot=(random.uniform(-.9, .9), random.uniform(-.9, .9), random.uniform(0, math.tau)))
fish(pile + V(.05, -.08, .38 + CEN * .8), yawq(-95) @ Quaternion(V(1, 0, 0), R(-6)), 1.0, .95)   # 从气泡堆里钻出来
card('umb8', .72, .72 * 440 / 1000, pile + V(.05, .02, .38 + CEN * 1.6 + .02), mat_img('umb8_m', os.path.join(UI[5], 'scr_busy.png'), 1.3), depth=.025,
     rot=(R(55), R(-6), R(4)), body=mat_col('umb8_b', '#ffb040', .4, emit=1.2))   # 顶在头上当雨伞
bubble('b_busy_q', .17, pile + V(-.75, .15, .95), yaw=8)
bubble('b_busy_a', .17, pile + V(.62, -.1, .75), yaw=-8)
shot(8, pile + V(.05, -2.0, 1.0), pile + V(0, .1, .55), 42, pile + V(.05, -.08, .5))

# ======================================================================= 渲染
os.makedirs(A.out, exist_ok=True)
import time
for k in [int(x) for x in A.frames.split(',')]:
    t0 = time.time(); apply_shot(k); sc.render.filepath = os.path.join(A.out, f'key{k}.png'); bpy.ops.render.render(write_still=True)
    print(f'KEY {k} {time.time() - t0:.1f}s')
