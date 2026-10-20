"""Habille un personnage riggé : sweat à capuche anthracite et jean sombre, avec plis.

    blender --background --python tools/blender/habiller_adam.py -- entree.glb|.blend sortie.blend [sortie.glb]

Méthode, sans modélisation manuelle :
1. le sweat et le jean sont découpés dans le corps d'après les os qui pilotent
   chaque zone (MPFB 2 « game engine » ou noms équivalents) ;
2. ils sont lissés, élargis et subdivisés, avec des bords-côtes serrés ;
3. une simulation de tissu Blender (tissu en léger excès, bords tenus,
   collision avec le corps) crée les plis et le tombé ;
4. capuche rabattue sur le dos et cordons ;
5. les poids du squelette sont transférés du corps aux vêtements, et la peau
   cachée sous les vêtements est retirée pour éviter qu'elle ne les traverse.
Les vêtements d'origine éventuels sont retirés (PZ_GARDER_VETEMENTS=1 pour les garder) ;
cheveux, sourcils, cils, yeux, dents et chaussures sont conservés.
Réglages (variables d'environnement) : PZ_IMAGES_SIMULATION (80), PZ_EXCEDENT_TISSU
(0.16 : part de tissu en trop, plus = plus de plis), PZ_RIGIDITE_FLEXION (0.25).
"""

import math
import os
import sys
from collections import deque

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402  (à importer avant bmesh avec le module bpy)
import bmesh  # noqa: E402
from mathutils import Vector  # noqa: E402

import commun  # noqa: E402

SWEAT = ("spine", "clavicle", "upperarm", "lowerarm")
JEAN = ("pelvis", "thigh", "calf")


def os_dominant(objet):
    noms = {g.index: g.name.lower() for g in objet.vertex_groups}
    resultat = []
    for v in objet.data.vertices:
        groupes = [g for g in v.groups if g.group in noms and g.weight > 0]
        resultat.append(noms[max(groupes, key=lambda g: g.weight).group] if groupes else "")
    return resultat


def hauteurs(armature):
    def z(articulation, extremite="head", defaut=None):
        bone = commun.trouver_os(armature, articulation)
        return commun.position_os(armature, bone, extremite).z if bone else defaut

    def point(articulation, extremite="head"):
        bone = commun.trouver_os(armature, articulation)
        return commun.position_os(armature, bone, extremite) if bone else None

    return {
        "bassin": z("hips"),
        "cou": z("neck"),
        "poignet_l": point("handL"),
        "poignet_r": point("handR"),
        "cheville": min(z("footL"), z("footR")),
    }


def dupliquer(corps, nom):
    copie = corps.copy()
    copie.data = corps.data.copy()
    copie.name = nom
    copie.data.name = nom
    bpy.context.scene.collection.objects.link(copie)
    copie.shape_key_clear()
    for m in list(copie.modifiers):
        copie.modifiers.remove(m)
    copie.parent = None
    copie.matrix_world = corps.matrix_world.copy()
    return copie


def garder(objet, conserver):
    bm = bmesh.new()
    bm.from_mesh(objet.data)
    bm.verts.ensure_lookup_table()
    supprimer = [v for v in bm.verts if not conserver[v.index]]
    bmesh.ops.delete(bm, geom=supprimer, context="VERTS")
    # Ne garder que la plus grande pièce : évite les îlots isolés (doigts, orteils).
    bm.verts.ensure_lookup_table()
    vus, pieces = set(), []
    for depart in bm.verts:
        if depart.index in vus:
            continue
        piece, file = [], deque([depart])
        vus.add(depart.index)
        while file:
            v = file.popleft()
            piece.append(v)
            for e in v.link_edges:
                autre = e.other_vert(v)
                if autre.index not in vus:
                    vus.add(autre.index)
                    file.append(autre)
        pieces.append(piece)
    pieces.sort(key=len, reverse=True)
    for piece in pieces[1:]:
        if len(piece) < len(pieces[0]) * 0.2:
            bmesh.ops.delete(bm, geom=piece, context="VERTS")
    bm.to_mesh(objet.data)
    bm.free()


def couper(objet, hauteur, garder_dessus, sauf=()):
    """Coupe plane horizontale ; « sauf » protège les zones de certains os (les bras)."""
    noms = {g.index: g.name.lower() for g in objet.vertex_groups}
    bm = bmesh.new()
    bm.from_mesh(objet.data)
    deform = bm.verts.layers.deform.active
    monde = objet.matrix_world
    local = monde.inverted() @ Vector((0, 0, hauteur))

    def protege(v):
        if not deform or not sauf or not v[deform]:
            return False
        groupe = max(v[deform].items(), key=lambda item: item[1])[0]
        return noms.get(groupe, "").startswith(sauf)

    geom = [f for f in bm.faces if not any(protege(v) for v in f.verts)]
    resultat = bmesh.ops.bisect_plane(
        bm, geom=geom + list({e for f in geom for e in f.edges}) + list({v for f in geom for v in f.verts}),
        plane_co=local, plane_no=Vector((0, 0, 1)),
    )
    del resultat
    retirer = [
        v for v in bm.verts
        if not protege(v) and ((v.co.z < local.z - 1e-5) if garder_dessus else (v.co.z > local.z + 1e-5))
    ]
    bmesh.ops.delete(bm, geom=retirer, context="VERTS")
    bm.to_mesh(objet.data)
    bm.free()


def lisser_bords(bm, iterations=12):
    """Régularise les ouvertures (ourlet, poignets, col) le long du bord seulement."""
    bord = [v for v in bm.verts if v.is_boundary]
    for _ in range(iterations):
        nouvelles = {}
        for v in bord:
            voisins = [e.other_vert(v) for e in v.link_edges if e.is_boundary]
            if len(voisins) == 2:
                nouvelles[v] = v.co * 0.5 + (voisins[0].co + voisins[1].co) * 0.25
        for v, co in nouvelles.items():
            v.co = co


def anneaux_depuis_bord(bm, profondeur):
    """Distance topologique (en anneaux) de chaque sommet au bord ouvert le plus proche."""
    distance = {}
    file = deque()
    for v in bm.verts:
        if v.is_boundary:
            distance[v.index] = 0
            file.append(v)
    while file:
        v = file.popleft()
        if distance[v.index] >= profondeur:
            continue
        for e in v.link_edges:
            autre = e.other_vert(v)
            if autre.index not in distance:
                distance[autre.index] = distance[v.index] + 1
                file.append(autre)
    return distance


def modeler(objet, corps, epaisseur, bord_serrage, lissage=6):
    """Lisse les détails du corps, pose le vêtement à distance de la peau, resserre les bords."""
    bm = bmesh.new()
    bm.from_mesh(objet.data)
    for _ in range(lissage):
        bmesh.ops.smooth_vert(
            bm, verts=[v for v in bm.verts if not v.is_boundary], factor=0.5,
            use_axis_x=True, use_axis_y=True, use_axis_z=True,
        )
    bm.to_mesh(objet.data)
    bm.free()
    # Le lissage rétrécit : chaque sommet est replacé à « epaisseur » au-dessus de la peau.
    enveloppe = objet.modifiers.new("Enveloppe", "SHRINKWRAP")
    enveloppe.target = corps
    enveloppe.wrap_method = "NEAREST_SURFACEPOINT"
    enveloppe.wrap_mode = "OUTSIDE_SURFACE"
    enveloppe.offset = epaisseur
    appliquer(objet, enveloppe.name)
    bm = bmesh.new()
    bm.from_mesh(objet.data)
    lisser_bords(bm)
    bm.normal_update()
    distance = anneaux_depuis_bord(bm, 3)
    for v in bm.verts:
        if distance.get(v.index, 99) <= 2:
            v.co -= v.normal * epaisseur * (1 - bord_serrage)
    bm.to_mesh(objet.data)
    bm.free()
    sub = objet.modifiers.new("Subdivision", "SUBSURF")
    sub.levels = 1
    appliquer(objet, sub.name)
    bm = bmesh.new()
    bm.from_mesh(objet.data)
    distance = anneaux_depuis_bord(bm, 6)
    bords = objet.vertex_groups.new(name="bords")
    tissu = objet.vertex_groups.new(name="tissu")
    for v in bm.verts:
        d = distance.get(v.index, 99)
        if d <= 3:
            bords.add([v.index], 1.0, "REPLACE")
        tissu.add([v.index], min(1.0, max(0.0, (d - 3) / 3)), "REPLACE")
    bm.free()


def appliquer(objet, modificateur):
    with bpy.context.temp_override(object=objet, active_object=objet, selected_objects=[objet]):
        bpy.ops.object.modifier_apply(modifier=modificateur)


def simuler(vetements, corps, images, reglages):
    collision = corps.modifiers.new("Collision", "COLLISION")
    corps.collision.thickness_outer = 0.004
    corps.collision.cloth_friction = 8
    for objet, (excedent, masse) in zip(vetements, reglages):
        tissu = objet.modifiers.new("Tissu", "CLOTH")
        s = tissu.settings
        s.quality = 10
        s.mass = masse
        s.tension_stiffness = s.compression_stiffness = 15
        s.shear_stiffness = 5
        s.bending_stiffness = float(os.environ.get("PZ_RIGIDITE_FLEXION", "0.25"))
        s.air_damping = 2
        s.vertex_group_mass = "bords"
        s.pin_stiffness = 2
        s.vertex_group_shrink = "tissu"
        s.shrink_min = 0.0
        s.shrink_max = -excedent
        tissu.collision_settings.distance_min = 0.004
        tissu.collision_settings.use_self_collision = False
        tissu.point_cache.frame_start = 1
        tissu.point_cache.frame_end = images
    scene = bpy.context.scene
    scene.frame_start, scene.frame_end = 1, images
    for image in range(1, images + 1):
        scene.frame_set(image)
    for objet in vetements:
        appliquer(objet, "Tissu")
    corps.modifiers.remove(collision)
    scene.frame_set(1)


def projeter(p, a, b):
    """Position relative le long du segment [a, b] (0 à 1), distance à l'axe, angle autour."""
    axe = b - a
    longueur = axe.length
    s = max(0.0, min(1.0, (p - a).dot(axe) / (longueur * longueur)))
    radial = p - (a + axe * s)
    reference = axe.orthogonal().normalized()
    angle = math.atan2(axe.normalized().cross(reference).dot(radial), reference.dot(radial))
    return s, radial.length, angle, longueur


def plis(objet, armature, regles):
    """Plis guidés par le squelette, ajoutés le long des normales (déterministes)."""
    from mathutils import noise

    def os_(articulation, extremite="head"):
        bone = commun.trouver_os(armature, articulation)
        return commun.position_os(armature, bone, extremite) if bone else None

    bm = bmesh.new()
    bm.from_mesh(objet.data)
    bm.normal_update()
    monde = objet.matrix_world
    inverse = monde.inverted()
    normale_monde = monde.to_3x3()
    for v in bm.verts:
        p = monde @ v.co
        n = (normale_monde @ v.normal).normalized()
        alea = noise.noise(p * 14.0)
        decalage = 0.0
        for regle in regles:
            decalage += regle(p, alea, os_)
        v.co = inverse @ (p + n * decalage)
    bm.to_mesh(objet.data)
    bm.free()


def plis_sweat(ourlet):
    def regle(p, alea, os_):
        total = 0.0
        for cote in "LR":
            coude, poignet = os_(f"forearm{cote}"), os_(f"hand{cote}")
            epaule = os_(f"upperArm{cote}")
            if not (coude and poignet and epaule):
                continue
            s, rayon, angle, longueur = projeter(p, coude, poignet)
            if rayon < 0.09 and 0.0 < s < 1.0:
                d = (1 - s) * longueur
                # Fronces au-dessus du poignet : anneaux irréguliers.
                total += 0.0055 * math.exp(-d / 0.1) * math.sin(2 * math.pi * d / 0.032 + 1.6 * math.sin(angle * 2) + 2.2 * alea)
            s2, rayon2, angle2, longueur2 = projeter(p, epaule, coude)
            if rayon2 < 0.1 and s2 > 0.7:
                d = (1 - s2) * longueur2
                # Plis au creux du coude, côté intérieur surtout.
                interieur = 0.5 + 0.5 * math.cos(angle2)
                total += 0.004 * interieur * math.exp(-d / 0.05) * math.sin(2 * math.pi * d / 0.024 + 1.8 * alea)
        h = p.z - ourlet
        if 0.0 < h < 0.22:
            # Blousant au-dessus de la bande de l'ourlet.
            total += 0.006 * math.exp(-h / 0.07) * math.sin(2 * math.pi * h / 0.045 + 1.4 * math.sin(p.x * 22) + 2.0 * alea)
        return total

    return regle


def plis_jean(cheville):
    def regle(p, alea, os_):
        total = 0.0
        h = p.z - cheville
        if 0.0 < h < 0.3:
            # Tassement du jean sur la chaussure.
            total += 0.005 * math.exp(-h / 0.09) * math.sin(2 * math.pi * h / 0.03 + 1.5 * math.sin(p.x * 30 + p.y * 20) + 2.0 * alea)
        for cote in "LR":
            genou = os_(f"shin{cote}")
            if genou and abs(p.x - genou.x) < 0.1 and p.y > genou.y:
                d = abs(p.z - genou.z - 0.02)
                total += 0.0035 * math.exp(-d / 0.05) * math.sin(2 * math.pi * d / 0.022 + 1.5 * alea)
        return total

    return regle


def materiau(nom, couleur, rugosite, brillance_tissu):
    mat = bpy.data.materials.new(nom)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*couleur, 1)
    bsdf.inputs["Roughness"].default_value = rugosite
    if "Sheen Weight" in bsdf.inputs:
        bsdf.inputs["Sheen Weight"].default_value = brillance_tissu
        bsdf.inputs["Sheen Tint"].default_value = (*couleur, 1) if len(bsdf.inputs["Sheen Tint"].default_value) == 4 else couleur
    return mat


def capuche(sweat, armature):
    """Capuche rabattue : croissant de tissu autour de l'arrière du cou, posé sur le dos."""
    cou = commun.position_os(armature, commun.trouver_os(armature, "neck"))
    epaule = commun.position_os(armature, commun.trouver_os(armature, "clavicleL"), "tail")
    rayon = abs(epaule.x - cou.x) * 0.55
    profondeur = rayon * 2.3
    colonnes, lignes = 48, 16
    bm = bmesh.new()
    grille = []
    for j in range(lignes + 1):
        t = j / lignes
        rang = []
        for i in range(colonnes + 1):
            a = math.radians(-115 + 230 * i / colonnes)  # 0 = milieu du dos
            creux = math.cos(a / 1.45) ** 1.4
            r = rayon * (1.0 + 0.25 * t)
            bourrelet = 0.018 * math.exp(-((t - 0.04) / 0.06) ** 2)
            x = cou.x + math.sin(a) * (r + bourrelet)
            y = cou.y + math.cos(a) * (r + bourrelet) * 1.05
            z = cou.z + 0.025 - t * profondeur * creux - 0.02 * (1 - creux) * t
            rang.append(bm.verts.new((x, y, z)))
        grille.append(rang)
    for j in range(lignes):
        for i in range(colonnes):
            bm.faces.new((grille[j][i], grille[j][i + 1], grille[j + 1][i + 1], grille[j + 1][i]))
    maillage = bpy.data.meshes.new("Capuche")
    bm.to_mesh(maillage)
    bm.free()
    hood = bpy.data.objects.new("Capuche", maillage)
    bpy.context.scene.collection.objects.link(hood)
    # La capuche épouse le dos du sweat, avec un léger volume.
    enveloppe = hood.modifiers.new("Enveloppe", "SHRINKWRAP")
    enveloppe.target = sweat
    enveloppe.wrap_method = "NEAREST_SURFACEPOINT"
    enveloppe.wrap_mode = "OUTSIDE_SURFACE"
    enveloppe.offset = 0.01
    appliquer(hood, enveloppe.name)
    bm = bmesh.new()
    bm.from_mesh(hood.data)
    bm.normal_update()
    bm.verts.ensure_lookup_table()
    for j in range(lignes + 1):
        t = j / lignes
        for i in range(colonnes + 1):
            v = bm.verts[j * (colonnes + 1) + i]
            # Volume du tissu replié : plus épais au milieu, bord supérieur roulé.
            v.co += v.normal * (0.012 * math.sin(math.pi * t) + 0.02 * math.exp(-((t - 0.05) / 0.08) ** 2))
    bm.to_mesh(hood.data)
    bm.free()
    for nom, mod in (("Épaisseur", "SOLIDIFY"), ("Lissage", "SUBSURF")):
        m = hood.modifiers.new(nom, mod)
        if mod == "SOLIDIFY":
            m.thickness = 0.006
            m.offset = 1
        else:
            m.levels = 1
        appliquer(hood, m.name)
    with bpy.context.temp_override(object=hood, active_object=hood, selected_editable_objects=[hood]):
        bpy.ops.object.shade_smooth()
    hood.data.materials.append(sweat.data.materials[0])
    return hood


def poche(sweat, ourlet):
    """Poche kangourou : pièce rapportée sur le ventre, au-dessus de l'ourlet."""
    monde = sweat.matrix_world
    points = [monde @ v.co for v in sweat.data.vertices]
    centre_x = sum(p.x for p in points) / len(points)
    devant = min(p.y for p in points if ourlet + 0.05 < p.z < ourlet + 0.2)
    largeur, bas, haut = 0.15, ourlet + 0.045, ourlet + 0.2
    bm = bmesh.new()
    colonnes, lignes = 24, 10
    grille = []
    for j in range(lignes + 1):
        t = j / lignes
        z = bas + (haut - bas) * t
        # Ouvertures latérales en biais : la poche est plus étroite en haut.
        demi = largeur * (1 - 0.32 * t)
        grille.append([bm.verts.new((centre_x - demi + 2 * demi * i / colonnes, devant - 0.05, z)) for i in range(colonnes + 1)])
    for j in range(lignes):
        for i in range(colonnes):
            bm.faces.new((grille[j][i], grille[j][i + 1], grille[j + 1][i + 1], grille[j + 1][i]))
    maillage = bpy.data.meshes.new("Poche")
    bm.to_mesh(maillage)
    bm.free()
    objet = bpy.data.objects.new("Poche kangourou", maillage)
    bpy.context.scene.collection.objects.link(objet)
    enveloppe = objet.modifiers.new("Enveloppe", "SHRINKWRAP")
    enveloppe.target = sweat
    enveloppe.wrap_method = "PROJECT"
    enveloppe.use_project_y = True
    enveloppe.use_negative_direction = True
    enveloppe.use_positive_direction = True
    enveloppe.offset = 0.004
    appliquer(objet, enveloppe.name)
    epais = objet.modifiers.new("Épaisseur", "SOLIDIFY")
    epais.thickness = 0.004
    epais.offset = 1
    appliquer(objet, epais.name)
    with bpy.context.temp_override(object=objet, active_object=objet, selected_editable_objects=[objet]):
        bpy.ops.object.shade_smooth()
    objet.data.materials.append(sweat.data.materials[0])
    return objet


def moins_d_excedent_en_haut(objet, cou):
    """Le tissu en trop se loge à la taille et aux coudes, pas sur les épaules."""
    groupe = objet.vertex_groups["tissu"]
    for v in objet.data.vertices:
        z = (objet.matrix_world @ v.co).z
        attenuation = max(0.15, min(1.0, (cou - 0.08 - z) / 0.25))
        poids = next((g.weight for g in v.groups if g.group == groupe.index), 0.0)
        groupe.add([v.index], poids * attenuation, "REPLACE")


def cordons(sweat, armature):
    cou = commun.position_os(armature, commun.trouver_os(armature, "neck"))
    poitrine = commun.position_os(armature, commun.trouver_os(armature, "chest"))
    profondeur = min((sweat.matrix_world @ v.co).y for v in sweat.data.vertices if abs((sweat.matrix_world @ v.co).z - cou.z + 0.05) < 0.03)
    objets = []
    for cote in (-1, 1):
        courbe = bpy.data.curves.new("Cordon", "CURVE")
        courbe.dimensions = "3D"
        courbe.bevel_depth = 0.0032
        spline = courbe.splines.new("BEZIER")
        spline.bezier_points.add(2)
        haut = Vector((cou.x + cote * 0.035, profondeur - 0.004, cou.z - 0.045))
        milieu = Vector((cou.x + cote * 0.04, profondeur - 0.012, (cou.z + poitrine.z) / 2 - 0.02))
        bas = Vector((cou.x + cote * 0.045, profondeur - 0.014, poitrine.z - 0.06))
        for point, position in zip(spline.bezier_points, (haut, milieu, bas)):
            point.co = position
            point.handle_left_type = point.handle_right_type = "AUTO"
        objet = bpy.data.objects.new("Cordon", courbe)
        bpy.context.scene.collection.objects.link(objet)
        objet.data.materials.append(materiau("Cordon", (0.07, 0.075, 0.075), 0.8, 0.1))
        with bpy.context.temp_override(object=objet, active_object=objet, selected_objects=[objet], selected_editable_objects=[objet]):
            bpy.ops.object.convert(target="MESH")
        objets.append(bpy.context.scene.objects[objet.name] if objet.name in bpy.context.scene.objects else objet)
    return objets


def lier_au_squelette(objets, corps, armature):
    for objet in objets:
        # Le transfert par nom n'écrit que dans des groupes existants.
        for groupe in corps.vertex_groups:
            if groupe.name not in objet.vertex_groups:
                objet.vertex_groups.new(name=groupe.name)
        transfert = objet.modifiers.new("Poids", "DATA_TRANSFER")
        transfert.object = corps
        transfert.use_vert_data = True
        transfert.data_types_verts = {"VGROUP_WEIGHTS"}
        transfert.vert_mapping = "POLYINTERP_NEAREST"
        transfert.layers_vgroup_select_src = "ALL"
        transfert.layers_vgroup_select_dst = "NAME"
        appliquer(objet, transfert.name)
        for nom in ("bords", "tissu"):
            if nom in objet.vertex_groups:
                objet.vertex_groups.remove(objet.vertex_groups[nom])
        mod = objet.modifiers.new("Armature", "ARMATURE")
        mod.object = armature
        objet.parent = armature
        objet.matrix_parent_inverse = armature.matrix_world.inverted()


def masquer_peau(corps, vetements, marge=0.012):
    """Supprime la peau recouverte : chaque sommet doit avoir un vêtement juste au-dessus."""
    from mathutils.bvhtree import BVHTree

    arbres = []
    for v in vetements:
        bm = bmesh.new()
        bm.from_mesh(v.data)
        bm.transform(v.matrix_world)
        arbres.append(BVHTree.FromBMesh(bm))
        bm.free()
    bm = bmesh.new()
    bm.from_mesh(corps.data)
    bm.normal_update()
    couvert = set()
    for v in bm.verts:
        p = corps.matrix_world @ v.co
        n = (corps.matrix_world.to_3x3() @ v.normal).normalized()
        for arbre in arbres:
            touche = arbre.ray_cast(p + n * 0.001, n, 0.08)
            if touche[0] is not None:
                couvert.add(v.index)
                break
    # Marge : un anneau de peau reste sous les bords des vêtements.
    for _ in range(2):
        couvert -= {v.index for v in bm.verts if v.index in couvert and any(e.other_vert(v).index not in couvert for e in v.link_edges)}
    faces = [f for f in bm.faces if all(v.index in couvert for v in f.verts)]
    bmesh.ops.delete(bm, geom=faces, context="FACES_ONLY")
    bm.to_mesh(corps.data)
    bm.free()


def habiller(entree, sortie, sortie_glb=None):
    """Habille le personnage de « entree » et enregistre « sortie » (.blend), et un .glb si demandé."""
    entree, sortie = os.path.abspath(entree), os.path.abspath(sortie)
    commun.vider_scene()
    if entree.endswith(".blend"):
        bpy.ops.wm.open_mainfile(filepath=entree)
    else:
        commun.importer_glb(entree)
    armature = commun.armature_principale()
    if armature is None:
        raise SystemExit("Aucun squelette trouvé : le personnage doit être riggé.")
    armature.data.pose_position = "REST"
    classes = commun.classer_maillages(armature)
    corps = classes["corps"]
    # Les vêtements d'origine sont remplacés par le sweat et le jean.
    if classes["vetements"] and os.environ.get("PZ_GARDER_VETEMENTS") != "1":
        print("Vêtements d'origine retirés : " + ", ".join(o.name for o in classes["vetements"]))
        for objet in classes["vetements"]:
            bpy.data.objects.remove(objet, do_unlink=True)
    h = hauteurs(armature)
    dominant = os_dominant(corps)
    monde = [corps.matrix_world @ v.co for v in corps.data.vertices]

    ourlet = h["bassin"] - 0.15
    ceinture = h["bassin"] + 0.05

    def dans_sweat(i):
        nom, p = dominant[i], monde[i]
        torse = nom.startswith(("spine", "pelvis", "thigh")) and p.z > ourlet - 0.04
        if not (nom.startswith(SWEAT) or torse):
            return False
        for poignet in (h["poignet_l"], h["poignet_r"]):
            if poignet and nom.startswith("lowerarm") and (p - poignet).length < 0.035:
                return False
        return True

    def dans_jean(i):
        nom, p = dominant[i], monde[i]
        if not nom.startswith(JEAN + ("spine",)):
            return False
        return h["cheville"] + 0.01 < p.z < ceinture + 0.04

    sweat = dupliquer(corps, "Sweat à capuche")
    garder(sweat, [dans_sweat(i) for i in range(len(monde))])
    jean = dupliquer(corps, "Jean")
    garder(jean, [dans_jean(i) for i in range(len(monde))])
    # Coupes nettes : ourlet du sweat, ceinture et bas du jean.
    couper(sweat, ourlet, garder_dessus=True, sauf=("upperarm", "lowerarm", "hand"))
    couper(jean, ceinture, garder_dessus=False)
    couper(jean, h["cheville"] + 0.045, garder_dessus=True)
    for objet in (sweat, jean):
        objet.data.materials.clear()
    # La bande du sweat reste au-dessus du jean (1 cm) pour ne pas être traversée.
    modeler(sweat, corps, epaisseur=0.02, bord_serrage=0.8)
    modeler(jean, corps, epaisseur=0.01, bord_serrage=0.6)
    moins_d_excedent_en_haut(sweat, h["cou"])
    sweat.data.materials.append(materiau("Sweat anthracite", (0.03, 0.034, 0.038), 0.95, 0.08))
    jean.data.materials.append(materiau("Jean sombre", (0.012, 0.018, 0.032), 0.85, 0.04))
    images = int(os.environ.get("PZ_IMAGES_SIMULATION", "80"))
    excedent = float(os.environ.get("PZ_EXCEDENT_TISSU", "0.16"))
    simuler([sweat, jean], corps, images, [(excedent, 0.35), (excedent * 0.4, 0.45)])
    plis(sweat, armature, [plis_sweat(ourlet)])
    plis(jean, armature, [plis_jean(h["cheville"] + 0.045)])
    for objet in (sweat, jean):
        with bpy.context.temp_override(object=objet, active_object=objet, selected_editable_objects=[objet]):
            bpy.ops.object.shade_smooth()
    extras = [capuche(sweat, armature), poche(sweat, ourlet)] + cordons(sweat, armature)
    lier_au_squelette([sweat, jean] + extras, corps, armature)
    masquer_peau(corps, [sweat, jean])
    armature.data.pose_position = "POSE"
    bpy.ops.wm.save_as_mainfile(filepath=sortie)
    if sortie_glb:
        exporter_glb(sortie_glb)
    print(f"Vêtements : sweat {len(sweat.data.vertices)} sommets, jean {len(jean.data.vertices)} sommets.")


def exporter_glb(chemin):
    """Export pour le navigateur : squelette, poids, expressions ; ni caméra ni lumière."""
    os.makedirs(os.path.dirname(os.path.abspath(chemin)) or ".", exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=os.path.abspath(chemin),
        export_format="GLB",
        export_cameras=False,
        export_lights=False,
        export_skins=True,
        export_morph=True,
        export_animations=False,
        export_apply=False,
    )


if __name__ == "__main__":
    args = commun.arguments()
    if len(args) < 2:
        raise SystemExit(__doc__)
    habiller(args[0], args[1], args[2] if len(args) > 2 else None)
