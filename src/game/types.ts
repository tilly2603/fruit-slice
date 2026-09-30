export type FruitType = 'apple' | 'orange' | 'banana' | 'watermelon' | 'pineapple' | 'starfruit';

export interface FruitConfig {
  type: FruitType;
  name: string;
  points: number;
  radius: number;
  color: string;
  innerColor: string;
  accentColor: string;
  isSpecial?: boolean;
}

export const FRUIT_CONFIGS: Record<FruitType, FruitConfig> = {
  apple: {
    type: 'apple',
    name: 'Apple',
    points: 10,
    radius: 44,
    color: '#ef4444',
    innerColor: '#fef08a',
    accentColor: '#15803d',
  },
  orange: {
    type: 'orange',
    name: 'Orange',
    points: 15,
    radius: 46,
    color: '#f97316',
    innerColor: '#ffedd5',
    accentColor: '#ea580c',
  },
  banana: {
    type: 'banana',
    name: 'Banana',
    points: 20,
    radius: 48,
    color: '#eab308',
    innerColor: '#fef9c3',
    accentColor: '#ca8a04',
  },
  watermelon: {
    type: 'watermelon',
    name: 'Watermelon',
    points: 25,
    radius: 56,
    color: '#16a34a',
    innerColor: '#f43f5e',
    accentColor: '#14532d',
  },
  pineapple: {
    type: 'pineapple',
    name: 'Pineapple',
    points: 30,
    radius: 52,
    color: '#d97706',
    innerColor: '#fef08a',
    accentColor: '#15803d',
  },
  starfruit: {
    type: 'starfruit',
    name: 'Star Fruit',
    points: 60,
    radius: 48,
    color: '#facc15',
    innerColor: '#fef9c3',
    accentColor: '#ca8a04',
    isSpecial: true,
  },
};

export interface Fruit {
  id: string;
  type: FruitType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  vRot: number;
  points: number;
  sliced: boolean;
  gravity?: number;
}

export interface Bomb {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  vRot: number;
  sliced: boolean;
  gravity?: number;
  fusePhase: number;
}

export interface SlicedHalf {
  id: string;
  type: FruitType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  vRot: number;
  sliceAngle: number;
  side: 'left' | 'right';
  alpha: number;
  gravity?: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  type: 'juice' | 'spark' | 'ring' | 'fire' | 'smoke' | 'star';
  rotation?: number;
  vRot?: number;
}

export interface SplatDecal {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
  splatPoints: { x: number; y: number; r: number }[];
}

export interface ComboBanner {
  id: string;
  text: string;
  subtext: string;
  x: number;
  y: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  time: number;
}

export type GameMode = 'touch' | 'camera';

export type GameOverReason = 'time' | 'bomb';

export type GameState = 'start' | 'playing' | 'gameover';
