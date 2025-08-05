import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Image, Platform, Alert, Dimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Download, ArrowLeft, Calendar, Scale, Syringe, Heart, TriangleAlert as AlertTriangle, Pill, User, MapPin, Phone, Mail, Shield, Clock } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { supabaseClient } from '../../lib/supabase';

const { width } = Dimensions.get('window');

export default function MedicalHistoryView() {
  const { id, token, pdf, html } = useLocalSearchParams<{ id: string; token?: string; pdf?: string; html?: string }>();
  const [pet, setPet] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenExpired, setTokenExpired] = useState(false);

  useEffect(() => {
    if (id) {
      if (token) {
        console.log('Token provided, verifying access...');
        verifyTokenAndFetchData();
      } else {
        console.log('No token provided, direct app access');
        fetchMedicalHistory();
      }
    }
  }, [id, token, html]);

  // Add effect to call Edge Function for data when needed
  useEffect(() => {
    // If we're in a web context and need to fetch data via Edge Function
    if (Platform.OS === 'web' && id && !pet && !loading) {
      console.log('Web context detected, calling Edge Function for data...');
      fetchDataViaEdgeFunction();
    }
  }, [id, pet, loading]);

  const fetchDataViaEdgeFunction = async () => {
    try {
      console.log('Calling Edge Function to get medical data...');
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/medical-history/${id}${token ? `?token=${token}` : ''}`;
      
      console.log('Edge Function URL:', edgeFunctionUrl);
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      console.log('Edge Function response status:', response.status);
      
      if (response.ok) {
        const htmlContent = await response.text();
        console.log('Edge Function returned HTML, length:', htmlContent.length);
        
        // Parse the HTML to extract data (for debugging)
        if (htmlContent.includes('DEBUG INFO:')) {
          const debugMatch = htmlContent.match(/Records found: (\d+)/);
          if (debugMatch) {
            console.log('Edge Function found records:', debugMatch[1]);
          }
        }
      } else {
        console.error('Edge Function error:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Error calling Edge Function:', error);
    }
  };
  const verifyTokenAndFetchData = async () => {
    try {
      console.log('Verifying token:', token?.substring(0, 8) + '...');
      const { verifyMedicalHistoryToken } = await import('../../utils/medicalHistoryTokens');
      const verification = await verifyMedicalHistoryToken(token!);
      
      console.log('Token verification result:', verification);
      
      if (!verification.success) {
        if (verification.isExpired) {
          console.log('Token expired');
          setTokenExpired(true);
          setError('El enlace ha expirado. Solicita un nuevo enlace al propietario de la mascota.');
        } else {
          console.log('Token invalid');
          setError('Enlace inválido. Verifica que el enlace sea correcto.');
        }
        setLoading(false);
        return;
      }
      
      console.log('Token valid, fetching medical history...');
      // Token is valid, fetch medical history via Edge Function
      await fetchMedicalHistoryViaEdgeFunction();
    } catch (error) {
      console.error('Error verifying token:', error);
      setError('Error verificando el enlace de acceso');
      setLoading(false);
    }
  };

  const fetchMedicalHistoryViaEdgeFunction = async () => {
    try {
      console.log('=== CALLING EDGE FUNCTION FOR MEDICAL DATA ===');
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/medical-history/${id}${token ? `?token=${token}` : ''}`;
      
      console.log('Edge Function URL:', edgeFunctionUrl);
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/html',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
      });
      
      console.log('Edge Function response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Edge Function error:', response.status, errorText);
        throw new Error(`Edge Function error: ${response.status}`);
      }
      
      const htmlContent = await response.text();
      console.log('Edge Function returned HTML, length:', htmlContent.length);
      
      // Parse the HTML to extract debug info
      if (htmlContent.includes('DEBUG INFO:')) {
        const debugMatch = htmlContent.match(/Records found: (\d+)/);
        const vaccinesMatch = htmlContent.match(/Vaccines: (\d+)/);
        const illnessesMatch = htmlContent.match(/Illnesses: (\d+)/);
        const allergiesMatch = htmlContent.match(/Allergies: (\d+)/);
        const dewormingsMatch = htmlContent.match(/Dewormings: (\d+)/);
        const weightMatch = htmlContent.match(/Weight records: (\d+)/);
        
        console.log('=== EDGE FUNCTION DEBUG INFO ===');
        console.log('Total records found:', debugMatch?.[1] || '0');
        console.log('Vaccines:', vaccinesMatch?.[1] || '0');
        console.log('Illnesses:', illnessesMatch?.[1] || '0');
        console.log('Allergies:', allergiesMatch?.[1] || '0');
        console.log('Dewormings:', dewormingsMatch?.[1] || '0');
        console.log('Weight records:', weightMatch?.[1] || '0');
        console.log('=== END DEBUG INFO ===');
      }
      
      // For web, we could display the HTML directly, but for now let's extract the data
      // and use our existing UI components
      await extractDataFromEdgeFunctionResponse(htmlContent);
      
    } catch (error) {
      console.error('Error calling Edge Function:', error);
      // Fallback to direct database access
      console.log('Falling back to direct database access...');
      await fetchMedicalHistory();
    }
  };
  
  const extractDataFromEdgeFunctionResponse = async (htmlContent: string) => {
    try {
      // Since the Edge Function returns complete HTML with all data,
      // we still need to fetch the raw data for our React components
      // The Edge Function call confirms the data exists and is accessible
      console.log('Edge Function confirmed data exists, fetching for React components...');
      await fetchMedicalHistory();
    } catch (error) {
      console.error('Error extracting data from Edge Function response:', error);
      throw error;
    }
  };

  const fetchMedicalHistory = async () => {
    try {
      console.log('=== FETCHING MEDICAL DATA FOR REACT COMPONENTS ===');
      console.log('Pet ID:', id);
      
      // Fetch pet data
      const { data: petData, error: petError } = await supabaseClient
        .from('pets')
        .select('*')
        .eq('id', id)
        .single();

      if (petError) {
        console.error('Error fetching pet data:', petError);
        throw petError;
      }
      
      console.log('Pet data loaded:', petData.name);

      // Fetch owner data
      const { data: ownerData, error: ownerError } = await supabaseClient
        .from('profiles')
        .select('display_name, email, phone')
        .eq('id', petData.owner_id)
        .single();

      if (ownerError) {
        console.error('Error fetching owner data:', ownerError);
        throw ownerError;
      }
      
      console.log('Owner data loaded:', ownerData.display_name);

      // Fetch medical records
      console.log('Fetching medical records for pet:', id);
      
      // Try to use Edge Function first for complete data access
      let recordsData = null;
      let recordsError = null;
      
      // Use direct database access with current user session
      console.log('Fetching medical records directly from database...');
      const { data: directData, error: directError } = await supabaseClient
        .from('pet_health')
        .select('*')
        .eq('pet_id', id)
        .order('created_at', { ascending: false });
      
      recordsData = directData;
      recordsError = directError;
      
      console.log('Direct database query result:', {
        recordsFound: recordsData?.length || 0,
        error: recordsError?.message,
        errorCode: recordsError?.code
      });

      if (recordsError) {
        console.error('Error fetching medical records:', recordsError);
        console.error('Full error details:', JSON.stringify(recordsError, null, 2));
        throw recordsError;
      }
      
      console.log('Medical records loaded:', recordsData?.length || 0);
      
      // Log record types for debugging
      if (recordsData && recordsData.length > 0) {
        const recordsByType = recordsData.reduce((acc, record) => {
          acc[record.type] = (acc[record.type] || 0) + 1;
          return acc;
        }, {});
        console.log('Records by type:', recordsByType);
      }

      setPet(petData);
      setOwner(ownerData);
      setMedicalRecords(recordsData || []);
      
      console.log('=== MEDICAL DATA LOADED SUCCESSFULLY ===');
    } catch (error) {
      console.error('Error fetching medical history:', error);
      setError('No se pudo cargar la historia clínica');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (pdf) {
      try {
        if (Platform.OS === 'web') {
          // For web, open PDF in new tab
          window.open(pdf, '_blank');
        } else {
          // For mobile, show download option
          Alert.alert(
            'Descargar PDF',
            'La historia clínica se abrirá en tu navegador para descargar.',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Abrir', onPress: () => {
                // Use Linking to open PDF
                const { Linking } = require('react-native');
                Linking.openURL(pdf);
              }}
            ]
          );
        }
      } catch (error) {
        Alert.alert('Error', 'No se pudo abrir el PDF');
      }
    }
  };

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

  const getRecordIcon = (type: string) => {
    switch (type) {
      case 'vaccine': return <Syringe size={16} color="#3B82F6" />;
      case 'illness': return <Heart size={16} color="#EF4444" />;
      case 'allergy': return <AlertTriangle size={16} color="#F59E0B" />;
      case 'deworming': return <Pill size={16} color="#10B981" />;
      case 'weight': return <Scale size={16} color="#6B7280" />;
      default: return <Calendar size={16} color="#6B7280" />;
    }
  };

  const getRecordTypeName = (type: string) => {
    switch (type) {
      case 'vaccine': return 'Vacuna';
      case 'illness': return 'Enfermedad';
      case 'allergy': return 'Alergia';
      case 'deworming': return 'Desparasitación';
      case 'weight': return 'Peso';
      default: return 'Registro';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return { text: 'Activa', color: '#EF4444', bgColor: '#FEE2E2' };
      case 'recovered':
        return { text: 'Recuperada', color: '#10B981', bgColor: '#D1FAE5' };
      case 'chronic':
        return { text: 'Crónica', color: '#F59E0B', bgColor: '#FEF3C7' };
      default:
        return { text: 'Sin estado', color: '#6B7280', bgColor: '#F3F4F6' };
    }
  };

  const getSeverityBadge = (severity: string) => {
    const severityLower = severity.toLowerCase();
    if (severityLower.includes('severa') || severityLower.includes('alta')) {
      return { text: 'Alta', color: '#EF4444', bgColor: '#FEE2E2' };
    } else if (severityLower.includes('moderada') || severityLower.includes('media')) {
      return { text: 'Media', color: '#F59E0B', bgColor: '#FEF3C7' };
    } else if (severityLower.includes('leve') || severityLower.includes('baja')) {
      return { text: 'Baja', color: '#10B981', bgColor: '#D1FAE5' };
    }
    return { text: severity, color: '#6B7280', bgColor: '#F3F4F6' };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando historia clínica...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !pet) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>🐾 Historia Clínica Veterinaria</Text>
            {tokenExpired && (
              <Text style={styles.expiredSubtitle}>Enlace Expirado</Text>
            )}
          </View>
        </View>
        <View style={styles.errorContainer}>
          {tokenExpired ? (
            <View style={styles.expiredContainer}>
              <Text style={styles.expiredIcon}>🕒</Text>
              <Text style={styles.expiredTitle}>Enlace Expirado</Text>
              <Text style={styles.expiredText}>
                Este enlace ha expirado por seguridad. Los enlaces de historia clínica son válidos por 2 horas.
              </Text>
              <Text style={styles.expiredInstructions}>
                Para acceder nuevamente:
                {'\n'}• Solicita al propietario que genere un nuevo enlace
                {'\n'}• El propietario puede crear un nuevo QR desde la app
                {'\n'}• Los nuevos enlaces son válidos por 2 horas
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.errorText}>{error || 'Historia clínica no encontrada'}</Text>
              <Button title="Volver" onPress={() => router.back()} />
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Group records by type
  const vaccines = medicalRecords.filter(r => r.type === 'vaccine');
  const illnesses = medicalRecords.filter(r => r.type === 'illness');
  const allergies = medicalRecords.filter(r => r.type === 'allergy');
  const dewormings = medicalRecords.filter(r => r.type === 'deworming');
  const weightRecords = medicalRecords.filter(r => r.type === 'weight');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>🐾 Historia Clínica Veterinaria</Text>
          <Text style={styles.subtitle}>
            Generada el {new Date().toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
        </View>
        {pdf && (
          <Button
            title="Descargar PDF"
            onPress={handleDownloadPDF}
            size="small"
          />
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Pet Information */}
        <Card style={styles.petCard}>
          <View style={styles.petHeader}>
            {pet.photo_url && (
              <Image source={{ uri: pet.photo_url }} style={styles.petImage} />
            )}
            <View style={styles.petInfo}>
              <Text style={styles.petName}>{pet.name}</Text>
              <Text style={styles.petBreed}>{pet.breed}</Text>
              <Text style={styles.petDetails}>
                {pet.species === 'dog' ? 'Perro' : 'Gato'} • {pet.gender === 'male' ? 'Macho' : 'Hembra'}
              </Text>
              {pet.color && (
                <Text style={styles.petColor}>Color: {pet.color}</Text>
              )}
            </View>
          </View>
          
          <View style={styles.petDetailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Nombre:</Text>
              <Text style={styles.detailValue}>{pet.name}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Especie:</Text>
              <Text style={styles.detailValue}>{pet.species === 'dog' ? 'Perro' : 'Gato'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Raza:</Text>
              <Text style={styles.detailValue}>{pet.breed}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Sexo:</Text>
              <Text style={styles.detailValue}>{pet.gender === 'male' ? 'Macho' : 'Hembra'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Edad:</Text>
              <Text style={styles.detailValue}>{formatAge(pet)}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Peso:</Text>
              <Text style={styles.detailValue}>{formatWeight(pet)}</Text>
            </View>
            {pet.color && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Color:</Text>
                <Text style={styles.detailValue}>{pet.color}</Text>
              </View>
            )}
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Estado reproductivo:</Text>
              <Text style={styles.detailValue}>
                {pet.is_neutered ? 'Castrado/Esterilizado' : 'Entero'}
              </Text>
            </View>
            {pet.has_chip && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Microchip:</Text>
                <Text style={styles.detailValue}>{pet.chip_number || 'Sí'}</Text>
              </View>
            )}
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Fecha de registro:</Text>
              <Text style={styles.detailValue}>{formatDate(pet.created_at)}</Text>
            </View>
          </View>
        </Card>

        {/* Owner Information */}
        <Card style={styles.ownerCard}>
          <Text style={styles.sectionTitle}>👤 Información del Propietario</Text>
          <View style={styles.ownerDetailsGrid}>
            <View style={styles.ownerDetailItem}>
              <User size={16} color="#6B7280" />
              <View style={styles.ownerDetailText}>
                <Text style={styles.ownerDetailLabel}>Nombre:</Text>
                <Text style={styles.ownerDetailValue}>{owner.display_name}</Text>
              </View>
            </View>
            <View style={styles.ownerDetailItem}>
              <Mail size={16} color="#6B7280" />
              <View style={styles.ownerDetailText}>
                <Text style={styles.ownerDetailLabel}>Email:</Text>
                <Text style={styles.ownerDetailValue}>{owner.email}</Text>
              </View>
            </View>
            {owner.phone && (
              <View style={styles.ownerDetailItem}>
                <Phone size={16} color="#6B7280" />
                <View style={styles.ownerDetailText}>
                  <Text style={styles.ownerDetailLabel}>Teléfono:</Text>
                  <Text style={styles.ownerDetailValue}>{owner.phone}</Text>
                </View>
              </View>
            )}
          </View>
        </Card>

        {/* General Medical Notes */}
        {pet.medical_notes && (
          <Card style={styles.notesCard}>
            <Text style={styles.sectionTitle}>📝 Notas Médicas Generales</Text>
            <View style={styles.notesContent}>
              <Text style={styles.notesText}>{pet.medical_notes}</Text>
            </View>
          </Card>
        )}

        {/* Vaccines Section */}
        {vaccines.length > 0 && (
          <Card style={styles.recordsCard}>
            <Text style={styles.sectionTitle}>💉 Vacunas</Text>
            {vaccines.map((vaccine) => (
              <View key={vaccine.id} style={styles.recordItem}>
                <View style={styles.recordHeader}>
                  {getRecordIcon(vaccine.type)}
                  <Text style={styles.recordName}>{vaccine.name}</Text>
                </View>
                <View style={styles.recordDetails}>
                  <View style={styles.recordDetailRow}>
                    <Text style={styles.recordDetailLabel}>Fecha de aplicación:</Text>
                    <Text style={styles.recordDetailValue}>{formatDate(vaccine.application_date)}</Text>
                  </View>
                  {vaccine.next_due_date && (
                    <View style={styles.recordDetailRow}>
                      <Text style={styles.recordDetailLabel}>Próxima dosis:</Text>
                      <View style={styles.nextDoseContainer}>
                        <Text style={styles.recordDetailValue}>{formatDate(vaccine.next_due_date)}</Text>
                        <View style={styles.pendingBadge}>
                          <Text style={styles.pendingBadgeText}>Pendiente</Text>
                        </View>
                      </View>
                    </View>
                  )}
                  {vaccine.veterinarian && (
                    <View style={styles.recordDetailRow}>
                      <Text style={styles.recordDetailLabel}>Veterinario:</Text>
                      <Text style={styles.recordDetailValue}>{vaccine.veterinarian}</Text>
                    </View>
                  )}
                  {vaccine.notes && (
                    <View style={styles.recordDetailRow}>
                      <Text style={styles.recordDetailLabel}>Notas:</Text>
                      <Text style={styles.recordDetailValue}>{vaccine.notes}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Illnesses Section */}
        {illnesses.length > 0 && (
          <Card style={styles.recordsCard}>
            <Text style={styles.sectionTitle}>🏥 Historial de Enfermedades</Text>
            {illnesses.map((illness) => (
              <View key={illness.id} style={styles.recordItem}>
                <View style={styles.recordHeader}>
                  {getRecordIcon(illness.type)}
                  <Text style={styles.recordName}>{illness.name}</Text>
                  {illness.status && (
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusBadge(illness.status).bgColor }
                    ]}>
                      <Text style={[
                        styles.statusBadgeText,
                        { color: getStatusBadge(illness.status).color }
                      ]}>
                        {getStatusBadge(illness.status).text}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.recordDetails}>
                  <View style={styles.recordDetailRow}>
                    <Text style={styles.recordDetailLabel}>Fecha de diagnóstico:</Text>
                    <Text style={styles.recordDetailValue}>{formatDate(illness.diagnosis_date)}</Text>
                  </View>
                  {illness.treatment && (
                    <View style={styles.recordDetailRow}>
                      <Text style={styles.recordDetailLabel}>Tratamiento:</Text>
                      <Text style={styles.recordDetailValue}>{illness.treatment}</Text>
                    </View>
                  )}
                  {illness.veterinarian && (
                    <View style={styles.recordDetailRow}>
                      <Text style={styles.recordDetailLabel}>Veterinario:</Text>
                      <Text style={styles.recordDetailValue}>{illness.veterinarian}</Text>
                    </View>
                  )}
                  {illness.notes && (
                    <View style={styles.recordDetailRow}>
                      <Text style={styles.recordDetailLabel}>Notas:</Text>
                      <Text style={styles.recordDetailValue}>{illness.notes}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Allergies Section */}
        {allergies.length > 0 && (
          <Card style={styles.recordsCard}>
            <Text style={styles.sectionTitle}>🚨 Alergias Conocidas</Text>
            {allergies.map((allergy) => (
              <View key={allergy.id} style={styles.recordItem}>
                <View style={styles.recordHeader}>
                  {getRecordIcon(allergy.type)}
                  <Text style={styles.recordName}>{allergy.name}</Text>
                </View>
                <View style={styles.recordDetails}>
                  {allergy.symptoms && (
                    <View style={styles.recordDetailRow}>
                      <Text style={styles.recordDetailLabel}>Síntomas:</Text>
                      <Text style={styles.recordDetailValue}>{allergy.symptoms}</Text>
                    </View>
                  )}
                  {allergy.severity && (
                    <View style={styles.recordDetailRow}>
                      <Text style={styles.recordDetailLabel}>Severidad:</Text>
                      <View style={styles.severityContainer}>
                        <Text style={styles.recordDetailValue}>{allergy.severity}</Text>
                        <View style={[
                          styles.severityBadge,
                          { backgroundColor: getSeverityBadge(allergy.severity).bgColor }
                        ]}>
                          <Text style={[
                            styles.severityBadgeText,
                            { color: getSeverityBadge(allergy.severity).color }
                          ]}>
                            {getSeverityBadge(allergy.severity).text}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                  {allergy.treatment && (
                    <View style={styles.recordDetailRow}>
                      <Text style={styles.recordDetailLabel}>Tratamiento:</Text>
                      <Text style={styles.recordDetailValue}>{allergy.treatment}</Text>
                    </View>
                  )}
                  {allergy.notes && (
                    <View style={styles.recordDetailRow}>
                      <Text style={styles.recordDetailLabel}>Notas:</Text>
                      <Text style={styles.recordDetailValue}>{allergy.notes}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Deworming Section */}
        {dewormings.length > 0 && (
          <Card style={styles.recordsCard}>
            <Text style={styles.sectionTitle}>💊 Historial de Desparasitación</Text>
            {dewormings.map((deworming) => (
              <View key={deworming.id} style={styles.recordItem}>
                <View style={styles.recordHeader}>
                  {getRecordIcon(deworming.type)}
                  <Text style={styles.recordName}>{deworming.product_name || deworming.name}</Text>
                </View>
                <View style={styles.recordDetails}>
                  <View style={styles.recordDetailRow}>
                    <Text style={styles.recordDetailLabel}>Fecha de aplicación:</Text>
                    <Text style={styles.recordDetailValue}>{formatDate(deworming.application_date)}</Text>
                  </View>
                  {deworming.next_due_date && (
                    <View style={styles.recordDetailRow}>
                      <Text style={styles.recordDetailLabel}>Próxima dosis:</Text>
                      <View style={styles.nextDoseContainer}>
                        <Text style={styles.recordDetailValue}>{formatDate(deworming.next_due_date)}</Text>
                        <View style={styles.pendingBadge}>
                          <Text style={styles.pendingBadgeText}>Pendiente</Text>
                        </View>
                      </View>
                    </View>
                  )}
                  {deworming.veterinarian && (
                    <View style={styles.recordDetailRow}>
                      <Text style={styles.recordDetailLabel}>Veterinario:</Text>
                      <Text style={styles.recordDetailValue}>{deworming.veterinarian}</Text>
                    </View>
                  )}
                  {deworming.notes && (
                    <View style={styles.recordDetailRow}>
                      <Text style={styles.recordDetailLabel}>Notas:</Text>
                      <Text style={styles.recordDetailValue}>{deworming.notes}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Weight History Section */}
        {weightRecords.length > 0 && (
          <Card style={styles.recordsCard}>
            <Text style={styles.sectionTitle}>⚖️ Historial de Peso</Text>
            <View style={styles.weightGrid}>
              {weightRecords.slice(0, 12).map((weight) => (
                <View key={weight.id} style={styles.weightGridItem}>
                  <Text style={styles.weightGridDate}>{formatDate(weight.date)}</Text>
                  <Text style={styles.weightGridValue}>
                    {weight.weight} {weight.weight_unit || 'kg'}
                  </Text>
                  {weight.notes && weight.notes !== 'Peso inicial al registrar la mascota' && (
                    <Text style={styles.weightGridNotes}>{weight.notes}</Text>
                  )}
                </View>
              ))}
            </View>
            {weightRecords.length > 12 && (
              <Text style={styles.moreRecordsText}>
                ... y {weightRecords.length - 12} registros más
              </Text>
            )}
          </Card>
        )}

        {/* Empty sections for completeness */}
        {vaccines.length === 0 && (
          <Card style={styles.emptyCard}>
            <Text style={styles.sectionTitle}>💉 Historial de Vacunación</Text>
            <Text style={styles.emptyText}>No hay vacunas registradas</Text>
          </Card>
        )}

        {illnesses.length === 0 && (
          <Card style={styles.emptyCard}>
            <Text style={styles.sectionTitle}>🏥 Historial de Enfermedades</Text>
            <Text style={styles.emptyText}>No hay enfermedades registradas</Text>
          </Card>
        )}

        {allergies.length === 0 && (
          <Card style={styles.emptyCard}>
            <Text style={styles.sectionTitle}>🚨 Alergias Conocidas</Text>
            <Text style={styles.emptyText}>No hay alergias registradas</Text>
          </Card>
        )}

        {dewormings.length === 0 && (
          <Card style={styles.emptyCard}>
            <Text style={styles.sectionTitle}>💊 Historial de Desparasitación</Text>
            <Text style={styles.emptyText}>No hay desparasitaciones registradas</Text>
          </Card>
        )}

        {weightRecords.length === 0 && (
          <Card style={styles.emptyCard}>
            <Text style={styles.sectionTitle}>⚖️ Historial de Peso</Text>
            <Text style={styles.emptyText}>No hay registros de peso</Text>
          </Card>
        )}

        {/* Footer */}
        <Card style={styles.footer}>
          <View style={styles.footerContent}>
            <Text style={styles.footerTitle}>Historia clínica generada por DogCatiFy</Text>
            <Text style={styles.footerDate}>
              Fecha de generación: {new Date().toLocaleDateString('es-ES')}
            </Text>
            <Text style={styles.footerInfo}>
              Mascota: {pet.name} | Propietario: {owner.display_name}
            </Text>
            <Text style={styles.footerUsage}>Para uso veterinario exclusivamente</Text>
            <Text style={styles.footerDisclaimer}>
              Esta historia clínica contiene información médica confidencial y debe ser tratada con la debida confidencialidad médica.
            </Text>
          </View>
        </Card>
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#2D6A6F',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
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
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  expiredSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#EF4444',
    textAlign: 'center',
  },
  expiredContainer: {
    alignItems: 'center',
    padding: 40,
  },
  expiredIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  expiredTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  expiredText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  expiredInstructions: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    textAlign: 'left',
    lineHeight: 22,
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  petCard: {
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  petHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  petImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginRight: 16,
    borderWidth: 4,
    borderColor: '#2D6A6F',
  },
  petInfo: {
    flex: 1,
  },
  petName: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#2D6A6F',
    marginBottom: 4,
  },
  petBreed: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginBottom: 4,
  },
  petDetails: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  petColor: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  petDetailsGrid: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#2D6A6F',
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
  ownerCard: {
    marginBottom: 16,
  },
  ownerDetailsGrid: {
    gap: 12,
  },
  ownerDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  ownerDetailText: {
    marginLeft: 12,
    flex: 1,
  },
  ownerDetailLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 4,
  },
  ownerDetailValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  notesCard: {
    marginBottom: 16,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  notesContent: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  notesText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#2D6A6F',
    marginBottom: 12,
  },
  recordsCard: {
    marginBottom: 16,
  },
  recordItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recordName: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#2D6A6F',
    marginLeft: 8,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  recordDetails: {
    gap: 8,
  },
  recordDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  recordDetailLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#2D6A6F',
    flex: 1,
  },
  recordDetailValue: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    flex: 2,
    textAlign: 'right',
  },
  nextDoseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 2,
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#92400E',
  },
  severityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 2,
  },
  severityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  severityBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
  },
  weightGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  weightGridItem: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: (width - 80) / 3 - 8, // 3 columns with gaps
    borderWidth: 1,
    borderColor: '#90CAF9',
  },
  weightGridDate: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1565C0',
    marginBottom: 4,
  },
  weightGridValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#0D47A1',
  },
  weightGridNotes: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#1976D2',
    marginTop: 4,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  moreRecordsText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  emptyCard: {
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  footer: {
    marginTop: 20,
    marginBottom: 24,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 3,
    borderTopColor: '#2D6A6F',
  },
  footerContent: {
    alignItems: 'center',
    padding: 20,
  },
  footerTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 8,
  },
  footerDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  footerInfo: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 8,
  },
  footerUsage: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 8,
  },
  footerDisclaimer: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 14,
    fontStyle: 'italic',
  },
});