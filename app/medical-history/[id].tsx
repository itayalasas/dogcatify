import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Image, Platform, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Download, ArrowLeft, Calendar, Scale, Syringe, Heart, TriangleAlert as AlertTriangle, Pill } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { supabaseClient } from '../../lib/supabase';

export default function MedicalHistoryView() {
  const { id, pdf } = useLocalSearchParams<{ id: string; pdf?: string }>();
  const { id, pdf, html } = useLocalSearchParams<{ id: string; pdf?: string; html?: string }>();
  const [pet, setPet] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      if (html) {
        // If HTML URL is provided, fetch and display it
        fetchHTMLContent();
      } else {
        // Otherwise fetch from database
        fetchMedicalHistory();
      }
    }
  }, [id, html]);

  const fetchHTMLContent = async () => {
    try {
      if (html) {
        // Fetch the HTML content from the provided URL
        const response = await fetch(decodeURIComponent(html));
        if (response.ok) {
          const htmlContent = await response.text();
          // For now, we'll still fetch the database data for the React Native view
          await fetchMedicalHistory();
        } else {
          throw new Error('No se pudo cargar el contenido HTML');
        }
      }
    } catch (error) {
      console.error('Error fetching HTML content:', error);
      // Fallback to database fetch
      await fetchMedicalHistory();
    }
  };

  const fetchMedicalHistory = async () => {
    try {
      // Fetch pet data
      const { data: petData, error: petError } = await supabaseClient
        .from('pets')
        .select('*')
        .eq('id', id)
        .single();

      if (petError) throw petError;

      // Fetch owner data
      const { data: ownerData, error: ownerError } = await supabaseClient
        .from('profiles')
        .select('display_name, email, phone')
        .eq('id', petData.owner_id)
        .single();

      if (ownerError) throw ownerError;

      // Fetch medical records
      const { data: recordsData, error: recordsError } = await supabaseClient
        .from('pet_health')
        .select('*')
        .eq('pet_id', id)
        .order('created_at', { ascending: false });

      if (recordsError) throw recordsError;

      setPet(petData);
      setOwner(ownerData);
      setMedicalRecords(recordsData || []);
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
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Historia clínica no encontrada'}</Text>
          <Button title="Volver" onPress={() => router.back()} />
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
        <Text style={styles.title}>Historia Clínica Veterinaria</Text>
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
            </View>
          </View>
          
          <View style={styles.petStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Edad:</Text>
              <Text style={styles.statValue}>{formatAge(pet)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Peso:</Text>
              <Text style={styles.statValue}>{formatWeight(pet)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Estado:</Text>
              <Text style={styles.statValue}>
                {pet.is_neutered ? 'Castrado' : 'Entero'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Owner Information */}
        <Card style={styles.ownerCard}>
          <Text style={styles.sectionTitle}>Información del Propietario</Text>
          <Text style={styles.ownerName}>{owner.display_name}</Text>
          <Text style={styles.ownerContact}>{owner.email}</Text>
          {owner.phone && (
            <Text style={styles.ownerContact}>{owner.phone}</Text>
          )}
        </Card>

        {/* Medical Records Sections */}
        {vaccines.length > 0 && (
          <Card style={styles.recordsCard}>
            <Text style={styles.sectionTitle}>💉 Vacunas</Text>
            {vaccines.map((vaccine) => (
              <View key={vaccine.id} style={styles.recordItem}>
                <View style={styles.recordHeader}>
                  {getRecordIcon(vaccine.type)}
                  <Text style={styles.recordName}>{vaccine.name}</Text>
                </View>
                <Text style={styles.recordDate}>
                  Aplicada: {formatDate(vaccine.application_date)}
                </Text>
                {vaccine.next_due_date && (
                  <Text style={styles.recordNextDate}>
                    Próxima: {formatDate(vaccine.next_due_date)}
                  </Text>
                )}
                {vaccine.veterinarian && (
                  <Text style={styles.recordVet}>
                    Veterinario: {vaccine.veterinarian}
                  </Text>
                )}
              </View>
            ))}
          </Card>
        )}

        {illnesses.length > 0 && (
          <Card style={styles.recordsCard}>
            <Text style={styles.sectionTitle}>🏥 Enfermedades</Text>
            {illnesses.map((illness) => (
              <View key={illness.id} style={styles.recordItem}>
                <View style={styles.recordHeader}>
                  {getRecordIcon(illness.type)}
                  <Text style={styles.recordName}>{illness.name}</Text>
                </View>
                <Text style={styles.recordDate}>
                  Diagnóstico: {formatDate(illness.diagnosis_date)}
                </Text>
                {illness.treatment && (
                  <Text style={styles.recordTreatment}>
                    Tratamiento: {illness.treatment}
                  </Text>
                )}
                {illness.veterinarian && (
                  <Text style={styles.recordVet}>
                    Veterinario: {illness.veterinarian}
                  </Text>
                )}
              </View>
            ))}
          </Card>
        )}

        {allergies.length > 0 && (
          <Card style={styles.recordsCard}>
            <Text style={styles.sectionTitle}>🚨 Alergias</Text>
            {allergies.map((allergy) => (
              <View key={allergy.id} style={styles.recordItem}>
                <View style={styles.recordHeader}>
                  {getRecordIcon(allergy.type)}
                  <Text style={styles.recordName}>{allergy.name}</Text>
                </View>
                {allergy.symptoms && (
                  <Text style={styles.recordSymptoms}>
                    Síntomas: {allergy.symptoms}
                  </Text>
                )}
                {allergy.severity && (
                  <Text style={styles.recordSeverity}>
                    Severidad: {allergy.severity}
                  </Text>
                )}
              </View>
            ))}
          </Card>
        )}

        {dewormings.length > 0 && (
          <Card style={styles.recordsCard}>
            <Text style={styles.sectionTitle}>💊 Desparasitaciones</Text>
            {dewormings.map((deworming) => (
              <View key={deworming.id} style={styles.recordItem}>
                <View style={styles.recordHeader}>
                  {getRecordIcon(deworming.type)}
                  <Text style={styles.recordName}>{deworming.name}</Text>
                </View>
                <Text style={styles.recordDate}>
                  Aplicada: {formatDate(deworming.application_date)}
                </Text>
                {deworming.next_due_date && (
                  <Text style={styles.recordNextDate}>
                    Próxima: {formatDate(deworming.next_due_date)}
                  </Text>
                )}
              </View>
            ))}
          </Card>
        )}

        {weightRecords.length > 0 && (
          <Card style={styles.recordsCard}>
            <Text style={styles.sectionTitle}>⚖️ Historial de Peso</Text>
            {weightRecords.slice(0, 10).map((weight) => (
              <View key={weight.id} style={styles.weightItem}>
                <Text style={styles.weightDate}>{formatDate(weight.date)}</Text>
                <Text style={styles.weightValue}>
                  {weight.weight} {weight.weight_unit || 'kg'}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Historia clínica generada por DogCatiFy
          </Text>
          <Text style={styles.footerDate}>
            {new Date().toLocaleDateString('es-ES')}
          </Text>
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
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
  petCard: {
    marginBottom: 16,
  },
  petHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  petImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  petInfo: {
    flex: 1,
  },
  petName: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  petBreed: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  petDetails: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  petStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  ownerCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  ownerName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  ownerContact: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 2,
  },
  recordsCard: {
    marginBottom: 16,
  },
  recordItem: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginLeft: 8,
  },
  recordDate: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  recordNextDate: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#3B82F6',
    marginBottom: 4,
  },
  recordVet: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  recordTreatment: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  recordSymptoms: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  recordSeverity: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  weightItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  weightDate: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  weightValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginBottom: 4,
  },
  footerDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
});