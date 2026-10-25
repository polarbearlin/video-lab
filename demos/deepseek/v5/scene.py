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
    for k, v in (('Coat Weight', .5), ('Coat Roughness', .08)):   # 玻璃面：能反出光斑和灯
        if k in bs.inputs: bs.inputs[k].default_value = v
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
    o.scale = (w, h, 1); bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(mat); o.data.materials.append(body)
    sol = o.modifiers.new('thick', 'SOLIDIFY'); sol.thickness = depth; sol.offset = -1; sol.material_offset = 1
    if bevel: b = o.modifiers.new('bev', 'BEVEL'); b.width = bevel; b.segments = 2
    if upright: o.rotation_euler = (R(90), 0, 0)
    o.location = loc; return o
def box(name, size, loc, mat, bevel=.01):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o = bpy.context.object; o.name = name; o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True); o.data.materials.append(mat)   # 只固化缩放，位置留在物体上
    if bevel: b = o.modifiers.new('bev', 'BEVEL'); b.width = bevel; b.segments = 3
    return o

w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True
bg = w.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (*lin('#140d1e'), 1); bg.inputs['Strength'].default_value = .6
# 昏暗房间里的彩色灯（景深一虚就是光斑）：暖黄、粉、紫、青
random.seed(7)
BOKEH = ['#ffb35c', '#ffcf7a', '#ff6fa8', '#b07bff', '#5fd8ff', '#fff1d6']
for i in range(55):
    x, y, z = random.uniform(-5, 70), random.uniform(3.5, 12), random.uniform(.9, 3.2)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=random.uniform(.03, .14), location=(x, y, z), segments=12, ring_count=6)
    bpy.context.object.data.materials.append(mat_col(f'dot{i}', '#000000', emit=random.uniform(2, 7), emit_hex=random.choice(BOKEH)))
# 桌面：深色木纹（程序纹理）
def mat_desk():
    m = bpy.data.materials.new('desk'); m.use_nodes = True; nt = m.node_tree; bs = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1, 6, 1)
    wv = nt.nodes.new('ShaderNodeTexWave'); wv.inputs['Scale'].default_value = 1.2; wv.inputs['Distortion'].default_value = 6; wv.inputs['Detail'].default_value = 4
    cr = nt.nodes.new('ShaderNodeValToRGB'); cr.color_ramp.elements[0].color = (*lin('#120c0a'), 1); cr.color_ramp.elements[1].color = (*lin('#2c1f19'), 1)
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector']); nt.links.new(mp.outputs[0], wv.inputs['Vector']); nt.links.new(wv.outputs['Color'], cr.inputs[0])
    nt.links.new(cr.outputs[0], bs.inputs['Base Color']); bs.inputs['Roughness'].default_value = .38
    return m
bpy.ops.mesh.primitive_plane_add(size=60, location=(10, 0, -.04)); bpy.context.object.data.materials.append(mat_desk())
BEZEL = mat_col('bezel', '#0a0a0c', .18, metal=.6)
def device(name, w, h, loc, mat, border=.05, radius=.07):
    """真实设备：黑色圆角机身（厚 3.5cm）+ 屏幕（自发光 + 玻璃清漆）"""
    box(name + '_body', (w + 2 * border, h + 2 * border, .036), Vector(loc) + Vector((0, 0, -.018 + .002)), BEZEL, bevel=radius)
    bpy.ops.mesh.primitive_plane_add(size=1); o = bpy.context.object; o.name = name; o.scale = (w, h, 1); bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(mat); o.location = Vector(loc) + Vector((0, 0, .0025)); return o

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
cd.sensor_fit = 'VERTICAL'; cd.sensor_height = 24; cd.clip_start = .02; cd.dof.use_dof = True; cd.dof.aperture_fstop = 2.0
def area(name, size, energy, spec=1.):
    ld = bpy.data.lights.new(name, 'AREA'); ld.size = size; ld.energy = energy; ld.specular_factor = spec
    o = bpy.data.objects.new(name, ld); sc.collection.objects.link(o); return o
KEY, RIM, FILL = area('key', 1.0, 55, .12), area('rim', .8, 45, .35), area('fill', 3, 0, 0)
for _l, _e in ((KEY, 260), (RIM, 220)):   # 都用聚光灯：玻璃屏上只反出小亮点，不会有大方块倒影
    _l.data.type = 'SPOT'; _l.data.spot_size = R(55); _l.data.spot_blend = .7; _l.data.shadow_soft_size = .04; _l.data.energy = _e
KEY.data.color = lin('#ffd9b8'); RIM.data.color = lin('#c58bff')   # 暖色主光 + 紫色轮廓光
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


def hop_pose(t, t0, t1, p0, p1, h, yaw0, yaw1, flip=0., spin=0., lean=22.):
    """一次"灵活"的跳：起跳前蓄力下蹲 → 干脆起跳（拉长、往前倾）→ 空中转身/翻 → 落地压扁回弹、往前冲一下再回正。
    p0/p1 是脚下的点；返回 (身体中心, 朝向, sx, sz)"""
    p0, p1 = Vector(p0), Vector(p1); d = p1 - p0; d.z = 0; L = d.length
    dv = d.normalized() if L > 1e-4 else Vector((math.cos(R(yaw1)), math.sin(R(yaw1)), 0))
    ax = Vector((0, 0, 1)).cross(dv)                       # 前倾 / 后仰的转轴（左方向）
    if t < t0:                                             # 蓄力
        a = clamp01((t - (t0 - .12)) / .12); sq = .24 * smooth(a)
        return p0 + Vector((0, 0, CEN * (1 - sq))), Quaternion(ax, R(-8 * a)) @ yawq(yaw0), 1 + sq * .5, 1 - sq
    if t < t1:                                             # 空中
        u = (t - t0) / (t1 - t0); e = 1 - (1 - u) ** 1.6   # 水平方向前快后慢
        st = .2 * (1 - u) ** 2 + .1 * u ** 4
        pitch = (lean * math.sin(math.pi * u) if L > .05 else 0) + 360 * flip * smooth(u)
        q = Quaternion(ax, R(pitch)) @ yawq(yaw0 + (yaw1 - yaw0) * smooth(u) + 360 * spin * smooth(u))
        return p0.lerp(p1, e) + Vector((0, 0, CEN * (1 + st) + h * 4 * u * (1 - u))), q, 1 - st * .4, 1 + st
    d2 = t - t1                                            # 落地
    sq = .3 * math.exp(-d2 * 13) * math.cos(d2 * 28); tf = (14 if L > .05 else 6) * math.exp(-d2 * 8) * math.sin(d2 * 20)
    return p1 + Vector((0, 0, CEN * (1 - sq))), Quaternion(ax, R(tf)) @ yawq(yaw1), 1 + sq * .5, 1 - sq

# ======================================================================= 段 B：服务器繁忙
B = BT.B; OB = Vector((60, 0, 0))   # 这一段的场地放在 x=20，和别的段互不干扰
chat_m, _ = mat_img('chat_b', os.path.join(UI, 'scr_chat_b.png'), .9)
chat = device('chat_b', 2.6, 2.6 * 1024 / 1536, OB + Vector((.015, -.44, 0)), chat_m)   # 让图上「思考中」下方正好是按钮位置
btn_m, _ = mat_img('btn', os.path.join(UI, 'btn.png'), 1.1)
BTN = OB + Vector((-.1, -.25, 0)); BTN_H = .05
btn = slab('btn', .5, .5 * 160 / 520, BTN + Vector((0, 0, BTN_H)), btn_m, depth=BTN_H, body=mat_col('btn_body', '#2e45b8', .3, emit=.6))
busy_m, _ = mat_img('busy', os.path.join(UI, 'scr_busy.png'), 1.0)
BUSY = OB + Vector((.15, .22, .06))
busy = slab('busy', 1.0, 1.0 * 440 / 1000, BUSY + Vector((0, 0, .03)), busy_m, depth=.03, body=mat_col('busy_body', '#ffb040', .4, emit=1.5))   # 橙色发光边
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
    em.default_value = .9 - .55 * smooth((t - B['busy']) / .25); em.keyframe_insert('default_value', frame=f)
    # --- 镜头：贴地低机位固定，每次弹飞震一下；最后一跳慢慢推近弹窗
    k2 = smooth((t - 9.45) / .5)                  # 最后一飞：镜头先仰起来跟着她，再推近弹窗
    up = smooth((t - 8.95) / .25) * (1 - k2)
    loc = OB + Vector((.3, -1.75, 1.05)).lerp(Vector((.42, -1.2, 1.0)), k2) + shake(t, cl, .018)
    look = OB + Vector((-.02, -.05, .2 + .35 * up)).lerp(BUSY - OB + Vector((-.02, -.05, .05)), k2)
    key_cam(f, loc, look, 42 - 6 * k2, roll=-3, focus=cen)
    key_lights(f, cen)

# ======================================================================= 段 E：骑滚动条 → 急停 → 思考框
E = BT.E; OE = Vector((0, 0, 0))
FW, FH = 1.35, 1.35 * 1536 / 1024
feed_m, _ = mat_img('feed', os.path.join(UI, 'scr_comments.png'), .95)
feed = device('feed', FW, FH, OE, feed_m)
RAIL_X = OE.x + FW / 2 - .05; Y_TOP, Y_BOT = OE.y + FH / 2 - .3, OE.y - FH / 2 + .3
def mat_rainbow():
    """发光彩虹轨道：沿长度方向 粉 → 紫 → 蓝 → 青"""
    m = bpy.data.materials.new('rail'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); tc = nt.nodes.new('ShaderNodeTexCoord'); sp = nt.nodes.new('ShaderNodeSeparateXYZ')
    cr = nt.nodes.new('ShaderNodeValToRGB'); el = cr.color_ramp.elements
    el[0].color = (*lin('#ff4f9a'), 1); el[1].position = 1; el[1].color = (*lin('#38e1ff'), 1)
    for p, c in ((.35, '#b25bff'), (.65, '#4d6bfe')): e = el.new(p); e.color = (*lin(c), 1)
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 6
    nt.links.new(tc.outputs['Generated'], sp.inputs[0]); nt.links.new(sp.outputs['Y'], cr.inputs[0]); nt.links.new(cr.outputs[0], em.inputs['Color']); nt.links.new(em.outputs[0], out.inputs['Surface'])
    return m
box('rail', (.035, FH - .25, .02), (RAIL_X, OE.y, .012), mat_rainbow(), bevel=.008)
# 轨道在屏幕上的柔光（一条更宽的半透明发光带）
bpy.ops.mesh.primitive_plane_add(size=1, location=(RAIL_X, OE.y, .003)); _g = bpy.context.object; _g.scale = (.16, FH - .2, 1)
_gm = mat_rainbow(); _gm.node_tree.nodes['Emission'].inputs['Strength'].default_value = .8; _g.data.materials.append(_gm)
thumb = box('thumb', (.1, .36, .045), (RAIL_X, Y_TOP, .05), mat_col('thumb_m', '#ffffff', .2, emit=2.0, emit_hex='#ffffff'), bevel=.02)
TH_TOP = .075
def row_y(i): return OE.y + FH / 2 - (200 + 130 * 2 * 0 + 260 * i + 130) / 2400 * FH   # 第 i 行评论中心（图上 200+260i+130 px）
q_m, _ = mat_img('q', os.path.join(UI, 'scr_q.png'), 1.0)
QC = OE + Vector((-.4, -.46, 0))
qcard = slab('qcard', .7, .7 * 400 / 1520, QC + Vector((0, 0, -5)), q_m, depth=.03, body=mat_col('q_body', '#d8dcea', .4))
think_m, think_iu = mat_seq('think', [os.path.join(UI, f'scr_think{n:02d}.png') for n in BT.think_steps()], 1.1)
think = slab('think', .78, .78 * 1024 / 1536, (0, 0, -5), think_m, depth=.012, upright=True, body=mat_col('think_body', '#4d6bfe', .3, emit=1.5))
reply_m, _ = mat_img('reply', os.path.join(UI, 'scr_reply.png'), 1.0)
RP = OE + Vector((.22, -.28, 0))
reply = slab('reply', .62, .62 * 400 / 1520, RP + Vector((2.5, 0, .025)), reply_m, depth=.02)

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
    # --- 她
    TOP = TH_TOP + .002; ME = Vector((OE.x - .05, OE.y - .62, 0))
    LAND_P = Vector((OE.x + .3, OE.y - .62, 0))
    if t < s0 - .02:   # 从屏幕上一跳，跳上滑块
        cen, q, sx, sz = hop_pose(t, E['t0'] + .05, s0 - .05, (RAIL_X - .4, Y_TOP + .1, 0), (RAIL_X, Y_TOP, TOP), .22, -40, -90, spin=0)
        cen = cen + Vector((0, 0, TOP * smooth((t - E['t0'] - .05) / (s0 - E['t0'] - .1))))
    elif t < E['hop_off'] - .1:   # 冲浪：压低重心、往后仰、左右摆，经过每行评论颠一下
        vel = 2 * u / (s1 - s0)
        lean = min(28, 10 + 12 * vel); sway = 12 * math.sin(t * 6.5) * (.4 + .6 * u)
        bump = .012 * abs(math.sin((Y_TOP - ty) / (FH / 9.2) * math.pi))
        sz = .9 + .03 * math.sin(t * 13); sx = 1.04
        cen = Vector((RAIL_X, ty, TOP + CEN * sz + bump))
        q = yawq(-90 + 10 * math.sin(t * 3.3)) @ Quaternion((1, 0, 0), R(sway)) @ Quaternion((0, 1, 0), R(-lean))
    elif t < E['land'] + .5:   # 到底被甩出去：往前翻一圈，落地
        cen, q, sx, sz = hop_pose(t, E['hop_off'], E['land'], (RAIL_X, Y_BOT, TOP), LAND_P, .3, -90, -125, flip=1, lean=0)
        if t > E['land']:   # 落地后接打滑（下面）
            T = E['skid_stop'] - E['land']; d = t - E['land']; uu = clamp01(d / T)
            x = LAND_P.x + (ME.x - LAND_P.x) * (1 - (1 - uu) ** 2)
            spinz = -125 + 25 * smooth(uu)                       # 一边滑一边被甩得转身
            tilt = 24 * (1 - uu) if d < T else -16 * math.exp(-(d - T) * 6) * math.sin((d - T) * 18)   # 后仰 → 急停往前冲
            sq = .3 * math.exp(-d * 13) * math.cos(d * 28)
            cen = Vector((x, ME.y, CEN * (1 - sq))); q = yawq(spinz) @ Quaternion((0, 1, 0), R(-tilt)); sx, sz = 1 + sq * .5, 1 - sq
    else:
        face = -100 - 30 * smooth((t - E['think_in']) / .25) if t > E['think_in'] - .05 else -100
        cen, q, sx, sz = ME + Vector((0, 0, CEN)), yawq(face), 1., 1.
        # 蹦起来去够思考框：一次比一次急，左右乱扭，伸长身体
        for j, r in enumerate(E['reach']):
            air = .25 - .012 * j; t0 = r - air
            if t0 - .12 <= t < r + .25:
                yj = face + (18 if j % 2 else -18)
                cen, q, sx, sz = hop_pose(t, t0, r, ME, ME, .11 + .015 * j, face, yj, lean=0)
                if t0 <= t < r:   # 在空中往思考框那边探
                    u2 = (t - t0) / air; q = Quaternion((0, 1, 0), R(-16 * math.sin(math.pi * u2))) @ q; sz *= 1 + .1 * math.sin(math.pi * u2)
                face = yj
        if t > E['look']:   # 僵住：猛地转向镜头，然后发抖
            e = t - E['look']; q = yawq(face + (-88 - face) * smooth(e / .12))
            cen = ME + Vector((.004 * math.sin(e * 90) * math.exp(-e * 3), 0, CEN))
            sz = 1 - .1 * math.exp(-e * 5); sx = 1 + .05 * math.exp(-e * 5)
    key_obj(dfy, f, *place(cen, q, sx, sz))
    # --- 问题卡砸下来
    a, b = E['q_drop']
    z = -5 if t < a else (1.6 * (1 - clamp01((t - a) / (b - a)) ** 2) + .001)
    key_obj(qcard, f, loc=QC + Vector((0, 0, z)))
    # --- 思考框：弹出在她头顶斜上方，她一靠近就往上躲一点
    me = Vector((OE.x - .05, OE.y - .62, 0))
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
        ang = R(35 - 65 * smooth((t - s0) / (s1 - s0)))   # 一边跟一边绕：从右前方转到左前方
        off = Quaternion((0, 0, 1), ang) @ Vector((0, -1.3, 0)); tgt_p = cen + off + Vector((0, 0, .75)); tgt_l = cen + Vector((0, .25, -.18)); fov, roll = 44, -6 * math.cos(ang)
    elif t < E['think_in']:        # 打滑急停：镜头被甩过头再弹回
        tgt_p = cen + Vector((.25, -1.25, .75)); tgt_l = cen + Vector((-.2, .15, -.15)); fov, roll = 40, 0
    else:                          # 思考框：猛推，低角度微仰
        k3 = smooth((t - E['think_in']) / .28)
        tgt_p = (cen + Vector((.25, -1.25, .75))).lerp(me + Vector((.1, -1.35, .6)), k3)
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
