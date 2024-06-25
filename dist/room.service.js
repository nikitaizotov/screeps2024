const roleHarvester = require("role.harvester");
const roleUpgrader = require("role.upgrader");
const roleBuilder = require("role.builder");
const buildService = require("build.service");
const roleRanged = require("role.ranged");
const creepService = require("creep.service");
const structureTower = require("structure.tower");
const roleWallAndRampBuilder = require("role.WallAndRampartBuilder");
const roleScout = require("role.scout");

module.exports = {
  enabledRoles: [
    roleHarvester,
    roleUpgrader,
    roleBuilder,
    roleRanged,
    roleWallAndRampBuilder,
    roleScout,
  ],

  routines: function () {
    try {
      this.cleanMemory();
      this.creepsRoutines();
      buildService.run();
      this.structureRoutines();
    } catch (error) {
      console.error(`Error in routines: ${error.message}`);
    }
  },

  cleanMemory: function () {
    try {
      for (var name in Memory.creeps) {
        if (!Game.creeps[name]) {
          delete Memory.creeps[name];
          console.log("Clearing non-existing creep memory:", name);
        }
      }
    } catch (error) {
      console.error(`Error in cleanMemory: ${error.message}`);
    }
  },

  creepsRoutines: function () {
    try {
      this.spawnCreeps();
      this.moveCreeps();
    } catch (error) {
      console.error(`Error in creepsRoutines: ${error.message}`);
    }
  },

  spawnCreeps: function () {
    try {
      for (let spawnName in Game.spawns) {
        const spawn = Game.spawns[spawnName];
        const energyInExtensions = this.getTotalEnergyInExtensions(spawn.room);
        this.isSafeModeNeeded(spawn.room);

        if (spawn.spawning) {
          continue;
        }

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
          const canAfford =
            energyInExtensions + spawn.store[RESOURCE_ENERGY] >= cost;

          if (role.memoryKey === roleBuilder.memoryKey) {
            const constructionSites = spawn.room.find(FIND_CONSTRUCTION_SITES);

            if (!constructionSites.length) {
              continue;
            }
          }

          if (role.memoryKey === roleWallAndRampBuilder.memoryKey) {
            const isReparableWallsAndRamps = spawn.room.find(FIND_STRUCTURES, {
              filter: (structure) => {
                return (
                  (structure.structureType === STRUCTURE_WALL ||
                    structure.structureType === STRUCTURE_RAMPART) &&
                  structure.hits < structure.hitsMax
                );
              },
            });

            if (!isReparableWallsAndRamps.length) {
              continue;
            }
          }

          if (role.memoryKey === roleScout.memoryKey) {
            const scoutsInRoom = _.filter(
              Game.creeps,
              (creep) =>
                creep.memory.role == role.memoryKey &&
                creep.memory.spawnRoom == spawn.room.name
            );

            if (spawn.room.controller.level < 5 || scoutsInRoom.length > 0) {
              continue;
            }
          }

          if (selectedCreeps.length < role.creepsPerRoom && canAfford) {
            const newName = role.namePrefix + Game.time;
            const totalEnergyInRoom =
              energyInExtensions + spawn.store[RESOURCE_ENERGY];
            const bodyPartsMultiplayer =
              role.memoryKey !== roleScout.memoryKey
                ? parseInt(totalEnergyInRoom / cost)
                : 1;
            const bodyParts = this.repeatArray(
              role.bodyParts,
              bodyPartsMultiplayer
            );

            if (
              !spawn.spawnCreep(bodyParts, newName, {
                memory: {
                  role: role.memoryKey,
                  spawnRoom: spawn.room.name,
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
    } catch (error) {
      console.error(`Error in spawnCreeps: ${error.message}`);
    }
  },

  moveCreeps: function () {
    try {
      for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        if (Game.time % 1 === 0) {
          creepService.findIdleCreep(creep);
        }

        const role = this.enabledRoles.find(
          (role) => role.memoryKey === creep.memory.role
        );
        if (role) {
          role.run(creep);
        } else {
          console.log("Creep has unknown role", creep.memory.role);
        }
      }
    } catch (error) {
      console.error(`Error in moveCreeps: ${error.message}`);
    }
  },

  getTotalEnergyInExtensions: function (room) {
    try {
      const extensions = room.find(FIND_MY_STRUCTURES, {
        filter: { structureType: STRUCTURE_EXTENSION },
      });

      const totalEnergy = extensions.reduce(
        (sum, extension) => sum + extension.energy,
        0
      );

      return totalEnergy;
    } catch (error) {
      console.error(`Error in getTotalEnergyInExtensions: ${error.message}`);
      return 0;
    }
  },

  repeatArray: function (array, times) {
    try {
      let repeatedArray = [];
      for (let i = 0; i < times; i++) {
        repeatedArray = repeatedArray.concat(array);
      }
      return repeatedArray;
    } catch (error) {
      console.error(`Error in repeatArray: ${error.message}`);
      return array;
    }
  },

  structureRoutines: function () {
    try {
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
    } catch (error) {
      console.error(`Error in structureRoutines: ${error.message}`);
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
          filter: (structure) =>
            structure.structureType !== STRUCTURE_WALL &&
            structure.structureType !== STRUCTURE_RAMPART &&
            structure.structureType !== STRUCTURE_ROAD,
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
              `Activated Safe Mode in room ${room.name} because of attack.`
            );
          } else {
            console.log(
              `No available Safe Modes for activation in room ${room.name}.`
            );
          }
        }
      }
    } catch (error) {
      console.log(`Error in isSafeModeNeeded method, ${error}`);
    }
  },
};
