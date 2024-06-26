import _ from "lodash";
import creepService from "./creep.service";
import { CreepRole } from "./role.interface";

const roleMiner: CreepRole = {
  creepsPerRoom: 99,
  namePrefix: "Miner",
  memoryKey: "miner",
  bodyParts: [WORK, WORK, WORK, WORK],
  baseBodyParts: [MOVE, CARRY],

  run(creep: Creep): void {
    if (creep.spawning) {
      return;
    }

    if (!creep.memory.working) {
      if (!creep.memory.targetPos || !creep.memory.path) {
        this.findContainerAndSource(creep);
      } else {
        creepService.drawPath(creep);
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
  },

  /**
   * Searches for a container with a miner near it, if the container has a free space, adds the path and id to the creep's memory.
   * @param creep
   */
  findContainerAndSource: function (creep: Creep): void {
    const containers = creep.room.find(FIND_STRUCTURES, {
      filter: (structure) => structure.structureType === STRUCTURE_CONTAINER,
    }) as StructureContainer[];

    for (const container of containers) {
      const miners = container.pos
        .findInRange(FIND_MY_CREEPS, 1)
        .filter((c) => c.memory.role === "miner");

      if (miners.length === 0) {
        const sources = container.pos.findInRange(FIND_SOURCES, 2);
        const pathToSource = container.pos.findPathTo(
          sources[sources.length - 1]
        );
        const pos = this.findPositionBetween(container.pos, sources[0].pos);
        const creepsHeadingTo = _.filter(
          Object.values(Game.creeps),
          (c: Creep) => c.memory.targetPos === pos && c.memory.role === "miner"
        );

        if (creepsHeadingTo.length === 0) {
          creep.memory.targetPos = pos;
          creep.memory.targetContainerId = container.id;
          creep.memory.targetSourceId = sources[sources.length - 1].id;
          creep.memory.path = creep.pos.findPathTo(pos);
          return;
        }
      }
    }
  },

  findPositionBetween: function (
    containerPos: RoomPosition,
    sourcePos: RoomPosition
  ): RoomPosition | null {
    const terrain = Game.map.getRoomTerrain(containerPos.roomName);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const x = containerPos.x + dx;
        const y = containerPos.y + dy;

        if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
          const pos = new RoomPosition(x, y, containerPos.roomName);
          if (pos.getRangeTo(sourcePos) <= 1) {
            return pos;
          }
        }
      }
    }

    return null;
  },
};

export default roleMiner;
