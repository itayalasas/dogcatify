import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.43.2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Cache-Control, Accept, apikey",
};

serve(async (req: Request) => {
  console.log('=== MEDICAL HISTORY DATA FUNCTION START ===');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const petId = url.pathname.split('/').pop();
    const token = url.searchParams.get('token');
    
    console.log('Extracted parameters:', { petId, hasToken: !!token });
    
    if (!petId) {
      console.error('No pet ID provided');
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Pet ID is required" 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
    });
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Server configuration error" 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    console.log('Supabase client created with service role');

    // If token is provided, verify it first
    if (token) {
      console.log('Verifying access token:', token.substring(0, 10) + '...');
      
      const { data: tokenData, error: tokenError } = await supabase
        .from('medical_history_tokens')
        .select('*')
        .eq('token', token)
        .single();

      console.log('Token verification:', { 
        found: !!tokenData, 
        error: tokenError?.message,
        petIdMatch: tokenData?.pet_id === petId,
        expiresAt: tokenData?.expires_at
      });

      if (tokenError || !tokenData) {
        console.error('Invalid token');
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Invalid token" 
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Check if token has expired
      const now = new Date();
      const expiresAt = new Date(tokenData.expires_at);
      
      if (now > expiresAt) {
        console.log('Token expired');
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Token has expired",
          isExpired: true 
        }), {
          status: 410,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Verify token matches the requested pet
      if (tokenData.pet_id !== petId) {
        console.error('Token pet ID mismatch');
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Token does not match requested pet" 
        }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      
      console.log('Token verified successfully');
    }

    // Fetch pet data
    console.log('Fetching pet data for ID:', petId);
    const { data: petData, error: petError } = await supabase
      .from('pets')
      .select('*')
      .eq('id', petId)
      .single();

    console.log('Pet data result:', { 
      found: !!petData, 
      error: petError?.message,
      petName: petData?.name,
      ownerId: petData?.owner_id
    });

    if (petError || !petData) {
      console.error('Pet not found:', petError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Pet not found" 
      }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch owner data
    console.log('Fetching owner data for owner_id:', petData.owner_id);
    const { data: ownerData, error: ownerError } = await supabase
      .from('profiles')
      .select('display_name, email, phone')
      .eq('id', petData.owner_id)
      .single();

    console.log('Owner data result:', { 
      found: !!ownerData, 
      error: ownerError?.message,
      ownerName: ownerData?.display_name
    });

    if (ownerError || !ownerData) {
      console.error('Owner not found:', ownerError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Owner not found" 
      }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch medical records with detailed logging
    console.log('=== FETCHING MEDICAL RECORDS ===');
    console.log('Pet ID for health records:', petId);
    console.log('Using service role key for unrestricted access');
    
    const { data: medicalRecords, error: recordsError } = await supabase
      .from('pet_health')
      .select('*')
      .eq('pet_id', petId)
      .order('created_at', { ascending: false });

    console.log('Medical records query result:', {
      recordsFound: medicalRecords?.length || 0,
      error: recordsError?.message,
      errorCode: recordsError?.code,
      errorDetails: recordsError?.details
    });

    if (recordsError) {
      console.error('Error fetching medical records:', recordsError);
      console.error('Full error:', JSON.stringify(recordsError, null, 2));
    }

    const records = medicalRecords || [];

    // Log detailed information about found records
    if (records.length > 0) {
      console.log('=== FOUND MEDICAL RECORDS ===');
      console.log('Total records found:', records.length);
      
      const recordsByType = records.reduce((acc, record) => {
        acc[record.type] = (acc[record.type] || 0) + 1;
        return acc;
      }, {});
      
      console.log('Records by type:', recordsByType);
    } else {
      console.log('=== NO MEDICAL RECORDS FOUND ===');
    }

    // Return JSON data for React components
    const responseData = {
      success: true,
      pet: petData,
      owner: ownerData,
      medicalRecords: records,
      recordCounts: {
        total: records.length,
        vaccines: records.filter(r => r.type === 'vaccine').length,
        illnesses: records.filter(r => r.type === 'illness').length,
        allergies: records.filter(r => r.type === 'allergy').length,
        dewormings: records.filter(r => r.type === 'deworming').length,
        weight: records.filter(r => r.type === 'weight').length,
      }
    };

    console.log('Returning JSON response with data:', {
      petName: responseData.pet.name,
      ownerName: responseData.owner.display_name,
      totalRecords: responseData.recordCounts.total,
      recordsByType: responseData.recordCounts
    });

    console.log('=== MEDICAL HISTORY DATA FUNCTION END ===');

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        ...corsHeaders,
      },
    });

  } catch (error) {
    console.error('Error in medical-history-data function:', error);
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