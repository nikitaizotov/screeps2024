module.exports = {
  structureCache: {},
  cachedPaths: [],
  exitZones: [],
  buildOrder: [
    STRUCTURE_EXTENSION,
    STRUCTURE_TOWER,
    STRUCTURE_STORAGE,
    STRUCTURE_TERMINAL,
    STRUCTURE_LAB,
    STRUCTURE_OBSERVER,
    STRUCTURE_NUKER,
    STRUCTURE_POWER_SPAWN,
  ],

  run: function () {
    if (!Memory.structureCache) {
      Memory.structureCache = {};
    }
    if (!Memory.cachedPaths) {
      Memory.cachedPaths = [];
    }
    if (!Memory.exitZones) {
      Memory.exitZones = {};
    }
    if (!Memory.roomTerrain) {
      Memory.roomTerrain = {};
    }

    if (Game.time % 15000 === 0) {
      this.planRoads();
    }
    if (Game.time % 90 === 0) {
      this.processBuildOrder();
    }

    // if (Game.time % 5 === 0) {
    //   this.blockExits();
    // }
  },

  planRoads: function () {
    Memory.cachedPaths = [];

    let keyPoints = [];

    for (let spawnName in Game.spawns) {
      keyPoints.push(Game.spawns[spawnName].pos);
    }

    let sources = Game.rooms[Object.keys(Game.rooms)[0]].find(FIND_SOURCES);
    for (let source of sources) {
      keyPoints.push(source.pos);
    }

    let controller = Game.rooms[Object.keys(Game.rooms)[0]].controller;
    keyPoints.push(controller.pos);

    for (let i = 0; i < keyPoints.length; i++) {
      for (let j = i + 1; j < keyPoints.length; j++) {
        let path = PathFinder.search(
          keyPoints[i],
          { pos: keyPoints[j], range: 1 },
          {
            plainCost: 2,
            swampCost: 10,
            roomCallback: function (roomName) {
              let room = Game.rooms[roomName];
              if (!room) return;
              let costs = new PathFinder.CostMatrix();

              room.find(FIND_STRUCTURES).forEach(function (struct) {
                if (struct.structureType === STRUCTURE_ROAD) {
                  costs.set(struct.pos.x, struct.pos.y, 1);
                } else if (
                  (struct.structureType !== STRUCTURE_CONTAINER &&
                    struct.structureType !== STRUCTURE_RAMPART) ||
                  !struct.my
                ) {
                  costs.set(struct.pos.x, struct.pos.y, 0xff);
                }
              });

              // room.find(FIND_CREEPS).forEach(function (creep) {
              //   costs.set(creep.pos.x, creep.pos.y, 0xff);
              // });

              return costs;
            },
          }
        ).path;

        Memory.cachedPaths.push(...path);

        for (let pos of path) {
          Game.rooms[pos.roomName].createConstructionSite(
            pos.x,
            pos.y,
            STRUCTURE_ROAD
          );
        }
      }
    }
  },

  processBuildOrder: function () {
    const room = Game.rooms[Object.keys(Game.rooms)[0]];

    if (!Memory.exitZones[room.name] || Game.time % 5000 === 0) {
      Memory.exitZones[room.name] = this.getExitZones(room);
    }
    this.exitZones = Memory.exitZones[room.name];

    if (!Memory.roomTerrain[room.name]) {
      Memory.roomTerrain[room.name] = this.cacheRoomTerrain(room.name);
    }
    this.roomTerrain = Memory.roomTerrain[room.name];

    for (let i = 0; i < this.buildOrder.length; i++) {
      const structureType = this.buildOrder[i];
      const availableCount = this.getAvailableStructureCount(
        room,
        structureType
      );

      if (availableCount > 0) {
        this.buildStructure(room, structureType, 1);
        break;
      }
    }
  },

  buildStructure: function (room, type, maxCount) {
    let structuresPlanned = 0;
    const roomCenter = new RoomPosition(25, 25, room.name);
    let exitZones = this.exitZones;
    let cachedPaths = Memory.cachedPaths;

    for (let radius = 1; structuresPlanned < maxCount; radius += 2) {
      for (let xOffset = -radius; xOffset <= radius; xOffset += 2) {
        for (let yOffset = -radius; yOffset <= radius; yOffset += 2) {
          let x = roomCenter.x + xOffset;
          let y = roomCenter.y + yOffset;

          if (this.isRestrictedZone(exitZones, cachedPaths, x, y)) {
            continue;
          }

          if (this.isValidConstructionPosition(room, x, y)) {
            if (room.createConstructionSite(x, y, type) === OK) {
              structuresPlanned++;
              if (structuresPlanned >= maxCount) {
                return;
              }
            }
          }
        }
      }
    }
  },

  isRestrictedZone: function (exitZones, cachedPaths, x, y) {
    for (let zone of exitZones) {
      if (
        x >= zone.xMin &&
        x <= zone.xMax &&
        y >= zone.yMin &&
        y <= zone.yMax
      ) {
        return true;
      }
    }

    for (let pos of cachedPaths) {
      if (Math.abs(pos.x - x) <= 1 && Math.abs(pos.y - y) <= 1) {
        return true;
      }
    }

    return false;
  },

  isValidConstructionPosition: function (room, x, y) {
    if (x <= 2 || y <= 2 || x >= 47 || y >= 47) return false;
    if (this.roomTerrain[x][y] === TERRAIN_MASK_WALL) return false;
    if (room.lookForAt(LOOK_STRUCTURES, x, y).length > 0) return false;
    if (room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y).length > 0) return false;

    return true;
  },

  cacheRoomTerrain: function (roomName) {
    const terrain = new Room.Terrain(roomName);
    let terrainData = [];

    for (let x = 0; x < 50; x++) {
      terrainData[x] = [];
      for (let y = 0; y < 50; y++) {
        terrainData[x][y] = terrain.get(x, y);
      }
    }

    return terrainData;
  },

  getExitZones: function (room) {
    let exitZones = [];
    const exitTypes = [
      FIND_EXIT_TOP,
      FIND_EXIT_RIGHT,
      FIND_EXIT_BOTTOM,
      FIND_EXIT_LEFT,
    ];

    for (const exitType of exitTypes) {
      const exitPositions = room.find(exitType);
      for (const pos of exitPositions) {
        exitZones.push({
          xMin: Math.max(0, pos.x - 5),
          xMax: Math.min(49, pos.x + 5),
          yMin: Math.max(0, pos.y - 5),
          yMax: Math.min(49, pos.y + 5),
        });
      }
    }

    return exitZones;
  },

  getAvailableStructureCount: function (room, structureType) {
    const controllerLevel = room.controller.level;
    const maxStructures = CONTROLLER_STRUCTURES[structureType][controllerLevel];
    const existingStructures = room.find(FIND_MY_STRUCTURES, {
      filter: { structureType: structureType },
    }).length;
    const constructionSites = room.find(FIND_CONSTRUCTION_SITES, {
      filter: { structureType: structureType },
    }).length;

    return maxStructures - existingStructures - constructionSites;
  },

  blockExits: function () {
    const exitTypes = [
      FIND_EXIT_TOP,
      FIND_EXIT_RIGHT,
      FIND_EXIT_BOTTOM,
      FIND_EXIT_LEFT,
    ];

    for (const roomName in Game.rooms) {
      const room = Game.rooms[roomName];

      for (const exitType of exitTypes) {
        const exitPositions = room.find(exitType);
        for (const pos of exitPositions) {
          const blockPositions = this.getBlockingPositions(pos, exitType);
          for (const blockPos of blockPositions) {
            if (this.isValidBlockingPosition(room, blockPos)) {
              const look = room.lookAt(blockPos.x, blockPos.y);
              let canBuild = true;

              for (const lookObject of look) {
                if (
                  lookObject.type === LOOK_STRUCTURES ||
                  lookObject.type === LOOK_CONSTRUCTION_SITES
                ) {
                  canBuild = false;
                  break;
                }
              }

              if (canBuild) {
                const result = room.createConstructionSite(
                  blockPos.x,
                  blockPos.y,
                  STRUCTURE_WALL
                );
                if (result !== OK) {
                  console.log(
                    `Failed to create construction site at (${blockPos.x}, ${blockPos.y}): ${result}`
                  );
                }
              }
            }
          }

          // Add rampart in the center of the exit
          const rampPos = new RoomPosition(pos.x, pos.y, room.name);
          if (this.isValidRampartPosition(room, rampPos)) {
            const existingRamp = room
              .lookForAt(LOOK_STRUCTURES, rampPos)
              .find((s) => s.structureType === STRUCTURE_RAMPART && s.my);
            if (existingRamp) {
              existingRamp.destroy();
            }
            const rampResult = room.createConstructionSite(
              rampPos,
              STRUCTURE_RAMPART
            );
            if (rampResult !== OK) {
              console.log(
                `Failed to create rampart at (${rampPos.x}, ${rampPos.y}): ${rampResult}`
              );
            }
          }
        }
      }
    }
  },

  getBlockingPositions: function (pos, exitType) {
    const positions = [];

    if (exitType === FIND_EXIT_TOP && pos.y < 48) {
      positions.push({ x: pos.x, y: pos.y + 2 });
      if (pos.x > 2) positions.push({ x: pos.x - 1, y: pos.y + 2 });
      if (pos.x < 47) positions.push({ x: pos.x + 1, y: pos.y + 2 });
      if (pos.x > 1) positions.push({ x: pos.x - 2, y: pos.y + 2 });
      if (pos.x < 48) positions.push({ x: pos.x + 2, y: pos.y + 2 });
    } else if (exitType === FIND_EXIT_RIGHT && pos.x > 1) {
      positions.push({ x: pos.x - 2, y: pos.y });
      if (pos.y > 2) positions.push({ x: pos.x - 2, y: pos.y - 1 });
      if (pos.y < 47) positions.push({ x: pos.x - 2, y: pos.y + 1 });
      if (pos.y > 1) positions.push({ x: pos.x - 2, y: pos.y - 2 });
      if (pos.y < 48) positions.push({ x: pos.x - 2, y: pos.y + 2 });
    } else if (exitType === FIND_EXIT_BOTTOM && pos.y > 1) {
      positions.push({ x: pos.x, y: pos.y - 2 });
      if (pos.x > 2) positions.push({ x: pos.x - 1, y: pos.y - 2 });
      if (pos.x < 47) positions.push({ x: pos.x + 1, y: pos.y - 2 });
      if (pos.x > 1) positions.push({ x: pos.x - 2, y: pos.y - 2 });
      if (pos.x < 48) positions.push({ x: pos.x + 2, y: pos.y - 2 });
    } else if (exitType === FIND_EXIT_LEFT && pos.x < 48) {
      positions.push({ x: pos.x + 2, y: pos.y });
      if (pos.y > 2) positions.push({ x: pos.x + 2, y: pos.y - 1 });
      if (pos.y < 47) positions.push({ x: pos.x + 2, y: pos.y + 1 });
      if (pos.y > 1) positions.push({ x: pos.x + 2, y: pos.y - 2 });
      if (pos.y < 48) positions.push({ x: pos.x + 2, y: pos.y + 2 });
    }

    return positions;
  },

  isValidBlockingPosition: function (room, pos) {
    if (pos.x < 1 || pos.x > 48 || pos.y < 1 || pos.y > 48) {
      return false;
    }
    const terrain = Game.map.getRoomTerrain(room.name);
    if (terrain.get(pos.x, pos.y) === TERRAIN_MASK_WALL) {
      return false;
    }
    return true;
  },

  isValidRampartPosition: function (room, pos) {
    if (pos.x < 1 || pos.x > 48 || pos.y < 1 || pos.y > 48) {
      return false;
    }
    const terrain = Game.map.getRoomTerrain(room.name);
    return terrain.get(pos.x, pos.y) !== TERRAIN_MASK_WALL;
  },
};
