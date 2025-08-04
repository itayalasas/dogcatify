import jsPDF from 'jspdf';
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
  private doc: jsPDF;
  private yPosition: number = 20;
  private pageHeight: number = 297; // A4 height in mm
  private margin: number = 20;

  constructor() {
    this.doc = new jsPDF();
  }

  private addText(text: string, x: number = this.margin, fontSize: number = 10, style: 'normal' | 'bold' = 'normal') {
    this.doc.setFontSize(fontSize);
    this.doc.setFont('helvetica', style);
    
    // Check if we need a new page
    if (this.yPosition > this.pageHeight - 30) {
      this.doc.addPage();
      this.yPosition = 20;
    }
    
    this.doc.text(text, x, this.yPosition);
    this.yPosition += fontSize * 0.5 + 2;
  }

  private addTitle(text: string, fontSize: number = 16) {
    this.yPosition += 5;
    this.addText(text, this.margin, fontSize, 'bold');
    this.yPosition += 3;
  }

  private addSection(title: string) {
    this.yPosition += 8;
    this.addText(title, this.margin, 14, 'bold');
    this.yPosition += 2;
  }

  private addLine() {
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(this.margin, this.yPosition, 190, this.yPosition);
    this.yPosition += 5;
  }

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

  public async generateMedicalHistory(petId: string, ownerId: string): Promise<Blob> {
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

      // Generate PDF
      this.generatePDFContent(pet, owner, records);

      return this.doc.output('blob');
    } catch (error) {
      console.error('Error generating medical history PDF:', error);
      throw error;
    }
  }

  private generatePDFContent(pet: Pet, owner: Owner, records: MedicalRecord[]) {
    // Header
    this.doc.setFillColor(45, 106, 111);
    this.doc.rect(0, 0, 210, 25, 'F');
    
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('🐾 HISTORIA CLÍNICA VETERINARIA', this.margin, 15);
    
    this.doc.setTextColor(0, 0, 0);
    this.yPosition = 35;

    // Pet Information
    this.addTitle('INFORMACIÓN DE LA MASCOTA', 16);
    this.addLine();
    
    this.addText(`Nombre: ${pet.name}`, this.margin, 12, 'bold');
    this.addText(`Especie: ${pet.species === 'dog' ? 'Perro' : 'Gato'}`);
    this.addText(`Raza: ${pet.breed}`);
    this.addText(`Sexo: ${pet.gender === 'male' ? 'Macho' : 'Hembra'}`);
    this.addText(`Edad: ${this.formatAge(pet)}`);
    this.addText(`Peso: ${this.formatWeight(pet)}`);
    
    if (pet.color) {
      this.addText(`Color: ${pet.color}`);
    }
    
    this.addText(`Estado reproductivo: ${pet.is_neutered ? 'Castrado/Esterilizado' : 'Entero'}`);
    
    if (pet.has_chip) {
      this.addText(`Microchip: ${pet.chip_number || 'Sí'}`);
    }
    
    this.addText(`Fecha de registro: ${this.formatDate(pet.created_at)}`);

    // Owner Information
    this.addSection('INFORMACIÓN DEL PROPIETARIO');
    this.addLine();
    
    this.addText(`Nombre: ${owner.display_name}`);
    this.addText(`Email: ${owner.email}`);
    if (owner.phone) {
      this.addText(`Teléfono: ${owner.phone}`);
    }

    // Medical Notes
    if (pet.medical_notes) {
      this.addSection('NOTAS MÉDICAS GENERALES');
      this.addLine();
      this.addText(pet.medical_notes);
    }

    // Medical Records by Type
    const vaccines = records.filter(r => r.type === 'vaccine');
    const illnesses = records.filter(r => r.type === 'illness');
    const allergies = records.filter(r => r.type === 'allergy');
    const dewormings = records.filter(r => r.type === 'deworming');
    const weightRecords = records.filter(r => r.type === 'weight');

    // Vaccines Section
    if (vaccines.length > 0) {
      this.addSection('💉 HISTORIAL DE VACUNACIÓN');
      this.addLine();
      
      vaccines.forEach((vaccine, index) => {
        this.addText(`${index + 1}. ${vaccine.name}`, this.margin, 11, 'bold');
        this.addText(`   Fecha de aplicación: ${this.formatDate(vaccine.application_date || '')}`);
        if (vaccine.next_due_date) {
          this.addText(`   Próxima dosis: ${this.formatDate(vaccine.next_due_date)}`);
        }
        if (vaccine.veterinarian) {
          this.addText(`   Veterinario: ${vaccine.veterinarian}`);
        }
        if (vaccine.notes) {
          this.addText(`   Notas: ${vaccine.notes}`);
        }
        this.yPosition += 3;
      });
    }

    // Illnesses Section
    if (illnesses.length > 0) {
      this.addSection('🏥 HISTORIAL DE ENFERMEDADES');
      this.addLine();
      
      illnesses.forEach((illness, index) => {
        this.addText(`${index + 1}. ${illness.name}`, this.margin, 11, 'bold');
        this.addText(`   Fecha de diagnóstico: ${this.formatDate(illness.diagnosis_date || '')}`);
        if (illness.treatment) {
          this.addText(`   Tratamiento: ${illness.treatment}`);
        }
        if (illness.veterinarian) {
          this.addText(`   Veterinario: ${illness.veterinarian}`);
        }
        if (illness.status) {
          this.addText(`   Estado: ${illness.status}`);
        }
        if (illness.notes) {
          this.addText(`   Notas: ${illness.notes}`);
        }
        this.yPosition += 3;
      });
    }

    // Allergies Section
    if (allergies.length > 0) {
      this.addSection('🚨 ALERGIAS CONOCIDAS');
      this.addLine();
      
      allergies.forEach((allergy, index) => {
        this.addText(`${index + 1}. ${allergy.name}`, this.margin, 11, 'bold');
        if (allergy.symptoms) {
          this.addText(`   Síntomas: ${allergy.symptoms}`);
        }
        if (allergy.severity) {
          this.addText(`   Severidad: ${allergy.severity}`);
        }
        if (allergy.treatment) {
          this.addText(`   Tratamiento: ${allergy.treatment}`);
        }
        if (allergy.notes) {
          this.addText(`   Notas: ${allergy.notes}`);
        }
        this.yPosition += 3;
      });
    }

    // Deworming Section
    if (dewormings.length > 0) {
      this.addSection('💊 HISTORIAL DE DESPARASITACIÓN');
      this.addLine();
      
      dewormings.forEach((deworming, index) => {
        this.addText(`${index + 1}. ${deworming.name}`, this.margin, 11, 'bold');
        this.addText(`   Fecha de aplicación: ${this.formatDate(deworming.application_date || '')}`);
        if (deworming.next_due_date) {
          this.addText(`   Próxima dosis: ${this.formatDate(deworming.next_due_date)}`);
        }
        if (deworming.veterinarian) {
          this.addText(`   Veterinario: ${deworming.veterinarian}`);
        }
        if (deworming.notes) {
          this.addText(`   Notas: ${deworming.notes}`);
        }
        this.yPosition += 3;
      });
    }

    // Weight History Section
    if (weightRecords.length > 0) {
      this.addSection('⚖️ HISTORIAL DE PESO');
      this.addLine();
      
      // Show last 10 weight records
      const recentWeights = weightRecords.slice(0, 10);
      recentWeights.forEach((weight, index) => {
        this.addText(`${this.formatDate(weight.date || '')}: ${weight.weight} ${weight.weight_unit || 'kg'}`);
        if (weight.notes && weight.notes !== 'Peso inicial al registrar la mascota') {
          this.addText(`   Notas: ${weight.notes}`);
        }
      });
    }

    // Footer
    this.yPosition = this.pageHeight - 20;
    this.doc.setFontSize(8);
    this.doc.setTextColor(128, 128, 128);
    this.doc.text(`Generado por DogCatiFy el ${new Date().toLocaleDateString('es-ES')}`, this.margin, this.yPosition);
    this.doc.text(`Historia clínica de ${pet.name} - Página 1`, 150, this.yPosition);
  }

  public async generateAndShare(petId: string, ownerId: string): Promise<{ pdfBlob: Blob; shareUrl: string }> {
    try {
      // Generate PDF
      const pdfBlob = await this.generateMedicalHistory(petId, ownerId);
      
      // Upload PDF to storage for sharing
      const filename = `medical-history/${petId}/${Date.now()}.pdf`;
      
      const { data, error } = await supabaseClient.storage
        .from('dogcatify')
        .upload(filename, pdfBlob, {
          contentType: 'application/pdf',
          cacheControl: '3600',
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabaseClient.storage
        .from('dogcatify')
        .getPublicUrl(filename);

      // Create shareable URL for veterinarians
      const shareUrl = `${process.env.EXPO_PUBLIC_APP_DOMAIN || 'https://app-dogcatify.netlify.app'}/medical-history/${petId}?pdf=${encodeURIComponent(publicUrl)}`;

      return { pdfBlob, shareUrl };
    } catch (error) {
      console.error('Error generating and sharing medical history:', error);
      throw error;
    }
  }
}

// Utility functions
export const generateMedicalHistoryPDF = async (petId: string, ownerId: string): Promise<Blob> => {
  const generator = new MedicalHistoryPDF();
  return await generator.generateMedicalHistory(petId, ownerId);
};

export const generateMedicalHistoryWithQR = async (petId: string, ownerId: string): Promise<{ pdfBlob: Blob; shareUrl: string }> => {
  const generator = new MedicalHistoryPDF();
  return await generator.generateAndShare(petId, ownerId);
};