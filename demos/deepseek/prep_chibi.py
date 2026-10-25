# Tripo 生成的 Q 版大肥鱼（约 196 万面）→ 减面到约 10 万面、底部放到地面、面朝 +X，导出轻量 GLB，并渲染四个角度检查
# blender -b --factory-startup -P demos/deepseek/prep_chibi.py -- <输入.glb> <输出.glb> [检查图目录]
import bpy, sys, math, os
from mathutils import Vector
a = sys.argv[sys.argv.index('--') + 1:]; src, dst = a[0], a[1]; chk = a[2] if len(a) > 2 else ''
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
ob = [o for o in bpy.data.objects if o.type == 'MESH'][0]; ob.name = 'Dafeiyu'
tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
bpy.context.view_layer.objects.active = ob; ob.select_set(True)
m = ob.modifiers.new('dec', 'DECIMATE'); m.ratio = min(1, 110000 / tris); bpy.ops.object.modifier_apply(modifier='dec')
ob.rotation_mode = 'XYZ'; ob.rotation_euler[2] += math.radians(90)   # Tripo 导出时脸朝 -Y，转成朝 +X（和场景约定一致）
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
# 底部放在 z=0，水平居中，高度归一到 1.0 m
bb = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
mn = Vector((min(v.x for v in bb), min(v.y for v in bb), min(v.z for v in bb))); mx = Vector((max(v.x for v in bb), max(v.y for v in bb), max(v.z for v in bb)))
for v in ob.data.vertices: v.co = v.co - Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))
s = 1.0 / (mx.z - mn.z); ob.scale = (s, s, s); bpy.ops.object.transform_apply(scale=True)
for p in ob.data.polygons: p.use_smooth = True
print('TRIS', tris, '->', sum(len(p.vertices) - 2 for p in ob.data.polygons), 'size', [round(d, 3) for d in ob.dimensions])
bpy.ops.export_scene.gltf(filepath=dst, use_selection=True, export_image_format='JPEG', export_jpeg_quality=90)
if chk:
    os.makedirs(chk, exist_ok=True); sc = bpy.context.scene; sc.render.engine = 'BLENDER_EEVEE'
    sc.render.resolution_x, sc.render.resolution_y = 480, 600
    w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = (.06, .08, .16, 1); w.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.6
    for loc, e in (((3, -1.5, 3), 450), ((2, 2.5, 1.5), 180), ((-2.5, 0, 2.5), 250)):
        ld = bpy.data.lights.new('l', 'AREA'); ld.size = 2; ld.energy = e; lo = bpy.data.objects.new('l', ld); sc.collection.objects.link(lo); lo.location = loc
        lo.rotation_euler = (Vector((0, 0, .5)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    cd = bpy.data.cameras.new('c'); cam = bpy.data.objects.new('c', cd); sc.collection.objects.link(cam); sc.camera = cam; cd.lens = 60
    for name, ang in (('front', 0), ('q34', 40), ('side', 90), ('back', 180)):
        r = math.radians(ang); cam.location = (3.2 * math.cos(r), 3.2 * math.sin(r), .9)
        cam.rotation_euler = (Vector((0, 0, .5)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(chk, f'chibi_{name}.png'); bpy.ops.render.render(write_still=True)
