import { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, Users, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { parseCSV, validatePastedData } from '@/lib/csv-parser';
import { Participant, ImportSummary } from '@/types/raffle';

interface ImportPanelProps {
  onImport: (participants: Participant[], summary: ImportSummary) => void;
  hasData: boolean;
}

export function ImportPanel({ onImport, hasData }: ImportPanelProps) {
  const [pastedData, setPastedData] = useState('');
  const [mergeDuplicates, setMergeDuplicates] = useState(true);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processData = useCallback((text: string) => {
    setError(null);
    setSummary(null);

    if (!text.trim()) {
      setError('No data provided');
      return;
    }

    try {
      const result = parseCSV(text, mergeDuplicates);
      
      if (result.participants.length === 0) {
        setError('No valid participants found. Check your data format.');
        return;
      }

      setSummary(result.summary);
      onImport(result.participants, result.summary);
    } catch (err) {
      setError('Failed to parse data. Ensure it\'s valid CSV format.');
    }
  }, [mergeDuplicates, onImport]);

  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setPastedData(text);
      processData(text);
    };
    reader.readAsText(file);
  }, [processData]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      handleFileUpload(file);
    } else {
      setError('Please upload a CSV file');
    }
  }, [handleFileUpload]);

  const handlePaste = () => {
    if (pastedData.trim()) {
      processData(pastedData);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Participants
          </CardTitle>
          <CardDescription>
            Upload a CSV file or paste participant data directly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragging 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
              }
            `}
          >
            <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              Drag and drop a CSV file here, or
            </p>
            <label>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              />
              <Button variant="outline" size="sm" asChild>
                <span className="cursor-pointer">Browse Files</span>
              </Button>
            </label>
          </div>

          {/* Paste Area */}
          <div className="space-y-2">
            <Label>Or paste data directly:</Label>
            <Textarea
              placeholder={`Name,Email,Entries,Team
Jane Doe,jane.doe@sparklight.com,12,Field Ops
John Smith,john.smith@sparklight.com,3,Field Ops`}
              value={pastedData}
              onChange={(e) => setPastedData(e.target.value)}
              className="font-mono text-sm min-h-[120px]"
            />
            <Button onClick={handlePaste} disabled={!pastedData.trim()}>
              Import Data
            </Button>
          </div>

          {/* Options */}
          <div className="flex items-center space-x-2 pt-2 border-t">
            <Switch
              id="merge-duplicates"
              checked={mergeDuplicates}
              onCheckedChange={setMergeDuplicates}
            />
            <Label htmlFor="merge-duplicates" className="text-sm">
              Merge duplicate emails (sum entries)
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Import Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Import Summary */}
      {summary && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="h-5 w-5" />
              Import Successful
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-card rounded-lg">
                <Users className="h-6 w-6 mx-auto mb-1 text-primary" />
                <div className="text-2xl font-bold">{summary.totalParticipants}</div>
                <div className="text-xs text-muted-foreground">Participants</div>
              </div>
              <div className="text-center p-3 bg-card rounded-lg">
                <Ticket className="h-6 w-6 mx-auto mb-1 text-primary" />
                <div className="text-2xl font-bold">{summary.totalTickets.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total Tickets</div>
              </div>
              <div className="text-center p-3 bg-card rounded-lg">
                <div className="text-2xl font-bold">{summary.duplicateCount}</div>
                <div className="text-xs text-muted-foreground">Duplicates {mergeDuplicates ? 'Merged' : 'Found'}</div>
              </div>
              <div className="text-center p-3 bg-card rounded-lg">
                <div className="text-2xl font-bold text-destructive">{summary.errorRows.length}</div>
                <div className="text-xs text-muted-foreground">Errors</div>
              </div>
            </div>

            {summary.errorRows.length > 0 && (
              <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                <p className="text-sm font-medium text-destructive mb-2">Rows with errors (skipped):</p>
                <ul className="text-xs space-y-1">
                  {summary.errorRows.slice(0, 5).map((e, i) => (
                    <li key={i}>Row {e.row}: {e.error}</li>
                  ))}
                  {summary.errorRows.length > 5 && (
                    <li>...and {summary.errorRows.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
