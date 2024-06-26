import attackService from "./attack.service";
import creepService from "./creep.service";
import { CreepRole } from "./role.interface";

const roleRanged: CreepRole = {
  creepsPerRoom: 0,
  namePrefix: "Ranged",
  memoryKey: "ranged",
  bodyParts: [
    TOUGH,
    TOUGH,
    TOUGH,
    TOUGH,
    TOUGH,
    TOUGH,
    TOUGH,
    MOVE,
    MOVE,
    RANGED_ATTACK,
  ],

  run(creep: Creep): void {
    if (creep.spawning) {
      return;
    }

    const room = creep.room;
    const controller = room.controller;

    if (controller && controller.safeMode) {
      const check = controller.safeMode - (creep.ticksToLive ?? 0);

      if (!(check < 0)) {
        const flag = Game.flags["MoveToFlag"];
        if (flag) {
          this.goToFlag(creep, flag);
        } else {
          this.randomlyPatrol(creep);
        }
        return;
      }
    }

    const tower = this.findClosestTower(creep);
    let target: Creep | Structure<StructureConstant> | null =
      this.findRangedEnemiesCloserThanTower(creep, tower);

    if (!target && tower) {
      target = tower;
    }

    if (!target) {
      target = this.findDangerousEnemies(creep);
    }

    if (!target) {
      target = this.findAllEnemies(creep);
    }

    if (!target) {
      target = this.findStructuralTargets(creep);
    }

    if (target) {
      if (creep.pos.inRangeTo(target, 3)) {
        creep.rangedAttack(target);
        const path = PathFinder.search(creep.pos, {
          pos: target.pos,
          range: 4,
        }).path;
        creep.moveByPath(path);
      } else {
        if (!creep.memory.path || creep.memory.targetId !== target.id) {
          creep.memory.path = creep.pos.findPathTo(target, {
            ignoreCreeps: true,
          });
          // Ensure target.id is compatible with CreepMemory's targetId
          creep.memory.targetId = target.id as Id<
            | Structure<StructureConstant>
            | Source
            | ConstructionSite<BuildableStructureConstant>
          >;
        }

        creepService.drawPath(creep);
        creep.moveByPath(creep.memory.path);
      }
    } else {
      const flag = Game.flags["MoveToFlag"];
      if (flag) {
        this.goToFlag(creep, flag);
      } else {
        this.randomlyPatrol(creep);
      }
    }
  },

  goToFlag(creep: Creep, flag: Flag): void {
    let path;

    if (!creep.memory.path) {
      path = creep.pos.findPathTo(flag);
    } else {
      path = creep.memory.path;
    }
    creep.moveByPath(path);
    creepService.drawPath(creep);
  },

  randomlyPatrol(creep: Creep): void {
    const directions = [
      TOP,
      TOP_RIGHT,
      RIGHT,
      BOTTOM_RIGHT,
      BOTTOM,
      BOTTOM_LEFT,
      LEFT,
      TOP_LEFT,
    ];
    const randomDirection =
      directions[Math.floor(Math.random() * directions.length)];
    creep.move(randomDirection);
  },

  findClosestTower(creep: Creep): StructureTower | null {
    return creep.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES, {
      filter: (structure: AnyOwnedStructure) => {
        return (
          structure.owner &&
          !attackService.avoidPlayers.includes(structure.owner.username) &&
          structure.structureType === STRUCTURE_TOWER
        );
      },
    }) as StructureTower | null;
  },

  findRangedEnemiesCloserThanTower(
    creep: Creep,
    tower: StructureTower | null
  ): Creep | null {
    return creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {
      filter: (enemyCreep: Creep) => {
        return (
          !attackService.avoidPlayers.includes(enemyCreep.owner.username) &&
          enemyCreep.getActiveBodyparts(RANGED_ATTACK) > 0 &&
          (!tower ||
            creep.pos.getRangeTo(enemyCreep) < creep.pos.getRangeTo(tower))
        );
      },
    });
  },

  findDangerousEnemies(creep: Creep): Creep | null {
    return creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {
      filter: (enemyCreep: Creep) => {
        return (
          !attackService.avoidPlayers.includes(enemyCreep.owner.username) &&
          (enemyCreep.getActiveBodyparts(ATTACK) > 0 ||
            enemyCreep.getActiveBodyparts(RANGED_ATTACK) > 0)
        );
      },
    });
  },

  findAllEnemies(creep: Creep): Creep | null {
    return creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {
      filter: (enemyCreep: Creep) => {
        return !attackService.avoidPlayers.includes(enemyCreep.owner.username);
      },
    });
  },

  findStructuralTargets(creep: Creep): AnyOwnedStructure | null {
    const hostileStructures = creep.room.find(FIND_HOSTILE_STRUCTURES, {
      filter: (structure: AnyOwnedStructure) => {
        return (
          structure.owner &&
          !attackService.avoidPlayers.includes(structure.owner.username) &&
          (structure.structureType === STRUCTURE_TOWER ||
            structure.structureType === STRUCTURE_SPAWN ||
            structure.structureType === STRUCTURE_EXTENSION)
        );
      },
    });

    hostileStructures.sort((a, b) => {
      if (a.structureType === b.structureType) return 0;
      if (a.structureType === STRUCTURE_TOWER) return -1;
      if (b.structureType === STRUCTURE_TOWER) return 1;
      if (a.structureType === STRUCTURE_SPAWN) return -1;
      if (b.structureType === STRUCTURE_SPAWN) return 1;
      return 0;
    });

    return hostileStructures[0] || null;
  },
};

export default roleRanged;
