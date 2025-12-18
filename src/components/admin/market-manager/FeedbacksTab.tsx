import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Star } from 'lucide-react';
import { exportCSV } from '@/lib/utils';

interface Feedback {
  id: string;
  rating: number | null;
  feedback_text: string | null;
  created_at: string;
  session_id: string;
  manager_name?: string;
}

export function FeedbacksTab() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeedbacks();

    const channel = supabase
      .channel('feedbacks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bms_stall_feedbacks' }, fetchFeedbacks)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchFeedbacks = async () => {
    setLoading(true);
    const [feedbackData, sessionsData] = await Promise.all([
      supabase.from('bms_stall_feedbacks').select('*').order('created_at', { ascending: false }),
      supabase.from('market_manager_sessions').select('id, user_id, profiles:user_id(full_name)'),
    ]);
    
    const sessionMap = new Map();
    (sessionsData.data || []).forEach((s: any) => {
      sessionMap.set(s.id, s.profiles?.full_name || 'Unknown');
    });
    
    const feedbacksWithNames = (feedbackData.data || []).map((f: any) => ({
      ...f,
      manager_name: sessionMap.get(f.session_id) || 'Unknown'
    }));
    
    setFeedbacks(feedbacksWithNames);
    setLoading(false);
  };

  const handleExport = () => {
    const headers = ['Rating', 'Feedback', 'Submitted By', 'Created At'];
    const rows = feedbacks.map((f) => [
      f.rating ? `${f.rating}/5` : '-',
      f.feedback_text || '-',
      f.manager_name || 'Unknown',
      new Date(f.created_at).toLocaleString()
    ]);
    exportCSV('stall_feedbacks', headers, rows);
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleExport} variant="outline" size="sm" disabled={feedbacks.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>
      
      {feedbacks.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">No feedback records found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {feedbacks.map((feedback) => (
            <Card key={feedback.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{feedback.manager_name}</CardTitle>
                  {feedback.rating && (
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-4 w-4 ${i < feedback.rating! ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} 
                        />
                      ))}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feedback.feedback_text || 'No feedback text'}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(feedback.created_at).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
