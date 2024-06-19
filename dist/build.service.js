module.exports = {
  buildOrder: [STRUCTURE_EXTENSION, STRUCTURE_TOWER],
  run: function () {
    if (Game.time % 15000 === 0) {
      this.planRoads();
    }
    if (Game.time % 30 === 0) {
      this.processBuildOrder();
    }
  },
  processBuildOrder: function () {
    const room = Game.rooms[Object.keys(Game.rooms)[0]];

    for (let i = 0; i < this.buildOrder.length; i++) {
      const structureType = this.buildOrder[i];
      const availableCount = this.getAvailableStructureCount(
        room,
        structureType
      );

      if (availableCount > 0) {
        this.buildStructure(structureType, availableCount);
        break;
      }
    }
  },
  planRoads: function () {
    let keyPoints = this.getKeyPoints(Game.rooms[Object.keys(Game.rooms)[0]]);
    this.cachedPaths = [];

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
  buildStructure: function (type, maxCount) {
    let room = Game.rooms[Object.keys(Game.rooms)[0]];
    let spawns = room.find(FIND_MY_SPAWNS);
    if (spawns.length === 0) return;

    let spawnPos = spawns[0].pos;
    let structuresPlanned = 0;

    let availableCount = this.getAvailableStructureCount(room, type);

    let countToBuild = Math.min(maxCount, availableCount);
    let radius = 1;
    while (structuresPlanned < countToBuild) {
      let positions = this.getDoubleCirclePositions(spawnPos, radius);

      for (let pos of positions) {
        if (this.isValidConstructionPosition(room, pos.x, pos.y)) {
          if (room.createConstructionSite(pos.x, pos.y, type) === OK) {
            structuresPlanned++;
            if (structuresPlanned >= countToBuild) {
              return;
            }
          }
        }
      }

      radius += 3;
    }
  },
  getDoubleCirclePositions: function (center, radius) {
    let positions = [];
    let innerRadius = radius;
    let outerRadius = radius + 1;

    // Первый ряд
    for (let dx = -innerRadius; dx <= innerRadius; dx++) {
      positions.push({ x: center.x + dx, y: center.y - innerRadius });
      positions.push({ x: center.x + dx, y: center.y + innerRadius });
    }
    for (let dy = -innerRadius + 1; dy <= innerRadius - 1; dy++) {
      positions.push({ x: center.x - innerRadius, y: center.y + dy });
      positions.push({ x: center.x + innerRadius, y: center.y + dy });
    }

    // Второй ряд
    for (let dx = -outerRadius; dx <= outerRadius; dx++) {
      positions.push({ x: center.x + dx, y: center.y - outerRadius });
      positions.push({ x: center.x + dx, y: center.y + outerRadius });
    }
    for (let dy = -outerRadius + 1; dy <= outerRadius - 1; dy++) {
      positions.push({ x: center.x - outerRadius, y: center.y + dy });
      positions.push({ x: center.x + outerRadius, y: center.y + dy });
    }

    return positions;
  },
  isValidConstructionPosition: function (room, x, y) {
    if (x < 0 || y < 0 || x >= 49 || y >= 49) return false;
    if (room.lookForAt(LOOK_TERRAIN, x, y)[0] === "wall") return false;
    if (room.lookForAt(LOOK_STRUCTURES, x, y).length > 0) return false;
    if (room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y).length > 0) return false;

    let exits = room.find(FIND_EXIT);
    for (let exit of exits) {
      if (Math.abs(exit.x - x) <= 5 || Math.abs(exit.y - y) <= 5) {
        return false;
      }
    }

    return true;
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
