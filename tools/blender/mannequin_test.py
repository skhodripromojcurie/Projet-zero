"""Mannequin de test, créé de toutes pièces par ce script (aucun asset externe).

Il remplace Adam pour éprouver les scripts d'évaluation, d'habillage et
d'export : corps continu (modificateur Skin), pose A, squelette nommé comme le
squelette MPFB 2 « game engine », poids automatiques. Ce n'est pas Adam.

    blender --background --python tools/blender/mannequin_test.py -- sortie.blend [sortie.glb]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import commun  # noqa: E402

# Nœuds du squelette : nom, position (m, Z vers le haut, regard vers -Y), rayons (x, y).
NOEUDS = {
    "pelvis": ((0, 0, 0.98), (0.15, 0.1)),
    "taille": ((0, 0.005, 1.1), (0.135, 0.095)),
    "poitrine": ((0, 0.0, 1.3), (0.16, 0.1)),
    "epaules": ((0, 0.01, 1.43), (0.12, 0.08)),
    "cou": ((0, 0.015, 1.52), (0.052, 0.05)),
    "machoire": ((0, -0.005, 1.6), (0.07, 0.08)),
    "crane": ((0, 0.0, 1.69), (0.085, 0.1)),
    "sommet": ((0, 0.0, 1.76), (0.06, 0.07)),
}
for cote, s in (("l", 1), ("r", -1)):
    NOEUDS.update(
        {
            f"epaule_{cote}": ((s * 0.19, 0.01, 1.42), (0.058, 0.058)),
            f"coude_{cote}": ((s * 0.39, 0.02, 1.21), (0.042, 0.042)),
            f"poignet_{cote}": ((s * 0.56, 0.0, 1.03), (0.03, 0.022)),
            f"doigts_{cote}": ((s * 0.66, -0.01, 0.92), (0.025, 0.012)),
            f"hanche_{cote}": ((s * 0.095, 0, 0.93), (0.088, 0.088)),
            f"genou_{cote}": ((s * 0.105, -0.005, 0.51), (0.056, 0.058)),
            f"cheville_{cote}": ((s * 0.11, 0.02, 0.09), (0.038, 0.04)),
            f"orteils_{cote}": ((s * 0.115, -0.13, 0.03), (0.04, 0.025)),
        }
    )
ARETES = [
    ("pelvis", "taille"), ("taille", "poitrine"), ("poitrine", "epaules"),
    ("epaules", "cou"), ("cou", "machoire"), ("machoire", "crane"), ("crane", "sommet"),
]
for c in "lr":
    ARETES += [
        ("epaules", f"epaule_{c}"), (f"epaule_{c}", f"coude_{c}"),
        (f"coude_{c}", f"poignet_{c}"), (f"poignet_{c}", f"doigts_{c}"),
        ("pelvis", f"hanche_{c}"), (f"hanche_{c}", f"genou_{c}"),
        (f"genou_{c}", f"cheville_{c}"), (f"cheville_{c}", f"orteils_{c}"),
    ]

# Os : nom MPFB, tête, queue, parent.
OS = [
    ("pelvis", "pelvis", "taille", None),
    ("spine_01", "taille", "poitrine", "pelvis"),
    ("spine_03", "poitrine", "epaules", "spine_01"),
    ("neck_01", "epaules", "machoire", "spine_03"),
    ("head", "machoire", "sommet", "neck_01"),
]
for c in "lr":
    OS += [
        (f"clavicle_{c}", "epaules", f"epaule_{c}", "spine_03"),
        (f"upperarm_{c}", f"epaule_{c}", f"coude_{c}", f"clavicle_{c}"),
        (f"lowerarm_{c}", f"coude_{c}", f"poignet_{c}", f"upperarm_{c}"),
        (f"hand_{c}", f"poignet_{c}", f"doigts_{c}", f"lowerarm_{c}"),
        (f"thigh_{c}", f"hanche_{c}", f"genou_{c}", "pelvis"),
        (f"calf_{c}", f"genou_{c}", f"cheville_{c}", f"thigh_{c}"),
        (f"foot_{c}", f"cheville_{c}", f"orteils_{c}", f"calf_{c}"),
    ]


def creer_corps():
    noms = list(NOEUDS)
    mesh = bpy.data.meshes.new("Mannequin")
    mesh.from_pydata(
        [NOEUDS[n][0] for n in noms],
        [(noms.index(a), noms.index(b)) for a, b in ARETES],
        [],
    )
    corps = bpy.data.objects.new("Mannequin de test", mesh)
    bpy.context.scene.collection.objects.link(corps)
    skin = corps.modifiers.new("Peau", "SKIN")
    skin.use_smooth_shade = True
    for i, n in enumerate(noms):
        mesh.skin_vertices[0].data[i].radius = NOEUDS[n][1]
    mesh.skin_vertices[0].data[0].use_root = True
    subdivision = corps.modifiers.new("Lissage", "SUBSURF")
    subdivision.levels = 2
    bpy.context.view_layer.objects.active = corps
    corps.select_set(True)
    bpy.ops.object.modifier_apply(modifier="Peau")
    bpy.ops.object.modifier_apply(modifier="Lissage")
    bpy.ops.object.shade_smooth()
    mat = bpy.data.materials.new("Peau neutre")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.55, 0.42, 0.36, 1)
    bsdf.inputs["Roughness"].default_value = 0.55
    corps.data.materials.append(mat)
    return corps


def creer_squelette():
    donnees = bpy.data.armatures.new("Squelette")
    armature = bpy.data.objects.new("Armature", donnees)
    bpy.context.scene.collection.objects.link(armature)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode="EDIT")
    for nom, tete, queue, parent in OS:
        bone = donnees.edit_bones.new(nom)
        bone.head = Vector(NOEUDS[tete][0])
        bone.tail = Vector(NOEUDS[queue][0])
        if parent:
            bone.parent = donnees.edit_bones[parent]
            bone.use_connect = False
    bpy.ops.object.mode_set(mode="OBJECT")
    return armature


def creer_yeux():
    """Deux globes simples, pour éprouver le script d'expressions."""
    objets = []
    for x in (0.032, -0.032):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.012, location=(x, -0.088, 1.668), segments=16, ring_count=10)
        objets.append(bpy.context.active_object)
    with bpy.context.temp_override(active_object=objets[0], selected_editable_objects=objets, selected_objects=objets):
        bpy.ops.object.join()
    yeux = objets[0]
    yeux.name = "Yeux"
    mat = bpy.data.materials.new("Œil")
    mat.use_nodes = True
    mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.8, 0.78, 0.74, 1)
    yeux.data.materials.append(mat)
    return yeux


def main():
    args = commun.arguments()
    sortie_blend = args[0] if args else "mannequin_test.blend"
    commun.vider_scene()
    corps = creer_corps()
    armature = creer_squelette()
    bpy.ops.object.select_all(action="DESELECT")
    corps.select_set(True)
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    yeux = creer_yeux()
    bpy.ops.object.select_all(action="DESELECT")
    yeux.select_set(True)
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature
    armature.data.bones.active = armature.data.bones["head"]
    bpy.ops.object.mode_set(mode="POSE")
    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.parent_set(type="BONE")
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(sortie_blend))
    if len(args) > 1:
        bpy.ops.export_scene.gltf(filepath=os.path.abspath(args[1]), export_format="GLB")
    print(f"Mannequin de test : {len(corps.data.vertices)} sommets, {len(OS)} os.")


if __name__ == "__main__":
    main()
