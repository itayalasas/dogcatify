import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting medical notifications check...');

    // Get alerts that need notification (7 days before due date)
    const { data: alerts, error: alertsError } = await supabase
      .from('medical_alerts')
      .select(`
        *,
        pets!inner(name, species),
        profiles!inner(display_name, email, push_token, notification_preferences)
      `)
      .eq('status', 'pending')
      .eq('notification_sent', false)
      .lte('due_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .gt('due_date', new Date().toISOString().split('T')[0]);

    if (alertsError) {
      console.error('Error fetching alerts:', alertsError);
      throw alertsError;
    }

    console.log(`Found ${alerts?.length || 0} alerts to process`);

    if (!alerts || alerts.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No alerts to process', count: 0 }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    let notificationsSent = 0;

    // Process each alert
    for (const alert of alerts) {
      try {
        const user = alert.profiles;
        const pet = alert.pets;
        
        // Check if user has push notifications enabled
        const notificationPrefs = user.notification_preferences || {};
        if (notificationPrefs.push !== true || !user.push_token) {
          console.log(`Skipping notification for user ${user.display_name} - notifications disabled or no token`);
          continue;
        }

        // Prepare notification content
        const title = `Recordatorio médico para ${pet.name}`;
        const body = alert.title;
        const daysUntilDue = Math.ceil((new Date(alert.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        
        let notificationBody = body;
        if (daysUntilDue <= 1) {
          notificationBody = `¡Urgente! ${body}`;
        } else if (daysUntilDue <= 3) {
          notificationBody = `En ${daysUntilDue} días: ${body}`;
        } else {
          notificationBody = `Próximamente (${daysUntilDue} días): ${body}`;
        }

        // Send push notification
        const notificationPayload = {
          to: user.push_token,
          title,
          body: notificationBody,
          data: {
            type: 'medical_alert',
            alertId: alert.id,
            petId: alert.pet_id,
            alertType: alert.alert_type,
            priority: alert.priority,
            dueDate: alert.due_date,
            deepLink: `pets/${alert.pet_id}?activeTab=health`
          },
          sound: 'default',
          priority: alert.priority === 'urgent' ? 'high' : 'normal',
          channelId: 'medical_alerts',
        };

        console.log(`Sending notification to ${user.display_name} for ${pet.name}`);

        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(notificationPayload),
        });

        if (response.ok) {
          // Mark notification as sent
          await supabase
            .from('medical_alerts')
            .update({
              notification_sent: true,
              notification_sent_at: new Date().toISOString()
            })
            .eq('id', alert.id);

          notificationsSent++;
          console.log(`✅ Notification sent successfully for alert ${alert.id}`);
        } else {
          const errorText = await response.text();
          console.error(`❌ Failed to send notification for alert ${alert.id}:`, errorText);
        }

      } catch (notificationError) {
        console.error(`Error processing alert ${alert.id}:`, notificationError);
        continue;
      }
    }

    // Also check for overdue alerts and update status
    const { error: overdueError } = await supabase
      .from('medical_alerts')
      .update({ status: 'overdue' })
      .eq('status', 'pending')
      .lt('due_date', new Date().toISOString().split('T')[0]);

    if (overdueError) {
      console.error('Error updating overdue alerts:', overdueError);
    }

    return new Response(
      JSON.stringify({
        message: 'Medical notifications processed successfully',
        alertsProcessed: alerts.length,
        notificationsSent,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error) {
    console.error('Error in medical notifications function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});