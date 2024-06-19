const creepService = require('creep.service');
const attackService = require('attack.service');

module.exports = {
  creepsPerRoom: 13,
  namePrefix: 'Ranged',
  memoryKey: 'ranged',
  bodyParts: [MOVE, MOVE, RANGED_ATTACK],
  run: function (creep) {
    if (creep.spawning) {
      return;
    }

    const target = creep.room.find(FIND_HOSTILE_CREEPS, {
      filter: (enemyCreep) => {
          return !attackService.avoidPlayers.includes(enemyCreep.owner.username);
      }
    });

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
