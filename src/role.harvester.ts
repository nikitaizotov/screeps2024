import _ from "lodash";
import creepService from "./creep.service";
import { CreepRole } from "./role.interface";

const roleHarvester: CreepRole = {
  creepsPerRoom: 5,
  namePrefix: "Harvester",
  memoryKey: "harvester",
  bodyParts: [WORK, CARRY, MOVE],

  // Main function to run the harvester role.
  run(creep: Creep): void {
    if (creep.spawning) {
      return;
    }

    // Check if the creep should start harvesting.
    if (
      (creep.memory.transferring || creep.memory.transferring === undefined) &&
      creep.store[RESOURCE_ENERGY] == 0
    ) {
      creep.memory.transferring = false;
      creep.memory.path = undefined;
      creep.memory.targetId = null;
      creep.say("🔄 harvest");
    }
    // Check if the creep should start transferring energy.
    if (!creep.memory.transferring && creep.store.getFreeCapacity() == 0) {
      creep.memory.transferring = true;
      creep.memory.path = undefined;
      creep.memory.targetId = null;
      creep.say("⚡ transfer");
    }

    // Execute the appropriate action based on the creep's state.
    if (creep.memory.transferring) {
      this.transferEnergy(creep);
    } else {
      this.harvestEnergy(creep);
    }
  },

  // Function to transfer energy to the appropriate structure.
  transferEnergy(creep: Creep): void {
    const target = Game.getObjectById(
      creep.memory.targetId as Id<Structure<StructureConstant>>
    );

    // Reset target if it's invalid or full.
    if (
      !target ||
      ("store" in target &&
        (target as AnyStoreStructure).store.getFreeCapacity(RESOURCE_ENERGY) ===
          0)
    ) {
      creep.memory.path = undefined;
      creep.memory.targetId = null;
    }

    // Find new target if needed.
    if (!creep.memory.path || !creep.memory.targetId) {
      const targets = this.getPriorityTargets(creep.room, creep);

      if (targets.length) {
        const newTarget = targets[0];
        creep.memory.targetId = newTarget.id as Id<
          Structure<StructureConstant>
        >;
        creep.memory.path = creep.pos.findPathTo(newTarget);
      } else {
        // Switch to the next task if no energy consumers found.
        this.switchToNextTask(creep);
      }
    } else {
      creepService.drawPath(creep);
      this.moveAndTransfer(creep);
    }
  },

  // Function to get priority targets for energy transfer.
  getPriorityTargets(room: Room, creep: Creep): AnyStructure[] {
    const targets = room.find(FIND_STRUCTURES, {
      filter: (structure: AnyStructure) => {
        return (
          (structure.structureType === STRUCTURE_SPAWN ||
            structure.structureType === STRUCTURE_TOWER ||
            structure.structureType === STRUCTURE_EXTENSION) &&
          structure.store &&
          structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        );
      },
    });

    const spawns = targets.filter((t) => t.structureType === STRUCTURE_SPAWN);
    const extensions = targets.filter(
      (t) => t.structureType === STRUCTURE_EXTENSION
    );
    const towers = targets.filter((t) => t.structureType === STRUCTURE_TOWER);

    const sortedExtensions = extensions
      .filter((ext) => !this.isTargetedByOtherCreeps(ext))
      .sort((a, b) => creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b));
    const sortedSpawns = spawns
      .filter((spawn) => !this.isTargetedByOtherCreeps(spawn))
      .sort((a, b) => creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b));
    const sortedTowers = towers.sort(
      (a, b) => creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b)
    );

    return [...sortedSpawns, ...sortedExtensions, ...sortedTowers];
  },

  // Function to check if a target is already targeted by other creeps.
  isTargetedByOtherCreeps(target: AnyStructure): boolean {
    return _.some(Object.values(Game.creeps), (c: Creep) => {
      return c.memory.targetId === target.id && c.memory.transferring;
    });
  },

  // Function to check if a spawn is satisfied.
  isSpawnSatisfied(spawn: StructureSpawn, room: Room): boolean {
    const incomingEnergy = _.sumBy(
      room.find(FIND_MY_CREEPS, {
        filter: (c) => c.memory.targetId === spawn.id && c.memory.transferring,
      }),
      (c) => c.store[RESOURCE_ENERGY]
    );

    return spawn.store.getFreeCapacity(RESOURCE_ENERGY) - incomingEnergy <= 0;
  },

  // Function to check if an extension is satisfied.
  isExtensionSatisfied(extension: StructureExtension, room: Room): boolean {
    const incomingEnergy = _.sumBy(
      room.find(FIND_MY_CREEPS, {
        filter: (c) =>
          c.memory.targetId === extension.id && c.memory.transferring,
      }),
      (c) => c.store[RESOURCE_ENERGY]
    );

    return (
      extension.store.getFreeCapacity(RESOURCE_ENERGY) - incomingEnergy <= 0
    );
  },

  // Function to check if a tower is satisfied.
  isTowerSatisfied(tower: StructureTower, room: Room): boolean {
    const incomingEnergy = _.sumBy(
      room.find(FIND_MY_CREEPS, {
        filter: (c) => c.memory.targetId === tower.id && c.memory.transferring,
      }),
      (c) => c.store[RESOURCE_ENERGY]
    );

    return tower.store.getFreeCapacity(RESOURCE_ENERGY) - incomingEnergy <= 0;
  },

  // Function to harvest energy from sources.
  harvestEnergy(creep: Creep): void {
    if (!creep.memory.path || !creep.memory.targetId) {
      creepService.getPathToSource(creep);
    } else {
      creepService.moveAndHarvest(creep);
    }
  },

  // Function to move to the target and transfer energy.
  moveAndTransfer(creep: Creep): void {
    const target = Game.getObjectById(
      creep.memory.targetId as Id<
        AnyStructure | ConstructionSite<BuildableStructureConstant>
      >
    );

    if (
      !target ||
      ("store" in target &&
        (target as AnyStoreStructure).store.getFreeCapacity(RESOURCE_ENERGY) ===
          0)
    ) {
      creep.memory.path = undefined;
      creep.memory.targetId = null;
      // Switch to the next task if the target is invalid or filled.
      this.switchToNextTask(creep);
      return;
    }

    let action: ScreepsReturnCode;

    // Transfer energy to the target.
    if (
      "store" in target &&
      (target as AnyStoreStructure).store.getFreeCapacity(RESOURCE_ENERGY) > 0
    ) {
      action = creep.transfer(target as AnyStoreStructure, RESOURCE_ENERGY);
    } else if (target.structureType === STRUCTURE_CONTROLLER) {
      action = creep.upgradeController(target as StructureController);
    } else if (target instanceof ConstructionSite) {
      action = creep.build(target);
    } else {
      // Handle other target types if necessary
      action = ERR_INVALID_TARGET;
    }

    // Move towards the target if not in range.
    if (action === ERR_NOT_IN_RANGE) {
      const moveResult = creep.moveByPath(creep.memory.path as PathStep[]);
      if (moveResult !== OK && moveResult !== ERR_TIRED) {
        console.log("Move by path failed, error:", moveResult);
        creep.memory.path = undefined;
        creep.memory.targetId = null;
        // Switch to the next task if movement fails.
        this.switchToNextTask(creep);
      }
    } else if (
      action === ERR_FULL ||
      action === ERR_INVALID_TARGET ||
      action === ERR_NO_BODYPART
    ) {
      // Clear the memory of all creeps targeting this structure if it is filled.
      if (target.structureType !== STRUCTURE_EXTENSION) {
        this.clearTargetMemory(target.id as Id<AnyStructure>, creep.room.name);
      }
      creep.memory.path = undefined;
      creep.memory.targetId = null;
      // Switch to the next task if the action fails.
      this.switchToNextTask(creep);
    }
  },

  // Function to clear target memory for all creeps.
  clearTargetMemory(targetId: Id<AnyStructure>, roomName: string): void {
    _.forEach(Game.creeps, (creep: Creep) => {
      if (
        creep.memory.targetId === targetId &&
        creep.room.name === roomName &&
        creep.memory.transferring
      ) {
        creep.memory.path = undefined;
        creep.memory.targetId = null;
      }
    });
  },

  // Function to switch to the next task.
  switchToNextTask(creep: Creep): void {
    const targets = this.getPriorityTargets(creep.room, creep);

    if (targets.length) {
      const newTarget = targets[0];
      creep.memory.targetId = newTarget.id as Id<Structure<StructureConstant>>;
      creep.memory.path = creep.pos.findPathTo(newTarget);
    } else {
      const constructionSites = creep.room.find(FIND_CONSTRUCTION_SITES);
      if (constructionSites.length > 0) {
        const newTarget = constructionSites[0];
        creep.memory.targetId = newTarget.id as Id<ConstructionSite>;
        creep.memory.path = creep.pos.findPathTo(newTarget);
      } else {
        const controller = creep.room.controller;
        if (controller) {
          creep.memory.targetId = controller.id;
          creep.memory.path = creep.pos.findPathTo(controller);
        }
      }
    }
  },
};

export default roleHarvester;
