import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function NotificationsTab() {
  const [sendTitle, setSendTitle] = useState('');
  const [sendBody, setSendBody] = useState('');
  const [sending, setSending] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send Notification</CardTitle>
        <CardDescription>Broadcast a message to all employees</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Title</Label>
          <Input value={sendTitle} onChange={(e) => setSendTitle(e.target.value)} placeholder="Reminder to update tasks" />
        </div>
        <div>
          <Label>Message</Label>
          <Textarea value={sendBody} onChange={(e) => setSendBody(e.target.value)} rows={3} placeholder="Please update your stall confirmations and media uploads by 5 PM." />
        </div>
        <div className="flex justify-end">
          <Button
            onClick={async () => {
              if (!sendTitle.trim() || !sendBody.trim()) {
                toast.error('Title and message are required');
                return;
              }
              setSending(true);
              try {
                const { error } = await supabase
                  .from('notifications')
                  .insert({ title: sendTitle.trim(), body: sendBody.trim(), target_user_id: null });
                if (error) throw error;
                setSendTitle('');
                setSendBody('');
                toast.success('Notification sent to all employees');
              } catch (err) {
                console.error('Error sending notification:', err);
                toast.error('Failed to send notification');
              } finally {
                setSending(false);
              }
            }}
            disabled={sending}
          >
            {sending ? 'Sending...' : 'Send to All'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
