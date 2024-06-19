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
    if (Game.time % 15000 === 0) {
      this.planRoads();
    }
    if (Game.time % 30 === 0) {
      this.processBuildOrder();
    }
  },

  planRoads: function () {
    this.cachedPaths = [];

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

              room.find(FIND_CREEPS).forEach(function (creep) {
                costs.set(creep.pos.x, creep.pos.y, 0xff);
              });

              return costs;
            },
          }
        ).path;

        this.cachedPaths.push(...path);

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
    this.exitZones = this.getExitZones(room);

    for (let i = 0; i < this.buildOrder.length; i++) {
      const structureType = this.buildOrder[i];
      const availableCount = this.getAvailableStructureCount(
        room,
        structureType
      );

      if (availableCount > 0) {
        this.buildStructure(room, structureType, availableCount);
        break;
      }
    }
  },

  buildStructure: function (room, type, maxCount) {
    let structuresPlanned = 0;
    let spawns = room.find(FIND_MY_SPAWNS);
    if (spawns.length === 0) return;

    let spawnPos = spawns[0].pos;

    for (let radius = 1; structuresPlanned < maxCount; radius += 4) {
      for (let xOffset = -radius; xOffset <= radius; xOffset += 4) {
        for (let yOffset = -radius; yOffset <= radius; yOffset += 4) {
          let x = spawnPos.x + xOffset;
          let y = spawnPos.y + yOffset;

          if (this.isRestrictedZone(room, x, y)) {
            continue;
          }

          let positions = [
            { x: x, y: y },
            { x: x + 1, y: y },
            { x: x, y: y + 1 },
            { x: x + 1, y: y + 1 },
          ];

          let canBuildGroup = positions.every((pos) =>
            this.isValidConstructionPosition(room, pos.x, pos.y)
          );

          if (canBuildGroup) {
            positions.forEach((pos) => {
              if (room.createConstructionSite(pos.x, pos.y, type) === OK) {
                structuresPlanned++;
                if (structuresPlanned >= maxCount) {
                  return;
                }
              }
            });
          }
        }
      }
    }
  },

  isRestrictedZone: function (room, x, y) {
    for (let zone of this.exitZones) {
      if (
        x >= zone.xMin &&
        x <= zone.xMax &&
        y >= zone.yMin &&
        y <= zone.yMax
      ) {
        return true;
      }
    }

    for (let path of this.cachedPaths) {
      for (let pos of path) {
        if (Math.abs(pos.x - x) <= 1 && Math.abs(pos.y - y) <= 1) {
          return true;
        }
      }
    }

    return false;
  },

  isValidConstructionPosition: function (room, x, y) {
    if (x <= 0 || y <= 0 || x >= 49 || y >= 49) return false;
    if (room.lookForAt(LOOK_TERRAIN, x, y)[0] === "wall") return false;
    if (room.lookForAt(LOOK_STRUCTURES, x, y).length > 0) return false;
    if (room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y).length > 0) return false;

    return true;
  },

  getKeyPoints: function (room) {
    let keyPoints = [];

    let sources = room.find(FIND_SOURCES);
    for (let source of sources) {
      keyPoints.push(source.pos);
    }

    if (room.controller) {
      keyPoints.push(room.controller.pos);
    }

    let spawns = room.find(FIND_MY_SPAWNS);
    for (let spawn of spawns) {
      keyPoints.push(spawn.pos);
    }

    return keyPoints;
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
};
