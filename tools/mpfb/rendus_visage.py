"""Rendus Cycles d'un visage : face, trois-quarts, profil, yeux, bouche (et en pied).

Les caméras sont placées d'après les repères anatomiques MPFB, pour que toutes
les variantes soient cadrées exactement de la même façon.
"""

import math
import os

import bpy
from mathutils import Vector

import commun

VUES = ("face", "trois-quarts", "profil", "yeux", "bouche")


def preparer_scene(echantillons):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = echantillons
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 6
    scene.cycles.transparent_max_bounces = 24
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    if scene.world is None:
        scene.world = bpy.data.worlds.new("Monde")
    scene.world.use_nodes = True
    fond = scene.world.node_tree.nodes.get("Background")
    fond.inputs[0].default_value = (0.03, 0.036, 0.042, 1)
    fond.inputs[1].default_value = 0.6


def eclairage_portrait(centre):
    """Clé douce trois-quarts, remplissage, contre-jour : lisible, sans effet de style."""
    cx, cy, cz = centre
    for objet in [o for o in bpy.data.objects if o.type == "LIGHT"]:
        bpy.data.objects.remove(objet)
    commun.lumiere("Clé", "AREA", (cx - 0.9, cy - 1.0, cz + 0.55), centre, 32, (1.0, 0.96, 0.92), 0.9)
    commun.lumiere("Remplissage", "AREA", (cx + 1.1, cy - 0.7, cz + 0.1), centre, 9, (0.86, 0.9, 1.0), 1.2)
    commun.lumiere("Contre", "AREA", (cx + 0.4, cy + 1.0, cz + 0.6), centre, 26, (0.85, 0.9, 1.0), 0.6)


def rendre_visage(reperes, dossier, prefixe="", echantillons=24, vues=VUES, pied=None):
    os.makedirs(dossier, exist_ok=True)
    preparer_scene(echantillons)
    g, d = reperes["joint-l-eye"], reperes["joint-r-eye"]
    yeux = (g + d) / 2
    ecart = (g - d).length
    avant = yeux.y - ecart * 0.25  # surface des paupières
    centre = Vector((yeux.x, avant + 0.09, yeux.z - 0.035))
    bouche = Vector((yeux.x, avant - 0.005, yeux.z - 1.25 * ecart))
    eclairage_portrait(tuple(centre))
    scene = bpy.context.scene
    plans = {
        "face": ((centre.x, centre.y - 0.82, centre.z + 0.01), centre, 85, (800, 1000)),
        "trois-quarts": (
            (centre.x - 0.82 * math.sin(math.radians(40)), centre.y - 0.82 * math.cos(math.radians(40)), centre.z + 0.01),
            centre, 85, (800, 1000),
        ),
        "profil": ((centre.x - 0.82, centre.y, centre.z), centre, 85, (800, 1000)),
        "yeux": ((yeux.x, avant - 0.34, yeux.z + 0.004), Vector((yeux.x, avant, yeux.z)), 85, (1000, 500)),
        "bouche": ((bouche.x - 0.06, bouche.y - 0.33, bouche.z + 0.01), bouche, 85, (1000, 500)),
    }
    fichiers = []
    for nom in vues:
        position, cible, focale, (largeur, hauteur) = plans[nom]
        scene.render.resolution_x, scene.render.resolution_y = largeur, hauteur
        camera = commun.camera(nom, position, tuple(cible), focale)
        chemin = os.path.join(dossier, f"{prefixe}{nom}.png")
        commun.rendre(camera, chemin)
        fichiers.append(chemin)
    if pied:
        mini, maxi = pied
        hauteur = maxi.z - mini.z
        scene.render.resolution_x, scene.render.resolution_y = (720, 1280)
        eclairage_portrait((0.0, 0.0, mini.z + hauteur * 0.6))
        camera = commun.camera("pied", (0.4, -4.3, mini.z + hauteur * 0.55), (0.0, 0.0, mini.z + hauteur * 0.5), 55)
        chemin = os.path.join(dossier, f"{prefixe}pied.png")
        commun.rendre(camera, chemin)
        fichiers.append(chemin)
    return fichiers
