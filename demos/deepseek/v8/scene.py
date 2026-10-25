# 《大肥鱼 · 自我介绍》v8 · 前 30 秒，一镜到底（Blender 4.2+ / 5.x，EEVEE）
# 先跑：python3 demos/deepseek/v5/ui.py && python3 demos/deepseek/v6/ui.py && python3 demos/deepseek/v7/ui.py && python3 demos/deepseek/v8/ui.py
# 预览： blender -b --factory-startup -P demos/deepseek/v8/scene.py -- --stills 60,150,200,260,400,480,640,720,840 --scale 30
# 整片： blender -b --factory-startup -P demos/deepseek/v8/scene.py -- --render [--frames 1-300]（已渲的帧会跳过）
import bpy, math, os, sys, json, argparse, random
from mathutils import Vector, Quaternion, Matrix

HERE = os.path.dirname(os.path.abspath(__file__)); DS = os.path.dirname(HERE); REPO = os.path.abspath(os.path.join(DS, '../..'))
sys.path.insert(0, HERE)
import plan as P
ap = argparse.ArgumentParser()
ap.add_argument('--model', default=os.path.join(REPO, 'assets/models/dafeiyu_chibi/dafeiyu_chibi.glb'))
ap.add_argument('--out', default=os.path.join(DS, 'build/v8render'))
ap.add_argument('--stills', default=''); ap.add_argument('--frames', default=''); ap.add_argument('--render', action='store_true')
ap.add_argument('--scale', type=int, default=100); ap.add_argument('--samples', type=int, default=48)
A = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
UI5, UI6, UI7, UI8 = [os.path.join(DS, f'build/v{k}ui') for k in (5, 6, 7, 8)]
FR = json.load(open(os.path.join(UI8, 'frames.json')))
CH = 0.42; CEN = CH * .5; R = math.radians; FPS = P.FPS
def lin(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in c)
def smooth(a): a = max(0., min(1., a)); return a * a * (3 - 2 * a)
def clamp01(a): return max(0., min(1., a))
def back_out(a, s=1.7): a = clamp01(a) - 1; return a * a * ((s + 1) * a + s) + 1
V = lambda p: Vector(p)

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
if hasattr(sc.render, 'motion_blur_shutter'): sc.render.motion_blur_shutter = .25   # 快门减半，甩镜时不糊成一片
sc.view_settings.view_transform = 'AgX'
try: sc.view_settings.look = 'AgX - Medium High Contrast'
except Exception: pass
sc.render.image_settings.file_format = 'PNG'; sc.render.use_overwrite = False; sc.render.use_placeholder = True

# ======================================================================= 材质 / 物件
def mat_img(name, path, emit=1.0, coat=.5, alpha=False, seq=None):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(path); tex.interpolation = 'Cubic'
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = emit
    bs = nt.nodes.new('ShaderNodeBsdfPrincipled'); bs.inputs['Base Color'].default_value = (0, 0, 0, 1); bs.inputs['Roughness'].default_value = .5
    for k, v in (('Coat Weight', coat * .5), ('Coat Roughness', .12)):
        if k in bs.inputs: bs.inputs[k].default_value = v
    add = nt.nodes.new('ShaderNodeAddShader')
    nt.links.new(tex.outputs['Color'], em.inputs['Color']); nt.links.new(em.outputs[0], add.inputs[0]); nt.links.new(bs.outputs[0], add.inputs[1])
    if alpha:   # 按图片透明度抠形（贴纸）
        tr = nt.nodes.new('ShaderNodeBsdfTransparent'); mx = nt.nodes.new('ShaderNodeMixShader')
        nt.links.new(tex.outputs['Alpha'], mx.inputs[0]); nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(add.outputs[0], mx.inputs[2]); nt.links.new(mx.outputs[0], out.inputs['Surface'])
        if hasattr(m, 'surface_render_method'): m.surface_render_method = 'DITHERED'
    else: nt.links.new(add.outputs[0], out.inputs['Surface'])
    if seq:     # 图像序列：几张状态图，用关键帧切换第几张
        tex.image.source = 'SEQUENCE'; iu = tex.image_user; iu.frame_duration = 1; iu.frame_start = 1; iu.use_auto_refresh = True; iu.use_cyclic = False
        return m, iu
    return m
def seq_dir(name, paths):
    d = os.path.join(UI8, 'seq_' + name); os.makedirs(d, exist_ok=True)
    for i, p in enumerate(paths):
        dst = os.path.join(d, f'{i + 1:04d}.png')
        if os.path.lexists(dst): os.remove(dst)
        os.symlink(os.path.abspath(p), dst)
    return os.path.join(d, '0001.png')
def mat_col(name, hexc, rough=.4, metal=0., emit=0., emit_hex=None):
    m = bpy.data.materials.new(name); m.use_nodes = True; bs = m.node_tree.nodes['Principled BSDF']
    bs.inputs['Base Color'].default_value = (*lin(hexc), 1); bs.inputs['Roughness'].default_value = rough; bs.inputs['Metallic'].default_value = metal
    if emit: bs.inputs['Emission Color'].default_value = (*lin(emit_hex or hexc), 1); bs.inputs['Emission Strength'].default_value = emit
    return m
def box(name, size, loc, mat, bevel=.01, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1); o = bpy.context.object; o.name = name; o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True); o.data.materials.append(mat)
    if bevel: b_ = o.modifiers.new('bev', 'BEVEL'); b_.width = bevel; b_.segments = 3
    o.location = loc; o.rotation_euler = rot; return o
def slab(name, w, h, loc, mat, depth=.03, body=None):
    bpy.ops.mesh.primitive_plane_add(size=1); o = bpy.context.object; o.name = name; o.scale = (w, h, 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(mat); o.data.materials.append(body or mat_col(name + '_b', '#d8dcea', .4))
    s = o.modifiers.new('t', 'SOLIDIFY'); s.thickness = depth; s.offset = -1; s.material_offset = 1
    b_ = o.modifiers.new('bev', 'BEVEL'); b_.width = min(.012, depth * .4); b_.segments = 2
    o.location = loc; return o
BEZEL = mat_col('bezel', '#0a0a0c', .18, metal=.6)
def device(name, mat, border=.05):
    d = P.DEV[name]; w, h = d['size']; c = V((*d['c'], 0))
    box(name + '_body', (w + 2 * border, h + 2 * border, .036), c + V((0, 0, -.016)), BEZEL, bevel=.07)
    bpy.ops.mesh.primitive_plane_add(size=1); o = bpy.context.object; o.name = name; o.scale = (w, h, 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True); o.data.materials.append(mat); o.location = c + V((0, 0, .0025)); return o
def ring(name, center, r, thick, hexc, emit=6.):
    bpy.ops.mesh.primitive_torus_add(major_radius=r, minor_radius=thick, location=center, major_segments=64, minor_segments=8)
    o = bpy.context.object; o.name = name; o.data.materials.append(mat_col(name + '_m', hexc, .3, emit=emit)); return o
def key(o, f, loc=None, rot=None, scale=None):
    if loc is not None: o.location = loc; o.keyframe_insert('location', frame=f)
    if rot is not None:
        if o.rotation_mode == 'QUATERNION': o.rotation_quaternion = rot; o.keyframe_insert('rotation_quaternion', frame=f)
        else: o.rotation_euler = rot; o.keyframe_insert('rotation_euler', frame=f)
    if scale is not None: o.scale = scale; o.keyframe_insert('scale', frame=f)

# ======================================================================= 桌面、房间、设备
w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True
BG = w.node_tree.nodes['Background']; BG.inputs['Color'].default_value = (*lin('#140d1e'), 1); BG.inputs['Strength'].default_value = .8
def mat_desk():
    m = bpy.data.materials.new('desk'); m.use_nodes = True; nt = m.node_tree; bs = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (.15, 1.2, 1)
    wv = nt.nodes.new('ShaderNodeTexWave'); wv.inputs['Scale'].default_value = .5; wv.inputs['Distortion'].default_value = 2.5; wv.inputs['Detail'].default_value = 3; wv.inputs['Detail Scale'].default_value = .6
    cr = nt.nodes.new('ShaderNodeValToRGB'); cr.color_ramp.elements[0].color = (*lin('#4a2f1f'), 1); cr.color_ramp.elements[1].color = (*lin('#9a6a46'), 1)
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector']); nt.links.new(mp.outputs[0], wv.inputs['Vector']); nt.links.new(wv.outputs['Color'], cr.inputs[0])
    nt.links.new(cr.outputs[0], bs.inputs['Base Color']); bs.inputs['Roughness'].default_value = .38
    return m
bpy.ops.mesh.primitive_plane_add(size=1, location=(5, 0, -.034)); d_ = bpy.context.object; d_.scale = (60, 40, 1); d_.data.materials.append(mat_desk())
random.seed(7)
for i in range(90):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=random.uniform(.03, .13), location=(random.uniform(-5, 16), random.uniform(3.5, 11), random.uniform(.9, 3.2)), segments=12, ring_count=6)
    bpy.context.object.data.materials.append(mat_col(f'dot{i}', '#000000', emit=random.uniform(2, 6), emit_hex=random.choice(['#ffb35c', '#ffcf7a', '#ff6fa8', '#b07bff', '#5fd8ff', '#fff1d6'])))

chat_m, chat_iu = mat_img('chat_m', seq_dir('chat', [os.path.join(UI8, f'chat_{i:03d}.png') for i in range(FR['chat_n'])]), .9, seq=True)
device('chat', chat_m)
device('logo', mat_img('logo_m', os.path.join(UI7, 'logo.png'), .9))
store_m, store_iu = mat_img('store_m', seq_dir('store', [os.path.join(UI8, f'store_{p}.png') for p in range(6)]), .9, seq=True)
device('store', store_m)
device('stock', mat_img('stock_m', os.path.join(UI6, 'stock.png'), .9))

# 道具
SX0, SY0, SX1, SY1 = P.STICKER['px']
SLOT = V(P.at('chat', (SX0 + SX1) / 2 / 1536, (SY0 + SY1) / 2 / 1024))
SW = (SX1 - SX0) / 1536 * P.DEV['chat']['size'][0]; SH = (SY1 - SY0) / 1024 * P.DEV['chat']['size'][1]
bpy.ops.mesh.primitive_plane_add(size=1); stk = bpy.context.object; stk.name = 'sticker'; stk.scale = (SW, SH, 1)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
for v in stk.data.vertices: v.co.y += SH / 2          # 原点挪到底边：绕底边揭起来
stk.data.materials.append(mat_img('stk_m', os.path.join(UI7, 'sticker.png'), 1.0, coat=.2, alpha=True))
stk.rotation_mode = 'QUATERNION'; HINGE = SLOT + V((0, -SH / 2, .004))
rips = [ring(f'rip{i}', SLOT + V((0, 0, .004)), .1 + .1 * i, .005, '#8fa6ff', 3 - .8 * i) for i in range(3)]
card = slab('cfish', .62, .62 * 400 / 1520, V(P.at('logo', .2, .33, .4)), mat_img('cfish_m', os.path.join(UI7, 'c_fish.png'), 1.0), depth=.02)
card.rotation_euler = (R(90), 0, R(14)); CARD_LOC = card.location.copy()
plate = slab('plate', .5, .5 * 400 / 1200, V(P.at('logo', .8, .33, .48)), mat_img('plate_m', os.path.join(UI7, 'nameplate.png'), 1.2), depth=.03, body=mat_col('plate_b', '#4d6bfe', .3, emit=1))
plate.rotation_euler = (R(90), 0, R(-14)); PLATE_LOC = plate.location.copy()
u, v0, v1 = [float(x) for x in open(os.path.join(UI6, 'stock_slide.txt')).read().split()]
STOP, SBOT = V(P.at('stock', u, v0 - .05, .45)), V(P.at('stock', u, v1 + .05, .02))   # 缓一点的坡（约 30°），躺着滑才看得出来
dv = STOP - SBOT; ang = math.atan2(dv.z, math.hypot(dv.x, dv.y))
slide = box('slide', (.13, dv.length, .03), SBOT, mat_col('slide_m', '#1fc77e', .25, emit=3.5), bevel=.01)
for v in slide.data.vertices: v.co.y += dv.length / 2       # 原点挪到下端：绿柱先从屏幕里竖起来，再朝上方倒下变成滑梯
SLIDE_ANG = ang
DOWN = (SBOT - STOP).normalized(); NRM = V((1, 0, 0)).cross(DOWN).normalized()
if NRM.z < 0: NRM = -NRM
Q_SLIDE = Matrix((NRM, (-DOWN).cross(NRM), -DOWN)).transposed().to_quaternion() @ Quaternion((0, 0, 1), R(-20))   # 仰面、脚朝前滑

# 角色（刚体模型，脚底为原点、面朝 +X）
bpy.ops.import_scene.gltf(filepath=A.model)
dfy = bpy.data.objects.new('DFY', None); sc.collection.objects.link(dfy); dfy.rotation_mode = 'QUATERNION'
for o in bpy.context.selected_objects:
    if o.parent is None: o.parent = dfy
    if o.type == 'MESH': o.scale = (CH, CH, CH)
# 手办质感：Tripo 导出的材质粗糙度 0.9（几乎全哑光），改成光滑的 PVC + 一层清漆，颜色稍微提亮提饱和
HER = bpy.data.collections.new('HER'); sc.collection.children.link(HER)
for o in [o for o in bpy.data.objects if o.parent == dfy and o.type == 'MESH']:
    HER.objects.link(o)
    for m in o.data.materials:
        nt = m.node_tree; bs = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
        bs.inputs['Roughness'].default_value = .38
        for k, v in (('Coat Weight', .6), ('Coat Roughness', .12), ('Specular IOR Level', .6)):
            if k in bs.inputs: bs.inputs[k].default_value = v
        tex = next((n for n in nt.nodes if n.type == 'TEX_IMAGE'), None)
        if tex and bs.inputs['Base Color'].is_linked:
            hs = nt.nodes.new('ShaderNodeHueSaturation'); hs.inputs['Saturation'].default_value = 1.15; hs.inputs['Value'].default_value = 1.12
            nt.links.new(tex.outputs['Color'], hs.inputs['Color']); nt.links.new(hs.outputs[0], bs.inputs['Base Color'])
def yawq(d): return Quaternion((0, 0, 1), R(d))
def place(center, q, sx=1., sz=1.):
    return V(center) + q @ V((0, 0, -CEN * sz)), q, (sx, sx, sz)

def hop_pose(t, t0, t1, p0, p1, h, yaw0, yaw1, flip=0., spin=0., lean=22.):
    """灵活的一跳：蓄力下蹲 → 干脆起跳（拉长、前倾）→ 空中转 → 落地压扁回弹、往前冲一下回正"""
    p0, p1 = V(p0), V(p1); d = p1 - p0; d.z = 0; L = d.length
    dv_ = d.normalized() if L > 1e-4 else V((math.cos(R(yaw1)), math.sin(R(yaw1)), 0))
    ax = V((0, 0, 1)).cross(dv_)
    if t < t0:
        a = clamp01((t - (t0 - .12)) / .12); sq = .24 * smooth(a)
        return p0 + V((0, 0, CEN * (1 - sq))), Quaternion(ax, R(-8 * a)) @ yawq(yaw0), 1 + sq * .5, 1 - sq
    if t < t1:
        u_ = (t - t0) / (t1 - t0); e = 1 - (1 - u_) ** 1.6; st = .2 * (1 - u_) ** 2 + .1 * u_ ** 4
        pitch = (lean * math.sin(math.pi * u_) if L > .05 else 0) + 360 * flip * smooth(u_)
        q = Quaternion(ax, R(pitch)) @ yawq(yaw0 + (yaw1 - yaw0) * smooth(u_) + 360 * spin * smooth(u_))
        return p0.lerp(p1, e) + V((0, 0, CEN * (1 + st) + h * 4 * u_ * (1 - u_))), q, 1 - st * .4, 1 + st
    d2 = t - t1; sq = .3 * math.exp(-d2 * 13) * math.cos(d2 * 28); tf = (14 if L > .05 else 6) * math.exp(-d2 * 8) * math.sin(d2 * 20)
    return p1 + V((0, 0, CEN * (1 - sq))), Quaternion(ax, R(tf)) @ yawq(yaw1), 1 + sq * .5, 1 - sq

# 每一跳的落点（世界坐标）。App Store 那一跳落在 DeepSeek 图标上，图标会随电梯往上走
def hop_point(i, t):
    tl, dev, u_, v_, o = P.HOPS[i]
    if 'store_pos' in o: return V(P.at('store', P.STORE_ICON_U, P.store_row_v(P.lift_pos(t))))
    return V(P.at(dev, u_, v_))
def face_toward(a, b_, bias=-95):
    """朝向：大体朝镜头（-Y），带一点前进方向，保证总能看到脸"""
    d = V(b_) - V(a); d.z = 0
    if d.length < .05: return bias
    yd = math.degrees(math.atan2(d.y, d.x)); diff = (yd - bias + 180) % 360 - 180
    return bias + max(-35, min(35, diff))

def her(t):
    S = P.STICKER
    if t < S['swap']: return None
    if t < P.JUMP_OUT - .12:   # 贴纸刚变成 3D：在原地继续转完剩下的圈，然后站稳
        a0, a1 = S['spin']; th = 360 * smooth((t - a0) / (a1 - a0)); return place(SLOT + V((0, .05, CEN)), yawq(-90 + th))
    if t < P.HOPS[0][0] + .4:
        c, q, sx, sz = hop_pose(t, P.JUMP_OUT, P.HOPS[0][0], SLOT + V((0, .05, 0)), hop_point(0, t), .55, -90, -100, spin=1)
        return place(c, q, sx, sz)
    if t >= P.SLIDE_END:       # 滑到底：站起来，晕乎乎地晃
        d = t - P.SLIDE_END; c, q, sx, sz = hop_pose(t, P.SLIDE_END - .3, P.SLIDE_END, SBOT + DOWN * .02, SBOT + V((-.15, -.2, -.02)), .1, -110, -100)
        return place(c, Quaternion((1, 0, 0), R(8 * math.sin(d * 9))) @ q, sx, sz)
    if t >= P.SLIDE_LAND:      # 仰面滑下去，越滑越快
        k = ((t - P.SLIDE_LAND) / (P.SLIDE_END - P.SLIDE_LAND)) ** 1.6
        c = STOP.lerp(SBOT, .05 + .9 * k) + NRM * .12; return place(c, Q_SLIDE @ Quaternion((1, 0, 0), R(6 * math.sin(t * 14))))
    if t >= P.LAUNCH - .12:    # 从第 1 名被顶飞，翻一圈落到滑梯顶
        p0 = V(P.at('store', P.STORE_ICON_U, P.store_row_v(0)))
        c, q, sx, sz = hop_pose(t, P.LAUNCH, P.SLIDE_LAND, p0, STOP + NRM * .02 - V((0, 0, .0)), .7, -95, -110, flip=1, lean=0)
        if t > P.SLIDE_LAND - .15: q = q.slerp(Q_SLIDE, smooth((t - (P.SLIDE_LAND - .15)) / .15))
        return place(c, q, sx, sz)
    # 普通跳跃：找当前这一跳
    i = 0
    while i + 1 < len(P.HOPS) and t >= P.HOPS[i + 1][0] - P.HOPS[i + 1][4].get('air', .4) - .12: i += 1
    if i + 1 < len(P.HOPS) and t >= P.HOPS[i + 1][0] - P.HOPS[i + 1][4].get('air', .4) - .12:
        i += 1
    tl, dev, u_, v_, o = P.HOPS[i]
    if i == 0: prev = SLOT
    else: prev = hop_point(i - 1, t)
    nxt = P.HOPS[i + 1] if i + 1 < len(P.HOPS) else None
    t0 = tl - o.get('air', .4)
    if t < tl + .5 or nxt is None or t < nxt[0] - nxt[4].get('air', .4) - .12:
        y0 = face_toward(prev, hop_point(i, t)); y1 = y0 + (-100 - y0) * smooth((t - tl) / .3)   # 落地后 0.3 秒转回朝镜头
        c, q, sx, sz = hop_pose(t, t0, tl, prev, hop_point(i, t), o.get('h', .12 + .22 * (hop_point(i, t) - prev).length), y0, y1 if t > tl else y0,
                                spin=o.get('spin', 0), flip=o.get('flip', 0), lean=40 if o.get('slide') else 22)
        if t > tl + .5:   # 站着：跟着拍子轻轻呼吸
            br = .02 * math.sin((t - tl) * math.tau * P.BPM / 60 / 2); sz -= br; sx += br * .5
        if t > P.LIFT[0] - .05 and 'store_pos' in o:   # 电梯每顶一格，她被颠一下
            for tt in P.LIFT:
                e = t - tt
                if 0 <= e < .3: sz -= .18 * math.exp(-e * 12) * math.cos(e * 30)
        return place(c, q, sx, sz)
    return place(hop_point(i, t) + V((0, 0, CEN)), yawq(-95))

def sticker_state(t):
    """平面贴纸：躺着 → 绕底边揭起来立住 → 原地转，转到侧面时消失（换成 3D 的她）"""
    S = S_ = P.STICKER
    if t < P.REPLY['t']: return None
    if t >= S['swap']: return None
    a, z = S['peel']; lift = 90 * smooth((t - a) / (z - a)) if t >= a else 0
    a2, z2 = S['spin']; th = 360 * smooth((t - a2) / (z2 - a2)) if t >= a2 else 0
    pop = back_out((t - P.REPLY['t']) / .3)
    return HINGE, Quaternion((0, 0, 1), R(th)) @ Quaternion((1, 0, 0), R(lift)), (pop, pop, pop)

# ======================================================================= 镜头：分段取景 + 弹簧平滑（一镜到底，不切）
cd = bpy.data.cameras.new('CAM'); cam = bpy.data.objects.new('CAM', cd); sc.collection.objects.link(cam); sc.camera = cam
cd.sensor_fit = 'VERTICAL'; cd.sensor_height = 24; cd.clip_start = .02; cd.dof.use_dof = True; cd.dof.aperture_fstop = 4.0; cam.rotation_mode = 'QUATERNION'
def spot(name, e, hexc):
    ld = bpy.data.lights.new(name, 'SPOT'); ld.energy = e; ld.spot_size = R(60); ld.spot_blend = .7; ld.shadow_soft_size = .04; ld.color = lin(hexc)
    o = bpy.data.objects.new(name, ld); sc.collection.objects.link(o); return o
KEY_L, RIM_L = spot('key', 220, '#fff0e0'), spot('rim', 260, '#b9c8ff')
# 暖色太阳光：照亮整张木桌，让设备有'放在桌上'的空间感（从左后方来，玻璃上的反光不会进镜头）
_sl = bpy.data.lights.new('sun', 'SUN'); _sl.energy = 1.6; _sl.color = lin('#ffcf9e'); _sl.angle = R(8); _sl.specular_factor = 0
_so = bpy.data.objects.new('sun', _sl); sc.collection.objects.link(_so); _so.rotation_euler = (R(55), 0, R(150))
for _l in (KEY_L, RIM_L):
    _l.data.spot_size = R(24); _l.data.spot_blend = .8
    try: _l.light_linking.receiver_collection = HER   # 灯光链接：这两盏灯只照她，屏幕上不会出现光斑
    except Exception: pass
def cam_target(spec, hc):
    if spec == 'her': return hc
    if spec[0] == 'mix': return V(P.at(spec[1], spec[2], spec[3], .1)).lerp(hc, spec[4])
    return V(P.at(spec[0], spec[1], spec[2], .05))
SPR = {}
def spring(k_, target, stiff=40.):
    dt = 1 / FPS; c_ = 2 * math.sqrt(stiff) * .9
    if k_ not in SPR: SPR[k_] = [V(target), V((0, 0, 0))]; return V(target)
    p, v = SPR[k_]
    for _ in range(4): a = (V(target) - p) * stiff - v * c_; v += a * dt / 4; p += v * dt / 4
    return p.copy()

last_c = SLOT + V((0, 0, CEN))
for f in range(1, P.N + 1):
    t = (f - 1) / FPS
    # 角色
    hs = her(t)
    if hs is None: key(dfy, f, loc=V((0, 0, -30)), rot=yawq(0), scale=(1, 1, 1))
    else:
        loc, q, s = hs; key(dfy, f, loc=loc, rot=q, scale=s); last_c = loc + q @ V((0, 0, CEN * s[2]))
    # 贴纸
    st = sticker_state(t)
    if st is None: key(stk, f, loc=HINGE + V((0, 0, -3)), rot=Quaternion(), scale=(1, 1, 1))
    else: key(stk, f, loc=st[0], rot=st[1], scale=st[2])
    # 波纹
    for i, rg in enumerate(rips):
        e = t - P.JUMP_OUT - i * .08
        s = .001 if e < 0 or e > 1.0 else .3 + 1.0 * (1 - (1 - e) ** 2)
        key(rg, f, scale=(s, s, max(.001, .25 * (1 - e)) if 0 <= e <= 1 else .001))
    # 评论卡、名字牌
    s = back_out((t - P.CARD_POP) / .35) if t >= P.CARD_POP else .001
    key(card, f, loc=CARD_LOC + V((0, 0, .01 * math.sin(t * 3))), scale=(s, s, s))
    a, z = P.PLATE_DROP
    key(plate, f, loc=PLATE_LOC + V((0, 0, -9 if t < a else 1.6 * (1 - clamp01((t - a) / (z - a)) ** 2))))
    # 英伟达绿柱：被顶飞时从屏幕里竖起来 → 落地前倒下变成滑梯
    rise = smooth((t - P.LAUNCH) / .35); fall = smooth((t - (P.SLIDE_LAND - .35)) / .25)
    key(slide, f, rot=(R(90) + (SLIDE_ANG - R(90)) * fall, 0, 0), scale=(1, max(.001, rise), 1))
    # 界面状态
    chat_iu.frame_offset = FR['chat'][f - 1]; chat_iu.keyframe_insert('frame_offset', frame=f)
    store_iu.frame_offset = FR['store'][f - 1]; store_iu.keyframe_insert('frame_offset', frame=f)
    # 镜头
    i = 0
    while i + 1 < len(P.CAM) and P.CAM[i + 1][0] <= t: i += 1
    def frame(seg):
        tgt = cam_target(seg[1], last_c); return tgt, tgt + V(seg[2]), seg[3]
    look, pos, fov = frame(P.CAM[i])
    if i > 0:
        k = smooth((t - P.CAM[i][0]) / .8)
        if k < 1:
            l0, p0, f0 = frame(P.CAM[i - 1]); look, pos, fov = l0.lerp(look, k), p0.lerp(pos, k), f0 + (fov - f0) * k
    pos, look = spring('p', pos), spring('l', look, 55.)
    cam.location = pos; cam.rotation_quaternion = (look - pos).to_track_quat('-Z', 'Y')
    cam.keyframe_insert('location', frame=f); cam.keyframe_insert('rotation_quaternion', frame=f)
    cd.lens = cd.sensor_height / (2 * math.tan(R(fov) / 2)); cd.keyframe_insert('lens', frame=f)
    cd.dof.focus_distance = (pos - last_c).length; cd.dof.keyframe_insert('focus_distance', frame=f)
    p = V((look.x, look.y, 0))
    cdir = (pos - last_c); cdir.z = 0; cdir = cdir.normalized() if cdir.length > 1e-3 else V((0, -1, 0)); side = V((-cdir.y, cdir.x, 0))
    for o, off in ((KEY_L, cdir * 1.1 + side * .6 + V((0, 0, 1.4))), (RIM_L, -cdir * .9 - side * .4 + V((0, 0, .9)))):   # 主光在镜头一侧斜上方，轮廓光在她背后
        o.location = last_c + off; o.rotation_euler = (last_c - o.location).to_track_quat('-Z', 'Y').to_euler()
        o.keyframe_insert('location', frame=f); o.keyframe_insert('rotation_euler', frame=f)

# 逐帧都有关键帧：插值改线性（只影响运动模糊子帧）
for ad in [o.animation_data for o in list(bpy.data.objects) + [cd] + [m.node_tree for m in (chat_m, store_m)]]:
    act = ad.action if ad else None
    if not act: continue
    fcs = list(getattr(act, 'fcurves', []))
    for layer in getattr(act, 'layers', []):
        for s_ in layer.strips:
            for cb in s_.channelbags: fcs += list(cb.fcurves)
    for fc in fcs:
        for kp in fc.keyframe_points: kp.interpolation = 'CONSTANT' if 'frame_offset' in fc.data_path else 'LINEAR'

os.makedirs(A.out, exist_ok=True)
if A.stills:
    import time
    for f in [int(x) for x in A.stills.split(',')]:
        t0 = time.time(); sc.frame_set(f); sc.render.filepath = os.path.join(A.out, f'still_{f:04d}.png'); sc.render.use_overwrite = True
        bpy.ops.render.render(write_still=True); print(f'STILL {f} {time.time() - t0:.1f}s')
elif A.render:
    if A.frames: a, z = A.frames.split('-'); sc.frame_start, sc.frame_end = int(a), int(z)
    sc.render.filepath = os.path.join(A.out, 'f_'); bpy.ops.render.render(animation=True)
