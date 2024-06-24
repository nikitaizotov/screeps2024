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
    const target = Game.getObjectById(creep.memory.targetId);

    if (
      !target ||
      (target.store && target.store.getFreeCapacity(RESOURCE_ENERGY) === 0)
    ) {
      creep.memory.path = null;
      creep.memory.targetId = null;
    }

    if (!creep.memory.path || !creep.memory.targetId) {
      const targets = this.getPriorityTargets(creep.room);

      if (targets.length) {
        const newTarget = targets[0];
        creep.memory.targetId = newTarget.id;
        creep.memory.path = creep.pos.findPathTo(newTarget);
      } else {
        // Переход к следующей задаче, если не найдено потребителей энергии.
        this.switchToNextTask(creep);
      }
    } else {
      this.moveAndTransfer(creep);
    }
  },

  getPriorityTargets: function (room) {
    const targets = room.find(FIND_STRUCTURES, {
      filter: (structure) => {
        return (
          (structure.structureType === STRUCTURE_SPAWN ||
            structure.structureType === STRUCTURE_TOWER ||
            structure.structureType === STRUCTURE_EXTENSION) &&
          structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        );
      },
    });

    const spawns = targets.filter((t) => t.structureType === STRUCTURE_SPAWN);
    const towers = targets.filter((t) => t.structureType === STRUCTURE_TOWER);
    const extensions = targets.filter(
      (t) => t.structureType === STRUCTURE_EXTENSION
    );

    const sortedTargets = [...spawns, ...towers];

    extensions.forEach((extension) => {
      if (!this.isExtensionSatisfied(extension, room)) {
        sortedTargets.push(extension);
      }
    });

    return sortedTargets;
  },

  isExtensionSatisfied: function (extension, room) {
    const incomingEnergy = _.sum(
      room.find(FIND_MY_CREEPS, {
        filter: (c) =>
          c.memory.targetId === extension.id && c.memory.transferring,
      }),
      (c) => c.store[RESOURCE_ENERGY]
    );

    return (
      extension.store.getFreeCapacity(RESOURCE_ENERGY) - incomingEnergy <= 0
    );
  },

  harvestEnergy: function (creep) {
    if (!creep.memory.path || !creep.memory.targetId) {
      creepService.getPathToSource(creep);
    } else {
      creepService.moveAndHarvest(creep);
    }
  },

  moveAndTransfer: function (creep) {
    const target = Game.getObjectById(creep.memory.targetId);
    creepService.drawPath(creep);

    if (
      !target ||
      (target.store && target.store.getFreeCapacity(RESOURCE_ENERGY) === 0)
    ) {
      creep.memory.path = null;
      creep.memory.targetId = null;
      // Переход к следующей задаче, если цель недействительна или заполнена.
      this.switchToNextTask(creep);
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
        // Переход к следующей задаче, если движение не удалось.
        this.switchToNextTask(creep);
      }
    } else if (
      action === ERR_FULL ||
      action === ERR_INVALID_TARGET ||
      action === ERR_NO_BODYPART
    ) {
      creep.memory.path = null;
      creep.memory.targetId = null;
      // Переход к следующей задаче, если действие не удалось.
      this.switchToNextTask(creep);
    }
  },

  switchToNextTask: function (creep) {
    const targets = this.getPriorityTargets(creep.room);

    if (targets.length) {
      const newTarget = targets[0];
      creep.memory.targetId = newTarget.id;
      creep.memory.path = creep.pos.findPathTo(newTarget);
    } else {
      const constructionSites = creep.room.find(FIND_CONSTRUCTION_SITES);
      if (constructionSites.length > 0) {
        const newTarget = constructionSites[0];
        creep.memory.targetId = newTarget.id;
        creep.memory.path = creep.pos.findPathTo(newTarget);
      } else {
        const controller = creep.room.controller;
        if (controller) {
          creep.memory.targetId = controller.id;
          creep.memory.path = creep.pos.findPathTo(controller);
        }
      }
    }
  },
};

module.exports = roleHarvester;
