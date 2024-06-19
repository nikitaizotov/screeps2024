const creepService = require('creep.service');
const attackService = require('attack.service');

module.exports = {
  creepsPerRoom: 3,
  namePrefix: 'Ranged',
  memoryKey: 'ranged',
  bodyParts: [MOVE, MOVE, RANGED_ATTACK],
  run: function (creep) {
    if (creep.spawning) {
      return;
    }

    let target = creep.room.find(FIND_HOSTILE_CREEPS, {
      filter: (enemyCreep) => {
        return !attackService.avoidPlayers.includes(enemyCreep.owner.username);
      }
    })[0];

    if (!target) {

      const hostileStructures = creep.room.find(FIND_HOSTILE_STRUCTURES, {
        filter: (structure) => {
          return !attackService.avoidPlayers.includes(structure.owner.username) &&
            (structure.structureType === STRUCTURE_TOWER ||
              structure.structureType === STRUCTURE_SPAWN ||
              structure.structureType === STRUCTURE_EXTENSION);
        }
      });

      hostileStructures.sort((a, b) => {
        if (a.structureType === b.structureType) return 0;
        if (a.structureType === STRUCTURE_TOWER) return -1;
        if (b.structureType === STRUCTURE_TOWER) return 1;
        if (a.structureType === STRUCTURE_SPAWN) return -1;
        if (b.structureType === STRUCTURE_SPAWN) return 1;
        return 0;
      });

      target = hostileStructures[0];
    }

    if (target) {
      if (creep.pos.inRangeTo(target, 3)) {
        creep.rangedAttack(target);
        const path = PathFinder.search(creep.pos, { pos: target.pos, range: 4 }).path;
        creep.moveByPath(path);
      } else {
        if (!creep.memory.path || creep.memory.targetId !== target.id) {
          creep.memory.path = creep.pos.findPathTo(target, { ignoreCreeps: true });
          creep.memory.targetId = target.id;
        }

        creepService.drawPath(creep);
        creep.moveByPath(creep.memory.path);
      }
    } else {
      const directions = [
        TOP,
        TOP_RIGHT,
        RIGHT,
        BOTTOM_RIGHT,
        BOTTOM,
        BOTTOM_LEFT,
        LEFT,
        TOP_LEFT
      ];
      const randomDirection = directions[Math.floor(Math.random() * directions.length)];
      creep.move(randomDirection);
    }
  }
};
