"""Expressions faciales d'Adam à partir des « expression units » officielles MPFB (CC0).

Chaque canal du studio (noms ARKit) reçoit une ou plusieurs cibles MPFB sculptées
pour ce maillage. Les cartes de poils (sourcils, cils, barbe) suivent ces
expressions par liaison de surface, pour que les sourcils montent avec le front.
"""

import bpy

import mpfb_outils

# Canal du studio -> [(cible MPFB, poids)]. « left » MPFB = côté gauche du personnage.
CANAUX = {
    "eyeBlinkLeft": [("eye-left-closure", 1.0)],
    "eyeBlinkRight": [("eye-right-closure", 1.0)],
    "eyeWideLeft": [("eye-left-opened-up", 1.0)],
    "eyeWideRight": [("eye-right-opened-up", 1.0)],
    "browInnerUp": [("eyebrows-left-inner-up", 1.0), ("eyebrows-right-inner-up", 1.0)],
    "browDownLeft": [("eyebrows-left-down", 1.0)],
    "browDownRight": [("eyebrows-right-down", 1.0)],
    "jawOpen": [("mouth-open", 1.0)],
    "mouthFrownLeft": [("mouth-depression", 0.5)],
    "mouthFrownRight": [("mouth-depression", 0.5)],
}


def chemin_unite(nom, TargetService):
    chemin = TargetService.target_full_path(nom)
    if chemin and "expression" in chemin.replace("\\", "/") and "caucasian" in chemin:
        return chemin
    import os

    racine = os.path.dirname(TargetService.target_full_path("eye-left-closure") or "")
    candidat = os.path.join(racine, f"{nom}.target.gz")
    return candidat if os.path.isfile(candidat) else chemin


def ajouter_expressions(humain):
    """Crée une forme par canal ARKit en combinant les unités MPFB."""
    _, TargetService, _ = mpfb_outils.services()
    cles = humain.data.shape_keys.key_blocks
    temporaires = {}
    for canal, unites in CANAUX.items():
        for nom, _ in unites:
            if nom not in temporaires:
                chemin = chemin_unite(nom, TargetService)
                if not chemin:
                    raise SystemExit(f"Unité d'expression introuvable : {nom}")
                temporaires[nom] = TargetService.load_target(humain, chemin, weight=0.0, name=f"_unite_{nom}")
    base = [v.co.copy() for v in cles[0].data]
    for canal, unites in CANAUX.items():
        cle = humain.shape_key_add(name=canal, from_mix=False)
        for i, co in enumerate(base):
            delta = sum(((temporaires[n].data[i].co - co) * poids for n, poids in unites), co * 0)
            cle.data[i].co = co + delta
        cle.value = 0.0
    for cle in temporaires.values():
        humain.shape_key_remove(cle)
    return list(CANAUX)


def suivre_expressions(objets, humain):
    """Ajoute aux cartes de poils les mêmes formes, par liaison à la surface du corps."""
    noms = [k.name for k in humain.data.shape_keys.key_blocks if k.name in CANAUX]
    for objet in objets:
        liaison = objet.modifiers.new("Liaison", "SURFACE_DEFORM")
        liaison.target = humain
        with bpy.context.temp_override(object=objet, active_object=objet):
            bpy.ops.object.surfacedeform_bind(modifier=liaison.name)
        if objet.data.shape_keys is None:
            objet.shape_key_add(name="Basis", from_mix=False)
        for nom in noms:
            for k in humain.data.shape_keys.key_blocks:
                k.value = 1.0 if k.name == nom else (k.value if k.name not in CANAUX else 0.0)
            depsgraph = bpy.context.evaluated_depsgraph_get()
            evalue = objet.evaluated_get(depsgraph)
            maillage = evalue.to_mesh()
            cle = objet.shape_key_add(name=nom, from_mix=False)
            for i, v in enumerate(maillage.vertices):
                cle.data[i].co = v.co
            evalue.to_mesh_clear()
        for k in humain.data.shape_keys.key_blocks:
            if k.name in CANAUX:
                k.value = 0.0
        objet.modifiers.remove(liaison)
    return noms
