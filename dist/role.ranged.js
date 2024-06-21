const creepService = require("creep.service");
const attackService = require("attack.service");

module.exports = {
  creepsPerRoom: 1,
  namePrefix: "Ranged",
  memoryKey: "ranged",
  bodyParts: [TOUGH, MOVE, MOVE, RANGED_ATTACK],
  run: function (creep) {
    if (creep.spawning) {
      return;
    }

    const room = creep.room;
    const controller = room.controller;

    if (controller && controller.safeMode) {
      const check = controller.safeMode - creep.ticksToLive;

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

    let target = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {
      filter: (enemyCreep) => {
        return !attackService.avoidPlayers.includes(enemyCreep.owner.username);
      },
    });

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
          creep.memory.targetId = target.id;
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
  goToFlag: function (creep, flag) {
    let path;

    if (!creep.memory.path) {
      path = creep.pos.findPathTo(flag);
    } else {
      path = creep.memory.path;
    }
    creep.moveByPath(path);
    creepService.drawPath(creep);
  },
  randomlyPatrol: function (creep) {
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
  findStructuralTargets: function (creep) {
    const hostileStructures = creep.room.find(FIND_HOSTILE_STRUCTURES, {
      filter: (structure) => {
        return (
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

    return hostileStructures[0];
  },
};
