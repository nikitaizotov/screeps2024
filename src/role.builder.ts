import _ from "lodash";
import creepService from "./creep.service";
import { CreepRole } from "./role.interface";

const roleBuilder: CreepRole = {
  creepsPerRoom: 2,
  namePrefix: "Builder",
  memoryKey: "builder",
  bodyParts: [WORK, CARRY, MOVE],

  run(creep: Creep): void {
    if (creep.spawning) {
      return;
    }
    if (
      (creep.memory.building || creep.memory.building === undefined) &&
      creep.store[RESOURCE_ENERGY] === 0
    ) {
      creep.memory.building = false;
      creep.memory.path = undefined;
      creep.memory.targetId = null;
      creep.say("🔄 harvest");
    }
    if (!creep.memory.building && creep.store.getFreeCapacity() == 0) {
      creep.memory.building = true;
      creep.memory.path = undefined;
      creep.memory.targetId = null;
      creep.say("🚧 build");
    }

    if (creep.memory.building) {
      this.transferEnergy(creep);
    } else {
      this.harvestEnergy(creep);
    }
  },

  harvestEnergy(creep: Creep): void {
    if (!creep.memory.path) {
      creepService.getPathToSource(creep);
    } else {
      creepService.moveAndHarvest(creep);
    }
  },

  transferEnergy(creep: Creep): void {
    if (!creep.memory.path) {
      let targets: AnyStructure[] = creep.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            structure.hits < structure.hitsMax &&
            structure.structureType !== STRUCTURE_WALL &&
            structure.structureType !== STRUCTURE_RAMPART
          );
        },
      });

      targets = _.sortBy(targets, (target) => creep.pos.getRangeTo(target));

      if (targets.length === 0) {
        const constructionTargets = creep.room.find(FIND_CONSTRUCTION_SITES);
        if (constructionTargets.length > 0) {
          creep.memory.targetId = constructionTargets[0].id as Id<
            ConstructionSite<BuildableStructureConstant>
          >;
          creep.memory.path = creep.pos.findPathTo(constructionTargets[0].pos);
        }
      } else {
        creepService.getPathTotargets(creep, targets);
      }
    } else {
      this.moveAndTransfer(creep);
    }
  },

  moveAndTransfer(creep: Creep): void {
    creepService.drawPath(creep);
    const target = Game.getObjectById(
      creep.memory.targetId as Id<Structure | ConstructionSite>
    );

    if (!target) {
      creep.memory.path = undefined;
      creep.memory.targetId = null;
      return;
    }

    let action: ScreepsReturnCode | undefined;

    if ("progress" in target) {
      action = creep.build(target);
    } else {
      if (target.hitsMax > target.hits) {
        action = creep.repair(target);
      } else {
        creep.memory.path = undefined;
        creep.memory.targetId = null;
      }
    }

    if (action === ERR_NOT_IN_RANGE) {
      const moveResult = creep.moveByPath(creep.memory.path as PathStep[]);
      if (moveResult !== OK && moveResult !== ERR_TIRED) {
        console.log("Move by path failed, error:", moveResult);
        creep.memory.path = undefined;
        creep.memory.targetId = null;
      }
    } else if (action === ERR_INVALID_TARGET || action === ERR_NO_BODYPART) {
      creep.memory.path = undefined;
      creep.memory.targetId = null;
    }
  },
};

export default roleBuilder;
