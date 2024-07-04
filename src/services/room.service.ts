import _ from "lodash";
import roleWallAndRampBuilder from "../roles/role.WallAndRampartBuilder";
import roleRanged from "../roles/role.ranged";
import roleScout from "../roles/role.scout";
import structureTower from "../structures/structure.tower";
import buildService from "./build.service";
import creepService from "./creep.service";
import utilsService from "./utils.service";
import roleMiner from "../roles/role.miner";
import roleWorker from "../roles/worker/role.worker";
import { WorkerTask } from "../roles/constants/role.worker.const";
import { WorkerService } from "../roles/worker/worker.service";
const profiler = require("./../screeps-profiler");

const workerService = new WorkerService();

export class RoomService {
  enabledRoles = [
    roleWorker,
    roleMiner,
    // roleRanged,
    roleWallAndRampBuilder,
    // roleScout,
  ];

  routines(): void {
    try {
      this.cleanMemory();
      // creepService.clearCreepPathCache(5000);
      // this.cacheGameRooms();
      this.creepsRoutines();
      buildService.build();
      this.structureRoutines();
      this.roomRoutines();
      workerService.manageWorkers();
      // creepService.createStructureCache();
    } catch (error: any) {
      console.log(`Error in routines: ${error.message}`);
    }
  }

  cleanMemory(): void {
    try {
      for (var name in Memory.creeps) {
        if (!Game.creeps[name]) {
          delete Memory.creeps[name];
        }
      }
    } catch (error: any) {
      console.log(`Error in cleanMemory: ${error.message}`);
    }
  }

  creepsRoutines(): void {
    try {
      this.spawnCreeps();
      this.moveCreeps();
    } catch (error: any) {
      console.log(`Error in creepsRoutines: ${error.message}`);
    }
  }

  spawnCreeps(): void {
    try {
      if (Game.time % 3) {
        return;
      }

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
          const baseBodyParts: BodyPartConstant[] = role.baseBodyParts || [];
          const bodyParts: BodyPartConstant[] = role.bodyParts;
          const baseCost = baseBodyParts.reduce(
            (sum, part) => sum + BODYPART_COST[part],
            0
          );
          const bodyPartsCost = bodyParts.reduce(
            (sum, part) => sum + BODYPART_COST[part],
            0
          );
          const totalCost = baseCost + bodyPartsCost;
          const canAfford =
            energyInExtensions + spawn.store[RESOURCE_ENERGY] >= totalCost;

          if (role.memoryKey === roleMiner.memoryKey) {
            const containers = spawn.room.find(FIND_STRUCTURES, {
              filter: (structure) =>
                structure.structureType === STRUCTURE_CONTAINER,
            });

            if (containers.length <= selectedCreeps.length) {
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

            if (
              spawn.room.controller!.level < 5 ||
              scoutsInRoom.length >= roleScout.creepsPerRoom
            ) {
              continue;
            }
          }

          const maxCreepsAllowed =
            role.creepsPerSourcePositions &&
            role.creepsPerSourcePositions[
              Memory.roomData.sourcePositions[spawn.room.name]
            ]
              ? role.creepsPerSourcePositions[
                  Memory.roomData.sourcePositions[spawn.room.name]
                ]
              : role.creepsPerRoom;

          if (selectedCreeps.length < maxCreepsAllowed && canAfford) {
            const newName = role.namePrefix + Game.time;
            const totalEnergyInRoom =
              energyInExtensions + spawn.store[RESOURCE_ENERGY];
            let bodyPartsMultiplier =
              role.memoryKey !== roleScout.memoryKey
                ? Math.floor((totalEnergyInRoom - baseCost) / bodyPartsCost)
                : 1;

            if (
              role?.maxBodyPartsMultiplier &&
              bodyPartsMultiplier > role?.maxBodyPartsMultiplier
            ) {
              bodyPartsMultiplier = role?.maxBodyPartsMultiplier;
            }

            const finalBodyParts = [
              ...baseBodyParts,
              ...utilsService.repeatArray(bodyParts, bodyPartsMultiplier),
            ];

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
              return;
            }
          }
        }
      }
    } catch (error: any) {
      console.log(`Error in spawnCreeps: ${error.message}`);
    }
  }

  moveCreeps(): void {
    try {
      for (const name in Game.creeps) {
        const creep = Game.creeps[name];

        let timeToCheck = creep.memory.role === roleMiner.memoryKey ? 500 : 1;
        timeToCheck =
          creep.memory.role === roleScout.memoryKey ? 20 : timeToCheck;

        if (Game.time % timeToCheck === 2) {
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
  }

  structureRoutines(): void {
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
  }

  roomRoutines(): void {
    if (Game.time % 5 === 0) {
      utilsService.getRoomData();
    }
  }

  // cacheGameRooms(): void {
  //   // unset old cache.
  //   Memory.cacheGameRooms = {};
  //   Memory.cacheGameRooms = { ...Game.rooms };
  // }
}

profiler.registerClass(RoomService, "RoomService");
