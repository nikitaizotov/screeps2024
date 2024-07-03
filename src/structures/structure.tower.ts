import attackService from "../services/attack.service";

const towerManager = {
  run(tower: StructureTower): void {
    if (tower) {
      // First, look for the closest hostile creep with HEAL body part
      const closestHostileWithHeal = tower.pos.findClosestByPath(
        FIND_HOSTILE_CREEPS,
        {
          filter: (enemyCreep: Creep) => {
            return (
              !attackService.avoidPlayers.includes(enemyCreep.owner.username) &&
              enemyCreep.body.some((part) => part.type === HEAL)
            );
          },
        }
      );

      if (closestHostileWithHeal) {
        tower.attack(closestHostileWithHeal);
      } else {
        // If no hostile creeps with HEAL are found, look for the closest hostile creep
        const closestHostile = tower.pos.findClosestByPath(
          FIND_HOSTILE_CREEPS,
          {
            filter: (enemyCreep: Creep) => {
              return !attackService.avoidPlayers.includes(
                enemyCreep.owner.username
              );
            },
          }
        );

        if (closestHostile) {
          tower.attack(closestHostile);
        } else {
          // If no hostile creeps are found, look for the closest damaged ally creep
          const closestDamagedAlly = tower.pos.findClosestByRange(
            FIND_MY_CREEPS,
            {
              filter: (creep: Creep) => creep.hits < creep.hitsMax,
            }
          );

          if (closestDamagedAlly) {
            tower.heal(closestDamagedAlly);
          } else {
            // If no damaged ally creeps are found, look for the closest damaged structure
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

              // If the structure is fully repaired, clear the memory of any creeps targeting it
              if (
                closestDamagedStructure.hits === closestDamagedStructure.hitsMax
              ) {
                for (const creepName in Game.creeps) {
                  const creep = Game.creeps[creepName];
                  if (creep.memory.targetId === closestDamagedStructure.id) {
                    creep.memory.targetId = null;
                    creep.memory.path = undefined;
                  }
                }
              }
            }
          }
        }
      }
    }
  },
};

export default towerManager;
