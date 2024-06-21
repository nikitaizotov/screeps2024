module.exports = {
  run: function (tower) {
    if (tower) {
      const closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);

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
              filter: (structure) => structure.hits < structure.hitsMax,
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
