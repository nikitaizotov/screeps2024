import _ from "lodash";
import { CreepRole } from "./role.interface";
import { CreepService } from "../services/creep.service";
import { RoleLinkManager } from "./link-manager/role.link-manager";

export class RoleMiner implements CreepRole {
  creepsPerRoom = 99;
  namePrefix = "Miner";
  memoryKey = "miner";
  bodyParts = [WORK];
  baseBodyParts = [WORK, MOVE, CARRY];
  maxBodyPartsMultiplier = 12;
  creepService = new CreepService();
  roleLinkManager = new RoleLinkManager();

  run(creep: Creep): void {
    if (creep.spawning) {
      return;
    }

    if (creep.memory.focusOnLink === undefined || !creep.memory.focusOnLink) {
      const isStoragesLinked = this.roleLinkManager.getStorageLinkId(
        creep.room
      );
      if (isStoragesLinked) {
        creep.memory.focusOnLink = true;
        creep.memory.working = false;
        creep.memory.targetPos = undefined;
        creep.memory.path = undefined;
      }
    }

    if (!creep.memory.working) {
      if (!creep.memory.targetPos || !creep.memory.path) {
        this.findContainerAndSource(creep);
      } else {
        // this.creepService.drawPath(creep);
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
        const targetSource = Game.getObjectById(
          creep.memory.targetSourceId as any
        ) as Source | null;
        creep.harvest(targetSource as Source);
      } else {
        const targetContainer = Game.getObjectById(
          creep.memory.targetContainerId as any
        ) as StructureContainer | null;
        creep.transfer(targetContainer as StructureContainer, RESOURCE_ENERGY);
      }
    }
  }

  /**
   * Searches for a container with a miner near it, if the container has a free space, adds the path and id to the creep's memory.
   * @param creep
   */
  findContainerAndSource(creep: Creep): void {
    const targets = creep.memory.focusOnLink
      ? (creep.room.find(FIND_STRUCTURES, {
          filter: (structure) => structure.structureType === STRUCTURE_LINK,
        }) as any[])
      : (creep.room.find(FIND_STRUCTURES, {
          filter: (structure) =>
            structure.structureType === STRUCTURE_CONTAINER,
        }) as any[]);

    for (let target of targets) {
      const miners = target.pos
        .findInRange(FIND_MY_CREEPS, 1)
        .filter((c: Creep) => c.memory.role === "miner" && c?.id !== creep?.id);

      if (miners.length === 0) {
        const sources = target.pos.findInRange(FIND_SOURCES, 2);
        const pos = this.findPositionBetween(target.pos);
        const creepsHeadingTo = _.filter(
          Object.values(Game.creeps),
          (c: Creep) =>
            c.memory.targetPos === pos &&
            c.memory.role === "miner" &&
            c.id !== creep.id
        );

        if (
          creepsHeadingTo.length === 0 &&
          sources[sources.length - 1]?.id &&
          target?.id
        ) {
          creep.memory.targetPos = pos;
          creep.memory.targetContainerId = target?.id;
          creep.memory.targetSourceId = sources[sources.length - 1]?.id;
          creep.memory.path = creep.pos.findPathTo(pos as any);
          return;
        }
      }
    }
  }

  findPositionBetween(posA: RoomPosition): RoomPosition | null {
    const room = Game.rooms[posA.roomName];

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const pos = new RoomPosition(posA.x + dx, posA.y + dy, posA.roomName);

        const resourcesInRange = pos.findInRange(FIND_SOURCES, 1);

        if (resourcesInRange.length > 0) {
          return pos;
        }
      }
    }

    return null;
  }
}
