// Fish Tankfully (缸好有鱼) — Realistic Aquarium Ecosystem & Economy Simulator
import { FISH_CATALOG, ITEM_CATALOG, TANK_PRESETS, getFishSpecies, getCatalogItem } from "./catalog.js";

const STORAGE_KEY = "fish_tankfully_save_v1";

let uidCounter = 1000;
export function nextUid(prefix = "id") {
  uidCounter += 1;
  return `${prefix}_${uidCounter}_${Math.floor(Math.random() * 900 + 100)}`;
}

export class EcosystemState {
  constructor() {
    this.bilingual = true; // Shows authentic Chinese + English labels
    this.money = 17324;
    this.foragingLevel = 1;
    this.foragingXp = 4;
    this.foragingXpMax = 20;
    this.stamina = 99;
    this.staminaMax = 100;
    this.activeTankId = "grand_biotope";
    this.activeToolSlot = 1; // 1: Scraper, 2: Pellets, 3: Golden Food, 4: Methylene Blue

    // Player consumables & unplaced decor/equipment inventory
    this.inventory = {
      algae_scraper: 2,
      sinking_pellets: 25,
      golden_food: 12,
      methylene_blue: 8,
      // Extra unplaced decor in backpack for immediate DIY experimentation:
      wood_spider: 3,
      wood_mangrove: 2,
      wood_bonsai: 2,
      wood_stump: 2,
      plant_vallisneria: 4,
      plant_lotus_2: 3,
      plant_lotus_3: 3,
      plant_monte_carlo: 4,
      plant_pearl_weed: 3,
      plant_cabomba: 3,
      plant_red_rotala: 4,
      rock_moss_boulder: 2,
      rock_seiryu_peak: 3,
      rock_cobbles: 4,
      ornament_mecha_head: 1,
      light_studio_led: 2,
      pump_wavemaker: 2,
      filter_sponge: 2,
      filter_canister: 1,
      co2_diffuser: 2
    };

    this.tanks = {};
    this.initDefaultTanks();
    this.load();
  }

  initDefaultTanks() {
    for (const [tankId, preset] of Object.entries(TANK_PRESETS)) {
      const decor = preset.initialDecor.map((d) => ({
        uid: nextUid("dec"),
        itemId: d.itemId,
        x: d.x,
        y: d.y || 0,
        z: d.z,
        scale: d.scale || 1.0,
        rotY: d.rotY || 0
      }));

      const fish = preset.initialFish.map((f, idx) => this.createFishInstance(f.speciesId, {
        stage: f.stage || "adult",
        isKing: Boolean(f.isKing),
        isShiny: Boolean(f.isShiny),
        source: idx % 3 === 0 ? "野采捕获 / Wild Caught" : "商店购买 / Shop",
        acquiredDate: "2026. 8. 28"
      }));

      this.tanks[tankId] = {
        id: tankId,
        nameZh: preset.nameZh,
        nameEn: preset.nameEn,
        customTitleZh: tankId === "nano_cube" ? "缸姐的灯鱼小缸" : `${preset.nameZh}·生态造景`,
        width: preset.width,
        height: preset.height,
        depth: preset.depth,
        isRoundBowl: Boolean(preset.isRoundBowl),
        maxFishCapacity: preset.maxFishCapacity,
        substrateStyle: preset.substrateStyle,
        waterLevel: 1.0, // 0.45..1.0 during water changes
        algaeLevel: tankId === "nano_cube" ? 0.38 : 0.14, // Visible algae to scrub!
        cleanliness: 0.92,
        temperature: 24.5,
        doseMethyleneTimer: 0,
        decor,
        fish
      };
    }
  }

  createFishInstance(speciesId, opts = {}) {
    const sp = getFishSpecies(speciesId);
    const stage = opts.stage || "adult";
    const isKing = opts.isKing !== undefined ? opts.isKing : Math.random() < 0.16;
    const isShiny = opts.isShiny !== undefined ? opts.isShiny : Math.random() < 0.12;
    const baseLen = stage === "fry" ? sp.fryLengthCm : sp.adultLengthCm;
    const lengthVariation = (Math.random() * 0.24 - 0.08) + (isKing ? 0.45 : 0);
    const lengthCm = Number(Math.max(0.6, baseLen + lengthVariation).toFixed(1));

    const mult = (stage === "adult" ? 1.0 : 0.55) * (isKing ? 1.5 : 1.0) * (isShiny ? 1.65 : 1.0);
    const sellPrice = Math.round(sp.sellPrice * mult);
    const incomePerHour = Number((sp.incomePerHour * mult).toFixed(2));

    return {
      uid: nextUid("fish"),
      speciesId: sp.id,
      customName: "",
      stage, // "fry" | "adult"
      growthXp: stage === "adult" ? 100 : 30,
      isKing,
      isShiny,
      lengthCm,
      sellPrice,
      incomePerHour,
      storedCoins: 0,
      maxStorage: sp.maxStorage,
      health: 98,
      hunger: 75,
      acquiredDate: opts.acquiredDate || "2026. 8. 28",
      source: opts.source || "商店购买 / Shop"
    };
  }

  get activeTank() {
    return this.tanks[this.activeTankId] || this.tanks.grand_biotope;
  }

  computeTankMetrics(tank = this.activeTank) {
    let plantCount = 0;
    let driftwoodCount = 0;
    let rockCount = 0;
    let filtration = 25; // baseline natural bio-filtration
    let o2Supply = 5.5;
    let co2Level = 12; // ppm
    let lightWatts = 12;
    let ph = 6.8;
    let comfortScore = 40;

    for (const d of tank.decor) {
      const item = getCatalogItem(d.itemId);
      if (!item) continue;
      if (item.category === "plants") plantCount += 1;
      if (item.category === "driftwood") driftwoodCount += 1;
      if (item.category === "rocks") rockCount += 1;

      const s = item.stats || {};
      if (s.filtration) filtration += s.filtration;
      if (s.o2Boost) o2Supply += s.o2Boost;
      if (s.co2Boost) co2Level += s.co2Boost;
      if (s.co2Use) co2Level = Math.max(6, co2Level - s.co2Use * 0.4);
      if (s.lightWatts) lightWatts += s.lightWatts;
      if (s.phShift) ph += s.phShift;
      if (s.comfort) comfortScore += s.comfort;
    }

    let totalBioload = 0;
    let totalHourlyIncome = 0;
    let semiAggressiveCount = 0;
    let peacefulCount = 0;

    for (const f of tank.fish) {
      const sp = getFishSpecies(f.speciesId);
      totalBioload += sp.bioload * (f.stage === "fry" ? 0.6 : 1.0);
      totalHourlyIncome += f.incomePerHour;
      if (sp.temperament === "semi-aggressive") semiAggressiveCount += 1;
      else peacefulCount += 1;
    }

    const densityRatio = tank.fish.length / Math.max(1, tank.maxFishCapacity);
    const o2Final = Number(Math.max(4.0, Math.min(11.5, o2Supply - totalBioload * 0.14)).toFixed(1));
    const co2Final = Number(Math.max(5.0, Math.min(35.0, co2Level + totalBioload * 0.25)).toFixed(1));
    const phFinal = Number(Math.max(5.6, Math.min(8.0, ph)).toFixed(1));

    // Compatibility & harmony
    let harmonyPct = 96;
    let harmonyNoteZh = "鱼群相性极佳，群游状态放松";
    let harmonyNoteEn = "Excellent species harmony & relaxed schooling";
    if (semiAggressiveCount > 0 && peacefulCount > 0 && plantCount < 3) {
      harmonyPct = 78;
      harmonyNoteZh = "虎皮鱼较活泼，建议多植水草提供躲避";
      harmonyNoteEn = "Active barbs present; extra plants help shy fish hide";
    }
    if (densityRatio > 1.0) {
      harmonyPct = Math.max(55, harmonyPct - 22);
      harmonyNoteZh = "饲养密度偏高，注意加强过滤与换水";
      harmonyNoteEn = "High stocking density; increase filtration & water changes";
    }

    const waterQualityPct = Math.round(
      Math.max(35, Math.min(100, (1 - tank.algaeLevel * 0.45) * 100 * Math.min(1.1, filtration / Math.max(20, totalBioload * 2.2))))
    );

    return {
      fishCount: tank.fish.length,
      maxFishCapacity: tank.maxFishCapacity,
      plantCount,
      driftwoodCount,
      rockCount,
      filtration: Math.round(filtration),
      o2MgL: o2Final,
      co2Ppm: co2Final,
      lightWatts,
      ph: phFinal,
      tempC: tank.temperature,
      waterQualityPct,
      algaePct: Math.round(tank.algaeLevel * 100),
      harmonyPct,
      harmonyNoteZh,
      harmonyNoteEn,
      hourlyIncome: Number(totalHourlyIncome.toFixed(1))
    };
  }

  tick(dtSeconds) {
    const tank = this.activeTank;
    const metrics = this.computeTankMetrics(tank);

    // Passive income accrual
    const moneyEarned = (metrics.hourlyIncome / 60) * dtSeconds; // Accelerated pleasant desktop idle tick
    this.money = Number((this.money + moneyEarned).toFixed(2));

    // Slow natural algae growth on glass
    const algaeRate = 0.0018 * (1 + metrics.lightWatts / 60);
    tank.algaeLevel = Math.min(0.85, tank.algaeLevel + algaeRate * dtSeconds * 0.25);

    if (tank.doseMethyleneTimer > 0) {
      tank.doseMethyleneTimer = Math.max(0, tank.doseMethyleneTimer - dtSeconds);
    }

    // Stamina gentle recovery
    if (this.stamina < this.staminaMax) {
      this.stamina = Math.min(this.staminaMax, this.stamina + dtSeconds * 0.08);
    }
  }

  scrubAlgae(amount = 0.06) {
    const tank = this.activeTank;
    const before = tank.algaeLevel;
    tank.algaeLevel = Math.max(0, tank.algaeLevel - amount);
    if (before > 0.01 && tank.algaeLevel < before) {
      this.money = Number((this.money + 1).toFixed(2));
      return true;
    }
    return false;
  }

  feedFish(foodItemId = "sinking_pellets") {
    const count = this.inventory[foodItemId] || 0;
    if (count <= 0) return { ok: false, reason: "no_stock" };
    this.inventory[foodItemId] = count - 1;

    const isGolden = foodItemId === "golden_food";
    const tank = this.activeTank;
    let grownCount = 0;
    let shinyUnlocked = 0;

    for (const f of tank.fish) {
      f.hunger = Math.min(100, f.hunger + (isGolden ? 35 : 22));
      f.health = Math.min(100, f.health + (isGolden ? 10 : 4));
      f.growthXp = Math.min(100, f.growthXp + (isGolden ? 38 : 18));

      if (f.stage === "fry" && f.growthXp >= 100) {
        f.stage = "adult";
        const sp = getFishSpecies(f.speciesId);
        f.lengthCm = sp.adultLengthCm;
        f.sellPrice = Math.round(sp.sellPrice * (f.isKing ? 1.5 : 1.0) * (f.isShiny ? 1.65 : 1.0));
        f.incomePerHour = Number((sp.incomePerHour * (f.isKing ? 1.5 : 1.0) * (f.isShiny ? 1.65 : 1.0)).toFixed(2));
        grownCount += 1;
      }

      if (isGolden && !f.isShiny && Math.random() < 0.14) {
        f.isShiny = true;
        f.sellPrice = Math.round(f.sellPrice * 1.5);
        f.incomePerHour = Number((f.incomePerHour * 1.5).toFixed(2));
        shinyUnlocked += 1;
      }
    }

    this.save();
    return { ok: true, isGolden, grownCount, shinyUnlocked };
  }

  doseMethyleneBlue() {
    const count = this.inventory.methylene_blue || 0;
    if (count <= 0) return { ok: false };
    this.inventory.methylene_blue = count - 1;
    const tank = this.activeTank;
    tank.doseMethyleneTimer = 18;
    tank.cleanliness = 1.0;
    tank.algaeLevel = Math.max(0, tank.algaeLevel - 0.15);
    for (const f of tank.fish) {
      f.health = 100;
    }
    this.save();
    return { ok: true };
  }

  buyItem(kind, id, quantity = 1, targetTankId = this.activeTankId) {
    const qty = Math.max(1, Math.floor(quantity));
    if (kind === "fish") {
      const sp = getFishSpecies(id);
      const totalCost = sp.price * qty;
      if (this.money < totalCost) return { ok: false, reason: "insufficient_funds" };
      const targetTank = this.tanks[targetTankId] || this.activeTank;
      this.money = Math.round((this.money - totalCost) * 100) / 100;
      const added = [];
      for (let i = 0; i < qty; i++) {
        const inst = this.createFishInstance(sp.id, {
          stage: Math.random() < 0.35 ? "fry" : "adult",
          source: "商店购买 / Shop"
        });
        targetTank.fish.push(inst);
        added.push(inst);
      }
      this.save();
      return { ok: true, added, totalCost };
    } else {
      const item = getCatalogItem(id);
      const totalCost = item.price * qty;
      if (this.money < totalCost) return { ok: false, reason: "insufficient_funds" };
      this.money = Math.round((this.money - totalCost) * 100) / 100;
      this.inventory[item.id] = (this.inventory[item.id] || 0) + qty;
      this.save();
      return { ok: true, item, qty, totalCost };
    }
  }

  sellFish(fishUid, tankId = this.activeTankId) {
    const tank = this.tanks[tankId] || this.activeTank;
    const idx = tank.fish.findIndex((f) => f.uid === fishUid);
    if (idx === -1) return null;
    const [removed] = tank.fish.splice(idx, 1);
    this.money = Math.round((this.money + removed.sellPrice) * 100) / 100;
    this.save();
    return removed;
  }

  save() {
    try {
      const payload = {
        money: Math.floor(this.money),
        foragingLevel: this.foragingLevel,
        foragingXp: this.foragingXp,
        stamina: Math.floor(this.stamina),
        activeTankId: this.activeTankId,
        inventory: this.inventory,
        tanks: this.tanks
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors in private mode
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (typeof data.money === "number") this.money = data.money;
      if (typeof data.foragingLevel === "number") this.foragingLevel = data.foragingLevel;
      if (typeof data.foragingXp === "number") this.foragingXp = data.foragingXp;
      if (data.activeTankId && this.tanks[data.activeTankId]) this.activeTankId = data.activeTankId;
      if (data.inventory) {
        this.inventory = { ...this.inventory, ...data.inventory };
      }
      if (data.tanks) {
        for (const [k, v] of Object.entries(data.tanks)) {
          if (this.tanks[k] && Array.isArray(v.fish) && Array.isArray(v.decor)) {
            this.tanks[k] = { ...this.tanks[k], ...v };
          }
        }
      }
    } catch {
      // Ignore corrupt save
    }
  }

  resetToDefaults() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    this.money = 17324;
    this.activeTankId = "grand_biotope";
    this.initDefaultTanks();
  }
}
