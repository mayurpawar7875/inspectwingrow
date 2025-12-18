import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { exportCSV } from '@/lib/utils';

interface PunchRecord {
  id: string;
  punched_at: string;
  gps_lat: number;
  gps_lng: number;
  selfie_url?: string;
  session_id: string;
  manager_name?: string;
}

export function PunchRecordsTab() {
  const [punchIns, setPunchIns] = useState<PunchRecord[]>([]);
  const [punchOuts, setPunchOuts] = useState<PunchRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecords();

    const channelIn = supabase
      .channel('punch-ins')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'market_manager_punchin' }, fetchRecords)
      .subscribe();

    const channelOut = supabase
      .channel('punch-outs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'market_manager_punchout' }, fetchRecords)
      .subscribe();

    return () => {
      supabase.removeChannel(channelIn);
      supabase.removeChannel(channelOut);
    };
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    const [inData, outData, sessionsData] = await Promise.all([
      supabase.from('market_manager_punchin').select('*').order('punched_at', { ascending: false }),
      supabase.from('market_manager_punchout').select('*').order('punched_at', { ascending: false }),
      supabase.from('market_manager_sessions').select('id, user_id, profiles:user_id(full_name)'),
    ]);
    
    const sessionMap = new Map();
    (sessionsData.data || []).forEach((s: any) => {
      sessionMap.set(s.id, s.profiles?.full_name || 'Unknown');
    });
    
    const punchInsWithNames = (inData.data || []).map((r: any) => ({
      ...r,
      manager_name: sessionMap.get(r.session_id) || 'Unknown'
    }));
    
    const punchOutsWithNames = (outData.data || []).map((r: any) => ({
      ...r,
      manager_name: sessionMap.get(r.session_id) || 'Unknown'
    }));
    
    setPunchIns(punchInsWithNames);
    setPunchOuts(punchOutsWithNames);
    setLoading(false);
  };

  const handleExportPunchIn = () => {
    const headers = ['Manager Name', 'Punched At', 'GPS Location', 'Selfie URL'];
    const rows = punchIns.map((r) => [
      r.manager_name || 'Unknown',
      new Date(r.punched_at).toLocaleString(),
      `${r.gps_lat}, ${r.gps_lng}`,
      r.selfie_url || ''
    ]);
    exportCSV('punch_in_records', headers, rows);
  };

  const handleExportPunchOut = () => {
    const headers = ['Manager Name', 'Punched At', 'GPS Location'];
    const rows = punchOuts.map((r) => [
      r.manager_name || 'Unknown',
      new Date(r.punched_at).toLocaleString(),
      `${r.gps_lat}, ${r.gps_lng}`
    ]);
    exportCSV('punch_out_records', headers, rows);
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Punch In Records</CardTitle>
          <Button onClick={handleExportPunchIn} variant="outline" size="sm" disabled={punchIns.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </CardHeader>
        <CardContent>
          {punchIns.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">No punch-in records found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Manager</TableHead>
                  <TableHead>Punched At</TableHead>
                  <TableHead>GPS Location</TableHead>
                  <TableHead>Selfie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {punchIns.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.manager_name}</TableCell>
                    <TableCell>{new Date(record.punched_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <a 
                        href={`https://maps.google.com/?q=${record.gps_lat},${record.gps_lng}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        View Map
                      </a>
                    </TableCell>
                    <TableCell>
                      {record.selfie_url && (
                        <a href={record.selfie_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          View
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Punch Out Records</CardTitle>
          <Button onClick={handleExportPunchOut} variant="outline" size="sm" disabled={punchOuts.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </CardHeader>
        <CardContent>
          {punchOuts.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">No punch-out records found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Manager</TableHead>
                  <TableHead>Punched At</TableHead>
                  <TableHead>GPS Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {punchOuts.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.manager_name}</TableCell>
                    <TableCell>{new Date(record.punched_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <a 
                        href={`https://maps.google.com/?q=${record.gps_lat},${record.gps_lng}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        View Map
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
