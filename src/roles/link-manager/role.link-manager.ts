import { CreepRole } from "../role.interface";
import { CreepService } from "../../services/creep.service";

export class RoleLinkManager implements CreepRole {
  creepsPerRoom = 999;
  namePrefix = "Link_Manager";
  memoryKey = "linkManager";
  bodyParts = [CARRY];
  baseBodyParts = [MOVE, CARRY];
  maxBodyPartsMultiplier = 7;

  creepService = new CreepService();

  run(creep: Creep): void {
    // Do not disturb creep while its inside the spawn!
    if (creep.spawning) {
      return;
    }

    if (!creep.memory.working) {
      if (!creep.memory.targetPos || !creep.memory.path) {
        if (
          !creep.memory.targetStructureId &&
          !creep.memory.targetStorageId &&
          !creep.memory.targetPos
        ) {
          const storage = this.getStorage(creep);
          const linkId = this.getStorageLinkId(creep);
          const link: StructureLink = Game.getObjectById(
            linkId as string
          ) as StructureLink;

          if (link && storage) {
            const position = this.findPositionBetween(storage.pos, link.pos);
            creep.memory.targetStructureId = linkId;
            creep.memory.targetStorageId = storage.id;
            creep.memory.targetPos = position;
          }
        }
        creep.memory.path = creep.pos.findPathTo(
          creep.memory.targetPos as RoomPosition
        );
      } else {
        this.creepService.drawPath(creep);
        creep.moveByPath(creep.memory.path);
        if (
          creep.pos.x === creep.memory.targetPos.x &&
          creep.pos.y === creep.memory.targetPos.y &&
          creep.pos.roomName === creep.memory.targetPos.roomName
        ) {
          creep.memory.working = true;
        }
      }
    } else {
      if (creep.store.getFreeCapacity() > 0) {
        const target = Game.getObjectById(
          creep.memory.targetStructureId as any
        ) as StructureLink | null;

        if (target) {
          creep.withdraw(target, RESOURCE_ENERGY);
        } else {
          console.log(
            `No link with id ${creep.memory.targetStructureId} found in a room ${creep.room.name}`
          );
        }
      } else {
        const target = Game.getObjectById(
          creep.memory.targetStorageId as any
        ) as StructureStorage | null;
        creep.transfer(target as StructureStorage, RESOURCE_ENERGY);
      }
    }
  }

  getStorageLinkId(creep: Creep): string | null {
    const cache = Memory.roomData.links[creep.room.name];
    const linkIds = Object.keys(cache);
    for (let linkId of linkIds) {
      if (cache[linkId].storageLink === true) {
        return linkId;
      }
    }
    return null;
  }

  getStorage(creep: Creep): StructureStorage | null {
    const storages = creep.room.find(FIND_STRUCTURES, {
      filter: (structure) => structure.structureType === STRUCTURE_STORAGE,
    }) as StructureStorage[];

    if (storages.length) {
      return storages[0];
    }

    return null;
  }

  findPositionBetween(
    positionA: RoomPosition,
    positionB: RoomPosition
  ): RoomPosition | null {
    const terrain = Game.map.getRoomTerrain(positionA.roomName);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const x = positionA.x + dx;
        const y = positionA.y + dy;

        if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
          const pos = new RoomPosition(x, y, positionA.roomName);
          if (pos.getRangeTo(positionB) <= 1) {
            return pos;
          }
        }
      }
    }

    return null;
  }
}
