"""Finition d'Adam pour le navigateur : formes figées, bouche, regard, peau cuite.

Opérations sur un humain MPFB déjà riggé (squelette « game engine ») :
- les cibles de modelage sont intégrées au maillage, seules les expressions restent ;
- dents et langue sont extraites de la géométrie d'aide MakeHuman (CC0), avec leurs
  poids et l'ouverture de la mâchoire ; le reste des aides est supprimé ;
- deux os « eye_l » et « eye_r » sont ajoutés pour le regard du studio ;
- la pilosité est liée au squelette ;
- la peau et les yeux procéduraux sont cuits en textures (glTF n'a pas de nœuds).
"""

import bmesh
import bpy
import numpy as np
from mathutils import Vector

from habiller_adam import lier_au_squelette


def _coordonnees(cle, n):
    tableau = np.empty(n * 3, np.float32)
    cle.data.foreach_get("co", tableau)
    return tableau.reshape(n, 3)


def figer_formes(objet, garder):
    """Intègre les formes de modelage (avec leur valeur) ; garde « garder » comme expressions."""
    cles = objet.data.shape_keys.key_blocks
    n = len(objet.data.vertices)
    base = _coordonnees(cles[0], n)
    melange = base.copy()
    ecarts = {}
    for cle in cles[1:]:
        if cle.name in garder:
            ecarts[cle.name] = _coordonnees(cle, n) - base
        elif not cle.mute:
            melange += (_coordonnees(cle, n) - base) * cle.value
    objet.shape_key_clear()
    objet.data.vertices.foreach_set("co", melange.ravel())
    objet.data.update()
    objet.shape_key_add(name="Basis", from_mix=False)
    for nom in garder:
        if nom in ecarts:
            cle = objet.shape_key_add(name=nom, from_mix=False)
            cle.data.foreach_set("co", (melange + ecarts[nom]).ravel())
            cle.value = 0.0


def _sommets_du_groupe(objet, noms, poids_min=0.5):
    index = {objet.vertex_groups[n].index for n in noms if n in objet.vertex_groups}
    return {v.index for v in objet.data.vertices if any(g.group in index and g.weight >= poids_min for g in v.groups)}


def _garder_sommets(objet, garder):
    """Supprime les autres sommets ; formes et groupes de sommets sont conservés."""
    bm = bmesh.new()
    bm.from_mesh(objet.data)
    bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.index not in garder], context="VERTS")
    bm.to_mesh(objet.data)
    bm.free()


def materiau_simple(nom, couleur, rugosite, image=None):
    mat = bpy.data.materials.new(nom)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*couleur, 1)
    bsdf.inputs["Roughness"].default_value = rugosite
    if image is not None:
        tex = mat.node_tree.nodes.new("ShaderNodeTexImage")
        tex.image = image
        mat.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def extraire(humain, groupes, nom, materiau):
    """Copie d'une partie de la géométrie d'aide (formes et poids compris)."""
    copie = humain.copy()
    copie.data = humain.data.copy()
    copie.name = copie.data.name = nom
    bpy.context.scene.collection.objects.link(copie)
    for m in list(copie.modifiers):
        if m.type != "ARMATURE":
            copie.modifiers.remove(m)
    _garder_sommets(copie, _sommets_du_groupe(copie, groupes))
    copie.data.materials.clear()
    copie.data.materials.append(materiau)
    for p in copie.data.polygons:
        p.use_smooth = True
    return copie


def bouche(humain, couleurs):
    """Dents et langue : la mâchoire inférieure suit l'expression « jawOpen »."""
    dents = extraire(
        humain, ("helper-upper-teeth", "helper-lower-teeth"), "Dents",
        materiau_simple("Dents", couleurs["dents"], 0.32),
    )
    langue = extraire(humain, ("helper-tongue",), "Langue", materiau_simple("Langue", couleurs["langue"], 0.45))
    return [dents, langue]


def retirer_aides(humain, armature, extraits=()):
    """Ne garde que la peau (groupe « body »), sans masque ni groupes autres que les os.

    Les groupes MPFB (« body », « Left », « joint-* »…) fausseraient l'os dominant
    que le lot 2 utilise pour découper les vêtements.
    """
    _garder_sommets(humain, _sommets_du_groupe(humain, ("body",)))
    for m in list(humain.modifiers):
        if m.type == "MASK":
            humain.modifiers.remove(m)
    os_ = {b.name for b in armature.data.bones}
    for objet in (humain, *extraits):
        for groupe in list(objet.vertex_groups):
            if groupe.name not in os_:
                objet.vertex_groups.remove(groupe)


def retirer_cornees(yeux):
    """Les cornées (pièces aux UV minuscules) masqueraient l'iris une fois cuites."""
    bm = bmesh.new()
    bm.from_mesh(yeux.data)
    uv = bm.loops.layers.uv.active
    vus, retirer = set(), []
    for depart in bm.faces:
        if depart.index in vus:
            continue
        piece, pile = [], [depart]
        vus.add(depart.index)
        while pile:
            face = pile.pop()
            piece.append(face)
            for arete in face.edges:
                for voisine in arete.link_faces:
                    if voisine.index not in vus:
                        vus.add(voisine.index)
                        pile.append(voisine)
        coords = [boucle[uv].uv for face in piece for boucle in face.loops]
        etendue = max(c.x for c in coords) - min(c.x for c in coords)
        if etendue < 0.2:
            retirer += piece
    bmesh.ops.delete(bm, geom=retirer, context="FACES")
    bm.to_mesh(yeux.data)
    bm.free()


def os_des_yeux(armature, yeux, reperes):
    """Ajoute eye_l / eye_r (enfants de « head ») et y lie chaque globe oculaire."""
    centres = {"l": reperes["joint-l-eye"], "r": reperes["joint-r-eye"]}
    inverse = armature.matrix_world.inverted()
    with bpy.context.temp_override(active_object=armature, object=armature, selected_objects=[armature]):
        bpy.ops.object.mode_set(mode="EDIT")
        tete = armature.data.edit_bones["head"]
        for cote, centre in centres.items():
            os_ = armature.data.edit_bones.new(f"eye_{cote}")
            os_.head = inverse @ centre
            os_.tail = inverse @ (centre + Vector((0, -0.025, 0)))  # regard vers l'avant (-Y)
            os_.parent = tete
            os_.use_deform = True
        bpy.ops.object.mode_set(mode="OBJECT")
    monde = yeux.matrix_world.copy()
    yeux.vertex_groups.clear()
    groupes = {cote: yeux.vertex_groups.new(name=f"eye_{cote}") for cote in centres}
    for v in yeux.data.vertices:
        p = monde @ v.co
        cote = min(centres, key=lambda c: (p - centres[c]).length)
        groupes[cote].add([v.index], 1.0, "REPLACE")
    lier(yeux, armature)


def lier(objet, armature):
    monde = objet.matrix_world.copy()
    if not any(m.type == "ARMATURE" for m in objet.modifiers):
        objet.modifiers.new("Armature", "ARMATURE").object = armature
    objet.parent = armature
    objet.matrix_world = monde


def lier_pilosite(objets, humain, armature):
    """Poids copiés de la peau la plus proche : les poils suivent la tête et le cou."""
    for objet in objets:
        monde = objet.matrix_world.copy()
        objet.parent = None
        objet.matrix_world = monde
    lier_au_squelette(objets, humain, armature)


def cuire(objets, taille, nom, echantillons=4):
    """Couleur diffuse des matériaux procéduraux -> une image ; matériau Principled simple."""
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = echantillons
    image = bpy.data.images.new(nom, taille, taille, alpha=False)
    for objet in objets:
        for slot in objet.material_slots:
            arbre = slot.material.node_tree
            noeud = arbre.nodes.new("ShaderNodeTexImage")
            noeud.image = image
            arbre.nodes.active = noeud
    with bpy.context.temp_override(active_object=objets[0], object=objets[0], selected_objects=objets):
        bpy.ops.object.bake(type="DIFFUSE", pass_filter={"COLOR"}, margin=16, use_clear=True)
    image.pack()
    return image


def remplacer_materiau(objet, materiau):
    objet.data.materials.clear()
    objet.data.materials.append(materiau)
