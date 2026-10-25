# 大肥鱼材质对比：A 全身亮面 PVC / B 分区手办材质 / C 二次元卡通渲染（同一机位、同一灯光）
# blender -b --factory-startup -P demos/deepseek/v9/look_test.py -- [--scale 50]
import bpy, math, os, sys, argparse
from mathutils import Vector
HERE = os.path.dirname(os.path.abspath(__file__)); DS = os.path.dirname(HERE); REPO = os.path.abspath(os.path.join(DS, '../..'))
ap = argparse.ArgumentParser(); ap.add_argument('--scale', type=int, default=50); ap.add_argument('--out', default=os.path.join(DS, 'build/look'))
A = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
R = math.radians
def lin(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in c)
bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
    try: sc.render.engine = eng; break
    except TypeError: pass
sc.render.resolution_x, sc.render.resolution_y = 1200, 1200; sc.render.resolution_percentage = A.scale; sc.eevee.taa_render_samples = 48
for k in ('use_raytracing', 'use_gtao', 'use_shadows'):
    if hasattr(sc.eevee, k): setattr(sc.eevee, k, True)
sc.view_settings.view_transform = 'AgX'
try: sc.view_settings.look = 'AgX - Medium High Contrast'
except Exception: pass
w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = (*lin('#dfe3ea'), 1)
bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, 0)); fl = bpy.context.object
m = bpy.data.materials.new('stage'); m.use_nodes = True; m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*lin('#e9eaee'), 1); m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .35; fl.data.materials.append(m)
bpy.ops.import_scene.gltf(filepath=os.path.join(REPO, 'assets/models/dafeiyu_chibi/dafeiyu_chibi.glb'))
body = [o for o in bpy.context.selected_objects if o.type == 'MESH'][0]; body.rotation_mode = 'XYZ'; body.rotation_euler = (0, 0, R(-75))
MAT = body.data.materials[0]; nt = MAT.node_tree; BS = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'); TEX = next(n for n in nt.nodes if n.type == 'TEX_IMAGE')
def light(name, kind, e, loc, size=1., hexc='#ffffff'):
    ld = bpy.data.lights.new(name, kind); ld.energy = e; ld.color = lin(hexc)
    if kind == 'AREA': ld.size = size
    o = bpy.data.objects.new(name, ld); sc.collection.objects.link(o); o.location = loc; o.rotation_euler = (Vector((0, 0, .5)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); return o
light('key', 'AREA', 180, (1.6, -2.2, 2.2), 1.5, '#fff3e6'); light('rim', 'AREA', 220, (-1.4, 1.8, 1.6), 1.0, '#cfdcff'); light('top', 'AREA', 250, (0, -.5, 4), 4)
cd = bpy.data.cameras.new('c'); cam = bpy.data.objects.new('c', cd); sc.collection.objects.link(cam); sc.camera = cam; cd.lens = 85
cam.location = (0, -3.6, 1.0); cam.rotation_euler = (Vector((0, 0, .5)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
os.makedirs(A.out, exist_ok=True)
def render(name): sc.render.filepath = os.path.join(A.out, name + '.png'); bpy.ops.render.render(write_still=True); print('LOOK', name)

def reset():
    for n in [n for n in nt.nodes if n not in (BS, TEX) and n.type != 'OUTPUT_MATERIAL']: nt.nodes.remove(n)
    out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'); nt.links.new(TEX.outputs['Color'], BS.inputs['Base Color']); nt.links.new(BS.outputs[0], out.inputs['Surface'])
    for k, v in (('Roughness', .9), ('Coat Weight', 0.), ('Subsurface Weight', 0.), ('Sheen Weight', 0.), ('Specular IOR Level', .5)):
        if k in BS.inputs: BS.inputs[k].default_value = v
    return out
for mod in list(body.modifiers): body.modifiers.remove(mod)

# ---- A：全身亮面 PVC（上一版的做法）
reset(); BS.inputs['Roughness'].default_value = .38; BS.inputs['Coat Weight'].default_value = .6; BS.inputs['Coat Roughness'].default_value = .12
render('A_pvc')

# ---- B：分区手办材质（按颜色分：皮肤哑光透光 / 头发蓝色半光泽缎面 / 白色蕾丝布料 / 其余哑光）
out = reset()
hsv = nt.nodes.new('ShaderNodeSeparateColor'); hsv.mode = 'HSV'; nt.links.new(TEX.outputs['Color'], hsv.inputs[0])
def band(sock, lo, hi, soft=.05):
    a = nt.nodes.new('ShaderNodeMapRange'); a.inputs['From Min'].default_value = lo - soft; a.inputs['From Max'].default_value = lo; nt.links.new(sock, a.inputs[0])
    b = nt.nodes.new('ShaderNodeMapRange'); b.inputs['From Min'].default_value = hi + soft; b.inputs['From Max'].default_value = hi; nt.links.new(sock, b.inputs[0])
    m_ = nt.nodes.new('ShaderNodeMath'); m_.operation = 'MULTIPLY'; nt.links.new(a.outputs[0], m_.inputs[0]); nt.links.new(b.outputs[0], m_.inputs[1]); return m_.outputs[0]
def mul(x, y):
    m_ = nt.nodes.new('ShaderNodeMath'); m_.operation = 'MULTIPLY'; nt.links.new(x, m_.inputs[0])
    if isinstance(y, float): m_.inputs[1].default_value = y
    else: nt.links.new(y, m_.inputs[1])
    return m_.outputs[0]
blue = mul(band(hsv.outputs[0], .52, .72), band(hsv.outputs[1], .3, 1.))           # 蓝色：头发 + 裙子
skin = mul(band(hsv.outputs[0], 0., .1), mul(band(hsv.outputs[1], .1, .45), band(hsv.outputs[2], .55, 1.)))   # 皮肤
white = mul(band(hsv.outputs[1], 0., .12), band(hsv.outputs[2], .7, 1.))            # 白色蕾丝 / 围裙
bright = band(hsv.outputs[2], .5, 1.)                                                # 亮的蓝（头发）比暗的蓝（裙子）更有光泽
def mix_val(base, pairs):
    cur = None
    for mask, val in pairs:
        mr = nt.nodes.new('ShaderNodeMix'); mr.data_type = 'FLOAT'
        if cur is None: mr.inputs[2].default_value = base
        else: nt.links.new(cur, mr.inputs[2])
        mr.inputs[3].default_value = val; nt.links.new(mask, mr.inputs[0]); cur = mr.outputs[0]
    return cur
nt.links.new(mix_val(.65, [(blue, .5), (mul(blue, bright), .3), (skin, .55), (white, .75)]), BS.inputs['Roughness'])
nt.links.new(mul(mul(blue, bright), .35), BS.inputs['Coat Weight']); BS.inputs['Coat Roughness'].default_value = .25
if 'Subsurface Weight' in BS.inputs: nt.links.new(mul(skin, .35), BS.inputs['Subsurface Weight']); BS.inputs['Subsurface Radius'].default_value = (.02, .008, .005)
if 'Sheen Weight' in BS.inputs: nt.links.new(mul(white, .6), BS.inputs['Sheen Weight'])
hs = nt.nodes.new('ShaderNodeHueSaturation'); hs.inputs['Saturation'].default_value = 1.08; hs.inputs['Value'].default_value = 1.05
nt.links.new(TEX.outputs['Color'], hs.inputs['Color']); nt.links.new(hs.outputs[0], BS.inputs['Base Color'])
render('B_figure')

# ---- C：二次元卡通渲染（两阶色块 + 轮廓光 + 描边）
out = reset()
dif = nt.nodes.new('ShaderNodeBsdfDiffuse'); s2r = nt.nodes.new('ShaderNodeShaderToRGB'); nt.links.new(dif.outputs[0], s2r.inputs[0])
rmp = nt.nodes.new('ShaderNodeValToRGB'); rmp.color_ramp.interpolation = 'CONSTANT'
rmp.color_ramp.elements[0].color = (.62, .64, .78, 1); rmp.color_ramp.elements[1].position = .18; rmp.color_ramp.elements[1].color = (1, 1, 1, 1)
nt.links.new(s2r.outputs['Color'], rmp.inputs[0])
mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs[0].default_value = 1
nt.links.new(TEX.outputs['Color'], mx.inputs[6]); nt.links.new(rmp.outputs[0], mx.inputs[7])
lw = nt.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = .2
rr = nt.nodes.new('ShaderNodeValToRGB'); rr.color_ramp.interpolation = 'CONSTANT'; rr.color_ramp.elements[1].position = .75; rr.color_ramp.elements[0].color = (0, 0, 0, 1); rr.color_ramp.elements[1].color = (.35, .4, .55, 1)
nt.links.new(lw.outputs['Facing'], rr.inputs[0])
ad = nt.nodes.new('ShaderNodeMix'); ad.data_type = 'RGBA'; ad.blend_type = 'ADD'; ad.inputs[0].default_value = 1; nt.links.new(mx.outputs[2], ad.inputs[6]); nt.links.new(rr.outputs[0], ad.inputs[7])
em = nt.nodes.new('ShaderNodeEmission'); nt.links.new(ad.outputs[2], em.inputs['Color']); nt.links.new(em.outputs[0], out.inputs['Surface'])
ol = bpy.data.materials.new('outline'); ol.use_nodes = True; ol.use_backface_culling = True
ol.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*lin('#1c2340'), 1); ol.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1
body.data.materials.append(ol); sol = body.modifiers.new('outline', 'SOLIDIFY'); sol.thickness = .006; sol.offset = 1; sol.use_flip_normals = True; sol.material_offset = 1
render('C_toon')
