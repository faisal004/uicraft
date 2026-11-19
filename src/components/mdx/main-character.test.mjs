import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as THREE from "three";

// Exercise the actual scene helpers without mounting React or starting WebGL.
const source = readFileSync(new URL("./main-character.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(`${source}\nexport { makePerson, pose, HERO, pg, buildProps, buildAtmosphere };`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
});
const helpers = {};
const require = createRequire(import.meta.url);
runInNewContext(outputText, { exports: helpers, require: (name) => name === "three" ? THREE : require(name) });

test("jointed walkers keep one foot grounded throughout the walk cycle", () => {
  for (const detailed of [false, true]) {
    const person = helpers.makePerson(helpers.HERO, (color) => new THREE.MeshLambertMaterial({ color }), true, detailed);
    for (const stride of [0, 0.42, 0.7]) {
      for (let step = 0; step <= 128; step++) {
        helpers.pose(person, (step / 128) * Math.PI * 2, stride);
        person.root.updateMatrixWorld(true);
        const soles = person.feet.map((foot) => detailed
          ? new THREE.Box3().setFromObject(foot).min.y
          : foot.getWorldPosition(new THREE.Vector3()).y - 0.05);
        assert.ok(Math.abs(Math.min(...soles)) < 1e-8, `foot contact at stride ${stride}, step ${step}`);
        for (const knee of person.knees) assert.ok(knee.rotation.z <= 0, "knees bend backward");
        for (const foot of person.feet) {
          const rotation = foot.getWorldQuaternion(new THREE.Quaternion());
          const up = new THREE.Vector3(0, 1, 0).applyQuaternion(rotation);
          assert.ok(Math.abs(up.y - 1) < 1e-8, "soles stay level");
        }
      }
    }
  }
});

test("the headphone band clears the cap and the cups sit at ear height", () => {
  const person = helpers.makePerson(helpers.HERO, (color) => new THREE.MeshLambertMaterial({ color }), true, true);
  const cap = person.head.children.find((mesh) => mesh.geometry === helpers.pg.capTop);
  const band = person.head.children.find((mesh) => mesh.geometry === helpers.pg.band);
  cap.geometry.computeBoundingBox();
  const capTop = cap.position.y + cap.geometry.boundingBox.max.y;
  const vertices = band.geometry.getAttribute("position");
  const crest = [];
  for (let i = 0; i < vertices.count; i++) {
    if (Math.abs(vertices.getZ(i)) < 1e-6) crest.push(vertices.getY(i) + band.position.y);
  }
  assert.ok(Math.min(...crest) > capTop + 0.005, "band passes over the cap with clearance");
  const cups = person.head.children.filter((mesh) => mesh.geometry === helpers.pg.cup);
  assert.equal(cups.length, 4);
  for (const cup of cups) assert.ok(Math.abs(cup.position.y) < 1e-8, "cups centered on ears");
});

test("every flower blossom meets the top of its own stem", () => {
  const props = helpers.buildProps(new THREE.Scene());
  let blossoms = 0;
  for (const { group } of props) {
    for (const blossom of group.children.filter((mesh) => mesh.geometry?.type === "ShapeGeometry")) {
      const stem = group.children.find((mesh) => mesh.geometry?.type === "CylinderGeometry"
        && mesh.position.x === blossom.position.x && mesh.position.z === blossom.position.z);
      assert.ok(stem, "blossom has a stem at the same position");
      assert.ok(Math.abs(stem.position.y + stem.scale.y / 2 - blossom.position.y) < 1e-8);
      blossoms++;
    }
  }
  assert.ok(blossoms > 0, "checked the flower patches");
});

test("birds flap, gusts fade, and reduced motion keeps the atmosphere still", () => {
  const scene = new THREE.Scene();
  const animate = helpers.buildAtmosphere(scene);
  const birds = scene.children.filter((object) => object.isGroup);
  const gusts = scene.children.filter((object) => object.isMesh);
  assert.equal(birds.length, 7);
  animate(0, 0, false);
  const wing = birds[0].children[1];
  const start = wing.rotation.x;
  animate(0.2, 0, false);
  assert.notEqual(wing.rotation.x, start);
  assert.ok(gusts.some((gust) => gust.visible && gust.material.opacity > 0));
  for (const time of [1, 3.5, 5, 15, 45, 10_000]) {
    animate(time, time * 0.55, false);
    for (const bird of birds) {
      assert.ok(Math.abs(bird.position.x) <= 20, "flight wraps within the scene");
      assert.ok(bird.scale.x >= 0 && bird.scale.x <= 1);
    }
    for (const gust of gusts.filter((gust) => gust.visible)) {
      assert.ok(gust.material.opacity >= 0 && gust.material.opacity <= 0.65);
    }
  }
  animate(1, 0, true);
  scene.updateMatrixWorld(true);
  const positions = birds.map((bird) => bird.matrix.toArray());
  animate(30, 0, true);
  scene.updateMatrixWorld(true);
  assert.deepEqual(birds.map((bird) => bird.matrix.toArray()), positions);
  assert.ok(gusts.every((gust) => !gust.visible));
});
