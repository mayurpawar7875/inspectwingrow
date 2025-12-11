import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface OrganiserData {
  id?: string;
  user_id: string;
  punch_in_time?: string | null;
  punch_out_time?: string | null;
  status?: string;
  profiles: {
    full_name: string;
    phone: string | null;
  };
}

interface Props {
  marketId: string;
  marketDate: string;
  isToday: boolean;
}

export function OrganiserOnDuty({ marketId, marketDate, isToday }: Props) {
  const [organiser, setOrganiser] = useState<OrganiserData | null>(null);
  const [lastActivity, setLastActivity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrganiser();

    if (isToday) {
      const sessionsChannel = supabase
        .channel(`sessions-${marketId}-${marketDate}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'sessions',
            filter: `market_id=eq.${marketId}`,
          },
          () => fetchOrganiser()
        )
        .subscribe();

      const mediaChannel = supabase
        .channel(`media-organiser-${marketId}-${marketDate}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'media',
            filter: `market_id=eq.${marketId}`,
          },
          () => fetchOrganiser()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(sessionsChannel);
        supabase.removeChannel(mediaChannel);
      };
    }
  }, [marketId, marketDate, isToday]);

  const fetchOrganiser = async () => {
    setLoading(true);
    
    // Fetch sessions (status can be: active, finalized, locked)
    const { data: s, error: sErr } = await supabase
      .from('sessions')
      .select('id, user_id, punch_in_time, punch_out_time, status')
      .eq('market_id', marketId)
      .eq('session_date', marketDate)
      .order('created_at', { ascending: false });

    if (sErr) console.error(sErr);

    let selectedUserId: string | null = null;
    let sessionData: any = null;

    // Pick organiser = active session first, else latest by created_at
    const organiserSession = (s ?? []).sort((a, b) => {
      // Prioritize active sessions
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (b.status === 'active' && a.status !== 'active') return 1;
      return 0;
    })[0];

    if (organiserSession) {
      selectedUserId = organiserSession.user_id;
      sessionData = organiserSession;
    } else {
      // Fallback: find employee with most uploads for this market/date
      const { data: uploads } = await supabase
        .from('media')
        .select('session_id')
        .eq('market_id', marketId);

      if (uploads && uploads.length > 0) {
        // Get sessions to map to user_id
        const sessionIds = [...new Set(uploads.map(u => u.session_id).filter(Boolean))];
        const { data: sessions } = await supabase
          .from('sessions')
          .select('id, user_id, session_date')
          .in('id', sessionIds)
          .eq('session_date', marketDate);

        if (sessions && sessions.length > 0) {
          const sessionUserMap = Object.fromEntries(sessions.map((s: any) => [s.id, s.user_id]));
          
          // Count uploads per user
          const uploadCounts: Record<string, number> = {};
          uploads.forEach(u => {
            const userId = sessionUserMap[u.session_id];
            if (userId) {
              uploadCounts[userId] = (uploadCounts[userId] || 0) + 1;
            }
          });

          // Find user with most uploads
          const mostActiveUser = Object.entries(uploadCounts)
            .sort(([, a], [, b]) => b - a)[0];
          
          if (mostActiveUser) {
            selectedUserId = mostActiveUser[0];
          }
        }
      }
    }

    if (selectedUserId) {
      // Fetch the employee profile
      const { data: emp } = await supabase
        .from('employees')
        .select('id, full_name, phone')
        .eq('id', selectedUserId)
        .maybeSingle();

      if (emp) {
        setOrganiser({
          ...sessionData,
          user_id: selectedUserId,
          profiles: {
            full_name: emp.full_name,
            phone: emp.phone
          }
        } as any);

        // Fetch last activity - get sessions for this user first
        const { data: userSessions } = await supabase
          .from('sessions')
          .select('id')
          .eq('user_id', selectedUserId)
          .eq('session_date', marketDate)
          .eq('market_id', marketId);

        if (userSessions && userSessions.length > 0) {
          const { data: lastMedia } = await supabase
            .from('media')
            .select('captured_at')
            .in('session_id', userSessions.map(s => s.id))
            .order('captured_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (lastMedia) {
            setLastActivity(lastMedia.captured_at);
          }
        }
      } else {
        setOrganiser(null);
      }
    } else {
      setOrganiser(null);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="py-3 sm:py-6">
          <CardTitle className="text-base sm:text-lg">Organiser on Duty</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-xs sm:text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!organiser) {
    return (
      <Card>
        <CardHeader className="py-3 sm:py-6">
          <CardTitle className="text-base sm:text-lg">Organiser on Duty</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-xs sm:text-sm text-muted-foreground">
            No session for this market/date. Ensure Punch-In created a session for ({marketId}, {marketDate}).
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3 sm:py-6">
        <CardTitle className="text-base sm:text-lg">Organiser on Duty</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3 sm:space-y-4">
          <div>
            <div className="text-lg sm:text-2xl font-bold">{organiser.profiles.full_name}</div>
            {organiser.profiles.phone && (
              <div className="text-xs sm:text-sm text-muted-foreground">{organiser.profiles.phone}</div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div>
              <div className="text-xs sm:text-sm font-medium text-muted-foreground">Punch In</div>
              <div className="text-sm sm:text-lg">
                {organiser.punch_in_time
                  ? format(new Date(organiser.punch_in_time), 'hh:mm a')
                  : '—'}
              </div>
            </div>

            <div>
              <div className="text-xs sm:text-sm font-medium text-muted-foreground">Punch Out</div>
              <div className="text-sm sm:text-lg">
                {organiser.punch_out_time
                  ? format(new Date(organiser.punch_out_time), 'hh:mm a')
                  : '—'}
              </div>
            </div>

            <div>
              <div className="text-xs sm:text-sm font-medium text-muted-foreground">Last Activity</div>
              <div className="text-sm sm:text-lg">
                {lastActivity
                  ? format(new Date(lastActivity), 'hh:mm a')
                  : 'No activity'}
              </div>
            </div>
          </div>

          {organiser.status && (
            <div>
              <Badge variant={organiser.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                {organiser.status}
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
