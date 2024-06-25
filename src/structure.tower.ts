import attackService from "./attack.service";

const towerManager = {
  run(tower: StructureTower): void {
    if (tower) {
      const closestHostile = tower.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {
        filter: (enemyCreep: Creep) => {
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
            filter: (creep: Creep) => creep.hits < creep.hitsMax,
          }
        );

        if (closestDamagedAlly) {
          tower.heal(closestDamagedAlly);
        } else {
          const closestDamagedStructure = tower.pos.findClosestByRange(
            FIND_STRUCTURES,
            {
              filter: (structure: AnyStructure) =>
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

export default towerManager;
