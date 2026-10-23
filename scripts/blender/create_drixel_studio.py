"""Create and save the DRIXEL studio asset in Blender 4.x.

Usage: blender -b --python scripts/blender/create_drixel_studio.py
Outputs build/studio/drixel_room.blend and build/studio/drixel_room.glb.
The room is intentionally geometry-only: bake lighting and KTX2 in the art pipeline
before claiming the final scene is photorealistic. One unit is one metre.
"""
import bpy, math, os
from mathutils import Vector

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, rgba, roughness=0.85, metal=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*rgba,1);m.use_nodes=True
    bsdf=m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value=(*rgba,1)
    bsdf.inputs['Roughness'].default_value=roughness
    bsdf.inputs['Metallic'].default_value=metal
    return m
cream=material('DRIXEL plaster / warm cream',(0.89,0.87,0.82))
floor=material('Polished grey concrete',(0.68,0.68,0.66),0.65)
wood=material('Natural oak',(0.49,0.34,0.22))
metal=material('Brushed stainless',(0.41,0.40,0.39),0.34,0.77)
black=material('DRIXEL black',(0.045,0.04,0.04))

def box(name, loc, dims, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    ob=bpy.context.object;ob.name=name;ob.dimensions=dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.data.materials.append(mat)
    bevel=ob.modifiers.new('Subtle eased edges','BEVEL');bevel.width=0.008;bevel.segments=2
    ob.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
    return ob

def rod(name, loc, radius, length, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=radius,depth=length,location=loc,rotation=rot)
    bpy.context.object.name=name;bpy.context.object.data.materials.append(metal)

W,D,H=14,8,4.2
box('Concrete floor',(0,0,-0.08),(W,D,0.16),floor)
box('Rear cream wall',(0,-4,H/2),(W,0.16,H),cream)
box('Left cream wall',(-7,0,H/2),(0.16,D,H),cream)
box('Right cream wall',(7,0,H/2),(0.16,D,H),cream)
box('Ceiling',(0,0,H+0.06),(W,D,0.12),cream)
box('Rear skirting',(0,-3.87,0.08),(W,0.09,0.16),wood)
for x in (-6.9,6.9):box('Side skirting',(x,0,0.08),(0.09,D,0.16),wood)

# Clothing fixture, front of back wall
rod('Clothing rail', (0,-3.22,2.53),0.022,6.2,(0,math.pi/2,0))
for x in (-2.88,0,2.88):
    rod('Clothing rail mount',(x,-3.52,2.53),0.024,0.55,(math.pi/2,0,0))
    box('Rail wall plate',(x,-3.86,2.53),(0.2,0.035,0.2),metal)

for row in range(3):
    for col in range(3):
        box('Shoe floating ledge',( -5.5+col*1.13,-3.24,0.85+row*0.92),(0.9,0.67,0.075),wood)

# Cubby, with physically joined uprights and shelves.
box('Bag cubby back',(4.75,-3.78,1.6),(3.25,0.08,2.48),wood)
for x in (3.125,4.208,5.292,6.375):
    box('Cubby upright',(x,-3.42,1.6),(0.075,0.85,2.48),wood)
for z in (0.36,1.58,2.80):
    box('Cubby shelf',(4.75,-3.42,z),(3.25,0.85,0.075),wood)

box('Cap peg board',(6.02,-1.05,2.1),(1.9,0.09,2.15),wood)
for x in (5.4,6.05,6.65):
    for z in (1.6,2.55):
        rod('Cap peg',(x,-0.84,z),0.02,0.20,(math.pi/2,0,0))

# Brand wordmark is an original sign, not Nike geometry.
curve=bpy.data.curves.new('DRIXEL letter profiles','FONT')
curve.body='DRIXEL';curve.align_x='CENTER';curve.size=0.48;curve.extrude=0.008
ob=bpy.data.objects.new('DRIXEL wall wordmark',curve)
bpy.context.collection.objects.link(ob)
ob.location=(0,-3.9,3.48);ob.rotation_euler=(math.pi/2,0,0)
ob.data.materials.append(black)

def area(name,loc,power,size):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size
    ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);ob.location=loc
    direction=Vector((0,0,0))-ob.location;ob.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
area('Soft overhead skylight',(0,0,4),1100,7)
area('Gentle side fill',(-4,2,3.3),560,5)

bpy.context.scene.render.engine='CYCLES'
bpy.context.scene.cycles.samples=96
bpy.context.scene.world.color=(0.75,0.75,0.75)
bpy.ops.object.camera_add(location=(0,6.5,1.7))
cam=bpy.context.object;target=Vector((0,-3.5,1.65))
cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.lens=48;bpy.context.scene.camera=cam
out=os.path.abspath('build/studio');os.makedirs(out,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'drixel_room.blend'))
# GLB contains geometry and physically based materials; Blender's Cycles lights are
# NOT baked by glTF export. Production lightmap baking is a separate mandatory step.
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'drixel_room.glb'),export_format='GLB',export_apply=True)
print('DRIXEL studio authored at',out)
