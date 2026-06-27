import { KernelTaskMemory } from "./kernel.types";

/**
 * Hauler logistics loop: collect energy (dropped > tombstone > container/
 * storage) and deliver it (spawn/extensions > towers > storage). A hauler
 * toggles between collecting and delivering based on whether it is empty/full.
 *
 * Phase 1 uses live finds + moveTo for a handful of haulers; Phase 2+ will
 * route target selection through the cached WorldModel/CacheService.
 */
export function runHaul(creep: Creep, kt: KernelTaskMemory): void {
  if (creep.spawning) return;

  if (kt.deliver && creep.store[RESOURCE_ENERGY] === 0) kt.deliver = false;
  if (!kt.deliver && creep.store.getFreeCapacity() === 0) kt.deliver = true;

  if (kt.deliver) deliver(creep);
  else collect(creep);
}

function collect(creep: Creep): void {
  const dropped = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
    filter: (r) => r.resourceType === RESOURCE_ENERGY && r.amount >= 50,
  });
  if (dropped) {
    if (creep.pickup(dropped) === ERR_NOT_IN_RANGE) move(creep, dropped);
    return;
  }

  const tomb = creep.pos.findClosestByPath(FIND_TOMBSTONES, {
    filter: (t) => t.store[RESOURCE_ENERGY] > 0,
  });
  if (tomb) {
    if (creep.withdraw(tomb, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
      move(creep, tomb);
    }
    return;
  }

  const store = creep.pos.findClosestByPath(FIND_STRUCTURES, {
    filter: (s) =>
      (s.structureType === STRUCTURE_CONTAINER ||
        s.structureType === STRUCTURE_STORAGE) &&
      (s as StructureContainer | StructureStorage).store[RESOURCE_ENERGY] > 0,
  }) as StructureContainer | StructureStorage | null;
  if (store) {
    if (creep.withdraw(store, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
      move(creep, store);
    }
  }
  // Nothing to collect this tick — stay put rather than wander (saves CPU).
}

function deliver(creep: Creep): void {
  let target: AnyStoreStructure | null = creep.pos.findClosestByPath(
    FIND_MY_STRUCTURES,
    {
      filter: (s) =>
        (s.structureType === STRUCTURE_SPAWN ||
          s.structureType === STRUCTURE_EXTENSION) &&
        (s as StructureSpawn | StructureExtension).store.getFreeCapacity(
          RESOURCE_ENERGY
        ) > 0,
    }
  ) as AnyStoreStructure | null;

  if (!target) {
    target = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
      filter: (s) =>
        s.structureType === STRUCTURE_TOWER &&
        (s as StructureTower).store.getFreeCapacity(RESOURCE_ENERGY) > 200,
    }) as AnyStoreStructure | null;
  }

  if (!target) {
    const storage = creep.room.storage;
    if (storage && storage.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
      target = storage;
    }
  }

  if (target) {
    if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
      move(creep, target);
    }
  }
}

function move(creep: Creep, target: { pos: RoomPosition }): void {
  creep.moveTo(target, { reusePath: 10, range: 1 });
}
