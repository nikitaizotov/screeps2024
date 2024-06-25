const creepService = require("creep.service");
const buildService = require("build.service");

module.exports = {
  creepsPerRoom: 1,
  namePrefix: "Scout",
  memoryKey: "scout",
  bodyParts: [MOVE, MOVE, MOVE, WORK, CARRY, CLAIM],

  run: function (creep) {
    try {
      if (creep.spawning) {
        return;
      }

      // Initialize memory if not already done.
      if (!creep.memory.initialized) {
        this.initializeMemory(creep);
      }

      const room = creep.room;
      const controller = room.controller;

      // If the room is mine and recorded in memory, remove it.
      if (controller && controller.my) {
        if (Memory.scoutRooms[room.name]) {
          delete Memory.scoutRooms[room.name];
        }
        return;
      }

      // Try to claim the controller if it's neutral and we can claim more.
      if (controller && !controller.my && !controller.owner) {
        if (this.canClaimController()) {
          if (creep.pos.inRangeTo(controller, 1)) {
            const claimResult = creep.claimController(controller);
            if (claimResult === OK) {
              // Use buildService to build spawn after claiming the controller.
              creep.memory.buildingSpawn = true;
              creep.memory.targetId = null; // Clear target to avoid conflicts
            }
          } else {
            if (!creep.memory.path || creep.memory.targetId !== controller.id) {
              creep.memory.path = creep.pos.findPathTo(controller, {
                ignoreCreeps: true,
              });
              creep.memory.targetId = controller.id;
            }
            creep.moveByPath(creep.memory.path);
          }
          return;
        }
      }

      // If building spawn, gather resources and build.
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
            const result = buildService.buildSpawn(room); // Используем buildService для создания спауна
            if (result === OK) {
              console.log("Construction site for spawn created successfully.");
            } else {
              console.log(
                "Error creating construction site for spawn:",
                result
              );
            }
          }

          // Check if spawn is completed and reset memory
          if (room.find(FIND_MY_SPAWNS).length > 0) {
            creep.memory.buildingSpawn = false;
            this.exploreRoom(creep); // Continue exploring
          }
        }
        return;
      }

      // Explore the current room and update memory.
      this.exploreRoom(creep);

      // Move to the next room in the path if available.
      if (creep.memory.path && creep.memory.path.length > 0) {
        const nextRoomName = creep.memory.path.shift();
        creep.moveTo(new RoomPosition(25, 25, nextRoomName));
      } else {
        // Find a new room to scout.
        this.findNextRoom(creep);
      }
    } catch (error) {
      console.log(`Error in Scout run: ${error.message}`);
    }
  },

  initializeMemory: function (creep) {
    try {
      // Initialize global memory for scouted rooms if not already done.
      if (!Memory.scoutRooms) {
        Memory.scoutRooms = {};
      }
      creep.memory.initialized = true;
    } catch (error) {
      console.log(`Error in initializeMemory: ${error.message}`);
    }
  },

  canClaimController: function () {
    try {
      // Check if we can claim more controllers based on GCL level.
      return Game.gcl.level > Object.keys(Game.rooms).length;
    } catch (error) {
      console.log(`Error in canClaimController: ${error.message}`);
      return false;
    }
  },

  exploreRoom: function (creep) {
    try {
      const roomName = creep.room.name;
      // Record the room details in memory if not already done.
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
        // Update memory if the creep was attacked in this room.
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
    } catch (error) {
      console.log(`Error in exploreRoom: ${error.message}`);
    }
  },

  findNextRoom: function (creep) {
    try {
      // Get exits from the current room and find the next room to scout.
      const exits = Game.map.describeExits(creep.room.name);

      if (!exits) {
        return;
      }

      creep.memory.path = Object.values(exits).filter((roomName) => {
        return !Memory.scoutRooms[roomName];
      });

      // If all neighboring rooms are scouted, move to any neighboring room.
      if (creep.memory.path.length === 0) {
        creep.memory.path = Object.values(exits);
      }
    } catch (error) {
      console.log(`Error in findNextRoom: ${error.message}`);
    }
  },

  harvestEnergy: function (creep) {
    if (!creep.memory.path) {
      creepService.getPathToSource(creep);
    } else {
      creepService.moveAndHarvest(creep);
    }
  },
};
