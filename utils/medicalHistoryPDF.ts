import { supabaseClient } from '../lib/supabase';

interface MedicalRecord {
  id: string;
  type: string;
  name: string;
  application_date?: string;
  diagnosis_date?: string;
  next_due_date?: string;
  symptoms?: string;
  severity?: string;
  treatment?: string;
  veterinarian?: string;
  notes?: string;
  weight?: number;
  weight_unit?: string;
  date?: string;
  created_at: string;
}

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  age_display?: { value: number; unit: string };
  gender: string;
  weight: number;
  weight_display?: { value: number; unit: string };
  color?: string;
  is_neutered?: boolean;
  has_chip?: boolean;
  chip_number?: string;
  medical_notes?: string;
  created_at: string;
  photo_url?: string;
}

interface Owner {
  display_name: string;
  email: string;
  phone?: string;
}

export class MedicalHistoryPDF {
  private formatAge(pet: Pet): string {
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
  }

  private formatWeight(pet: Pet): string {
    if (pet.weight_display) {
      return `${pet.weight_display.value} ${pet.weight_display.unit}`;
    }
    return `${pet.weight} kg`;
  }

  private formatDate(dateString: string): string {
    if (!dateString) return 'No especificada';
    
    // If already in dd/mm/yyyy format, return as is
    if (dateString.includes('/')) {
      return dateString;
    }
    
    // If in ISO format, convert
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
  }

  private generateHTMLContent(pet: Pet, owner: Owner, records: MedicalRecord[]): string {
    // Group records by type
    const vaccines = records.filter(r => r.type === 'vaccine');
    const illnesses = records.filter(r => r.type === 'illness');
    const allergies = records.filter(r => r.type === 'allergy');
    const dewormings = records.filter(r => r.type === 'deworming');
    const weightRecords = records.filter(r => r.type === 'weight');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Historia Clínica - ${pet.name}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            line-height: 1.6;
            color: #333;
        }
        .header {
            background-color: #2D6A6F;
            color: white;
            padding: 20px;
            text-align: center;
            margin: -20px -20px 30px -20px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
        }
        .section-title {
            background-color: #f8f9fa;
            padding: 10px;
            border-left: 4px solid #2D6A6F;
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 15px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 20px;
        }
        .info-item {
            padding: 8px;
            background-color: #f8f9fa;
            border-radius: 4px;
        }
        .info-label {
            font-weight: bold;
            color: #2D6A6F;
        }
        .record-item {
            background-color: #fff;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .record-title {
            font-weight: bold;
            font-size: 14px;
            color: #2D6A6F;
            margin-bottom: 8px;
        }
        .record-detail {
            margin-bottom: 4px;
            font-size: 12px;
        }
        .weight-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
        }
        .weight-item {
            background-color: #f8f9fa;
            padding: 8px;
            border-radius: 4px;
            text-align: center;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            text-align: center;
            font-size: 10px;
            color: #666;
        }
        @media print {
            body { margin: 0; }
            .section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🐾 HISTORIA CLÍNICA VETERINARIA</h1>
        <p>Generada el ${new Date().toLocaleDateString('es-ES')}</p>
    </div>

    <div class="section">
        <div class="section-title">INFORMACIÓN DE LA MASCOTA</div>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Nombre:</div>
                <div>${pet.name}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Especie:</div>
                <div>${pet.species === 'dog' ? 'Perro' : 'Gato'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Raza:</div>
                <div>${pet.breed}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Sexo:</div>
                <div>${pet.gender === 'male' ? 'Macho' : 'Hembra'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Edad:</div>
                <div>${this.formatAge(pet)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Peso:</div>
                <div>${this.formatWeight(pet)}</div>
            </div>
            ${pet.color ? `
            <div class="info-item">
                <div class="info-label">Color:</div>
                <div>${pet.color}</div>
            </div>
            ` : ''}
            <div class="info-item">
                <div class="info-label">Estado reproductivo:</div>
                <div>${pet.is_neutered ? 'Castrado/Esterilizado' : 'Entero'}</div>
            </div>
            ${pet.has_chip ? `
            <div class="info-item">
                <div class="info-label">Microchip:</div>
                <div>${pet.chip_number || 'Sí'}</div>
            </div>
            ` : ''}
            <div class="info-item">
                <div class="info-label">Fecha de registro:</div>
                <div>${this.formatDate(pet.created_at)}</div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">INFORMACIÓN DEL PROPIETARIO</div>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Nombre:</div>
                <div>${owner.display_name}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Email:</div>
                <div>${owner.email}</div>
            </div>
            ${owner.phone ? `
            <div class="info-item">
                <div class="info-label">Teléfono:</div>
                <div>${owner.phone}</div>
            </div>
            ` : ''}
        </div>
    </div>

    ${pet.medical_notes ? `
    <div class="section">
        <div class="section-title">NOTAS MÉDICAS GENERALES</div>
        <div class="record-item">
            <div>${pet.medical_notes}</div>
        </div>
    </div>
    ` : ''}

    ${vaccines.length > 0 ? `
    <div class="section">
        <div class="section-title">💉 HISTORIAL DE VACUNACIÓN</div>
        ${vaccines.map((vaccine, index) => `
        <div class="record-item">
            <div class="record-title">${index + 1}. ${vaccine.name}</div>
            <div class="record-detail">Fecha de aplicación: ${this.formatDate(vaccine.application_date || '')}</div>
            ${vaccine.next_due_date ? `<div class="record-detail">Próxima dosis: ${this.formatDate(vaccine.next_due_date)}</div>` : ''}
            ${vaccine.veterinarian ? `<div class="record-detail">Veterinario: ${vaccine.veterinarian}</div>` : ''}
            ${vaccine.notes ? `<div class="record-detail">Notas: ${vaccine.notes}</div>` : ''}
        </div>
        `).join('')}
    </div>
    ` : ''}

    ${illnesses.length > 0 ? `
    <div class="section">
        <div class="section-title">🏥 HISTORIAL DE ENFERMEDADES</div>
        ${illnesses.map((illness, index) => `
        <div class="record-item">
            <div class="record-title">${index + 1}. ${illness.name}</div>
            <div class="record-detail">Fecha de diagnóstico: ${this.formatDate(illness.diagnosis_date || '')}</div>
            ${illness.treatment ? `<div class="record-detail">Tratamiento: ${illness.treatment}</div>` : ''}
            ${illness.veterinarian ? `<div class="record-detail">Veterinario: ${illness.veterinarian}</div>` : ''}
            ${illness.status ? `<div class="record-detail">Estado: ${illness.status}</div>` : ''}
            ${illness.notes ? `<div class="record-detail">Notas: ${illness.notes}</div>` : ''}
        </div>
        `).join('')}
    </div>
    ` : ''}

    ${allergies.length > 0 ? `
    <div class="section">
        <div class="section-title">🚨 ALERGIAS CONOCIDAS</div>
        ${allergies.map((allergy, index) => `
        <div class="record-item">
            <div class="record-title">${index + 1}. ${allergy.name}</div>
            ${allergy.symptoms ? `<div class="record-detail">Síntomas: ${allergy.symptoms}</div>` : ''}
            ${allergy.severity ? `<div class="record-detail">Severidad: ${allergy.severity}</div>` : ''}
            ${allergy.treatment ? `<div class="record-detail">Tratamiento: ${allergy.treatment}</div>` : ''}
            ${allergy.notes ? `<div class="record-detail">Notas: ${allergy.notes}</div>` : ''}
        </div>
        `).join('')}
    </div>
    ` : ''}

    ${dewormings.length > 0 ? `
    <div class="section">
        <div class="section-title">💊 HISTORIAL DE DESPARASITACIÓN</div>
        ${dewormings.map((deworming, index) => `
        <div class="record-item">
            <div class="record-title">${index + 1}. ${deworming.name}</div>
            <div class="record-detail">Fecha de aplicación: ${this.formatDate(deworming.application_date || '')}</div>
            ${deworming.next_due_date ? `<div class="record-detail">Próxima dosis: ${this.formatDate(deworming.next_due_date)}</div>` : ''}
            ${deworming.veterinarian ? `<div class="record-detail">Veterinario: ${deworming.veterinarian}</div>` : ''}
            ${deworming.notes ? `<div class="record-detail">Notas: ${deworming.notes}</div>` : ''}
        </div>
        `).join('')}
    </div>
    ` : ''}

    ${weightRecords.length > 0 ? `
    <div class="section">
        <div class="section-title">⚖️ HISTORIAL DE PESO</div>
        <div class="weight-grid">
            ${weightRecords.slice(0, 10).map(weight => `
            <div class="weight-item">
                <div><strong>${this.formatDate(weight.date || '')}</strong></div>
                <div>${weight.weight} ${weight.weight_unit || 'kg'}</div>
                ${weight.notes && weight.notes !== 'Peso inicial al registrar la mascota' ? `<div style="font-size: 10px; color: #666;">${weight.notes}</div>` : ''}
            </div>
            `).join('')}
        </div>
    </div>
    ` : ''}

    <div class="footer">
        <p>Generado por DogCatiFy el ${new Date().toLocaleDateString('es-ES')}</p>
        <p>Historia clínica de ${pet.name}</p>
        <p>Para uso veterinario exclusivamente</p>
    </div>
</body>
</html>
    `;
  }

  public async generateMedicalHistory(petId: string, ownerId: string): Promise<string> {
    try {
      // Fetch pet data
      const { data: petData, error: petError } = await supabaseClient
        .from('pets')
        .select('*')
        .eq('id', petId)
        .single();

      if (petError || !petData) {
        throw new Error('No se pudo obtener la información de la mascota');
      }

      // Fetch owner data
      const { data: ownerData, error: ownerError } = await supabaseClient
        .from('profiles')
        .select('display_name, email, phone')
        .eq('id', ownerId)
        .single();

      if (ownerError || !ownerData) {
        throw new Error('No se pudo obtener la información del propietario');
      }

      // Fetch medical records
      const { data: medicalRecords, error: recordsError } = await supabaseClient
        .from('pet_health')
        .select('*')
        .eq('pet_id', petId)
        .order('created_at', { ascending: false });

      if (recordsError) {
        throw new Error('No se pudieron obtener los registros médicos');
      }

      const pet = petData as Pet;
      const owner = ownerData as Owner;
      const records = (medicalRecords || []) as MedicalRecord[];

      // Generate HTML content
      const htmlContent = this.generateHTMLContent(pet, owner, records);

      return htmlContent;
    } catch (error) {
      console.error('Error generating medical history:', error);
      throw error;
    }
  }

  public async generateAndShare(petId: string, ownerId: string): Promise<{ htmlContent: string; shareUrl: string; directHtmlUrl: string }> {
    try {
      // Generate HTML content
      const htmlContent = await this.generateMedicalHistory(petId, ownerId);
      
      // Upload HTML to storage for sharing
      const filename = `medical-history/${petId}/${Date.now()}.html`;
      
      // Upload HTML with correct content type
      const { data, error } = await supabaseClient.storage
        .from('dogcatify')
        .upload(filename, new Blob([htmlContent], { type: 'text/html' }), {
          contentType: 'text/html',
          upsert: false,
          cacheControl: '3600',
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabaseClient.storage
        .from('dogcatify')
        .getPublicUrl(filename);

      // Create shareable URL for veterinarians
      const appDomain = process.env.EXPO_PUBLIC_APP_DOMAIN || process.env.EXPO_PUBLIC_APP_URL || 'https://app-dogcatify.netlify.app';
      const appShareUrl = `${appDomain}/medical-history/${petId}?html=${encodeURIComponent(publicUrl)}`;

      return { 
        htmlContent, 
        shareUrl: appShareUrl,
        directHtmlUrl: publicUrl
      };
    } catch (error) {
      console.error('Error generating and sharing medical history:', error);
      throw error;
    }
  }
}

// Utility functions
export const generateMedicalHistoryHTML = async (petId: string, ownerId: string): Promise<string> => {
  const generator = new MedicalHistoryPDF();
  return await generator.generateMedicalHistory(petId, ownerId);
};

export const generateMedicalHistoryWithQR = async (petId: string, ownerId: string): Promise<{ htmlContent: string; shareUrl: string; directHtmlUrl: string }> => {
  const generator = new MedicalHistoryPDF();
  return await generator.generateAndShare(petId, ownerId);
};