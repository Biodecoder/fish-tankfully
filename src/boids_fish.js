// Fish Tankfully (缸好有鱼) — 3D Fish Boids Schooling, Feeding Pursuit & Swim Animation
import * as THREE from "three";
import { getFishSpecies } from "./catalog.js";
import { createFishMesh } from "./meshes_generator.js";

export class FishBoidsManager {
  constructor(fishGroup) {
    this.fishGroup = fishGroup;
    this.agents = []; // { uid, data, sp, mesh, pos, vel, target, stateTimer }
  }

  syncWithTank(tank) {
    // Remove agents no longer in tank.fish
    const activeUids = new Set(tank.fish.map((f) => f.uid));
    for (let i = this.agents.length - 1; i >= 0; i--) {
      if (!activeUids.has(this.agents[i].uid)) {
        this.fishGroup.remove(this.agents[i].mesh);
        this.agents.splice(i, 1);
      }
    }

    const existingMap = new Map(this.agents.map((a) => [a.uid, a]));
    const W = tank.width * 0.42;
    const D = tank.depth * 0.38;
    const subH = 0.48;
    const topY = subH + (tank.height - 0.72) * (tank.waterLevel || 1.0);

    for (const fData of tank.fish) {
      let agent = existingMap.get(fData.uid);
      const sp = getFishSpecies(fData.speciesId);

      if (!agent) {
        const mesh = createFishMesh(fData.speciesId, {
          stage: fData.stage,
          isKing: fData.isKing,
          isShiny: fData.isShiny
        });
        mesh.userData.fishUid = fData.uid;

        const [minY, maxY] = this.getZoneBounds(sp.swimZone, subH, topY);
        const pos = new THREE.Vector3(
          (Math.random() - 0.5) * W * 1.6,
          minY + Math.random() * Math.max(0.2, maxY - minY),
          (Math.random() - 0.5) * D * 1.5
        );
        const dir = Math.random() < 0.5 ? 1 : -1;
        const vel = new THREE.Vector3(dir * (0.35 + Math.random() * 0.25), 0, (Math.random() - 0.5) * 0.15);

        mesh.position.copy(pos);
        this.fishGroup.add(mesh);

        agent = {
          uid: fData.uid,
          data: fData,
          sp,
          mesh,
          pos,
          vel,
          wanderTarget: pos.clone(),
          wanderTimer: Math.random() * 3,
          stage: fData.stage,
          isShiny: fData.isShiny
        };
        this.agents.push(agent);
      } else {
        agent.data = fData;
        // Rebuild mesh if fish grew from fry to adult or unlocked shiny morph!
        if (agent.stage !== fData.stage || agent.isShiny !== fData.isShiny) {
          this.fishGroup.remove(agent.mesh);
          agent.mesh = createFishMesh(fData.speciesId, {
            stage: fData.stage,
            isKing: fData.isKing,
            isShiny: fData.isShiny
          });
          agent.mesh.userData.fishUid = fData.uid;
          agent.mesh.position.copy(agent.pos);
          this.fishGroup.add(agent.mesh);
          agent.stage = fData.stage;
          agent.isShiny = fData.isShiny;
        }
      }
    }
  }

  getZoneBounds(zone, subH, topY) {
    const span = Math.max(0.4, topY - subH);
    if (zone === "substrate") return [subH + 0.04, subH + Math.min(0.28, span * 0.25)];
    if (zone === "bottom") return [subH + 0.08, subH + span * 0.38];
    if (zone === "top") return [subH + span * 0.55, topY - 0.08];
    return [subH + span * 0.22, topY - 0.16];
  }

  update(time, dt, tank, pellets = [], onPelletEaten = null) {
    const halfW = tank.width * 0.44;
    const halfD = tank.depth * 0.4;
    const subH = 0.48;
    const waterTopY = subH + (tank.height - 0.68) * (tank.waterLevel || 1.0);

    for (let i = 0; i < this.agents.length; i++) {
      const a = this.agents[i];
      const sp = a.sp;
      const [zoneMinY, zoneMaxY] = this.getZoneBounds(sp.swimZone, subH, waterTopY);

      const isAngelfish = sp.shape === "angelfish";
      const isShrimp = sp.shape === "shrimp";
      const maxSpeed = isAngelfish ? 0.42 : isShrimp ? 0.28 : 0.72;

      // 1. Check for nearby sinking food pellets!
      let closestPellet = null;
      let closestDist = 2.6;
      for (const p of pellets) {
        if (p.userData.eaten) continue;
        const d = a.pos.distanceTo(p.position);
        if (d < closestDist) {
          closestDist = d;
          closestPellet = p;
        }
      }

      const steer = new THREE.Vector3();

      if (closestPellet) {
        // Dart toward food pellet!
        const toFood = closestPellet.position.clone().sub(a.pos);
        if (closestDist < 0.22) {
          closestPellet.userData.eaten = true;
          if (onPelletEaten) onPelletEaten(a, closestPellet);
        } else {
          toFood.normalize().multiplyScalar(maxSpeed * 1.65);
          steer.add(toFood.sub(a.vel).multiplyScalar(3.5));
        }
      } else {
        // 2. Schooling Boids with same-species neighbors
        const align = new THREE.Vector3();
        const cohere = new THREE.Vector3();
        const separate = new THREE.Vector3();
        let sameCount = 0;

        for (let j = 0; j < this.agents.length; j++) {
          if (i === j) continue;
          const b = this.agents[j];
          const dist = a.pos.distanceTo(b.pos);
          if (dist < 0.34 && dist > 0.001) {
            separate.add(a.pos.clone().sub(b.pos).divideScalar(dist));
          }
          if (b.sp.id === sp.id && dist < 1.65) {
            align.add(b.vel);
            cohere.add(b.pos);
            sameCount += 1;
          }
        }

        steer.add(separate.multiplyScalar(1.35));
        if (sameCount > 0 && sp.schooling > 0.6) {
          align.divideScalar(sameCount).normalize().multiplyScalar(maxSpeed);
          cohere.divideScalar(sameCount).sub(a.pos).normalize().multiplyScalar(maxSpeed * 0.75);
          steer.add(align.sub(a.vel).multiplyScalar(0.8 * sp.schooling));
          steer.add(cohere.multiplyScalar(0.65 * sp.schooling));
        }

        // Gentle wander target inside preferred swim zone
        a.wanderTimer -= dt;
        if (a.wanderTimer <= 0 || a.pos.distanceTo(a.wanderTarget) < 0.45) {
          a.wanderTimer = 2.4 + Math.random() * 3.5;
          a.wanderTarget.set(
            (Math.random() - 0.5) * halfW * 1.75,
            zoneMinY + Math.random() * Math.max(0.15, zoneMaxY - zoneMinY),
            (Math.random() - 0.5) * halfD * 1.6
          );
        }
        const toWander = a.wanderTarget.clone().sub(a.pos).normalize().multiplyScalar(maxSpeed * 0.85);
        steer.add(toWander.sub(a.vel).multiplyScalar(0.9));
      }

      // 3. Soft Tank Wall & Water Surface Containment
      if (a.pos.x < -halfW) steer.x += 2.4;
      if (a.pos.x > halfW) steer.x -= 2.4;
      if (a.pos.z < -halfD) steer.z += 2.4;
      if (a.pos.z > halfD) steer.z -= 2.4;
      if (a.pos.y < zoneMinY) steer.y += 2.2;
      if (a.pos.y > zoneMaxY) steer.y -= 2.8;

      a.vel.addScaledVector(steer, dt);
      // Damp vertical velocity so fish glide horizontally like real aquarium fish
      if (!closestPellet) {
        a.vel.y *= 0.94;
      }
      const speed = a.vel.length();
      const cap = closestPellet ? maxSpeed * 1.65 : maxSpeed;
      if (speed > cap) {
        a.vel.multiplyScalar(cap / speed);
      } else if (speed < 0.12) {
        a.vel.x += (Math.random() < 0.5 ? 1 : -1) * 0.18;
      }

      a.pos.addScaledVector(a.vel, dt);
      // Hard clamp inside glass bounds
      a.pos.x = Math.max(-halfW * 1.06, Math.min(halfW * 1.06, a.pos.x));
      a.pos.z = Math.max(-halfD * 1.06, Math.min(halfD * 1.06, a.pos.z));
      a.pos.y = Math.max(subH + 0.04, Math.min(waterTopY - 0.05, a.pos.y));

      a.mesh.position.copy(a.pos);

      // Smoothly orient fish along velocity vector (+X is head in mesh local space)
      const horizSpeed = Math.hypot(a.vel.x, a.vel.z);
      if (horizSpeed > 0.02) {
        const targetYaw = Math.atan2(-a.vel.z, a.vel.x);
        // Shortest-angle yaw interpolation
        let diff = targetYaw - a.mesh.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        a.mesh.rotation.y += diff * Math.min(1, dt * 6.5);
      }
      const targetPitch = Math.max(-0.42, Math.min(0.42, a.vel.y * 0.65));
      a.mesh.rotation.z += (targetPitch - a.mesh.rotation.z) * Math.min(1, dt * 6);

      // Sinusoidal tail propulsion & body sway
      const tailPivot = a.mesh.userData.tailPivot;
      const bodyGroup = a.mesh.userData.bodyGroup;
      const swimFreq = 6.5 + speed * 12;
      const wave = Math.sin(time * swimFreq + a.mesh.userData.swimPhase);
      if (tailPivot) {
        tailPivot.rotation.y = wave * (0.28 + speed * 0.25);
      }
      if (bodyGroup) {
        bodyGroup.rotation.y = -wave * 0.06;
      }
    }
  }
}
