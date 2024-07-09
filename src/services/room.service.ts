import _ from "lodash";
import { RoleMiner } from "../roles/room-creeps/role.miner";
import { CreepRole } from "../roles/role.interface";
import { CreepService } from "./creep.service";
import { LinkManager } from "../structures/structure.link";
import { UtilsService } from "./utils.service";
import { TowerManager } from "../structures/structure.tower";
import { RoleLinkManager } from "../roles/room-creeps/link-manager/role.link-manager";
import roleWorker from "../roles/room-creeps/worker/role.worker";
import { WorkerService } from "../roles/room-creeps/worker/worker.service";
import { RoleScout } from "../roles/room-creeps/scout/role.scout";
import { BuildService } from "./build-service/build.service";
import { CacheService } from "./cache.service";
// const profiler = require("./../screeps-profiler");

export class RoomService {
  // Roles.
  private roleMiner = new RoleMiner();
  private enabledRoles: CreepRole[] = [];
  private roleLinkManager = new RoleLinkManager();
  private roleScout = new RoleScout();

  // Structures.
  private linkManager = new LinkManager();
  private towerManager = new TowerManager();

  // Services.
  private workerService = new WorkerService();
  private utilsService = new UtilsService();
  private creepService = new CreepService();
  private buildService = new BuildService();
  private cacheService = new CacheService();

  constructor() {
    this.enabledRoles = [
      roleWorker,
      this.roleMiner,
      this.roleLinkManager,
      // roleRanged,
      // this.roleScout,
    ];
  }

  creepRoutines(): void {
    try {
      this.spawnCreeps();
      this.moveCreeps();
      this.workerService.manageWorkers();
    } catch (error: any) {
      console.log(`Error in creepRoutines: ${error.message}`);
    }
  }

  cacheRoutines(): void {
    try {
      this.cleanMemory();
      this.roomRoutines();
      this.cacheService.clearCreepPathCache();

      if (Game.time % 500 === 0) {
        this.isFixingWallsNeeded();
      }
    } catch (error: any) {
      console.log(`Error in cacheRoutines: ${error.message}`);
    }
  }

  structureRoutines(): void {
    try {
      this.buildService.build();
      this.manageStructures();
    } catch (error: any) {
      console.log(`Error in structureRoutines: ${error.message}`);
    }
  }

  private cleanMemory(): void {
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

  private spawnCreeps(): void {
    try {
      // Run the following code only every 3 ticks.
      if (Game.time % 5 !== 0) {
        return;
      }

      // Iterate through all spawns in the game.
      for (let spawnName in Game.spawns) {
        const spawn: StructureSpawn = Game.spawns[spawnName];

        // Get the total energy available in extensions in the spawn's room.
        const energyInExtensions = this.utilsService.getTotalEnergyInExtensions(
          spawn.room
        );

        // Check if safe mode is needed for the spawn's room.
        this.utilsService.isSafeModeNeeded(spawn.room);

        // Skip this spawn if it is already spawning a creep.
        if (spawn.spawning) {
          continue;
        }

        // Iterate through all enabled roles.
        for (let role of this.enabledRoles) {
          // Filter creeps by role and room.
          const selectedCreeps = _.filter(
            Game.creeps,
            (creep) =>
              creep.memory.role == role.memoryKey &&
              creep.room.name == spawn.room.name
          );
          const baseBodyParts: BodyPartConstant[] = role.baseBodyParts || [];
          const bodyParts: BodyPartConstant[] = role.bodyParts;

          // Calculate the base cost of body parts.
          const baseCost = baseBodyParts.reduce(
            (sum, part) => sum + BODYPART_COST[part],
            0
          );

          // Calculate the cost of additional body parts.
          const bodyPartsCost = bodyParts.reduce(
            (sum, part) => sum + BODYPART_COST[part],
            0
          );

          // Calculate the total cost of the creep.
          const totalCost = baseCost + bodyPartsCost;

          // Check if the spawn can afford the creep.
          const canAfford =
            energyInExtensions + spawn.store[RESOURCE_ENERGY] >= totalCost;

          // Get the storage link ID for the room.
          const linkId = this.roleLinkManager.getStorageLinkId(spawn.room);

          // Special conditions for miners.
          if (role.memoryKey === this.roleMiner.memoryKey) {
            const linkedStorage = this.roleLinkManager.getStorageLinkId(
              spawn.room
            );

            // Find all containers in the room.
            const containers = spawn.room.find(FIND_STRUCTURES, {
              filter: (structure) =>
                structure.structureType === STRUCTURE_CONTAINER,
            });

            // Calculate the needed count of miners.
            const neededCount = linkedStorage
              ? Object.keys(Memory?.roomData?.links[spawn.room.name]).length - 1
              : containers.length;

            // Skip if the current count of miners is sufficient.
            if (neededCount <= selectedCreeps.length) {
              continue;
            }
          }

          // Special conditions for link managers.
          if (role.memoryKey === this.roleLinkManager.memoryKey) {
            // Skip if no link ID or if there are already link managers.
            if (!linkId || selectedCreeps.length > 0) {
              continue;
            }
          }
          // Special conditions for scouts.
          // if (role.memoryKey === this.roleScout.memoryKey) {
          //   // Find all scouts in the room.
          //   const scoutsInRoom = _.filter(
          //     Game.creeps,
          //     (creep) =>
          //       creep.memory.role == role.memoryKey &&
          //       creep.memory.spawnRoom == spawn.room.name
          //   );
          //   // Check neighboring rooms
          //   const exits = Game.map.describeExits(spawn.room.name);
          //   let needScout = false;
          //   let allNeighboringRoomsUnsafe = true;
          //   if (exits) {
          //     for (let exit in exits) {
          //       const roomName = exits[exit as keyof ExitsInformation];
          //       if (roomName) {
          //         const neighboringRoomMemory = Memory.scoutRooms[roomName];
          //         if (
          //           !neighboringRoomMemory ||
          //           !neighboringRoomMemory.attacked
          //         ) {
          //           allNeighboringRoomsUnsafe = false;
          //         }
          //         if (
          //           !neighboringRoomMemory ||
          //           neighboringRoomMemory.attacked !== true
          //         ) {
          //           const neighboringRoom = Game.rooms[roomName];
          //           if (!neighboringRoom || !neighboringRoom.controller?.my) {
          //             needScout = true;
          //             break;
          //           }
          //         }
          //       }
          //     }
          //   }
          //   // Skip if no scout is needed or if all neighboring rooms are unsafe.
          //   if (!needScout || allNeighboringRoomsUnsafe) {
          //     continue;
          //   }
          //   // Skip if the controller level is less than 5 или if the number of scouts is sufficient.
          //   if (
          //     spawn.room.controller!.level < 5 ||
          //     scoutsInRoom.length >= this.roleScout.creepsPerRoom
          //   ) {
          //     continue;
          //   }
          // }
          ///////////////////////////////////

          // Determine the maximum allowed creeps for this role.
          let maxCreepsAllowed =
            role.creepsPerSourcePositions &&
            role.creepsPerSourcePositions[
              Memory?.roomData?.sourcePositions[spawn.room.name]
            ]
              ? role.creepsPerSourcePositions[
                  Memory?.roomData?.sourcePositions[spawn.room.name]
                ]
              : role.creepsPerRoom;
          if (
            Memory.roomData.fixingWallsRampartsEnabled &&
            role.memoryKey === roleWorker.memoryKey &&
            Memory.roomData.fixingWallsRampartsEnabled[spawn.room.name] ===
              false
          ) {
            maxCreepsAllowed--;
          }

          // If the number of creeps is less than the allowed maximum and the spawn can afford it, create a new creep.
          if (selectedCreeps.length < maxCreepsAllowed && canAfford) {
            const newName = role.namePrefix + Game.time;
            const totalEnergyInRoom =
              energyInExtensions + spawn.store[RESOURCE_ENERGY];
            let bodyPartsMultiplier =
              role.memoryKey !== this.roleScout.memoryKey
                ? Math.floor((totalEnergyInRoom - baseCost) / bodyPartsCost)
                : 1;

            // Ensure the body parts multiplier does not exceed the maximum allowed.
            if (
              role?.maxBodyPartsMultiplier &&
              bodyPartsMultiplier > role?.maxBodyPartsMultiplier
            ) {
              bodyPartsMultiplier = role?.maxBodyPartsMultiplier;
            }

            // Combine base body parts with additional body parts.
            const finalBodyParts = [
              ...baseBodyParts,
              ...this.utilsService.repeatArray(bodyParts, bodyPartsMultiplier),
            ];
            const spawnAttempt = spawn.spawnCreep(finalBodyParts, newName, {
              memory: {
                role: role.memoryKey,
                spawnRoom: spawn.room.name,
                pathColor:
                  "#" +
                  ((Math.random() * 0xffffff) << 0)
                    .toString(16)
                    .padStart(6, "0"),
                idleTicks: 0,
                pathName: "",
              },
            });

            // Spawn the new creep and set its memory.
            if (spawnAttempt === OK) {
              return;
            }
          }
        }
      }
    } catch (error: any) {
      // Log any errors encountered during the function execution.
      console.log(`Error in spawnCreeps: ${error.message}`);
    }
  }

  private moveCreeps(): void {
    try {
      for (const name in Game.creeps) {
        const creep = Game.creeps[name];

        this.creepService.drawPath(creep);

        let timeToCheck =
          creep.memory.role === this.roleMiner.memoryKey ||
          creep.memory.role === this.roleLinkManager.memoryKey
            ? 500
            : 1;
        timeToCheck =
          creep.memory.role === this.roleScout.memoryKey ? 99999 : timeToCheck;

        if (Game.time % timeToCheck === 0) {
          this.creepService.findIdleCreep(creep);
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

  private manageStructures(): void {
    try {
      // Iterate through all rooms in the game.
      for (let roomName in Game.rooms) {
        const room = Game.rooms[roomName];

        if (room?.controller && room.controller?.my) {
          // Find all towers and links in the room in a single search.
          const structures = room.find(FIND_MY_STRUCTURES, {
            filter: (structure) =>
              structure.structureType === STRUCTURE_TOWER ||
              structure.structureType === STRUCTURE_LINK,
          });

          // Filter and handle towers.
          const towers = structures.filter(
            (structure): structure is StructureTower =>
              structure.structureType === STRUCTURE_TOWER
          );

          towers.forEach((tower: StructureTower) => {
            this.towerManager.work(tower);
          });

          // Filter and handle links.
          const links = structures.filter(
            (structure): structure is StructureLink =>
              structure.structureType === STRUCTURE_LINK
          );

          links.forEach((link: StructureLink) => {
            this.linkManager.work(link);
          });
        }
      }
    } catch (error: any) {
      // Log any errors encountered during the function execution.
      console.log(`Error in manageStructures: ${error.message}`);
    }
  }

  private roomRoutines(): void {
    if (Game.time % 5 === 0) {
      this.utilsService.getRoomData();
    }
  }

  isFixingWallsNeeded(): void {
    try {
      for (const roomName in Game.rooms) {
        const room: Room = Game.rooms[roomName];

        if (!room.controller?.my) {
          continue;
        }

        if (!Memory.roomData.fixingWallsRampartsEnabled) {
          Memory.roomData.fixingWallsRampartsEnabled = {};
        }

        if (
          Memory.roomData.fixingWallsRampartsEnabled[room.name] === undefined
        ) {
          Memory.roomData.fixingWallsRampartsEnabled[room.name] = true;
        }

        const repairThreshold = 700000;
        const repairNeededThreshold = 650000;

        const fixingNeeded =
          Memory.roomData.fixingWallsRampartsEnabled[room.name];

        const targets: AnyStructure[] = room.find(FIND_STRUCTURES, {
          filter: (structure) =>
            (fixingNeeded
              ? structure.hits > repairThreshold
              : structure.hits < repairNeededThreshold) &&
            (structure.structureType === STRUCTURE_WALL ||
              structure.structureType === STRUCTURE_RAMPART),
        });

        Memory.roomData.fixingWallsRampartsEnabled[room.name] = fixingNeeded
          ? targets.length === 0
          : targets.length > 0;
      }
    } catch (error: any) {
      console.log(`Error in isFixingWallsNeeded: ${error.message}`);
    }
  }
}

// profiler.registerClass(RoomService, "RoomService");
