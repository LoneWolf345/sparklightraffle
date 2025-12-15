import { Participant, Winner } from '@/types/raffle';

/**
 * Masks a name to show only first name and last initial
 * e.g., "John Smith" -> "John S."
 */
export function maskName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0];
  }
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${firstName} ${lastInitial}.`;
}

/**
 * Masks email address
 * e.g., "john.smith@company.com" -> "j***@***.com"
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];
  return `${local.charAt(0)}***@***.${tld}`;
}

/**
 * Creates a privacy-filtered version of a participant
 */
export function maskParticipant(participant: Participant, hideEntries: boolean = false): Participant {
  return {
    ...participant,
    name: maskName(participant.name),
    email: maskEmail(participant.email),
    entries: hideEntries ? 0 : participant.entries,
  };
}

/**
 * Creates a privacy-filtered version of a winner
 */
export function maskWinner(winner: Winner, hideEntries: boolean = false): Winner {
  return {
    ...winner,
    participant: maskParticipant(winner.participant, hideEntries),
  };
}

/**
 * Filters participants array for privacy
 */
export function maskParticipants(participants: Participant[], hideEntries: boolean = false): Participant[] {
  return participants.map(p => maskParticipant(p, hideEntries));
}

/**
 * Filters winners array for privacy
 */
export function maskWinners(winners: Winner[], hideEntries: boolean = false): Winner[] {
  return winners.map(w => maskWinner(w, hideEntries));
}
