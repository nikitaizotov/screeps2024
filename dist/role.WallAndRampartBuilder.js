const creepService = require("creep.service");

var roleWallAndRampBuilder = {
  creepsPerRoom: 1,
  namePrefix: "WallRampBuilder",
  memoryKey: "wallRampBuilder",
  bodyParts: [WORK, CARRY, MOVE],
  run: function (creep) {
    if (creep.spawning) {
      return;
    }
    if (
      (creep.memory.repairing || creep.memory.repairing === undefined) &&
      creep.store[RESOURCE_ENERGY] === 0
    ) {
      creep.memory.repairing = false;
      creep.memory.path = null;
      creep.memory.targetId = null;
      creep.say("🔄 harvest");
    }
    if (!creep.memory.repairing && creep.store.getFreeCapacity() == 0) {
      creep.memory.repairing = true;
      creep.memory.path = null;
      creep.memory.targetId = null;
      creep.say("🚧 repair");
    }

    if (creep.memory.repairing) {
      this.repairWallsAndRamparts(creep);
    } else {
      this.harvestEnergy(creep);
    }
  },
  harvestEnergy: function (creep) {
    if (!creep.memory.path) {
      creepService.getPathToSource(creep);
    } else {
      creepService.moveAndHarvest(creep);
    }
  },
  repairWallsAndRamparts: function (creep) {
    if (!creep.memory.path) {
      let targets = creep.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
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
        console.log("Found targets for repair:", targets);
        creepService.getPathTotargets(creep, [targets[0]]);
      } else {
        console.log("No targets for repair found");
      }
    } else {
      this.moveAndRepair(creep);
    }
  },
  moveAndRepair: function (creep) {
    creepService.drawPath(creep);
    const target = Game.getObjectById(creep.memory.targetId);

    if (!target) {
      creep.memory.path = null;
      creep.memory.targetId = null;
      return;
    }

    if (target.hitsMax > target.hits) {
      let action = creep.repair(target);

      if (action === ERR_NOT_IN_RANGE) {
        let moveResult = creep.moveByPath(creep.memory.path);
        if (moveResult !== OK && moveResult !== ERR_TIRED) {
          creep.memory.path = null;
          creep.memory.targetId = null;
        }
      } else if (action === ERR_INVALID_TARGET || action === ERR_NO_BODYPART) {
        creep.memory.path = null;
        creep.memory.targetId = null;
      }
    } else {
      creep.memory.path = null;
      creep.memory.targetId = null;
    }
  },
};

module.exports = roleWallAndRampBuilder;
