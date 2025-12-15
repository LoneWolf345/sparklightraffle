export interface Participant {
  id: string;
  name: string;
  email: string;
  entries: number;
  team?: string;
  region?: string;
  manager?: string;
  employeeId?: string;
}

export interface Winner {
  participant: Participant;
  drawNumber: number;
  timestamp: Date;
  isBonusPrize?: boolean;
}

export interface RaffleConfig {
  numberOfWinners: number;
  allowRepeats: boolean;
  animationStyle: 'slot' | 'wheel';
  revealMode: 'sequential' | 'bulk';
  bonusRoundInterval: number; // Every Nth winner is bonus (0 = disabled)
  showEmail: boolean;
  showTeam: boolean;
  soundEnabled: boolean;
  animationDuration: number; // Total spin time in seconds (4-12)
  animationSpeed: 'slow' | 'normal' | 'fast'; // Starting speed preset
  animationScrollDistance: number; // Number of names to scroll through (15-50)
}

export interface ImportSummary {
  totalParticipants: number;
  totalTickets: number;
  duplicateCount: number;
  errorRows: { row: number; error: string }[];
}

export interface AuditLog {
  drawId: string;
  timestamp: Date;
  datasetChecksum: string;
  seed: string;
  config: RaffleConfig;
  totalParticipants: number;
  totalTickets: number;
  winners: {
    drawNumber: number;
    name: string;
    email: string;
    entries: number;
    timestamp: string;
  }[];
}

export interface RaffleState {
  participants: Participant[];
  winners: Winner[];
  config: RaffleConfig;
  isDrawing: boolean;
  isLocked: boolean;
  auditLog: AuditLog | null;
}
