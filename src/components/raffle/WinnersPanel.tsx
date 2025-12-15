import { Trophy, Copy, Download, Undo2, RotateCcw, Lock, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Winner } from '@/types/raffle';
import { exportWinnersCSV, downloadFile } from '@/lib/raffle';
import { toast } from '@/hooks/use-toast';

interface WinnersPanelProps {
  winners: Winner[];
  isLocked: boolean;
  onUndo: () => void;
  onRestart: () => void;
  onLock: () => void;
  readOnly?: boolean;
}

export function WinnersPanel({ 
  winners, 
  isLocked, 
  onUndo, 
  onRestart, 
  onLock,
  readOnly = false
}: WinnersPanelProps) {
  const handleCopyWinners = () => {
    const text = winners
      .map(w => `${w.drawNumber}. ${w.participant.name} (${w.participant.email})`)
      .join('\n');
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Winners list copied to clipboard',
    });
  };

  const handleExportCSV = () => {
    const csv = exportWinnersCSV(winners);
    downloadFile(csv, `sparklight-raffle-winners-${Date.now()}.csv`, 'text/csv');
    toast({
      title: 'Exported!',
      description: 'Winners CSV downloaded',
    });
  };

  if (winners.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Winners
          </CardTitle>
          <CardDescription>
            No winners drawn yet. Start the raffle to select winners.
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
              <Trophy className="h-5 w-5 text-primary" />
              Winners
              {isLocked && (
                <Badge variant="secondary" className="ml-2">
                  <Lock className="h-3 w-3 mr-1" />
                  Locked
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {winners.length} winner{winners.length !== 1 ? 's' : ''} selected
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyWinners}>
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
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                {!readOnly && <TableHead className="w-20 text-right">Entries</TableHead>}
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {winners.map((winner) => (
                <TableRow key={`${winner.participant.id}-${winner.drawNumber}`}>
                  <TableCell className="font-medium">
                    {winner.drawNumber}
                  </TableCell>
                  <TableCell className="font-medium">
                    {winner.participant.name}
                    {winner.isBonusPrize && (
                      <Badge variant="default" className="ml-2 bg-accent text-accent-foreground">
                        <Gift className="h-3 w-3 mr-1" />
                        Bonus
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {winner.participant.email}
                  </TableCell>
                  {!readOnly && (
                    <TableCell className="text-right">
                      {winner.participant.entries}
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <span className="text-xs text-muted-foreground">
                      {new Date(winner.timestamp).toLocaleTimeString()}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Controls - hidden for read-only mode */}
        {!isLocked && !readOnly && (
          <div className="flex justify-between mt-4 pt-4 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onUndo}
              disabled={winners.length === 0}
            >
              <Undo2 className="h-4 w-4 mr-1" />
              Undo Last
            </Button>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRestart}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Restart
              </Button>
              <Button 
                size="sm" 
                onClick={onLock}
                disabled={winners.length === 0}
              >
                <Lock className="h-4 w-4 mr-1" />
                Lock Draw
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
