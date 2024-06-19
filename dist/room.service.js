const roleHarvester = require("role.harvester");
const roleUpgrader = require("role.upgrader");
const roleBuilder = require("role.builder");
const buildService = require("build.service");
const roleRanged = require("role.ranged");
const creepService = require("creep.service");

module.exports = {
  enabledRoles: [roleHarvester, 
    roleUpgrader, roleBuilder, roleRanged
  ],
  routines: function () {
    this.cleanMemory();
    this.creepsRoutines();
    buildService.run();
  },
  cleanMemory: function () {
    for (var name in Memory.creeps) {
      if (!Game.creeps[name]) {
        delete Memory.creeps[name];
        console.log("Clearing non-existing creep memory:", name);
      }
    }
  },
  creepsRoutines: function () {
    this.spawnCreeps();
    this.moveCreeps();
  },
  spawnCreeps: function () {
    const spawn = Game.spawns["Spawn1"];
    if (spawn.spawning) {
      return;
    }

    for (let role of this.enabledRoles) {
      const selectedCreeps = _.filter(
        Game.creeps,
        (creep) => creep.memory.role == role.memoryKey
      );
      const bodyParts = role.bodyParts;
      const cost = bodyParts.reduce(
        (sum, part) => sum + BODYPART_COST[part],
        0
      );
      const canAfford = spawn.store[RESOURCE_ENERGY] >= cost;

      if (role.memoryKey === roleBuilder.memoryKey) {
        const constructionSites = spawn.room.find(FIND_CONSTRUCTION_SITES);
        if (!constructionSites.length) {
          continue;
        }
      }

      if (selectedCreeps.length < role.creepsPerRoom && canAfford) {
        const newName = role.namePrefix + Game.time;

        if (
          !Game.spawns["Spawn1"].spawnCreep(role.bodyParts, newName, {
            memory: {
              role: role.memoryKey,
              pathColor:
                "#" +
                ((Math.random() * 0xffffff) << 0).toString(16).padStart(6, "0"),
            },
          })
        ) {
          console.log("Spawning a new creep: " + newName);
          return;
        }
      }
    }
  },
  moveCreeps: function () {
    for (var name in Game.creeps) {
      var creep = Game.creeps[name];

      creepService.findIdleCreep(creep);

      switch (creep.memory.role) {
        case roleHarvester.memoryKey:
          roleHarvester.run(creep);
          break;
        case roleUpgrader.memoryKey:
          roleUpgrader.run(creep);
          break;
        case roleBuilder.memoryKey:
          roleBuilder.run(creep);
          break;
        case roleRanged.memoryKey:
          roleRanged.run(creep);
          break;
        default:
          console.log("Creep has unknown role", creep.memoryKey);
      }
    }
  },
};
