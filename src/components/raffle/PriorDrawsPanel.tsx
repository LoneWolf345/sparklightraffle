import { useState, useEffect } from 'react';
import { History, Trash2, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { SavedDraw, useRafflePersistence } from '@/hooks/use-raffle-persistence';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';

interface PriorDrawsPanelProps {
  onLoadDraw: (id: string) => void;
}

export function PriorDrawsPanel({ onLoadDraw }: PriorDrawsPanelProps) {
  const { isAdmin } = useAuth();
  const [draws, setDraws] = useState<SavedDraw[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { loadDraws, deleteDraw } = useRafflePersistence();

  const fetchDraws = async () => {
    setLoading(true);
    const data = await loadDraws();
    setDraws(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchDraws();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    const success = await deleteDraw(deleteId);
    if (success) {
      setDraws(prev => prev.filter(d => d.id !== deleteId));
    }
    setDeleteId(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Prior Draws</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchDraws} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription>
          Load and review previously saved raffle draws
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : draws.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No prior draws found. Draws are automatically saved when you start a raffle.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Draw ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Participants</TableHead>
                <TableHead>Winners</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {draws.map((draw) => (
                <TableRow key={draw.id}>
                  <TableCell className="font-mono text-xs">{draw.draw_id}</TableCell>
                  <TableCell>{format(new Date(draw.created_at), 'MMM d, yyyy HH:mm')}</TableCell>
                  <TableCell>{draw.total_participants}</TableCell>
                  <TableCell>{draw.winner_count}</TableCell>
                  <TableCell>
                    {draw.is_locked ? (
                      <Badge variant="secondary">Locked</Badge>
                    ) : (
                      <Badge variant="outline">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onLoadDraw(draw.id)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Load
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(draw.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Draw?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this draw and all its winner data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
