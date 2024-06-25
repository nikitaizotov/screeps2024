"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var utilsService = {
    repeatArray: function (array, times) {
        try {
            var repeatedArray = [];
            for (var i = 0; i < times; i++) {
                repeatedArray = repeatedArray.concat(array);
            }
            return repeatedArray;
        }
        catch (error) {
            console.log("Error in repeatArray: ".concat(error.message));
            return array;
        }
    },
    getTotalEnergyInExtensions: function (room) {
        try {
            var extensions = room.find(FIND_MY_STRUCTURES, {
                filter: { structureType: STRUCTURE_EXTENSION },
            });
            var totalEnergy = extensions.reduce(function (sum, extension) { return sum + extension.energy; }, 0);
            return totalEnergy;
        }
        catch (error) {
            console.log("Error in getTotalEnergyInExtensions: ".concat(error.message));
            return 0;
        }
    },
    /**
     * Will activate Safe Mode if needed and if there is Safe Mode to activate.
     * @param {*} room
     */
    isSafeModeNeeded: function (room) {
        try {
            // Check if room is mine.
            if (room.controller && room.controller.my) {
                // Check all structures in room excluding walls.
                var structures = room.find(FIND_STRUCTURES, {
                    filter: function (structure) {
                        return structure.structureType !== STRUCTURE_WALL &&
                            structure.structureType !== STRUCTURE_RAMPART &&
                            structure.structureType !== STRUCTURE_ROAD;
                    },
                });
                // Check, if structure were attacked.
                var structuresDamaged = structures.some(function (structure) { return structure.hits < structure.hitsMax; });
                var hostiles = room.find(FIND_HOSTILE_CREEPS);
                if (structuresDamaged && hostiles.length > 0) {
                    // Check, if there is a Safe Modes available.
                    if (room.controller.safeModeAvailable > 0) {
                        // Activate Safe Mode.
                        room.controller.activateSafeMode();
                        console.log("Activated Safe Mode in room ".concat(room.name, " because of attack."));
                    }
                    else {
                        console.log("No available Safe Modes for activation in room ".concat(room.name, "."));
                    }
                }
            }
        }
        catch (error) {
            console.log("Error in isSafeModeNeeded method, ".concat(error));
        }
    },
};
exports.default = utilsService;
