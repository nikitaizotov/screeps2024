const creepService = require("creep.service");

var roleHarvester = {
  creepsPerRoom: 7,
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
      creep.memory.targetId = null;
      creep.say("🔄 harvest");
    }
    if (!creep.memory.transferring && creep.store.getFreeCapacity() == 0) {
      creep.memory.transferring = true;
      creep.memory.path = null;
      creep.memory.targetId = null;
      creep.say("⚡ transfer");
    }

    if (creep.memory.transferring) {
      this.transferEnergy(creep);
    } else {
      this.harvestEnergy(creep);
    }
  },

  transferEnergy: function (creep) {
    if (!creep.memory.path || !creep.memory.targetId) {
      let targets = creep.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            (structure.structureType === STRUCTURE_SPAWN ||
              structure.structureType === STRUCTURE_EXTENSION ||
              structure.structureType === STRUCTURE_TOWER) &&
            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0 &&
            !this.isAnotherCreepHeadingTo(structure.id, creep.room.name)
          );
        },
      });

      if (targets.length === 0) {
        targets = creep.room.find(FIND_STRUCTURES, {
          filter: (structure) => {
            return (
              structure.structureType === STRUCTURE_SPAWN ||
              structure.structureType === STRUCTURE_EXTENSION ||
              (structure.structureType === STRUCTURE_TOWER &&
                structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
            );
          },
        });
      }

      if (targets.length) {
        creepService.getPathTotargets(creep, targets);
      } else {
        this.switchToNextTask(creep); // Switch to the next task if no energy consumers found
      }
    } else {
      this.moveAndTransfer(creep);
    }
  },

  harvestEnergy: function (creep) {
    if (!creep.memory.path || !creep.memory.targetId) {
      creepService.getPathToSource(creep);
    } else {
      creepService.moveAndHarvest(creep);
    }
  },

  moveAndTransfer: function (creep) {
    creepService.drawPath(creep);
    const target = Game.getObjectById(creep.memory.targetId);

    if (!target) {
      creep.memory.path = null;
      creep.memory.targetId = null;
      this.switchToNextTask(creep); // Switch to the next task if the target is invalid
      return;
    }

    let action;

    if (target.store && target.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
      action = creep.transfer(target, RESOURCE_ENERGY);
    } else if (target.structureType === STRUCTURE_CONTROLLER) {
      action = creep.upgradeController(target);
    } else {
      action = creep.build(target);
    }

    if (action === ERR_NOT_IN_RANGE) {
      const moveResult = creep.moveByPath(creep.memory.path);
      if (moveResult !== OK && moveResult !== ERR_TIRED) {
        console.log("Move by path failed, error:", moveResult);
        creep.memory.path = null;
        creep.memory.targetId = null;
        this.switchToNextTask(creep); // Switch to the next task if movement fails
      }
    } else if (
      action === ERR_FULL ||
      action === ERR_INVALID_TARGET ||
      action === ERR_NO_BODYPART
    ) {
      creep.memory.path = null;
      creep.memory.targetId = null;
      this.switchToNextTask(creep); // Switch to the next task if the action is not successful
    }
    creep.say(action);
  },

  switchToNextTask: function (creep) {
    const constructionSites = creep.room.find(FIND_CONSTRUCTION_SITES);

    if (constructionSites.length > 0) {
      creepService.getPathTotargets(creep, constructionSites);
    } else {
      const controller = creep.room.controller;
      if (controller) {
        creep.memory.path = creep.pos.findPathTo(controller);
        creep.memory.targetId = controller.id;
      }
    }
  },

  isAnotherCreepHeadingTo: function (targetId, roomName) {
    return _.some(Game.creeps, (otherCreep) => {
      return (
        otherCreep.memory.targetId === targetId &&
        otherCreep.room.name === roomName &&
        otherCreep.memory.transferring
      );
    });
  },
};

module.exports = roleHarvester;
