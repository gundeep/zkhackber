declare module 'oimo' {
  export interface WorldOptions {
    timestep?: number;
    iterations?: number;
    broadphase?: number;
    worldscale?: number;
    random?: boolean;
    info?: boolean;
    gravity?: [number, number, number];
  }

  export interface BodyOptions {
    type: 'box' | 'sphere' | 'cylinder';
    size?: [number, number, number] | number;
    pos?: [number, number, number];
    rot?: [number, number, number];
    move?: boolean;
    density?: number;
    friction?: number;
    restitution?: number;
    belongsTo?: number;
    collidesWith?: number;
  }

  export class World {
    constructor(options?: WorldOptions);
    add(options: BodyOptions): any;
    step(timestep: number): void;
    clear(): void;
  }

  export interface Body {
    getPosition(): { x: number; y: number; z: number };
    getQuaternion(): { x: number; y: number; z: number; w: number };
    linearVelocity: { x: number; y: number; z: number };
    angularVelocity: { x: number; y: number; z: number };
  }
} 