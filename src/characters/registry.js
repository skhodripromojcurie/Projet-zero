import { publicAssetUrl } from "../assets/paths.js";
import { RIG_PROFILES } from "./rig-profiles.js";

export const MANIFEST_PATH = "assets/models/manifest.json";

/** A GLB entry is used only with its provenance and commercial licence on record. */
export function validateCharacterEntry(entry) {
  const errors = [];
  if (!entry || typeof entry !== "object") return ["Entrée absente."];
  if (
    typeof entry.url !== "string" ||
    !/^assets\/models\/[\w./-]+\.glb$/.test(entry.url)
  )
    errors.push("url doit désigner un .glb dans assets/models/.");
  if (!RIG_PROFILES[entry.profile]) errors.push("profile inconnu.");
  for (const key of ["source", "author", "license"])
    if (typeof entry[key] !== "string" || !entry[key].trim())
      errors.push(`${key} est obligatoire.`);
  if (entry.commercialUse !== true)
    errors.push(
      "commercialUse doit être true après vérification de la licence.",
    );
  return errors;
}

export async function readCharacterEntry(id, fetchImpl = fetch) {
  const response = await fetchImpl(publicAssetUrl(MANIFEST_PATH));
  if (!response.ok)
    throw new Error(`Manifeste indisponible (${response.status}).`);
  const manifest = await response.json();
  const entry = manifest?.characters?.[id] ?? null;
  if (entry === null) return null;
  const errors = validateCharacterEntry(entry);
  if (errors.length)
    throw new Error(`Modèle « ${id} » refusé : ${errors.join(" ")}`);
  return entry;
}
