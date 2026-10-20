"""Outils partagés des scripts Blender de Projet Zéro (Blender 4.2 LTS ou plus récent).

Lancer depuis un terminal, sans interface :
    blender --background --python tools/blender/<script>.py -- <arguments>
Sous Windows, remplacer « blender » par le chemin complet de blender.exe.
"""

import json
import math
import os
import sys

import bpy
from mathutils import Vector

# Articulations du studio -> os du squelette MPFB 2 « game engine ».
MPFB_GAME_ENGINE = {
    "hips": "pelvis",
    "spine": "spine_01",
    "chest": "spine_03",
    "neck": "neck_01",
    "head": "head",
    "clavicleL": "clavicle_l",
    "clavicleR": "clavicle_r",
    "upperArmL": "upperarm_l",
    "upperArmR": "upperarm_r",
    "forearmL": "lowerarm_l",
    "forearmR": "lowerarm_r",
    "handL": "hand_l",
    "handR": "hand_r",
    "thighL": "thigh_l",
    "thighR": "thigh_r",
    "shinL": "calf_l",
    "shinR": "calf_r",
    "footL": "foot_l",
    "footR": "foot_r",
}


def arguments():
    """Arguments placés après « -- » (Blender) ou après le script (module bpy)."""
    argv = sys.argv
    return argv[argv.index("--") + 1 :] if "--" in argv else argv[1:]


def vider_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def importer_glb(chemin):
    if not os.path.isfile(chemin):
        raise SystemExit(f"Fichier introuvable : {chemin}")
    bpy.ops.import_scene.gltf(filepath=chemin)


def maillages_visibles():
    """Maillages réellement rendus (l'importeur glTF crée aussi des formes d'os cachées)."""
    return [
        o
        for o in bpy.context.scene.objects
        if o.type == "MESH" and not o.hide_render and o.visible_get() and len(o.data.polygons)
        and not o.name.lower().startswith(("icosphere", "sol"))
        and not any(b.custom_shape == o for a in bpy.data.objects if a.type == "ARMATURE" for b in a.pose.bones)
    ]


def armature_principale():
    armatures = [o for o in bpy.context.scene.objects if o.type == "ARMATURE"]
    if not armatures:
        return None
    return max(armatures, key=lambda o: len(o.data.bones))


def maillages_rigges(armature):
    return [
        o
        for o in bpy.context.scene.objects
        if o.type == "MESH"
        and any(m.type == "ARMATURE" and m.object == armature for m in o.modifiers)
    ]


def corps_principal(armature):
    """Le maillage riggé le plus dense est considéré comme le corps."""
    candidats = maillages_rigges(armature) if armature else []
    if not candidats:
        candidats = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    return max(candidats, key=lambda o: len(o.data.vertices)) if candidats else None


def trouver_os(armature, articulation, table=MPFB_GAME_ENGINE):
    """Retrouve un os par le nom MPFB, le nom du studio, ou sans tenir compte de la casse."""
    noms = [table.get(articulation), articulation]
    os_par_nom = {b.name.lower(): b for b in armature.data.bones}
    for nom in noms:
        if nom and nom.lower() in os_par_nom:
            return os_par_nom[nom.lower()]
    return None


def position_os(armature, bone, extremite="head"):
    return armature.matrix_world @ getattr(bone, f"{extremite}_local")


def boite_englobante(objets):
    """Boîte des sommets évalués (déformation par le squelette comprise), en mètres."""
    depsgraph = bpy.context.evaluated_depsgraph_get()
    points = []
    for o in objets:
        evalue = o.evaluated_get(depsgraph)
        maillage = evalue.to_mesh()
        points += [evalue.matrix_world @ v.co for v in maillage.vertices]
        evalue.to_mesh_clear()
    if not points:
        return Vector((0, 0, 0)), Vector((0, 0, 0))
    mini = Vector((min(p[i] for p in points) for i in range(3)))
    maxi = Vector((max(p[i] for p in points) for i in range(3)))
    return mini, maxi


def ecrire_json(chemin, donnees):
    os.makedirs(os.path.dirname(chemin) or ".", exist_ok=True)
    with open(chemin, "w", encoding="utf-8") as f:
        json.dump(donnees, f, ensure_ascii=False, indent=2)


def regler_rendu(resolution=(1080, 1920), echantillons=48):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = echantillons
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = resolution
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    if scene.world is None:
        scene.world = bpy.data.worlds.new("Monde")
    scene.world.use_nodes = True
    fond = scene.world.node_tree.nodes.get("Background")
    fond.inputs[0].default_value = (0.035, 0.045, 0.055, 1)
    fond.inputs[1].default_value = 1.0


def lumiere(nom, type_, position, cible, energie, couleur, taille=1.0):
    donnees = bpy.data.lights.new(nom, type_)
    donnees.energy = energie
    donnees.color = couleur
    if type_ == "AREA":
        donnees.size = taille
    objet = bpy.data.objects.new(nom, donnees)
    bpy.context.scene.collection.objects.link(objet)
    objet.location = position
    viser(objet, cible)
    return objet


def viser(objet, cible):
    direction = Vector(cible) - objet.location
    objet.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def eclairage_studio(centre, hauteur, ambiance="neutre"):
    """Trois points : clé, contre et remplissage. « scene » = aube froide + lampe chaude."""
    froid, chaud = (0.62, 0.78, 1.0), (1.0, 0.72, 0.45)
    cle = froid if ambiance == "scene" else (1.0, 0.97, 0.93)
    remplissage = chaud if ambiance == "scene" else (0.85, 0.9, 1.0)
    cx, cy, cz = centre
    lumiere("Clé", "AREA", (cx - 2.2, cy - 2.4, cz + hauteur * 0.55), centre, 320, cle, 1.6)
    lumiere("Remplissage", "AREA", (cx + 2.4, cy - 1.6, cz + hauteur * 0.2), centre, 90, remplissage, 2.0)
    lumiere("Contre", "AREA", (cx + 0.6, cy + 2.6, cz + hauteur * 0.8), centre, 260, (0.8, 0.88, 1.0), 1.2)


def camera(nom, position, cible, focale=50):
    donnees = bpy.data.cameras.new(nom)
    donnees.lens = focale
    objet = bpy.data.objects.new(nom, donnees)
    bpy.context.scene.collection.objects.link(objet)
    objet.location = position
    viser(objet, cible)
    return objet


def rendre(camera_objet, chemin):
    scene = bpy.context.scene
    scene.camera = camera_objet
    scene.render.filepath = chemin
    bpy.ops.render.render(write_still=True)


def sol(niveau=0.0):
    bpy.ops.mesh.primitive_plane_add(size=12, location=(0, 0, niveau))
    plan = bpy.context.active_object
    plan.name = "Sol"
    mat = bpy.data.materials.new("Sol")
    mat.use_nodes = True
    mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.05, 0.055, 0.06, 1)
    mat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.8
    plan.data.materials.append(mat)
    return plan


def radians(deg):
    return math.radians(deg)
