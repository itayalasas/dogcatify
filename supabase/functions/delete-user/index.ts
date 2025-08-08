import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface DeleteUserRequest {
  userId: string;
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

    const { userId }: DeleteUserRequest = await req.json();

    // Validate input
    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: "User ID is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log('Deleting user from auth.users table:', userId);

    // First, verify the user exists in auth.users
    try {
      const { data: userData, error: getUserError } = await supabase.auth.admin.getUserById(userId);
      
      if (getUserError) {
        console.error('Error getting user:', getUserError);
        if (getUserError.message?.includes('User not found')) {
          return new Response(
            JSON.stringify({ success: true, message: "User already deleted from auth" }),
            {
              status: 200,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }
        throw getUserError;
      }
      
      console.log('User found in auth.users, proceeding with deletion...');
    } catch (verifyError) {
      console.error('Error verifying user exists:', verifyError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to verify user exists: ${verifyError.message}` 
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Delete user from auth.users table using admin API
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting user from auth:', deleteError);
      console.error('Delete error details:', JSON.stringify(deleteError, null, 2));
      
      // Check if user was already deleted
      if (deleteError.message?.includes('User not found')) {
        return new Response(
          JSON.stringify({ success: true, message: "User was already deleted" }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to delete user from auth: ${deleteError.message}`,
          details: deleteError
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log('User deleted successfully from auth.users table');

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error) {
    console.error('Error in delete-user function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Internal server error",
        details: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});