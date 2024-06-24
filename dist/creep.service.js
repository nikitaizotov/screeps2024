module.exports = {
  drawPath: function (creep) {
    if (!creep.memory.path) {
      return;
    }

    const visual = new RoomVisual(creep.room.name);
    let currentPos = new RoomPosition(
      creep.pos.x,
      creep.pos.y,
      creep.room.name
    );
    let pathToDraw = creep.memory.path;

    let inPathPosIndex = creep.memory.path.findIndex(
      (elm) => elm.x === creep.pos.x && elm.y === creep.pos.y
    );

    if (inPathPosIndex > -1) {
      pathToDraw = creep.memory.path.slice(inPathPosIndex);
    } else {
      pathToDraw = creep.memory.path;
    }

    pathToDraw.forEach((step, index) => {
      const nextPos = new RoomPosition(step.x, step.y, creep.room.name);
      if (index === 0) {
        visual.line(currentPos, nextPos, { color: "red", lineStyle: "solid" });
      } else {
        visual.line(currentPos, nextPos, {
          color: creep.memory.pathColor,
          lineStyle: "dashed",
        });
      }
      currentPos = nextPos;
    });
  },
  ///////////////////////////////////////////
  getPathToSource: function (creep) {
    const sources = creep.room.find(FIND_SOURCES);
    let bestPath = null;
    let bestSource = null;
    let minCost = Infinity;
    let bestTargetPosition = null;

    for (const source of sources) {
      const openPositions = this.getOpenPositions(source.pos);
      const creepsAtSource = source.pos
        .findInRange(FIND_CREEPS, 1)
        .filter((c) => c.id !== creep.id).length;

      const creepsHeadingToSource = _.filter(
        Game.creeps,
        (c) => c.memory.targetId === source.id && c.id !== creep.id
      );

      let creepsAtArrival = creepsAtSource;
      for (const c of creepsHeadingToSource) {
        const pathToSource = PathFinder.search(c.pos, {
          pos: source.pos,
          range: 1,
        });
        const pathToSourceCurrentCreep = PathFinder.search(creep.pos, {
          pos: source.pos,
          range: 1,
        });

        if (pathToSource.path.length <= pathToSourceCurrentCreep.path.length) {
          creepsAtArrival++;
        }
      }

      if (creepsAtArrival >= openPositions.length) {
        continue;
      }

      for (const pos of openPositions) {
        const occupied = _.some(
          Game.creeps,
          (c) =>
            c.memory.targetPos &&
            c.memory.targetPos.x === pos.x &&
            c.memory.targetPos.y === pos.y &&
            c.id !== creep.id
        );

        if (occupied) {
          continue;
        }

        const path = PathFinder.search(
          creep.pos,
          { pos: pos, range: 0 },
          {
            plainCost: 2,
            swampCost: 10,
            roomCallback: function (roomName) {
              const room = Game.rooms[roomName];
              if (!room) return;
              const costs = new PathFinder.CostMatrix();

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
        );

        if (!path.incomplete && path.cost < minCost) {
          minCost = path.cost;
          bestPath = path;
          bestSource = source;
          bestTargetPosition = pos;
        }
      }
    }

    if (bestSource && bestTargetPosition) {
      creep.memory.path = creep.pos.findPathTo(bestTargetPosition);
      creep.memory.targetId = bestSource.id;
      creep.memory.targetPos = bestTargetPosition;
    } else {
      const closestSource = creep.pos.findClosestByPath(sources);

      if (closestSource) {
        const closestOpenPosition = this.getOpenPositions(
          closestSource.pos
        ).sort((a, b) => creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b))[0];

        if (closestOpenPosition) {
          creep.memory.path = creep.pos.findPathTo(closestOpenPosition);
          creep.memory.targetId = closestSource.id;
          creep.memory.targetPos = closestOpenPosition;
        }
      }
    }
  },

  getOpenPositions: function (roomPosition) {
    const terrain = Game.map.getRoomTerrain(roomPosition.roomName);
    const openPositions = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue; // Skip the source position itself
        const x = roomPosition.x + dx;
        const y = roomPosition.y + dy;
        if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
          openPositions.push(new RoomPosition(x, y, roomPosition.roomName));
        }
      }
    }
    return openPositions;
  },
  ////////////////////////////////////////////////

  getPathTotargets: function (creep, targets) {
    //creep.say('Searching');
    let bestPath = null;
    let bestTarget = null;
    let minCost = Infinity;

    for (let target of targets) {
      let openPositions = this.getOpenPositions(target.pos);
      let creepsAtTarget = target.pos.findInRange(FIND_CREEPS, 1).length;

      if (creepsAtTarget >= openPositions.length) {
        continue;
      }

      let path = PathFinder.search(
        creep.pos,
        { pos: target.pos, range: 1 },
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
      );

      if (!path.incomplete && path.cost < minCost) {
        minCost = path.cost;
        bestPath = path;
        bestTarget = target;
      }
    }

    if (bestTarget) {
      creep.memory.path = creep.pos.findPathTo(bestTarget);
      creep.memory.targetId = bestTarget.id;
    } else {
      creep.say("No path found!");
    }
  },

  moveAndHarvest: function (creep) {
    let source = Game.getObjectById(creep.memory.targetId);

    if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
      this.drawPath(creep);
      let moveResult = creep.moveByPath(creep.memory.path);
      if (
        moveResult === ERR_NOT_FOUND ||
        (moveResult !== OK && moveResult !== ERR_TIRED)
      ) {
        this.getPathToSource(creep);
      }
    }
  },
  getOpenPositions: function (roomPosition) {
    let terrain = Game.map.getRoomTerrain(roomPosition.roomName);
    let openPositions = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (
          terrain.get(roomPosition.x + dx, roomPosition.y + dy) !==
          TERRAIN_MASK_WALL
        ) {
          openPositions.push(
            new RoomPosition(
              roomPosition.x + dx,
              roomPosition.y + dy,
              roomPosition.roomName
            )
          );
        }
      }
    }
    return openPositions;
  },
  isCreepIsStuck: function (creep) {
    if (!creep.memory.lastPos) {
      creep.memory.lastPos = {
        x: creep.pos.x,
        y: creep.pos.y,
        energy: creep.store.getUsedCapacity(RESOURCE_ENERGY),
      };
      creep.memory.idleTicks = 0;
    }

    if (
      creep.pos.x === creep.memory.lastPos.x &&
      creep.pos.y === creep.memory.lastPos.y &&
      creep.store.getUsedCapacity(RESOURCE_ENERGY) ===
        creep.memory.lastPos.energy
    ) {
      creep.memory.idleTicks++;
    } else {
      creep.memory.lastPos = {
        x: creep.pos.x,
        y: creep.pos.y,
        energy: creep.store.getUsedCapacity(RESOURCE_ENERGY),
      };
      creep.memory.idleTicks = 0;
    }

    if (creep.memory.idleTicks >= 5) {
      creep.memory.idleTicks = 0;
      return true;
    }

    return false;
  },
  findIdleCreep: function (creep) {
    if (this.isCreepIsStuck(creep)) {
      creep.memory.targetId = null;
      creep.memory.path = null;
    }
  },
};
