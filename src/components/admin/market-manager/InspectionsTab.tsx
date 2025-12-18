import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { exportCSV } from '@/lib/utils';

interface Inspection {
  id: string;
  update_notes: string;
  created_at: string;
  session_id: string;
  market_name?: string;
  manager_name?: string;
}

export function InspectionsTab() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInspections();

    const channel = supabase
      .channel('inspections')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'market_inspection_updates' }, fetchInspections)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchInspections = async () => {
    setLoading(true);
    const [inspectionData, sessionsData] = await Promise.all([
      supabase.from('market_inspection_updates').select('*, markets(name)').order('created_at', { ascending: false }),
      supabase.from('market_manager_sessions').select('id, user_id, profiles:user_id(full_name)'),
    ]);
    
    const sessionMap = new Map();
    (sessionsData.data || []).forEach((s: any) => {
      sessionMap.set(s.id, s.profiles?.full_name || 'Unknown');
    });
    
    const inspectionsWithNames = (inspectionData.data || []).map((i: any) => ({
      ...i,
      market_name: i.markets?.name || 'Unknown Market',
      manager_name: sessionMap.get(i.session_id) || 'Unknown'
    }));
    
    setInspections(inspectionsWithNames);
    setLoading(false);
  };

  const handleExport = () => {
    const headers = ['Market', 'Update Notes', 'Submitted By', 'Created At'];
    const rows = inspections.map((i) => [
      i.market_name || '-',
      i.update_notes,
      i.manager_name || 'Unknown',
      new Date(i.created_at).toLocaleString()
    ]);
    exportCSV('market_inspections', headers, rows);
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleExport} variant="outline" size="sm" disabled={inspections.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>
      
      {inspections.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">No inspection records found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {inspections.map((inspection) => (
            <Card key={inspection.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{inspection.market_name}</CardTitle>
                  <span className="text-xs text-muted-foreground">{inspection.manager_name}</span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{inspection.update_notes}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(inspection.created_at).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
