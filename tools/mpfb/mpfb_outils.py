"""Création d'Adam avec MPFB 2 (extension Blender, ressources CC0), d'après une recette.

Fonctionne dans le Blender de l'environnement cloud comme sur un PC où MPFB est
installé : l'extension est retrouvée quel que soit son dépôt d'installation.
"""

import json
import os
import sys

import addon_utils
import bpy
from mathutils import Vector

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ICI, "..", "blender"))


def activer_mpfb():
    """Active MPFB et renvoie son paquet (bl_ext.<dépôt>.mpfb)."""
    addon_utils.modules_refresh()
    candidats = [m.__name__ for m in addon_utils.modules() if m.__name__.split(".")[-1] == "mpfb"]
    if not candidats:
        raise SystemExit(
            "MPFB est introuvable dans ce Blender. Installez l'extension MPFB "
            "(Édition › Préférences › Extensions) puis relancez."
        )
    nom = candidats[0]
    addon_utils.enable(nom, default_set=True)
    return sys.modules[nom]


def services():
    paquet = activer_mpfb().__name__
    importer = lambda module: __import__(f"{paquet}.services.{module}", fromlist=["x"])  # noqa: E731
    return (
        importer("humanservice").HumanService,
        importer("targetservice").TargetService,
        paquet,
    )


def lire_recette(chemin):
    with open(chemin, encoding="utf-8") as f:
        return json.load(f)


def cibles_de(reglages):
    """« nose-hump »: 0,4 -> nose-hump-incr à 0,4 ; « eye-height1 »: … -> côtés l- et r-.

    Une valeur négative choisit la cible « -decr » ; un nom qui existe tel quel
    (head-oval, chin-triangle…) est chargé avec sa valeur.
    """
    cibles = []
    for nom, valeur in reglages.items():
        if abs(valeur) < 1e-6:
            continue
        noms = [nom]
        if nom.startswith("lr-"):
            noms = [f"l-{nom[3:]}", f"r-{nom[3:]}"]
        for n in noms:
            cibles.append((n, valeur))
    return cibles


def charger_cibles(humain, reglages, TargetService):
    def exact(nom):
        # MPFB accepte aussi un préfixe : on exige le fichier exact.
        chemin = TargetService.target_full_path(nom)
        return chemin if chemin and os.path.basename(chemin).split(".target")[0] == nom else None

    manquantes = []
    for nom, valeur in cibles_de(reglages):
        candidats = [nom] if valeur > 0 else []
        candidats += [f"{nom}-incr" if valeur > 0 else f"{nom}-decr"]
        chemin = next((exact(c) for c in candidats if exact(c)), None)
        if not chemin:
            manquantes.append(nom)
            continue
        TargetService.load_target(humain, chemin, weight=abs(valeur))
    return manquantes


def regler_materiaux(humain, yeux, recette):
    peau = recette["peau"]
    for slot in humain.material_slots:
        if not slot.material or not slot.material.use_nodes:
            continue
        for noeud in slot.material.node_tree.nodes:
            if noeud.type != "GROUP":
                continue
            entrees = noeud.inputs
            if "SkinColor" in entrees:
                entrees["SkinColor"].default_value = (*peau["couleur"], 1)
            if "SkinOverride" in entrees:
                entrees["SkinOverride"].default_value = 1.0
            if "LipsColor" in entrees and "LipsOverride" in entrees:
                entrees["LipsColor"].default_value = (*peau["levres"], 1)
                entrees["LipsOverride"].default_value = 1.0
            for nom in ("Roughness",):
                if nom in entrees:
                    entrees[nom].default_value = peau["rugosite"]
    iris = recette["yeux"]
    for slot in yeux.material_slots if yeux else []:
        for noeud in slot.material.node_tree.nodes if slot.material and slot.material.use_nodes else []:
            if noeud.type == "GROUP" and "IrisMajorColor" in noeud.inputs:
                noeud.inputs["IrisMajorColor"].default_value = (*iris["iris_principal"], 1)
                noeud.inputs["IrisMinorColor"].default_value = (*iris["iris_secondaire"], 1)
                noeud.inputs["IrisSection4Color"].default_value = (*iris["iris_bord"], 1)


def trouver_ressource(fragment, sous_dossier):
    """Ressource MakeHuman (CC0) : dossier PZ_RESSOURCES_MH, sinon ressources installées avec MPFB."""
    if not fragment:
        return None
    racine = os.environ.get("PZ_RESSOURCES_MH")
    if racine and os.path.isfile(os.path.join(racine, fragment)):
        return os.path.join(racine, fragment)
    paquet = activer_mpfb().__name__
    AssetService = __import__(f"{paquet}.services.assetservice", fromlist=["x"]).AssetService
    chemin = AssetService.find_asset_absolute_path(fragment.split("/", 1)[1], sous_dossier)
    if not chemin:
        print(f"Ressource introuvable : {fragment} (définir PZ_RESSOURCES_MH)")
    return chemin


def creer_adam(recette, variante=None):
    """Crée l'humain de la recette (et d'une variante) : maillage, peau, yeux."""
    HumanService, TargetService, _ = services()
    humain = HumanService.create_human(macro_detail_dict=recette["macros"])
    reglages = dict(recette["visage"])
    if variante:
        for nom, valeur in recette["variantes"][variante]["visage"].items():
            reglages[nom] = reglages.get(nom, 0.0) + valeur
    manquantes = charger_cibles(humain, reglages, TargetService)
    if manquantes:
        print("Cibles introuvables (ignorées) :", ", ".join(manquantes))
    # Taille exacte : mise à l'échelle uniforme autour des pieds.
    hauteur = hauteur_corps(humain)
    facteur = recette["taille_m"] / hauteur
    humain.scale = [s * facteur for s in humain.scale]
    with bpy.context.temp_override(object=humain, active_object=humain, selected_editable_objects=[humain]):
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    HumanService.set_character_skin(None, humain, skin_type="LAYERED")
    yeux = None
    chemin_yeux = trouver_ressource(recette["yeux"].get("mhclo"), "eyes")
    if chemin_yeux:
        yeux = HumanService.add_mhclo_asset(chemin_yeux, humain, asset_type="Eyes", subdiv_levels=0, material_type="PROCEDURAL_EYES")
        yeux.name = "Yeux"  # reconnu comme yeux (et non vêtement) par les scripts du lot 2
    regler_materiaux(humain, yeux, recette)
    # Lissage : 1 niveau à l'écran, 2 au rendu (l'export garde le maillage de base).
    lissage = humain.modifiers.new("Lissage", "SUBSURF")
    lissage.levels, lissage.render_levels = 1, 2
    for objet in (humain, yeux):
        if objet:
            for polygone in objet.data.polygons:
                polygone.use_smooth = True
    return humain, yeux


def hauteur_corps(humain):
    points = sommets_evalues(humain, groupe="body")
    return max(p.z for p in points) - min(p.z for p in points)


def sommets_evalues(objet, groupe=None, poids_min=0.5):
    """Positions monde avec les formes appliquées, sans le masque des géométries d'aide."""
    visibles = [m.show_viewport for m in objet.modifiers]
    for m in objet.modifiers:
        m.show_viewport = False
    depsgraph = bpy.context.evaluated_depsgraph_get()
    depsgraph.update()
    evalue = objet.evaluated_get(depsgraph)
    maillage = evalue.to_mesh()
    points = [objet.matrix_world @ v.co for v in maillage.vertices]
    evalue.to_mesh_clear()
    for m, v in zip(objet.modifiers, visibles):
        m.show_viewport = v
    if groupe is None:
        return points
    gi = objet.vertex_groups[groupe].index
    return [points[v.index] for v in objet.data.vertices if any(g.group == gi and g.weight >= poids_min for g in v.groups)]


def reperes(humain):
    """Centres des repères d'articulation MPFB utiles au visage (mètres, monde)."""
    resultat = {}
    for nom in ("joint-l-eye", "joint-r-eye", "joint-head", "joint-head-2", "joint-jaw", "joint-mouth", "joint-neck"):
        points = sommets_evalues(humain, groupe=nom)
        resultat[nom] = sum(points, Vector()) / len(points)
    return resultat
