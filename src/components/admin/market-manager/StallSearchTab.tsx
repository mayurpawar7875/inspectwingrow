import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { exportCSV } from '@/lib/utils';

interface StallSearch {
  id: string;
  stall_name: string;
  farmer_name: string;
  contact_phone: string;
  is_interested: boolean;
  joining_date: string | null;
  created_at: string;
  session_id: string;
  manager_name?: string;
}

export function StallSearchTab() {
  const [searches, setSearches] = useState<StallSearch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSearches();

    const channel = supabase
      .channel('stall-searches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stall_searching_updates' }, fetchSearches)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSearches = async () => {
    setLoading(true);
    const [searchData, sessionsData] = await Promise.all([
      supabase.from('stall_searching_updates').select('*').order('created_at', { ascending: false }),
      supabase.from('market_manager_sessions').select('id, user_id, profiles:user_id(full_name)'),
    ]);
    
    const sessionMap = new Map();
    (sessionsData.data || []).forEach((s: any) => {
      sessionMap.set(s.id, s.profiles?.full_name || 'Unknown');
    });
    
    const searchesWithNames = (searchData.data || []).map((s: any) => ({
      ...s,
      manager_name: sessionMap.get(s.session_id) || 'Unknown'
    }));
    
    setSearches(searchesWithNames);
    setLoading(false);
  };

  const handleExport = () => {
    const headers = ['Stall Name', 'Farmer Name', 'Contact', 'Interested', 'Joining Date', 'Submitted By', 'Created At'];
    const rows = searches.map((s) => [
      s.stall_name,
      s.farmer_name,
      s.contact_phone,
      s.is_interested ? 'Yes' : 'No',
      s.joining_date ? new Date(s.joining_date).toLocaleDateString() : '-',
      s.manager_name || 'Unknown',
      new Date(s.created_at).toLocaleString()
    ]);
    exportCSV('stall_search_records', headers, rows);
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Stall Searching Updates</CardTitle>
        <Button onClick={handleExport} variant="outline" size="sm" disabled={searches.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {searches.length === 0 ? (
          <p className="text-center py-4 text-muted-foreground">No stall search records found</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stall Name</TableHead>
                <TableHead>Farmer Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Interested</TableHead>
                <TableHead>Joining Date</TableHead>
                <TableHead>Submitted By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {searches.map((search) => (
                <TableRow key={search.id}>
                  <TableCell className="font-medium">{search.stall_name}</TableCell>
                  <TableCell>{search.farmer_name}</TableCell>
                  <TableCell>{search.contact_phone}</TableCell>
                  <TableCell>
                    <Badge variant={search.is_interested ? 'default' : 'secondary'}>
                      {search.is_interested ? 'Yes' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell>{search.joining_date ? new Date(search.joining_date).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>{search.manager_name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
