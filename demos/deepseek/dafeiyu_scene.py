# 《大肥鱼》30 秒 · 8 张关键帧（Blender 5，EEVEE 卡通渲染）
# 角色工程来自 github.com/azwosile/DeepSeek-whale-girl-3D（CC BY-NC-SA 4.0），用它的 FISH2_toon_t002.blend 当底，往里搭界面舞台。
# 用法：blender -b <FISH2_toon_t002.blend> -P demos/deepseek/dafeiyu_scene.py -- [--preview] [--frames 1,2,…] [--out dir]
#   第 k 帧 = 第 k 张关键帧（1 鱼灾 · 2 识图 · 3 白饭 · 4 刷视频打字 · 5 真不是机器人 · 6 备选回复露馅 · 7 清除插件 · 8 结尾）
import bpy, math, os, re, sys, argparse
from mathutils import Vector, Euler, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument('--out', default=os.path.join(HERE, 'build/keyframes'))
ap.add_argument('--frames', default='1,2,3,4,5,6,7,8')
ap.add_argument('--preview', action='store_true')
ap.add_argument('--save', default='')
A = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
UI = os.path.join(HERE, 'build/ui')
sc = bpy.context.scene
rig = bpy.data.objects['FISH2_rig']
lin = lambda h: tuple(((int(h[i:i + 2], 16) / 255) / 12.92 if int(h[i:i + 2], 16) / 255 <= .04045 else (((int(h[i:i + 2], 16) / 255) + .055) / 1.055) ** 2.4) for i in (1, 3, 5))
R = math.radians
N = 8

# ---------------- 角色：关掉布料模拟（关键帧静帧不需要），收进一个集合方便做分身
for o in bpy.data.objects:
    for m in o.modifiers:
        if m.type == 'CLOTH': m.show_render = m.show_viewport = False
    if o.name.startswith('COL_'): o.hide_render = True
dfy = bpy.data.collections.new('DFY'); sc.collection.children.link(dfy)
for o in [rig] + [c for c in bpy.data.objects if c.parent == rig]:
    for col in list(o.users_collection): col.objects.unlink(o)
    dfy.objects.link(o)

# ---------------- 姿势库：从自带的测试动画里取，加上手调的几个
act = rig.animation_data.action if rig.animation_data else None
def grab(frame):
    rig.animation_data.action = act; sc.frame_set(frame)
    return {pb.name: (pb.location.copy(), pb.rotation_quaternion.copy(), pb.rotation_euler.copy(), pb.rotation_mode) for pb in rig.pose.bones}
POSE_IDLE, POSE_HOP = grab(1), grab(120)
rig.animation_data.action = None
def pose(base, over=()):
    for pb in rig.pose.bones:
        if base and pb.name in base:
            loc, q, e, mode = base[pb.name]; pb.rotation_mode = mode; pb.location = loc; pb.rotation_quaternion = q; pb.rotation_euler = e
        else:
            pb.location = (0, 0, 0); pb.rotation_quaternion = (1, 0, 0, 0); pb.rotation_euler = (0, 0, 0)
    for name, (x, y, z) in over:
        pb = rig.pose.bones[name]; pb.rotation_mode = 'XYZ'; pb.rotation_euler = Euler((R(x), R(y), R(z)))
def mirror(bone, rot):   # 左右对称的手臂：右侧 Y、Z 取反
    x, y, z = rot; return ((bone + '.L', (x, y, z)), (bone + '.R', (x, -y, -z)))
CHEER = mirror('upper_arm', (0, 0, 130)) + mirror('forearm', (0, 0, 20))
HOLD = mirror('upper_arm', (40, 0, -10)) + mirror('forearm', (75, 0, 0))
CLASP = mirror('upper_arm', (75, 0, -25)) + mirror('forearm', (0, 0, -110)) + (('head', (0, 0, 10)),)
SHY = (('upper_arm.R', (75, 0, 15)), ('forearm.R', (110, 0, 0)), ('upper_arm.L', (75, 0, 40)), ('forearm.L', (110, 0, 0)), ('head', (8, 0, -8)))
POSES = {1: (None, CHEER), 2: (POSE_HOP, CHEER), 3: (None, HOLD), 4: (POSE_HOP, ()), 5: (None, CLASP), 6: (None, SHY), 7: (POSE_HOP, CHEER), 8: (None, CLASP)}
# 角色位置 / 朝向（她面朝 +X）
RIGXF = {1: ((0, 0, .04), 0), 2: ((.5, -.95, .45), 10), 3: ((0, 0, 0), 0), 4: ((.2, -.3, .45), 15), 5: ((.4, -1.35, 0), 25), 6: ((.2, -.9, 0), 20), 7: ((.2, .4, .7), -10), 8: ((.4, -.25, 0), 5)}

# ---------------- 材质 / 物件工具
def mat_img(name, path, emit=1.0, rough=.35):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(path)
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = emit
    bs = nt.nodes.new('ShaderNodeBsdfPrincipled'); bs.inputs['Roughness'].default_value = rough; bs.inputs['Base Color'].default_value = (0, 0, 0, 1)
    add = nt.nodes.new('ShaderNodeAddShader')
    nt.links.new(tex.outputs['Color'], em.inputs['Color']); nt.links.new(em.outputs[0], add.inputs[0]); nt.links.new(bs.outputs[0], add.inputs[1]); nt.links.new(add.outputs[0], out.inputs['Surface'])
    return m, tex.image
def mat_col(name, hexc, rough=.4, metal=0., emit=0.):
    m = bpy.data.materials.new(name); m.use_nodes = True; bs = m.node_tree.nodes['Principled BSDF']
    bs.inputs['Base Color'].default_value = (*lin(hexc), 1); bs.inputs['Roughness'].default_value = rough; bs.inputs['Metallic'].default_value = metal
    if emit: bs.inputs['Emission Color'].default_value = (*lin(hexc), 1); bs.inputs['Emission Strength'].default_value = emit
    return m
BODY = mat_col('slab_body', '#0b1024', .25)
SHOW = {}   # 物件 → 出现在哪几帧
def slab(name, png, w, frames, loc, rot=(0, 0, 0), upright=False, emit=1.0, depth=.06):
    """一块漂浮的界面板：正面贴 HTML 截图（自发光），背面和侧边是深色机身。upright=True 立着（正面朝 +X），否则平躺（图片上方朝 -X）。"""
    m, img = mat_img(name + '_m', os.path.join(UI, png), emit)
    h = w * img.size[1] / img.size[0]
    bpy.ops.mesh.primitive_plane_add(size=1); top = bpy.context.object; top.name = name; top.scale = (h, w, 1) if not upright else (1, 1, 1)
    if upright:   # 立板：在 YZ 平面
        me = top.data
        for v, (y, z) in zip(me.vertices, [(-w / 2, -h / 2), (w / 2, -h / 2), (-w / 2, h / 2), (w / 2, h / 2)]): v.co = (0, y, z)
        top.scale = (1, 1, 1)
        uv = me.uv_layers.active.data
        for li, l in enumerate(me.loops):
            co = me.vertices[l.vertex_index].co; uv[li].uv = ((co.y + w / 2) / w, (co.z + h / 2) / h)
    else:   # 平躺：图片上方朝 -X（离镜头远），左边朝 +Y
        me = top.data; uv = me.uv_layers.active.data
        for li, l in enumerate(me.loops):
            co = me.vertices[l.vertex_index].co; uv[li].uv = (.5 + co.y, .5 - co.x)
    top.data.materials.append(m)
    bpy.ops.object.transform_apply(scale=True)
    sol = top.modifiers.new('thick', 'SOLIDIFY'); sol.thickness = depth; sol.offset = -1; sol.material_offset = 1; top.data.materials.append(BODY)
    bev = top.modifiers.new('bev', 'BEVEL'); bev.width = .02; bev.segments = 3
    top.location = loc; top.rotation_euler = [R(a) for a in rot]
    SHOW[top] = frames; return top, w, h

# ---------------- 舞台（每帧只显示自己那一组）
slab('feed', 'feed.png', 3.2, (1, 7), (-1.6, 0, 0), rot=(0, 0, 0))
slab('recog', 'recog.png', 2.6, (2,), (-1.0, .45, 1.75), rot=(0, 0, -8), upright=True)
slab('recog_floor', 'feed.png', 3.2, (2,), (-1.6, 0, 0))
slab('token', 'token.png', 1.1, (3,), (-.9, .55, 1.75), rot=(0, 0, -25), upright=True)
slab('keyboard', 'keyboard.png', 3.6, (4,), (-.3, 0, 0))
slab('video', 'video.png', 3.0, (4,), (-1.6, .1, 1.6), rot=(0, 0, 8), upright=True)
slab('card', 'card.png', 3.2, (5,), (-1.0, .55, 1.55), rot=(0, 0, -10), upright=True)
slab('card_leak', 'card_leak.png', 3.2, (6,), (-1.0, .55, 1.75), rot=(0, 0, -10), upright=True)
slab('lock', 'lock.png', .9, (8,), (-1.0, -.95, 1.15), rot=(0, 0, 30), upright=True, emit=1.3)
# 地面：深色光面（反射界面的光）
bpy.ops.mesh.primitive_plane_add(size=40); fl = bpy.context.object; fl.name = 'floor'; fl.location = (0, 0, -.03)
fl.data.materials.append(mat_col('floor_m', '#0d1330', .18)); SHOW[fl] = tuple(range(1, N + 1))

# 白饭：碗 + 米饭 + 筷子
bpy.ops.mesh.primitive_uv_sphere_add(radius=.15, location=(.36, 0, 1.06), segments=32, ring_count=16); bowl = bpy.context.object; bowl.name = 'bowl'
bowl.scale = (1, 1, .75); bpy.ops.object.transform_apply(scale=True)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='DESELECT'); bpy.ops.object.mode_set(mode='OBJECT')
for v in bowl.data.vertices: v.select = v.co.z > 0
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.delete(type='VERT'); bpy.ops.object.mode_set(mode='OBJECT')
bowl.modifiers.new('s', 'SOLIDIFY').thickness = .012; bowl.data.materials.append(mat_col('bowl_m', '#f6f3ec', .2, emit=.15))
bpy.ops.mesh.primitive_uv_sphere_add(radius=.135, location=(.36, 0, 1.08), segments=24, ring_count=12); rice = bpy.context.object; rice.name = 'rice'; rice.scale = (1, 1, .6)
rice.data.materials.append(mat_col('rice_m', '#ffffff', .6, emit=.35))
for o in (bowl, rice):
    for p in o.data.polygons: p.use_smooth = True
    SHOW[o] = (3,)

# 清除插件：一把发光的扫帚
bpy.ops.mesh.primitive_cylinder_add(radius=.04, depth=2.4, location=(0, 0, 0)); handle = bpy.context.object
bpy.ops.mesh.primitive_cone_add(radius1=.55, radius2=.12, depth=.7, location=(0, 0, -1.4)); head = bpy.context.object
for o in (handle, head): o.data.materials.append(mat_col('broom_m', '#ff5c8a', .3, emit=.6 if o == head else 0))
broom = bpy.data.objects.new('broom', None); sc.collection.objects.link(broom)
for o in (handle, head): o.parent = broom; SHOW[o] = (7,)
broom.location = (-.4, -1.6, 1.4); broom.rotation_euler = (R(-35), R(10), R(-30))

# 结尾字标：官方 logo 里的 "deepseek" 字形，挤出成立体字
def svg_paths():
    s = open(os.path.join(HERE, 'DeepSeek-LLM.svg')).read(); out = []
    for m in re.finditer(r'<(path|polygon)[^>]*>', s):
        p = m.group(0); d = re.search(r' (d|points)="([^"]*)"', p).group(2)
        if 'polygon' in p:
            nums = re.findall(r'-?\d*\.?\d+', d); pts = [f'{nums[i]} {nums[i + 1]}' for i in range(0, len(nums) - 1, 2)]
            d = 'M' + 'L'.join(pts) + 'Z'
        out.append(d)
    return out[:-1]   # 最后一条是鲸鱼本身，不要
def build_curve(name, ds):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '2D'; cu.fill_mode = 'BOTH'; cu.extrude = 3; cu.bevel_depth = .35; cu.bevel_resolution = 3
    for d in ds:
        cur = None
        for cmd, args in re.findall(r'([MLCZ])([^MLCZ]*)', d):
            n = [float(x) for x in re.findall(r'-?\d*\.?\d+(?:e-?\d+)?', args)]
            if cmd == 'M': cur = [[(n[0], -n[1]), None, None]]; sps = cur
            elif cmd == 'L':
                for i in range(0, len(n), 2): cur.append([(n[i], -n[i + 1]), None, None])
            elif cmd == 'C':
                for i in range(0, len(n), 6): cur[-1][2] = (n[i], -n[i + 1]); cur.append([(n[i + 4], -n[i + 5]), (n[i + 2], -n[i + 3]), None])
            elif cmd == 'Z' and cur:
                if len(cur) > 1 and math.dist(cur[0][0], cur[-1][0]) < 1e-3: cur[0][1] = cur[-1][1]; cur.pop()
                sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(cur) - 1); sp.use_cyclic_u = True
                for k, (co, hi, ho) in enumerate(cur):
                    bp = sp.bezier_points[k]; bp.co = (*co, 0); bp.handle_left = (*(hi or co), 0); bp.handle_right = (*(ho or co), 0)
                    bp.handle_left_type = bp.handle_right_type = 'FREE' if (hi or ho) else 'VECTOR'
                cur = None
    ob = bpy.data.objects.new(name, cu); sc.collection.objects.link(ob); return ob
word = build_curve('wordmark', svg_paths())
word.data.materials.append(mat_col('word_m', '#4d6bfe', .25, emit=.9))
bpy.context.view_layer.objects.active = word; word.select_set(True); bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY'); word.select_set(False)
word.rotation_euler = (R(90), 0, R(90) - R(28)); s = 3.0 / 135; word.scale = (s, s, s)
word.location = (-1.1, .75, 25.5 * s / 2 + .02)   # 立在她身后，面朝 +X
SHOW[word] = (8,)

# ---------------- 分身（鱼灾）：集合实例
CLONES = [((-2.4, 1.0, .04), 30), ((-1.0, -1.05, .04), -20), ((-2.9, -.6, .04), 10), ((-.2, 1.1, .04), -40), ((-3.6, .9, .04), 60), ((-1.9, -1.2, .04), 0)]
clones = []
for i, (loc, yaw) in enumerate(CLONES):
    e = bpy.data.objects.new(f'clone{i}', None); e.instance_type = 'COLLECTION'; e.instance_collection = dfy; sc.collection.objects.link(e)
    e.location = loc; e.rotation_euler = (0, 0, R(yaw)); clones.append(e); SHOW[e] = (1, 7)
# 第 7 帧：分身被扫飞
FLY = [((-1.2, -2.2, 1.4), (40, 10, 80)), ((-3.0, -1.5, 2.2), (-30, 60, 10)), ((-2.2, 2.4, 1.8), (70, -20, 30)), ((-.6, -3.0, .9), (10, 80, -40)), ((-4.0, 1.8, 2.6), (-60, 0, 90)), ((-2.6, -2.8, 2.0), (20, -50, 0))]

# ---------------- 镜头（每帧一个机位）
cd = bpy.data.cameras.new('CAM'); cam = bpy.data.objects.new('CAM', cd); sc.collection.objects.link(cam); sc.camera = cam
cd.lens = 35; cd.dof.use_dof = True
CAMS = {1: ((4.4, -2.6, 3.9), (-1.2, 0, .6), 56, 6.0), 2: ((4.6, -1.9, 1.7), (-.3, -.1, 1.4), 54, 4.0), 3: ((2.7, -1.1, 1.5), (-.1, .1, 1.2), 46, 2.8),
        4: ((4.2, -2.4, 2.6), (-.6, 0, .9), 54, 4.0), 5: ((4.3, -2.8, 1.8), (-.6, -.3, 1.35), 54, 5.0), 6: ((3.8, -2.3, 1.8), (-.4, -.2, 1.45), 48, 4.0),
        7: ((4.6, -3.2, 3.4), (-1.2, 0, .9), 56, 6.0), 8: ((4.6, -1.5, 1.45), (-.5, -.15, 1.05), 58, 6.0)}   # 机位、看向、垂直视角（度）、光圈

# ---------------- 世界和光：前 7 帧深海蓝，结尾变暖
w = sc.world; bg = w.node_tree.nodes.get('Background')
KEY = bpy.data.objects.get('LGT-Anime_Key'); RIM = bpy.data.objects.get('LGT-Anime_Rim')

def apply_frame(f):
    for o, frs in SHOW.items(): o.hide_render = f not in frs
    base, over = POSES[f]; pose(base, over)
    (x, y, z), yaw = RIGXF[f]; rig.location = (x, y, z); rig.rotation_euler = (0, 0, R(yaw))
    for i, e in enumerate(clones):
        if f == 7: e.location, e.rotation_euler = FLY[i][0], [R(a) for a in FLY[i][1]]
        else: e.location, e.rotation_euler = CLONES[i][0], (0, 0, R(CLONES[i][1]))
    p, t, fov, fd = CAMS[f]; cam.location = p; cam.rotation_euler = (Vector(t) - Vector(p)).to_track_quat('-Z', 'Y').to_euler()
    cd.sensor_fit = 'VERTICAL'; cd.angle_y = R(fov)
    cd.dof.focus_distance = (Vector(p) - Vector(rig.location) - Vector((0, 0, 1.2))).length; cd.dof.aperture_fstop = fd
    warm = f == 8
    if bg: bg.inputs['Color'].default_value = (*lin('#3a2a3e' if warm else '#0e1638'), 1); bg.inputs['Strength'].default_value = .8
    if KEY: KEY.data.color = lin('#ffd6b0') if warm else (1, 1, 1)
    if RIM: RIM.data.color = lin('#ffb0d0') if warm else lin('#9fb4ff')

sc.render.engine = 'BLENDER_EEVEE'
try: sc.eevee.taa_render_samples = 16 if A.preview else 48
except Exception: pass
sc.render.resolution_x, sc.render.resolution_y = 1080, 1920
sc.render.resolution_percentage = 50 if A.preview else 100
sc.render.image_settings.file_format = 'PNG'
os.makedirs(A.out, exist_ok=True)
if A.save: bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(A.save))
import time
for f in [int(x) for x in A.frames.split(',')]:
    apply_frame(f); bpy.context.view_layer.update()
    sc.render.filepath = os.path.join(A.out, f'kf{f}.png'); t0 = time.time()
    bpy.ops.render.render(write_still=True); print(f'keyframe {f}: {time.time() - t0:.1f}s')
