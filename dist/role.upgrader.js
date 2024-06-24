const creepService = require("creep.service");

var roleUpgrader = {
  creepsPerRoom: 2,
  namePrefix: "Upgrader",
  memoryKey: "upgrader",
  bodyParts: [WORK, CARRY, MOVE],
  run: function (creep) {
    if (creep.spawning) {
      return;
    }
    if (creep.memory.upgrading && creep.store[RESOURCE_ENERGY] == 0) {
      creep.memory.upgrading = false;
      creep.memory.path = null;
      creep.say("🔄 harvest");
    }
    if (!creep.memory.upgrading && creep.store.getFreeCapacity() == 0) {
      creep.memory.upgrading = true;
      creep.memory.path = null;
      creep.say("⚡ upgrade");
    }

    if (creep.memory.upgrading) {
      this.upgradeControllerJob(creep);
    } else {
      this.harvestEnergy(creep);
    }
  },
  harvestEnergy: function (creep) {
    if (!creep.memory.path) {
      creepService.getPathToSource(creep);
    } else {
      this.moveAndHarvest(creep);
    }
  },
  upgradeControllerJob: function (creep) {
    if (!creep.memory.path) {
      this.getPathToController(creep);
    } else {
      this.moveAndUpgrade(creep);
    }
  },
  getPathToSource: function (creep) {
    creep.say("Searching");
    let sources = creep.room.find(FIND_SOURCES);

    for (let source of sources) {
      var path = PathFinder.search(
        creep.pos,
        { pos: source.pos, range: 1 },
        {
          roomCallback: function (roomName) {
            let room = Game.rooms[roomName];
            if (!room) return;
            let costs = new PathFinder.CostMatrix();
            room.find(FIND_CREEPS).forEach(function (creep) {
              costs.set(creep.pos.x, creep.pos.y, 0xff);
            });
            return costs;
          },
        }
      );

      if (!path.incomplete) {
        creep.memory.path = creep.pos.findPathTo(source);
        creep.memory.targetId = source.id;
        break;
      }
    }
  },
  getPathToController: function (creep) {
    creep.say("Searching");
    creep.memory.path = creep.pos.findPathTo(creep.room.controller);
  },
  moveAndHarvest: function (creep) {
    let source = Game.getObjectById(creep.memory.targetId);

    if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
      creepService.drawPath(creep);
      let moveResult = creep.moveByPath(creep.memory.path);
      if (
        moveResult === ERR_NOT_FOUND ||
        (moveResult !== OK && moveResult !== ERR_TIRED)
      ) {
        creepService.getPathToSource(creep);
      }
    }
  },
  moveAndUpgrade: function (creep) {
    const action = creep.upgradeController(creep.room.controller);

    if (action === ERR_NOT_IN_RANGE) {
      const moveResult = creep.moveByPath(creep.memory.path);
      creepService.drawPath(creep);

      if (moveResult !== OK && moveResult !== ERR_TIRED) {
        this.getPathToController(creep);
      }
    }
  },
};

module.exports = roleUpgrader;
