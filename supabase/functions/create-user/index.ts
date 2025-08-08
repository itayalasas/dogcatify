import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface CreateUserRequest {
  email: string;
  password: string;
  displayName: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight request
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
    const { email, password, displayName }: CreateUserRequest = await req.json();

    if (!email || !password || !displayName) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log('Creating user account for:', email);

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Check if user already exists in profiles table
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();
    
    if (existingProfile && !checkError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Ya existe una cuenta con este correo electrónico' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Create user in auth.users table ONLY (no automatic emails)
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Don't send automatic confirmation email
      user_metadata: {
        display_name: displayName
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(
        JSON.stringify({ success: false, error: createError.message }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    if (!newUser.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create user' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log('User created successfully in auth.users:', newUser.user.id);

    // Generate custom confirmation token
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

    // Store confirmation token
    const { error: tokenError } = await supabase
      .from('email_confirmations')
      .insert({
        user_id: newUser.user.id,
        email: email,
        token_hash: token,
        type: 'signup',
        is_confirmed: false,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      });

    if (tokenError) {
      console.error('Error creating confirmation token:', tokenError);
      // Don't fail registration if token creation fails
    }

    // Send custom confirmation email
    try {
      const baseUrl = Deno.env.get('EXPO_PUBLIC_APP_DOMAIN') || Deno.env.get('EXPO_PUBLIC_APP_URL') || 'https://app-dogcatify.netlify.app';
      const confirmationUrl = `${baseUrl}/auth/confirm?token_hash=${token}&type=signup`;
      
      // Send email using our email function
      const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          to: email,
          subject: '¡Confirma tu cuenta en DogCatiFy!',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <div style="background-color: #2D6A6F; padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 20px; font-weight: bold;">¡Confirma tu cuenta en DogCatiFy!</h1>
              </div>
              <div style="padding: 20px; background-color: #ffffff;">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #333;">Hola <strong>${displayName}</strong>,</p>
                <p style="margin: 0 0 20px 0; font-size: 14px; color: #333;">¡Gracias por registrarte en DogCatiFy!</p>
                <p style="margin: 0 0 20px 0; font-size: 14px; color: #333;">Para completar tu registro y acceder a todas las funciones, necesitas confirmar tu correo electrónico.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${confirmationUrl}" style="background-color: #2D6A6F; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
                    Confirmar mi correo electrónico
                  </a>
                </div>
                
                <div style="background-color: #FFF3CD; border: 1px solid #FFEAA7; padding: 15px; margin: 20px 0; border-radius: 6px;">
                  <p style="margin: 0 0 10px 0; font-weight: bold; color: #856404; font-size: 14px;">⚠️ Importante:</p>
                  <p style="margin: 0 0 10px 0; color: #856404; font-size: 13px;">Debes hacer clic en el botón de arriba para activar tu cuenta.</p>
                  <p style="margin: 0 0 10px 0; color: #856404; font-size: 13px;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
                  <p style="margin: 0 0 10px 0; word-break: break-all; font-family: monospace; background: #f8f9fa; padding: 8px; border-radius: 4px; color: #495057; font-size: 12px;">
                    ${confirmationUrl}
                  </p>
                  <p style="margin: 0 0 8px 0; color: #856404; font-size: 13px;">Si no ves el correo, revisa tu carpeta de spam.</p>
                  <p style="margin: 0; font-weight: bold; color: #856404; font-size: 13px;">Este enlace expira en 24 horas.</p>
                </div>
                
                <p style="margin: 20px 0 10px 0; font-size: 14px; color: #333;">Una vez confirmado tu email, podrás:</p>
                <ul style="margin: 0 0 20px 20px; color: #333; font-size: 13px;">
                  <li>Crear perfiles para tus mascotas</li>
                  <li>Conectar con otros dueños de mascotas</li>
                  <li>Encontrar servicios para tus compañeros peludos</li>
                  <li>Compartir momentos especiales con la comunidad</li>
                </ul>
                
                <p style="margin: 20px 0 5px 0; font-size: 14px; color: #333;">¡Esperamos verte pronto en DogCatiFy!</p>
                <p style="margin: 0; font-size: 14px; color: #333;">El equipo de DogCatiFy</p>
              </div>
              <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 11px; color: #6c757d;">
                <p style="margin: 0 0 5px 0;">© 2025 DogCatiFy. Todos los derechos reservados.</p>
                <p style="margin: 0;">Si no solicitaste esta cuenta, puedes ignorar este correo.</p>
              </div>
            </div>
          `
        }),
      });

      if (!emailResponse.ok) {
        console.error('Failed to send confirmation email');
      } else {
        console.log('Confirmation email sent successfully');
      }
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
      // Don't fail registration if email sending fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User created successfully. Please check email for confirmation.',
        userId: newUser.user.id
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error) {
    console.error('Error in create-user function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});