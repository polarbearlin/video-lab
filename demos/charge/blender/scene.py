# 《充到 80%》后 45 秒 · Blender 场景（Blender 5.x，Cycles）
# 读 export_web.mjs 导出的 build/：scene.glb（纸雕场景 + 烘焙动画）、frames.json（镜头 / 光 / 手机矩阵）、seq/（屏幕等画布序列）
# 手机用 assets/models/phone_agent/phone/phone.glb。
#
# 预览截图： blender -b --factory-startup -P demos/charge/blender/scene.py -- --stills 31.8,35,38.6,42.4,50,53.8,69.8,74.5 --preview
# 正式渲染： blender -b --factory-startup -P demos/charge/blender/scene.py -- --render [--frames 901-2250] [--samples 128]
#           （有 N 卡会自动用 OptiX/CUDA，苹果用 Metal；先跑 --stills 计时一帧）
# 只生成 .blend 不渲染： ... -- --save demos/charge/blender/build/charge.blend
import bpy, json, math, os, sys, argparse
from mathutils import Matrix, Vector, Quaternion

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '../../..'))
ap = argparse.ArgumentParser()
ap.add_argument('--build', default=os.path.join(HERE, 'build'))
ap.add_argument('--phone', default=os.path.join(REPO, 'assets/models/phone_agent/phone/phone.glb'))
ap.add_argument('--out', default=os.path.join(HERE, 'build/render'))
ap.add_argument('--stills', default='')
ap.add_argument('--frames', default='')
ap.add_argument('--render', action='store_true')
ap.add_argument('--preview', action='store_true')
ap.add_argument('--samples', type=int, default=0)
ap.add_argument('--scale', type=int, default=0, help='分辨率百分比')
ap.add_argument('--cpu', action='store_true')
ap.add_argument('--save', default='')
A = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])

U = 0.01                         # 网页里 1 个单位 = 1 cm
PHONE_H = 26.0                   # 网页里手机高 26 单位
C = Matrix.Rotation(math.radians(90), 4, 'X')   # three（Y 向上）→ Blender（Z 向上）
CI = C.inverted()
J = json.load(open(os.path.join(A.build, 'frames.json')))
FR = J['frames']; FPS = J['fps']; STEP = J.get('step', 1)
FIRST = J['first']               # 第一帧的全局帧号（t × 30 + 1）
fnum = lambda i: FR[i].get('f', FIRST + i * STEP)   # 第 i 个记录 → 全局帧号

def v3(a):    # three 坐标 → Blender 坐标（含单位换算）
    return Vector((a[0], -a[2], a[1])) * U
def hexc(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in c]   # sRGB → 线性

# ---------------- 清空 + 渲染设置
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.render.fps = FPS
sc.render.resolution_x, sc.render.resolution_y = 1080, 1920
sc.render.resolution_percentage = A.scale or (50 if A.preview else 100)
sc.cycles.samples = A.samples or (40 if A.preview else 128)
sc.cycles.use_adaptive_sampling = True
sc.cycles.use_denoising = True
sc.render.use_motion_blur = True
sc.render.motion_blur_shutter = 0.5
sc.render.use_persistent_data = True
sc.view_settings.view_transform = 'AgX'
try: sc.view_settings.look = 'AgX - Medium High Contrast'
except Exception: pass
sc.render.image_settings.file_format = 'PNG'
sc.render.film_transparent = False

def use_gpu():
    if A.cpu: return 'CPU'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    for kind in ('OPTIX', 'CUDA', 'METAL', 'HIP', 'ONEAPI'):
        try:
            prefs.compute_device_type = kind; prefs.get_devices()
            devs = [d for d in prefs.devices if d.type == kind]
            if devs:
                for d in prefs.devices: d.use = d.type == kind
                sc.cycles.device = 'GPU'
                if kind == 'OPTIX': sc.cycles.denoiser = 'OPTIX'
                return kind
        except Exception: pass
    return 'CPU'
print('render device:', use_gpu())

# ---------------- 场景：纸雕 + 影棚 + 动画道具（来自网页导出）
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=os.path.join(A.build, 'scene.glb'))
imported = [o for o in bpy.data.objects if o not in before]
ROOT = bpy.data.objects.new('ROOT', None); sc.collection.objects.link(ROOT)
for o in imported:
    if o.parent is None: o.parent = ROOT
ROOT.scale = (U, U, U)
# glTF 动画从 0 秒开始烘焙，每帧一把钥匙：整体挪到 FIRST 帧（导出用了 --step 时再按 STEP 拉开）
def shift_action(act):
    curves = list(getattr(act, 'fcurves', []))
    if not curves:
        try: curves = [fc for lay in act.layers for st in lay.strips for cb in st.channelbags for fc in cb.fcurves]
        except Exception: curves = []
    for fc in curves:
        f0 = min(kp.co.x for kp in fc.keyframe_points)
        for kp in fc.keyframe_points:
            x = fnum(min(len(FR) - 1, round(kp.co.x - f0)))
            kp.co.x = x; kp.handle_left.x = x - .3; kp.handle_right.x = x + .3
            kp.interpolation = 'LINEAR'
for act in bpy.data.actions: shift_action(act)

# 每帧变化的画布 → 图片序列贴图
def seq_image(folder, ext):
    d = os.path.join(A.build, 'seq', folder)
    files = sorted(f for f in os.listdir(d) if f.endswith(ext)) if os.path.isdir(d) else []
    if not files: return None, 0, 0
    img = bpy.data.images.load(os.path.join(d, files[0])); img.source = 'SEQUENCE'
    return img, int(files[0][:5]), len(files)
def seq_material(name, folder, ext, emission=False, alpha=False, flip_v=False):
    img, start, n = seq_image(folder, ext)
    if not img: return None
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = img
    iu = tex.image_user; iu.frame_start = start; iu.frame_duration = 99999; iu.frame_offset = start - 1; iu.use_auto_refresh = True
    iu.use_cyclic = False
    if flip_v:   # phone.glb 的屏幕 UV 是 V 向上（README 说明），Blender 导入时又翻了一次 → 这里翻回来
        tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
        mp.inputs['Location'].default_value[1] = 1.0; mp.inputs['Scale'].default_value[1] = -1.0
        nt.links.new(tc.outputs['UV'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], tex.inputs['Vector'])
    if emission:
        em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 1.0
        nt.links.new(tex.outputs['Color'], em.inputs['Color']); nt.links.new(em.outputs[0], out.inputs['Surface'])
    else:
        bs = nt.nodes.new('ShaderNodeBsdfPrincipled'); bs.inputs['Roughness'].default_value = .9
        nt.links.new(tex.outputs['Color'], bs.inputs['Base Color'])
        if alpha: nt.links.new(tex.outputs['Alpha'], bs.inputs['Alpha'])
        nt.links.new(bs.outputs[0], out.inputs['Surface'])
    return m
for name, folder, ext, alpha in (('clock', 'clock', '.png', True), ('window', 'window', '.jpg', False), ('plan', 'plan', '.png', True)):
    ob = bpy.data.objects.get(name)
    m = seq_material('seq_' + name, folder, ext, alpha=alpha, flip_v=True)   # 网页画布原图没有 glTF 导出时的翻转
    if ob and m and ob.type == 'MESH':
        ob.data.materials.clear(); ob.data.materials.append(m)

# ---------------- 手机（Blender Agent 建的 phone.glb）
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=A.phone)
pimp = [o for o in bpy.data.objects if o not in before]
PH = bpy.data.objects.new('PHONE', None); sc.collection.objects.link(PH); PH.rotation_mode = 'QUATERNION'
for o in pimp:
    if o.parent is None: o.parent = PH
TUNE = {'Frame': dict(c='#8f9296', m=1, r=.26), 'BackGlass': dict(c='#cbc6bd', r=.5), 'FrontGlass': dict(r=.04), 'LensRing': dict(m=1, r=.2), 'Buttons': dict(m=1, r=.3)}
scr_m = seq_material('seq_screen', 'screen', '.jpg', emission=True, flip_v=True)
for o in pimp:
    if o.type != 'MESH': continue
    if o.name.startswith('Screen') and scr_m:
        o.data.materials.clear(); o.data.materials.append(scr_m); continue
    for m in o.data.materials:
        t = TUNE.get(m.name.split('.')[0]); bs = m.node_tree.nodes.get('Principled BSDF') if m and m.use_nodes else None
        if t and bs:
            if 'c' in t: bs.inputs['Base Color'].default_value = (*hexc(t['c'][1:]), 1)
            if 'm' in t: bs.inputs['Metallic'].default_value = t['m']
            if 'r' in t: bs.inputs['Roughness'].default_value = t['r']
K = PHONE_H / 0.1476   # 米 → 网页单位
for i, f in enumerate(FR):
    Mt = Matrix([f['phoneWorld'][c::4] for c in range(4)])   # three 是列主序
    M = Matrix.Diagonal((U, U, U, 1)) @ C @ Mt @ CI @ Matrix.Diagonal((K, K, K, 1))
    loc, rot, scl = M.decompose()
    PH.location, PH.rotation_quaternion, PH.scale = loc, rot, scl
    for p in ('location', 'rotation_quaternion', 'scale'): PH.keyframe_insert(p, frame=fnum(i))

# ---------------- 镜头（和网页同一套机位、焦点）
cd = bpy.data.cameras.new('CAM'); cam = bpy.data.objects.new('CAM', cd); sc.collection.objects.link(cam); sc.camera = cam
cd.sensor_fit = 'VERTICAL'; cd.clip_start = .01; cd.clip_end = 100
cd.dof.use_dof = True
cam.rotation_mode = 'QUATERNION'
for i, f in enumerate(FR):
    p, d = f['cam'][:3], f['cam'][3:6]
    cam.location = v3(p)
    cam.rotation_quaternion = Vector((d[0], -d[2], d[1])).to_track_quat('-Z', 'Y')
    cd.angle_y = math.radians(f['fov'])
    studio = f['zone'] in ('dcd8d2',)
    cd.dof.focus_distance = max(.05, f['focus'] * U)
    cd.dof.aperture_fstop = 2.0 if studio else 2.8
    fr = fnum(i)
    cam.keyframe_insert('location', frame=fr); cam.keyframe_insert('rotation_quaternion', frame=fr)
    cd.keyframe_insert('lens', frame=fr); cd.dof.keyframe_insert('focus_distance', frame=fr); cd.dof.keyframe_insert('aperture_fstop', frame=fr)

# ---------------- 灯光：主光跟着镜头（同网页的聚光），台灯，轮廓光；环境光按分区
def light(name, kind, **kw):
    ld = bpy.data.lights.new(name, kind)
    for k, v in kw.items(): setattr(ld, k, v)
    ob = bpy.data.objects.new(name, ld); sc.collection.objects.link(ob); return ob
key = light('KEY', 'SPOT', spot_size=1.24, spot_blend=.9, shadow_soft_size=.06)
lamp = light('LAMP', 'POINT', shadow_soft_size=.03, color=hexc('ffbf70'))
lamp.location = v3([-312, 40, 14])
rim = light('RIM', 'SUN', energy=.6, color=hexc('a9c1ff'), angle=.1)
rim.rotation_euler = (math.radians(60), 0, math.radians(140))
soft = light('STUDIO_SOFT', 'AREA', size=3.0, energy=0)      # 影棚顶上的大柔光
soft.location = v3([700, 160, 40]); soft.rotation_euler = (math.radians(-20), 0, 0)
key.rotation_mode = 'QUATERNION'
world = bpy.data.worlds.new('W'); sc.world = world; world.use_nodes = True
bg = world.node_tree.nodes['Background']
for i, f in enumerate(FR):
    fr = fnum(i); k = f['key']
    key.location = v3(k[:3]); key.rotation_quaternion = (v3(k[3:6]) - v3(k[:3])).to_track_quat('-Z', 'Y')
    key.data.color = hexc(k[6]); key.data.energy = k[7] * 260 * (.45 if f['zone'] == 'dcd8d2' else 1)
    studio = f['zone'] == 'dcd8d2'
    lamp.data.energy = f['lamp'] * .012
    soft.data.energy = 220 if studio else 0
    hc = hexc(f['hemi'][0]); bg.inputs['Color'].default_value = (*hc, 1); bg.inputs['Strength'].default_value = f['hemi'][2] * (.38 if studio else .45)
    key.keyframe_insert('location', frame=fr); key.keyframe_insert('rotation_quaternion', frame=fr)
    key.data.keyframe_insert('color', frame=fr); key.data.keyframe_insert('energy', frame=fr)
    lamp.data.keyframe_insert('energy', frame=fr); soft.data.keyframe_insert('energy', frame=fr)
    bg.inputs['Color'].keyframe_insert('default_value', frame=fr); bg.inputs['Strength'].keyframe_insert('default_value', frame=fr)
# 光泽反射里不要看到主光（光面屏幕上会变成一大块白）
for ob in (key, soft):
    try: ob.visible_glossy = False
    except Exception: pass

sc.frame_start = FIRST; sc.frame_end = fnum(len(FR) - 1)
if A.save: bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(A.save))

# ---------------- 渲染
os.makedirs(A.out, exist_ok=True)
def t2f(t):   # 时间 → 全局帧号（就近）
    i = min(range(len(FR)), key=lambda j: abs(FR[j]['t'] - t)); return fnum(i)
if A.stills:
    import time
    for t in [float(x) for x in A.stills.split(',')]:
        sc.frame_set(t2f(t)); sc.render.filepath = os.path.join(A.out, f'still_{t:05.2f}.png')
        t0 = time.time(); bpy.ops.render.render(write_still=True); print(f'still t={t} frame={sc.frame_current} {time.time() - t0:.1f}s')
elif A.render:
    if A.frames:
        a, b = [int(x) for x in A.frames.split('-')]; sc.frame_start, sc.frame_end = a, b
    sc.render.filepath = os.path.join(A.out, '#####')
    bpy.ops.render.render(animation=True)
