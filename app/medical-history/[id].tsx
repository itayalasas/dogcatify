import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, FileText, Calendar, Syringe, Heart, Pill, TriangleAlert as AlertTriangle, Scale, User, Phone, Mail, Clock } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { WebView } from 'react-native-webview';
import { supabaseClient } from '../../lib/supabase';

export default function MedicalHistory() {
  const { id, token } = useLocalSearchParams<{ id: string; token?: string }>();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [petData, setPetData] = useState<any>(null);
  const [ownerData, setOwnerData] = useState<any>(null);
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [vaccines, setVaccines] = useState<any[]>([]);
  const [conditions, setConditions] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [allergies, setAllergies] = useState<any[]>([]);
  const [dewormers, setDewormers] = useState<any[]>([]);
  const [veterinarians, setVeterinarians] = useState<any[]>([]);
  const [htmlContent, setHtmlContent] = useState<string>('');

  useEffect(() => {
    if (id) {
      verifyTokenAndFetchData();
    }
  }, [id, token]);

  useEffect(() => {
    if (petData) {
      fetchNomenclators();
    }
  }, [petData]);

  const verifyTokenAndFetchData = async () => {
    try {
      console.log('=== MEDICAL HISTORY ACCESS ===');
      console.log('Pet ID:', id);
      console.log('Token provided:', !!token);
      
      // Call Edge Function to get medical history data
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const apiUrl = `${supabaseUrl}/functions/v1/medical-history-data/${id}${token ? `?token=${token}` : ''}`;
      
      console.log('Calling Edge Function:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Edge Function response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Edge Function error:', errorData);
        
        if (errorData.isExpired) {
          setIsExpired(true);
          setError('Token expirado');
        } else {
          setError(errorData.error || 'Error al cargar la historia clínica');
        }
        return;
      }
      
      const data = await response.json();
      console.log('Edge Function returned data:', {
        success: data.success,
        petName: data.pet?.name,
        ownerName: data.owner?.display_name,
        totalRecords: data.recordCounts?.total,
        recordsByType: data.recordCounts
      });
      
      if (!data.success) {
        if (data.isExpired) {
          setIsExpired(true);
          setError('Token expirado');
        } else {
          setError(data.error || 'Error al cargar los datos');
        }
        return;
      }
      
      // Set data from Edge Function response
      setPetData(data.pet);
      setOwnerData(data.owner);
      setMedicalRecords(data.medicalRecords || []);
      
      console.log('=== DATA SET SUCCESSFULLY ===');
      
      // Generate HTML content for WebView
      await generateHTMLContent(data.pet, data.owner, data.medicalRecords || []);
      
    } catch (error) {
      console.error('Error in verifyTokenAndFetchData:', error);
      setError('No se pudo cargar la historia clínica');
    } finally {
      setLoading(false);
    }
  };

  const fetchNomenclators = async () => {
    if (!petData) return;
    
    console.log('Fetching nomenclators for pet species:', petData.species);
    
    // Fetch all nomenclators in parallel
    await Promise.all([
      fetchVaccines(),
      fetchConditions(),
      fetchTreatments(),
      fetchAllergies(),
      fetchDewormers(),
      fetchVeterinarians()
    ]);
  };

  const fetchVaccines = async () => {
    try {
      const species = petData?.species || 'dog';
      console.log('Fetching vaccines for species:', species);
      
      const { data, error } = await supabaseClient
        .from('vaccines_catalog')
        .select('*')
        .eq('is_active', true)
        .in('species', [species, 'both'])
        .order('is_required', { ascending: false })
        .order('name', { ascending: true });

      console.log('Vaccines query result:', { 
        count: data?.length || 0, 
        error: error?.message,
        firstVaccine: data?.[0]?.name 
      });
      
      if (error) {
        console.error('Error fetching vaccines:', error);
        setVaccines([]);
        return;
      }
      
      setVaccines(data || []);
    } catch (error) {
      console.error('Error in fetchVaccines:', error);
      setVaccines([]);
    }
  };

  const fetchConditions = async () => {
    try {
      const species = petData?.species || 'dog';
      console.log('Fetching conditions for species:', species);
      
      const { data, error } = await supabaseClient
        .from('medical_conditions')
        .select('*')
        .eq('is_active', true)
        .in('species', [species, 'both'])
        .order('name', { ascending: true });

      console.log('Conditions query result:', { 
        count: data?.length || 0, 
        error: error?.message,
        firstCondition: data?.[0]?.name 
      });
      
      if (error) {
        console.error('Error fetching conditions:', error);
        setConditions([]);
        return;
      }
      
      setConditions(data || []);
    } catch (error) {
      console.error('Error in fetchConditions:', error);
      setConditions([]);
    }
  };

  const fetchTreatments = async () => {
    try {
      console.log('Fetching treatments');
      
      const { data, error } = await supabaseClient
        .from('medical_treatments')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      console.log('Treatments query result:', { 
        count: data?.length || 0, 
        error: error?.message,
        firstTreatment: data?.[0]?.name 
      });
      
      if (error) {
        console.error('Error fetching treatments:', error);
        setTreatments([]);
        return;
      }
      
      setTreatments(data || []);
    } catch (error) {
      console.error('Error in fetchTreatments:', error);
      setTreatments([]);
    }
  };

  const fetchAllergies = async () => {
    try {
      const species = petData?.species || 'dog';
      console.log('Fetching allergies for species:', species);
      
      const { data, error } = await supabaseClient
        .from('allergies_catalog')
        .select('*')
        .eq('is_active', true)
        .in('species', [species, 'both'])
        .order('is_common', { ascending: false })
        .order('name', { ascending: true });

      console.log('Allergies query result:', { 
        count: data?.length || 0, 
        error: error?.message,
        firstAllergy: data?.[0]?.name 
      });
      
      if (error) {
        console.error('Error fetching allergies:', error);
        setAllergies([]);
        return;
      }
      
      setAllergies(data || []);
    } catch (error) {
      console.error('Error in fetchAllergies:', error);
      setAllergies([]);
    }
  };

  const fetchDewormers = async () => {
    try {
      const species = petData?.species || 'dog';
      console.log('Fetching dewormers for species:', species);
      
      const { data, error } = await supabaseClient
        .from('dewormers_catalog')
        .select('*')
        .eq('is_active', true)
        .in('species', [species, 'both'])
        .order('name', { ascending: true });

      console.log('Dewormers query result:', { 
        count: data?.length || 0, 
        error: error?.message,
        firstDewormer: data?.[0]?.name 
      });
      
      if (error) {
        console.error('Error fetching dewormers:', error);
        setDewormers([]);
        return;
      }
      
      setDewormers(data || []);
    } catch (error) {
      console.error('Error in fetchDewormers:', error);
      setDewormers([]);
    }
  };

  const fetchVeterinarians = async () => {
    try {
      console.log('Fetching veterinarians');
      
      const { data, error } = await supabaseClient
        .from('partners')
        .select('*')
        .eq('business_type', 'veterinary')
        .eq('is_verified', true)
        .eq('is_active', true)
        .order('business_name', { ascending: true });

      console.log('Veterinarians query result:', { 
        count: data?.length || 0, 
        error: error?.message,
        firstVet: data?.[0]?.business_name 
      });
      
      if (error) {
        console.error('Error fetching veterinarians:', error);
        setVeterinarians([]);
        return;
      }
      
      setVeterinarians(data || []);
    } catch (error) {
      console.error('Error in fetchVeterinarians:', error);
      setVeterinarians([]);
    }
  };

  const generateHTMLContent = async (pet: any, owner: any, records: any[]) => {
    try {
      console.log('Generating HTML content for medical history...');
      
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

      // Generate HTML content
      const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Historia Clínica - ${pet.name}</title>
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
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        .info-item {
            padding: 15px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 8px;
            border: 1px solid #dee2e6;
        }
        .info-label {
            font-weight: 600;
            color: #2D6A6F;
            margin-bottom: 5px;
            font-size: 14px;
        }
        .info-value {
            color: #495057;
            font-size: 16px;
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
            <div class="pet-profile">
                ${pet.photo_url ? `<img src="${pet.photo_url}" alt="${pet.name}" class="pet-image">` : ''}
                <div class="pet-info">
                    <h2>${pet.name}</h2>
                    <p><strong>${pet.breed}</strong></p>
                    <p>${pet.species === 'dog' ? 'Perro' : 'Gato'} • ${pet.gender === 'male' ? 'Macho' : 'Hembra'}</p>
                    ${pet.color ? `<p>Color: ${pet.color}</p>` : ''}
                </div>
            </div>

            <div class="section">
                <div class="section-title">
                    📋 INFORMACIÓN DE LA MASCOTA
                </div>
                <div class="section-content">
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Nombre:</div>
                            <div class="info-value">${pet.name}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Especie:</div>
                            <div class="info-value">${pet.species === 'dog' ? 'Perro' : 'Gato'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Raza:</div>
                            <div class="info-value">${pet.breed}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Sexo:</div>
                            <div class="info-value">${pet.gender === 'male' ? 'Macho' : 'Hembra'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Edad:</div>
                            <div class="info-value">${formatAge(pet)}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Peso:</div>
                            <div class="info-value">${formatWeight(pet)}</div>
                        </div>
                        ${pet.color ? `
                        <div class="info-item">
                            <div class="info-label">Color:</div>
                            <div class="info-value">${pet.color}</div>
                        </div>
                        ` : ''}
                        <div class="info-item">
                            <div class="info-label">Estado reproductivo:</div>
                            <div class="info-value">${pet.is_neutered ? 'Castrado/Esterilizado' : 'Entero'}</div>
                        </div>
                        ${pet.has_chip ? `
                        <div class="info-item">
                            <div class="info-label">Microchip:</div>
                            <div class="info-value">${pet.chip_number || 'Sí'}</div>
                        </div>
                        ` : ''}
                        <div class="info-item">
                            <div class="info-label">Fecha de registro:</div>
                            <div class="info-value">${formatDate(pet.created_at)}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">
                    👤 INFORMACIÓN DEL PROPIETARIO
                </div>
                <div class="section-content">
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Nombre:</div>
                            <div class="info-value">${owner.display_name}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Email:</div>
                            <div class="info-value">${owner.email}</div>
                        </div>
                        ${owner.phone ? `
                        <div class="info-item">
                            <div class="info-label">Teléfono:</div>
                            <div class="info-value">${owner.phone}</div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>

            ${pet.medical_notes ? `
            <div class="section">
                <div class="section-title">
                    📝 NOTAS MÉDICAS GENERALES
                </div>
                <div class="section-content">
                    <div class="record-item">
                        <div>${pet.medical_notes}</div>
                    </div>
                </div>
            </div>
            ` : ''}

            <div class="section">
                <div class="section-title">
                    💉 HISTORIAL DE VACUNACIÓN
                </div>
                <div class="section-content">
                    ${vaccines.length > 0 ? vaccines.map((vaccine, index) => `
                    <div class="record-item">
                        <div class="record-title">
                            💉 ${index + 1}. ${vaccine.name}
                        </div>
                        <div class="record-detail">
                            <strong>Fecha de aplicación:</strong> ${formatDate(vaccine.application_date || '')}
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
                        <p>No hay vacunas registradas</p>
                    </div>
                    `}
                </div>
            </div>

            <div class="section">
                <div class="section-title">
                    🏥 HISTORIAL DE ENFERMEDADES
                </div>
                <div class="section-content">
                    ${illnesses.length > 0 ? illnesses.map((illness, index) => `
                    <div class="record-item">
                        <div class="record-title">
                            🏥 ${index + 1}. ${illness.name}
                            ${illness.status === 'active' ? '<span class="badge badge-danger">Activa</span>' : 
                              illness.status === 'recovered' ? '<span class="badge badge-success">Recuperada</span>' : ''}
                        </div>
                        <div class="record-detail">
                            <strong>Fecha de diagnóstico:</strong> ${formatDate(illness.diagnosis_date || '')}
                        </div>
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
                        <p>No hay enfermedades registradas</p>
                    </div>
                    `}
                </div>
            </div>

            <div class="section">
                <div class="section-title">
                    🚨 ALERGIAS CONOCIDAS
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
                            ${allergy.severity.toLowerCase().includes('severa') ? '<span class="badge badge-danger">Alta</span>' : 
                              allergy.severity.toLowerCase().includes('moderada') ? '<span class="badge badge-warning">Media</span>' : 
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
                    💊 HISTORIAL DE DESPARASITACIÓN
                </div>
                <div class="section-content">
                    ${dewormings.length > 0 ? dewormings.map((deworming, index) => `
                    <div class="record-item">
                        <div class="record-title">
                            💊 ${index + 1}. ${deworming.product_name || deworming.name}
                        </div>
                        <div class="record-detail">
                            <strong>Fecha de aplicación:</strong> ${formatDate(deworming.application_date || '')}
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
                    ⚖️ HISTORIAL DE PESO
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
                        <p>No hay registros de peso</p>
                    </div>
                    `}
                </div>
            </div>

            <div class="footer">
                <p><strong>Historia clínica generada por DogCatiFy</strong></p>
                <p>Fecha de generación: ${new Date().toLocaleDateString('es-ES')}</p>
                <p>Mascota: ${pet.name} | Propietario: ${owner.display_name}</p>
                <p>Para uso veterinario exclusivamente</p>
                <p style="margin-top: 10px; font-size: 10px;">
                    Esta historia clínica contiene información médica confidencial y debe ser tratada con la debida confidencialidad médica.
                </p>
            </div>
        </div>
    </div>
</body>
</html>
      `;

      setHtmlContent(html);
      console.log('HTML content generated successfully');
    } catch (error) {
      console.error('Error generating HTML content:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2D6A6F" />
          <Text style={styles.loadingText}>Cargando historia clínica...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isExpired) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.expiredContainer}>
          <Card style={styles.expiredCard}>
            <View style={styles.expiredIconContainer}>
              <Clock size={64} color="#F59E0B" />
            </View>
            
            <Text style={styles.expiredTitle}>🕒 Enlace Expirado</Text>
            <Text style={styles.expiredText}>
              Este enlace de historia clínica ha expirado por motivos de seguridad.
            </Text>
            
            <View style={styles.expiredInfo}>
              <Text style={styles.expiredInfoTitle}>¿Qué hacer ahora?</Text>
              <Text style={styles.expiredInfoText}>
                • Solicite al propietario un nuevo enlace{'\n'}
                • Los enlaces expiran en 2 horas por seguridad{'\n'}
                • El propietario puede generar uno nuevo desde la app
              </Text>
            </View>
            
            <View style={styles.expiredActions}>
              <Text style={styles.expiredNote}>
                Para obtener un nuevo enlace, el propietario debe ir a la sección de salud de su mascota en DogCatiFy y generar un nuevo código QR.
              </Text>
            </View>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Card style={styles.errorCard}>
            <View style={styles.errorIconContainer}>
              <AlertTriangle size={64} color="#EF4444" />
            </View>
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Button
              title="Volver"
              onPress={() => router.back()}
              size="large"
            />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  if (!petData || !htmlContent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No se pudo cargar la historia clínica</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Historia Clínica - {petData.name}</Text>
        <View style={styles.placeholder} />
      </View>

      <WebView
        source={{ html: htmlContent }}
        style={styles.webview}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  placeholder: {
    width: 32,
  },
  webview: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 16,
  },
  expiredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  expiredCard: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    paddingVertical: 40,
  },
  expiredIconContainer: {
    marginBottom: 24,
  },
  expiredTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#F59E0B',
    textAlign: 'center',
    marginBottom: 8,
  },
  expiredText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  expiredInfo: {
    backgroundColor: '#FEF3C7',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  expiredInfoTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#92400E',
    marginBottom: 8,
  },
  expiredInfoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
    lineHeight: 20,
  },
  expiredActions: {
    width: '100%',
  },
  expiredNote: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorCard: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorIconContainer: {
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#EF4444',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
});