const creepService = require("creep.service");

var roleHarvester = {
  creepsPerRoom: 5,
  namePrefix: "Harvester",
  memoryKey: "harvester",
  bodyParts: [WORK, CARRY, MOVE],

  run: function (creep) {
    if (creep.spawning) {
      return;
    }

    if (
      (creep.memory.transferring || creep.memory.transferring === undefined) &&
      creep.store[RESOURCE_ENERGY] == 0
    ) {
      creep.memory.transferring = false;
      creep.memory.path = null;
      creep.say("🔄 harvest");
    }
    if (!creep.memory.transferring && creep.store.getFreeCapacity() == 0) {
      creep.memory.transferring = true;
      creep.memory.path = null;
      creep.say("⚡ transfer");
    }

    if (creep.memory.transferring) {
      this.transferEnergy(creep);
    } else {
      this.harvestEnergy(creep);
    }
  },

  transferEnergy: function (creep) {
    if (!creep.memory.path) {
      let targets = creep.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            (structure.structureType === STRUCTURE_EXTENSION ||
              structure.structureType === STRUCTURE_SPAWN ||
              structure.structureType === STRUCTURE_TOWER) &&
            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
          );
        },
      });

      if (targets.length) {
        creepService.getPathTotargets(creep, targets);
      } else {
        targets = creep.room.find(FIND_CONSTRUCTION_SITES);
        creepService.getPathTotargets(creep, targets);
      }
    } else {
      this.moveAndTransfer(creep);
    }
  },

  harvestEnergy: function (creep) {
    if (!creep.memory.path) {
      creepService.getPathToSource(creep);
    } else {
      creepService.moveAndHarvest(creep);
    }
  },

  moveAndTransfer: function (creep) {
    creepService.drawPath(creep);
    const target = Game.getObjectById(creep.memory.targetId);

    if (!target) {
      return;
    }

    let action;

    if (!target.progress && target.progress === undefined) {
      action = creep.transfer(target, RESOURCE_ENERGY);
    } else {
      action = creep.build(target);
    }

    if (action === ERR_NOT_IN_RANGE) {
      const moveResult = creep.moveByPath(creep.memory.path);
      if (moveResult !== OK && moveResult !== ERR_TIRED) {
        console.log("Move by path failed, error:", moveResult);
      }
    } else if (action === ERR_INVALID_TARGET || action === ERR_NO_BODYPART) {
      creep.memory.path = null;
      creep.memory.targetId = null;
    }
  },
};

module.exports = roleHarvester;
