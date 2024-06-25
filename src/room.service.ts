import _ from "lodash";
import roleWallAndRampBuilder from "./role.WallAndRampartBuilder";
import roleHarvester from "./role.harvester";
import roleRanged from "./role.ranged";
import roleScout from "./role.scout";
import roleUpgrader from "./role.upgrader";
import structureTower from "./structure.tower";
import roleBuilder from "./role.builder";
import buildService from "./build.service";
import creepService from "./creep.service";
import utilsService from "./utils.service";

const roomService = {
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
      buildService.build();
      this.structureRoutines();
    } catch (error: any) {
      console.log(`Error in routines: ${error.message}`);
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
    } catch (error: any) {
      console.log(`Error in cleanMemory: ${error.message}`);
    }
  },

  creepsRoutines: function () {
    try {
      this.spawnCreeps();
      this.moveCreeps();
    } catch (error: any) {
      console.log(`Error in creepsRoutines: ${error.message}`);
    }
  },

  spawnCreeps(): void {
    try {
      for (let spawnName in Game.spawns) {
        const spawn: StructureSpawn = Game.spawns[spawnName];
        const energyInExtensions = utilsService.getTotalEnergyInExtensions(
          spawn.room
        );
        utilsService.isSafeModeNeeded(spawn.room);

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
          const bodyParts: BodyPartConstant[] = role.bodyParts;
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
              filter: (structure: Structure) => {
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

            if (spawn.room.controller!.level < 5 || scoutsInRoom.length > 0) {
              continue;
            }
          }

          if (selectedCreeps.length < role.creepsPerRoom && canAfford) {
            const newName = role.namePrefix + Game.time;
            const totalEnergyInRoom =
              energyInExtensions + spawn.store[RESOURCE_ENERGY];
            const bodyPartsMultiplier =
              role.memoryKey !== roleScout.memoryKey
                ? Math.floor(totalEnergyInRoom / cost)
                : 1;
            const finalBodyParts = utilsService.repeatArray(
              role.bodyParts,
              bodyPartsMultiplier
            );

            if (
              spawn.spawnCreep(finalBodyParts, newName, {
                memory: {
                  role: role.memoryKey,
                  spawnRoom: spawn.room.name,
                  pathColor:
                    "#" +
                    ((Math.random() * 0xffffff) << 0)
                      .toString(16)
                      .padStart(6, "0"),
                },
              }) === OK
            ) {
              console.log("Spawning a new creep: " + newName);
              return;
            }
          }
        }
      }
    } catch (error: any) {
      console.log(`Error in spawnCreeps: ${error.message}`);
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
    } catch (error: any) {
      console.log(`Error in moveCreeps: ${error.message}`);
    }
  },

  structureRoutines: function () {
    try {
      for (let roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        const spawns = room.find(FIND_MY_SPAWNS);

        if (spawns.length > 0) {
          const towers: StructureTower[] = room.find(FIND_MY_STRUCTURES, {
            filter: { structureType: STRUCTURE_TOWER },
          });

          towers.forEach((tower: StructureTower) => {
            structureTower.run(tower);
          });
        }
      }
    } catch (error: any) {
      console.log(`Error in structureRoutines: ${error.message}`);
    }
  },
};

export default roomService;
