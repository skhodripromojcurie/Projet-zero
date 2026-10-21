import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bodyFromJoints,
  bodySurface,
  duvetHeight,
} from "../src/environments/duvet.js";

// Adam lying on his back (bed-local metres), then sitting up.
const lying = {
  hips: [-0.15, 0.8, 0],
  spine: [-0.15, 0.82, -0.12],
  chest: [-0.15, 0.84, -0.32],
  thighL: [-0.06, 0.8, 0.02],
  thighR: [-0.24, 0.8, 0.02],
  shinL: [-0.06, 0.8, 0.46],
  shinR: [-0.24, 0.8, 0.46],
  footL: [-0.06, 0.79, 0.88],
  footR: [-0.24, 0.79, 0.88],
  upperArmL: [0.05, 0.86, -0.4],
  upperArmR: [-0.35, 0.86, -0.4],
  forearmL: [0.06, 0.88, -0.12],
  forearmR: [-0.36, 0.88, -0.12],
  handL: [-0.05, 0.92, 0.0],
  handR: [-0.25, 0.92, 0.0],
};
const sitting = {
  ...lying,
  spine: [-0.15, 0.92, -0.02],
  chest: [-0.15, 1.12, -0.05],
};

test("la couette ne passe jamais sous le corps d’Adam", () => {
  for (const joints of [lying, sitting]) {
    const body = bodyFromJoints(joints);
    for (let x = -0.8; x <= 0.8; x += 0.02)
      for (let z = body.hem; z <= 1.1; z += 0.02) {
        const top = bodySurface(x, z, body);
        if (top > -Infinity)
          assert.ok(duvetHeight(x, z, body) >= top + 0.0079, `${x}, ${z}`);
      }
  }
});

test("la couette est une fonction pure de la pose", () => {
  const body = bodyFromJoints(lying);
  assert.equal(duvetHeight(0.1, 0.4, body), duvetHeight(0.1, 0.4, body));
  assert.equal(
    duvetHeight(0.1, 0.4, bodyFromJoints(lying)),
    duvetHeight(0.1, 0.4, body),
  );
});

test("la couette couvre le torse couché et glisse sur les genoux assis", () => {
  const couche = bodyFromJoints(lying);
  const assis = bodyFromJoints(sitting);
  assert.ok(couche.hem < lying.chest[2]);
  assert.ok(assis.hem > sitting.hips[2]);
  // Sur les jambes, la couette suit leur relief.
  assert.ok(duvetHeight(-0.06, 0.3, couche) > duvetHeight(0.6, 0.3, couche));
});

test("les mains posées enfoncent la couette", () => {
  const body = bodyFromJoints(lying);
  const sans = { ...body, pressers: [] };
  assert.ok(duvetHeight(-0.05, 0.02, body) < duvetHeight(-0.05, 0.02, sans));
});
