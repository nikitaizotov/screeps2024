const roleHarvester = require("role.harvester");
const roleUpgrader = require("role.upgrader");
const roleBuilder = require("role.builder");
const buildService = require("build.service");
const roleRanged = require("role.ranged");
const creepService = require("creep.service");
const structureTower = require("structure.tower");

module.exports = {
  enabledRoles: [roleHarvester, roleUpgrader, roleBuilder, roleRanged],

  routines: function () {
    this.cleanMemory();
    this.creepsRoutines();
    buildService.run();
    this.structureRoutines();
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
    for (let spawnName in Game.spawns) {
      const spawn = Game.spawns[spawnName];
      const energyInExtensions = this.getTotalEnergyInExtensions(spawn.room);
      this.isSafeModeNeeded(spawn.room);

      if (spawn.spawning) {
        continue;
      }

      const constructionSites = spawn.room.find(FIND_CONSTRUCTION_SITES);

      for (let role of this.enabledRoles) {
        const selectedCreeps = _.filter(
          Game.creeps,
          (creep) =>
            creep.memory.role == role.memoryKey &&
            creep.room.name == spawn.room.name
        );
        const bodyParts = role.bodyParts;
        const cost = bodyParts.reduce(
          (sum, part) => sum + BODYPART_COST[part],
          0
        );
        const canAfford = spawn.store[RESOURCE_ENERGY] >= cost;

        if (
          role.memoryKey === roleBuilder.memoryKey &&
          !constructionSites.length
        ) {
          continue;
        }

        if (selectedCreeps.length < role.creepsPerRoom && canAfford) {
          const newName = role.namePrefix + Game.time;
          const totalEnergyInRoom =
            energyInExtensions + spawn.store[RESOURCE_ENERGY];
          const bodyPartsMultiplayer = parseInt(totalEnergyInRoom / cost);
          const bodyParts = this.repeatArray(
            role.bodyParts,
            bodyPartsMultiplayer
          );

          if (
            !spawn.spawnCreep(bodyParts, newName, {
              memory: {
                role: role.memoryKey,
                pathColor:
                  "#" +
                  ((Math.random() * 0xffffff) << 0)
                    .toString(16)
                    .padStart(6, "0"),
              },
            })
          ) {
            console.log("Spawning a new creep: " + newName);
            return;
          }
        }
      }
    }
  },

  moveCreeps: function () {
    for (var name in Game.creeps) {
      var creep = Game.creeps[name];

      if (Game.time % 5) {
        creepService.findIdleCreep(creep);
      }

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

  getTotalEnergyInExtensions: function (room) {
    const extensions = room.find(FIND_MY_STRUCTURES, {
      filter: { structureType: STRUCTURE_EXTENSION },
    });

    const totalEnergy = extensions.reduce(
      (sum, extension) => sum + extension.energy,
      0
    );

    return totalEnergy;
  },

  repeatArray: function (array, times) {
    let repeatedArray = [];
    for (let i = 0; i < times; i++) {
      repeatedArray = repeatedArray.concat(array);
    }
    return repeatedArray;
  },

  structureRoutines: function () {
    for (let roomName in Game.rooms) {
      const room = Game.rooms[roomName];
      const spawns = room.find(FIND_MY_SPAWNS);

      if (spawns.length > 0) {
        const towers = room.find(FIND_MY_STRUCTURES, {
          filter: { structureType: STRUCTURE_TOWER },
        });

        towers.forEach((tower) => {
          structureTower.run(tower);
        });
      }
    }
  },

  /**
   * Will activate Safe Mode if needed and if there is Safe Mode to activate.
   * @param {*} room
   */
  isSafeModeNeeded: function (room) {
    try {
      // Check if room is mine.
      if (room.controller && room.controller.my) {
        // Check all structures in room excluding walls.
        const structures = room.find(FIND_STRUCTURES, {
          filter: (structure) => structure.structureType !== STRUCTURE_WALL,
        });

        // Check, if structure were attacked.
        const structuresDamaged = structures.some(
          (structure) => structure.hits < structure.hitsMax
        );

        const hostiles = room.find(FIND_HOSTILE_CREEPS);

        if (structuresDamaged && hostiles.length > 0) {
          // Check, if there is a Safe Modes available.
          if (room.controller.safeModeAvailable > 0) {
            // Activate Safe Mode.
            room.controller.activateSafeMode();
            console.log(
              `Activated Safe Mode in room ${roomName} because of attack.`
            );
          } else {
            console.log(
              `No available Safe Modes for activation in room ${roomName}.`
            );
          }
        }
      }
    } catch (error) {
      console.log(`Error in isSafeModeNeeded method, ${error}`);
    }
  },
};
