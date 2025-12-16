import { FileText, Download, Hash, Clock, Settings, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuditLog } from '@/types/raffle';
import { exportAuditJSON, downloadFile } from '@/lib/raffle';
import { toast } from '@/hooks/use-toast';

interface AuditPanelProps {
  auditLog: AuditLog | null;
}

export function AuditPanel({ auditLog }: AuditPanelProps) {
  const handleExportAudit = () => {
    if (!auditLog) return;
    const json = exportAuditJSON(auditLog);
    downloadFile(json, `sparklight-raffle-audit-${auditLog.drawId}.json`, 'application/json');
    toast({
      title: 'Exported!',
      description: 'Audit report downloaded as JSON',
    });
  };

  if (!auditLog) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Audit Log
          </CardTitle>
          <CardDescription>
            Audit details will appear here after the draw begins
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
              <FileText className="h-5 w-5" />
              Audit Log
              {auditLog.drawName && (
                <span className="text-muted-foreground font-normal">— {auditLog.drawName}</span>
              )}
            </CardTitle>
            <CardDescription>
              Verifiable draw details for transparency
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportAudit}>
            <Download className="h-4 w-4 mr-1" />
            Export JSON
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {auditLog.drawName && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Hash className="h-4 w-4" />
                Drawing Name
              </div>
              <div className="text-sm font-medium">{auditLog.drawName}</div>
            </div>
          )}

          {auditLog.organizerEmail && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                Organizer
              </div>
              <div className="text-sm">{auditLog.organizerEmail}</div>
            </div>
          )}

          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Hash className="h-4 w-4" />
              Draw ID
            </div>
            <code className="text-sm font-mono break-all">{auditLog.drawId}</code>
          </div>
          
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              Timestamp
            </div>
            <div className="text-sm">
              {new Date(auditLog.timestamp).toLocaleString()}
            </div>
          </div>
          
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Hash className="h-4 w-4" />
              Dataset Checksum
            </div>
            <code className="text-sm font-mono">{auditLog.datasetChecksum}</code>
          </div>
          
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Hash className="h-4 w-4" />
              Random Seed
            </div>
            <code className="text-sm font-mono">{auditLog.seed}</code>
          </div>
        </div>

        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Settings className="h-4 w-4" />
            Configuration
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Winners:</span>{' '}
              <span className="font-medium">{auditLog.config.numberOfWinners}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Repeats:</span>{' '}
              <span className="font-medium">{auditLog.config.allowRepeats ? 'Yes' : 'No'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Animation:</span>{' '}
              <span className="font-medium capitalize">{auditLog.config.animationStyle}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Reveal:</span>{' '}
              <span className="font-medium capitalize">{auditLog.config.revealMode}</span>
            </div>
          </div>
        </div>

        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Users className="h-4 w-4" />
            Dataset Summary
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Participants:</span>{' '}
              <span className="font-medium">{auditLog.totalParticipants}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Tickets:</span>{' '}
              <span className="font-medium">{auditLog.totalTickets.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {auditLog.winners.length > 0 && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground mb-2">
              Winner Sequence (chronological)
            </div>
            <div className="max-h-48 overflow-y-auto text-sm space-y-1">
              {auditLog.winners.map((w, i) => (
                <div key={i} className="flex justify-between">
                  <span>
                    <span className="text-muted-foreground">#{w.drawNumber}</span>{' '}
                    {w.name}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {new Date(w.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
