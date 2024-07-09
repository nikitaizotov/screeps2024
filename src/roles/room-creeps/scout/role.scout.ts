// import { BuildService } from "../../../services/build-service/build.service";
// import { CreepService } from "../../../services/creep.service";
import { CreepRole } from "../../role.interface";
// import { scoutJobs } from "./scout.cont";

declare const Memory: Memory;

export class RoleScout implements CreepRole {
  creepsPerRoom = 0;
  namePrefix = "Scout";
  memoryKey = "scout";
  bodyParts = [MOVE, WORK, WORK, CARRY, CARRY, CARRY, CLAIM];
  maxBodyPartsMultiplier = 0;

  // private buildService = new BuildService();
  // private creepService = new CreepService();

  run(creep: Creep): void {
    try {
      if (creep.spawning) {
        return;
      }
      ////////////////////////////////////////////////////////////////
      ////////////////////////////////////////////////////////////////
      ////////////////////////////////////////////////////////////////

      // if (!creep.memory.initialized) {
      //   this.initializeMemory(creep);
      //   creep.memory.job = scoutJobs.MOVING_TO_NEXT_ROOM;
      // }

      // if (this.checkForEnemies(creep)) {
      //   creep.memory.job = scoutJobs.MOVING_TO_NEXT_ROOM;
      //   creep.say("NOOOOOOOOOO!");
      //   //this.getPathToNextRoom(creep);
      //   return;
      // }

      // switch (creep.memory.job) {
      //   case scoutJobs.MOVING_TO_NEXT_ROOM:
      //     this.moveToNextRoom(creep);
      //     break;
      //   // case scoutJobs.CLAIMING:
      //   //   this.claim(creep);
      //   //   break;
      //   // case scoutJobs.BUILDING:
      //   //   this.buildOrFinishSpawn(creep);
      //   //   break;
      // }

      ////////////////////////////////////////////////////////////////
      ////////////////////////////////////////////////////////////////
      ////////////////////////////////////////////////////////////////
      // if (!creep.memory.initialized) {
      //   this.initializeMemory(creep);
      //   creep.memory.job = scoutJobs.MOVING_TO_NEXT_ROOM;
      // }

      // if (this.checkForEnemies(creep)) {
      //   creep.memory.job = scoutJobs.MOVING_TO_NEXT_ROOM;
      //   this.getPathToNextRoom(creep);
      //   return;
      // }

      // switch (creep.memory.job) {
      //   case scoutJobs.MOVING_TO_NEXT_ROOM:
      //     this.moveToNextRoom(creep);
      //     break;
      //   case scoutJobs.CLAIMING:
      //     this.claim(creep);
      //     break;
      //   case scoutJobs.BUILDING:
      //     this.buildOrFinishSpawn(creep);
      //     break;
      // }
    } catch (error: any) {
      console.log(`Error in Scout run: ${error.message}`);
    }
  }

  // initializeMemory(creep: Creep): void {
  //   try {
  //     if (!Memory.scoutRooms) {
  //       Memory.scoutRooms = {};
  //     }
  //     creep.memory.initialized = true;
  //     this.findNextRooms(creep);
  //   } catch (error: any) {
  //     console.log(`Error in initializeMemory: ${error.message}`);
  //   }
  // }

  // private findNextRooms(creep: Creep): void {
  //   try {
  //     const exits = Game.map.describeExits(creep.room.name);
  //     if (!exits) {
  //       return;
  //     }

  //     const nextRooms = Object.values(exits).filter(
  //       (roomName) =>
  //         !Memory.scoutRooms[roomName] || !Memory.scoutRooms[roomName].attacked
  //     ) as string[];

  //     creep.memory.nextRooms = nextRooms;
  //     console.log(`${creep.name} found exits: ${creep.memory.nextRooms}`);
  //   } catch (error: any) {
  //     console.log(`Error in findNextRooms: ${error.message}`);
  //   }
  // }

  // private checkForEnemies(creep: Creep): boolean {
  //   const enemies = creep.room.find(FIND_HOSTILE_CREEPS);
  //   if (enemies.length > 0) {
  //     if (!Memory.scoutRooms[creep.room.name]) {
  //       Memory.scoutRooms[creep.room.name] = {
  //         scouted: true,
  //         lastScouted: Game.time,
  //         empty: false,
  //         attacked: true,
  //         attacker: enemies[0].owner.username,
  //       };
  //     } else {
  //       Memory.scoutRooms[creep.room.name].scouted = true;
  //       Memory.scoutRooms[creep.room.name].lastScouted = Game.time;
  //       Memory.scoutRooms[creep.room.name].empty = false;
  //       Memory.scoutRooms[creep.room.name].attacked = true;
  //       Memory.scoutRooms[creep.room.name].attacker = enemies[0].owner.username;
  //     }
  //     return true;
  //   }
  //   return false;
  // }

  // private moveToNextRoom(creep: Creep): void {
  //   if (!creep.memory.targetRoom) {
  //     creep.memory.route = undefined;
  //     const rooms: string[] = creep.memory.nextRooms as string[];
  //     let roomName = rooms.shift();
  //     creep.memory.targetRoom = roomName;
  //     // const route = Game.map.findRoute(creep.room.name, roomName);
  //   }

  //   if (creep.memory.targetRoom && !creep.memory.route) {
  //     creep.memory.route = Game.map.findRoute(
  //       creep.room.name,
  //       creep.memory.targetRoom
  //     );
  //   }
  // }

  ////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////

  // initializeMemory(creep: Creep): void {
  //   try {
  //     if (!Memory.scoutRooms) {
  //       Memory.scoutRooms = {};
  //     }
  //     creep.memory.initialized = true;
  //     this.findNextRooms(creep);
  //   } catch (error: any) {
  //     console.log(`Error in initializeMemory: ${error.message}`);
  //   }
  // }

  // findNextRooms(creep: Creep): void {
  //   try {
  //     const exits = Game.map.describeExits(creep.room.name);
  //     if (!exits) {
  //       return;
  //     }

  //     const nextRooms = Object.values(exits).filter(
  //       (roomName) =>
  //         !Memory.scoutRooms[roomName] || !Memory.scoutRooms[roomName].attacked
  //     ) as string[];

  //     creep.memory.nextRooms = nextRooms;
  //     console.log(`${creep.name} found exits: ${creep.memory.nextRooms}`);
  //   } catch (error: any) {
  //     console.log(`Error in findNextRooms: ${error.message}`);
  //   }
  // }

  // moveToNextRoom(creep: Creep): void {
  //   try {
  //     if (!creep.memory.targetRoom || !creep.memory.path) {
  //       this.getPathToNextRoom(creep);
  //     } else {
  //     }
  //     /////////////////////////////////////////////////////////
  //     // if (!creep.memory.targetRoom || !creep.memory.path) {
  //     //   this.getPathToNextRoom(creep);
  //     // }
  //     // if (creep.memory.path && creep.memory.path.length > 0) {
  //     //   const nextStep = creep.memory.path[0];
  //     //   const moveResult = creep.move(nextStep.direction as DirectionConstant);
  //     //   if (moveResult === OK) {
  //     //     creep.memory.path.shift();
  //     //   } else if (moveResult === ERR_TIRED) {
  //     //     // Creep is tired, do nothing
  //     //   } else {
  //     //     // If there's an error, recalculate the path
  //     //     console.log(
  //     //       `${creep.name} encountered move error: ${moveResult}. Recalculating path.`
  //     //     );
  //     //     this.getPathToNextRoom(creep);
  //     //   }
  //     // } else {
  //     //   this.getPathToNextRoom(creep);
  //     // }
  //   } catch (error: any) {
  //     console.log(`Scout error moveToNextRoom: ${error.message}`);
  //   }
  // }

  // getPathToNextRoom(creep: Creep): void {
  //   const rooms: string[] = creep.memory.nextRooms as string[];
  //   let roomName = rooms.shift();

  //   // while (
  //   //   roomName &&
  //   //   Memory.scoutRooms[roomName] &&
  //   //   Memory.scoutRooms[roomName].attacked
  //   // ) {
  //   //   roomName = rooms.shift();
  //   // }

  //   if (roomName) {
  //     const endPos = RoomPosition(25, 25, roomName);
  //     creep.memory.path = creep.pos.findPathTo(endPos);
  //   } else {
  //     creep.say("Abra kadabra!");
  //   }

  //   // if (roomName && creep.room.name !== roomName) {
  //   //   const route = Game.map.findRoute(creep.room.name, roomName);
  //   //   if (route !== ERR_NO_PATH) {
  //   //     creep.memory.targetRoom = roomName;
  //   //     const fullPath = [];
  //   //     for (const step of route) {
  //   //       const path = this.getRoomPath(
  //   //         new RoomPosition(25, 25, step.room),
  //   //         new RoomPosition(25, 25, roomName)
  //   //       );
  //   //       if (path) {
  //   //         fullPath.push(...path);
  //   //       } else {
  //   //         console.log(
  //   //           `${creep.name} could not find a path in room ${step.room}`
  //   //         );
  //   //       }
  //   //     }
  //   //     if (fullPath.length > 0) {
  //   //       creep.memory.path = fullPath;
  //   //       console.log(
  //   //         `${creep.name} is moving to ${roomName} via path: ${JSON.stringify(
  //   //           fullPath
  //   //         )}`
  //   //       );
  //   //     } else {
  //   //       console.log(
  //   //         `${creep.name} could not find a full path to ${roomName}`
  //   //       );
  //   //     }
  //   //   } else {
  //   //     console.log(`${creep.name} found no route to ${roomName}`);
  //   //   }
  //   // } else {
  //   //   console.log(
  //   //     `${creep.name} found no suitable next room or is already in the target room`
  //   //   );
  //   // }
  // }

  // getRoomPath(startPos: RoomPosition, endPos: RoomPosition): PathStep[] | null {
  //   const path = PathFinder.search(
  //     startPos,
  //     { pos: endPos, range: 1 },
  //     {
  //       plainCost: 2,
  //       swampCost: 10,
  //       roomCallback: (roomName) => {
  //         let room = Game.rooms[roomName];
  //         if (!room) return false;
  //         let costs = new PathFinder.CostMatrix();
  //         room.find(FIND_STRUCTURES).forEach((structure) => {
  //           if (structure.structureType === STRUCTURE_ROAD) {
  //             costs.set(structure.pos.x, structure.pos.y, 1);
  //           } else if (
  //             structure.structureType !== STRUCTURE_CONTAINER &&
  //             (structure.structureType !== STRUCTURE_RAMPART || !structure.my)
  //           ) {
  //             costs.set(structure.pos.x, structure.pos.y, 255);
  //           }
  //         });
  //         room.find(FIND_MY_CONSTRUCTION_SITES).forEach((site) => {
  //           if (
  //             site.structureType !== STRUCTURE_CONTAINER &&
  //             (site.structureType !== STRUCTURE_RAMPART || !site.my)
  //           ) {
  //             costs.set(site.pos.x, site.pos.y, 255);
  //           }
  //         });
  //         return costs;
  //       },
  //     }
  //   );

  //   if (path.incomplete) {
  //     return null;
  //   }

  //   return path.path.map((pos, index, arr) => {
  //     const nextPos = arr[index + 1];
  //     if (nextPos) {
  //       return {
  //         x: pos.x,
  //         y: pos.y,
  //         dx: nextPos.x - pos.x,
  //         dy: nextPos.y - pos.y,
  //         direction: pos.getDirectionTo(nextPos) as DirectionConstant,
  //       } as PathStep;
  //     }
  //     return {
  //       x: pos.x,
  //       y: pos.y,
  //       dx: 0,
  //       dy: 0,
  //       direction: 0 as DirectionConstant,
  //     } as PathStep;
  //   });
  // }

  // claim(creep: Creep): void {
  //   if (creep.room.controller) {
  //     const controller = creep.room.controller;
  //     const action = creep.claimController(controller);

  //     if (controller.my) {
  //       creep.memory.job = scoutJobs.BUILDING;
  //       return;
  //     }

  //     if (action === ERR_NOT_IN_RANGE) {
  //       if (creep.memory.path) {
  //         creep.moveByPath(creep.memory.path);
  //       } else {
  //         this.findPathToController(creep);
  //       }
  //     }
  //   }
  // }

  // findPathToController(creep: Creep): void {
  //   const controller = creep.room.controller;
  //   if (controller && !controller.my) {
  //     creep.memory.path = creep.pos.findPathTo(controller);
  //   }
  // }

  // buildOrFinishSpawn(creep: Creep) {
  //   if (
  //     creep.memory.building === undefined ||
  //     (creep.memory.building && creep.store[RESOURCE_ENERGY] == 0)
  //   ) {
  //     creep.memory.building = false;
  //     creep.memory.path = undefined;
  //     creep.memory.targetId = null;
  //     creep.say("🔄 harvest");
  //   }
  //   if (!creep.memory.building && creep.store.getFreeCapacity() == 0) {
  //     creep.memory.building = true;
  //     creep.memory.path = undefined;
  //     creep.memory.targetId = null;
  //     creep.say("⚡ transfer");
  //   }
  //   if (creep.memory.building) {
  //     this.transferEnergy(creep);
  //   } else {
  //     this.harvestEnergy(creep);
  //   }
  // }

  // harvestEnergy(creep: Creep): void {
  //   if (!creep.memory.path) {
  //     this.creepService.getPathToSource(creep);
  //   } else {
  //     this.creepService.moveAndHarvest(creep);
  //   }
  // }

  // transferEnergy(creep: Creep): void {
  //   if (!creep.memory.path) {
  //     const target =
  //       creep.room.controller?.level === 1
  //         ? creep.room.controller
  //         : creep.room.find(FIND_CONSTRUCTION_SITES, {
  //             filter: (site) => site.structureType === STRUCTURE_SPAWN,
  //           })[0];

  //     if (target) {
  //       creep.memory.path = creep.pos.findPathTo(target);
  //       creep.memory.targetId = target.id;
  //     } else {
  //       const spawns = creep.room.find(FIND_MY_SPAWNS);
  //       if (spawns) {
  //         this.getPathToNextRoom(creep);
  //       }
  //     }
  //   } else {
  //     this.moveAndTransfer(creep);
  //   }
  // }

  // moveAndTransfer(creep: Creep): void {
  //   const target = Game.getObjectById(creep.memory.targetId as any);

  //   if (!target) {
  //     if (creep.memory.targetId) {
  //       const constructedStructure = Game.getObjectById(
  //         creep.memory.targetId as Id<Structure>
  //       );
  //       if (constructedStructure) {
  //         console.log(
  //           "Construction completed:",
  //           constructedStructure.structureType
  //         );
  //       } else {
  //         console.log("Target construction site not found and not completed.");
  //       }

  //       const result = this.buildService.buildSpawn(creep.room) as any;
  //       if (result === OK) {
  //         console.log(
  //           `Construction site for spawn created successfully in ${creep.room.name}.`
  //         );
  //       } else {
  //         console.log(
  //           `Error creating construction site for spawn in ${creep.room.name}: ${result}`
  //         );
  //       }

  //       creep.memory.building = false;
  //       creep.memory.path = undefined;
  //       creep.memory.targetId = null;
  //     }
  //     return;
  //   }

  //   let action;
  //   const controller = creep.room.controller as StructureController;

  //   if (creep.memory.targetId === controller.id) {
  //     action = creep.upgradeController(controller);
  //   } else {
  //     action = creep.build(target as any);
  //   }

  //   if (action === ERR_NOT_IN_RANGE) {
  //     const moveResult = creep.moveByPath(creep.memory.path as PathStep[]);

  //     if (moveResult !== OK && moveResult !== ERR_TIRED) {
  //       console.log("Move by path failed, error:", moveResult);
  //       creep.memory.path = undefined;
  //       creep.memory.targetId = null;
  //     }
  //   } else if (action === ERR_INVALID_TARGET || action === ERR_NO_BODYPART) {
  //     creep.memory.path = undefined;
  //     creep.memory.targetId = null;
  //   } else if (action === OK) {
  //     if (creep.memory.targetId !== controller.id) {
  //       const spawn = target as any;

  //       if (!spawn.progressTotal || spawn.progress >= spawn.progressTotal) {
  //         creep.memory.building = false;
  //         creep.memory.path = undefined;
  //         creep.memory.targetId = null;
  //         creep.memory.job = scoutJobs.MOVING_TO_NEXT_ROOM;
  //       }
  //     }
  //   }
  // }

  // checkForEnemies(creep: Creep): boolean {
  //   const enemies = creep.room.find(FIND_HOSTILE_CREEPS);
  //   if (enemies.length > 0) {
  //     if (!Memory.scoutRooms[creep.room.name]) {
  //       Memory.scoutRooms[creep.room.name] = {
  //         scouted: true,
  //         lastScouted: Game.time,
  //         empty: false,
  //         attacked: true,
  //         attacker: enemies[0].owner.username,
  //       };
  //     } else {
  //       Memory.scoutRooms[creep.room.name].scouted = true;
  //       Memory.scoutRooms[creep.room.name].lastScouted = Game.time;
  //       Memory.scoutRooms[creep.room.name].empty = false;
  //       Memory.scoutRooms[creep.room.name].attacked = true;
  //       Memory.scoutRooms[creep.room.name].attacker = enemies[0].owner.username;
  //     }
  //     return true;
  //   }
  //   return false;
  // }
}
