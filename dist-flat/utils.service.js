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
                            structure.structureType !== STRUCTURE_ROAD &&
                            structure.structureType !== STRUCTURE_CONTAINER;
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
    getRoomData: function () {
        try {
            if (!Memory.roomData) {
                Memory.roomData = {
                    sourcePositions: {},
                };
            }
            var _loop_1 = function (roomName) {
                var room = Game.rooms[roomName];
                var controller = room.controller;
                if ((controller === null || controller === void 0 ? void 0 : controller.my) && !Memory.roomData.sourcePositions[roomName]) {
                    var sources = room.find(FIND_SOURCES);
                    var totalCount_1 = 0;
                    for (var _i = 0, sources_1 = sources; _i < sources_1.length; _i++) {
                        var source = sources_1[_i];
                        var look = room.lookAtArea(source.pos.y - 1, source.pos.x - 1, source.pos.y + 1, source.pos.x + 1, true);
                        look.forEach(function (item) {
                            if ((item === null || item === void 0 ? void 0 : item.terrain) === "swamp" || (item === null || item === void 0 ? void 0 : item.terrain) === "plain") {
                                totalCount_1++;
                            }
                        });
                    }
                    Memory.roomData.sourcePositions[roomName] = totalCount_1;
                }
            };
            for (var roomName in Game.rooms) {
                _loop_1(roomName);
            }
        }
        catch (error) {
            console.log("Error in getRoomMiningPositions: ".concat(error.message));
        }
    },
};
exports.default = utilsService;
