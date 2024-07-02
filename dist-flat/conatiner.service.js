"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var containerService = {
    buildContainers: function (room) {
        if (room.controller && room.controller.my) {
            var sources = room.find(FIND_SOURCES);
            for (var _i = 0, sources_1 = sources; _i < sources_1.length; _i++) {
                var source = sources_1[_i];
                var bestPosition = this.findBestContainerPosition(room, source.pos);
                if (bestPosition) {
                    // console.log(
                    //   `Best position for container near source at ${source.pos}: ${bestPosition}`
                    // );
                    room.createConstructionSite(bestPosition.x, bestPosition.y, STRUCTURE_CONTAINER);
                    // room.createFlag(
                    //   bestPosition,
                    //   `ContainerFlag-${source.id}`,
                    //   COLOR_YELLOW
                    // );
                }
            }
        }
    },
    findBestContainerPosition: function (room, sourcePos) {
        var terrain = room.getTerrain();
        var offsets = [
            { x: -2, y: -2 },
            { x: -1, y: -2 },
            { x: 0, y: -2 },
            { x: 1, y: -2 },
            { x: 2, y: -2 },
            { x: -2, y: -1 },
            { x: 2, y: -1 },
            { x: -2, y: 0 },
            { x: 2, y: 0 },
            { x: -2, y: 1 },
            { x: 2, y: 1 },
            { x: -2, y: 2 },
            { x: -1, y: 2 },
            { x: 0, y: 2 },
            { x: 1, y: 2 },
            { x: 2, y: 2 },
        ];
        var bestPosition = null;
        var maxFreeSpaces = -1;
        for (var _i = 0, offsets_1 = offsets; _i < offsets_1.length; _i++) {
            var offset = offsets_1[_i];
            var x = sourcePos.x + offset.x;
            var y = sourcePos.y + offset.y;
            // Ensure the position is within room boundaries and not a wall.
            if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
                var area = room.lookForAtArea(LOOK_TERRAIN, y - 1, x - 1, y + 1, x + 1, true);
                var freeSpaces = area.filter(function (spot) { return spot.terrain !== "wall"; }).length;
                // Check if this position has more free spaces than the current best.
                if (freeSpaces > maxFreeSpaces) {
                    bestPosition = new RoomPosition(x, y, room.name);
                    maxFreeSpaces = freeSpaces;
                }
            }
        }
        return bestPosition;
    },
};
exports.default = containerService;
