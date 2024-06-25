const utilsService = {
  repeatArray: function (array: any[], times: number) {
    try {
      let repeatedArray: any[] = [];
      for (let i = 0; i < times; i++) {
        repeatedArray = repeatedArray.concat(array);
      }
      return repeatedArray;
    } catch (error: any) {
      console.log(`Error in repeatArray: ${error.message}`);
      return array;
    }
  },

  getTotalEnergyInExtensions: function (room: any) {
    try {
      const extensions: any[] = room.find(FIND_MY_STRUCTURES, {
        filter: { structureType: STRUCTURE_EXTENSION },
      });

      const totalEnergy = extensions.reduce(
        (sum, extension) => sum + extension.energy,
        0
      );

      return totalEnergy;
    } catch (error: any) {
      console.log(`Error in getTotalEnergyInExtensions: ${error.message}`);
      return 0;
    }
  },

  /**
   * Will activate Safe Mode if needed and if there is Safe Mode to activate.
   * @param {*} room
   */
  isSafeModeNeeded: function (room: any) {
    try {
      // Check if room is mine.
      if (room.controller && room.controller.my) {
        // Check all structures in room excluding walls.
        const structures = room.find(FIND_STRUCTURES, {
          filter: (structure: any) =>
            structure.structureType !== STRUCTURE_WALL &&
            structure.structureType !== STRUCTURE_RAMPART &&
            structure.structureType !== STRUCTURE_ROAD,
        });

        // Check, if structure were attacked.
        const structuresDamaged = structures.some(
          (structure: any) => structure.hits < structure.hitsMax
        );

        const hostiles = room.find(FIND_HOSTILE_CREEPS);

        if (structuresDamaged && hostiles.length > 0) {
          // Check, if there is a Safe Modes available.
          if (room.controller.safeModeAvailable > 0) {
            // Activate Safe Mode.
            room.controller.activateSafeMode();
            console.log(
              `Activated Safe Mode in room ${room.name} because of attack.`
            );
          } else {
            console.log(
              `No available Safe Modes for activation in room ${room.name}.`
            );
          }
        }
      }
    } catch (error) {
      console.log(`Error in isSafeModeNeeded method, ${error}`);
    }
  },
};

export default utilsService;
