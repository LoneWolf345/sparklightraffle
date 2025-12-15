import { Users, Copy, Download, Search } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Participant } from '@/types/raffle';
import { toast } from '@/hooks/use-toast';

interface ParticipantsPanelProps {
  participants: Participant[];
}

export function ParticipantsPanel({ participants }: ParticipantsPanelProps) {
  const [search, setSearch] = useState('');

  const filteredParticipants = participants.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    p.team?.toLowerCase().includes(search.toLowerCase())
  );

  const totalTickets = participants.reduce((sum, p) => sum + p.entries, 0);

  const handleCopyList = () => {
    const text = participants
      .map(p => `${p.name}\t${p.email}\t${p.entries}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Participants list copied to clipboard',
    });
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Entries', 'Team', 'Region', 'Manager'];
    const rows = participants.map(p => [
      p.name,
      p.email,
      p.entries.toString(),
      p.team || '',
      p.region || '',
      p.manager || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sparklight-participants-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Exported!',
      description: 'Participants CSV downloaded',
    });
  };

  if (participants.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Participants
          </CardTitle>
          <CardDescription>
            No participants imported yet. Import data in the Setup tab.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Participants
            </CardTitle>
            <CardDescription>
              {participants.length} participants with {totalTickets.toLocaleString()} total tickets
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyList}>
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or team..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        <div className="border rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-20 text-right">Entries</TableHead>
                <TableHead>Team</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParticipants.map((participant) => (
                <TableRow key={participant.id}>
                  <TableCell className="font-medium">
                    {participant.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {participant.email}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {participant.entries}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {participant.team || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {search && filteredParticipants.length !== participants.length && (
          <p className="text-sm text-muted-foreground mt-2">
            Showing {filteredParticipants.length} of {participants.length} participants
          </p>
        )}
      </CardContent>
    </Card>
  );
}
