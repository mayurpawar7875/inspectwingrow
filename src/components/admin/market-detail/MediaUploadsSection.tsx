import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface MediaUpload {
  id: string;
  captured_at: string;
  media_type: 'outside_rates' | 'selfie_gps' | 'rate_board' | 'market_video' | 'cleaning_video' | 'customer_feedback';
  is_late: boolean;
  file_url: string;
  user_id: string;
  profiles: {
    full_name: string;
  };
}

interface Props {
  marketId: string;
  marketDate: string;
  isToday: boolean;
}

export function MediaUploadsSection({ marketId, marketDate, isToday }: Props) {
  const [uploads, setUploads] = useState<MediaUpload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUploads();

    if (isToday) {
      const channel = supabase
        .channel(`media-${marketId}-${marketDate}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'media',
            filter: `market_id=eq.${marketId}`,
          },
          () => fetchUploads()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [marketId, marketDate, isToday]);

  const fetchUploads = async () => {
    setLoading(true);

    // Fetch media uploads
    const { data: u, error: uErr } = await supabase
      .from('media')
      .select('id, captured_at, media_type, is_late, file_url, session_id')
      .eq('market_id', marketId)
      .order('captured_at', { ascending: false });

    if (uErr) console.error(uErr);

    // Get user IDs from sessions
    const sessionIds = [...new Set((u ?? []).map(r => r.session_id).filter(Boolean))];
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, user_id, session_date')
      .in('id', sessionIds)
      .eq('session_date', marketDate);

    const sessionUserMap = Object.fromEntries((sessions || []).map((s: any) => [s.id, s.user_id]));
    const uUserIds = [...new Set((u ?? []).map(r => sessionUserMap[r.session_id]).filter(Boolean))];

    // Fetch employees
    const { data: uEmps, error: uEmpErr } = await supabase
      .from('employees')
      .select('id, full_name')
      .in('id', uUserIds.length ? uUserIds : ['00000000-0000-0000-0000-000000000000']);

    if (uEmpErr) console.error(uEmpErr);

    const uEmpById: Record<string, string> = Object.fromEntries(
      (uEmps ?? []).map(e => [e.id, e.full_name])
    );

    // Merge data
    const media = (u ?? []).map(r => ({
      ...r,
      profiles: { full_name: uEmpById[sessionUserMap[r.session_id]] ?? '—' }
    }));

    setUploads(media as any);
    setLoading(false);
  };

  const handleView = (url: string) => {
    window.open(url, '_blank');
  };

  const handleDownload = async (url: string, fileName: string) => {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(blobUrl);
  };

  return (
    <Card>
      <CardHeader className="py-3 sm:py-6">
        <CardTitle className="text-base sm:text-lg">Media Uploads</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="text-center text-xs sm:text-sm text-muted-foreground">Loading...</div>
        ) : uploads.length === 0 ? (
          <div className="text-center text-xs sm:text-sm text-muted-foreground">No media uploads yet</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Time</TableHead>
                  <TableHead className="text-xs sm:text-sm">Employee</TableHead>
                  <TableHead className="text-xs sm:text-sm">Type</TableHead>
                  <TableHead className="text-xs sm:text-sm">Status</TableHead>
                  <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploads.map((upload) => (
                  <TableRow key={upload.id}>
                    <TableCell className="text-xs sm:text-sm">{format(new Date(upload.captured_at), 'hh:mm a')}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{upload.profiles.full_name}</TableCell>
                    <TableCell className="text-xs sm:text-sm uppercase">{upload.media_type}</TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      {upload.is_late && (
                        <Badge variant="destructive" className="text-xs">Late</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleView(upload.file_url)}
                        >
                          <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleDownload(upload.file_url, `media-${upload.id}`)}
                        >
                          <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
