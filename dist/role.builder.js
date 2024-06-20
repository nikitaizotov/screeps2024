const creepService = require("creep.service");

var roleBuilder = {
  creepsPerRoom: 1,
  namePrefix: "Builder",
  memoryKey: "builder",
  bodyParts: [WORK, CARRY, MOVE],
  run: function (creep) {
    if (creep.spawning) {
      return;
    }
    if (
      (creep.memory.building || creep.memory.building === undefined) &&
      creep.store[RESOURCE_ENERGY] === 0
    ) {
      creep.memory.building = false;
      creep.memory.path = null;
      creep.memory.targetId = null;
      creep.say("🔄 harvest");
    }
    if (!creep.memory.building && creep.store.getFreeCapacity() == 0) {
      creep.memory.building = true;
      creep.memory.path = null;
      creep.memory.targetId = null;
      creep.say("🚧 build");
    }

    if (creep.memory.building) {
      this.transferEnergy(creep);
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
  transferEnergy: function (creep) {
    if (!creep.memory.path) {
      let targets = creep.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            structure.hits < structure.hitsMax &&
            structure.structureType !== STRUCTURE_WALL
          );
        },
      });

      if (targets.length === 0) {
        targets = creep.room.find(FIND_CONSTRUCTION_SITES);
      }

      creepService.getPathTotargets(creep, targets);
    } else {
      this.moveAndTransfer(creep);
    }
  },
  moveAndTransfer: function (creep) {
    creepService.drawPath(creep);
    const target = Game.getObjectById(creep.memory.targetId);

    if (!target) {
      creep.memory.path = null;
      creep.memory.targetId = null;
      return;
    }

    let action;

    if (target.progress === undefined) {
      if (target.hitsMax > target.hits) {
        action = creep.repair(target);
      } else {
        creep.memory.path = null;
        creep.memory.targetId = null;
      }
    } else {
      action = creep.build(target);
    }

    if (action === ERR_NOT_IN_RANGE) {
      let moveResult = creep.moveByPath(creep.memory.path);
      if (moveResult !== OK && moveResult !== ERR_TIRED) {
        console.log("Move by path failed, error:", moveResult);
        creep.memory.path = null;
        creep.memory.targetId = null;
      }
    } else if (action === ERR_INVALID_TARGET || action === ERR_NO_BODYPART) {
      creep.memory.path = null;
      creep.memory.targetId = null;
    }
  },
};

module.exports = roleBuilder;
