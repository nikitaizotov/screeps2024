module.exports = {
    run: function() {
        if (Game.time % 15000 === 0) {
            this.planRoads();
        }
    },
    planRoads: function() {
        let keyPoints = [];
    
        for (let spawnName in Game.spawns) {
            keyPoints.push(Game.spawns[spawnName].pos);
        }
        
        let sources = Game.rooms[Object.keys(Game.rooms)[0]].find(FIND_SOURCES);
        for (let source of sources) {
            keyPoints.push(source.pos);
        }
        
        let controller = Game.rooms[Object.keys(Game.rooms)[0]].controller;
        keyPoints.push(controller.pos);
        
        for (let i = 0; i < keyPoints.length; i++) {
            for (let j = i + 1; j < keyPoints.length; j++) {
                let path = PathFinder.search(keyPoints[i], { pos: keyPoints[j], range: 1 }, {
                    plainCost: 2,
                    swampCost: 10,
                    roomCallback: function(roomName) {
                        let room = Game.rooms[roomName];
                        if (!room) return;
                        let costs = new PathFinder.CostMatrix;
    
                        room.find(FIND_STRUCTURES).forEach(function(struct) {
                            if (struct.structureType === STRUCTURE_ROAD) {
                                costs.set(struct.pos.x, struct.pos.y, 1);
                            } else if (struct.structureType !== STRUCTURE_CONTAINER &&
                                       struct.structureType !== STRUCTURE_RAMPART ||
                                       !struct.my) {
                                costs.set(struct.pos.x, struct.pos.y, 0xff);
                            }
                        });
    
                        room.find(FIND_CREEPS).forEach(function(creep) {
                            costs.set(creep.pos.x, creep.pos.y, 0xff);
                        });
    
                        return costs;
                    }
                }).path;
    
                for (let pos of path) {
                    Game.rooms[pos.roomName].createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);
                }
            }
        }
    }
};