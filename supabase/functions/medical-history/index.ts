import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.43.2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Cache-Control, Accept, apikey",
};

serve(async (req: Request) => {
  console.log('=== MEDICAL HISTORY FUNCTION START ===');
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
      return new Response('Pet ID is required', {
        status: 400,
        headers: { 'Content-Type': 'text/plain', ...corsHeaders },
      });
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      urlPreview: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'missing',
      keyPreview: supabaseServiceKey ? supabaseServiceKey.substring(0, 20) + '...' : 'missing'
    });
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return new Response('Server configuration error', {
        status: 500,
        headers: { 'Content-Type': 'text/plain', ...corsHeaders },
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
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head><title>Enlace Inválido</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>🚫 Enlace Inválido</h1>
            <p>El enlace proporcionado no es válido o ha sido revocado.</p>
          </body>
          </html>
        `, {
          status: 400,
          headers: { 'Content-Type': 'text/html', ...corsHeaders },
        });
      }

      // Check if token has expired
      const now = new Date();
      const expiresAt = new Date(tokenData.expires_at);
      
      if (now > expiresAt) {
        console.log('Token expired');
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head><title>Enlace Expirado</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>🕒 Enlace Expirado</h1>
            <p>Este enlace ha expirado por seguridad.</p>
          </body>
          </html>
        `, {
          status: 410,
          headers: { 'Content-Type': 'text/html', ...corsHeaders },
        });
      }

      // Verify token matches the requested pet
      if (tokenData.pet_id !== petId) {
        console.error('Token pet ID mismatch');
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head><title>Acceso Denegado</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>🚫 Acceso Denegado</h1>
            <p>Este enlace no corresponde a la mascota solicitada.</p>
          </body>
          </html>
        `, {
          status: 403,
          headers: { 'Content-Type': 'text/html', ...corsHeaders },
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
      return new Response('Pet not found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain', ...corsHeaders },
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
      return new Response('Owner not found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain', ...corsHeaders },
      });
    }

    // Fetch medical records with detailed logging
    console.log('=== FETCHING MEDICAL RECORDS ===');
    console.log('Pet ID for health records:', petId);
    console.log('Using service role key for unrestricted access');
    
    // First, test basic connectivity to pet_health table
    console.log('Testing basic table access...');
    const { count: totalCount, error: countError } = await supabase
      .from('pet_health')
      .select('*', { count: 'exact', head: true });
    
    console.log('Total records in pet_health table:', totalCount);
    console.log('Count query error:', countError?.message);
    
    // Now fetch records for this specific pet
    console.log('Fetching records for pet:', petId);
    const { data: medicalRecords, error: recordsError } = await supabase
      .from('pet_health')
      .select('*')
      .eq('pet_id', petId);

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

    // Log detailed information about found records
    if (medicalRecords && medicalRecords.length > 0) {
      console.log('=== FOUND MEDICAL RECORDS ===');
      console.log('Total records found:', medicalRecords.length);
      
      const recordsByType = medicalRecords.reduce((acc, record) => {
        acc[record.type] = (acc[record.type] || 0) + 1;
        return acc;
      }, {});
      
      console.log('Records by type:', recordsByType);
      
      // Log first few records for debugging
      medicalRecords.slice(0, 3).forEach((record, index) => {
        console.log(`Record ${index + 1}:`, {
          id: record.id,
          type: record.type,
          name: record.name,
          product_name: record.product_name,
          application_date: record.application_date,
          diagnosis_date: record.diagnosis_date,
          date: record.date,
          veterinarian: record.veterinarian,
          treatment: record.treatment,
          symptoms: record.symptoms,
          severity: record.severity,
          weight: record.weight,
          weight_unit: record.weight_unit,
          notes: record.notes,
          status: record.status,
          created_at: record.created_at
        });
      });
    } else {
      console.log('=== NO MEDICAL RECORDS FOUND ===');
      console.log('This could mean:');
      console.log('1. No records exist for this pet');
      console.log('2. RLS is blocking access (even with service role)');
      console.log('3. Pet ID is incorrect');
      console.log('4. Table structure issue');
    }

    const records = medicalRecords || [];

    // Helper functions
    const formatAge = (pet: any): string => {
      if (pet.age_display) {
        const { value, unit } = pet.age_display;
        switch (unit) {
          case 'days': return `${value} ${value === 1 ? 'día' : 'días'}`;
          case 'months': return `${value} ${value === 1 ? 'mes' : 'meses'}`;
          case 'years': return `${value} ${value === 1 ? 'año' : 'años'}`;
          default: return `${value} ${unit}`;
        }
      }
      return `${pet.age} ${pet.age === 1 ? 'año' : 'años'}`;
    };

    const formatWeight = (pet: any): string => {
      if (pet.weight_display) {
        return `${pet.weight_display.value} ${pet.weight_display.unit}`;
      }
      return `${pet.weight} kg`;
    };

    const formatDate = (dateString: string): string => {
      if (!dateString) return 'No especificada';
      
      if (dateString.includes('/')) {
        return dateString;
      }
      
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      } catch {
        return dateString;
      }
    };

    // Group records by type
    const vaccines = records.filter(r => r.type === 'vaccine');
    const illnesses = records.filter(r => r.type === 'illness');
    const allergies = records.filter(r => r.type === 'allergy');
    const dewormings = records.filter(r => r.type === 'deworming');
    const weightRecords = records.filter(r => r.type === 'weight');

    console.log('=== FINAL RECORD GROUPING ===');
    console.log('Vaccines:', vaccines.length);
    console.log('Illnesses:', illnesses.length);
    console.log('Allergies:', allergies.length);
    console.log('Dewormings:', dewormings.length);
    console.log('Weight records:', weightRecords.length);

    // Generate HTML content
    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Historia Clínica - ${petData.name}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8f9fa;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background-color: white;
            min-height: 100vh;
        }
        .header {
            background: linear-gradient(135deg, #2D6A6F 0%, #1e4a4f 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
            font-weight: 700;
        }
        .header p {
            font-size: 16px;
            opacity: 0.9;
        }
        .content {
            padding: 30px;
        }
        .debug-info {
            background-color: #f0f9ff;
            border: 1px solid #0ea5e9;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            font-family: monospace;
            font-size: 12px;
        }
        .pet-profile {
            display: flex;
            align-items: center;
            margin-bottom: 30px;
            padding: 20px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 15px;
            border: 1px solid #dee2e6;
        }
        .pet-image {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            object-fit: cover;
            margin-right: 20px;
            border: 4px solid #2D6A6F;
        }
        .pet-info h2 {
            font-size: 24px;
            color: #2D6A6F;
            margin-bottom: 5px;
        }
        .pet-info p {
            color: #6c757d;
            margin-bottom: 3px;
        }
        .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
        }
        .section-title {
            background: linear-gradient(135deg, #2D6A6F 0%, #1e4a4f 100%);
            color: white;
            padding: 15px 20px;
            border-radius: 10px 10px 0 0;
            font-size: 18px;
            font-weight: 600;
        }
        .section-content {
            background-color: white;
            border: 1px solid #dee2e6;
            border-top: none;
            border-radius: 0 0 10px 10px;
            padding: 20px;
        }
        .record-item {
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            border: 1px solid #dee2e6;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 15px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .record-title {
            font-weight: 600;
            font-size: 16px;
            color: #2D6A6F;
            margin-bottom: 10px;
        }
        .record-detail {
            margin-bottom: 8px;
            font-size: 14px;
            color: #495057;
        }
        .record-detail strong {
            color: #2D6A6F;
        }
        .empty-section {
            text-align: center;
            padding: 30px;
            color: #6c757d;
            font-style: italic;
        }
        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
            margin-left: 10px;
        }
        .badge-success {
            background-color: #d4edda;
            color: #155724;
        }
        .badge-warning {
            background-color: #fff3cd;
            color: #856404;
        }
        .badge-danger {
            background-color: #f8d7da;
            color: #721c24;
        }
        .weight-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 15px;
        }
        .weight-item {
            background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
            padding: 15px;
            border-radius: 10px;
            text-align: center;
            border: 1px solid #90caf9;
        }
        .weight-date {
            font-weight: 600;
            color: #1565c0;
            margin-bottom: 5px;
        }
        .weight-value {
            font-size: 18px;
            font-weight: 700;
            color: #0d47a1;
        }
        .weight-notes {
            font-size: 12px;
            color: #1976d2;
            margin-top: 5px;
            font-style: italic;
        }
        .footer {
            margin-top: 40px;
            padding: 20px;
            background-color: #f8f9fa;
            border-top: 3px solid #2D6A6F;
            text-align: center;
            border-radius: 10px;
        }
        .footer p {
            font-size: 12px;
            color: #6c757d;
            margin-bottom: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🐾 HISTORIA CLÍNICA VETERINARIA</h1>
            <p>Generada el ${new Date().toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
        </div>

        <div class="content">
            <!-- Debug Information (remove in production) -->
            <div class="debug-info">
                <strong>DEBUG INFO:</strong><br>
                Pet ID: ${petId}<br>
                Records found: ${records.length}<br>
                Vaccines: ${vaccines.length}<br>
                Illnesses: ${illnesses.length}<br>
                Allergies: ${allergies.length}<br>
                Dewormings: ${dewormings.length}<br>
                Weight records: ${weightRecords.length}<br>
                Service role used: ${!!supabaseServiceKey}<br>
                Query error: ${recordsError?.message || 'None'}
            </div>

            <div class="pet-profile">
                ${petData.photo_url ? `<img src="${petData.photo_url}" alt="${petData.name}" class="pet-image">` : ''}
                <div class="pet-info">
                    <h2>${petData.name}</h2>
                    <p><strong>${petData.breed}</strong></p>
                    <p>${petData.species === 'dog' ? 'Perro' : 'Gato'} • ${petData.gender === 'male' ? 'Macho' : 'Hembra'}</p>
                    ${petData.color ? `<p>Color: ${petData.color}</p>` : ''}
                </div>
            </div>

            <div class="section">
                <div class="section-title">
                    👤 INFORMACIÓN DEL PROPIETARIO
                </div>
                <div class="section-content">
                    <div class="record-item">
                        <div class="record-detail"><strong>Nombre:</strong> ${ownerData.display_name}</div>
                        <div class="record-detail"><strong>Email:</strong> ${ownerData.email}</div>
                        ${ownerData.phone ? `<div class="record-detail"><strong>Teléfono:</strong> ${ownerData.phone}</div>` : ''}
                    </div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">
                    💉 HISTORIAL DE VACUNACIÓN (${vaccines.length} registros)
                </div>
                <div class="section-content">
                    ${vaccines.length > 0 ? vaccines.map((vaccine, index) => `
                    <div class="record-item">
                        <div class="record-title">
                            💉 ${index + 1}. ${vaccine.name}
                        </div>
                        <div class="record-detail">
                            <strong>Fecha de aplicación:</strong> ${formatDate(vaccine.application_date || vaccine.date || '')}
                        </div>
                        ${vaccine.next_due_date ? `
                        <div class="record-detail">
                            <strong>Próxima dosis:</strong> ${formatDate(vaccine.next_due_date)}
                            <span class="badge badge-warning">Pendiente</span>
                        </div>
                        ` : ''}
                        ${vaccine.veterinarian ? `
                        <div class="record-detail">
                            <strong>Veterinario:</strong> ${vaccine.veterinarian}
                        </div>
                        ` : ''}
                        ${vaccine.notes ? `
                        <div class="record-detail">
                            <strong>Notas:</strong> ${vaccine.notes}
                        </div>
                        ` : ''}
                    </div>
                    `).join('') : `
                    <div class="empty-section">
                        <p>No hay vacunas registradas para esta mascota</p>
                    </div>
                    `}
                </div>
            </div>

            <div class="section">
                <div class="section-title">
                    🏥 HISTORIAL DE ENFERMEDADES (${illnesses.length} registros)
                </div>
                <div class="section-content">
                    ${illnesses.length > 0 ? illnesses.map((illness, index) => `
                    <div class="record-item">
                        <div class="record-title">
                            🏥 ${index + 1}. ${illness.name}
                            ${illness.status === 'active' ? '<span class="badge badge-danger">Activa</span>' : 
                              illness.status === 'recovered' ? '<span class="badge badge-success">Recuperada</span>' : 
                              illness.status ? `<span class="badge badge-warning">${illness.status}</span>` : ''}
                        </div>
                        <div class="record-detail">
                            <strong>Fecha de diagnóstico:</strong> ${formatDate(illness.diagnosis_date || illness.date || '')}
                        </div>
                        ${illness.symptoms ? `
                        <div class="record-detail">
                            <strong>Síntomas:</strong> ${illness.symptoms}
                        </div>
                        ` : ''}
                        ${illness.severity ? `
                        <div class="record-detail">
                            <strong>Severidad:</strong> ${illness.severity}
                        </div>
                        ` : ''}
                        ${illness.treatment ? `
                        <div class="record-detail">
                            <strong>Tratamiento:</strong> ${illness.treatment}
                        </div>
                        ` : ''}
                        ${illness.veterinarian ? `
                        <div class="record-detail">
                            <strong>Veterinario:</strong> ${illness.veterinarian}
                        </div>
                        ` : ''}
                        ${illness.notes ? `
                        <div class="record-detail">
                            <strong>Notas:</strong> ${illness.notes}
                        </div>
                        ` : ''}
                    </div>
                    `).join('') : `
                    <div class="empty-section">
                        <p>No hay enfermedades registradas para esta mascota</p>
                    </div>
                    `}
                </div>
            </div>

            <div class="section">
                <div class="section-title">
                    🚨 ALERGIAS CONOCIDAS (${allergies.length} registros)
                </div>
                <div class="section-content">
                    ${allergies.length > 0 ? allergies.map((allergy, index) => `
                    <div class="record-item">
                        <div class="record-title">
                            🚨 ${index + 1}. ${allergy.name}
                        </div>
                        ${allergy.symptoms ? `
                        <div class="record-detail">
                            <strong>Síntomas:</strong> ${allergy.symptoms}
                        </div>
                        ` : ''}
                        ${allergy.severity ? `
                        <div class="record-detail">
                            <strong>Severidad:</strong> ${allergy.severity}
                            ${allergy.severity.toLowerCase().includes('severa') || allergy.severity.toLowerCase().includes('alta') ? 
                              '<span class="badge badge-danger">Alta</span>' : 
                              allergy.severity.toLowerCase().includes('moderada') || allergy.severity.toLowerCase().includes('media') ? 
                              '<span class="badge badge-warning">Media</span>' : 
                              '<span class="badge badge-success">Baja</span>'}
                        </div>
                        ` : ''}
                        ${allergy.treatment ? `
                        <div class="record-detail">
                            <strong>Tratamiento:</strong> ${allergy.treatment}
                        </div>
                        ` : ''}
                        ${allergy.notes ? `
                        <div class="record-detail">
                            <strong>Notas:</strong> ${allergy.notes}
                        </div>
                        ` : ''}
                    </div>
                    `).join('') : `
                    <div class="empty-section">
                        <p>No hay alergias registradas</p>
                    </div>
                    `}
                </div>
            </div>

            <div class="section">
                <div class="section-title">
                    💊 HISTORIAL DE DESPARASITACIÓN (${dewormings.length} registros)
                </div>
                <div class="section-content">
                    ${dewormings.length > 0 ? dewormings.map((deworming, index) => `
                    <div class="record-item">
                        <div class="record-title">
                            💊 ${index + 1}. ${deworming.product_name || deworming.name}
                        </div>
                        <div class="record-detail">
                            <strong>Fecha de aplicación:</strong> ${formatDate(deworming.application_date || deworming.date || '')}
                        </div>
                        ${deworming.next_due_date ? `
                        <div class="record-detail">
                            <strong>Próxima dosis:</strong> ${formatDate(deworming.next_due_date)}
                            <span class="badge badge-warning">Pendiente</span>
                        </div>
                        ` : ''}
                        ${deworming.veterinarian ? `
                        <div class="record-detail">
                            <strong>Veterinario:</strong> ${deworming.veterinarian}
                        </div>
                        ` : ''}
                        ${deworming.notes ? `
                        <div class="record-detail">
                            <strong>Notas:</strong> ${deworming.notes}
                        </div>
                        ` : ''}
                    </div>
                    `).join('') : `
                    <div class="empty-section">
                        <p>No hay desparasitaciones registradas</p>
                    </div>
                    `}
                </div>
            </div>

            <div class="section">
                <div class="section-title">
                    ⚖️ HISTORIAL DE PESO (${weightRecords.length} registros)
                </div>
                <div class="section-content">
                    ${weightRecords.length > 0 ? `
                    <div class="weight-grid">
                        ${weightRecords.slice(0, 12).map(weight => `
                        <div class="weight-item">
                            <div class="weight-date">${formatDate(weight.date || '')}</div>
                            <div class="weight-value">${weight.weight} ${weight.weight_unit || 'kg'}</div>
                            ${weight.notes && weight.notes !== 'Peso inicial al registrar la mascota' ? `
                            <div class="weight-notes">${weight.notes}</div>
                            ` : ''}
                        </div>
                        `).join('')}
                    </div>
                    ${weightRecords.length > 12 ? `
                    <div style="text-align: center; margin-top: 20px; color: #6c757d; font-style: italic;">
                        ... y ${weightRecords.length - 12} registros más
                    </div>
                    ` : ''}
                    ` : `
                    <div class="empty-section">
                        <p>No hay registros de peso para esta mascota</p>
                    </div>
                    `}
                </div>
            </div>

            <div class="footer">
                <p><strong>Historia clínica generada por DogCatiFy</strong></p>
                <p>Fecha de generación: ${new Date().toLocaleDateString('es-ES')}</p>
                <p>Mascota: ${petData.name} | Propietario: ${ownerData.display_name}</p>
                <p>Para uso veterinario exclusivamente</p>
            </div>
        </div>
    </div>
</body>
</html>
    `;

    console.log('HTML generated successfully, length:', htmlContent.length);
    console.log('=== MEDICAL HISTORY FUNCTION END ===');

    return new Response(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
        ...corsHeaders,
      },
    });

  } catch (error) {
    console.error('Error in medical-history function:', error);
    return new Response(
      `Error generating medical history: ${error.message}`,
      {
        status: 500,
        headers: { 'Content-Type': 'text/plain', ...corsHeaders },
      }
    );
  }
});