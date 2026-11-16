# Render 18 glossy 3D badge icons for Cope AI (Astra palette):
# 12 orbit badges + 6 learning-concept badges.
# Reproducible: run headless with Blender 5.2 LTS, Cycles CPU, no denoiser
# (old Sandy Bridge CPU without AVX2; OIDN may crash). Fixed seed.
#
#   "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" \
#       --background --python scripts/render-badges.py
#
# Optional args after "--":
#   --only rocket,earth     render a subset
#   --samples 32            override sample count (final default 64)
#   --size 256              override resolution (final default 512)
#   --outdir <abs path>     override output dir (default repo art dir)
#
# Original procedural geometry only. No external assets.

import bpy
import math
import os
import sys
import time
from mathutils import Vector

REPO = "C:/Users/USUARIO/cope-ai"
OUT_DIR = REPO + "/src/features/achievements/art"
ICONS = [
    "rocket", "earth", "moon", "mars", "jupiter", "sun",
    "asteroid", "comet", "nebula", "galaxy", "supernova", "universe",
    "spaced-repetition", "active-recall", "feynman", "pomodoro",
    "newton", "pythagoras",
]
SAMPLES = 64
SIZE = 512
SEED = 7

# ----------------------------- args ----------------------------------------
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
only = None
i = 0
while i < len(argv):
    if argv[i] == "--only":
        only = argv[i + 1].split(","); i += 2
    elif argv[i] == "--samples":
        SAMPLES = int(argv[i + 1]); i += 2
    elif argv[i] == "--size":
        SIZE = int(argv[i + 1]); i += 2
    elif argv[i] == "--outdir":
        OUT_DIR = argv[i + 1].replace("\\", "/"); i += 2
    else:
        i += 1

# ----------------------------- helpers -------------------------------------

def srgb(hexstr):
    """sRGB hex -> linear RGBA tuple (Blender node colors are linear)."""
    h = hexstr.lstrip("#")
    c = [int(h[j:j + 2], 16) / 255.0 for j in (0, 2, 4)]
    lin = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c]
    return (*lin, 1.0)

INDIGO = srgb("#6d8bff")
VIOLET = srgb("#a06bff")
CYAN = srgb("#4fd8ff")
WHITE = srgb("#ffffff")


def new_obj(name, mesh_or_data):
    ob = bpy.data.objects.new(name, mesh_or_data)
    bpy.context.collection.objects.link(ob)
    return ob


def uv_sphere(name, r=1.0, loc=(0, 0, 0), seg=48, rings=24, scale=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings,
                                         radius=r, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    if scale:
        ob.scale = scale
    smooth(ob)
    return ob


def ico_sphere(name, r=1.0, loc=(0, 0, 0), subdiv=3):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdiv, radius=r, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    smooth(ob)
    return ob


def smooth(ob):
    for p in ob.data.polygons:
        p.use_smooth = True


def cylinder(name, r=0.5, depth=1.0, loc=(0, 0, 0), verts=48):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    smooth(ob)
    return ob


def cone(name, r1=0.5, r2=0.0, depth=1.0, loc=(0, 0, 0), verts=48):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2,
                                    depth=depth, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    smooth(ob)
    return ob


def torus(name, major=1.0, minor=0.05, loc=(0, 0, 0), rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_segments=96, minor_segments=16,
                                     major_radius=major, minor_radius=minor,
                                     location=loc, rotation=rot)
    ob = bpy.context.active_object
    ob.name = name
    smooth(ob)
    return ob


def cube(name, size=1.0, loc=(0, 0, 0), scale=None):
    bpy.ops.mesh.primitive_cube_add(size=size, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    if scale:
        ob.scale = scale
    return ob


def glossy(name, color, rough=0.22, metal=0.0, emit=None, emit_str=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if emit is not None:
        bsdf.inputs["Emission Color"].default_value = emit
        bsdf.inputs["Emission Strength"].default_value = emit_str
    return mat


def emissive(name, color, strength=2.0):
    return glossy(name, color, rough=0.4, emit=color, emit_str=strength)


def glow_mat(name, color, strength=2.0, power=2.0):
    """Soft volumetric-looking glow: emission at center fading to transparent
    at the silhouette (dot(Incoming, Normal) driven). Composites over any UI."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    mix = nt.nodes.new("ShaderNodeMixShader")
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = color
    em.inputs["Strength"].default_value = strength
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    dot = nt.nodes.new("ShaderNodeVectorMath")
    dot.operation = "DOT_PRODUCT"
    clamp = nt.nodes.new("ShaderNodeMath")
    clamp.operation = "MAXIMUM"
    clamp.inputs[1].default_value = 0.0
    pw = nt.nodes.new("ShaderNodeMath")
    pw.operation = "POWER"
    pw.inputs[1].default_value = power
    nt.links.new(geo.outputs["Incoming"], dot.inputs[0])
    nt.links.new(geo.outputs["Normal"], dot.inputs[1])
    nt.links.new(dot.outputs["Value"], clamp.inputs[0])
    nt.links.new(clamp.outputs[0], pw.inputs[0])
    nt.links.new(pw.outputs[0], mix.inputs["Fac"])
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    return mat


def assign(ob, mat):
    ob.data.materials.clear()
    ob.data.materials.append(mat)


def surf_blob(name, direction, dist, radius, flat, mat):
    """Flattened sphere hugging a planet surface (continents, caps, spots)."""
    d = Vector(direction).normalized()
    ob = uv_sphere(name, r=radius, loc=d * dist, seg=32, rings=16)
    ob.scale = (1, 1, flat)
    ob.rotation_mode = "QUATERNION"
    ob.rotation_quaternion = d.to_track_quat("Z", "Y")
    assign(ob, mat)
    return ob


def apply_modifiers(ob):
    deps = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(deps)
    me = bpy.data.meshes.new_from_object(ev)
    old = ob.data
    ob.modifiers.clear()
    ob.data = me
    bpy.data.meshes.remove(old)


def boolean_cut(target, cutter):
    m = target.modifiers.new("cut", "BOOLEAN")
    m.operation = "DIFFERENCE"
    m.solver = "EXACT"
    m.object = cutter
    bpy.context.view_layer.objects.active = target
    apply_modifiers(target)
    bpy.data.objects.remove(cutter, do_unlink=True)


def scale_all(factor):
    """Scale every mesh object about the world origin (framing fix)."""
    for ob in bpy.context.scene.objects:
        if ob.type == "MESH":
            ob.location *= factor
            ob.scale *= factor


def star(name, loc, r=0.04, strength=3.0):
    ob = ico_sphere(name, r=r, loc=loc, subdiv=2)
    assign(ob, emissive(name + "_mat", WHITE, strength))
    return ob


def area_light(name, loc, energy, size=5.0, color=(1, 1, 1)):
    ld = bpy.data.lights.new(name, "AREA")
    ld.energy = energy
    ld.size = size
    ld.color = color
    ob = new_obj(name, ld)
    ob.location = loc
    d = Vector((0, 0, 0)) - Vector(loc)
    ob.rotation_mode = "QUATERNION"
    ob.rotation_quaternion = d.to_track_quat("-Z", "Y")
    return ob


def setup_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = SAMPLES
    scene.cycles.use_denoising = False  # OIDN unsafe on non-AVX2 CPU
    scene.cycles.seed = SEED
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = 0.05
    scene.cycles.max_bounces = 6
    scene.cycles.transparent_max_bounces = 16
    scene.render.resolution_x = SIZE
    scene.render.resolution_y = SIZE
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"

    cam_data = bpy.data.cameras.new("cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = 4.2  # objects ~3.4 wide -> ~80% of frame
    cam = new_obj("cam", cam_data)
    cam.location = (0, -10, 0)
    cam.rotation_euler = (math.pi / 2, 0, 0)
    scene.camera = cam

    world = bpy.data.worlds.new("world")
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (0.02, 0.03, 0.08, 1.0)
    bg.inputs["Strength"].default_value = 0.35
    scene.world = world

    area_light("key", (-4, -5, 5), 500, size=5.0)
    area_light("rim", (3.5, 4, 2.5), 350, size=4.0, color=(0.65, 0.8, 1.0))
    area_light("fill", (4, -4, -2), 90, size=6.0, color=(0.75, 0.7, 1.0))


def render_icon(name):
    out = os.path.join(OUT_DIR, name + ".png").replace("\\", "/")
    bpy.context.scene.render.filepath = out
    t0 = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"[badges] {name}: {time.time() - t0:.1f}s -> {out}", flush=True)


# ----------------------------- icons ---------------------------------------

def build_rocket():
    body_m = glossy("body", srgb("#e8edff"), rough=0.18)
    nose_m = glossy("nose", VIOLET, rough=0.2)
    fin_m = glossy("fin", INDIGO, rough=0.25, metal=0.3)
    glass_m = glossy("glass", CYAN, rough=0.08, emit=CYAN, emit_str=0.5)
    flame_m = emissive("flame", srgb("#ff9a4d"), 2.5)
    flame_in = emissive("flame_in", srgb("#ffe08a"), 3.5)

    parts = []
    parts.append(cylinder("body", r=0.42, depth=1.3, loc=(0, 0, 0.15)))
    parts.append(cone("nose", r1=0.42, r2=0.02, depth=0.65, loc=(0, 0, 1.12)))
    # fins: triangular prisms, three around the body
    for k, ang in enumerate((0, math.pi, math.pi / 2)):
        me = bpy.data.meshes.new(f"fin{k}")
        v = [(0.30, 0.045, -0.10), (0.78, 0.045, -0.72), (0.30, 0.045, -0.62),
             (0.30, -0.045, -0.10), (0.78, -0.045, -0.72), (0.30, -0.045, -0.62)]
        f = [(0, 1, 2), (3, 5, 4), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)]
        me.from_pydata(v, [], f)
        me.update()
        fin = new_obj(f"fin{k}", me)
        fin.rotation_euler = (0, 0, ang)
        parts.append(fin)
    # porthole on camera-facing side
    rim = torus("porthole_rim", major=0.17, minor=0.05,
                loc=(0, -0.40, 0.38), rot=(math.pi / 2, 0, 0))
    parts.append(rim)
    glass = uv_sphere("porthole_glass", r=0.15, loc=(0, -0.42, 0.38), seg=32, rings=16)
    glass.scale = (1, 0.5, 1)
    parts.append(glass)
    # flame (wide end up)
    fl = cone("flame", r1=0.02, r2=0.30, depth=0.75, loc=(0, 0, -0.92))
    parts.append(fl)
    fi = cone("flame_in", r1=0.01, r2=0.16, depth=0.5, loc=(0, 0, -0.82))
    parts.append(fi)

    mats = [body_m, nose_m, fin_m, fin_m, fin_m, nose_m, glass_m, flame_m, flame_in]
    for ob, m in zip(parts, mats):
        assign(ob, m)
    # gentle diagonal tilt for a dynamic product shot
    root = new_obj("rocket_root", None)
    for ob in parts:
        ob.parent = root
    root.rotation_euler = (math.radians(8), math.radians(16), 0)
    scale_all(1.15)


def build_earth():
    sea = glossy("sea", srgb("#3f8ff5"), rough=0.15)
    land = glossy("land", srgb("#3fd68c"), rough=0.3)
    cloud = glossy("cloud", WHITE, rough=0.4)
    ring_m = glossy("ring", srgb("#9fc4ff"), rough=0.2, metal=0.6,
                    emit=INDIGO, emit_str=0.25)
    planet = uv_sphere("earth", r=1.0)
    assign(planet, sea)
    surf_blob("land1", (-0.45, -0.8, 0.35), 0.97, 0.38, 0.28, land)
    surf_blob("land2", (0.5, -0.75, -0.3), 0.97, 0.30, 0.26, land)
    surf_blob("land3", (0.15, -0.5, 0.8), 0.97, 0.22, 0.25, land)
    surf_blob("cloud1", (-0.3, -0.9, -0.45), 1.03, 0.26, 0.18, cloud)
    surf_blob("cloud2", (0.55, -0.6, 0.55), 1.03, 0.20, 0.16, cloud)
    torus("orbit", major=1.55, minor=0.05,
          rot=(math.radians(20), math.radians(-24), 0))
    assign(bpy.data.objects["orbit"], ring_m)


def build_moon():
    body = glossy("moon_body", srgb("#dfe3f2"), rough=0.35)
    moon = uv_sphere("moon", r=1.0, seg=64, rings=32)
    assign(moon, body)
    craters = [((-0.45, -0.8, 0.3), 0.24), ((0.4, -0.75, -0.45), 0.30),
               ((0.55, -0.7, 0.4), 0.16), ((-0.2, -0.85, -0.55), 0.14),
               ((-0.7, -0.5, -0.2), 0.18)]
    for k, (d, r) in enumerate(craters):
        dv = Vector(d).normalized()
        cut = uv_sphere(f"cut{k}", r=r, loc=dv * (1.0 + r * 0.45), seg=24, rings=12)
        boolean_cut(moon, cut)
    smooth(moon)
    ring_m = glossy("ring", srgb("#cbd6f5"), rough=0.25, metal=0.5)
    ring = torus("orbit", major=1.5, minor=0.04,
                 rot=(math.radians(18), math.radians(-20), 0))
    assign(ring, ring_m)


def build_mars():
    mat = glossy("mars", srgb("#e2724a"), rough=0.4)
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 3.5
    noise.inputs["Detail"].default_value = 4.0
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = srgb("#8c2f2a")
    ramp.color_ramp.elements[1].color = srgb("#f0906a")
    nt.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.15
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    planet = uv_sphere("mars", r=1.0)
    assign(planet, mat)
    cap = glossy("cap", srgb("#fff4ea"), rough=0.3)
    surf_blob("polar_cap", (0.1, -0.15, 1.0), 0.93, 0.35, 0.25, cap)
    dark = glossy("mare", srgb("#9c3a2c"), rough=0.45)
    surf_blob("dark1", (-0.5, -0.8, 0.1), 0.96, 0.30, 0.22, dark)
    surf_blob("dark2", (0.45, -0.8, -0.35), 0.96, 0.24, 0.22, dark)
    planet.rotation_euler = (math.radians(12), 0, 0)
    scale_all(1.5)  # no orbit ring: fill ~75% of frame


def build_jupiter():
    mat = glossy("jupiter", srgb("#d9a273"), rough=0.25)
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    mul = nt.nodes.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    mul.inputs[1].default_value = 14.0
    sine = nt.nodes.new("ShaderNodeMath")
    sine.operation = "SINE"
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    els = ramp.color_ramp.elements
    els[0].position = 0.0
    els[0].color = srgb("#a9704c")
    els[1].position = 1.0
    els[1].color = srgb("#f5dfc0")
    e = ramp.color_ramp.elements.new(0.5)
    e.color = srgb("#d9a273")
    nt.links.new(tc.outputs["Generated"], sep.inputs[0])
    nt.links.new(sep.outputs["Z"], mul.inputs[0])
    nt.links.new(mul.outputs[0], sine.inputs[0])
    # sine is -1..1 -> map to 0..1
    mapn = nt.nodes.new("ShaderNodeMapRange")
    mapn.inputs["From Min"].default_value = -1.0
    mapn.inputs["From Max"].default_value = 1.0
    nt.links.new(sine.outputs[0], mapn.inputs["Value"])
    nt.links.new(mapn.outputs[0], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    planet = uv_sphere("jupiter", r=1.05)
    assign(planet, mat)
    storm = glossy("storm", srgb("#d1604a"), rough=0.25)
    surf_blob("great_spot", (0.5, -0.82, -0.22), 1.01, 0.24, 0.10, storm)
    scale_all(1.5)  # no orbit ring: fill ~75% of frame


def build_sun():
    core_m = emissive("sun_core", srgb("#ffc85c"), 2.2)
    hot_m = emissive("sun_hot", srgb("#fff0b0"), 2.8)
    ray_m = emissive("sun_ray", srgb("#ffc85c"), 2.0)
    core = uv_sphere("sun", r=0.85)
    assign(core, core_m)
    hot = uv_sphere("sun_hot", r=0.72, loc=(-0.15, -0.35, 0.2))
    assign(hot, hot_m)
    glow = uv_sphere("sun_glow", r=1.12, seg=32, rings=16)
    assign(glow, glow_mat("sun_glow_m", srgb("#ff9a3c"), 1.2, power=2.5))
    for k in range(8):
        a = k * math.pi / 4
        d = Vector((math.cos(a), 0, math.sin(a)))
        ray = cone(f"ray{k}", r1=0.085, r2=0.02, depth=0.5, loc=d * 1.32)
        ray.rotation_mode = "QUATERNION"
        ray.rotation_quaternion = d.to_track_quat("Z", "Y")
        assign(ray, ray_m)


def build_asteroid():
    mat = glossy("rock", srgb("#8d95b4"), rough=0.55)
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 8.0
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.3
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    rock = ico_sphere("asteroid", r=1.05, subdiv=4)
    tex = bpy.data.textures.new("lumps", "CLOUDS")
    tex.noise_scale = 0.45
    disp = rock.modifiers.new("lumps", "DISPLACE")
    disp.texture = tex
    disp.strength = 0.32
    disp.mid_level = 0.5
    bpy.context.view_layer.objects.active = rock
    apply_modifiers(rock)
    for k, (d, r) in enumerate([((-0.4, -0.85, 0.3), 0.26),
                                ((0.55, -0.75, -0.2), 0.20),
                                ((0.1, -0.8, -0.6), 0.16)]):
        dv = Vector(d).normalized()
        cut = uv_sphere(f"cut{k}", r=r, loc=dv * (1.12 + r * 0.3), seg=24, rings=12)
        boolean_cut(rock, cut)
    smooth(rock)
    assign(rock, mat)
    rock.rotation_euler = (math.radians(10), math.radians(-12), math.radians(8))


def build_comet():
    head_m = glossy("head", srgb("#e8fbff"), rough=0.12, emit=CYAN, emit_str=0.3)
    head = uv_sphere("comet_head", r=0.62, loc=(0.75, 0, 0.55))
    assign(head, head_m)
    halo = uv_sphere("comet_halo", r=0.85, loc=(0.75, 0, 0.55), seg=32, rings=16)
    assign(halo, glow_mat("halo_m", CYAN, 0.8, power=2.5))
    # tail: tapered cone, bright near head, fading to transparent
    tail_m = bpy.data.materials.new("tail")
    tail_m.use_nodes = True
    nt = tail_m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    mix = nt.nodes.new("ShaderNodeMixShader")
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = CYAN
    em.inputs["Strength"].default_value = 1.6
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    pw = nt.nodes.new("ShaderNodeMath")
    pw.operation = "POWER"
    pw.inputs[1].default_value = 1.6
    nt.links.new(tc.outputs["Generated"], sep.inputs[0])
    nt.links.new(sep.outputs["Z"], pw.inputs[0])
    nt.links.new(pw.outputs[0], mix.inputs["Fac"])
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    direction = Vector((-0.8, 0, -0.65)).normalized()
    tail = cone("tail", r1=0.02, r2=0.42, depth=2.3,
                loc=Vector((0.75, 0, 0.55)) + direction * 1.35)
    tail.rotation_mode = "QUATERNION"
    tail.rotation_quaternion = (-direction).to_track_quat("Z", "Y")
    assign(tail, tail_m)
    star("s1", (-0.9, 0.2, 1.1), 0.05)
    star("s2", (-1.3, -0.1, -0.3), 0.04)
    star("s3", (0.1, 0.3, -1.1), 0.035)


def build_nebula():
    blobs = [
        ("pink", srgb("#ff9ad5"), (-0.45, 0.1, 0.25), 0.85, 1.3),
        ("blue", CYAN, (0.5, 0.15, -0.3), 0.8, 1.3),
        ("violet", VIOLET, (0.1, -0.1, 0.5), 0.65, 1.4),
        ("indigo", INDIGO, (-0.1, 0.3, -0.55), 0.6, 1.1),
    ]
    for name, col, loc, r, s in blobs:
        ob = uv_sphere("neb_" + name, r=r, loc=loc, seg=32, rings=16)
        assign(ob, glow_mat("neb_" + name + "_m", col, s, power=3.0))
    core = uv_sphere("neb_core", r=0.18, loc=(0.05, -0.2, 0.05))
    assign(core, emissive("neb_core_m", WHITE, 3.0))
    halo = uv_sphere("neb_core_halo", r=0.4, loc=(0.05, -0.2, 0.05), seg=24, rings=12)
    assign(halo, glow_mat("neb_core_halo_m", WHITE, 1.5, 2.0))
    for k, loc in enumerate([(-1.2, 0, 1.0), (1.25, 0, 0.9), (1.35, 0, -0.9),
                             (-1.25, 0, -0.95), (0.2, 0, 1.35)]):
        star(f"st{k}", loc, 0.045)


def build_galaxy():
    core = uv_sphere("core", r=0.22)
    assign(core, emissive("core_m", srgb("#fff2d0"), 3.5))
    halo = uv_sphere("core_halo", r=0.6, seg=32, rings=16)
    assign(halo, glow_mat("core_halo_m", srgb("#ffcf9a"), 1.6, 2.0))
    arm_cols = [CYAN, VIOLET, INDIGO]
    for arm in range(3):
        cu = bpy.data.curves.new(f"arm{arm}", "CURVE")
        cu.dimensions = "3D"
        cu.bevel_depth = 0.13
        cu.bevel_resolution = 6
        cu.use_fill_caps = True
        sp = cu.splines.new("NURBS")
        n = 40
        sp.points.add(n - 1)
        tmax = 4.4 if arm < 2 else 3.4
        for j in range(n):
            t = tmax * j / (n - 1)
            r = 0.30 + 0.31 * t
            a = t * 1.05 + arm * (2 * math.pi / 3)
            sp.points[j].co = (r * math.cos(a), r * math.sin(a), 0, 1)
            sp.points[j].radius = max(0.12, 1.0 - t / (tmax + 0.6))
        sp.use_endpoint_u = True
        sp.order_u = 4
        ob = new_obj(f"arm{arm}", cu)
        ob.rotation_euler = (math.radians(68), 0, math.radians(-22))
        assign(ob, emissive(f"arm{arm}_m", arm_cols[arm], 1.5))
    star("g1", (-1.35, 0.3, 1.1), 0.045)
    star("g2", (1.4, -0.2, -0.95), 0.05)


def build_supernova():
    core = uv_sphere("nova_core", r=0.4)
    assign(core, emissive("nova_core_m", srgb("#fffdf2"), 4.0))
    glow = uv_sphere("nova_glow", r=0.95, seg=32, rings=16)
    assign(glow, glow_mat("nova_glow_m", srgb("#ff5c7a"), 1.3, 2.2))
    glow2 = uv_sphere("nova_glow2", r=0.65, seg=32, rings=16)
    assign(glow2, glow_mat("nova_glow2_m", srgb("#ffd36b"), 1.6, 2.0))
    for k in range(8):
        a = k * math.pi / 4
        d = Vector((math.cos(a), 0, math.sin(a)))
        ray = cone(f"rayL{k}", r1=0.09, r2=0.015, depth=0.95, loc=d * 1.2)
        ray.rotation_mode = "QUATERNION"
        ray.rotation_quaternion = d.to_track_quat("Z", "Y")
        assign(ray, emissive(f"rayL{k}_m", srgb("#ffd36b"), 2.2))
        a2 = a + math.pi / 8
        d2 = Vector((math.cos(a2), 0, math.sin(a2)))
        ray2 = cone(f"rayS{k}", r1=0.06, r2=0.012, depth=0.55, loc=d2 * 1.05)
        ray2.rotation_mode = "QUATERNION"
        ray2.rotation_quaternion = d2.to_track_quat("Z", "Y")
        assign(ray2, emissive(f"rayS{k}_m", srgb("#ff8a5c"), 1.8))


def build_universe():
    rings = [
        (1.55, 0.055, (20, -18), INDIGO),
        (1.32, 0.045, (72, 62), CYAN),
        (1.1, 0.04, (48, -68), VIOLET),
    ]
    for k, (maj, minor, tilt, col) in enumerate(rings):
        ring = torus(f"ring{k}", major=maj, minor=minor,
                     rot=(math.radians(tilt[0]), math.radians(tilt[1]), 0))
        assign(ring, glossy(f"ring{k}_m", col, rough=0.18, metal=0.5,
                            emit=col, emit_str=0.35))
    core = uv_sphere("uni_core", r=0.2)
    assign(core, emissive("uni_core_m", WHITE, 3.0))
    halo = uv_sphere("uni_halo", r=0.55, seg=32, rings=16)
    assign(halo, glow_mat("uni_halo_m", srgb("#8fb4ff"), 1.4, 2.0))
    for k, loc in enumerate([(-1.3, 0.2, 1.05), (1.35, -0.1, 0.85),
                             (1.15, 0.2, -1.1), (-1.2, -0.2, -1.0),
                             (0.5, 0.3, 1.45), (-1.5, 0, 0.1)]):
        star(f"us{k}", loc, 0.045)


# ------------------------- learning concepts -------------------------------

def build_spaced_repetition():
    """Three stacked cards with a glowing loop: review at the right time."""
    face = glossy("sr_face", srgb("#e8edff"), rough=0.18)
    edge = glossy("sr_edge", INDIGO, rough=0.25, metal=0.35)
    for k, z in enumerate((-0.30, 0.0, 0.30)):
        card = cube(f"sr_card{k}", size=1.0, loc=(0, -0.14 * k, z))
        card.scale = (1.40, 0.06, 0.95)
        card.rotation_euler = (0, 0, math.radians(4 * (1 - k)))
        assign(card, face if k == 2 else edge)
    loop = torus("sr_loop", major=1.3, minor=0.06,
                 rot=(math.pi / 2, 0, 0))
    assign(loop, glossy("sr_loop_m", CYAN, rough=0.16, metal=0.4,
                        emit=CYAN, emit_str=0.35))
    scale_all(1.05)


def build_active_recall():
    """Glowing bulb: the effort of recalling is what fixes the memory."""
    bulb = uv_sphere("ar_bulb", r=0.78, loc=(0, 0, 0.38), seg=48, rings=24)
    assign(bulb, glossy("ar_glass", srgb("#eafcff"), rough=0.08,
                        emit=CYAN, emit_str=0.5))
    base = cylinder("ar_base", r=0.38, depth=0.5, loc=(0, 0, -0.52))
    assign(base, glossy("ar_base_m", INDIGO, rough=0.3, metal=0.5))
    fil = torus("ar_fil", major=0.28, minor=0.045,
                loc=(0, -0.55, 0.22), rot=(math.pi / 2, 0, 0))
    assign(fil, emissive("ar_fil_m", WHITE, 3.0))
    for k, loc in enumerate([(-1.05, 0, 0.95), (1.08, 0, 0.82),
                             (0.92, 0, -0.62), (-0.98, 0, -0.5)]):
        star(f"ar_spark{k}", loc, 0.05)


def build_feynman():
    """Open book with rising ideas: explain it simply."""
    page = glossy("fy_page", srgb("#e8edff"), rough=0.38)
    cover = glossy("fy_cover", VIOLET, rough=0.25, metal=0.2)
    left = cube("fy_left", size=1.0, loc=(-0.52, 0, 0))
    left.scale = (1.05, 0.12, 1.32)
    left.rotation_euler = (0, 0, math.radians(8))
    right = cube("fy_right", size=1.0, loc=(0.52, 0, 0))
    right.scale = (1.05, 0.12, 1.32)
    right.rotation_euler = (0, 0, math.radians(-8))
    assign(left, page)
    assign(right, page)
    spine = cube("fy_spine", size=1.0, loc=(0, -0.04, 0))
    spine.scale = (0.16, 0.18, 1.4)
    assign(spine, cover)
    for k, (x, z) in enumerate(((-0.55, 0.45), (0.0, 0.85), (0.55, 0.45))):
        star(f"fy_idea{k}", (x, 0.0, z), 0.075, 2.6)


def build_pomodoro():
    """Hourglass: short focused blocks with real breaks."""
    glass = glossy("pm_glass", srgb("#bfe6ff"), rough=0.08)
    sand = emissive("pm_sand", srgb("#ffc46b"), 1.6)
    top = cone("pm_top", r1=0.72, r2=0.07, depth=0.88, loc=(0, 0, 0.48))
    bottom = cone("pm_bottom", r1=0.07, r2=0.72, depth=0.88, loc=(0, 0, -0.48))
    assign(top, glass)
    assign(bottom, glass)
    upper = cone("pm_upper_sand", r1=0.5, r2=0.04, depth=0.5, loc=(0, 0, 0.6))
    lower = cone("pm_lower_sand", r1=0.04, r2=0.5, depth=0.5, loc=(0, 0, -0.6))
    assign(upper, sand)
    assign(lower, sand)
    for z in (-1.0, 1.0):
        cap = cylinder(f"pm_cap{z}", r=0.82, depth=0.14, loc=(0, 0, z))
        assign(cap, glossy(f"pm_cap{z}_m", INDIGO, rough=0.2, metal=0.5))


def build_newton():
    """Apple with an orbit ring: F = m·a."""
    apple = uv_sphere("nw_apple", r=0.85, seg=48, rings=24)
    apple.scale = (1.0, 0.92, 0.95)
    assign(apple, glossy("nw_skin", srgb("#ff6b7a"), rough=0.22))
    stem = cylinder("nw_stem", r=0.06, depth=0.45, loc=(0.05, 0, 0.88))
    stem.rotation_euler = (0, math.radians(18), 0)
    assign(stem, glossy("nw_stem_m", srgb("#7a5230"), rough=0.5))
    leaf = uv_sphere("nw_leaf", r=0.22, loc=(0.36, 0, 1.0), seg=24, rings=12)
    leaf.scale = (1.0, 0.35, 0.5)
    assign(leaf, glossy("nw_leaf_m", srgb("#6fe0a0"), rough=0.3))
    ring = torus("nw_orbit", major=1.38, minor=0.05,
                 rot=(math.radians(62), math.radians(-14), 0))
    assign(ring, glossy("nw_orbit_m", CYAN, rough=0.18, metal=0.4,
                        emit=CYAN, emit_str=0.3))
    scale_all(1.02)


def build_pythagoras():
    """Right triangle: a² + b² = c²."""
    mat = glossy("py_bar", INDIGO, rough=0.18, metal=0.35,
                 emit=INDIGO, emit_str=0.25)
    a = Vector((-1.15, 0, -0.8))
    b = Vector((1.15, 0, -0.8))
    c = Vector((-1.15, 0, 0.95))
    for name, p, q in (("py_base", a, b), ("py_leg", a, c), ("py_hyp", b, c)):
        bar = cylinder(name, r=0.09, depth=(q - p).length,
                       loc=tuple((p + q) / 2))
        bar.rotation_mode = "QUATERNION"
        bar.rotation_quaternion = (q - p).normalized().to_track_quat("Z", "Y")
        assign(bar, mat)
    for name, p in (("py_v1", a), ("py_v2", b), ("py_v3", c)):
        assign(uv_sphere(name, r=0.15, loc=tuple(p), seg=24, rings=12),
               emissive(name + "_m", CYAN, 2.4))


BUILDERS = {
    "rocket": build_rocket, "earth": build_earth, "moon": build_moon,
    "mars": build_mars, "jupiter": build_jupiter, "sun": build_sun,
    "asteroid": build_asteroid, "comet": build_comet, "nebula": build_nebula,
    "galaxy": build_galaxy, "supernova": build_supernova, "universe": build_universe,
    "spaced-repetition": build_spaced_repetition,
    "active-recall": build_active_recall,
    "feynman": build_feynman, "pomodoro": build_pomodoro,
    "newton": build_newton, "pythagoras": build_pythagoras,
}


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    names = [n for n in ICONS if only is None or n in only]
    total0 = time.time()
    for name in names:
        setup_scene()
        BUILDERS[name]()
        render_icon(name)
    print(f"[badges] done: {len(names)} icons in {time.time() - total0:.1f}s "
          f"(Cycles CPU, {SAMPLES} samples, denoising OFF, seed {SEED})", flush=True)


if __name__ == "__main__":
    main()