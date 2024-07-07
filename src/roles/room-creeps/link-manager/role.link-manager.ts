import { CreepService } from "../../../services/creep.service";
import { CreepRole } from "../../role.interface";

export class RoleLinkManager implements CreepRole {
  creepsPerRoom = 999;
  namePrefix = "Link_Manager";
  memoryKey = "linkManager";
  bodyParts = [MOVE, CARRY];

  maxBodyPartsMultiplier = 1;

  creepService = new CreepService();

  run(creep: Creep): void {
    // Do not disturb creep while it's inside the spawn.
    if (creep.spawning) {
      return;
    }

    // If the creep is carrying any resource, transfer it to storage.
    if (creep.store.getUsedCapacity() > 0) {
      const storage = this.getStorage(creep);
      if (storage) {
        for (const resourceType in creep.store) {
          creep.transfer(storage, resourceType as ResourceConstant);
        }
      }
      return;
    }

    // If the creep is not working, find target positions and paths.
    if (!creep.memory.working) {
      if (!creep.memory.targetPos || !creep.memory.path) {
        // If no targets are set, find storage and link structures.
        if (
          !creep.memory.targetStructureId &&
          !creep.memory.targetStorageId &&
          !creep.memory.targetPos
        ) {
          const storage = this.getStorage(creep);
          const linkId = this.getStorageLinkId(creep.room);
          const link: StructureLink = Game.getObjectById(
            linkId as any
          ) as StructureLink;

          if (link && storage) {
            const position = this.findPositionBetween(storage.pos);
            creep.memory.targetStructureId = linkId;
            creep.memory.targetStorageId = storage.id;
            creep.memory.targetPos = position;
          }
        }
        // Find a path to the target position.
        creep.memory.path = creep.pos.findPathTo(
          creep.memory.targetPos as RoomPosition
        );
      } else {
        // Move to the target position using the stored path.
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
      // If the creep is working, either withdraw energy from the link or transfer it to storage.
      if (creep.store.getFreeCapacity() > 0) {
        const target = Game.getObjectById(
          creep.memory.targetStructureId as any
        ) as StructureLink | null;

        if (target) {
          creep.withdraw(target, RESOURCE_ENERGY);
        } else {
          console.log(
            `No link with id ${creep.memory.targetStructureId} found in room ${creep.room.name}`
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

  /**
   * Get the ID of the storage link in the room.
   * @param room The room to search in.
   * @returns The ID of the storage link, or null if not found.
   */
  getStorageLinkId(room: Room): string | null {
    const cache = Memory.roomData.links[room.name];
    const linkIds = Object.keys(cache);
    for (let linkId of linkIds) {
      if (cache[linkId].storageLink === true) {
        return linkId;
      }
    }
    return null;
  }

  /**
   * Get the storage structure in the room.
   * @param creep The creep to search with.
   * @returns The storage structure, or null if not found.
   */
  getStorage(creep: Creep): StructureStorage | null {
    const storages = creep.room.find(FIND_STRUCTURES, {
      filter: (structure) => structure.structureType === STRUCTURE_STORAGE,
    }) as StructureStorage[];

    if (storages.length) {
      return storages[0];
    }

    return null;
  }

  /**
   * Find a position between a given position and a link.
   * @param posA The given position.
   * @returns The position between the given position and a link, or null if none found.
   */
  findPositionBetween(posA: RoomPosition): RoomPosition | null {
    const room = Game.rooms[posA.roomName];

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const pos = new RoomPosition(posA.x + dx, posA.y + dy, posA.roomName);

        const structure = pos.findInRange(FIND_STRUCTURES, 1);
        const links = structure.filter(
          (structure) => structure.structureType === STRUCTURE_LINK
        );

        if (links.length > 0) {
          return pos;
        }
      }
    }

    return null;
  }
}
