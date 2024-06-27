import buildService from "./build.service";
import creepService from "./creep.service";
import { CreepRole } from "./role.interface";

interface ScoutRoomMemory {
  scouted: boolean;
  lastScouted: number;
  empty: boolean;
  attacked: boolean;
  attacker: string | null;
}

interface Memory {
  scoutRooms: { [roomName: string]: ScoutRoomMemory };
}

declare const Memory: Memory;

export const scoutRole: CreepRole = {
  creepsPerRoom: 0,
  namePrefix: "Scout",
  memoryKey: "scout",
  bodyParts: [MOVE, WORK, CARRY, CLAIM],
  baseBodyParts: [MOVE],
  maxBodyPartsMultiplier: 0,

  run(creep: Creep): void {
    try {
      if (creep.spawning) {
        return;
      }

      if (!creep.memory.initialized) {
        this.initializeMemory(creep);
      }

      console.log(`${creep.name} is running in room ${creep.room.name}`);

      if (creep.memory.path) {
        creepService.drawPath(creep);
      }

      const room = creep.room;
      const controller = room.controller;

      if (controller) {
        if (!controller.my && !controller.owner) {
          this.claimController(creep, controller);
          return;
        } else if (controller.my) {
          const spawns = room.find(FIND_MY_SPAWNS);
          if (spawns.length === 0) {
            this.buildOrFinishSpawn(creep, room);
            return;
          }
        }
      }

      this.exploreNextRoom(creep);
    } catch (error: any) {
      console.log(`Error in Scout run: ${error.message}`);
    }
  },

  initializeMemory(creep: Creep): void {
    try {
      if (!Memory.scoutRooms) {
        Memory.scoutRooms = {};
      }
      creep.memory.initialized = true;
      this.findNextRooms(creep);
    } catch (error: any) {
      console.log(`Error in initializeMemory: ${error.message}`);
    }
  },

  findNextRooms(creep: Creep): void {
    try {
      const exits = Game.map.describeExits(creep.room.name);
      if (!exits) {
        return;
      }
      creep.memory.nextRooms = Object.values(exits) as string[];
      console.log(`${creep.name} found exits: ${creep.memory.nextRooms}`);
    } catch (error: any) {
      console.log(`Error in findNextRooms: ${error.message}`);
    }
  },

  exploreNextRoom(creep: Creep): void {
    if (!creep.memory.nextRooms || creep.memory.nextRooms.length === 0) {
      this.findNextRooms(creep);
    }

    if (creep.memory.nextRooms && creep.memory.nextRooms.length > 0) {
      if (
        !creep.memory.targetRoom ||
        creep.memory.targetRoom === creep.room.name
      ) {
        const nextRoomName = creep.memory.nextRooms[0];
        creep.memory.targetRoom = nextRoomName;
        const exitDir = Game.map.findExit(creep.room, nextRoomName) as any;

        if (exitDir !== ERR_NO_PATH) {
          const exit = creep.pos.findClosestByPath(exitDir);
          if (exit) {
            console.log(`${creep.name} moving to exit at ${exit}`);
            creep.memory.exit = exit as RoomPosition;
          }
        }
      }

      if (creep.memory.exit) {
        if (creep.room.name !== creep.memory.targetRoom) {
          console.log(
            `${creep.name} using moveTo to exit room ${creep.room.name}`
          );
          const moveResult = creep.moveTo(creep.memory.exit, {
            visualizePathStyle: { stroke: "#ffaa00" },
            reusePath: 50,
          }) as any;
          if (moveResult === ERR_NO_PATH || moveResult === ERR_INVALID_ARGS) {
            console.log(
              `${creep.name} encountered an error moving to exit: ${moveResult}`
            );
            creep.memory.exit = undefined;
          }
        } else {
          console.log(`${creep.name} reached target room ${creep.room.name}`);
          creep.memory.nextRooms.shift();
          creep.memory.targetRoom = undefined;
          creep.memory.exit = undefined;
          creep.memory.path = [];
        }
      }
    }
  },

  claimController(creep: Creep, controller: StructureController): void {
    if (creep.pos.inRangeTo(controller, 1)) {
      const claimResult = creep.claimController(controller);
      if (claimResult === OK) {
        console.log(`Controller in ${creep.room.name} claimed successfully.`);
        creep.memory.buildingSpawn = true;
        creep.memory.targetId = null;
      } else {
        console.log(
          `Failed to claim controller in ${creep.room.name}: ${claimResult}`
        );
      }
    } else {
      const moveResult = creep.moveTo(controller, {
        visualizePathStyle: { stroke: "#ffffff" },
        reusePath: 50,
      }) as any;
      if (moveResult === ERR_NO_PATH || moveResult === ERR_INVALID_ARGS) {
        console.log(
          `${creep.name} encountered an error moving to controller: ${moveResult}`
        );
      }
    }
  },

  buildOrFinishSpawn(creep: Creep, room: Room): void {
    if (creep.store[RESOURCE_ENERGY] === 0) {
      this.harvestEnergy(creep);
    } else {
      const constructionSite = room.find(FIND_CONSTRUCTION_SITES, {
        filter: (site) => site.structureType === STRUCTURE_SPAWN,
      })[0];

      if (constructionSite) {
        const moveResult = creep.moveTo(constructionSite, {
          visualizePathStyle: { stroke: "#ffffff" },
          reusePath: 50,
        }) as any;
        if (moveResult === ERR_NOT_IN_RANGE) {
          console.log(
            `${creep.name} moving to construction site at ${constructionSite.pos}`
          );
        } else if (moveResult !== OK) {
          console.log(
            `${creep.name} encountered an error moving to construction site: ${moveResult}`
          );
        }
        creep.build(constructionSite);
      } else {
        const result = buildService.buildSpawn(room) as any;
        if (result === OK) {
          console.log(
            `Construction site for spawn created successfully in ${room.name}.`
          );
        } else {
          console.log(
            `Error creating construction site for spawn in ${room.name}: ${result}`
          );
        }
      }

      if (room.find(FIND_MY_SPAWNS).length > 0) {
        creep.memory.buildingSpawn = false;
        this.exploreNextRoom(creep);
      }
    }
  },

  harvestEnergy(creep: Creep): void {
    const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
    if (source) {
      const moveResult = creep.moveTo(source, {
        visualizePathStyle: { stroke: "#ffaa00" },
        reusePath: 50,
      }) as any;
      if (moveResult === ERR_NOT_IN_RANGE) {
        console.log(`${creep.name} moving to source at ${source.pos}`);
      } else if (moveResult !== OK) {
        console.log(
          `${creep.name} encountered an error moving to source: ${moveResult}`
        );
      }
      creep.harvest(source);
    }
  },
};

export default scoutRole;
