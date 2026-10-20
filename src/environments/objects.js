import * as THREE from "three";
export const material = (color, roughness = 0.85, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, ...extra });
export function box(parent, name, size, position, mat) {
  const object = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  object.name = name;
  object.position.set(...position);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}
export function sphere(parent, name, size, position, mat) {
  const object = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), mat);
  object.name = name;
  object.scale.set(...size);
  object.position.set(...position);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}
export function group(parent, name, position = [0, 0, 0]) {
  const object = new THREE.Group();
  object.name = name;
  object.position.set(...position);
  parent.add(object);
  return object;
}
export function canvasTexture(width, height, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext("2d"), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
