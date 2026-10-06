import bpy, json, math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'artifacts' / 'blender'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT / 'public/model/main.glb'))
inventory = []
for obj in bpy.data.objects:
    if obj.type != 'MESH':
        continue
    corners = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    inventory.append({
        'name': obj.name, 'parent': obj.parent.name if obj.parent else None,
        'vertices': len(obj.data.vertices), 'faces': len(obj.data.polygons),
        'smooth_faces': sum(p.use_smooth for p in obj.data.polygons),
        'scale': list(obj.scale),
        'min': [min(p[i] for p in corners) for i in range(3)],
        'max': [max(p[i] for p in corners) for i in range(3)],
        'materials': [m.name if m else None for m in obj.data.materials],
    })
materials = []
for material in bpy.data.materials:
    principled = next((n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None) if material.use_nodes else None
    materials.append({'name': material.name, 'users': material.users,
        'roughness': principled.inputs['Roughness'].default_value if principled else None,
        'metallic': principled.inputs['Metallic'].default_value if principled else None,
        'base_color': list(principled.inputs['Base Color'].default_value) if principled else None,
        'textures': [n.image.name for n in material.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image] if material.use_nodes else []})
(OUT / 'baseline-inventory.json').write_text(json.dumps({'objects': inventory, 'materials': materials}, indent=2), encoding='utf-8')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'workspace-baseline.blend'))
print('WORKSPACE_INSPECTED', len(inventory), 'meshes', len(materials), 'materials')
