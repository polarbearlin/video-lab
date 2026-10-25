# 《大肥鱼，不是机器人》30 秒 · Blender 场景（Blender 4.2+ / 5.x，EEVEE）
# 读 build/timeline.json（timeline.py 生成）和 build/ui2/（ui_states.py 生成），角色用 assets/models/dafeiyu_chibi/dafeiyu_chibi.glb
#
# 预览几帧：  blender -b --factory-startup -P demos/deepseek/scene.py -- --stills 16,90,200,340,420,560,640,760,860 --preview
# 整片渲染：  blender -b --factory-startup -P demos/deepseek/scene.py -- --render            （已渲染的帧会跳过，可断点续跑）
# 只渲一段：  ... -- --render --frames 301-450
# 存 .blend： ... -- --save demos/deepseek/build/dafeiyu.blend
import bpy, json, math, os, sys, argparse
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '../..'))
ap = argparse.ArgumentParser()
ap.add_argument('--model', default=os.path.join(REPO, 'assets/models/dafeiyu_chibi/dafeiyu_chibi.glb'))
ap.add_argument('--out', default=os.path.join(HERE, 'build/render'))
ap.add_argument('--stills', default='')
ap.add_argument('--frames', default='')
ap.add_argument('--render', action='store_true')
ap.add_argument('--preview', action='store_true', help='半分辨率、低采样')
ap.add_argument('--scale', type=int, default=0, help='分辨率百分比')
ap.add_argument('--samples', type=int, default=0)
ap.add_argument('--draft', action='store_true', help='Workbench 快速动画小样（只看动作和节奏）')
ap.add_argument('--save', default='')
A = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])

J = json.load(open(os.path.join(HERE, 'build/timeline.json')))
FR, N, FPS, CH = J['frames'], J['n'], J['fps'], J['char_h']
UI = os.path.join(HERE, 'build/ui2')
R = math.radians
def lin(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in c)
def mix(a, b, k): return tuple(x + (y - x) * k for x, y in zip(a, b))

# ---------------- 渲染设置
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
    try: sc.render.engine = eng; break
    except TypeError: pass
sc.render.fps = FPS; sc.frame_start, sc.frame_end = 1, N
sc.render.resolution_x, sc.render.resolution_y = J.get('res', (1080, 1920))
sc.render.resolution_percentage = A.scale or (50 if A.preview else 100)
ee = sc.eevee
ee.taa_render_samples = A.samples or (16 if A.preview else 64)
for k, v in (('use_raytracing', True), ('use_shadows', True), ('shadow_ray_count', 2), ('use_gtao', True)):
    if hasattr(ee, k): setattr(ee, k, v)
sc.render.use_motion_blur = True
if hasattr(sc.render, 'motion_blur_shutter'): sc.render.motion_blur_shutter = .5
sc.view_settings.view_transform = 'AgX'
try: sc.view_settings.look = 'AgX - Medium High Contrast'
except Exception: pass
sc.render.image_settings.file_format = 'PNG'
sc.render.use_overwrite = False; sc.render.use_placeholder = True   # 断点续跑 / 多开进程分帧

# ---------------- 材质
def mat_screen(name, path, seq=False, emit=1.0):
    """界面板正面：图片自发光 + 一层很薄的光泽（能反出她的影子和高光）"""
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); tex = nt.nodes.new('ShaderNodeTexImage')
    img = bpy.data.images.load(path); tex.image = img; tex.interpolation = 'Cubic'
    if seq:
        img.source = 'SEQUENCE'; iu = tex.image_user
        iu.frame_duration = N; iu.frame_start = 1; iu.frame_offset = 0; iu.use_auto_refresh = True
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = emit
    bs = nt.nodes.new('ShaderNodeBsdfPrincipled'); bs.inputs['Base Color'].default_value = (0, 0, 0, 1); bs.inputs['Roughness'].default_value = .5
    add = nt.nodes.new('ShaderNodeAddShader')
    nt.links.new(tex.outputs['Color'], em.inputs['Color']); nt.links.new(em.outputs[0], add.inputs[0]); nt.links.new(bs.outputs[0], add.inputs[1])
    nt.links.new(add.outputs[0], out.inputs['Surface'])
    return m, img
def mat_col(name, hexc, rough=.4, metal=0., emit=0., emit_hex=None):
    m = bpy.data.materials.new(name); m.use_nodes = True; bs = m.node_tree.nodes['Principled BSDF']
    bs.inputs['Base Color'].default_value = (*lin(hexc), 1); bs.inputs['Roughness'].default_value = rough; bs.inputs['Metallic'].default_value = metal
    if emit: bs.inputs['Emission Color'].default_value = (*lin(emit_hex or hexc), 1); bs.inputs['Emission Strength'].default_value = emit
    return m
BODY = mat_col('panel_body', '#0b1024', .3, emit=1.2, emit_hex='#3a55e8')   # 侧边发蓝光

def slab(name, w, h, loc, mat, depth=.04):
    bpy.ops.mesh.primitive_plane_add(size=1); o = bpy.context.object; o.name = name
    o.scale = (w, h, 1); bpy.ops.object.transform_apply(scale=True)   # 默认 UV 正好：图片上方朝 +Y
    o.data.materials.append(mat); o.data.materials.append(BODY)
    sol = o.modifiers.new('thick', 'SOLIDIFY'); sol.thickness = depth; sol.offset = -1; sol.material_offset = 1
    bev = o.modifiers.new('bev', 'BEVEL'); bev.width = .012; bev.segments = 2
    o.location = loc; return o

# ---------------- 舞台：界面板
for p, d in J['panels'].items():
    m, _ = mat_screen(p + '_m', os.path.join(UI, p, 'seq', 'f_0001.png'), seq=True, emit=1.0)
    slab(p, d['w'], d['h'], (d['c'][0], d['c'][1], 0), m)
# 砸下来的问题卡
D = J['drop']; dp = J['panels'][D['at'][0]]
dx = dp['c'][0] + (D['at'][1] / dp['px'][0] - .5) * dp['w']; dy = dp['c'][1] + (.5 - D['at'][2] / dp['px'][1]) * dp['h']
dm, _ = mat_screen('drop_m', os.path.join(UI, 'drop', 'q.png'), emit=1.1)
drop = slab('drop', D['w'], D['w'] * D['px'][1] / D['px'][0], (dx, dy, 8), dm, depth=.03)
# 深处的地面：深蓝光面，接住界面的倒影
bpy.ops.mesh.primitive_plane_add(size=80, location=(5, 0, -.45)); fl = bpy.context.object; fl.name = 'floor'
fl.data.materials.append(mat_col('floor_m', '#060a1c', .22))

# 远处的光点：景深一虚就是背景里的光斑，填满画面上方的黑
import random
random.seed(7)
for i in range(140):
    x, y = random.uniform(-3, 13), random.uniform(4.0, 10); z = random.uniform(-2.0, .2)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=random.uniform(.02, .06), location=(x, y, z), segments=12, ring_count=6)
    bpy.context.object.data.materials.append(mat_col(f'dot{i}', '#000000', emit=random.uniform(1, 3), emit_hex=random.choice(['#4d6bfe', '#7f95ff', '#fb7299', '#a8b8ff'])))

# ---------------- 角色
bpy.ops.import_scene.gltf(filepath=A.model)
body = [o for o in bpy.context.selected_objects if o.type == 'MESH'][0]
dfy = bpy.data.objects.new('DFY', None); sc.collection.objects.link(dfy)
for o in bpy.context.selected_objects:
    if o.parent is None: o.parent = dfy
body.scale = (CH, CH, CH)   # 模型高 1 m、脚底在原点、面朝 +X（prep_chibi.py 处理过）
dfy.rotation_mode = 'XYZ'

# ---------------- 光：跟着她走的主光 + 蓝色轮廓光，世界是深海蓝；结尾变暖
w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True; bg = w.node_tree.nodes['Background']
def area(name, size, energy):
    ld = bpy.data.lights.new(name, 'AREA'); ld.size = size; ld.energy = energy
    o = bpy.data.objects.new(name, ld); sc.collection.objects.link(o); return o
KEY, RIM, FILL = area('key', 1.2, 45), area('rim', .8, 40), area('fill', 3, 25)
KEY.data.specular_factor, FILL.data.specular_factor = .25, 0   # 不在界面上反出大白斑
def aim(o, frm, to): o.location = frm; o.rotation_euler = (Vector(to) - Vector(frm)).to_track_quat('-Z', 'Y').to_euler()

# ---------------- 镜头
cd = bpy.data.cameras.new('CAM'); cam = bpy.data.objects.new('CAM', cd); sc.collection.objects.link(cam); sc.camera = cam
cd.sensor_fit = 'VERTICAL'; cd.sensor_height = 24; cd.clip_start = .05; cd.clip_end = 200
cd.dof.use_dof = True; cd.dof.aperture_fstop = 2.2

# ---------------- 逐帧打关键帧
for fd in FR:
    f = fd['f']; c = fd['char']; cm = fd['cam']; k = fd['warm']
    dfy.location = (c['x'], c['y'], c['z']); dfy.rotation_euler = (0, 0, R(c['yaw'])); dfy.scale = (c['sx'], c['sx'], c['sz'])
    for a in ('location', 'rotation_euler', 'scale'): dfy.keyframe_insert(a, frame=f)
    loc = Vector(cm['loc']); look = Vector(cm['look'])
    cam.location = loc; cam.rotation_euler = (look - loc).to_track_quat('-Z', 'Y').to_euler()
    cd.lens = cd.sensor_height / (2 * math.tan(R(cm['fov']) / 2))
    cd.dof.focus_distance = (loc - Vector((c['x'], c['y'], CH * .5))).length
    cam.keyframe_insert('location', frame=f); cam.keyframe_insert('rotation_euler', frame=f)
    cd.keyframe_insert('lens', frame=f); cd.dof.keyframe_insert('focus_distance', frame=f)
    p = Vector((c['x'], c['y'], 0))
    aim(KEY, p + Vector((.9, -1.3, 1.7)), p + Vector((0, 0, CH * .5))); aim(RIM, p + Vector((-.7, 1.0, 1.0)), p + Vector((0, 0, CH * .6)))
    aim(FILL, p + Vector((0, -1.5, 3.0)), p)
    KEY.data.color = mix((1, .97, .94), lin('#ffc9a0'), k); RIM.data.color = mix(lin('#8fa6ff'), lin('#ff9fc4'), k)
    KEY.data.energy = 45 + 15 * k
    for o in (KEY, RIM, FILL): o.keyframe_insert('location', frame=f); o.keyframe_insert('rotation_euler', frame=f)
    for o in (KEY, RIM): o.data.keyframe_insert('color', frame=f)
    KEY.data.keyframe_insert('energy', frame=f)
    bg.inputs['Color'].default_value = (*mix(lin('#16224f'), lin('#3a2440'), k), 1); bg.inputs['Strength'].default_value = 1.0
    bg.inputs['Color'].keyframe_insert('default_value', frame=f)
    drop.location.z = 8 if fd['drop_z'] is None else fd['drop_z'] + .001
    drop.keyframe_insert('location', index=2, frame=f)

# 关键帧全部改成线性（逐帧都有关键帧，只影响运动模糊的子帧）
def all_fcurves():
    for ad in [o.animation_data for o in list(bpy.data.objects) + list(bpy.data.lights) + list(bpy.data.cameras) + [w.node_tree]]:
        act = ad.action if ad else None
        if not act: continue
        if hasattr(act, 'fcurves') and len(act.fcurves): yield from act.fcurves; continue
        for layer in getattr(act, 'layers', []):
            for st in layer.strips:
                for cb in st.channelbags: yield from cb.fcurves
for fc in all_fcurves():
    for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'

if A.draft:
    sc.render.engine = 'BLENDER_WORKBENCH'; sh = sc.display.shading
    sh.light = 'FLAT'; sh.color_type = 'TEXTURE'; sc.render.use_motion_blur = False
    sc.display.render_aa = 'FXAA'; w.color = lin('#101a40')
    for m in bpy.data.materials:
        if m.name in ('floor_m', 'panel_body'): m.diffuse_color = (*lin('#0b1024'), 1)
        elif m.name.startswith('dot'): m.diffuse_color = (*lin('#4d6bfe'), 1)
if A.save: bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(A.save))

os.makedirs(A.out, exist_ok=True)
if A.stills:
    import time
    for f in [int(x) for x in A.stills.split(',')]:
        t0 = time.time(); sc.frame_set(f); sc.render.filepath = os.path.join(A.out, f'still_{f:04d}.png')
        sc.render.use_overwrite = True; bpy.ops.render.render(write_still=True)
        print(f'STILL {f} {time.time() - t0:.1f}s')
elif A.render:
    if A.frames: a, b = A.frames.split('-'); sc.frame_start, sc.frame_end = int(a), int(b)
    sc.render.filepath = os.path.join(A.out, 'f_')
    bpy.ops.render.render(animation=True)
