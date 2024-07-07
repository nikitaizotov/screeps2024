interface ScoutRoomMemory {
  scouted: boolean;
  lastScouted: number;
  empty: boolean;
  attacked: boolean;
  attacker: string | null;
}

interface Memory {
  scoutRooms: { [roomName: string]: ScoutRoomMemory };
}
