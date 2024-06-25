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
  creepsPerRoom: 1,
  namePrefix: "Scout",
  memoryKey: "scout",
  bodyParts: [MOVE, MOVE, MOVE, WORK, CARRY, CLAIM],

  run(creep: Creep): void {
    try {
      if (creep.spawning) {
        return;
      }

      if (!creep.memory.initialized) {
        this.initializeMemory(creep);
      }

      const room = creep.room;
      const controller = room.controller;

      if (controller && controller.my) {
        if (Memory.scoutRooms[room.name]) {
          delete Memory.scoutRooms[room.name];
        }
        return;
      }

      if (controller && !controller.my && !controller.owner) {
        if (this.canClaimController()) {
          if (creep.pos.inRangeTo(controller, 1)) {
            const claimResult = creep.claimController(controller);
            if (claimResult === OK) {
              creep.memory.buildingSpawn = true;
              creep.memory.targetId = null;
            }
          } else {
            if (!creep.memory.path || creep.memory.targetId !== controller.id) {
              creep.memory.path = creep.pos.findPathTo(controller, {
                ignoreCreeps: true,
              }) as PathStep[];
              creep.memory.targetId = controller.id;
            }
            creep.moveByPath(creep.memory.path);
          }
          return;
        }
      }

      if (creep.memory.buildingSpawn) {
        if (creep.store[RESOURCE_ENERGY] === 0) {
          this.harvestEnergy(creep);
        } else {
          const constructionSite = room.find(FIND_CONSTRUCTION_SITES, {
            filter: (site) => site.structureType === STRUCTURE_SPAWN,
          })[0];

          if (constructionSite) {
            if (creep.build(constructionSite) === ERR_NOT_IN_RANGE) {
              creep.moveTo(constructionSite);
            }
          } else {
            const result = buildService.buildSpawn(room) as any;
            if (result === OK) {
              console.log("Construction site for spawn created successfully.");
            } else {
              console.log(
                "Error creating construction site for spawn:",
                result
              );
            }
          }

          if (room.find(FIND_MY_SPAWNS).length > 0) {
            creep.memory.buildingSpawn = false;
            this.exploreRoom(creep);
          }
        }
        return;
      }

      this.exploreRoom(creep);

      if (creep.memory.nextRooms && creep.memory.nextRooms.length > 0) {
        const nextRoomName = creep.memory.nextRooms.shift() as string;
        creep.moveTo(new RoomPosition(25, 25, nextRoomName));
      } else {
        this.findNextRoom(creep);
      }
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
    } catch (error: any) {
      console.log(`Error in initializeMemory: ${error.message}`);
    }
  },

  canClaimController(): boolean {
    try {
      return Game.gcl.level > Object.keys(Game.rooms).length;
    } catch (error: any) {
      console.log(`Error in canClaimController: ${error.message}`);
      return false;
    }
  },

  exploreRoom(creep: Creep): void {
    try {
      const roomName = creep.room.name;
      if (!Memory.scoutRooms[roomName]) {
        Memory.scoutRooms[roomName] = {
          scouted: true,
          lastScouted: Game.time,
          empty: !creep.room.find(FIND_HOSTILE_CREEPS).length,
          attacked: false,
          attacker: null,
        };
      } else {
        Memory.scoutRooms[roomName].lastScouted = Game.time;
        if (
          Memory.scoutRooms[roomName].attacked === false &&
          creep.hits < creep.hitsMax
        ) {
          Memory.scoutRooms[roomName].attacked = true;
          const attackers = creep.room.find(FIND_HOSTILE_CREEPS);
          if (attackers.length > 0) {
            Memory.scoutRooms[roomName].attacker = attackers[0].owner.username;
          }
        }
      }
    } catch (error: any) {
      console.log(`Error in exploreRoom: ${error.message}`);
    }
  },

  findNextRoom(creep: Creep): void {
    try {
      const exits = Game.map.describeExits(creep.room.name);

      if (!exits) {
        return;
      }

      const nextRooms = Object.values(exits).filter((roomName) => {
        return !Memory.scoutRooms[roomName];
      });

      if (nextRooms.length === 0) {
        creep.memory.nextRooms = Object.values(exits) as string[];
      } else {
        creep.memory.nextRooms = nextRooms as string[];
      }
    } catch (error: any) {
      console.log(`Error in findNextRoom: ${error.message}`);
    }
  },

  harvestEnergy(creep: Creep): void {
    if (!creep.memory.path) {
      creepService.getPathToSource(creep);
    } else {
      creepService.moveAndHarvest(creep);
    }
  },
};

export default scoutRole;
