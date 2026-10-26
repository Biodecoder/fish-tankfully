// Fish Tankfully (缸好有鱼) — 3D Wild Foraging Mountain Stream & First-Person Hand Catch Scene
import * as THREE from "three";
import { createFishMesh } from "./meshes_generator.js";

export class WildForagingScene {
  constructor(parentScene) {
    this.parentScene = parentScene;
    this.root = new THREE.Group();
    this.root.name = "wild_foraging_scene";
    this.root.visible = false;
    this.parentScene.add(this.root);

    this.wildFish = [];
    this.splashParticles = [];
    this.dipNetGroup = null;
    this.handRevealGroup = null;
    this.handFishHolder = null;
    this.scoopAnimTimer = 0;

    this.buildStreamEnvironment();
    this.buildDipNet();
    this.buildFirstPersonHand();
  }

  buildStreamEnvironment() {
    // 1. Sandy Riverbed & Olive-Amber Stream Water (matches frame_40 & ss_10)
    const bedMat = new THREE.MeshStandardMaterial({
      color: "#b0925a",
      roughness: 0.88,
      flatShading: true
    });
    const bedGeom = new THREE.PlaneGeometry(18, 12, 24, 16).toNonIndexed();
    bedGeom.rotateX(-Math.PI / 2);
    const pos = bedGeom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, Math.sin(x * 0.6) * 0.14 + Math.cos(z * 0.8) * 0.12 + (z < -1.5 ? (-z - 1.5) * 0.45 : 0));
    }
    bedGeom.computeVertexNormals();
    const bed = new THREE.Mesh(bedGeom, bedMat);
    bed.position.set(0, -0.35, 0);
    this.root.add(bed);

    // Water Surface Plane
    const waterSurfMat = new THREE.MeshStandardMaterial({
      color: "#76a878",
      roughness: 0.18,
      metalness: 0.1,
      transparent: true,
      opacity: 0.48,
      side: THREE.DoubleSide,
      flatShading: true
    });
    this.streamWaterPlane = new THREE.Mesh(new THREE.PlaneGeometry(18, 12, 24, 12), waterSurfMat);
    this.streamWaterPlane.rotation.x = -Math.PI / 2;
    this.streamWaterPlane.position.set(0, 1.35, 0);
    this.root.add(this.streamWaterPlane);

    // Underwater Volume Tint
    const volMat = new THREE.MeshBasicMaterial({
      color: "#8ca868",
      transparent: true,
      opacity: 0.24,
      depthWrite: false
    });
    const volPane = new THREE.Mesh(new THREE.PlaneGeometry(16, 2.2), volMat);
    volPane.position.set(0, 0.25, 2.5);
    this.root.add(volPane);

    // 2. Canyon Cliffs, Flat River Stones & Sunlit Bushes (matches frame_40 & ss_10)
    const cliffMat = new THREE.MeshStandardMaterial({ color: "#9c7044", roughness: 0.82, flatShading: true });
    const stoneMat = new THREE.MeshStandardMaterial({ color: "#787562", roughness: 0.8, flatShading: true });
    const bushMat = new THREE.MeshStandardMaterial({ color: "#76a02d", roughness: 0.7, flatShading: true });

    const cliffPositions = [
      [-3.8, 2.4, -2.8, 2.2, 3.6, 1.6],
      [-1.4, 2.8, -3.4, 2.4, 4.2, 1.8],
      [2.2, 2.2, -3.2, 2.8, 3.2, 1.8],
      [4.5, 2.5, -2.5, 2.2, 3.8, 1.8]
    ];
    for (const [x, y, z, sx, sy, sz] of cliffPositions) {
      const g = new THREE.DodecahedronGeometry(1.0, 1).toNonIndexed();
      g.scale(sx, sy, sz);
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, cliffMat);
      m.position.set(x, y, z);
      this.root.add(m);
    }

    // Flat underwater river slabs
    const slabCoords = [
      [1.4, -0.05, 0.7, 1.5, 0.28, 1.1],
      [2.6, 0.05, -0.2, 1.3, 0.32, 0.95],
      [-2.1, -0.1, 0.5, 1.4, 0.25, 1.0],
      [-0.4, 0.1, -0.8, 1.1, 0.35, 0.9]
    ];
    for (const [x, y, z, sx, sy, sz] of slabCoords) {
      const g = new THREE.DodecahedronGeometry(0.75, 1).toNonIndexed();
      g.scale(sx, sy, sz);
      g.computeVertexNormals();
      const s = new THREE.Mesh(g, stoneMat);
      s.position.set(x, y, z);
      this.root.add(s);
    }

    // Sunlit riverbank bushes
    for (const [bx, by, bz, br] of [[-2.4, 1.85, -1.8, 0.85], [0.8, 1.95, -2.1, 0.95], [3.2, 1.8, -1.6, 0.8]]) {
      const bg = new THREE.DodecahedronGeometry(br, 1).toNonIndexed();
      bg.scale(1.3, 0.75, 1.1);
      bg.computeVertexNormals();
      const bm = new THREE.Mesh(bg, bushMat);
      bm.position.set(bx, by, bz);
      this.root.add(bm);
    }
  }

  buildDipNet() {
    // 3D Long-Handled Dip Net (抄网) with woven net cone (matches frame_40!)
    this.dipNetGroup = new THREE.Group();
    this.dipNetGroup.position.set(-0.8, 0.65, 0.8);
    this.dipNetGroup.rotation.z = 0.68;
    this.root.add(this.dipNetGroup);

    const poleMat = new THREE.MeshStandardMaterial({ color: "#2d2926", roughness: 0.5, flatShading: true });
    const rimMat = new THREE.MeshStandardMaterial({ color: "#1f2421", roughness: 0.6, flatShading: true });
    const meshNetMat = new THREE.MeshBasicMaterial({
      color: "#d2d6dc",
      wireframe: true,
      transparent: true,
      opacity: 0.75
    });

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 3.6, 8), poleMat);
    pole.position.set(0, 1.8, 0);
    this.dipNetGroup.add(pole);

    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.035, 8, 18), rimMat);
    hoop.rotation.x = Math.PI / 2;
    this.dipNetGroup.add(hoop);

    const netBag = new THREE.Mesh(new THREE.ConeGeometry(0.51, 0.88, 14, 6, true), meshNetMat);
    netBag.position.set(0, -0.42, -0.12);
    netBag.rotation.x = -0.25;
    this.dipNetGroup.add(netBag);

    // Water splash droplet burst particles
    const dropGeom = new THREE.DodecahedronGeometry(0.04, 0);
    const dropMat = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.85 });
    for (let i = 0; i < 26; i++) {
      const d = new THREE.Mesh(dropGeom, dropMat);
      d.visible = false;
      d.userData = { vel: new THREE.Vector3(), life: 0 };
      this.root.add(d);
      this.splashParticles.push(d);
    }
  }

  buildFirstPersonHand() {
    // Iconic First-Person Faceted Low-Poly Open Hand holding the caught fish (matches ss_10!)
    this.handRevealGroup = new THREE.Group();
    this.handRevealGroup.position.set(0.08, 1.15, 1.55);
    this.handRevealGroup.rotation.set(-0.22, -0.08, 0.14);
    this.handRevealGroup.visible = false;
    this.root.add(this.handRevealGroup);

    const skinMat = new THREE.MeshStandardMaterial({
      color: "#f2b880",
      roughness: 0.65,
      flatShading: true
    });

    // Forearm & Palm
    const armG = new THREE.CylinderGeometry(0.24, 0.3, 1.35, 7).toNonIndexed();
    armG.scale(1.15, 1, 0.62);
    armG.computeVertexNormals();
    const arm = new THREE.Mesh(armG, skinMat);
    arm.position.set(0.18, -0.82, 0);
    arm.rotation.z = 0.15;
    this.handRevealGroup.add(arm);

    const palmG = new THREE.BoxGeometry(0.68, 0.62, 0.18).toNonIndexed();
    palmG.computeVertexNormals();
    const palm = new THREE.Mesh(palmG, skinMat);
    palm.position.set(0, 0, 0);
    this.handRevealGroup.add(palm);

    // 5 Faceted Fingers splayed upward like ss_10!
    const fingers = [
      // Thumb on left
      { x: -0.44, y: 0.22, rotZ: 0.42, len: 0.56, r: 0.085 },
      // Index
      { x: -0.22, y: 0.58, rotZ: 0.16, len: 0.68, r: 0.075 },
      // Middle
      { x: -0.02, y: 0.64, rotZ: 0.04, len: 0.74, r: 0.078 },
      // Ring
      { x: 0.18, y: 0.58, rotZ: -0.06, len: 0.68, r: 0.075 },
      // Pinky
      { x: 0.35, y: 0.44, rotZ: -0.15, len: 0.54, r: 0.068 }
    ];
    for (const f of fingers) {
      const fg = new THREE.CylinderGeometry(f.r * 0.82, f.r, f.len, 6).toNonIndexed();
      fg.computeVertexNormals();
      const fm = new THREE.Mesh(fg, skinMat);
      fm.position.set(f.x, f.y, 0.02);
      fm.rotation.z = f.rotZ;
      this.handRevealGroup.add(fm);
    }

    this.handFishHolder = new THREE.Group();
    this.handFishHolder.position.set(0.05, 0.18, 0.24);
    this.handRevealGroup.add(this.handFishHolder);
  }

  enterStream(spot) {
    this.root.visible = true;
    this.handRevealGroup.visible = false;
    this.dipNetGroup.visible = true;

    // Clear previous wild fish
    for (const wf of this.wildFish) {
      this.root.remove(wf.mesh);
    }
    this.wildFish = [];

    const pool = spot.possibleCatches || ["bitterling", "pale_chub", "neon_tetra"];
    for (let i = 0; i < 12; i++) {
      const speciesId = pool[i % pool.length];
      const isShiny = Math.random() < 0.18;
      const isKing = Math.random() < 0.22;
      const mesh = createFishMesh(speciesId, { stage: "adult", isShiny, isKing });
      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * 5.2,
        0.15 + Math.random() * 0.85,
        (Math.random() - 0.5) * 1.8 + 0.4
      );
      const dir = Math.random() < 0.5 ? 1 : -1;
      mesh.position.copy(pos);
      this.root.add(mesh);
      this.wildFish.push({
        speciesId,
        isShiny,
        isKing,
        mesh,
        pos,
        vx: dir * (0.65 + Math.random() * 0.55),
        vz: (Math.random() - 0.5) * 0.25,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  aimDipNet(normX, normY) {
    if (!this.dipNetGroup || this.handRevealGroup.visible) return;
    const tx = normX * 2.6;
    const ty = Math.max(0.15, Math.min(1.15, 0.55 - normY * 0.65));
    this.dipNetGroup.position.x += (tx - this.dipNetGroup.position.x) * 0.35;
    this.dipNetGroup.position.y += (ty - this.dipNetGroup.position.y) * 0.35;
  }

  scoopAtCurrentNet() {
    this.scoopAnimTimer = 0.45;
    const netPos = this.dipNetGroup.position;

    // Trigger splash burst
    for (const d of this.splashParticles) {
      d.visible = true;
      d.position.set(netPos.x + (Math.random() - 0.5) * 0.4, 1.25, netPos.z);
      d.userData.vel.set(
        (Math.random() - 0.5) * 2.2,
        1.4 + Math.random() * 1.8,
        (Math.random() - 0.5) * 1.5
      );
      d.userData.life = 0.65;
    }

    // Find closest wild fish within scoop radius (or fallback to nearest so player always enjoys catching!)
    let bestIdx = -1;
    let bestDist = 999;
    for (let i = 0; i < this.wildFish.length; i++) {
      const wf = this.wildFish[i];
      const d = Math.hypot(wf.pos.x - netPos.x, wf.pos.y - netPos.y);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    if (bestIdx !== -1 && bestDist < 2.2) {
      const [caught] = this.wildFish.splice(bestIdx, 1);
      this.root.remove(caught.mesh);
      this.showCaughtInHand(caught);
      return caught;
    }
    return null;
  }

  showCaughtInHand(caughtInfo) {
    this.dipNetGroup.visible = false;
    this.handRevealGroup.visible = true;

    while (this.handFishHolder.children.length > 0) {
      this.handFishHolder.remove(this.handFishHolder.children[0]);
    }

    const showcaseFish = createFishMesh(caughtInfo.speciesId, {
      stage: "adult",
      isKing: true,
      isShiny: caughtInfo.isShiny
    });
    showcaseFish.scale.setScalar(0.82);
    showcaseFish.rotation.y = Math.PI; // Facing left like ss_10!
    showcaseFish.rotation.z = 0.1;
    this.handFishHolder.add(showcaseFish);
  }

  hideHandReveal() {
    this.handRevealGroup.visible = false;
    this.dipNetGroup.visible = true;
  }

  exitStream() {
    this.root.visible = false;
  }

  update(time, dt) {
    if (!this.root.visible) return;

    // Scoop swing animation
    if (this.scoopAnimTimer > 0) {
      this.scoopAnimTimer = Math.max(0, this.scoopAnimTimer - dt);
      this.dipNetGroup.rotation.z = 0.68 - Math.sin((this.scoopAnimTimer / 0.45) * Math.PI) * 0.48;
    } else {
      this.dipNetGroup.rotation.z = 0.68;
    }

    // Splash particles
    for (const d of this.splashParticles) {
      if (!d.visible) continue;
      d.userData.life -= dt;
      if (d.userData.life <= 0) {
        d.visible = false;
        continue;
      }
      d.userData.vel.y -= 5.2 * dt;
      d.position.addScaledVector(d.userData.vel, dt);
    }

    // Wild fish swimming in stream
    for (const wf of this.wildFish) {
      wf.pos.x += wf.vx * dt;
      wf.pos.z += wf.vz * dt;
      if (wf.pos.x > 3.2 || wf.pos.x < -3.2) wf.vx *= -1;
      if (wf.pos.z > 1.4 || wf.pos.z < -0.5) wf.vz *= -1;
      wf.mesh.position.copy(wf.pos);
      wf.mesh.rotation.y = wf.vx >= 0 ? 0 : Math.PI;
      if (wf.mesh.userData.tailPivot) {
        wf.mesh.userData.tailPivot.rotation.y = Math.sin(time * 12 + wf.phase) * 0.35;
      }
    }

    // Gentle hand bobbing when showing caught fish
    if (this.handRevealGroup.visible) {
      this.handRevealGroup.position.y = 1.15 + Math.sin(time * 2.2) * 0.03;
    }
  }
}
