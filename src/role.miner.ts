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

    if (!creep.memory.targetContainer) {
      this.findContainer(creep);
    }

    if (creep.memory.targetContainer) {
      const targetContainer = Game.getObjectById(
        creep.memory.targetContainer
      ) as StructureContainer | null;

      if (targetContainer) {
        if (!creep.memory.targetSource) {
          const source = this.getClosestSource(targetContainer.pos);
          if (source) {
            creep.memory.targetSource = source.id;
          }
        }

        if (creep.memory.targetSource) {
          const source = Game.getObjectById(
            creep.memory.targetSource
          ) as Source | null;
          if (source) {
            if (!creep.pos.inRangeTo(targetContainer.pos, 1)) {
              if (
                !creep.memory.path ||
                creep.memory.targetId !== targetContainer.id
              ) {
                creep.memory.path = creep.pos.findPathTo(targetContainer, {
                  ignoreCreeps: true,
                });
                creep.memory.targetId = targetContainer.id;
              }
              creep.moveByPath(creep.memory.path);
              creepService.drawPath(creep);
            } else if (!creep.pos.inRangeTo(source.pos, 1)) {
              if (!creep.memory.path || creep.memory.targetId !== source.id) {
                creep.memory.path = creep.pos.findPathTo(source, {
                  ignoreCreeps: true,
                });
                creep.memory.targetId = source.id;
              }
              creep.moveByPath(creep.memory.path);
              creepService.drawPath(creep);
            } else {
              if (creep.store.getFreeCapacity() > 0) {
                creep.harvest(source);
              } else {
                creep.transfer(targetContainer, RESOURCE_ENERGY);
              }
            }
          } else {
            creep.memory.targetSource = null;
          }
        }
      } else {
        creep.memory.targetContainer = null;
      }
    } else {
      console.log(`${creep.name} has no target container`);
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
        console.log(`${creep.name} selected target container: ${container.id}`);
        creep.memory.targetContainer = container.id;
        break;
      }
    }
  },

  getClosestSource(pos: RoomPosition): Source | null {
    const room = Game.rooms[pos.roomName];
    if (!room) {
      return null;
    }

    const sources = room.find(FIND_SOURCES);
    let closestSource: Source | null = null;
    let minDistance = Infinity;

    for (const source of sources) {
      const distance = pos.getRangeTo(source);
      if (distance < minDistance) {
        minDistance = distance;
        closestSource = source;
      }
    }

    return closestSource;
  },
};

export default roleMiner;
