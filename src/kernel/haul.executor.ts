import { KernelTaskMemory } from "./kernel.types";

/**
 * Hauler logistics loop: collect energy (dropped > tombstone > container/
 * storage) and deliver it (spawn/extensions > towers > storage).
 *
 * Steady-state CPU: the current pickup/dropoff target id is cached on the creep
 * (kt.targetId) and resolved with Game.getObjectById (cheap). We only re-select
 * a target when the cached one is gone or no longer valid (empty pickup / full
 * dropoff) or when the collect/deliver mode flips. Selection uses
 * findClosestByRange (no pathfinding); movement uses moveTo with a reused path.
 */
export function runHaul(creep: Creep, kt: KernelTaskMemory): void {
  if (creep.spawning) return;

  // Toggle mode; a flip invalidates the cached target for the new mode.
  if (kt.deliver && creep.store[RESOURCE_ENERGY] === 0) {
    kt.deliver = false;
    kt.targetId = undefined;
  }
  if (!kt.deliver && creep.store.getFreeCapacity() === 0) {
    kt.deliver = true;
    kt.targetId = undefined;
  }

  if (kt.deliver) deliver(creep, kt);
  else collect(creep, kt);
}

function collect(creep: Creep, kt: KernelTaskMemory): void {
  let target: any = resolve(kt.targetId);
  if (!hasEnergy(target)) {
    target = selectPickup(creep);
    kt.targetId = target ? target.id : undefined;
  }
  if (!target) return;

  const code =
    target instanceof Resource
      ? creep.pickup(target)
      : creep.withdraw(target, RESOURCE_ENERGY);
  if (code === ERR_NOT_IN_RANGE) move(creep, target, 1);
  else if (code !== OK) kt.targetId = undefined; // re-select next tick
}

function deliver(creep: Creep, kt: KernelTaskMemory): void {
  let target: any = resolve(kt.targetId);
  if (!needsEnergy(target)) {
    target = selectDropoff(creep);
    kt.targetId = target ? target.id : undefined;
  }
  if (!target) return;

  const code = creep.transfer(target, RESOURCE_ENERGY);
  if (code === ERR_NOT_IN_RANGE) move(creep, target, 1);
  else if (code !== OK) kt.targetId = undefined;
}

function resolve(id?: string): any {
  return id ? Game.getObjectById(id as Id<any>) : null;
}

function hasEnergy(o: any): boolean {
  if (!o) return false;
  if (o.amount !== undefined) return o.amount > 0; // dropped resource
  if (o.store) return o.store[RESOURCE_ENERGY] > 0; // tomb/container/storage
  return false;
}

function needsEnergy(o: any): boolean {
  return !!o && o.store && o.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
}

function selectPickup(creep: Creep): any {
  const dropped = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
    filter: (r) => r.resourceType === RESOURCE_ENERGY && r.amount >= 50,
  });
  if (dropped) return dropped;

  const tomb = creep.pos.findClosestByRange(FIND_TOMBSTONES, {
    filter: (t) => t.store[RESOURCE_ENERGY] > 0,
  });
  if (tomb) return tomb;

  return creep.pos.findClosestByRange(FIND_STRUCTURES, {
    filter: (s) =>
      (s.structureType === STRUCTURE_CONTAINER ||
        s.structureType === STRUCTURE_STORAGE) &&
      (s as StructureContainer | StructureStorage).store[RESOURCE_ENERGY] > 0,
  });
}

function selectDropoff(creep: Creep): AnyStoreStructure | null {
  let t = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
    filter: (s) =>
      (s.structureType === STRUCTURE_SPAWN ||
        s.structureType === STRUCTURE_EXTENSION) &&
      (s as StructureSpawn | StructureExtension).store.getFreeCapacity(
        RESOURCE_ENERGY
      ) > 0,
  });

  if (!t) {
    t = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
      filter: (s) =>
        s.structureType === STRUCTURE_TOWER &&
        (s as StructureTower).store.getFreeCapacity(RESOURCE_ENERGY) > 200,
    });
  }

  if (!t) {
    const storage = creep.room.storage;
    if (storage && storage.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
      return storage;
    }
  }

  return (t as AnyStoreStructure) || null;
}

function move(creep: Creep, target: RoomObject, range: number): void {
  creep.moveTo(target as any, { reusePath: 12, range, serializeMemory: true });
}
