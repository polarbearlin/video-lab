# Generic titanium flagship phone

Created procedurally in Blender 5.2.2. No branding, text, animation, light objects or cameras in the model exports.

## Files
- `phone.glb`: 67,696 triangles; high detail.
- `phone_lo.glb`: 9,389 triangles; web/mobile LOD.
- `phone.blend`: editable high-detail Blender geometry.
- `01_front.png`, `02_back.png`, `03_front_45.png`, `04_side_detail.png`: inspection renders of the re-imported GLB. The last image combines button and USB-C/speaker close-ups.
- `build_phone.py`: procedural modelling source.
- `audit_glb.py`: UV convention normalisation and geometric checks, run after re-exporting from Blender.
- `model_checks.json` and `*.validation.json`: numerical and Khronos glTF Validator results.

## Coordinates and dimensions
- glTF metres, Y up, front screen faces +Z; all component origins at the main enclosure centre.
- Enclosure: width 0.0716 m, height 0.1476 m, thickness 0.00825 m.
- Buttons protrude 0.12 mm per side. Camera rings extend to Z = -0.00730 m. These features are additional to the enclosure dimensions; the main enclosure origin remains unchanged.
- Corner profile: piecewise superellipse, exponent 3.5, nominal 10 mm corner radius.
- Frame: swept closed cross-section; 0.6 mm front/rear bevels; actual side/bottom openings.
- Screen edge inset: 1.45 mm; visible rectangle bounds 68.7 × 144.7 mm.
- Screen pill opening: 16 × 5.8 mm; top edge 7.4 mm below the top of the enclosure.
- Back glass inset: 3.7 mm. Camera plateau: 38 × 38 mm, rises 1.5 mm from the rear enclosure plane. Lens rings add further height.

## Materials and object names
Required material names: Frame, BackGlass, FrontGlass, Screen, CameraPlateau, LensRing, LensGlass, Buttons, Port.
Small extra materials: Flash and Sensor. Similar components share their named material. Objects have English component names, with suffixes for repeated components.
Frame default sRGB #8a8d91, metallic 1, roughness 0.35. BackGlass sRGB #c9c7c2, roughness 0.55. FrontGlass roughness 0.05. Screen base colour black, emission strength 0.
All exported materials use basic metallic/roughness PBR parameters without procedural texture nodes.

## Screen UV and three.js
The mesh named `Screen` includes a genuine opening for the pill. UV is an affine portrait projection, covering 0–1. Top-left of the rectangular UV domain is (0,1), bottom-right is (1,0); the rounded corners clip that domain.

IMPORTANT: The delivered GLBs intentionally retain the requested Cartesian V-up UV convention. For a CanvasTexture applied directly to Screen, keep `flipY = true` (the CanvasTexture default). This differs from the usual `flipY = false` advice for replacing existing glTF image textures.
Use a canvas with aspect 68.7 / 144.7, e.g. 1374 × 2894 pixels, to preserve square pixels on the screen.

```js
const phone = gltf.scene;
const screen = phone.getObjectByName('Screen');
const texture = new THREE.CanvasTexture(appCanvas);
texture.colorSpace = THREE.SRGBColorSpace;
texture.flipY = true;
// Unlit UI: no environment-light dependence, no need for model lights.
screen.material = new THREE.MeshBasicMaterial({
  map: texture,
  toneMapped: false,
});
// After each canvas redraw:
texture.needsUpdate = true;

// Recolour all parts sharing the named material:
phone.traverse((obj) => {
  if (!obj.isMesh) return;
  const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
  for (const material of materials) {
    if (material.name === 'Frame') material.color.set('#8a8d91');
  }
});
```

## Inspection and validation
Both GLBs were re-imported in Blender and loaded with three.js GLTFLoader. Inspection lighting is only Blender's bundled studio HDRI; backgrounds are black, with no floor or light objects. The inspection camera/environment are not present in either GLB.
Khronos validator: zero errors, zero warnings. The one informational message about an unused UV attribute is expected: Screen has UVs ready for the webpage's future texture, but its exported material has no image yet.

## Rebuilding
Run `blender -b --python build_phone.py`, then `python3 audit_glb.py` (requires NumPy). The second step restores the requested V-up convention after Blender's usual glTF V flip and writes the check report. Files are written beside the scripts.
