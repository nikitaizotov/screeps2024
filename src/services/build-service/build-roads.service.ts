import { CacheService } from "../cache.service";

export class BuildRoadsService {
  private cacheService = new CacheService();
  planRoads(room: Room): void {
    try {
      if (!Memory.cachedPaths) Memory.cachedPaths = [];
      if (!Memory.connectedPoints) Memory.connectedPoints = {};

      let allSpawns: RoomPosition[] = [];

      let spawns = room.find(FIND_MY_SPAWNS);
      for (let spawn of spawns) allSpawns.push(spawn.pos);

      const hashPos = (pos: RoomPosition): string =>
        `${pos.roomName}_${pos.x}_${pos.y}`;

      const addConnection = (pos1: RoomPosition, pos2: RoomPosition): void => {
        let key1 = hashPos(pos1);
        let key2 = hashPos(pos2);
        if (!Memory.connectedPoints[key1]) Memory.connectedPoints[key1] = [];
        Memory.connectedPoints[key1].push(key2);
      };

      const isConnected = (pos1: RoomPosition, pos2: RoomPosition): boolean => {
        let key1 = hashPos(pos1);
        let key2 = hashPos(pos2);
        return (
          Memory.connectedPoints[key1] &&
          Memory.connectedPoints[key1].includes(key2)
        );
      };

      const checkAndRepairRoad = (): void => {
        for (let posData of Memory.cachedPaths) {
          let pos = new RoomPosition(posData.x, posData.y, posData.roomName);
          let room = Game.rooms[pos.roomName];
          if (room && room.controller && room.controller.my) {
            let structures = room.lookForAt(LOOK_STRUCTURES, pos.x, pos.y);
            let hasRoad = structures.some(
              (s) => s.structureType === STRUCTURE_ROAD
            );

            if (!hasRoad) {
              let constructionSites = room.lookForAt(
                LOOK_CONSTRUCTION_SITES,
                pos.x,
                pos.y
              );
              let hasConstructionSite = constructionSites.some(
                (s) => s.structureType === STRUCTURE_ROAD
              );

              if (!hasConstructionSite)
                room.createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);
            }
          }
        }
      };

      const planRoadBetween = (
        pos1: RoomPosition,
        pos2: RoomPosition
      ): void => {
        if (isConnected(pos1, pos2)) return;

        let path = PathFinder.search(
          pos1,
          { pos: pos2, range: 1 },
          {
            plainCost: 2,
            swampCost: 10,
            roomCallback: function (roomName) {
              let room = Game.rooms[roomName];
              if (!room || !room.controller || !room.controller.my)
                return new PathFinder.CostMatrix();

              let costs = new PathFinder.CostMatrix();

              room.find(FIND_STRUCTURES).forEach(function (struct) {
                if (struct.structureType === STRUCTURE_ROAD)
                  costs.set(struct.pos.x, struct.pos.y, 1);
                else if (
                  struct.structureType !== STRUCTURE_CONTAINER &&
                  struct.structureType !== STRUCTURE_RAMPART &&
                  !(struct instanceof OwnedStructure && struct.my === false)
                )
                  costs.set(struct.pos.x, struct.pos.y, 0xff);
              });

              return costs;
            },
          }
        ).path;

        Memory.cachedPaths.push(
          ...path.map((pos) => ({
            x: pos.x,
            y: pos.y,
            roomName: pos.roomName,
          }))
        );

        for (let pos of path) {
          Game.rooms[pos.roomName].createConstructionSite(
            pos.x,
            pos.y,
            STRUCTURE_ROAD
          );
        }

        addConnection(pos1, pos2);
      };

      let keyPoints: RoomPosition[] = [];

      for (let spawn of spawns) keyPoints.push(spawn.pos);

      let sources = this.cacheService.findSources(room);
      for (let source of sources) keyPoints.push(source.pos);

      let controller = room.controller;
      if (controller) keyPoints.push(controller.pos);

      for (let i = 0; i < keyPoints.length; i++) {
        for (let j = i + 1; j < keyPoints.length; j++) {
          planRoadBetween(keyPoints[i], keyPoints[j]);
        }
      }

      checkAndRepairRoad();
    } catch (error: any) {
      console.log(`Error in planRoads: ${error.message}`);
    }
  }

  buildRoadsAroundStructures(room: Room): void {
    try {
      const structures = room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            structure.structureType !== STRUCTURE_ROAD &&
            structure.structureType !== STRUCTURE_WALL &&
            structure.structureType !== STRUCTURE_RAMPART
          );
        },
      });

      structures.forEach((structure) => {
        let x = structure.pos.x;
        let y = structure.pos.y;

        let positions = [
          ///[x - 1, y - 1],
          [x, y - 1],
          ///[x + 1, y - 1],
          [x - 1, y],
          [x + 1, y],
          ///[x - 1, y + 1],
          [x, y + 1],
          ///[x + 1, y + 1],
        ];

        positions.forEach((pos) => {
          let [x, y] = pos;
          if (x >= 0 && x <= 49 && y >= 0 && y <= 49) {
            let look = room.lookAt(x, y);
            let isRoadPresent = look.some(
              (lookObject) =>
                lookObject.type === LOOK_STRUCTURES &&
                lookObject.structure &&
                lookObject.structure.structureType === STRUCTURE_ROAD
            );
            let isConstructionSitePresent = look.some(
              (lookObject) =>
                lookObject.type === LOOK_CONSTRUCTION_SITES &&
                lookObject.constructionSite &&
                lookObject.constructionSite.structureType === STRUCTURE_ROAD
            );
            let isObstacle = look.some(
              (lookObject) =>
                lookObject.type === LOOK_TERRAIN &&
                lookObject.terrain === "wall"
            );

            if (!isRoadPresent && !isConstructionSitePresent && !isObstacle) {
              room.createConstructionSite(x, y, STRUCTURE_ROAD);
            }
          }
        });
      });
    } catch (error: any) {
      console.log(`Error in buildRoadsAroundStructures: ${error.message}`);
    }
  }

  buildRoadsFromFirstStructure(room: Room, startPos: RoomPosition): void {
    try {
      let sources = this.cacheService.findSources(room);
      let controller = room.controller;

      let targets = sources.map((source) => source.pos);
      if (controller) targets.push(controller.pos);

      for (let target of targets) {
        let path = PathFinder.search(
          startPos,
          { pos: target, range: 1 },
          {
            plainCost: 2,
            swampCost: 10,
            roomCallback: function (roomName) {
              let room = Game.rooms[roomName];
              if (!room || !room.controller || !room.controller.my)
                return new PathFinder.CostMatrix();

              let costs = new PathFinder.CostMatrix();

              room.find(FIND_STRUCTURES).forEach(function (struct) {
                if (struct.structureType === STRUCTURE_ROAD)
                  costs.set(struct.pos.x, struct.pos.y, 1);
                else if (
                  struct.structureType !== STRUCTURE_CONTAINER &&
                  struct.structureType !== STRUCTURE_RAMPART &&
                  (struct as OwnedStructure).my !== false
                )
                  costs.set(struct.pos.x, struct.pos.y, 0xff);
              });


              return costs;
            },
          }
        ).path;

        for (let pos of path) {
          room.createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);
        }
      }
    } catch (error: any) {
      console.log(`Error in buildRoadsFromFirstStructure: ${error.message}`);
    }
  }
}
