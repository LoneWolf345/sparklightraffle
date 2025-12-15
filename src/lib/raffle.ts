import CryptoJS from 'crypto-js';
import { Participant, Winner, RaffleConfig, AuditLog } from '@/types/raffle';
import { PrizeConfig, getPrizeForWinner } from '@/types/prizes';

// Seeded random number generator (Mulberry32)
function mulberry32(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function generateSeed(): string {
  return Math.floor(Math.random() * 2147483647).toString();
}

export function generateDrawId(): string {
  return `DRAW-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export function calculateChecksum(participants: Participant[]): string {
  const data = participants
    .map(p => `${p.name}|${p.email}|${p.entries}`)
    .sort()
    .join('\n');
  return CryptoJS.SHA256(data).toString().substring(0, 16);
}

export function weightedRandomSelect(
  participants: Participant[],
  seed: string,
  excludeEmails: Set<string> = new Set()
): Participant | null {
  const eligible = participants.filter(p => !excludeEmails.has(p.email));
  if (eligible.length === 0) return null;

  const totalWeight = eligible.reduce((sum, p) => sum + p.entries, 0);
  if (totalWeight === 0) return null;

  const seedNum = parseInt(seed, 10) || Math.floor(Math.random() * 2147483647);
  const random = mulberry32(seedNum + excludeEmails.size)();
  
  let cumulative = 0;
  const target = random * totalWeight;
  
  for (const participant of eligible) {
    cumulative += participant.entries;
    if (cumulative >= target) {
      return participant;
    }
  }
  
  return eligible[eligible.length - 1];
}

export function createAuditLog(
  drawId: string,
  participants: Participant[],
  winners: Winner[],
  config: RaffleConfig,
  seed: string
): AuditLog {
  return {
    drawId,
    timestamp: new Date(),
    datasetChecksum: calculateChecksum(participants),
    seed,
    config,
    totalParticipants: participants.length,
    totalTickets: participants.reduce((sum, p) => sum + p.entries, 0),
    winners: winners.map(w => ({
      drawNumber: w.drawNumber,
      name: w.participant.name,
      email: w.participant.email,
      entries: w.participant.entries,
      timestamp: w.timestamp.toISOString(),
    })),
  };
}

export function exportWinnersCSV(winners: Winner[], prizes?: PrizeConfig | null): string {
  const hasPrizes = prizes !== null && prizes !== undefined;
  const headers = hasPrizes 
    ? ['Draw #', 'Name', 'Email', 'Entries', 'Bonus Prize', 'Prize']
    : ['Draw #', 'Name', 'Email', 'Entries', 'Bonus Prize'];
  
  const rows = winners.map((w, index) => {
    const prize = hasPrizes ? getPrizeForWinner(prizes, index) : null;
    const prizeText = prize?.text || '';
    
    const baseRow = [
      w.drawNumber.toString(),
      `"${w.participant.name}"`,
      w.participant.email,
      w.participant.entries.toString(),
      w.isBonusPrize ? 'Yes' : 'No',
    ];
    
    if (hasPrizes) {
      baseRow.push(`"${prizeText}"`);
    }
    
    return baseRow;
  });
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function exportAuditJSON(auditLog: AuditLog): string {
  return JSON.stringify(auditLog, null, 2);
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
