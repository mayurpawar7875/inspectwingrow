import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { exportCSV } from '@/lib/utils';

interface LandSearch {
  id: string;
  place_name: string;
  address: string;
  contact_name: string;
  contact_phone: string;
  opening_date: string | null;
  is_finalized: boolean;
  created_at: string;
  session_id: string;
  manager_name?: string;
}

export function LandSearchTab() {
  const [searches, setSearches] = useState<LandSearch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSearches();

    const channel = supabase
      .channel('land-searches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'market_land_search' }, fetchSearches)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSearches = async () => {
    setLoading(true);
    const [searchData, sessionsData] = await Promise.all([
      supabase.from('market_land_search').select('*').order('created_at', { ascending: false }),
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
    const headers = ['Place Name', 'Contact Name', 'Contact Phone', 'Address', 'Opening Date', 'Status', 'Submitted By', 'Created At'];
    const rows = searches.map((s) => [
      s.place_name,
      s.contact_name,
      s.contact_phone,
      s.address,
      s.opening_date ? new Date(s.opening_date).toLocaleDateString() : '-',
      s.is_finalized ? 'Finalized' : 'Pending',
      s.manager_name || 'Unknown',
      new Date(s.created_at).toLocaleString()
    ]);
    exportCSV('land_search_records', headers, rows);
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Market Land Search</CardTitle>
        <Button onClick={handleExport} variant="outline" size="sm" disabled={searches.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {searches.length === 0 ? (
          <p className="text-center py-4 text-muted-foreground">No land search records found</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Place Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Opening Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {searches.map((search) => (
                <TableRow key={search.id}>
                  <TableCell className="font-medium">{search.place_name}</TableCell>
                  <TableCell>
                    <div>{search.contact_name}</div>
                    <div className="text-sm text-muted-foreground">{search.contact_phone}</div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{search.address}</TableCell>
                  <TableCell>{search.opening_date ? new Date(search.opening_date).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>
                    <Badge variant={search.is_finalized ? 'default' : 'secondary'}>
                      {search.is_finalized ? 'Finalized' : 'Pending'}
                    </Badge>
                  </TableCell>
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
