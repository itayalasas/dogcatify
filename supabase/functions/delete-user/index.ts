import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface DeleteUserRequest {
  userId: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }

  try {
    const { userId }: DeleteUserRequest = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'User ID is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log('Starting complete user deletion for:', userId);

    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Complete list of tables that might reference the user
    const tablesToClean = [
      // Pet-related tables
      { table: 'medical_alerts', columns: ['user_id', 'pet_id'] },
      { table: 'medical_history_tokens', columns: ['created_by', 'pet_id'] },
      { table: 'pet_health', columns: ['user_id', 'pet_id'] },
      { table: 'pet_albums', columns: ['user_id', 'pet_id'] },
      { table: 'pet_behavior', columns: ['user_id', 'pet_id'] },
      
      // Booking and service related
      { table: 'service_reviews', columns: ['customer_id', 'pet_id'] },
      { table: 'bookings', columns: ['customer_id', 'pet_id'] },
      
      // Chat and messaging
      { table: 'chat_messages', columns: ['sender_id'] },
      { table: 'chat_conversations', columns: ['user_id'] },
      { table: 'adoption_messages', columns: ['sender_id'] },
      { table: 'adoption_chats', columns: ['customer_id'] },
      
      // Commerce
      { table: 'orders', columns: ['customer_id'] },
      { table: 'user_carts', columns: ['user_id'] },
      
      // Social
      { table: 'comments', columns: ['user_id'] },
      { table: 'posts', columns: ['user_id'] },
      
      // Business (if user is a partner)
      { table: 'business_schedule', columns: ['partner_id'] },
      { table: 'partner_services', columns: ['partner_id'] },
      { table: 'partner_products', columns: ['partner_id'] },
      { table: 'promotion_billing', columns: ['partner_id', 'created_by'] },
      { table: 'promotions', columns: ['partner_id', 'created_by'] },
      { table: 'places', columns: ['created_by'] },
      
      // Auth related
      { table: 'email_confirmations', columns: ['user_id'] },
      
      // Main tables
      { table: 'pets', columns: ['owner_id'] },
      { table: 'partners', columns: ['user_id'] },
    ];

    console.log('Starting comprehensive data cleanup...');

    // First, get user's pets to handle pet-related deletions
    const { data: userPets } = await supabase
      .from('pets')
      .select('id')
      .eq('owner_id', userId);

    if (userPets && userPets.length > 0) {
      console.log(`Found ${userPets.length} pets for user ${userId}`);
      
      for (const pet of userPets) {
        console.log(`Cleaning data for pet ${pet.id}...`);
        
        // Delete all pet-related data
        const petTables = [
          'medical_alerts',
          'medical_history_tokens', 
          'pet_health',
          'pet_albums',
          'pet_behavior',
          'service_reviews',
          'bookings'
        ];
        
        for (const table of petTables) {
          try {
            await supabase.from(table).delete().eq('pet_id', pet.id);
            console.log(`✅ Cleaned ${table} for pet ${pet.id}`);
          } catch (error) {
            console.warn(`⚠️ Could not clean ${table} for pet ${pet.id}:`, error.message);
          }
        }
      }
    }

    // Get user's partner data to handle business-related deletions
    const { data: userPartners } = await supabase
      .from('partners')
      .select('id')
      .eq('user_id', userId);

    if (userPartners && userPartners.length > 0) {
      console.log(`Found ${userPartners.length} partner businesses for user ${userId}`);
      
      for (const partner of userPartners) {
        console.log(`Cleaning data for partner ${partner.id}...`);
        
        // Delete all partner-related data
        const partnerTables = [
          'business_schedule',
          'partner_services', 
          'partner_products',
          'promotion_billing',
          'promotions'
        ];
        
        for (const table of partnerTables) {
          try {
            await supabase.from(table).delete().eq('partner_id', partner.id);
            console.log(`✅ Cleaned ${table} for partner ${partner.id}`);
          } catch (error) {
            console.warn(`⚠️ Could not clean ${table} for partner ${partner.id}:`, error.message);
          }
        }
      }
    }

    // Clean all user-direct references
    console.log('Cleaning direct user references...');
    
    for (const { table, columns } of tablesToClean) {
      for (const column of columns) {
        try {
          const { error } = await supabase
            .from(table)
            .delete()
            .eq(column, userId);
            
          if (error) {
            console.warn(`⚠️ Could not clean ${table}.${column}:`, error.message);
          } else {
            console.log(`✅ Cleaned ${table}.${column}`);
          }
        } catch (error) {
          console.warn(`⚠️ Error cleaning ${table}.${column}:`, error.message);
        }
      }
    }

    // Final verification - check if profile still exists
    console.log('Verifying profile deletion...');
    const { data: remainingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (remainingProfile) {
      console.log('Profile still exists, attempting final deletion...');
      const { error: finalProfileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
        
      if (finalProfileError) {
        console.error('Final profile deletion failed:', finalProfileError);
      } else {
        console.log('✅ Profile finally deleted');
      }
    } else {
      console.log('✅ Profile already deleted');
    }

    // Now attempt to delete from auth.users
    console.log('Attempting to delete user from auth.users...');
    
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    
    if (authError) {
      console.error('Auth deletion failed:', authError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to delete user from auth: ${authError.message}`,
          details: authError
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log('✅ User successfully deleted from auth.users');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User completely deleted from all systems' 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error) {
    console.error('Error in delete-user function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Server error: ${error.message}` 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});