"""Refine the owner-provided room in Blender without moving interaction anchors.

Run with Blender --background --python scripts/blender/refine_workspace.py.
Outputs stay in artifacts/blender; main.glb is never overwritten.
"""
import bpy, json, math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'artifacts' / 'blender'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(OUT / 'workspace-baseline.blend'))
scene = bpy.context.scene
source_objects = list(scene.objects)

def aim(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()

def area(name, location, target, power, color, size):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy, data.color, data.shape, data.size = power, color, 'DISK', size
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = location
    aim(obj, target)

camera_data = bpy.data.cameras.new('Workspace review camera')
camera = bpy.data.objects.new('Workspace review camera', camera_data)
scene.collection.objects.link(camera)
camera.location = (6, -.5, 10.3)
aim(camera, (-3.8, .8, 8.5))
camera_data.lens = 26
scene.camera = camera
area('Softbox key', (5, -5, 16), (-3, 0, 6.5), 1800, (1, .9, .8), 10)
area('Cool edge', (-6, 7, 13), (-2, 2, 8), 950, (.48, .65, 1), 7)
area('Front fill', (8, 6, 9), (-3, 0, 8), 650, (.85, .9, 1), 8)
scene.world = bpy.data.worlds.new('Workspace studio')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (.055, .065, .09, 1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = .35
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x, scene.render.resolution_y = 1440, 900
scene.render.resolution_percentage = 100
scene.view_settings.view_transform = 'AgX'
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = str(OUT / 'before.png')
bpy.ops.render.render(write_still=True)

changes = []
def finish(name, color=None, roughness=None, metallic=None):
    material = bpy.data.materials.get(name)
    if not material:
        raise RuntimeError('Missing material: ' + name)
    bsdf = next(n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    if color is not None:
        if bsdf.inputs['Base Color'].is_linked:
            raise RuntimeError('Refusing to replace a source texture: ' + name)
        bsdf.inputs['Base Color'].default_value = (*color, 1)
    if roughness is not None:
        bsdf.inputs['Roughness'].default_value = roughness
    if metallic is not None:
        bsdf.inputs['Metallic'].default_value = metallic
    changes.append({'material': name, 'color': color, 'roughness': roughness, 'metallic': metallic})

# Charcoal anodized aluminium: lighter edges come from normals/reflections,
# rather than the previous uniform mid-grey stand or mirror-like keyboard.
for name in ['Material.037', 'Material.039', 'Material.006', 'Material.043']:
    finish(name, (.018, .022, .029), .32, .72)
finish('Material.055', (.012, .015, .021), .34, .25)
finish('Material.044', (.013, .017, .024), .43, .15)
finish('Tastatur_Unterseite', (.018, .021, .028), .42, .35)
finish('Tastatur_Seite', (.014, .017, .022), .48, .05)
finish('Material.025', roughness=.48, metallic=0)

bevels = {
    'Cube001_Material055_0': .025,
    'Cube002_Material044_0': .018,
    'Cube006_Material043_0': .045,
    'Cube007_Material037_0': .024,
    'Cube008_Material036_0': .025,
    'Cube009_Material039_0': .025,
    'Cube010_Material006_0': .02,
    'Object_10_Tastatur_Unterseite_0': .012,
    'Object_12_Tastatur_Unterseite_0': .012,
}
for name, width in bevels.items():
    obj = bpy.data.objects[name]
    # Keep the original local/world transforms. Modifier width is scaled by the
    # smallest ancestor scale, then overlap clamping protects thin surfaces.
    obj.data = obj.data.copy()
    scale = min(abs(v) for v in obj.matrix_world.to_scale())
    bevel = obj.modifiers.new('Manufactured edge radius', 'BEVEL')
    bevel.width, bevel.segments = width / max(scale, .000001), 3
    bevel.limit_method, bevel.angle_limit = 'ANGLE', math.radians(35)
    bevel.harden_normals = True
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    weighted = obj.modifiers.new('Stable face normals', 'WEIGHTED_NORMAL')
    weighted.keep_sharp = True
    weighted.weight = 50
    changes.append({'object': name, 'bevelRoomUnits': width, 'segments': 3})

# Export only source objects, including the panorama and all four anchor roots.
# Camera/lights are Blender review tools and do not add runtime draw calls.
bpy.ops.object.select_all(action='DESELECT')
for obj in source_objects:
    obj.select_set(True)
bpy.context.view_layer.update()
bpy.ops.export_scene.gltf(filepath=str(OUT / 'workspace-refined-source.glb'),
    export_format='GLB', use_selection=True, export_apply=True,
    export_extras=True, export_cameras=False, export_lights=False)
scene.render.filepath = str(OUT / 'after.png')
bpy.ops.render.render(write_still=True)

# Open into the exact comparison camera in material preview.
for screen in bpy.data.screens:
    for editor in screen.areas:
        if editor.type == 'VIEW_3D':
            editor.spaces.active.region_3d.view_perspective = 'CAMERA'
            editor.spaces.active.shading.type = 'MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'workspace-refined.blend'))
(OUT / 'refinement.json').write_text(json.dumps({
    'blender': bpy.app.version_string, 'source': 'public/model/main.glb',
    'changes': changes, 'sourceMeshes': sum(o.type == 'MESH' for o in source_objects),
    'screenUnmodified': True,
}, indent=2), encoding='utf-8')
print('WORKSPACE_REFINED', len(changes), 'targeted changes')
