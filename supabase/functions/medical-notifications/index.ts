import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface MedicalAlert {
  id: string;
  pet_id: string;
  alert_type: string;
  title: string;
  description: string;
  due_date: string;
  priority: string;
  status: string;
  notification_sent: boolean;
  pets: {
    name: string;
    species: string;
  };
  profiles: {
    display_name: string;
    email: string;
    push_token: string;
    notification_preferences: any;
  };
}

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('Starting medical notifications check...');

    // Calculate date 7 days from now for notification threshold
    const notificationDate = new Date();
    notificationDate.setDate(notificationDate.getDate() + 7);
    const notificationDateStr = notificationDate.toISOString().split('T')[0];

    const today = new Date().toISOString().split('T')[0];

    // Get alerts that need notification (7 days before due date)
    const { data: alerts, error: alertsError } = await supabase
      .from('medical_alerts')
      .select(`
        id,
        pet_id,
        alert_type,
        title,
        description,
        due_date,
        priority,
        status,
        notification_sent,
        pets!inner(name, species, owner_id),
        profiles!inner(display_name, email, push_token, notification_preferences)
      `)
      .eq('status', 'pending')
      .eq('notification_sent', false)
      .lte('due_date', notificationDateStr)
      .gt('due_date', today);

    if (alertsError) {
      console.error('Error fetching alerts:', alertsError);
      throw alertsError;
    }

    console.log(`Found ${alerts?.length || 0} alerts to process`);

    if (!alerts || alerts.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No alerts to process', 
          count: 0,
          timestamp: new Date().toISOString()
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    let notificationsSent = 0;
    const errors: string[] = [];

    // Process each alert
    for (const alert of alerts) {
      try {
        const user = alert.profiles;
        const pet = alert.pets;
        
        if (!user || !pet) {
          console.log(`Skipping alert ${alert.id} - missing user or pet data`);
          continue;
        }
        
        // Check if user has push notifications enabled
        const notificationPrefs = user.notification_preferences || {};
        if (notificationPrefs.push !== true || !user.push_token) {
          console.log(`Skipping notification for user ${user.display_name} - notifications disabled or no token`);
          continue;
        }

        // Calculate days until due
        const dueDate = new Date(alert.due_date);
        const now = new Date();
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        // Prepare notification content
        const title = `Recordatorio médico para ${pet.name}`;
        let notificationBody = alert.description;
        
        if (daysUntilDue <= 0) {
          notificationBody = `¡Urgente! ${alert.description}`;
        } else if (daysUntilDue <= 1) {
          notificationBody = `¡Mañana! ${alert.description}`;
        } else if (daysUntilDue <= 3) {
          notificationBody = `En ${daysUntilDue} días: ${alert.description}`;
        } else {
          notificationBody = `Próximamente (${daysUntilDue} días): ${alert.description}`;
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
          const result = await response.json();
          console.log('Push notification result:', result);
          
          // Mark notification as sent
          const { error: updateError } = await supabase
            .from('medical_alerts')
            .update({
              notification_sent: true,
              notification_sent_at: new Date().toISOString()
            })
            .eq('id', alert.id);

          if (updateError) {
            console.error(`Error updating alert ${alert.id}:`, updateError);
            errors.push(`Failed to update alert ${alert.id}: ${updateError.message}`);
          } else {
            notificationsSent++;
            console.log(`✅ Notification sent successfully for alert ${alert.id}`);
          }
        } else {
          const errorText = await response.text();
          console.error(`❌ Failed to send notification for alert ${alert.id}:`, errorText);
          errors.push(`Failed to send notification for alert ${alert.id}: ${errorText}`);
        }

      } catch (notificationError) {
        console.error(`Error processing alert ${alert.id}:`, notificationError);
        errors.push(`Error processing alert ${alert.id}: ${notificationError.message}`);
        continue;
      }
    }

    // Update overdue alerts
    const { error: overdueError } = await supabase
      .from('medical_alerts')
      .update({ status: 'overdue' })
      .eq('status', 'pending')
      .lt('due_date', today);

    if (overdueError) {
      console.error('Error updating overdue alerts:', overdueError);
      errors.push(`Error updating overdue alerts: ${overdueError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Medical notifications processed successfully',
        alertsProcessed: alerts.length,
        notificationsSent,
        errors: errors.length > 0 ? errors : undefined,
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
      JSON.stringify({ 
        success: false,
        error: 'Internal server error', 
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});