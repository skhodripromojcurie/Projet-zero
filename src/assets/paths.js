/** Resolve public/ assets under Vite's deployment base, including on GitHub Pages.
 * Prefer "assets/models/adam.glb" for public/assets/models/adam.glb.
 * Keep already resolved paths and explicit URLs compatible with GLTFLoader.
 */
export function publicAssetUrl(path, base = import.meta.env?.BASE_URL ?? "/") {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(path) || path.startsWith(base)) {
    return path;
  }
  return `${base}${path.replace(/^\/+/, "")}`;
}
