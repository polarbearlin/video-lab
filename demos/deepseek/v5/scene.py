# 《大肥鱼》v5 · 两段测试（Blender 4.2+ / 5.x，EEVEE）
#   段 B 7–10 秒：主人狂点「重新生成」，她一次次被弹飞，最后瘫在「服务器繁忙」上
#   段 E 13–19 秒：骑滚动条滑下评论区 → 急停打滑 → "你是不是 AI？" → 深度思考框露馅，她蹦起来去捂
# 先跑 python3 demos/deepseek/v5/ui.py 生成界面图。
# blender -b --factory-startup -P demos/deepseek/v5/scene.py -- --stills 230,262,290,420,470,520 --scale 30
# blender -b --factory-startup -P demos/deepseek/v5/scene.py -- --render --frames 211-300 [--scale 50]
import bpy, math, os, sys, argparse, random
from mathutils import Vector, Quaternion, Matrix, Euler

HERE = os.path.dirname(os.path.abspath(__file__)); DS = os.path.dirname(HERE); REPO = os.path.abspath(os.path.join(DS, '../..'))
sys.path.insert(0, HERE)
import beats as BT
ap = argparse.ArgumentParser()
ap.add_argument('--model', default=os.path.join(REPO, 'assets/models/dafeiyu_chibi/dafeiyu_chibi.glb'))
ap.add_argument('--out', default=os.path.join(DS, 'build/v5render'))
ap.add_argument('--stills', default=''); ap.add_argument('--frames', default=''); ap.add_argument('--render', action='store_true')
ap.add_argument('--scale', type=int, default=100); ap.add_argument('--samples', type=int, default=0)
A = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
UI = os.path.join(DS, 'build/v5ui')
FPS = BT.FPS; CH = 0.42; G = 9.8
R = math.radians
def lin(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in c)
def smooth(a): a = max(0., min(1., a)); return a * a * (3 - 2 * a)
def clamp01(a): return max(0., min(1., a))
def back_out(a, s=1.7): a = clamp01(a) - 1; return a * a * ((s + 1) * a + s) + 1   # 弹出时冲过头一点

# ======================================================================= 场景基础
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
    try: sc.render.engine = eng; break
    except TypeError: pass
sc.render.fps = FPS; sc.render.resolution_x, sc.render.resolution_y = 1920, 1080; sc.render.resolution_percentage = A.scale
ee = sc.eevee; ee.taa_render_samples = A.samples or 64
for k, v in (('use_raytracing', True), ('use_shadows', True), ('use_gtao', True)):
    if hasattr(ee, k): setattr(ee, k, v)
sc.render.use_motion_blur = True
sc.view_settings.view_transform = 'AgX'
try: sc.view_settings.look = 'AgX - Medium High Contrast'
except Exception: pass
sc.render.image_settings.file_format = 'PNG'; sc.render.use_overwrite = False; sc.render.use_placeholder = True

def mat_img(name, path, emit=1.0, alpha=False, rough=.5):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(path); tex.interpolation = 'Cubic'
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = emit
    bs = nt.nodes.new('ShaderNodeBsdfPrincipled'); bs.inputs['Base Color'].default_value = (0, 0, 0, 1); bs.inputs['Roughness'].default_value = rough
    add = nt.nodes.new('ShaderNodeAddShader')
    nt.links.new(tex.outputs['Color'], em.inputs['Color']); nt.links.new(em.outputs[0], add.inputs[0]); nt.links.new(bs.outputs[0], add.inputs[1])
    if alpha:   # 半透明（思考框）
        tr = nt.nodes.new('ShaderNodeBsdfTransparent'); mx = nt.nodes.new('ShaderNodeMixShader'); mx.inputs[0].default_value = .9
        nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(add.outputs[0], mx.inputs[2]); nt.links.new(mx.outputs[0], out.inputs['Surface'])
        if hasattr(m, 'surface_render_method'): m.surface_render_method = 'BLENDED'
    else: nt.links.new(add.outputs[0], out.inputs['Surface'])
    return m, tex
def mat_seq(name, paths, emit=1.0, alpha=False):
    """几张状态图做成一个图像序列（软链接 seq/0001.png …），再用关键帧切换显示第几张"""
    d = os.path.join(UI, 'seq_' + name); os.makedirs(d, exist_ok=True)
    for i, p in enumerate(paths):
        dst = os.path.join(d, f'{i + 1:04d}.png')
        if os.path.lexists(dst): os.remove(dst)
        os.symlink(os.path.abspath(p), dst)
    m, tex = mat_img(name, os.path.join(d, '0001.png'), emit, alpha)
    img = tex.image; img.source = 'SEQUENCE'; iu = tex.image_user
    iu.frame_duration = 1; iu.frame_start = 1; iu.use_auto_refresh = True; iu.use_cyclic = False
    return m, iu
def mat_col(name, hexc, rough=.4, metal=0., emit=0., emit_hex=None):
    m = bpy.data.materials.new(name); m.use_nodes = True; bs = m.node_tree.nodes['Principled BSDF']
    bs.inputs['Base Color'].default_value = (*lin(hexc), 1); bs.inputs['Roughness'].default_value = rough; bs.inputs['Metallic'].default_value = metal
    if emit: bs.inputs['Emission Color'].default_value = (*lin(emit_hex or hexc), 1); bs.inputs['Emission Strength'].default_value = emit
    return m
BODY = mat_col('panel_body', '#0b1024', .3, emit=1.2, emit_hex='#3a55e8')
def slab(name, w, h, loc, mat, depth=.04, body=BODY, upright=False, bevel=.012):
    """界面板：正面贴图，侧面发蓝光。upright=True 时立起来（正面朝 -Y）"""
    bpy.ops.mesh.primitive_plane_add(size=1); o = bpy.context.object; o.name = name
    o.scale = (w, h, 1); bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(mat); o.data.materials.append(body)
    sol = o.modifiers.new('thick', 'SOLIDIFY'); sol.thickness = depth; sol.offset = -1; sol.material_offset = 1
    if bevel: b = o.modifiers.new('bev', 'BEVEL'); b.width = bevel; b.segments = 2
    if upright: o.rotation_euler = (R(90), 0, 0)
    o.location = loc; return o
def box(name, size, loc, mat, bevel=.01):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o = bpy.context.object; o.name = name; o.scale = size
    bpy.ops.object.transform_apply(scale=True); o.data.materials.append(mat)
    if bevel: b = o.modifiers.new('bev', 'BEVEL'); b.width = bevel; b.segments = 3
    return o

w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True
bg = w.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (*lin('#16224f'), 1)
random.seed(7)
for i in range(160):   # 远处光斑
    x, y, z = random.uniform(-4, 14), random.uniform(3, 10), random.uniform(-2, .3)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=random.uniform(.02, .06), location=(x, y, z), segments=10, ring_count=5)
    bpy.context.object.data.materials.append(mat_col(f'dot{i}', '#000000', emit=random.uniform(1, 3), emit_hex=random.choice(['#4d6bfe', '#7f95ff', '#fb7299'])))
bpy.ops.mesh.primitive_plane_add(size=80, location=(5, 0, -.45)); bpy.context.object.data.materials.append(mat_col('floor_m', '#060a1c', .22))

# 角色：用四元数控制旋转；「中心点」在身体中间，翻滚时绕中心转
bpy.ops.import_scene.gltf(filepath=A.model)
dfy = bpy.data.objects.new('DFY', None); sc.collection.objects.link(dfy)
for o in bpy.context.selected_objects:
    if o.parent is None: o.parent = dfy
    if o.type == 'MESH': o.scale = (CH, CH, CH)
dfy.rotation_mode = 'QUATERNION'
CEN = CH * .5
def yawq(deg): return Quaternion((0, 0, 1), R(deg))
def place(center, q, sx=1., sz=1.):
    """center：身体中心的世界坐标；q：朝向四元数；sx/sz：压扁拉长（相对身体中心）"""
    off = q @ Vector((0, 0, -CEN * sz))
    return Vector(center) + off, q, (sx, sx, sz)

# 镜头 + 跟着她走的三盏灯
cd = bpy.data.cameras.new('CAM'); cam = bpy.data.objects.new('CAM', cd); sc.collection.objects.link(cam); sc.camera = cam
cd.sensor_fit = 'VERTICAL'; cd.sensor_height = 24; cd.clip_start = .02; cd.dof.use_dof = True; cd.dof.aperture_fstop = 2.8
def area(name, size, energy, spec=1.):
    ld = bpy.data.lights.new(name, 'AREA'); ld.size = size; ld.energy = energy; ld.specular_factor = spec
    o = bpy.data.objects.new(name, ld); sc.collection.objects.link(o); return o
KEY, RIM, FILL = area('key', 1.0, 35, .3), area('rim', .8, 35), area('fill', 3, 18, 0)
def aim(o, frm, to): o.location = frm; o.rotation_euler = (Vector(to) - Vector(frm)).to_track_quat('-Z', 'Y').to_euler()

KEYS = []   # (帧, 函数)：逐帧设置并打关键帧
def key_obj(o, f, loc=None, rot=None, scale=None):
    if loc is not None: o.location = loc; o.keyframe_insert('location', frame=f)
    if rot is not None:
        if o.rotation_mode == 'QUATERNION': o.rotation_quaternion = rot; o.keyframe_insert('rotation_quaternion', frame=f)
        else: o.rotation_euler = rot; o.keyframe_insert('rotation_euler', frame=f)
    if scale is not None: o.scale = scale; o.keyframe_insert('scale', frame=f)
def key_cam(f, loc, look, fov, roll=0., focus=None):
    loc, look = Vector(loc), Vector(look)
    q = (look - loc).to_track_quat('-Z', 'Y'); q = q @ Quaternion((0, 0, 1), R(roll))
    cam.rotation_mode = 'QUATERNION'; key_obj(cam, f, loc=loc, rot=q)
    cd.lens = cd.sensor_height / (2 * math.tan(R(fov) / 2)); cd.keyframe_insert('lens', frame=f)
    cd.dof.focus_distance = (loc - Vector(focus)).length if focus else (loc - look).length; cd.dof.keyframe_insert('focus_distance', frame=f)
def key_lights(f, p):
    p = Vector(p); p.z = 0
    aim(KEY, p + Vector((.8, -1.2, 1.5)), p + Vector((0, 0, CEN))); aim(RIM, p + Vector((-.7, 1.0, 1.0)), p + Vector((0, 0, CEN)))
    aim(FILL, p + Vector((0, -1.4, 2.6)), p)
    for o in (KEY, RIM, FILL): o.keyframe_insert('location', frame=f); o.keyframe_insert('rotation_euler', frame=f)
def key_seq(iu, f, idx): iu.frame_offset = idx; iu.keyframe_insert('frame_offset', frame=f)
def shake(t, hits, amp=.02, dec=.25):
    """镜头震动：每个冲击时刻后衰减的抖动"""
    v = Vector((0, 0, 0))
    for h in hits:
        dt = t - h
        if 0 <= dt < 1.2:
            e = amp * math.exp(-dt / dec)
            v += Vector((math.sin(dt * 71) * e, math.sin(dt * 53 + 1) * e * .5, math.sin(dt * 89 + 2) * e))
    return v

# ======================================================================= 段 B：服务器繁忙
B = BT.B; OB = Vector((20, 0, 0))   # 这一段的场地放在 x=20，和别的段互不干扰
chat_m, _ = mat_img('chat_b', os.path.join(UI, 'chat_b.png'), .7)
chat = slab('chat_b', 1.5, 1.5 * 1500 / 1080, OB, chat_m)
btn_m, _ = mat_img('btn', os.path.join(UI, 'btn.png'), 1.1)
BTN = OB + Vector((-.1, -.25, 0)); BTN_H = .05
btn = slab('btn', .5, .5 * 160 / 520, BTN + Vector((0, 0, BTN_H)), btn_m, depth=BTN_H, body=mat_col('btn_body', '#2e45b8', .3, emit=.6))
busy_m, _ = mat_img('busy', os.path.join(UI, 'busy.png'), .95)
BUSY = OB + Vector((.15, .22, .06))
busy = slab('busy', 1.0, 1.0 * 440 / 1000, BUSY + Vector((0, 0, .03)), busy_m, depth=.03, body=mat_col('busy_body', '#ff8a3d', .4, emit=1.2))   # 橙色描边，和白底区分开
# 光标：箭头形状挤出
def cursor_mesh():
    import bmesh
    pts = [(0, 0), (0, -.18), (.045, -.135), (.075, -.205), (.1, -.193), (.07, -.125), (.13, -.125)]
    me = bpy.data.meshes.new('cursor'); bm = bmesh.new(); vs = [bm.verts.new((x, y, 0)) for x, y in pts]; bm.faces.new(vs)
    bmesh.ops.extrude_face_region(bm, geom=bm.faces[:]); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('cursor', me); sc.collection.objects.link(o)
    sol = o.modifiers.new('s', 'SOLIDIFY'); sol.thickness = .02
    o.data.materials.append(mat_col('cursor_m', '#ffffff', .3, emit=.4)); return o
cur = cursor_mesh(); cur.scale = (1.0, 1.0, 1.0)

def seg_b(f, t):
    cl, hs = B['clicks'], B['heights']
    # --- 光标：从右上方飞进来，悬在按钮上方，每次点击按下去
    base = BTN + Vector((.06, .02, .2))
    k = smooth((t - B['t0']) / .22); p = base.lerp(base + Vector((.9, .5, .4)), 1 - k)
    press = 0.
    for c in cl:
        dt = t - c
        if -.06 < dt < .1: press = max(press, 1 - abs(dt + .0) / .1 if dt >= 0 else 1 + dt / .06)
    p = p + Vector((0, 0, -.15 * press))
    if t > B['busy']: p = p + Vector((.55, .45, .35)) * smooth((t - B['busy']) / .3)   # 弹窗出来后光标退开
    key_obj(cur, f, loc=p, rot=Euler((R(15), 0, R(-25))))
    key_obj(btn, f, scale=(1, 1, 1 - .6 * press))
    # --- 她：站在按钮上 → 被弹飞（高度一次比一次高，空中乱转）→ 第 4 次飞得最高，慢慢落到弹窗上瘫平
    top = BTN.z + BTN_H
    cen = Vector((BTN.x, BTN.y, top + CEN)); q = yawq(-70); sx = sz = 1.
    i = max([j for j, c in enumerate(cl) if t >= c], default=-1)
    if i < 0:   # 还没被点：站着，轻轻呼吸
        sz = 1 - .02 * math.sin(t * 9); sx = 1 + .01 * math.sin(t * 9)
    else:
        c, h = cl[i], hs[i]
        last = i == len(cl) - 1
        g = G * (.55 if last else 1.)                    # 最后一跳慢动作
        v0 = math.sqrt(2 * g * h); dt = t - c
        air = 2 * v0 / g
        rnd = random.Random(i)
        axis = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-.3, .3))).normalized()
        turns = [.5, 1, 1.5, 2.2][i]
        if not last:
            if dt < air:
                z = v0 * dt - .5 * g * dt * dt
                cen = Vector((BTN.x + .03 * math.sin(dt * 9), BTN.y, top + CEN + z))
                q = Quaternion(axis, R(360 * turns) * smooth(dt / air)) @ yawq(-70 + 40 * i)
                sz, sx = 1 + .15 * (1 - dt / air * 2) ** 2, 1 - .06
            else:   # 落回按钮：压扁回弹，有点晕（左右晃）
                d2 = dt - air; sq = .3 * math.exp(-d2 * 12) * math.cos(d2 * 30)
                sz, sx = 1 - sq, 1 + sq * .6
                q = yawq(-70 + 40 * i) @ Quaternion((1, 0, 0), R(8 * math.sin(d2 * 14) * math.exp(-d2 * 3) * (i + 1)))
        else:
            # 最后一飞：抛物线飞到弹窗中心，翻两圈多，落地变成躺平
            land = B['splat']; T = land - c
            start = Vector((BTN.x, BTN.y, top + CEN)); end = Vector((BUSY.x, BUSY.y, BUSY.z + .03 + CEN * .45))
            u = clamp01(dt / T)
            hz = h * 4 * u * (1 - u)
            cen = start.lerp(end, u) + Vector((0, 0, hz))
            q_lie = yawq(150) @ Quaternion((0, 1, 0), R(-90))   # 仰面躺下（脸朝上）
            q_spin = Quaternion(axis, R(360 * turns) * smooth(u)) @ yawq(-70 + 40 * i)
            q = q_spin.slerp(q_lie, smooth((u - .7) / .3))
            if dt >= T:   # 瘫平 + 抽两下
                d2 = dt - T; cen = end.copy(); q = q_lie
                sq = .35 * math.exp(-d2 * 10) * math.cos(d2 * 28)
                for tw in B['twitch']:
                    e = t - tw
                    if 0 <= e < .12: sq += .12 * math.sin(e / .12 * math.pi)
                sz, sx = 1 - sq * .5, 1 + sq * .3
    key_obj(dfy, f, *place(cen, q, sx, sz))
    # --- 弹窗：从 0 放大弹出
    s = back_out((t - B['busy']) / .25) if t >= B['busy'] else 0.001
    key_obj(busy, f, scale=(s, s, max(s, .001)))
    em = chat_m.node_tree.nodes['Emission'].inputs['Strength']   # 弹窗出来时整页变暗
    em.default_value = .7 - .45 * smooth((t - B['busy']) / .25); em.keyframe_insert('default_value', frame=f)
    # --- 镜头：贴地低机位固定，每次弹飞震一下；最后一跳慢慢推近弹窗
    k2 = smooth((t - 9.45) / .5)                  # 最后一飞：镜头先仰起来跟着她，再推近弹窗
    up = smooth((t - 8.95) / .25) * (1 - k2)
    loc = OB + Vector((.3, -1.9, .62)).lerp(Vector((.42, -1.25, .78)), k2) + shake(t, cl, .018)
    look = OB + Vector((-.05, -.1, .32 + .28 * up)).lerp(BUSY - OB + Vector((-.02, -.05, .05)), k2)
    key_cam(f, loc, look, 42 - 6 * k2, roll=-3, focus=cen)
    key_lights(f, cen)

# ======================================================================= 段 E：骑滚动条 → 急停 → 思考框
E = BT.E; OE = Vector((0, 0, 0))
FW, FH = 1.5, 1.5 * 2400 / 1080
feed_m, feed_iu = mat_seq('feed', [os.path.join(UI, f'feed{k}.png') for k in range(9)])
feed = slab('feed', FW, FH, OE, feed_m)
RAIL_X = OE.x + FW / 2 + .07; Y_TOP, Y_BOT = OE.y + FH / 2 - .35, OE.y - FH / 2 + .3
box('rail', (.05, FH - .2, .025), (RAIL_X, OE.y, .0125), mat_col('rail_m', '#1a2350', .3, emit=1.5, emit_hex='#3a55e8'))
thumb = box('thumb', (.12, .42, .05), (RAIL_X, Y_TOP, .05), mat_col('thumb_m', '#e9ecf8', .25, emit=.4, emit_hex='#9fb0ff'), bevel=.02)
TH_TOP = .075
def row_y(i): return OE.y + FH / 2 - (200 + 130 * 2 * 0 + 260 * i + 130) / 2400 * FH   # 第 i 行评论中心（图上 200+260i+130 px）
q_m, _ = mat_img('q', os.path.join(UI, 'q.png'), 1.1)
QC = OE + Vector((-.38, -1.12, 0))
qcard = slab('qcard', .62, .62 * 230 / 760, QC + Vector((0, 0, 8)), q_m, depth=.03, body=mat_col('q_body', '#d8dcea', .4))
think_m, think_iu = mat_seq('think', [os.path.join(UI, f'think{n:02d}.png') for n in BT.think_steps()], 1.2, alpha=True)
think = slab('think', .78, .78 * 460 / 1000, (0, 0, -5), think_m, depth=.012, upright=True, body=mat_col('think_body', '#4d6bfe', .3, emit=1.5))
reply_m, _ = mat_img('reply', os.path.join(UI, 'reply.png'), 1.1)
RP = OE + Vector((.28, -.78, 0))
reply = slab('reply', .58, .58 * 200 / 900, RP + Vector((2.5, 0, .025)), reply_m, depth=.02)

# 镜头用弹簧跟随（她突然停下时镜头会冲过头再回来）
SPR = {'p': None, 'v': Vector((0, 0, 0)), 'l': None, 'lv': Vector((0, 0, 0))}
def spring(key, target, k=60., c=9.):
    dt = 1 / FPS
    if SPR[key] is None: SPR[key] = Vector(target); return Vector(target)
    vk = 'v' if key == 'p' else 'lv'
    a = (Vector(target) - SPR[key]) * k - SPR[vk] * c
    for _ in range(4):   # 分 4 个小步积分，稳定
        SPR[vk] += a * dt / 4; SPR[key] += SPR[vk] * dt / 4; a = (Vector(target) - SPR[key]) * k - SPR[vk] * c
    return SPR[key].copy()

def seg_e(f, t):
    s0, s1 = E['slide']
    # --- 滑块：从顶部滑到底（越滑越快），到底时"咚"一下
    u = clamp01((t - s0) / (s1 - s0)); ue = u * u
    ty = Y_TOP + (Y_BOT - Y_TOP) * ue
    bump = .03 * math.exp(-max(0, t - s1) * 12) * math.sin(max(0, t - s1) * 40) if t > s1 else 0
    key_obj(thumb, f, loc=(RAIL_X, ty + bump, .05))
    # 评论头像随滑块经过一行行翻成她
    k = sum(1 for i in range(8) if ty < row_y(i) + .05)
    key_seq(feed_iu, f, k)
    # --- 她
    q, sx, sz = yawq(-90), 1., 1.
    if t < E['hop_off']:
        lean = 0.
        if t < s0:   # 蓄力下蹲
            d = clamp01((t - E['t0']) / (s0 - E['t0'])); sz, sx = 1 - .18 * smooth(d), 1 + .1 * smooth(d)
        else:
            vel = 2 * u / (s1 - s0); lean = min(25, 14 * vel)   # 越快越往后仰
            sz = 1 - .05 * math.sin(t * 30) * u
        cen = Vector((RAIL_X, ty, TH_TOP + .05 + CEN * sz))
        q = yawq(-90) @ Quaternion((0, 1, 0), R(-lean)) @ Quaternion((1, 0, 0), R(6 * math.sin(t * 7)))
    elif t < E['land']:   # 被甩出去：抛物线落到评论区上，空中侧翻半圈
        T = E['land'] - E['hop_off']; uu = (t - E['hop_off']) / T
        a = Vector((RAIL_X, Y_BOT, TH_TOP + .05 + CEN)); b = Vector((OE.x + .38, OE.y - 1.26, CEN))
        cen = a.lerp(b, uu) + Vector((0, 0, .32 * 4 * uu * (1 - uu)))
        q = yawq(-90 - 90 * smooth(uu)) @ Quaternion((0, 1, 0), R(360 * smooth(uu)))
        sz, sx = 1.1, .95
    else:   # 落地打滑：往 -X 滑，身体后仰，越滑越慢，急停时往前一冲再回正
        T = E['skid_stop'] - E['land']; d = t - E['land']; uu = clamp01(d / T)
        x0, x1 = OE.x + .38, OE.x + .02
        x = x0 + (x1 - x0) * (1 - (1 - uu) ** 2)
        cen = Vector((x, OE.y - 1.26, CEN))
        if d < T:
            tilt = 22 * (1 - uu)                          # 打滑时往后仰（重心在后）
            q = yawq(-115) @ Quaternion((0, 1, 0), R(-tilt))
            sq = .25 * math.exp(-d * 14) * math.cos(d * 30); sz, sx = 1 - sq, 1 + sq * .5
        else:
            d2 = d - T; wob = 14 * math.exp(-d2 * 5) * math.sin(d2 * 16)   # 急停：往前冲再回正
            face = -115
            if t > E['think_in'] - .1: face = -115 - 20 * smooth((t - E['think_in']) / .3)   # 转过去看思考框（脸始终偏向镜头）
            if t > E['look']: face = face + (-90 - face) * smooth((t - E['look']) / .25)    # 僵住，转向镜头
            q = yawq(face) @ Quaternion((0, 1, 0), R(wob))
            # 蹦起来去够思考框
            z = 0.
            for j, r in enumerate(E['reach']):
                tt = t - r; air = .26 - .015 * j
                if 0 <= tt < air: z = max(z, (.1 + .015 * j) * 4 * (tt / air) * (1 - tt / air))
                if 0 <= tt - air < .1: sz = min(sz, 1 - .15 * math.sin((tt - air) / .1 * math.pi))
            if E['reach'][0] - .08 < t < E['reach'][-1] + .3: sz = min(sz, 1 + .12 * math.sin((t - E['reach'][0]) * 20))   # 蹦的时候伸长
            if t > E['look']:   # 僵住：微微缩一下
                e = t - E['look']; sz = 1 - .08 * math.exp(-e * 4) * math.sin(min(e, .3) / .3 * math.pi)
            cen = cen + Vector((0, 0, z))
    key_obj(dfy, f, *place(cen, q, sx, sz))
    # --- 问题卡砸下来
    a, b = E['q_drop']
    z = 8 if t < a else (1.6 * (1 - clamp01((t - a) / (b - a)) ** 2) + .001)
    key_obj(qcard, f, loc=QC + Vector((0, 0, z)))
    # --- 思考框：弹出在她头顶斜上方，她一靠近就往上躲一点
    me = Vector((OE.x + .02, OE.y - 1.26, 0))
    if t < E['think_in']: tl, ts = Vector((0, 0, -5)), .001
    else:
        ts = back_out((t - E['think_in']) / .3)
        dodge = 0.
        for r in E['reach']:
            tt = t - r
            if 0 <= tt < .5: dodge = max(dodge, .05 * math.sin(min(tt / .2, 1) * math.pi / 2) * math.exp(-max(0, tt - .2) * 6))
        tl = me + Vector((-.32, .1, .64 + dodge + .015 * math.sin(t * 4)))
    key_obj(think, f, loc=tl, scale=(ts, ts, ts))
    a, b = E['think_type']; n = len(BT.think_steps())
    key_seq(think_iu, f, min(n - 1, int(clamp01((t - a) / (b - a)) * (n - 1) + .5)))
    # --- 回复从右边滑进来
    rx = 2.5 * (1 - back_out((t - E['reply']) / .3)) if t >= E['reply'] else 2.5
    key_obj(reply, f, loc=RP + Vector((rx, 0, .025 if t >= E['reply'] else -5)))
    # --- 镜头
    if t < E['hop_off'] + .1:      # 滑行：侧前方低机位跟拍，带一点倾斜
        tgt_p = cen + Vector((.3, -1.15, .32)); tgt_l = cen + Vector((-.12, .35, -.12)); fov, roll = 44, -6   # 正前方：她顺着轨道朝镜头冲
    elif t < E['think_in']:        # 打滑急停：镜头被甩过头再弹回
        tgt_p = cen + Vector((.25, -1.15, .4)); tgt_l = cen + Vector((-.2, .15, -.1)); fov, roll = 40, 0
    else:                          # 思考框：猛推，低角度微仰
        k3 = smooth((t - E['think_in']) / .28)
        tgt_p = (cen + Vector((.25, -1.15, .4))).lerp(me + Vector((.1, -1.3, .45)), k3)
        tgt_l = (cen + Vector((-.2, .15, -.1))).lerp(me + Vector((-.1, 0, .42)), k3); fov, roll = 40 - 4 * k3, 2 * k3
        if t > E['reply']: tgt_p = tgt_p + Vector((.1, -.2, .08)) * smooth((t - E['reply']) / .5)
    stiff = 140. if t > E['think_in'] else 60.
    loc = spring('p', tgt_p, stiff, 2 * math.sqrt(stiff) * .55); look = spring('l', tgt_l, stiff * 1.5, 2 * math.sqrt(stiff * 1.5) * .6)
    loc = loc + shake(t, [E['q_drop'][1]], .025)
    key_cam(f, loc, look, fov, roll, focus=Vector((cen.x - .08, cen.y + .04, cen.z)))
    key_lights(f, cen)

# ======================================================================= 逐帧打关键帧
for f in range(BT.fr(B['t0']), BT.fr(B['t1'])): seg_b(f, (f - 1) / FPS)
for f in range(BT.fr(E['t0']) - 15, BT.fr(E['t1'])): seg_e(f, (f - 1) / FPS)   # 提前 15 帧让弹簧稳定
sc.frame_start, sc.frame_end = BT.fr(B['t0']), BT.fr(E['t1']) - 1

os.makedirs(A.out, exist_ok=True)
if A.stills:
    import time
    for f in [int(x) for x in A.stills.split(',')]:
        t0 = time.time(); sc.frame_set(f); sc.render.filepath = os.path.join(A.out, f'still_{f:04d}.png'); sc.render.use_overwrite = True
        bpy.ops.render.render(write_still=True); print(f'STILL {f} {time.time() - t0:.1f}s')
elif A.render:
    if A.frames: a, b = A.frames.split('-'); sc.frame_start, sc.frame_end = int(a), int(b)
    sc.render.filepath = os.path.join(A.out, 'f_'); bpy.ops.render.render(animation=True)
