import _ from "lodash";
import { WorkerTask } from "../roles/constants/role.worker.const";
// const profiler = require("./../screeps-profiler");

export class CreepService {
  drawPath(creep: Creep, forceDraw: boolean = true): void {
    if (!creep.memory.path || !forceDraw) {
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
          color: creep.memory.pathColor || "yellow",
          lineStyle: "dashed",
        });
      }
      currentPos = nextPos;
    });
  }

  /**
   * Gets path to a container, or source.
   * @param creep
   */
  getPathToSource(creep: Creep): void {
    this.findContainer(creep);

    if (creep.memory.targetId) {
      return;
    }

    const sources = creep.room.find(FIND_SOURCES, {
      filter: (source) => source.energy > 0,
    });

    const closest = creep.pos.findClosestByPath(sources);

    if (closest) {
      const path = this.getPath(creep.pos, closest.pos);
      creep.memory.path = path;
      creep.memory.targetId = closest.id;
    }
  }

  findConstructionSite(creep: Creep): void {
    const constructionSites = creep.room.find(FIND_CONSTRUCTION_SITES);
    if (constructionSites.length > 0) {
      let closestSite = creep.pos.findClosestByPath(constructionSites);

      if (closestSite) {
        creep.memory.path = this.getPath(creep.pos, closestSite.pos);
        creep.memory.targetId = closestSite.id;
      }
    }
  }

  getDamagedStructures(creep: Creep): void {
    const targets: AnyStructure[] = creep.room.find(FIND_STRUCTURES, {
      filter: (structure) => {
        return (
          structure.hits < structure.hitsMax &&
          structure.structureType !== STRUCTURE_WALL &&
          structure.structureType !== STRUCTURE_RAMPART
        );
      },
    });

    if (targets.length > 0) {
      let closestSite = creep.pos.findClosestByPath(targets);

      if (closestSite) {
        creep.memory.path = this.getPath(creep.pos, closestSite.pos);
        creep.memory.targetId = closestSite.id;
      }
    }
  }

  getOpenPositions(roomPosition: RoomPosition): RoomPosition[] {
    const terrain = Game.map.getRoomTerrain(roomPosition.roomName);
    const openPositions: RoomPosition[] = [];

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const x = roomPosition.x + dx;
        const y = roomPosition.y + dy;

        if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
          const pos = new RoomPosition(x, y, roomPosition.roomName);
          const isOccupied = pos.lookFor(LOOK_CREEPS).length > 0;
          const isBlocked = pos
            .lookFor(LOOK_STRUCTURES)
            .some(
              (struct) =>
                struct.structureType !== STRUCTURE_ROAD &&
                struct.structureType !== STRUCTURE_CONTAINER &&
                struct.structureType !== STRUCTURE_RAMPART &&
                struct.structureType !== STRUCTURE_STORAGE
            );

          if (!isOccupied && !isBlocked) {
            openPositions.push(pos);
          }
        }
      }
    }

    return openPositions;
  }

  getPathTotargets(
    creep: Creep,
    targets: AnyStructure[] | ConstructionSite<BuildableStructureConstant>[]
  ): void {
    let bestPath: PathFinderPath | null = null;
    let bestTarget:
      | AnyStructure
      | ConstructionSite<BuildableStructureConstant>
      | null = null;
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
            if (!room) return new PathFinder.CostMatrix();
            let costs = new PathFinder.CostMatrix();

            room.find(FIND_STRUCTURES).forEach(function (struct) {
              if (struct.structureType === STRUCTURE_ROAD) {
                costs.set(struct.pos.x, struct.pos.y, 1);
              } else if (
                struct.structureType !== STRUCTURE_CONTAINER &&
                struct.structureType !== STRUCTURE_RAMPART &&
                struct.structureType !== STRUCTURE_STORAGE
              ) {
                costs.set(struct.pos.x, struct.pos.y, 0xff);
              } else if ("my" in struct && !(struct as OwnedStructure).my) {
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
      creep.memory.path = this.getPath(creep.pos, bestTarget.pos);
      creep.memory.targetId = bestTarget.id;
    }
  }

  moveAndHarvest(creep: Creep): void {
    const objectToCheck = Game.getObjectById(
      creep.memory.targetId as Id<StructureContainer>
    );

    if (objectToCheck && objectToCheck.structureType === STRUCTURE_CONTAINER) {
      this.moveAndCollectFromContainer(creep, objectToCheck);
    } else {
      let source = Game.getObjectById(creep.memory.targetId as Id<Source>);

      if (!source) {
        creep.memory.targetId = null;
        creep.memory.path = undefined;
        this.getPathToSource(creep);
        return;
      }

      if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
        this.drawPath(creep);

        if (this.isCreepIsStuck(creep)) {
          this.getPathToSource(creep);
        } else {
          let moveResult = this.moveByPath(creep);

          if (moveResult === ERR_NOT_FOUND || moveResult === ERR_INVALID_ARGS) {
            this.getPathToSource(creep);
          }
        }
      }
    }
  }

  isCreepIsStuck(creep: Creep): boolean {
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
      creep.memory.idleTicks!++;
    } else {
      creep.memory.lastPos = {
        x: creep.pos.x,
        y: creep.pos.y,
        energy: creep.store.getUsedCapacity(RESOURCE_ENERGY),
      };
      creep.memory.idleTicks = 0;
    }

    if (creep.memory.idleTicks! >= 3) {
      creep.memory.idleTicks = 0;
      return true;
    }

    return false;
  }

  findIdleCreep(creep: Creep): void {
    if (this.isCreepIsStuck(creep)) {
      creep.memory.targetId = null;
      creep.memory.path = undefined;
    }
  }

  moveAndCollectFromContainer(
    creep: Creep,
    container: StructureContainer
  ): void {
    if (!creep.memory.path || !creep.memory.path.length) {
      creep.memory.path = creep.pos.findPathTo(container.pos);
    }

    const action = creep.withdraw(container, RESOURCE_ENERGY);

    if (action === ERR_NOT_IN_RANGE) {
      const moveResult = this.moveByPath(creep);

      if (moveResult === ERR_NOT_FOUND || moveResult === ERR_INVALID_ARGS) {
        creep.memory.path = creep.pos.findPathTo(container.pos);
      }
    } else if (
      action === ERR_INVALID_TARGET ||
      action === ERR_NOT_ENOUGH_RESOURCES
    ) {
      this.findContainer(creep);
    }
  }

  findContainer(creep: Creep): void {
    creep.memory.targetId = null;
    creep.memory.path = undefined;

    const containers = creep.room.find(FIND_STRUCTURES, {
      filter: (structure) =>
        structure.structureType === STRUCTURE_CONTAINER &&
        structure.store[RESOURCE_ENERGY] > 0,
    }) as StructureContainer[];

    if (containers.length === 0) return;

    const closestContainer = creep.pos.findClosestByPath(containers);

    if (closestContainer) {
      creep.memory.targetId = closestContainer.id;
      creep.memory.path = this.getPath(creep.pos, closestContainer.pos);
    }
  }

  isTargetedByOtherCreeps(target: AnyStructure): boolean {
    return _.some(Object.values(Game.creeps), (c: Creep) => {
      return c.memory.targetId === target.id && c.memory.transferring;
    });
  }

  taskHarvest(creep: Creep) {
    if (creep.store.getFreeCapacity() == 0) {
      this.setTask(creep, WorkerTask.Idling);
    }

    if (!creep.memory.path || !creep.memory.targetId) {
      this.getPathToSource(creep);
    } else {
      this.moveAndHarvest(creep);
    }
  }

  taskTransfer(creep: Creep) {
    if (creep.store[RESOURCE_ENERGY] === 0) {
      this.setTask(creep, WorkerTask.Harvesting);
      return;
    }

    if (!creep.memory.path || !creep.memory.targetId) {
      const room = creep.room;

      let target: AnyStoreStructure | null = null;

      // Поиск ближайшей цели среди спаунов и экстеншенов
      const targets = room.find(FIND_STRUCTURES, {
        filter: (structure: AnyStoreStructure) => {
          return (
            (structure.structureType === STRUCTURE_SPAWN ||
              structure.structureType === STRUCTURE_EXTENSION) &&
            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0 &&
            !_.some(
              Game.creeps,
              (c: Creep) => c.memory.targetId === structure.id
            )
          );
        },
      });

      if (targets.length > 0) {
        target = creep.pos.findClosestByPath(targets) as any;
      }

      // Если нет подходящих спаунов и экстеншенов, ищем ближайшую башню
      if (!target) {
        const towers = room.find(FIND_STRUCTURES, {
          filter: (structure: AnyStoreStructure) => {
            return (
              structure.structureType === STRUCTURE_TOWER &&
              structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            );
          },
        });

        if (towers.length > 0) {
          target = creep.pos.findClosestByPath(towers) as any;
        }
      }

      if (target) {
        creep.memory.targetId = target.id;
        creep.memory.path = this.getPath(creep.pos, target.pos);
      } else {
        this.setTask(creep, WorkerTask.Idling);
      }
    } else {
      const target = Game.getObjectById(
        creep.memory.targetId as Id<AnyStoreStructure>
      );

      // Сброс цели, если она недействительна или заполнена
      if (!target || target.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
        this.setTask(creep, WorkerTask.Idling);
      } else {
        const action = creep.transfer(target, RESOURCE_ENERGY);

        if (action === ERR_FULL || action === ERR_NOT_IN_RANGE) {
          const moveResult = this.moveByPath(creep);

          if (moveResult !== OK && moveResult !== ERR_TIRED) {
            this.setTask(creep, WorkerTask.Idling);
          }
        } else if (action !== OK) {
          this.setTask(creep, WorkerTask.Idling);
        }
      }
    }
  }

  taskUpgrade(creep: Creep): void {
    if (creep.store[RESOURCE_ENERGY] == 0) {
      this.setTask(creep, WorkerTask.Harvesting);
      return;
    }

    if (!creep.memory.path) {
      this.getPathToController(creep);
    } else {
      const action = creep.upgradeController(
        creep.room.controller as StructureController
      );

      if (action === ERR_NOT_IN_RANGE) {
        const moveResult = this.moveByPath(creep);
        this.drawPath(creep);

        if (moveResult !== OK && moveResult !== ERR_TIRED) {
          this.getPathToController(creep);
        }
      }
    }
  }

  taskBuild(creep: Creep) {
    if (creep.store[RESOURCE_ENERGY] == 0) {
      this.setTask(creep, WorkerTask.Harvesting);
      return;
    }

    if (!creep.memory.path) {
      this.getDamagedStructures(creep);
      if (!creep.memory.path) {
        this.findConstructionSite(creep);

        if (!creep.memory.path) {
          this.setTask(creep, WorkerTask.Idling, "taskBuild");
        }
      }
    } else {
      const target: any = Game.getObjectById(creep.memory.targetId as any);
      if (!target) {
        this.setTask(creep, WorkerTask.Idling);
        return;
      }
      let action: any = creep.repair(target);
      if ("progress" in target) {
        action = creep.build(target);
      }

      if (action === ERR_NOT_IN_RANGE) {
        const moveResult = this.moveByPath(creep);
        if (!("progress" in target) && target.hits === target.hitsMax) {
          this.setTask(creep, WorkerTask.Harvesting);
        }
        if (moveResult !== OK && moveResult !== ERR_TIRED) {
          this.setTask(creep, WorkerTask.Harvesting);
        }
      } else if (action === ERR_INVALID_TARGET || action === ERR_NO_BODYPART) {
        this.setTask(creep, WorkerTask.Harvesting);
      } else if (
        action === OK &&
        !("progress" in target) &&
        target.hits === target.hitsMax
      ) {
        this.setTask(creep, WorkerTask.Idling);
      }
    }
  }

  setTask(
    creep: Creep,
    task: typeof WorkerTask,
    setFunction: string = "NA"
  ): void {
    creep.memory.path = undefined;
    creep.memory.targetId = null;
    creep.memory.task = task;
  }

  getPathToController(creep: Creep): void {
    const controller = creep.room.controller as StructureController;

    creep.memory.path = this.getPath(creep.pos, controller.pos);
  }

  /**
   * Will search for a cached path in Cache. If there is one, will return it and update lastTimeAccessed. If nothing will be found in cache, will create a new entry and return the path.
   * @param startPos
   * @param endPos
   */
  getPath(startPos: RoomPosition, endPos: RoomPosition): PathStep[] {
    const roomName = startPos.roomName;
    const cacheKey = `${startPos.x},${startPos.y}:${endPos.x},${endPos.y}`;
    const currentTick = Game.time;

    if (!Memory.cacheCreepPaths) {
      Memory.cacheCreepPaths = {};
    }
    if (!Memory.cacheCreepPaths[roomName]) {
      Memory.cacheCreepPaths[roomName] = {};
    }

    const cachedPath = Memory.cacheCreepPaths[roomName][cacheKey];
    if (cachedPath) {
      cachedPath.lastAccessed = currentTick;
      cachedPath.usedTimes = cachedPath.usedTimes + 1;
      return cachedPath.path;
    }

    const path = startPos.findPathTo(endPos, {
      ignoreCreeps: true,
      costCallback: (roomName, costMatrix) => {
        const room = Game.rooms[roomName];
        if (room) {
          room.find(FIND_STRUCTURES).forEach((struct) => {
            if (struct.structureType === STRUCTURE_ROAD) {
              costMatrix.set(struct.pos.x, struct.pos.y, 1);
            } else if (
              struct.structureType !== STRUCTURE_CONTAINER &&
              (struct.structureType !== STRUCTURE_RAMPART || !struct.my)
            ) {
              costMatrix.set(struct.pos.x, struct.pos.y, 0xff);
            }
          });
        }
        return costMatrix;
      },
    });

    Memory.cacheCreepPaths[roomName][cacheKey] = {
      usedTimes: 1,
      path: path,
      lastAccessed: currentTick,
    };

    return path;
  }

  moveByPath(
    creep: Creep
  ): CreepMoveReturnCode | ERR_NOT_FOUND | ERR_INVALID_ARGS {
    const path = creep.memory.path as PathStep[];
    if (!path || path.length === 0) {
      return ERR_NOT_FOUND;
    }

    const moveResult = creep.moveByPath(path);

    const roomName = creep.room.name;
    const startPos = creep.pos;
    const endPos = path[path.length - 1];
    const pathKey = `${startPos.x},${startPos.y}:${endPos.x},${endPos.y}`;

    if (moveResult === ERR_INVALID_ARGS || moveResult === ERR_NOT_FOUND) {
      if (Memory.cacheCreepPaths && Memory.cacheCreepPaths[roomName]) {
        delete Memory.cacheCreepPaths[roomName][pathKey];
      }

      delete creep.memory.path;
    } else if (moveResult === ERR_BUSY) {
      if (creep.memory.idleTicks > 3) {
        if (Memory.cacheCreepPaths && Memory.cacheCreepPaths[roomName]) {
          delete Memory.cacheCreepPaths[roomName][pathKey];
        }

        creep.memory.idleTicks = 0;
        delete creep.memory.path;
      }
    }

    return moveResult;
  }

  /**
   * Will clear the cache of paths.
   */
  clearCreepPathCache(expirationTime: number = 1000): void {
    const currentTick = Game.time;

    if (currentTick % 100 === 0) {
      for (const roomName in Memory.cacheCreepPaths) {
        const roomCache = Memory.cacheCreepPaths[roomName];
        const keysToRemove = [];

        for (const key in roomCache) {
          const cachedPath = roomCache[key];
          if (
            currentTick - cachedPath.lastAccessed > expirationTime ||
            cachedPath.usedTimes <= 3
          ) {
            keysToRemove.push(key);
          }
        }

        for (const key of keysToRemove) {
          delete roomCache[key];
        }

        const sortedCache = Object.entries(roomCache)
          .sort(([, a], [, b]) => b.usedTimes - a.usedTimes)
          .reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
          }, {} as { [key: string]: CachedCreepPath });

        Memory.cacheCreepPaths[roomName] = sortedCache;
      }
    }
  }

  // createStructureCache(): void {
  //   Memory.creepRoomCache = {};
  //   const rooms = Game.rooms;
  //   for (let roomName in rooms) {
  //     const room = Game.rooms[roomName];
  //     const structures = room.find(FIND_STRUCTURES);
  //     if (structures) {
  //       Memory.creepRoomCache[roomName] = structures;
  //     }
  //   }
  // },
}

// profiler.registerClass(CreepService, "CreepService");
