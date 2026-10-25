# DeepSeek 鲸鱼 · 3D 玩具形象（从官方 logo 的鲸鱼轮廓挤出 + 大圆角 + 体素重建，做成软胶玩具）
# blender -b --factory-startup -P demos/deepseek/whale.py -- [--out whale_preview.png] [--glb whale.glb] [--samples 64] [--cpu]
import bpy, re, math, os, sys, argparse
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument('--svg', default=os.path.join(HERE, 'whale.svg'))
ap.add_argument('--out', default=os.path.join(HERE, 'build/whale_preview.png'))
ap.add_argument('--glb', default='')
ap.add_argument('--samples', type=int, default=64)
ap.add_argument('--res', type=int, default=1080)
ap.add_argument('--cpu', action='store_true')
ap.add_argument('--cam', default='-.2,-.24,.1')
ap.add_argument('--yaw', type=float, default=15)
ap.add_argument('--style', default='toy', help='toy：圆滚滚的卡通鲸（参考 logo 配色和轮廓）；logo：直接挤出 logo 轮廓')
A = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
BLUE, WHITE = '#4D6BFE', '#F4F6FF'
lin = lambda h: tuple(((int(h[i:i + 2], 16) / 255) / 12.92 if int(h[i:i + 2], 16) / 255 <= .04045 else (((int(h[i:i + 2], 16) / 255) + .055) / 1.055) ** 2.4) for i in (1, 3, 5)) + (1,)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

# ---------- 读 SVG 路径（只有 M / C / Z，绝对坐标）
d = re.search(r' d="([^"]*)"', open(A.svg).read()).group(1)
subs, cur = [], None
for cmd, args in re.findall(r'([MCZ])([^MCZ]*)', d):
    n = [float(x) for x in re.findall(r'-?\d*\.?\d+(?:e-?\d+)?', args)]
    if cmd == 'M': cur = [[(n[0], n[1]), None, None]]; subs.append(cur)
    elif cmd == 'C':
        for i in range(0, len(n), 6):
            cur[-1][2] = (n[i], n[i + 1]); cur.append([(n[i + 4], n[i + 5]), (n[i + 2], n[i + 3]), None])
    elif cmd == 'Z':
        if len(cur) > 1 and math.dist(cur[0][0], cur[-1][0]) < 1e-3:   # 闭合点重复：并到起点
            cur[0][1] = cur[-1][1]; cur.pop()
xs = [p[0][0] for s in subs for p in s]; ys = [p[0][1] for s in subs for p in s]
cx, cy, S = (min(xs) + max(xs)) / 2, max(ys), 0.1 / (max(xs) - min(xs))   # 宽 10 cm，底边在 z=0

def make_curve(name, splines, extrude, bevel):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '2D'; cu.fill_mode = 'BOTH'
    cu.extrude = extrude; cu.bevel_depth = bevel; cu.bevel_resolution = 6; cu.resolution_u = 24
    for s in splines:
        sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(s) - 1); sp.use_cyclic_u = True
        for k, (co, hin, hout) in enumerate(s):
            bp = sp.bezier_points[k]; bp.co = (co[0], co[1], 0)
            bp.handle_left = (*(hin or co), 0); bp.handle_right = (*(hout or co), 0)
            bp.handle_left_type = bp.handle_right_type = 'FREE'
    ob = bpy.data.objects.new(name, cu); sc.collection.objects.link(ob)
    return ob
def to_xz(ob):   # 曲线在 XY 平面建，转成立着的
    ob.rotation_euler = (math.radians(90), 0, 0)
# 曲线控制点换算到"SVG 单位，居中，y 向上"
def conv(s):
    f = lambda q: ((q[0] - cx), (cy - q[1]))
    return [(f(co), f(hin) if hin else None, f(hout) if hout else None) for co, hin, hout in s]

def mat(name, color, rough, coat=.3, sss=.06):
    m = bpy.data.materials.new(name); m.use_nodes = True; bs = m.node_tree.nodes['Principled BSDF']
    bs.inputs['Base Color'].default_value = lin(color); bs.inputs['Roughness'].default_value = rough
    for k, v in (('Coat Weight', coat), ('Coat Roughness', .2), ('Subsurface Weight', sss)):
        try: bs.inputs[k].default_value = v
        except KeyError: pass
    return m
def build_toy():
    """圆滚滚的软胶鲸（参数曲面）：头朝 -X、背朝 +Z，长 10 cm。白肚皮用着色器按坐标画出 logo 那样的波浪分界。"""
    L, R, Hn = .10, .040, .028
    def frame(u):   # 沿身体的中心线和截面半径
        x = -L / 2 + L * u
        r = R * math.sqrt(max(0, 1 - ((.36 - u) / .36) ** 2)) if u < .36 else R * (1 - .80 * ((u - .36) / .64) ** 1.15)
        zc = .042 + (Hn * ((u - .5) / .5) ** 2 if u > .5 else 0)
        return x, r, zc
    def surf(u, th, out=0.):   # th：0 = 正上方，±90° = 两侧
        x, r, zc = frame(u); ry, rz = r * 1.0 + out, r * .9 + out
        z = math.cos(th) * rz; z = z * (.86 if z < 0 else 1)   # 肚子底部稍微扁一点
        return Vector((x, math.sin(th) * ry, zc + z))
    NU, NV = 120, 72; verts, faces = [], []
    for i in range(NU + 1):
        u = i / NU
        for j in range(NV): verts.append(surf(u, 2 * math.pi * j / NV))
    for i in range(NU):
        for j in range(NV): a, b = i * NV + j, i * NV + (j + 1) % NV; faces.append((a, b, b + NV, a + NV))
    tip = len(verts); verts.append(surf(1, 0, 0) + Vector((.002, 0, 0)))
    for j in range(NV): faces.append((NU * NV + j, NU * NV + (j + 1) % NV, tip))
    me = bpy.data.meshes.new('WhaleBody'); me.from_pydata(verts, [], faces); me.update()
    ob = bpy.data.objects.new('WhaleBody', me); sc.collection.objects.link(ob)
    for p in me.polygons: p.use_smooth = True
    sd = ob.modifiers.new('sub', 'SUBSURF'); sd.levels = 1; sd.render_levels = 2
    # 材质：蓝身 + 波浪白肚皮
    m = mat('WhaleSkin', BLUE, .32); nt = m.node_tree; bs = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
    def op(kind, a, b=None, c=None):
        n = nt.nodes.new('ShaderNodeMath'); n.operation = kind
        for k, v in enumerate((a, b, c)):
            if v is None: continue
            if isinstance(v, (int, float)): n.inputs[k].default_value = v
            else: nt.links.new(v, n.inputs[k])
        return n.outputs[0]
    line = op('MULTIPLY_ADD', op('SINE', op('MULTIPLY', sep.outputs['X'], 95.)), .0045, op('MULTIPLY_ADD', sep.outputs['X'], .22, .041))
    white = op('MINIMUM', op('LESS_THAN', sep.outputs['Z'], line), op('LESS_THAN', sep.outputs['X'], .03))
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.inputs['A'].default_value = lin(BLUE); mix.inputs['B'].default_value = lin(WHITE)
    nt.links.new(white, mix.inputs['Factor']); nt.links.new(mix.outputs['Result'], bs.inputs['Base Color'])
    me.materials.append(m)
    parts = [ob]
    def blob(name, loc, scale, rot, m, sub=2):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=loc, segments=32, ring_count=16); o = bpy.context.object; o.name = name
        o.scale = scale; o.rotation_euler = rot; o.data.materials.append(m)
        for p in o.data.polygons: p.use_smooth = True
        parts.append(o); return o
    skin = mat('Fin', BLUE, .32)
    x1, r1, z1 = frame(1)
    for sgn in (1, -1):   # 尾鳍：两片，往两侧斜上方张开
        blob('Fluke', (x1 + .006, sgn * .014, z1 + .006), (.016, .022, .0045), (sgn * -.35, -.55, sgn * .55), skin)
        blob('Fin', tuple(surf(.42, sgn * 1.9, -.004)), (.014, .006, .0035), (sgn * .5, .35, sgn * -.5), skin)   # 胸鳍
    eye, hi, blush = mat('Eye', '#10121A', .28, coat=.4, sss=0), mat('EyeHi', '#FFFFFF', .3, sss=0), mat('Blush', '#FF8FB1', .7, coat=0, sss=0)
    for sgn in (1, -1):
        pe = surf(.2, sgn * math.radians(58), .0005)
        blob('Eye', tuple(pe), (.0042, .0042, .0058), (0, 0, 0), eye)
        blob('EyeHi', tuple(surf(.19, sgn * math.radians(54), .0035)), (.0014, .0014, .0014), (0, 0, 0), hi)
        blob('Blush', tuple(surf(.27, sgn * math.radians(76), .0003)), (.0062, .0018, .0036), (0, 0, sgn * .25), blush)
    return parts
if A.style == 'logo':
    outer = max(subs, key=lambda s: (max(p[0][0] for p in s) - min(p[0][0] for p in s)))
    body = make_curve('WhaleBody', [conv(s) for s in subs], 7.5, 1.5)       # 带镂空（白肚皮、眼睛）
    core = make_curve('WhaleCore', [conv(outer)], 6.6, 1.1)                    # 实心白芯：从镂空处露出来
    for ob in (body, core): to_xz(ob); ob.scale = (S, S, S)
    
    def finish(ob, color, rough, clear):
        bpy.context.view_layer.objects.active = ob; ob.select_set(True)
        bpy.ops.object.convert(target='MESH'); ob.select_set(False)
        rm = ob.modifiers.new('remesh', 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = .2   # 局部单位是 SVG 单位（鲸鱼宽约 57）
        sm = ob.modifiers.new('smooth', 'CORRECTIVE_SMOOTH'); sm.iterations = 12; sm.smooth_type = 'LENGTH_WEIGHTED'; sm.use_only_smooth = True
        m = bpy.data.materials.new(ob.name + 'M'); m.use_nodes = True; bs = m.node_tree.nodes['Principled BSDF']
        bs.inputs['Base Color'].default_value = lin(color); bs.inputs['Roughness'].default_value = rough
        try: bs.inputs['Coat Weight'].default_value = clear; bs.inputs['Coat Roughness'].default_value = .25
        except KeyError: pass
        try: bs.inputs['Subsurface Weight'].default_value = .06; bs.inputs['Subsurface Radius'].default_value = (.4, .5, 1)
        except KeyError: pass
        ob.data.materials.append(m); bpy.ops.object.shade_smooth() if False else None
        for p in ob.data.polygons: p.use_smooth = True
    finish(body, BLUE, .36, .35); finish(core, WHITE, .45, .2)
    WHALE = bpy.data.objects.new('Whale', None); sc.collection.objects.link(WHALE)
    for ob in (body, core): ob.parent = WHALE
else:
    WHALE = bpy.data.objects.new('Whale', None); sc.collection.objects.link(WHALE)
    body = core = None
    for o in build_toy(): o.parent = WHALE

# ---------- 预览布景：浅灰蓝无缝背景 + 柔光
if A.out:
    sc.render.engine = 'CYCLES'; sc.cycles.samples = A.samples; sc.cycles.use_denoising = True
    if not A.cpu:
        try:
            pr = bpy.context.preferences.addons['cycles'].preferences
            for k in ('OPTIX', 'CUDA', 'METAL'):
                pr.compute_device_type = k; pr.get_devices()
                if any(dv.type == k for dv in pr.devices): sc.cycles.device = 'GPU'; [setattr(dv, 'use', dv.type == k) for dv in pr.devices]; break
        except Exception: pass
    sc.render.resolution_x = sc.render.resolution_y = A.res
    sc.view_settings.view_transform = 'Khronos PBR Neutral'
    bpy.ops.mesh.primitive_plane_add(size=4); fl = bpy.context.object
    bm = bpy.data.materials.new('floor'); bm.use_nodes = True; bm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = lin('#E9ECF5'); bm.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .8
    fl.data.materials.append(bm)
    w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = lin('#DDE3F2'); w.node_tree.nodes['Background'].inputs['Strength'].default_value = .22
    def area(loc, size, e, col='#FFFFFF'):
        ld = bpy.data.lights.new('a', 'AREA'); ld.size = size; ld.energy = e; ld.color = lin(col)[:3]
        o = bpy.data.objects.new('a', ld); sc.collection.objects.link(o); o.location = loc
        o.rotation_euler = (Vector((0, 0, .04)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); return o
    area((-.18, -.25, .3), .25, 2.2); area((.25, .1, .18), .2, 1.0, '#B9C8FF'); area((0, .3, .25), .3, 1.2)
    cd = bpy.data.cameras.new('c'); cd.lens = 70; cd.dof.use_dof = True; cd.dof.focus_distance = .33; cd.dof.aperture_fstop = 5.6
    cam = bpy.data.objects.new('c', cd); sc.collection.objects.link(cam); sc.camera = cam
    cam.location = tuple(float(v) for v in A.cam.split(',')); cam.rotation_euler = (Vector((0, 0, .035)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    WHALE.rotation_euler = (0, 0, math.radians(A.yaw))
    os.makedirs(os.path.dirname(A.out), exist_ok=True); sc.render.filepath = A.out
    bpy.ops.render.render(write_still=True)
if A.glb:
    for o in sc.objects: o.select_set(o == WHALE or o.parent == WHALE)
    bpy.ops.export_scene.gltf(filepath=A.glb, use_selection=True, export_apply=True)
