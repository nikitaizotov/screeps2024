import creepService from "./creep.service";
import { CreepRole } from "./role.interface";

const roleMiner: CreepRole = {
  creepsPerRoom: 99,
  namePrefix: "Miner",
  memoryKey: "miner",
  bodyParts: [WORK, WORK, WORK, WORK, CARRY, MOVE],

  run(creep: Creep): void {
    if (creep.spawning) {
      return;
    }

    if (!creep.memory.targetContainer || !creep.memory.targetSource) {
      this.findContainer(creep);
    }

    if (creep.memory.targetContainer && creep.memory.targetSource) {
      const targetContainer = Game.getObjectById(
        creep.memory.targetContainer
      ) as StructureContainer | null;
      const targetSource = Game.getObjectById(
        creep.memory.targetSource
      ) as Source | null;

      if (targetContainer && targetSource) {
        const positionBetween = this.getPositionBetween(
          targetSource.pos,
          targetContainer.pos
        );

        if (positionBetween && !creep.pos.isEqualTo(positionBetween)) {
          creep.moveTo(positionBetween);
        } else {
          if (creep.store.getFreeCapacity() > 0) {
            creep.harvest(targetSource);
          } else {
            creep.transfer(targetContainer, RESOURCE_ENERGY);
          }
        }
      } else {
        creep.memory.targetContainer = null;
        creep.memory.targetSource = null;
      }
    } else {
      console.log(`${creep.name} has no target container or source`);
    }
  },

  findContainer(creep: Creep): void {
    const containers = creep.room.find(FIND_STRUCTURES, {
      filter: (structure) => structure.structureType === STRUCTURE_CONTAINER,
    }) as StructureContainer[];

    console.log(`${creep.name} found ${containers.length} containers in room`);

    for (let container of containers) {
      const creeps = container.pos
        .findInRange(FIND_MY_CREEPS, 1)
        .filter((c) => c.memory.role === "miner");

      console.log(
        `${creep.name} checking container ${container.id}, miners nearby: ${creeps.length}`
      );

      if (creeps.length === 0) {
        const source = container.pos.findInRange(FIND_SOURCES, 1)[0];
        if (source) {
          creep.memory.targetContainer = container.id;
          creep.memory.targetSourceId = source.id;
          console.log(
            `${creep.name} selected target container: ${container.id}`
          );
          break;
        }
      }
    }
  },

  getPositionBetween(
    pos1: RoomPosition,
    pos2: RoomPosition
  ): RoomPosition | null {
    const x = (pos1.x + pos2.x) / 2;
    const y = (pos1.y + pos2.y) / 2;
    const roomName = pos1.roomName;

    const terrain = Game.map.getRoomTerrain(roomName);

    const positions = [
      new RoomPosition(Math.floor(x), Math.floor(y), roomName),
      new RoomPosition(Math.ceil(x), Math.ceil(y), roomName),
      new RoomPosition(Math.floor(x), Math.ceil(y), roomName),
      new RoomPosition(Math.ceil(x), Math.floor(y), roomName),
    ];

    for (const pos of positions) {
      if (terrain.get(pos.x, pos.y) !== TERRAIN_MASK_WALL) {
        return pos;
      }
    }

    return null;
  },
};

export default roleMiner;
