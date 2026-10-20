"""Run using Blender --background --python scripts/prepare-main-universe.py."""
import bpy, json, math
from pathlib import Path
from mathutils import Vector

root = Path(__file__).resolve().parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(root / 'artifacts/blender-universe/sky-input.glb'))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
if len(meshes) != 1:
    raise RuntimeError(f'Expected exactly the original sky sphere, found {len(meshes)}')
sky = meshes[0]
# Bake the original local rotations before centring; UVs and source texture survive.
bpy.context.view_layer.objects.active = sky
bpy.ops.object.select_all(action='DESELECT'); sky.select_set(True)
matrix = sky.matrix_world.copy()
for vertex in sky.data.vertices:
    vertex.co = matrix @ vertex.co
sky.parent = None; sky.matrix_world.identity()
points = [v.co.copy() for v in sky.data.vertices]
lo = Vector(tuple(min(p[i] for p in points) for i in range(3)))
hi = Vector(tuple(max(p[i] for p in points) for i in range(3)))
center = (lo + hi) * .5
radius = max((p-center).length for p in points)
for vertex in sky.data.vertices:
    vertex.co = (vertex.co-center) * (1000/radius)
sky.name = 'MainUniverseSky'
for polygon in sky.data.polygons: polygon.use_smooth = True
for mat in sky.data.materials:
    mat.use_nodes = True; mat.use_backface_culling = False
    nodes = mat.node_tree.nodes
    image = next((n.image for n in nodes if n.type == 'TEX_IMAGE' and n.image), None)
    if image is None: raise RuntimeError('Original universe texture disappeared during import')
    # A pure emission sky is independent of the stars' lighting.
    nodes.clear(); tex = nodes.new('ShaderNodeTexImage'); tex.image = image
    emit = nodes.new('ShaderNodeEmission'); emit.inputs['Strength'].default_value = 1
    output = nodes.new('ShaderNodeOutputMaterial')
    mat.node_tree.links.new(tex.outputs['Color'], emit.inputs['Color'])
    mat.node_tree.links.new(emit.outputs['Emission'], output.inputs['Surface'])
for obj in list(bpy.context.scene.objects):
    if obj != sky: bpy.data.objects.remove(obj, do_unlink=True)
camera_data = bpy.data.cameras.new('Universe centre camera')
camera = bpy.data.objects.new('Universe centre camera',camera_data)
bpy.context.scene.collection.objects.link(camera); camera.location=(0,0,0)
camera.rotation_euler=(math.pi/2,0,0); camera_data.lens=24; camera_data.clip_end=3000
bpy.context.scene.camera=camera
# Only sky is exported; camera stays in the reviewable Blender project.
bpy.ops.object.select_all(action='DESELECT'); sky.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=str(root/'artifacts/blender-universe/main-universe.blend'))
bpy.ops.export_scene.gltf(filepath=str(root/'public/model/universe-only.glb'),export_format='GLB',use_selection=True,export_cameras=False,export_yup=True)
report={'mesh':sky.name,'meshes':1,'cameraPosition':[0,0,0],'radius':1000,'removedFurniture':True,'sourcePreserved':True}
(root/'artifacts/blender-universe/export.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('UNIVERSE_EXPORT',json.dumps(report))
if '--render-preview' in __import__('sys').argv:
    scene=bpy.context.scene; scene.render.engine='CYCLES'; scene.cycles.samples=8
    scene.render.resolution_x=1280;scene.render.resolution_y=720;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    scene.render.filepath=str(root/'artifacts/blender-universe/centre-preview.png')
    bpy.ops.render.render(write_still=True)
