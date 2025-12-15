import Papa from 'papaparse';
import { Participant, ImportSummary } from '@/types/raffle';

interface ParsedRow {
  Name?: string;
  name?: string;
  Email?: string;
  email?: string;
  Entries?: string | number;
  entries?: string | number;
  Team?: string;
  team?: string;
  Region?: string;
  region?: string;
  Manager?: string;
  manager?: string;
  EmployeeID?: string;
  employeeId?: string;
  employeeid?: string;
}

export function parseCSV(
  csvText: string,
  mergeDuplicates: boolean = true
): { participants: Participant[]; summary: ImportSummary } {
  const result = Papa.parse<ParsedRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  const participants: Participant[] = [];
  const emailMap = new Map<string, Participant>();
  const errorRows: { row: number; error: string }[] = [];
  let duplicateCount = 0;

  result.data.forEach((row, index) => {
    const rowNum = index + 2; // Account for header row and 0-indexing

    // Get values with case-insensitive fallback
    const name = (row.Name || row.name || '').trim();
    const email = (row.Email || row.email || '').trim().toLowerCase();
    const entriesRaw = row.Entries || row.entries;
    const entries = parseInt(String(entriesRaw), 10);

    // Validation
    if (!name) {
      errorRows.push({ row: rowNum, error: 'Missing name' });
      return;
    }
    if (!email) {
      errorRows.push({ row: rowNum, error: 'Missing email' });
      return;
    }
    if (!email.includes('@')) {
      errorRows.push({ row: rowNum, error: 'Invalid email format' });
      return;
    }
    if (isNaN(entries) || entries < 1 || !Number.isInteger(entries)) {
      errorRows.push({ row: rowNum, error: 'Entries must be a positive whole number' });
      return;
    }

    const participant: Participant = {
      id: `${email}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      name,
      email,
      entries,
      team: (row.Team || row.team || '').trim() || undefined,
      region: (row.Region || row.region || '').trim() || undefined,
      manager: (row.Manager || row.manager || '').trim() || undefined,
      employeeId: (row.EmployeeID || row.employeeId || row.employeeid || '').trim() || undefined,
    };

    // Check for duplicates
    if (emailMap.has(email)) {
      duplicateCount++;
      if (mergeDuplicates) {
        const existing = emailMap.get(email)!;
        existing.entries += participant.entries;
      } else {
        participant.id = `${email}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        participants.push(participant);
      }
    } else {
      emailMap.set(email, participant);
      participants.push(participant);
    }
  });

  // If merging duplicates, rebuild from map
  const finalParticipants = mergeDuplicates 
    ? Array.from(emailMap.values())
    : participants;

  const summary: ImportSummary = {
    totalParticipants: finalParticipants.length,
    totalTickets: finalParticipants.reduce((sum, p) => sum + p.entries, 0),
    duplicateCount,
    errorRows,
  };

  return { participants: finalParticipants, summary };
}

export function validatePastedData(text: string): boolean {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return false;
  
  const header = lines[0].toLowerCase();
  return header.includes('name') && header.includes('email') && header.includes('entries');
}
