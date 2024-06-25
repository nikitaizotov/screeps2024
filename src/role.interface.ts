export interface CreepRole {
  creepsPerRoom: number;
  namePrefix: string;
  memoryKey: string;
  bodyParts: BodyPartConstant[];
  run: (creep: Creep) => void;
  baseBodyParts?: BodyPartConstant[];
  [key: string]: any;
}