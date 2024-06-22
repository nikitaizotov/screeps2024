const attackService = require("attack.service");

module.exports = {
  run: function (tower) {
    if (tower) {
      const closestHostile = tower.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {
        filter: (enemyCreep) => {
          return !attackService.avoidPlayers.includes(
            enemyCreep.owner.username
          );
        },
      });

      if (closestHostile) {
        tower.attack(closestHostile);
      } else {
        const closestDamagedAlly = tower.pos.findClosestByRange(
          FIND_MY_CREEPS,
          {
            filter: (creep) => creep.hits < creep.hitsMax,
          }
        );

        if (closestDamagedAlly) {
          tower.heal(closestDamagedAlly);
        } else {
          const closestDamagedStructure = tower.pos.findClosestByRange(
            FIND_STRUCTURES,
            {
              filter: (structure) =>
                structure.hits < structure.hitsMax &&
                structure.structureType !== STRUCTURE_WALL &&
                structure.structureType !== STRUCTURE_RAMPART,
            }
          );

          if (closestDamagedStructure) {
            tower.repair(closestDamagedStructure);
          }
        }
      }
    }
  },
};
