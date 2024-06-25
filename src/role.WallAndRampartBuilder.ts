import creepService from "./creep.service";
import { CreepRole } from "./role.interface";

const roleWallAndRampBuilder: CreepRole = {
  creepsPerRoom: 1,
  namePrefix: "WallRampBuilder",
  memoryKey: "wallRampBuilder",
  bodyParts: [WORK, CARRY, MOVE],

  run(creep: Creep): void {
    if (creep.spawning) {
      return;
    }
    if (
      (creep.memory.repairing || creep.memory.repairing === undefined) &&
      creep.store[RESOURCE_ENERGY] === 0
    ) {
      creep.memory.repairing = false;
      creep.memory.path = undefined;
      creep.memory.targetId = null;
      creep.say("🔄 harvest");
    }
    if (!creep.memory.repairing && creep.store.getFreeCapacity() === 0) {
      creep.memory.repairing = true;
      creep.memory.path = undefined;
      creep.memory.targetId = null;
      creep.say("🚧 repair");
    }

    if (creep.memory.repairing) {
      this.repairWallsAndRamparts(creep);
    } else {
      this.harvestEnergy(creep);
    }
  },

  harvestEnergy(creep: Creep): void {
    if (!creep.memory.path) {
      creepService.getPathToSource(creep);
    } else {
      creepService.moveAndHarvest(creep);
    }
  },

  repairWallsAndRamparts(creep: Creep): void {
    if (!creep.memory.path) {
      const targets = creep.room.find(FIND_STRUCTURES, {
        filter: (structure: AnyStructure) => {
          return (
            (structure.structureType === STRUCTURE_WALL ||
              structure.structureType === STRUCTURE_RAMPART) &&
            structure.hits < structure.hitsMax
          );
        },
      });

      if (targets.length > 0) {
        targets.sort(
          (a, b) =>
            a.hits - b.hits || creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b)
        );
        creepService.getPathTotargets(creep, [targets[0]]);
      } else {
        console.log("No targets for repair found");
      }
    } else {
      this.moveAndRepair(creep);
    }
  },

  moveAndRepair(creep: Creep): void {
    creepService.drawPath(creep);
    const target = Game.getObjectById(
      creep.memory.targetId as Id<AnyStructure>
    );

    if (!target) {
      creep.memory.path = undefined;
      creep.memory.targetId = null;
      return;
    }

    if (target.hitsMax > target.hits) {
      const action = creep.repair(target);

      if (action === ERR_NOT_IN_RANGE) {
        const moveResult = creep.moveByPath(creep.memory.path as PathStep[]);
        if (moveResult !== OK && moveResult !== ERR_TIRED) {
          creep.memory.path = undefined;
          creep.memory.targetId = null;
        }
      } else if (action === ERR_INVALID_TARGET || action === ERR_NO_BODYPART) {
        creep.memory.path = undefined;
        creep.memory.targetId = null;
      }
    } else {
      creep.memory.path = undefined;
      creep.memory.targetId = null;
    }
  },
};

export default roleWallAndRampBuilder;
