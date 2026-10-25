"""分区手办材质（客户选定的 B 方案）：Tripo 模型只有一张颜色贴图，按颜色自动分区——
皮肤哑光 + 一点透光、亮蓝头发缎面光泽、白色蕾丝布料感、深蓝裙子哑光。在 Blender 里 import 后调用 figure(mat)。"""
import bpy

def figure(mat):
    nt = mat.node_tree
    bs = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'); tex = next(n for n in nt.nodes if n.type == 'TEX_IMAGE')
    L = nt.links.new
    hsv = nt.nodes.new('ShaderNodeSeparateColor'); hsv.mode = 'HSV'; L(tex.outputs['Color'], hsv.inputs[0])
    def band(sock, lo, hi, soft=.05):
        a = nt.nodes.new('ShaderNodeMapRange'); a.inputs['From Min'].default_value = lo - soft; a.inputs['From Max'].default_value = lo; L(sock, a.inputs[0])
        b = nt.nodes.new('ShaderNodeMapRange'); b.inputs['From Min'].default_value = hi + soft; b.inputs['From Max'].default_value = hi; L(sock, b.inputs[0])
        return mul(a.outputs[0], b.outputs[0])
    def mul(x, y):
        m = nt.nodes.new('ShaderNodeMath'); m.operation = 'MULTIPLY'; L(x, m.inputs[0])
        if isinstance(y, float): m.inputs[1].default_value = y
        else: L(y, m.inputs[1])
        return m.outputs[0]
    blue = mul(band(hsv.outputs[0], .52, .72), band(hsv.outputs[1], .3, 1.))                                   # 蓝：头发 + 裙子
    skin = mul(band(hsv.outputs[0], 0., .1), mul(band(hsv.outputs[1], .1, .45), band(hsv.outputs[2], .55, 1.)))  # 皮肤
    white = mul(band(hsv.outputs[1], 0., .12), band(hsv.outputs[2], .7, 1.))                                   # 白色蕾丝 / 围裙
    hair = mul(blue, band(hsv.outputs[2], .5, 1.))                                                              # 亮蓝 = 头发
    cur = None
    for mask, val in ((blue, .5), (hair, .3), (skin, .55), (white, .75)):
        mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'FLOAT'
        if cur is None: mx.inputs[2].default_value = .65
        else: L(cur, mx.inputs[2])
        mx.inputs[3].default_value = val; L(mask, mx.inputs[0]); cur = mx.outputs[0]
    L(cur, bs.inputs['Roughness'])
    L(mul(hair, .35), bs.inputs['Coat Weight']); bs.inputs['Coat Roughness'].default_value = .25
    if 'Subsurface Weight' in bs.inputs: L(mul(skin, .35), bs.inputs['Subsurface Weight']); bs.inputs['Subsurface Radius'].default_value = (.02, .008, .005)
    if 'Sheen Weight' in bs.inputs: L(mul(white, .6), bs.inputs['Sheen Weight'])
    hs = nt.nodes.new('ShaderNodeHueSaturation'); hs.inputs['Saturation'].default_value = 1.08; hs.inputs['Value'].default_value = 1.05
    L(tex.outputs['Color'], hs.inputs['Color']); L(hs.outputs[0], bs.inputs['Base Color'])
