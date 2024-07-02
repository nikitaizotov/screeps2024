import _ from "lodash";
import { WorkerTask } from "../roles/constants/role.worker.const";

const creepService = {
  drawPath: function (creep: Creep): void {
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
          color: creep.memory.pathColor || "yellow",
          lineStyle: "dashed",
        });
      }
      currentPos = nextPos;
    });
  },

  /**
   * Gets path to a container, or source.
   * @param creep
   */
  getPathToSource: function (creep: Creep): void {
    this.findContainer(creep);

    if (creep.memory.targetId) {
      return;
    }

    const sources = creep.room.find(FIND_SOURCES, {
      filter: (source) => source.energy > 0,
    });

    const closest = creep.pos.findClosestByPath(sources);

    if (closest) {
      const path = creep.pos.findPathTo(closest);
      creep.memory.path = path;
      creep.memory.targetId = closest.id;
    }
  },

  findConstructionSite: function (creep: Creep) {
    const constructionSites = creep.room.find(FIND_CONSTRUCTION_SITES);
    if (constructionSites.length > 0) {
      let closestSite = creep.pos.findClosestByPath(constructionSites);

      if (closestSite) {
        creep.memory.path = creep.pos.findPathTo(closestSite);
        creep.memory.targetId = closestSite.id;
      }
    }
  },

  getDamagedStructures: function (creep: Creep): void {
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
        creep.memory.path = creep.pos.findPathTo(closestSite);
        creep.memory.targetId = closestSite.id;
      }
    }
  },

  getOpenPositions: function (roomPosition: RoomPosition): RoomPosition[] {
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
  },

  getPathTotargets: function (
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
      creep.memory.path = creep.pos.findPathTo(bestTarget.pos);
      creep.memory.targetId = bestTarget.id;
    }
  },

  moveAndHarvest: function (creep: Creep): void {
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
          let moveResult = creep.moveByPath(creep.memory.path!);

          if (moveResult === ERR_NOT_FOUND || moveResult === ERR_INVALID_ARGS) {
            this.getPathToSource(creep);
          }
        }
      }
    }
  },

  isCreepIsStuck: function (creep: Creep): boolean {
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

    if (creep.memory.idleTicks! >= 5) {
      creep.memory.idleTicks = 0;
      return true;
    }

    return false;
  },

  findIdleCreep: function (creep: Creep): void {
    if (this.isCreepIsStuck(creep)) {
      creep.memory.targetId = null;
      creep.memory.path = undefined;
    }
  },

  moveAndCollectFromContainer: function (
    creep: Creep,
    container: StructureContainer
  ): void {
    const action = creep.withdraw(container, RESOURCE_ENERGY);

    if (action === ERR_NOT_IN_RANGE) {
      creepService.drawPath(creep);

      let moveResult = creep.moveByPath(creep.memory.path!);

      if (moveResult === ERR_NOT_FOUND || moveResult === ERR_INVALID_ARGS) {
        this.findContainer(creep);
      }
    }
  },

  /**
   * Searches for a container with miner near it, if container having a free space, adds path and id to creep memory.
   * @param creep
   */
  findContainer: function (creep: Creep): void {
    creep.memory.targetId = null;
    creep.memory.path = undefined;

    let containers = creep.room.find(FIND_STRUCTURES, {
      filter: (structure) => structure.structureType === STRUCTURE_CONTAINER,
    }) as StructureContainer[];

    containers = _.sortBy(containers, (container) =>
      creep.pos.getRangeTo(container)
    );

    let closestContainer = null;
    let minDistance = Infinity;

    for (let container of containers) {
      const miners = container.pos
        .findInRange(FIND_MY_CREEPS, 1)
        .filter((c) => c.memory.role === "miner");

      if (container.store.energy === 0) {
        continue;
      }

      if (miners.length > 0 || container.store.energy > 0) {
        // if (hasFreeSpot) {
        const distance = creep.pos.getRangeTo(container.pos);
        if (distance < minDistance) {
          minDistance = distance;
          closestContainer = container;
        }
        // }
      }
    }

    if (closestContainer) {
      creep.memory.targetId = closestContainer.id;
      creep.memory.path = creep.pos.findPathTo(closestContainer);
    }
  },

  isTargetedByOtherCreeps(target: AnyStructure): boolean {
    return _.some(Object.values(Game.creeps), (c: Creep) => {
      return c.memory.targetId === target.id && c.memory.transferring;
    });
  },

  taskHarvest: function (creep: Creep) {
    if (creep.store.getFreeCapacity() == 0) {
      this.setTask(creep, WorkerTask.Idling);
    }

    if (!creep.memory.path || !creep.memory.targetId) {
      this.getPathToSource(creep);
    } else {
      this.moveAndHarvest(creep);
    }
  },

  taskTransfer: function (creep: Creep) {
    if (creep.store[RESOURCE_ENERGY] == 0) {
      this.setTask(creep, WorkerTask.Harvesting);
      return;
    }

    if (!creep.memory.path || !creep.memory.targetId) {
      const room = creep.room;
      const targets = room.find(FIND_STRUCTURES, {
        filter: (structure: AnyStructure) => {
          const creepsHeadingToDist = _.filter(
            Object.values(Game.creeps),
            (c: Creep) => c.memory.targetId === structure.id
          );
          return (
            (structure.structureType === STRUCTURE_SPAWN ||
              structure.structureType === STRUCTURE_EXTENSION) &&
            structure.store &&
            creepsHeadingToDist.length === 0 &&
            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
          );
        },
      });

      let target = creep.pos.findClosestByPath(targets);

      if (target) {
        creep.memory.targetId = target.id;
        creep.memory.path = creep.pos.findPathTo(target);
      } else {
        const towers = room.find(FIND_STRUCTURES, {
          filter: (structure: AnyStructure) => {
            return (
              structure.structureType === STRUCTURE_TOWER &&
              structure.store &&
              structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            );
          },
        });

        let tower = creep.pos.findClosestByPath(towers);

        if (tower) {
          if (tower) {
            creep.memory.targetId = tower.id;
            creep.memory.path = creep.pos.findPathTo(tower);
          }
        } else {
          this.setTask(creep, WorkerTask.Idling);
        }
      }
    } else {
      const target = Game.getObjectById(
        creep.memory.targetId as Id<Structure<StructureConstant>>
      );

      // Reset target if it's invalid or full.
      if (
        !target ||
        ("store" in target &&
          (target as AnyStoreStructure).store.getFreeCapacity(
            RESOURCE_ENERGY
          ) === 0)
      ) {
        this.setTask(creep, WorkerTask.Idling);
      } else {
        const action = creep.transfer(
          target as AnyStoreStructure,
          RESOURCE_ENERGY
        );

        if (action === ERR_FULL) {
          this.setTask(creep, WorkerTask.Idling);
        }

        if (action === ERR_NOT_IN_RANGE) {
          const moveResult = creep.moveByPath(creep.memory.path as PathStep[]);

          if (moveResult !== OK && moveResult !== ERR_TIRED) {
            this.setTask(creep, WorkerTask.Idling);
          }
        }
      }
    }
  },

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
        const moveResult = creep.moveByPath(creep.memory.path as PathStep[]);
        creepService.drawPath(creep);

        if (moveResult !== OK && moveResult !== ERR_TIRED) {
          this.getPathToController(creep);
        }
      }
    }
  },

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
        const moveResult = creep.moveByPath(creep.memory.path as PathStep[]);
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
  },

  setTask(
    creep: Creep,
    task: typeof WorkerTask,
    setFunction: string = "NA"
  ): void {
    creep.memory.path = undefined;
    creep.memory.targetId = null;
    creep.memory.task = task;
  },

  getPathToController(creep: Creep): void {
    creep.memory.path = creep.pos.findPathTo(
      creep.room.controller as StructureController
    );
  },
};

export default creepService;
