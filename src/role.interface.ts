export interface CreepPerSourcePositions {
  [num: number]: number;
}

export interface CreepRole {
  creepsPerRoom: number;
  namePrefix: string;
  memoryKey: string;
  bodyParts: BodyPartConstant[];
  run: (creep: Creep) => void;
  baseBodyParts?: BodyPartConstant[];
  maxBodyPartsMultiplier?: number;
  [key: string]: any;
  creepsPerSourcePositions?: CreepPerSourcePositions;
}
