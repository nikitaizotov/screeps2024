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

enum scoutJobs {
  MOVING_TO_NEXT_ROOM,
  CLAIMING,
  BUILDING,
}

const scoutJobList = {
  [scoutJobs.MOVING_TO_NEXT_ROOM]: scoutJobs.MOVING_TO_NEXT_ROOM,
  [scoutJobs.CLAIMING]: scoutJobs.CLAIMING,
  [scoutJobs.BUILDING]: scoutJobs.BUILDING,
};

interface Memory {
  scoutRooms: { [roomName: string]: ScoutRoomMemory };
}

declare const Memory: Memory;

export const scoutRole: CreepRole = {
  creepsPerRoom: 0,
  namePrefix: "Scout",
  memoryKey: "scout",
  bodyParts: [MOVE, WORK, WORK, CARRY, CARRY, CARRY, CLAIM],
  baseBodyParts: [MOVE],
  maxBodyPartsMultiplier: 0,

  run(creep: Creep): void {
    try {
      if (creep.spawning) {
        return;
      }

      if (creep.memory.path) {
        creepService.drawPath(creep);
      }

      if (!creep.memory.initialized) {
        this.initializeMemory(creep);
        creep.memory.job = scoutJobs.MOVING_TO_NEXT_ROOM;
      }

      switch (creep.memory.job) {
        case scoutJobs.MOVING_TO_NEXT_ROOM:
          this.moveToNextRoom(creep);
          break;
        case scoutJobs.CLAIMING:
          this.claim(creep);
          break;
        case scoutJobs.BUILDING:
          this.buildOrFinishSpawn(creep);
          break;
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

  moveToNextRoom(creep: Creep): void {
    try {
      if (!creep.memory.targetRoom || !creep.memory.path) {
        this.getPathToNextRoom(creep);
      } else {
        this.moveToNextRoomController(creep);
      }
    } catch (error: any) {
      console.log(`Scout error moveToNextRoom: ${error}`);
    }
  },

  getPathToNextRoom: function (creep: Creep): void {
    const rooms: string[] = creep.memory.nextRooms as string[];
    const roomName = rooms.shift();

    if (roomName && creep.room !== (roomName as any)) {
      const pos = new RoomPosition(25, 25, roomName);
      creep.memory.targetRoom = roomName;
      creep.memory.path = creep.pos.findPathTo(pos);
    }
  },

  moveToNextRoomController: function (creep: Creep): void {
    if (creep.memory.targetRoom === creep.room.name) {
      const target = creep.room.find(FIND_CONSTRUCTION_SITES, {
        filter: (site) => site.structureType === STRUCTURE_SPAWN,
      })[0];

      if (target) {
        creep.memory.job = scoutJobs.BUILDING;
        creep.memory.building = false;
        creep.memory.path = undefined;
        creep.memory.targetId = null;
        creep.memory.path = creep.pos.findPathTo(target);
      } else {
        creep.memory.job = scoutJobs.CLAIMING;
        this.findPathToController(creep);
      }
    }

    if (creep.memory.path) {
      creep.moveByPath(creep.memory.path);
    } else {
      this.getPathToNextRoom(creep);
    }
  },

  claim: function (creep: Creep): void {
    if (creep.room.controller) {
      const controller = creep.room.controller;
      const action = creep.claimController(controller);

      if (controller.my) {
        creep.memory.job = scoutJobs.BUILDING;
        return;
      }

      if (action === ERR_NOT_IN_RANGE) {
        if (creep.memory.path) {
          creep.moveByPath(creep.memory.path);
        } else {
          this.findPathToController(creep);
        }
      }
    }
  },

  findPathToController: function (creep: Creep): void {
    const controller = creep.room.controller;
    if (controller && !controller.my) {
      creep.memory.path = creep.pos.findPathTo(controller);
    }
  },

  buildOrFinishSpawn(creep: Creep) {
    if (
      creep.memory.building === undefined ||
      (creep.memory.building && creep.store[RESOURCE_ENERGY] == 0)
    ) {
      creep.memory.building = false;
      creep.memory.path = undefined;
      creep.memory.targetId = null;
      creep.say("🔄 harvest");
    }
    // Check if the creep should start transferring energy.
    if (!creep.memory.building && creep.store.getFreeCapacity() == 0) {
      creep.memory.building = true;
      creep.memory.path = undefined;
      creep.memory.targetId = null;
      creep.say("⚡ transfer");
    }
    if (creep.memory.building) {
      this.transferEnergy(creep);
    } else {
      this.harvestEnergy(creep);
    }
  },

  harvestEnergy(creep: Creep): void {
    if (!creep.memory.path) {
      creepService.getPathToSource(creep);
    } else {
      creepService.moveAndHarvest(creep);
    }
  },

  transferEnergy(creep: Creep): void {
    if (!creep.memory.path) {
      //creepService.findConstructionSite(creep);

      // const target = creep.room.find(FIND_CONSTRUCTION_SITES, {
      //   filter: (site) => site.structureType === STRUCTURE_SPAWN,
      // })[0];

      const target =
        creep.room.controller?.level === 1
          ? creep.room.controller
          : creep.room.find(FIND_CONSTRUCTION_SITES, {
              filter: (site) => site.structureType === STRUCTURE_SPAWN,
            })[0];

      if (target) {
        creep.memory.path = creep.pos.findPathTo(target);
        creep.memory.targetId = target.id;
      } else {
        const spawns = creep.room.find(FIND_MY_SPAWNS);
        if (spawns) {
          this.getPathToNextRoom(creep);
        }
      }
    } else {
      this.moveAndTransfer(creep);
    }
  },

  moveAndTransfer: function (creep: Creep): void {
    // const target = creep.room.find(FIND_CONSTRUCTION_SITES, {
    //   filter: (site) => site.structureType === STRUCTURE_SPAWN,
    // })[0];

    const target = Game.getObjectById(creep.memory.targetId as any);

    if (!target) {
      // The target may have been completed, so we check this and clear the memory.
      if (creep.memory.targetId) {
        const constructedStructure = Game.getObjectById(
          creep.memory.targetId as Id<Structure>
        );
        if (constructedStructure) {
          console.log(
            "Construction completed:",
            constructedStructure.structureType
          );
        } else {
          console.log("Target construction site not found and not completed.");
        }

        const result = buildService.buildSpawn(creep.room) as any;
        if (result === OK) {
          console.log(
            `Construction site for spawn created successfully in ${creep.room.name}.`
          );
        } else {
          console.log(
            `Error creating construction site for spawn in ${creep.room.name}: ${result}`
          );
        }

        creep.memory.building = false;
        creep.memory.path = undefined;
        creep.memory.targetId = null;
      }
      return;
    }

    let action;
    const controller = creep.room.controller as StructureController;

    if (creep.memory.targetId === controller.id) {
      action = creep.upgradeController(controller);
    } else {
      action = creep.build(target as any);
    }

    if (action === ERR_NOT_IN_RANGE) {
      const moveResult = creep.moveByPath(creep.memory.path as PathStep[]);

      if (moveResult !== OK && moveResult !== ERR_TIRED) {
        console.log("Move by path failed, error:", moveResult);
        creep.memory.path = undefined;
        creep.memory.targetId = null;
      }
    } else if (action === ERR_INVALID_TARGET || action === ERR_NO_BODYPART) {
      creep.memory.path = undefined;
      creep.memory.targetId = null;
    } else if (action === OK) {
      if (creep.memory.targetId !== controller.id) {
        // Check if the construction is completed.

        const spawn = target as any;

        if (!spawn.progressTotal || spawn.progress >= spawn.progressTotal) {
          creep.memory.building = false;
          creep.memory.path = undefined;
          creep.memory.targetId = null;
          creep.memory.job = scoutJobs.MOVING_TO_NEXT_ROOM;
        }
      }
    }
  },
};

export default scoutRole;
