import _ from "lodash";
import creepService from "./creep.service";
import { CreepRole } from "./role.interface";

const roleBuilder: CreepRole = {
  creepsPerRoom: 2,
  namePrefix: "Builder",
  memoryKey: "builder",
  bodyParts: [WORK, CARRY, MOVE],
  maxBodyPartsMultiplier: 5,
  creepsPerSourcePositions: {
    "1": 1,
    "2": 1,
    "3": 1,
    "4": 1,
    "5": 1,
  },
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
      creepService.getDamagedStructures(creep);

      if (!creep.memory.path) {
        creepService.findConstructionSite(creep);
      }
    } else {
      this.moveAndTransfer(creep);
    }
  },

  moveAndTransfer(creep: Creep): void {
    const target: any = Game.getObjectById(creep.memory.targetId as any);

    if (!target) {
      return;
    }

    creepService.drawPath(creep);

    let action: any = creep.repair(target);

    if ("progress" in target) {
      action = creep.build(target);
    }

    if (action === ERR_NOT_IN_RANGE) {
      const moveResult = creep.moveByPath(creep.memory.path as PathStep[]);

      if (!("progress" in target) && target.hits === target.hitsMax) {
        creep.memory.path = undefined;
        creep.memory.targetId = null;
      }

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
