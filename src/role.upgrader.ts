import creepService from "./creep.service";
import { CreepRole } from "./role.interface";

const roleUpgrader: CreepRole = {
  creepsPerRoom: 3,
  namePrefix: "Upgrader",
  memoryKey: "upgrader",
  bodyParts: [WORK, CARRY, MOVE],

  run(creep: Creep): void {
    if (creep.spawning) {
      return;
    }
    if (creep.memory.upgrading && creep.store[RESOURCE_ENERGY] === 0) {
      creep.memory.upgrading = false;
      creep.memory.path = undefined;
      creep.say("🔄 harvest");
    }
    if (!creep.memory.upgrading && creep.store.getFreeCapacity() === 0) {
      creep.memory.upgrading = true;
      creep.memory.path = undefined;
      creep.say("⚡ upgrade");
    }

    if (creep.memory.upgrading) {
      this.upgradeControllerJob(creep);
    } else {
      this.harvestEnergy(creep);
    }
  },

  harvestEnergy(creep: Creep): void {
    if (!creep.memory.path) {
      creepService.getPathToSource(creep);
    } else {
      this.moveAndHarvest(creep);
    }
  },

  upgradeControllerJob(creep: Creep): void {
    if (!creep.memory.path) {
      this.getPathToController(creep);
    } else {
      this.moveAndUpgrade(creep);
    }
  },

  getPathToSource(creep: Creep): void {
    creep.say("Searching");
    const sources = creep.room.find(FIND_SOURCES);

    for (const source of sources) {
      const path = PathFinder.search(
        creep.pos,
        { pos: source.pos, range: 1 },
        {
          roomCallback: (roomName: string) => {
            const room = Game.rooms[roomName];
            if (!room) return false;
            const costs = new PathFinder.CostMatrix();
            room.find(FIND_CREEPS).forEach(function (creep) {
              costs.set(creep.pos.x, creep.pos.y, 0xff);
            });
            return costs;
          },
        }
      );

      if (!path.incomplete) {
        creep.memory.path = creep.pos.findPathTo(source) as PathStep[];
        creep.memory.targetId = source.id;
        break;
      }
    }
  },

  getPathToController(creep: Creep): void {
    creep.say("Searching");
    creep.memory.path = creep.pos.findPathTo(
      creep.room.controller as StructureController
    ) as PathStep[];
  },

  moveAndHarvest(creep: Creep): void {
    const objectToCheck = Game.getObjectById(
      creep.memory.targetId as Id<StructureContainer>
    );

    if (objectToCheck && objectToCheck.structureType === STRUCTURE_CONTAINER) {
      creepService.moveAndCollectFromContainer(creep, objectToCheck);
    } else {
      const source = Game.getObjectById(creep.memory.targetId as Id<Source>);

      if (source && creep.harvest(source) === ERR_NOT_IN_RANGE) {
        creepService.drawPath(creep);
        const moveResult = creep.moveByPath(creep.memory.path as PathStep[]);
        if (
          moveResult === ERR_NOT_FOUND ||
          (moveResult !== OK && moveResult !== ERR_TIRED)
        ) {
          creepService.getPathToSource(creep);
        }
      }
    }
  },

  moveAndUpgrade(creep: Creep): void {
    const action = creep.upgradeController(
      creep.room.controller as StructureController
    );

    if (action === ERR_NOT_IN_RANGE) {
      const moveResult = creep.moveByPath(creep.memory.path as PathStep[]);
      creepService.drawPath(creep);

      if (moveResult !== OK && moveResult !== ERR_TIRED) {
        this.getPathToController(creep);
      }
    }
  },
};

export default roleUpgrader;
