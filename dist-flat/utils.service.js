"use strict";
// const profiler = require("./screeps-profiler");
Object.defineProperty(exports, "__esModule", { value: true });
const utilsService = {
    repeatArray: function (array, times) {
        try {
            let repeatedArray = [];
            for (let i = 0; i < times; i++) {
                repeatedArray = repeatedArray.concat(array);
            }
            return repeatedArray;
        }
        catch (error) {
            console.log(`Error in repeatArray: ${error.message}`);
            return array;
        }
    },
    getTotalEnergyInExtensions: function (room) {
        try {
            const extensions = room.find(FIND_MY_STRUCTURES, {
                filter: { structureType: STRUCTURE_EXTENSION },
            });
            const totalEnergy = extensions.reduce((sum, extension) => sum + extension.energy, 0);
            return totalEnergy;
        }
        catch (error) {
            console.log(`Error in getTotalEnergyInExtensions: ${error.message}`);
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
                const structures = room.find(FIND_STRUCTURES, {
                    filter: (structure) => structure.structureType !== STRUCTURE_WALL &&
                        structure.structureType !== STRUCTURE_RAMPART &&
                        structure.structureType !== STRUCTURE_ROAD &&
                        structure.structureType !== STRUCTURE_CONTAINER,
                });
                // Check, if structure were attacked.
                const structuresDamaged = structures.some((structure) => structure.hits < structure.hitsMax);
                const hostiles = room.find(FIND_HOSTILE_CREEPS);
                if (structuresDamaged && hostiles.length > 0) {
                    // Check, if there is a Safe Modes available.
                    if (room.controller.safeModeAvailable > 0) {
                        // Activate Safe Mode.
                        room.controller.activateSafeMode();
                        console.log(`Activated Safe Mode in room ${room.name} because of attack.`);
                    }
                    else {
                        console.log(`No available Safe Modes for activation in room ${room.name}.`);
                    }
                }
            }
        }
        catch (error) {
            console.log(`Error in isSafeModeNeeded method, ${error}`);
        }
    },
    getRoomData: function () {
        try {
            if (!Memory.roomData) {
                Memory.roomData = {
                    sourcePositions: {},
                };
            }
            for (let roomName in Game.rooms) {
                const room = Game.rooms[roomName];
                const controller = room.controller;
                if ((controller === null || controller === void 0 ? void 0 : controller.my) && !Memory.roomData.sourcePositions[roomName]) {
                    const sources = room.find(FIND_SOURCES);
                    let totalCount = 0;
                    for (let source of sources) {
                        const look = room.lookAtArea(source.pos.y - 1, source.pos.x - 1, source.pos.y + 1, source.pos.x + 1, true);
                        look.forEach((item) => {
                            if ((item === null || item === void 0 ? void 0 : item.terrain) === "swamp" || (item === null || item === void 0 ? void 0 : item.terrain) === "plain") {
                                totalCount++;
                            }
                        });
                    }
                    Memory.roomData.sourcePositions[roomName] = totalCount;
                }
            }
        }
        catch (error) {
            console.log(`Error in getRoomMiningPositions: ${error.message}`);
        }
    },
};
// profiler.registerObject(utilsService, "utilsService");
exports.default = utilsService;
