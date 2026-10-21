"""Pilosité générée par script : cheveux courts, sourcils, cils, barbe de quelques jours.

Méthode de jeu vidéo : cartes de mèches (rubans à transparence) implantées sur
la peau et suivant sa courbure, plus une couche de barbe. Les textures sont
dessinées par ce module : aucune ressource tierce, résultat reproductible
(graine fixe dans la recette).
"""

import math
import random

import bmesh
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

import mpfb_outils


# ---------------------------------------------------------------- textures


def image(nom, pixels):
    """Image RGBA (hauteur × largeur × 4, 0–1) empaquetée dans le fichier."""
    hauteur, largeur = pixels.shape[:2]
    img = bpy.data.images.new(nom, largeur, hauteur, alpha=True)
    img.pixels.foreach_set(np.ascontiguousarray(pixels[::-1], dtype=np.float32).ravel())
    img.pack()
    return img


def texture_meches(nom, couleur, graine, largeur=256, hauteur=512, brins=90, effile=True, fond=0.0):
    """Brins verticaux effilés, légèrement ondulés, avec variations de teinte."""
    alea = np.random.default_rng(graine)
    rgba = np.zeros((hauteur, largeur, 4), np.float32)
    y = np.linspace(0, 1, hauteur)[:, None]
    x = np.arange(largeur)[None, :]
    for _ in range(brins):
        centre = alea.uniform(0.08, 0.92) * largeur
        onde = alea.uniform(2, 7) * np.sin(y * alea.uniform(2, 6) + alea.uniform(0, 6))
        epaisseur = alea.uniform(1.2, 2.6) * ((1 - y) ** 0.6 if effile else 1)
        fin = alea.uniform(0.75, 1.0)
        masque = np.clip(1 - np.abs(x - centre - onde) / np.maximum(epaisseur, 0.3), 0, 1) * (y < fin)
        teinte = np.array(couleur) * alea.uniform(0.8, 1.2)
        rgba[..., :3] = np.maximum(rgba[..., :3], masque[..., None] * teinte)
        rgba[..., 3] = np.maximum(rgba[..., 3], masque)
    rgba[..., :3] = np.where(rgba[..., 3:] > 0, rgba[..., :3], np.array(couleur))
    # Fond légèrement couvrant : la mèche cache la peau sans paraître pleine.
    rgba[..., 3] = np.maximum(rgba[..., 3], fond * (1 - y) ** 0.8)
    return image(nom, rgba)


def texture_barbe(nom, couleur, densite, graine, taille=1024):
    """Poils courts (2 à 4 px) orientés vers le bas, semés au hasard."""
    alea = np.random.default_rng(graine)
    rgba = np.zeros((taille, taille, 4), np.float32)
    rgba[..., :3] = couleur
    n = int(taille * taille * 0.06 * densite)
    xs = alea.integers(0, taille, n)
    ys = alea.integers(0, taille - 5, n)
    longueurs = alea.integers(2, 5, n)
    for k in range(5):
        actifs = longueurs > k
        rgba[ys[actifs] + k, (xs[actifs] + (k // 2)) % taille, 3] = alea.uniform(0.7, 1.0, actifs.sum())
    return image(nom, rgba)


def texture_cuir_chevelu(nom, couleur, graine, taille=512):
    """Couleur de cheveux opaque, bruitée en fines stries : la peau ne transparaît pas."""
    alea = np.random.default_rng(graine)
    bruit = alea.uniform(0.75, 1.15, (taille, taille // 8))
    bruit = np.repeat(bruit, 8, axis=1)
    rgba = np.ones((taille, taille, 4), np.float32)
    rgba[..., :3] = np.array(couleur)[None, None, :] * bruit[..., None]
    return image(nom, rgba)


def materiau_poils(nom, img, rugosite=0.55, clip=False, fondu=None):
    mat = bpy.data.materials.new(nom)
    mat.use_nodes = True
    arbre = mat.node_tree
    bsdf = arbre.nodes["Principled BSDF"]
    tex = arbre.nodes.new("ShaderNodeTexImage")
    tex.image = img
    arbre.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    if fondu:
        attribut = arbre.nodes.new("ShaderNodeVertexColor")
        attribut.layer_name = fondu
        produit = arbre.nodes.new("ShaderNodeMath")
        produit.operation = "MULTIPLY"
        arbre.links.new(tex.outputs["Alpha"], produit.inputs[0])
        arbre.links.new(attribut.outputs["Color"], produit.inputs[1])
        arbre.links.new(produit.outputs[0], bsdf.inputs["Alpha"])
    else:
        arbre.links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
    bsdf.inputs["Roughness"].default_value = rugosite
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.2
    if "Coat Weight" in bsdf.inputs:
        bsdf.inputs["Coat Weight"].default_value = 0.0
    if hasattr(mat, "surface_render_method"):
        mat.surface_render_method = "DITHERED"
    if hasattr(mat, "blend_method"):
        mat.blend_method = "CLIP" if clip else "HASHED"
    mat.use_backface_culling = False
    return mat


# ---------------------------------------------------------------- surface


class Peau:
    """Surface évaluée du corps (formes appliquées) pour l'implantation des poils."""

    def __init__(self, humain):
        self.points = mpfb_outils.sommets_evalues(humain)
        corps = humain.vertex_groups["body"].index
        dans_corps = {
            v.index for v in humain.data.vertices if any(g.group == corps and g.weight > 0.5 for g in v.groups)
        }
        self.faces = [
            [self.points[i] for i in p.vertices]
            for p in humain.data.polygons
            if all(i in dans_corps for i in p.vertices)
        ]
        bm = bmesh.new()
        sommets = [bm.verts.new(p) for p in self.points]
        for p in humain.data.polygons:
            if all(i in dans_corps for i in p.vertices):
                try:
                    bm.faces.new([sommets[i] for i in p.vertices])
                except ValueError:
                    pass
        bm.normal_update()
        self.bvh = BVHTree.FromBMesh(bm)
        bm.free()

    def coller(self, p, decalage):
        """Projette p sur la peau puis l'en écarte de « decalage » le long de la normale."""
        proche, normale, _, _ = self.bvh.find_nearest(p)
        if proche is None:
            return p, Vector((0, 0, 1))
        return proche + normale * decalage, normale

    def echantillons(self, condition, nombre, alea):
        """Points tirés sur les faces satisfaisant « condition », au prorata de leur aire."""
        retenues, aires = [], []
        for face in self.faces:
            centre = sum(face, Vector()) / len(face)
            if condition(centre):
                aire = (face[2] - face[0]).cross(face[3 % len(face)] - face[1]).length / 2
                retenues.append(face)
                aires.append(aire)
        if not retenues:
            return []
        choisies = alea.choices(retenues, weights=aires, k=nombre)
        resultat = []
        for face in choisies:
            a, b = alea.random(), alea.random()
            p = face[0].lerp(face[1], a).lerp(face[3 % len(face)].lerp(face[2], a), b)
            resultat.append(p)
        return resultat


# ---------------------------------------------------------------- cartes


def ruban(points, largeurs, cote):
    """Sommets et faces d'une carte : une suite de quads le long des points."""
    sommets, faces = [], []
    for i, (p, w) in enumerate(zip(points, largeurs)):
        sommets += [p - cote * w / 2, p + cote * w / 2]
        if i:
            k = 2 * i
            faces.append((k - 2, k - 1, k + 1, k))
    return sommets, faces


def objet_cartes(nom, cartes, materiau):
    sommets, faces, uvs = [], [], []
    for points, largeurs, cote in cartes:
        s, f = ruban(points, largeurs, cote)
        base = len(sommets)
        sommets += s
        faces += [tuple(base + i for i in face) for face in f]
        n = len(points) - 1
        for face in f:
            for i in face:
                rang = (i - base) // 2 if i >= base else i // 2
        for i in range(len(points)):
            uvs.append((0.0, 1 - i / n))
            uvs.append((1.0, 1 - i / n))
    maillage = bpy.data.meshes.new(nom)
    maillage.from_pydata([tuple(v) for v in sommets], [], faces)
    couche = maillage.uv_layers.new(name="UVMap")
    for boucle in maillage.loops:
        couche.data[boucle.index].uv = uvs[boucle.vertex_index]
    for p in maillage.polygons:
        p.use_smooth = True
    objet = bpy.data.objects.new(nom, maillage)
    bpy.context.scene.collection.objects.link(objet)
    objet.data.materials.append(materiau)
    return objet


def meche(peau, racine, direction, longueur, largeur, lever, alea, segments=4, torsion=0.5):
    """Carte qui suit le crâne : chaque point est recollé à la peau, de plus en plus haut."""
    points, largeurs = [], []
    p, normale = peau.coller(racine, 0.0012)
    d = (direction - normale * direction.dot(normale)).normalized()
    for i in range(segments + 1):
        t = i / segments
        if i:
            p = p + d * (longueur / segments)
            p, normale = peau.coller(p, 0.0012 + lever * t)
            d = (d - normale * d.dot(normale)).normalized()
        points.append(p)
        largeurs.append(largeur * (1 - 0.55 * t))
    cote = d.cross(normale).normalized()
    # Inclinaison aléatoire autour de la mèche : du volume au lieu de rubans à plat.
    angle = alea.uniform(-torsion, torsion)
    cote = (cote * math.cos(angle) + normale * math.sin(angle)).normalized()
    return points, largeurs, cote


# ---------------------------------------------------------------- éléments


def cheveux(humain, peau, reperes, reglages):
    alea = random.Random(reglages["graine"])
    g, d = reperes["joint-l-eye"], reperes["joint-r-eye"]
    yeux = (g + d) / 2
    sommet = reperes["joint-head-2"]
    axe_y = reperes["joint-head"].y
    couronne = Vector((0, axe_y + 0.035, sommet.z - 0.01))

    def zone(p):
        azimut = math.degrees(math.atan2(abs(p.x), -(p.y - axe_y)))  # 0 = devant
        if azimut < 35:
            # Golfes temporaux légers : la ligne remonte un peu sur les côtés du front.
            seuil = yeux.z + 0.064 + 0.008 * (azimut / 35) ** 2
        elif azimut < 75:
            seuil = yeux.z + 0.062 - (azimut - 35) / 40 * 0.045
        elif azimut < 115:
            seuil = yeux.z + 0.017
        else:
            seuil = reperes["joint-head"].z - 0.025 + (180 - azimut) / 65 * 0.04
        # Oreilles dégagées.
        if abs(p.x) > 0.06 and 75 < azimut < 125 and p.z < yeux.z + 0.035:
            return False
        return p.z > seuil + 0.004 * math.sin(p.x * 400 + p.y * 300)

    longueur_dessus = reglages["longueur_dessus_mm"] / 1000
    longueur_cotes = reglages["longueur_cotes_mm"] / 1000
    desordre = reglages["desordre"]
    cartes = []
    for couche, (nombre, lever) in enumerate(((2200, 0.0018), (1500, 0.0035), (900, 0.0055))):
        for racine in peau.echantillons(zone, nombre, alea):
            vers_exterieur = racine - couronne
            haut = racine.z > yeux.z + 0.075
            direction = vers_exterieur
            devant = racine.y < axe_y - 0.05 and racine.z > yeux.z + 0.05
            if devant:
                # Devant : mèches relevées puis rabattues sur le côté, sans frange.
                cote = 1 if racine.x >= 0 else -1
                direction = Vector((0.55 * cote, 0.35, 0.75))
            elif haut:
                # Dessus : vers l'avant, mèches légèrement relevées.
                direction = vers_exterieur.normalized() + Vector((0, -0.5, 0.25))
            else:
                direction = vers_exterieur.normalized() + Vector((0, 0.15, -0.9))
            direction.rotate(_rotation(alea.uniform(-0.6, 0.6) * desordre))
            longueur = (longueur_dessus if haut else longueur_cotes) * alea.uniform(0.7, 1.15)
            largeur = alea.uniform(0.009, 0.014)
            cartes.append(meche(peau, racine, direction, longueur, largeur, lever * (1.4 if haut else 0.6), alea))
    img = texture_meches("Mèches", reglages["couleur"], reglages["graine"], fond=0.35)
    objet = objet_cartes("Cheveux", cartes, materiau_poils("Cheveux", img))
    sous_couche = couche_peau(
        peau, zone, "Cuir chevelu", reglages["couleur"], 1.0, reglages["graine"] + 1, decalage=0.0012,
        image_tex=texture_cuir_chevelu("Cuir chevelu", reglages["couleur"], reglages["graine"] + 1),
    )
    return [objet, sous_couche]


def _rotation(angle):
    from mathutils import Quaternion

    return Quaternion((0, 0, 1), angle)


def couche_peau(peau, zone, nom, couleur, opacite, graine, decalage=0.0008, image_tex=None):
    """Fine couche colorée sur la peau (cuir chevelu sous les mèches, barbe)."""
    sommets, faces, index = [], [], {}
    for face in peau.faces:
        centre = sum(face, Vector()) / len(face)
        if not zone(centre):
            continue
        ids = []
        for p in face:
            cle = tuple(round(c, 6) for c in p)
            if cle not in index:
                q, _ = peau.coller(p, decalage)
                index[cle] = len(sommets)
                sommets.append(q)
            ids.append(index[cle])
        faces.append(tuple(ids))
    maillage = bpy.data.meshes.new(nom)
    maillage.from_pydata([tuple(v) for v in sommets], [], faces)
    # UV cylindriques autour de l'axe de la tête : densité de poils régulière.
    couche = maillage.uv_layers.new(name="UVMap")
    for boucle in maillage.loops:
        p = sommets[boucle.vertex_index]
        couche.data[boucle.index].uv = (math.atan2(p.x, -p.y) * 2.2, p.z * 14)
    for p in maillage.polygons:
        p.use_smooth = True
    # Fondu : transparent au bord de la zone, plein après quelques anneaux de faces.
    bm = bmesh.new()
    bm.from_mesh(maillage)
    distance = {v.index: 0 for v in bm.verts if v.is_boundary}
    file = list(distance)
    bm.verts.ensure_lookup_table()
    while file:
        suivants = []
        for i in file:
            for arete in bm.verts[i].link_edges:
                j = arete.other_vert(bm.verts[i]).index
                if j not in distance:
                    distance[j] = distance[i] + 1
                    suivants.append(j)
        file = suivants
    bm.free()
    fondu = maillage.color_attributes.new("fondu", "FLOAT_COLOR", "POINT")
    for i in range(len(sommets)):
        a = min(1.0, distance.get(i, 9) / 3.0)
        fondu.data[i].color = (a, a, a, 1.0)
    objet = bpy.data.objects.new(nom, maillage)
    bpy.context.scene.collection.objects.link(objet)
    img = image_tex or texture_barbe(nom, couleur, opacite, graine)
    objet.data.materials.append(materiau_poils(nom, img, rugosite=0.6, fondu="fondu"))
    return objet


def barbe(humain, peau, reperes, reglages, graine):
    g, d = reperes["joint-l-eye"], reperes["joint-r-eye"]
    yeux = (g + d) / 2
    ecart = (g - d).length
    avant = yeux.y - ecart * 0.25
    bouche = Vector((0, avant, yeux.z - 1.25 * ecart))
    menton = reperes["joint-jaw"]

    def zone(p):
        if p.y > yeux.y + 1.35 * ecart:  # derrière les favoris
            return False
        if p.z > yeux.z - 0.55 * ecart:  # au-dessus des pommettes
            return False
        if p.z < menton.z - 0.55 * ecart:  # bas du cou
            return False
        dx, dz = abs(p.x) / (0.5 * ecart), (p.z - bouche.z) / (0.2 * ecart)
        if dx * dx + dz * dz < 1 and p.y < avant + 0.03:  # lèvres
            return False
        if abs(p.x) < 0.38 * ecart and p.z > bouche.z + 0.3 * ecart:  # nez
            return False
        # Joues : la ligne de barbe descend vers l'avant.
        if abs(p.x) > 0.5 * ecart and p.z > yeux.z - 0.75 * ecart - 0.35 * ecart * (1 - min(1, abs(p.x) / (1.2 * ecart))):
            return False
        return True

    img = texture_barbe("Barbe", reglages["couleur"], reglages["densite"], graine)
    return couche_peau(peau, zone, "Barbe", reglages["couleur"], reglages["densite"], graine, decalage=0.0005, image_tex=img)


def sourcils(humain, peau, reperes, couleur, graine):
    alea = random.Random(graine)
    g, d = reperes["joint-l-eye"], reperes["joint-r-eye"]
    yeux = (g + d) / 2
    ecart = (g - d).length
    cartes = []
    for signe in (1, -1):
        nombre = 360
        for k in range(nombre):
            # Répartition régulière le long de l'arc, légèrement bruitée.
            t = min(1.0, max(0.0, (k + alea.random()) / nombre))
            x = signe * (0.2 * ecart + 0.95 * ecart * t)
            z = yeux.z + 0.33 * ecart + 0.13 * ecart * math.sin(math.pi * min(1, t * 1.15)) - 0.07 * ecart * t
            z += alea.uniform(-0.05, 0.05) * ecart * (1.2 - 0.6 * t)
            racine = Vector((x, yeux.y - 0.05, z))
            # Poils dressés vers le haut au début du sourcil, couchés vers l'extérieur ensuite.
            angle = math.radians(70 * (1 - t) + 12)
            direction = Vector((signe * math.cos(angle), 0, math.sin(angle)))
            longueur = alea.uniform(0.004, 0.0075) * (0.8 + 0.4 * (1 - t))
            cartes.append(meche(peau, racine, direction, longueur, alea.uniform(0.0009, 0.0014), 0.0005, alea, segments=2, torsion=0.25))
    img = texture_meches("Sourcils", [c * 1.25 for c in couleur], graine, largeur=64, hauteur=128, brins=6)
    return objet_cartes("Sourcils", cartes, materiau_poils("Sourcils", img, clip=True))


def cils(humain, peau, reperes, couleur, graine):
    alea = random.Random(graine)
    cartes = []
    for groupe, longueur, nombre in (
        ("helper-l-eyelashes-2", 0.0062, 40), ("helper-r-eyelashes-2", 0.0062, 40),
        ("helper-l-eyelashes-1", 0.0025, 18), ("helper-r-eyelashes-1", 0.0025, 18),
    ):
        points = mpfb_outils.sommets_evalues(humain, groupe=groupe)
        if not points:
            continue
        superieur = groupe.endswith("2")
        points.sort(key=lambda p: p.x)
        bord = points[:: max(1, len(points) // nombre)]
        centre = sum(points, Vector()) / len(points)
        for racine in bord:
            dehors = Vector((racine.x - centre.x, 0, 0)) * 3
            direction = Vector((0, -1, 0.35 if superieur else -0.4)) + dehors
            pts = [racine, racine + direction.normalized() * longueur * 0.55]
            pts.append(pts[-1] + Vector((0, -0.35, 1.0 if superieur else -0.5)).normalized() * longueur * 0.45)
            cote = Vector((1, 0, 0))
            cartes.append((pts, [0.0011, 0.0009, 0.0005], cote))
    img = texture_meches("Cils", couleur, graine, largeur=64, hauteur=64, brins=7)
    return objet_cartes("Cils", cartes, materiau_poils("Cils", img, clip=True))


def ajouter_pilosite(humain, recette):
    """Crée cheveux, sous-couche, sourcils, cils et barbe ; renvoie les objets créés."""
    reperes = mpfb_outils.reperes(humain)
    peau = Peau(humain)
    reglages = recette["cheveux"]
    objets = cheveux(humain, peau, reperes, reglages)
    objets.append(sourcils(humain, peau, reperes, reglages["couleur"], reglages["graine"] + 7))
    objets.append(cils(humain, peau, reperes, [c * 0.6 for c in reglages["couleur"]], reglages["graine"] + 11))
    objets.append(barbe(humain, peau, reperes, recette["barbe"], reglages["graine"] + 13))
    for objet in objets:
        objet.parent = humain
    return objets
