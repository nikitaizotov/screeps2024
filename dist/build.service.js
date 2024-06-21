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
  firstStructurePos: null,

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
      this.connectFirstStructure();
      this.buildRoadsAroundStructures();
    }
    // if (Game.time % 145 === 0) {
    //   this.checkFirstStructure();
    // }

    // if (Game.time % 5 === 0) {
    //   this.blockExits();
    // }
  },

  planRoads: function () {
    if (!Memory.cachedPaths) {
      Memory.cachedPaths = [];
    }
    if (!Memory.connectedPoints) {
      Memory.connectedPoints = {};
    }

    let rooms = Game.rooms;
    let allSpawns = [];

    // Collect all spawns in the game
    for (let roomName in rooms) {
      let room = rooms[roomName];
      let spawns = room.find(FIND_MY_SPAWNS);
      for (let spawn of spawns) {
        allSpawns.push(spawn.pos);
      }
    }

    function hashPos(pos) {
      return `${pos.roomName}_${pos.x}_${pos.y}`;
    }

    function addConnection(pos1, pos2) {
      let key1 = hashPos(pos1);
      let key2 = hashPos(pos2);
      if (!Memory.connectedPoints[key1]) {
        Memory.connectedPoints[key1] = [];
      }
      Memory.connectedPoints[key1].push(key2);
    }

    function isConnected(pos1, pos2) {
      let key1 = hashPos(pos1);
      let key2 = hashPos(pos2);
      return (
        Memory.connectedPoints[key1] &&
        Memory.connectedPoints[key1].includes(key2)
      );
    }

    function checkAndRepairRoad() {
      for (let posData of Memory.cachedPaths) {
        let pos = new RoomPosition(posData.x, posData.y, posData.roomName);
        let room = Game.rooms[pos.roomName];
        if (room) {
          let structures = room.lookForAt(LOOK_STRUCTURES, pos.x, pos.y);
          let hasRoad = structures.some(
            (s) => s.structureType === STRUCTURE_ROAD
          );

          if (!hasRoad) {
            let constructionSites = room.lookForAt(
              LOOK_CONSTRUCTION_SITES,
              pos.x,
              pos.y
            );
            let hasConstructionSite = constructionSites.some(
              (s) => s.structureType === STRUCTURE_ROAD
            );

            if (!hasConstructionSite) {
              room.createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);
            }
          }
        }
      }
    }

    function planRoadBetween(pos1, pos2) {
      if (isConnected(pos1, pos2)) return;

      let path = PathFinder.search(
        pos1,
        { pos: pos2, range: 1 },
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

            return costs;
          },
        }
      ).path;

      Memory.cachedPaths.push(
        ...path.map((pos) => ({ x: pos.x, y: pos.y, roomName: pos.roomName }))
      );

      for (let pos of path) {
        Game.rooms[pos.roomName].createConstructionSite(
          pos.x,
          pos.y,
          STRUCTURE_ROAD
        );
      }

      addConnection(pos1, pos2);
    }

    // Plan roads within each room
    for (let roomName in rooms) {
      let room = rooms[roomName];
      let keyPoints = [];

      // Add spawn positions
      let spawns = room.find(FIND_MY_SPAWNS);
      for (let spawn of spawns) {
        keyPoints.push(spawn.pos);
      }

      // Add source positions
      let sources = room.find(FIND_SOURCES);
      for (let source of sources) {
        keyPoints.push(source.pos);
      }

      // Add controller position
      let controller = room.controller;
      if (controller) {
        keyPoints.push(controller.pos);
      }

      // Plan roads between key points in the same room
      for (let i = 0; i < keyPoints.length; i++) {
        for (let j = i + 1; j < keyPoints.length; j++) {
          planRoadBetween(keyPoints[i], keyPoints[j]);
        }
      }
    }

    // Plan roads between spawns in different rooms
    for (let i = 0; i < allSpawns.length; i++) {
      for (let j = i + 1; j < allSpawns.length; j++) {
        if (allSpawns[i].roomName !== allSpawns[j].roomName) {
          planRoadBetween(allSpawns[i], allSpawns[j]);
        }
      }
    }

    // Check and repair existing roads
    checkAndRepairRoad();
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
              if (!this.firstStructurePos) {
                this.firstStructurePos = { x: x, y: y, roomName: room.name };
              }
              if (structuresPlanned >= maxCount) {
                return;
              }
            }
          }
        }
      }
    }
  },

  connectFirstStructure: function () {
    let exitZones = this.exitZones;
    let cachedPaths = Memory.cachedPaths;

    for (let roomName in Game.rooms) {
      let room = Game.rooms[roomName];
      if (room.controller && room.controller.my) {
        const roomCenter = new RoomPosition(25, 25, room.name);
        let maxRadius = 25;

        try {
          for (let radius = 1; radius <= maxRadius; radius++) {
            let found = false;
            for (let xOffset = -radius; xOffset <= radius; xOffset++) {
              for (let yOffset = -radius; yOffset <= radius; yOffset++) {
                if (
                  Math.abs(xOffset) !== radius &&
                  Math.abs(yOffset) !== radius
                ) {
                  continue;
                }

                let x = roomCenter.x + xOffset;
                let y = roomCenter.y + yOffset;

                if (x < 0 || x > 49 || y < 0 || y > 49) {
                  continue;
                }

                if (this.isRestrictedZone(exitZones, cachedPaths, x, y)) {
                  continue;
                }

                let constructionSites = room.lookForAt(
                  LOOK_CONSTRUCTION_SITES,
                  x,
                  y
                );

                let structures = room.lookForAt(LOOK_STRUCTURES, x, y);

                let hasExtensionConstructionSite = constructionSites.some(
                  (site) => site.structureType === STRUCTURE_EXTENSION
                );

                let hasExtension = structures.some(
                  (structure) => structure.structureType === STRUCTURE_EXTENSION
                );

                if (hasExtensionConstructionSite || hasExtension) {
                  this.buildRoadsFromFirstStructure(
                    room,
                    new RoomPosition(x, y, roomName)
                  );
                  found = true;
                  break;
                }
              }
              if (found) break;
            }
          }
        } catch (error) {
          console.log(`Error connectFirstStructure in ${roomName}: ${error}`);
        }
      }
    }
  },

  buildRoadsAroundStructures: function () {
    for (let roomName in Game.rooms) {
      let room = Game.rooms[roomName];
      if (room.controller && room.controller.my) {
        try {
          const structures = room.find(FIND_STRUCTURES, {
            filter: (structure) => {
              return (
                structure.structureType !== STRUCTURE_ROAD &&
                structure.structureType !== STRUCTURE_WALL &&
                structure.structureType !== STRUCTURE_RAMPART
              );
            },
          });

          structures.forEach((structure) => {
            let x = structure.pos.x;
            let y = structure.pos.y;

            // Координаты вокруг структуры
            let positions = [
              [x - 1, y - 1],
              [x, y - 1],
              [x + 1, y - 1],
              [x - 1, y],
              [x + 1, y],
              [x - 1, y + 1],
              [x, y + 1],
              [x + 1, y + 1],
            ];

            positions.forEach((pos) => {
              let [x, y] = pos;
              // Проверяем, что координаты внутри границ комнаты
              if (x >= 0 && x <= 49 && y >= 0 && y <= 49) {
                let look = room.lookAt(x, y);
                let isRoadPresent = look.some(
                  (lookObject) =>
                    lookObject.type === LOOK_STRUCTURES &&
                    lookObject.structure.structureType === STRUCTURE_ROAD
                );
                let isConstructionSitePresent = look.some(
                  (lookObject) =>
                    lookObject.type === LOOK_CONSTRUCTION_SITES &&
                    lookObject.constructionSite.structureType === STRUCTURE_ROAD
                );
                let isObstacle = look.some(
                  (lookObject) =>
                    lookObject.type === LOOK_TERRAIN &&
                    lookObject.terrain === "wall"
                );

                // Если дороги нет и это не стена, ставим строительство дороги
                if (
                  !isRoadPresent &&
                  !isConstructionSitePresent &&
                  !isObstacle
                ) {
                  room.createConstructionSite(x, y, STRUCTURE_ROAD);
                }
              }
            });
          });
        } catch {
          console.log(
            `Error buildRoadsAroundStructures in ${roomName}: ${error}`
          );
        }
      }
    }
  },

  buildRoadsFromFirstStructure: function (room, startPos) {
    console.log("buildRoadsFromFirstStructure");
    let sources = room.find(FIND_SOURCES);
    let controller = room.controller;

    let targets = sources.map((source) => source.pos);
    targets.push(controller.pos);

    for (let target of targets) {
      let path = PathFinder.search(
        startPos,
        { pos: target, range: 1 },
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

            return costs;
          },
        }
      ).path;

      for (let pos of path) {
        room.createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);
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
