export type Position = 'GK' | 'CB' | 'LB' | 'RB' | 'CDM' | 'CM' | 'CAM' | 'LW' | 'RW' | 'ST';

export interface Player {
  id: string;
  name: string;
  number: number;
  position: Position;
  age: number;
  overall: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defense: number;
  physical: number;
  stamina: number; // 0 - 100
  morale: number; // 0 - 100
  value: number; // in $ millions
  wage: number; // in $ thousands / week
  avatarColor: string;
  goals: number;
  assists: number;
  form: 'excellent' | 'good' | 'average' | 'poor';
}

export type Formation = '4-3-3' | '4-4-2' | '3-5-2' | '4-2-3-1' | '5-3-2';
export type TacticalStyle = 'Tiki-Taka' | 'Gegenpress' | 'Counter' | 'Park the Bus' | 'Direct';
export type Mentality = 'very_defensive' | 'defensive' | 'balanced' | 'attacking' | 'all_out_attack';

export interface TacticsConfig {
  formation: Formation;
  style: TacticalStyle;
  mentality: Mentality;
  tempo: 'slow' | 'balanced' | 'fast';
  pressing: 'low' | 'medium' | 'high';
  width: 'narrow' | 'standard' | 'wide';
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  city: string;
  primaryColor: string;
  secondaryColor: string;
  stadiumName: string;
  budget: number; // in millions
  wageBill: number; // weekly in thousands
  tactics: TacticsConfig;
  squad: Player[];
  startingXI: string[]; // Player IDs (11 players)
  substitutes: string[]; // Player IDs
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface MatchEvent {
  id: string;
  minute: number;
  type: 'goal' | 'shot' | 'save' | 'foul' | 'yellow_card' | 'red_card' | 'corner' | 'whistle';
  teamId: string;
  teamName: string;
  playerName?: string;
  assistName?: string;
  description: string;
}

export interface MatchStats {
  homeScore: number;
  awayScore: number;
  homeShots: number;
  awayShots: number;
  homeShotsOnTarget: number;
  awayShotsOnTarget: number;
  homePossession: number;
  awayPossession: number;
  homeCorners: number;
  awayCorners: number;
  homeFouls: number;
  awayFouls: number;
}

export type ActiveTab = 'match3d' | 'squad' | 'tactics' | 'transfers' | 'standings' | 'practice3d';
