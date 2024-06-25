const containerService = {
  buildContainers: function (room: Room) {
    if (room.controller && room.controller.my) {
      const sources = room.find(FIND_SOURCES);

      for (let source of sources) {
        const bestPosition = this.findBestContainerPosition(room, source.pos);
        if (bestPosition) {
          // console.log(
          //   `Best position for container near source at ${source.pos}: ${bestPosition}`
          // );
          room.createConstructionSite(
            bestPosition.x,
            bestPosition.y,
            STRUCTURE_CONTAINER
          );
          // room.createFlag(
          //   bestPosition,
          //   `ContainerFlag-${source.id}`,
          //   COLOR_YELLOW
          // );
        }
      }
    }
  },

  findBestContainerPosition: function (
    room: Room,
    sourcePos: RoomPosition
  ): RoomPosition | null {
    const terrain = room.getTerrain();
    const offsets = [
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
    let bestPosition: RoomPosition | null = null;
    let maxFreeSpaces = -1;

    for (let offset of offsets) {
      const x = sourcePos.x + offset.x;
      const y = sourcePos.y + offset.y;

      // Ensure the position is within room boundaries and not a wall.
      if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
        const area = room.lookForAtArea(
          LOOK_TERRAIN,
          y - 1,
          x - 1,
          y + 1,
          x + 1,
          true
        );
        const freeSpaces = area.filter(
          (spot) => spot.terrain !== "wall"
        ).length;

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

export default containerService;
