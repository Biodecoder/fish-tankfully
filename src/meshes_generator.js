// Fish Tankfully (缸好有鱼) — Crystalline Low-Poly 3D Mesh Generator (Three.js)
import * as THREE from "three";
import { getFishSpecies, getCatalogItem } from "./catalog.js";

function makeFaceted(geom) {
  const nonIndexed = geom.index ? geom.toNonIndexed() : geom;
  nonIndexed.computeVertexNormals();
  return nonIndexed;
}

function jitterGeometry(geom, amount = 0.08, seed = 1) {
  const g = makeFaceted(geom);
  const pos = g.attributes.position;
  // Weld vertices by rounded position key so faces stay watertight while faceted
  const map = new Map();
  let s = seed * 1337;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s / 2147483647) - 0.5;
  };
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
    if (!map.has(key)) {
      map.set(key, [rand() * amount, rand() * amount, rand() * amount]);
    }
    const [dx, dy, dz] = map.get(key);
    pos.setXYZ(i, x + dx, y + dy, z + dz);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

// ============================================================================
// 1. FACETED 3D ORNAMENTAL FISH & SHRIMP GENERATOR
// ============================================================================
export function createFishMesh(speciesId, opts = {}) {
  const sp = getFishSpecies(speciesId);
  const isShiny = Boolean(opts.isShiny);
  const isKing = Boolean(opts.isKing);
  const stage = opts.stage || "adult";
  const palette = isShiny && sp.shinyColors ? sp.shinyColors : sp.colors;

  const root = new THREE.Group();
  root.name = `fish_${sp.id}`;

  const bodyMat = new THREE.MeshStandardMaterial({
    color: palette.body,
    roughness: isShiny ? 0.22 : 0.38,
    metalness: isShiny ? 0.35 : 0.12,
    flatShading: true
  });
  const stripeMat = new THREE.MeshStandardMaterial({
    color: palette.stripe,
    emissive: palette.stripe,
    emissiveIntensity: sp.shape === "tetra" || isShiny ? 0.35 : 0.08,
    roughness: 0.25,
    metalness: 0.2,
    flatShading: true
  });
  const bellyMat = new THREE.MeshStandardMaterial({
    color: palette.belly,
    roughness: 0.42,
    metalness: 0.1,
    flatShading: true
  });
  const tailMat = new THREE.MeshStandardMaterial({
    color: palette.tail,
    emissive: palette.tail,
    emissiveIntensity: 0.18,
    roughness: 0.32,
    flatShading: true,
    side: THREE.DoubleSide
  });
  const finMat = new THREE.MeshStandardMaterial({
    color: palette.fin,
    roughness: 0.38,
    flatShading: true,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide
  });

  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const tailPivot = new THREE.Group();
  root.add(tailPivot);

  if (sp.shape === "angelfish") {
    // Tall diamond cichlid body with dramatic high dorsal & ventral sail fins
    const bodyGeom = makeFaceted(new THREE.OctahedronGeometry(0.22, 1));
    bodyGeom.scale(1.25, 1.45, 0.32);
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    bodyGroup.add(body);

    // 3 vertical black/gold bars (iconic Altum Angelfish look in ss_08)
    for (const bx of [-0.07, 0.015, 0.095]) {
      const barH = 0.36 * (1 - Math.abs(bx) * 2.1);
      const barZ = 0.135 * (1 - Math.abs(bx) * 2.2);
      const barG = makeFaceted(new THREE.BoxGeometry(0.024, barH, Math.max(0.04, barZ)));
      const bar = new THREE.Mesh(barG, stripeMat);
      bar.position.set(bx, 0, 0);
      bodyGroup.add(bar);
    }

    // Tall swept dorsal sail fin
    const dorsalShape = new THREE.BufferGeometry();
    const dVerts = new Float32Array([
      0.08, 0.22, 0,
      -0.12, 0.20, 0,
      -0.28, 0.68, 0
    ]);
    dorsalShape.setAttribute("position", new THREE.BufferAttribute(dVerts, 3));
    dorsalShape.computeVertexNormals();
    bodyGroup.add(new THREE.Mesh(dorsalShape, finMat));

    // Long swept ventral sail fin + feelers
    const ventralShape = new THREE.BufferGeometry();
    const vVerts = new Float32Array([
      0.06, -0.22, 0,
      -0.12, -0.20, 0,
      -0.30, -0.70, 0
    ]);
    ventralShape.setAttribute("position", new THREE.BufferAttribute(vVerts, 3));
    ventralShape.computeVertexNormals();
    bodyGroup.add(new THREE.Mesh(ventralShape, finMat));

    tailPivot.position.set(-0.24, 0, 0);
    const tailG = makeFaceted(new THREE.ConeGeometry(0.18, 0.24, 4));
    tailG.rotateZ(-Math.PI / 2);
    tailG.scale(1, 1.1, 0.22);
    const tailMesh = new THREE.Mesh(tailG, tailMat);
    tailMesh.position.set(-0.1, 0, 0);
    tailPivot.add(tailMesh);
  } else if (sp.shape === "shrimp") {
    // Segmented Neocaridina Cherry/Crystal Shrimp
    for (let i = 0; i < 4; i++) {
      const segG = makeFaceted(new THREE.BoxGeometry(0.075, 0.068 - i * 0.008, 0.06 - i * 0.006));
      const seg = new THREE.Mesh(segG, i % 2 === 1 && sp.id.includes("crystal") ? bellyMat : bodyMat);
      seg.position.set(0.09 - i * 0.065, -i * 0.008, 0);
      seg.rotation.z = i * 0.08;
      bodyGroup.add(seg);
    }
    // Antennae
    const antMat = new THREE.MeshBasicMaterial({ color: palette.fin });
    for (const side of [-1, 1]) {
      const antG = new THREE.CylinderGeometry(0.003, 0.001, 0.22, 4);
      antG.rotateZ(Math.PI / 2.4);
      const ant = new THREE.Mesh(antG, antMat);
      ant.position.set(0.2, 0.03, side * 0.025);
      ant.rotation.y = side * 0.25;
      bodyGroup.add(ant);
    }
    tailPivot.position.set(-0.14, -0.02, 0);
    const tFan = makeFaceted(new THREE.ConeGeometry(0.045, 0.08, 4));
    tFan.rotateZ(-Math.PI / 2);
    tFan.scale(1, 0.4, 1.2);
    tailPivot.add(new THREE.Mesh(tFan, tailMat));
  } else {
    // Torpedo / Diamond Faceted Fish (Tetra, Barb, Guppy, Minnow, Cory, Goby)
    const isBarb = sp.shape === "barb";
    const isGuppy = sp.shape === "guppy";
    const isBottom = sp.shape === "cory" || sp.shape === "goby";

    const bodyGeom = makeFaceted(new THREE.OctahedronGeometry(0.16, 1));
    bodyGeom.scale(
      isBarb ? 1.45 : 1.75,
      isBarb ? 1.05 : isBottom ? 0.72 : 0.78,
      isBottom ? 0.58 : 0.42
    );
    const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
    bodyGroup.add(bodyMesh);

    // Lower belly accent
    const bellyGeom = makeFaceted(new THREE.OctahedronGeometry(0.13, 1));
    bellyGeom.scale(1.5, 0.55, 0.38);
    const bellyMesh = new THREE.Mesh(bellyGeom, bellyMat);
    bellyMesh.position.set(0.01, -0.045, 0);
    bodyGroup.add(bellyMesh);

    if (sp.shape === "tetra" || sp.shape === "minnow") {
      // Glowing horizontal neon stripe + crimson rear flank (authentic 红绿灯 Neon Tetra look in ref_3!)
      const neonG = makeFaceted(new THREE.OctahedronGeometry(0.14, 1));
      neonG.scale(1.55, 0.24, 0.46);
      const neonStrip = new THREE.Mesh(neonG, stripeMat);
      neonStrip.position.set(0.02, 0.022, 0);
      bodyGroup.add(neonStrip);

      const rearRedG = makeFaceted(new THREE.OctahedronGeometry(0.11, 1));
      rearRedG.scale(1.15, 0.42, 0.45);
      const rearRed = new THREE.Mesh(rearRedG, tailMat);
      rearRed.position.set(-0.08, -0.022, 0);
      bodyGroup.add(rearRed);
    }

    if (isBarb || sp.id === "pale_chub") {
      // Vertical tiger stripes or rainbow breeding bars
      for (const bx of [-0.09, -0.02, 0.05, 0.11]) {
        const taper = 1 - Math.abs(bx) * 3.2;
        const barG = makeFaceted(new THREE.BoxGeometry(0.022, Math.max(0.08, 0.19 * taper), Math.max(0.05, 0.135 * taper)));
        const bar = new THREE.Mesh(barG, stripeMat);
        bar.position.set(bx, 0, 0);
        bodyGroup.add(bar);
      }
    }

    // Dorsal fin
    const dorsalG = makeFaceted(new THREE.ConeGeometry(0.07, 0.14, 3));
    dorsalG.scale(1.2, 1, 0.2);
    const dorsal = new THREE.Mesh(dorsalG, finMat);
    dorsal.position.set(-0.02, isBarb ? 0.17 : 0.13, 0);
    dorsal.rotation.z = 0.35;
    bodyGroup.add(dorsal);

    // Tail fin
    tailPivot.position.set(-0.24, 0, 0);
    const tailW = isGuppy ? 0.22 : 0.13;
    const tailL = isGuppy ? 0.28 : 0.16;
    const tailG = makeFaceted(new THREE.ConeGeometry(tailW, tailL, 4));
    tailG.rotateZ(-Math.PI / 2);
    tailG.scale(1, 1.15, 0.18);
    const tailMesh = new THREE.Mesh(tailG, tailMat);
    tailMesh.position.set(-tailL * 0.45, 0, 0);
    tailPivot.add(tailMesh);
  }

  // Faceted Eyes on both sides of head
  if (sp.shape !== "shrimp") {
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: "#ffffff" });
    const eyePupilMat = new THREE.MeshBasicMaterial({ color: "#111827" });
    const headX = sp.shape === "angelfish" ? 0.16 : 0.19;
    const headY = sp.shape === "angelfish" ? 0.04 : 0.025;
    const headZ = sp.shape === "angelfish" ? 0.065 : 0.058;

    for (const side of [-1, 1]) {
      const eyeW = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.036, 0.015), eyeWhiteMat);
      eyeW.position.set(headX, headY, side * headZ);
      bodyGroup.add(eyeW);

      const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.018), eyePupilMat);
      pupil.position.set(headX + 0.004, headY, side * (headZ + 0.003));
      bodyGroup.add(pupil);
    }
  }

  // Overall species & stage scale (delicate miniature aquarium proportions matching ss_04 & ss_08)
  const baseScale = Math.max(0.24, Math.min(0.52, sp.adultLengthCm / 11.5));
  const stageMult = stage === "fry" ? 0.68 : 1.0;
  const kingMult = isKing ? 1.22 : 1.0;
  const finalScale = baseScale * stageMult * kingMult;
  root.scale.setScalar(finalScale);

  root.userData = {
    speciesId: sp.id,
    tailPivot,
    bodyGroup,
    baseScale: finalScale,
    swimPhase: Math.random() * Math.PI * 2
  };

  return root;
}

// ============================================================================
// 2. FACETED 3D AQUASCAPE ROCKS, DRIFTWOOD, PLANTS, MECHA RELIC & EQUIPMENT
// ============================================================================
export function createDecorMesh(itemId) {
  const group = new THREE.Group();
  group.name = `decor_${itemId}`;

  switch (itemId) {
    case "rock_moss_boulder": {
      // Wide faceted canyon boulder with olive-golden moss facets (matches ref_4 & ss_08)
      const rockMat = new THREE.MeshStandardMaterial({
        color: "#6b655b",
        roughness: 0.85,
        flatShading: true
      });
      const mossMat = new THREE.MeshStandardMaterial({
        color: "#8c9e35",
        roughness: 0.78,
        flatShading: true
      });

      const mainG = jitterGeometry(new THREE.DodecahedronGeometry(0.85, 1), 0.18, 12);
      mainG.scale(1.45, 0.82, 1.15);
      const mainRock = new THREE.Mesh(mainG, rockMat);
      mainRock.position.y = 0.52;
      mainRock.castShadow = true;
      mainRock.receiveShadow = true;
      group.add(mainRock);

      // Mossy cap layer
      const mossG = jitterGeometry(new THREE.DodecahedronGeometry(0.76, 1), 0.14, 29);
      mossG.scale(1.38, 0.55, 1.05);
      const mossCap = new THREE.Mesh(mossG, mossMat);
      mossCap.position.set(0.04, 0.72, 0.02);
      mossCap.castShadow = true;
      group.add(mossCap);

      // Sub boulders around base
      for (const [bx, bz, s] of [[-0.85, 0.35, 0.42], [0.88, 0.4, 0.36], [-0.35, 0.68, 0.3]]) {
        const subG = jitterGeometry(new THREE.DodecahedronGeometry(s, 1), 0.08, Math.abs(bx * 100));
        subG.scale(1.2, 0.7, 1.0);
        const sub = new THREE.Mesh(subG, rockMat);
        sub.position.set(bx, s * 0.45, bz);
        sub.castShadow = true;
        group.add(sub);
      }
      break;
    }

    case "rock_seiryu_peak": {
      // Tall crystalline faceted stone peak (matches ref_1 & ss_02)
      const stoneMat = new THREE.MeshStandardMaterial({
        color: "#7c7d78",
        roughness: 0.8,
        flatShading: true
      });
      const peakG = jitterGeometry(new THREE.ConeGeometry(0.68, 1.85, 7, 3), 0.16, 44);
      const peak = new THREE.Mesh(peakG, stoneMat);
      peak.position.y = 0.88;
      peak.rotation.z = -0.18;
      peak.castShadow = true;
      peak.receiveShadow = true;
      group.add(peak);

      const sideG = jitterGeometry(new THREE.DodecahedronGeometry(0.52, 1), 0.12, 77);
      sideG.scale(1.2, 0.85, 0.95);
      const sideRock = new THREE.Mesh(sideG, stoneMat);
      sideRock.position.set(0.45, 0.38, 0.25);
      sideRock.castShadow = true;
      group.add(sideRock);
      break;
    }

    case "rock_cobbles": {
      const cobbleMat = new THREE.MeshStandardMaterial({
        color: "#7d7568",
        roughness: 0.82,
        flatShading: true
      });
      const offsets = [
        [0, 0.16, 0, 0.34, 1.3, 0.55, 1.0],
        [0.36, 0.12, 0.16, 0.24, 1.2, 0.5, 0.9],
        [-0.32, 0.11, 0.18, 0.21, 1.1, 0.5, 1.1]
      ];
      offsets.forEach(([x, y, z, r, sx, sy, sz], i) => {
        const g = jitterGeometry(new THREE.DodecahedronGeometry(r, 1), 0.05, 90 + i * 7);
        g.scale(sx, sy, sz);
        const m = new THREE.Mesh(g, cobbleMat);
        m.position.set(x, y, z);
        m.castShadow = true;
        group.add(m);
      });
      break;
    }

    case "ornament_mecha_head": {
      // Iconic Sunken Overgrown Gundam/Mecha Helmet from ss_01 & ss_05!
      const whiteArmor = new THREE.MeshStandardMaterial({ color: "#d8dee9", roughness: 0.55, flatShading: true });
      const greenArmor = new THREE.MeshStandardMaterial({ color: "#5e8c6a", roughness: 0.6, flatShading: true });
      const darkFrame = new THREE.MeshStandardMaterial({ color: "#2e3440", roughness: 0.7, flatShading: true });
      const goldFin = new THREE.MeshStandardMaterial({ color: "#e5c07b", roughness: 0.4, metalness: 0.3, flatShading: true });
      const eyeGlow = new THREE.MeshStandardMaterial({
        color: "#76e4f7",
        emissive: "#00d4ff",
        emissiveIntensity: 1.4,
        flatShading: true
      });
      const mossMat = new THREE.MeshStandardMaterial({ color: "#5c9e31", roughness: 0.85, flatShading: true });

      const head = new THREE.Group();
      head.position.y = 0.58;
      head.rotation.set(0.14, 0.15, -0.18); // Slightly tilted sunken relic pose!
      group.add(head);

      // Main helmet dome
      const domeG = jitterGeometry(new THREE.DodecahedronGeometry(0.55, 1), 0.04, 5);
      domeG.scale(1.05, 1.1, 1.15);
      head.add(new THREE.Mesh(domeG, whiteArmor));

      // Green crest & faceplate mask
      const crestG = makeFaceted(new THREE.BoxGeometry(0.22, 0.55, 0.65));
      const crest = new THREE.Mesh(crestG, greenArmor);
      crest.position.set(0, 0.32, 0.05);
      head.add(crest);

      // Dark visor recess + glowing cyan dual eyes
      const visorG = makeFaceted(new THREE.BoxGeometry(0.72, 0.18, 0.35));
      const visor = new THREE.Mesh(visorG, darkFrame);
      visor.position.set(0, 0.04, 0.38);
      head.add(visor);

      for (const side of [-1, 1]) {
        const eyeG = makeFaceted(new THREE.BoxGeometry(0.2, 0.065, 0.08));
        const eye = new THREE.Mesh(eyeG, eyeGlow);
        eye.position.set(side * 0.16, 0.04, 0.53);
        eye.rotation.z = side * -0.15;
        head.add(eye);
      }

      // Iconic Yellow V-Fin Blades!
      for (const side of [-1, 1]) {
        const bladeG = makeFaceted(new THREE.ConeGeometry(0.085, 0.95, 4));
        const blade = new THREE.Mesh(bladeG, goldFin);
        blade.position.set(side * 0.42, 0.48, 0.42);
        blade.rotation.z = side * -0.68;
        blade.rotation.x = 0.22;
        head.add(blade);
      }

      // Overgrown moss tufts on the helmet brow & cheek
      for (const [mx, my, mz, ms] of [[-0.22, 0.42, 0.25, 0.22], [0.28, 0.35, 0.15, 0.18], [-0.35, -0.15, 0.32, 0.2]]) {
        const mg = jitterGeometry(new THREE.DodecahedronGeometry(ms, 1), 0.05, 19);
        mg.scale(1.3, 0.65, 1.1);
        const m = new THREE.Mesh(mg, mossMat);
        m.position.set(mx, my, mz);
        head.add(m);
      }
      break;
    }

    case "wood_bonsai": {
      // Moss Bonsai Driftwood Tree (matches ref_4 & ss_04!)
      const woodMat = new THREE.MeshStandardMaterial({ color: "#8c4a27", roughness: 0.78, flatShading: true });
      const leafGreen = new THREE.MeshStandardMaterial({ color: "#5ea832", roughness: 0.65, flatShading: true });
      const leafLime = new THREE.MeshStandardMaterial({ color: "#9be548", roughness: 0.6, flatShading: true });
      const leafRed = new THREE.MeshStandardMaterial({ color: "#d9483b", roughness: 0.65, flatShading: true });

      // Gnarled root legs gripping the boulder
      const branches = [
        { p: [0, 0.75, 0], r: [0.1, 0, 0.22], radTop: 0.11, radBot: 0.2, len: 1.1 },
        { p: [-0.38, 1.15, 0.08], r: [0.15, 0.2, 0.72], radTop: 0.06, radBot: 0.11, len: 0.95 },
        { p: [0.32, 1.1, -0.1], r: [-0.2, 0, -0.55], radTop: 0.06, radBot: 0.1, len: 0.8 },
        { p: [-0.25, 0.35, 0.28], r: [0.55, 0, 0.48], radTop: 0.08, radBot: 0.03, len: 0.85 },
        { p: [0.28, 0.32, 0.25], r: [0.45, 0, -0.52], radTop: 0.08, radBot: 0.03, len: 0.82 },
        { p: [0.05, 0.3, -0.32], r: [-0.55, 0, -0.15], radTop: 0.07, radBot: 0.03, len: 0.75 }
      ];
      for (const b of branches) {
        const cyl = jitterGeometry(new THREE.CylinderGeometry(b.radTop, b.radBot, b.len, 6, 3), 0.03, 33);
        const mesh = new THREE.Mesh(cyl, woodMat);
        mesh.position.set(...b.p);
        mesh.rotation.set(...b.r);
        mesh.castShadow = true;
        group.add(mesh);
      }

      // Faceted foliage canopy clouds with autumn red & lime leaf accents
      const canopyClouds = [
        [-0.55, 1.52, 0.12, 0.46, leafLime],
        [-0.1, 1.58, 0.05, 0.52, leafGreen],
        [0.42, 1.44, -0.08, 0.42, leafGreen],
        [-0.88, 1.38, 0.18, 0.36, leafGreen],
        [-0.32, 1.65, 0.24, 0.25, leafRed],
        [0.18, 1.55, 0.22, 0.22, leafRed]
      ];
      for (const [cx, cy, cz, cr, mat] of canopyClouds) {
        const cg = jitterGeometry(new THREE.DodecahedronGeometry(cr, 1), 0.08, Math.abs(cx * 50));
        cg.scale(1.35, 0.68, 1.1);
        const cm = new THREE.Mesh(cg, mat);
        cm.position.set(cx, cy, cz);
        cm.castShadow = true;
        group.add(cm);
      }
      break;
    }

    case "wood_spider":
    case "wood_mangrove":
    case "wood_stump": {
      const woodMat = new THREE.MeshStandardMaterial({
        color: itemId === "wood_stump" ? "#9c5227" : "#8b4c2b",
        roughness: 0.76,
        flatShading: true
      });
      const trunkH = itemId === "wood_stump" ? 1.85 : 1.45;
      const trunkR = itemId === "wood_stump" ? 0.36 : 0.18;
      const trunkG = jitterGeometry(new THREE.CylinderGeometry(trunkR * 0.7, trunkR * 1.25, trunkH, 7, 4), 0.05, 61);
      const trunk = new THREE.Mesh(trunkG, woodMat);
      trunk.position.set(0, trunkH * 0.48, 0);
      trunk.rotation.z = itemId === "wood_mangrove" ? -0.45 : 0.18;
      trunk.castShadow = true;
      group.add(trunk);

      // Sweeping root arches (matching ss_03 & frame_07)
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 1.4 - 0.6;
        const archG = jitterGeometry(new THREE.CylinderGeometry(0.03, 0.09, 1.35, 5, 3), 0.04, 10 + i);
        const arch = new THREE.Mesh(archG, woodMat);
        arch.position.set(Math.cos(angle) * 0.42, 0.55, Math.sin(angle) * 0.28);
        arch.rotation.z = Math.cos(angle) * 0.65;
        arch.rotation.x = Math.sin(angle) * 0.45;
        arch.castShadow = true;
        group.add(arch);
      }
      break;
    }

    case "plant_lotus_2":
    case "plant_lotus_3": {
      // Floating Lotus Lily Pads with slender stems rising to the water surface (matches ss_02 & ss_03!)
      const padCount = itemId === "plant_lotus_3" ? 3 : 2;
      const stemMat = new THREE.MeshStandardMaterial({ color: "#689f38", roughness: 0.7, flatShading: true });
      const padColors = ["#7cb342", "#9ccc65", "#c0ca33"];

      for (let i = 0; i < padCount; i++) {
        const h = 1.95 + i * 0.22;
        const ox = (i - (padCount - 1) / 2) * 0.48;
        const oz = (i % 2 === 0 ? 0.15 : -0.18);

        const stemG = new THREE.CylinderGeometry(0.018, 0.024, h, 5);
        const stem = new THREE.Mesh(stemG, stemMat);
        stem.position.set(ox * 0.6, h * 0.5, oz * 0.6);
        stem.rotation.z = -ox * 0.18;
        group.add(stem);

        // Polygonal lily pad with notch
        const padG = new THREE.CylinderGeometry(0.38, 0.36, 0.025, 9, 1, false, 0.25, Math.PI * 1.85);
        const padMat = new THREE.MeshStandardMaterial({
          color: padColors[i % padColors.length],
          roughness: 0.55,
          flatShading: true
        });
        const pad = new THREE.Mesh(makeFaceted(padG), padMat);
        pad.position.set(ox, h, oz);
        pad.rotation.y = i * 1.7;
        pad.castShadow = true;
        group.add(pad);
      }
      break;
    }

    case "plant_vallisneria": {
      // Tall ribbon grass blades
      const bladeMat = new THREE.MeshStandardMaterial({
        color: "#6bb836",
        roughness: 0.6,
        flatShading: true,
        side: THREE.DoubleSide
      });
      for (let i = 0; i < 11; i++) {
        const h = 1.15 + (i % 4) * 0.28;
        const bladeG = new THREE.ConeGeometry(0.075, h, 4);
        bladeG.scale(1, 1, 0.22);
        const blade = new THREE.Mesh(makeFaceted(bladeG), bladeMat);
        const ang = (i / 11) * Math.PI * 2;
        const r = 0.08 + (i % 3) * 0.07;
        blade.position.set(Math.cos(ang) * r, h * 0.48, Math.sin(ang) * r);
        blade.rotation.z = Math.cos(ang) * 0.16;
        blade.rotation.x = Math.sin(ang) * 0.12;
        group.add(blade);
      }
      group.userData.sways = true;
      break;
    }

    case "plant_red_rotala":
    case "plant_cabomba":
    case "plant_pearl_weed": {
      const isRed = itemId === "plant_red_rotala";
      const isPearl = itemId === "plant_pearl_weed";
      const colorMain = isRed ? "#d63031" : isPearl ? "#88e034" : "#4cd137";
      const colorTip = isRed ? "#ff7675" : "#b8e994";
      const matMain = new THREE.MeshStandardMaterial({ color: colorMain, roughness: 0.62, flatShading: true });
      const matTip = new THREE.MeshStandardMaterial({ color: colorTip, roughness: 0.55, flatShading: true });

      const stemCount = isPearl ? 7 : 9;
      for (let i = 0; i < stemCount; i++) {
        const h = (isPearl ? 0.62 : 1.15) + (i % 3) * 0.22;
        const ang = (i / stemCount) * Math.PI * 2;
        const rad = (i % 3) * 0.12;
        const sx = Math.cos(ang) * rad;
        const sz = Math.sin(ang) * rad;

        for (let w = 0; w < 5; w++) {
          const wy = 0.14 + (w / 5) * h;
          const whorlG = makeFaceted(new THREE.OctahedronGeometry(isPearl ? 0.11 : 0.14, 0));
          whorlG.scale(1.3, 0.55, 1.3);
          const whorl = new THREE.Mesh(whorlG, w >= 3 ? matTip : matMain);
          whorl.position.set(sx + Math.sin(w + i) * 0.03, wy, sz + Math.cos(w + i) * 0.03);
          whorl.rotation.y = w * 0.8;
          group.add(whorl);
        }
      }
      group.userData.sways = true;
      break;
    }

    case "plant_monte_carlo": {
      // Dense foreground carpet cushion (matches frame_07 & ss_05)
      const carpetMat = new THREE.MeshStandardMaterial({ color: "#6bd425", roughness: 0.68, flatShading: true });
      const highlightMat = new THREE.MeshStandardMaterial({ color: "#9ef038", roughness: 0.6, flatShading: true });
      for (let i = 0; i < 14; i++) {
        const ang = (i / 14) * Math.PI * 2;
        const dist = (i % 3) * 0.16;
        const tuftG = jitterGeometry(new THREE.DodecahedronGeometry(0.16, 1), 0.03, i + 5);
        tuftG.scale(1.4, 0.45, 1.3);
        const tuft = new THREE.Mesh(tuftG, i % 3 === 0 ? highlightMat : carpetMat);
        tuft.position.set(Math.cos(ang) * dist, 0.07, Math.sin(ang) * dist);
        group.add(tuft);
      }
      break;
    }

    case "filter_canister": {
      // External Canister Filter with dual intake/outflow lily pipes (matches ref_4!)
      const bodyMat = new THREE.MeshStandardMaterial({ color: "#2d3138", roughness: 0.5, flatShading: true });
      const blueTopMat = new THREE.MeshStandardMaterial({ color: "#2b6cb0", roughness: 0.42, flatShading: true });
      const pipeMat = new THREE.MeshStandardMaterial({ color: "#8c8275", roughness: 0.4, metalness: 0.25, flatShading: true });
      const capMat = new THREE.MeshStandardMaterial({ color: "#4299e1", roughness: 0.3, flatShading: true });

      // Canister body hanging just outside the right tank wall
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.58, 1.45, 0.68), bodyMat);
      box.position.set(0.35, -0.2, 0);
      group.add(box);

      const lid = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.26, 0.7), blueTopMat);
      lid.position.set(0.35, 0.62, 0);
      group.add(lid);

      // Dual U-bend intake & outflow pipes reaching over the rim into the tank
      for (const [zOff, dropLen] of [[-0.16, 1.35], [0.16, 0.55]]) {
        const upPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 8), pipeMat);
        upPipe.position.set(0.28, 0.95, zOff);
        group.add(upPipe);

        const crossPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.58, 8), pipeMat);
        crossPipe.rotation.z = Math.PI / 2;
        crossPipe.position.set(0.0, 1.2, zOff);
        group.add(crossPipe);

        const blueCap = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.06, 8), capMat);
        blueCap.rotation.z = Math.PI / 2;
        blueCap.position.set(-0.28, 1.2, zOff);
        group.add(blueCap);

        const inTankPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, dropLen, 8), pipeMat);
        inTankPipe.position.set(-0.22, 1.2 - dropLen * 0.5, zOff);
        group.add(inTankPipe);
      }
      break;
    }

    case "light_studio_led": {
      // Sleek clamp gooseneck studio aquarium light (matches ss_03 & ss_04)
      const metalMat = new THREE.MeshStandardMaterial({ color: "#4a4e54", roughness: 0.45, metalness: 0.5, flatShading: true });
      const glowMat = new THREE.MeshStandardMaterial({
        color: "#fffbeb",
        emissive: "#fef08a",
        emissiveIntensity: 1.2
      });

      const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.14), metalMat);
      clamp.position.set(0, 0.05, 0);
      group.add(clamp);

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.85, 8), metalMat);
      post.position.set(0, 0.48, 0);
      group.add(post);

      const hood = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, 0.36), metalMat);
      hood.position.set(0, 0.9, 0.48);
      group.add(hood);

      const ledPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.28), glowMat);
      ledPanel.rotation.x = Math.PI / 2;
      ledPanel.position.set(0, 0.868, 0.48);
      group.add(ledPanel);
      break;
    }

    default: {
      // Filter sponge, wave maker, or CO2 diffuser
      const gearMat = new THREE.MeshStandardMaterial({ color: "#3b4252", roughness: 0.5, flatShading: true });
      const accentMat = new THREE.MeshStandardMaterial({ color: "#38b2ac", roughness: 0.3, flatShading: true });
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.55, 8), gearMat);
      cyl.position.y = 0.28;
      group.add(cyl);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.14, 8), accentMat);
      cap.position.y = 0.6;
      group.add(cap);
      break;
    }
  }

  return group;
}
