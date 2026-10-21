"""Peinture de la barbe et du cuir chevelu dans la texture de peau cuite.

Dans le navigateur, une barbe de quelques jours rend mieux peinte sur la peau
(ombre bleutée, poils visibles de près, filtrage propre de loin) qu'en couche
transparente posée au-dessus. Les zones sont celles de pilosite.py ; le bord
s'estompe sur quelques anneaux de faces. Motifs générés, graine fixe.
"""

import numpy as np
from mathutils import Vector
from mathutils.kdtree import KDTree


def srgb(couleur):
    """Couleur linéaire de la recette -> valeur stockée dans une image 8 bits sRVB."""
    c = np.clip(np.array(couleur, np.float32), 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


def motif_barbe(taille, densite, graine):
    """Ombre de base et poils courts semés : la peau reste visible entre eux."""
    alea = np.random.default_rng(graine)
    poils = (alea.random((taille, taille)) < 0.22 * densite).astype(np.float32)
    # Poils de 2 px orientés vers le bas.
    poils = np.maximum(poils, np.roll(poils, 1, axis=0) * 0.8)
    return np.clip(0.42 + 0.58 * poils, 0, 1)


def motif_cheveux(taille, graine):
    alea = np.random.default_rng(graine)
    stries = np.repeat(alea.uniform(0.75, 1.0, (taille, taille // 4)), 4, axis=1)
    return stries.astype(np.float32)


def teinter(image, facteurs):
    """Corrige la teinte de la peau cuite (sans diffusion sous la peau, elle paraît plus pâle)."""
    pixels = np.empty(image.size[0] * image.size[1] * 4, np.float32)
    image.pixels.foreach_get(pixels)
    pixels = pixels.reshape(-1, 4)
    pixels[:, :3] *= np.array(facteurs, np.float32)
    image.pixels.foreach_set(pixels.ravel())
    image.update()


def _anneaux(maillage, retenues, profondeur):
    """Distance (en arêtes) de chaque sommet de la zone au bord de la zone."""
    dans = set()
    hors = set()
    for p in maillage.polygons:
        (dans if p.index in retenues else hors).update(p.vertices)
    voisins = {i: set() for i in dans}
    for a, b in (e.vertices for e in maillage.edges):
        if a in dans and b in dans:
            voisins[a].add(b)
            voisins[b].add(a)
    distance = {i: 0 for i in dans if i in hors}
    file = list(distance)
    while file:
        suivants = []
        for i in file:
            for j in voisins[i]:
                if j not in distance:
                    distance[j] = distance[i] + 1
                    suivants.append(j)
        file = suivants
    return {i: min(1.0, distance.get(i, profondeur) / profondeur) for i in dans}


def peindre(humain, image, zone, couleur, opacite, motif, anneaux=3, champ=None):
    """Mélange « couleur » dans « image » sur les faces du corps dont le centre est dans « zone ».

    Sans « champ », l'opacité s'estompe sur « anneaux » rangées de faces au bord de la zone.
    Avec « champ » (positions monde N×3 -> opacité 0–1), elle est calculée pour chaque
    pixel : formes nettes et fines (sourcils) indépendantes du maillage.
    """
    maillage = humain.data
    monde = humain.matrix_world
    retenues = {
        p.index for p in maillage.polygons
        if zone(monde @ (sum((maillage.vertices[i].co for i in p.vertices), Vector()) / len(p.vertices)))
    }
    fondu = _anneaux(maillage, retenues, anneaux)
    largeur, hauteur = image.size
    pixels = np.empty(largeur * hauteur * 4, np.float32)
    image.pixels.foreach_get(pixels)
    pixels = pixels.reshape(hauteur, largeur, 4)
    teinte = srgb(couleur)
    uv = maillage.uv_layers.active.data
    for p in maillage.polygons:
        if p.index not in retenues:
            continue
        boucles = list(p.loop_indices)
        for k in range(1, len(boucles) - 1):
            coins = [boucles[0], boucles[k], boucles[k + 1]]
            sommets = [maillage.loops[i].vertex_index for i in coins]
            pts = np.array([[uv[i].uv.x * largeur, uv[i].uv.y * hauteur] for i in coins])
            if champ is None:
                alphas = np.array([fondu[i] for i in sommets]) * opacite

                def valeur(w, alphas=alphas):
                    return w[0] * alphas[0] + w[1] * alphas[1] + w[2] * alphas[2]
            else:
                positions = np.array([tuple(monde @ maillage.vertices[i].co) for i in sommets])

                def valeur(w, positions=positions):
                    points = w[0][..., None] * positions[0] + w[1][..., None] * positions[1] + w[2][..., None] * positions[2]
                    return champ(points) * opacite
            _triangle(pixels, pts, valeur, teinte, motif)
    image.pixels.foreach_set(pixels.ravel())
    image.update()
    image.pack()
    return len(retenues)


def _triangle(pixels, pts, valeur, teinte, motif):
    hauteur, largeur = pixels.shape[:2]
    x0, y0 = np.floor(pts.min(0)).astype(int)
    x1, y1 = np.ceil(pts.max(0)).astype(int)
    x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, largeur - 1), min(y1, hauteur - 1)
    if x1 < x0 or y1 < y0:
        return
    xs, ys = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
    (ax, ay), (bx, by), (cx, cy) = pts
    aire = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay)
    if abs(aire) < 1e-9:
        return
    w1 = ((xs - ax) * (cy - ay) - (cx - ax) * (ys - ay)) / aire
    w2 = ((bx - ax) * (ys - ay) - (xs - ax) * (by - ay)) / aire
    w0 = 1 - w1 - w2
    dedans = (w0 >= 0) & (w1 >= 0) & (w2 >= 0)
    if not dedans.any():
        return
    alpha = np.clip(valeur((w0, w1, w2)), 0, 1)
    zone = pixels[y0:y1 + 1, x0:x1 + 1]
    a = (alpha * motif[y0:y1 + 1, x0:x1 + 1] * dedans)[..., None]
    zone[..., :3] = zone[..., :3] * (1 - a) + teinte * a


def champ_racines(racines, rayon=0.0025, gain=0.6):
    """Densité des racines de poils (positions monde) : la peinture suit les cartes réelles."""
    racines = np.array([tuple(r) for r in racines])
    mini, maxi = racines.min(0) - 3 * rayon, racines.max(0) + 3 * rayon
    arbre = KDTree(len(racines))
    for i, r in enumerate(racines):
        arbre.insert(r, i)
    arbre.balance()

    def zone(p):
        return arbre.find(p)[2] < 4 * rayon

    def champ(points):
        forme = points.shape[:-1]
        plats = points.reshape(-1, 3)
        densite = np.zeros(len(plats))
        proches = np.all((plats > mini) & (plats < maxi), axis=1)
        if proches.any():
            d2 = ((plats[proches, None, :] - racines[None, :, :]) ** 2).sum(-1)
            densite[proches] = np.exp(-d2 / rayon**2).sum(1) * gain
        return np.clip(densite, 0, 1).reshape(forme)

    return zone, champ
