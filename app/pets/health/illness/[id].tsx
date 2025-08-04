import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert, TextInput, Modal } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Calendar, Heart, Search, ChevronDown } from 'lucide-react-native';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Card } from '../../../../components/ui/Card';
import { supabaseClient } from '../../../../lib/supabase';
import { useAuth } from '../../../../contexts/AuthContext';

export default function AddIllness() {
  const { id, recordId, refresh } = useLocalSearchParams<{ id: string; recordId?: string; refresh?: string }>();
  const { currentUser } = useAuth();
  
  // Pet data
  const [pet, setPet] = useState<any>(null);
  
  // Form data
  const [illnessName, setIllnessName] = useState('');
  const [illnessQuery, setIllnessQuery] = useState('');
  const [diagnosisDate, setDiagnosisDate] = useState(new Date());
  const [treatment, setTreatment] = useState('');
  const [treatmentQuery, setTreatmentQuery] = useState('');
  const [veterinarian, setVeterinarian] = useState('');
  const [veterinarianQuery, setVeterinarianQuery] = useState('');
  const [status, setStatus] = useState('active');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Database data
  const [medicalConditions, setMedicalConditions] = useState<any[]>([]);
  const [filteredConditions, setFilteredConditions] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [filteredTreatments, setFilteredTreatments] = useState<any[]>([]);
  const [veterinaryClinics, setVeterinaryClinics] = useState<any[]>([]);
  const [filteredClinics, setFilteredClinics] = useState<any[]>([]);
  
  // UI state
  const [showConditionSuggestions, setShowConditionSuggestions] = useState(false);
  const [showTreatmentSuggestions, setShowTreatmentSuggestions] = useState(false);
  const [showClinicSuggestions, setShowClinicSuggestions] = useState(false);
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [showClinicModal, setShowClinicModal] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState<any>(null);
  
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    fetchPetData();
    fetchMedicalData();
    
    if (recordId) {
      setIsEditing(true);
      fetchIllnessDetails();
    }
  }, [recordId]);

  // Add separate useEffect to ensure medical data is loaded
  useEffect(() => {
    console.log('=== MEDICAL DATA LOADING ===');
    console.log('Loading medical conditions, treatments, and clinics...');
    fetchMedicalData();
  }, []);
  useEffect(() => {
    // Filter conditions based on search query
    if (illnessQuery.trim()) {
      console.log('Filtering conditions with query:', illnessQuery);
      console.log('Available conditions:', medicalConditions.length);
      const filtered = medicalConditions.filter(condition =>
        condition.name.toLowerCase().includes(illnessQuery.toLowerCase()) ||
        condition.description?.toLowerCase().includes(illnessQuery.toLowerCase())
      );
      console.log('Filtered conditions:', filtered.length);
      setFilteredConditions(filtered);
    } else {
      setFilteredConditions(medicalConditions);
    }
  }, [illnessQuery, medicalConditions]);

  useEffect(() => {
    // Filter treatments based on search query and selected condition
    if (treatmentQuery.trim()) {
      let filtered = treatments;
      
      // If a condition is selected, filter treatments for that condition
      if (selectedCondition) {
        filtered = treatments.filter(treatment => 
          treatment.condition_id === selectedCondition.id
        );
      }
      
      // Then filter by search query
      filtered = filtered.filter(treatment =>
        treatment.name.toLowerCase().includes(treatmentQuery.toLowerCase()) ||
        treatment.description?.toLowerCase().includes(treatmentQuery.toLowerCase())
      );
      
      setFilteredTreatments(filtered);
      setShowTreatmentSuggestions(true);
    } else {
      setFilteredTreatments(treatments);
      setShowTreatmentSuggestions(false);
    }
  }, [treatmentQuery, treatments, selectedCondition]);

  useEffect(() => {
    // Filter veterinary clinics based on search query
    if (veterinarianQuery.trim()) {
      const filtered = veterinaryClinics.filter(clinic =>
        clinic.name.toLowerCase().includes(veterinarianQuery.toLowerCase()) ||
        clinic.specialties?.some((specialty: string) => 
          specialty.toLowerCase().includes(veterinarianQuery.toLowerCase())
        )
      );
      setFilteredClinics(filtered);
      setShowClinicSuggestions(true);
    } else {
      setFilteredClinics(veterinaryClinics);
      setShowClinicSuggestions(false);
    }
  }, [veterinarianQuery, veterinaryClinics]);

  const fetchPetData = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('pets')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      setPet(data);
    } catch (error) {
      console.error('Error fetching pet data:', error);
    }
  };

  const fetchMedicalData = async () => {
    try {
      console.log('🔄 Starting to fetch medical data...');
      
      // Fetch medical conditions
      console.log('📋 Fetching medical conditions...');
      const { data: conditionsData, error: conditionsError } = await supabaseClient
        .from('medical_conditions')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (conditionsError) {
        console.error('❌ Error fetching conditions:', conditionsError);
        throw conditionsError;
      }
      console.log('✅ Medical conditions loaded:', conditionsData?.length || 0);
      setMedicalConditions(conditionsData || []);
      
      // Fetch treatments
      console.log('💊 Fetching medical treatments...');
      const { data: treatmentsData, error: treatmentsError } = await supabaseClient
        .from('medical_treatments')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (treatmentsError) {
        console.error('❌ Error fetching treatments:', treatmentsError);
        throw treatmentsError;
      }
      console.log('✅ Medical treatments loaded:', treatmentsData?.length || 0);
      setTreatments(treatmentsData || []);
      
      // Fetch veterinary clinics
      console.log('🏥 Fetching veterinary clinics...');
      const { data: clinicsData, error: clinicsError } = await supabaseClient
        .from('veterinary_clinics')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (clinicsError) {
        console.error('❌ Error fetching clinics:', clinicsError);
        throw clinicsError;
      }
      console.log('✅ Veterinary clinics loaded:', clinicsData?.length || 0);
      setVeterinaryClinics(clinicsData || []);
      
      console.log('🎉 All medical data loaded successfully!');
    } catch (error) {
      console.error('❌ Error fetching medical data:', error);
      
      // Show user-friendly error
      Alert.alert(
        'Error cargando datos',
        'No se pudieron cargar las enfermedades y tratamientos. Puedes escribir manualmente o intentar recargar la pantalla.',
        [{ text: 'Entendido' }]
      );
    }
  };
  const fetchIllnessDetails = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('pet_health')
        .select('*')
        .eq('id', recordId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setIllnessName(data.name || '');
        setIllnessQuery(data.name || '');
        
        // Parse diagnosis date
        if (data.diagnosis_date) {
          const [day, month, year] = data.diagnosis_date.split('/');
          if (day && month && year) {
            setDiagnosisDate(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
          }
        }
        
        setTreatment(data.treatment || '');
        setTreatmentQuery(data.treatment || '');
        setVeterinarian(data.veterinarian || '');
        setVeterinarianQuery(data.veterinarian || '');
        setStatus(data.status || 'active');
        setNotes(data.notes || '');
      }
    } catch (error) {
      console.error('Error fetching illness details:', error);
      Alert.alert('Error', 'No se pudo cargar la información de la enfermedad');
    }
  };

  const handleConditionInputChange = (text: string) => {
    setIllnessQuery(text);
    setIllnessName(text);
  };

  const handleSelectCondition = () => {
    router.push({
      pathname: '/pets/health/select-condition',
      params: { 
        petId: id,
        species: pet?.species || 'dog',
        returnPath: `/pets/health/illness/${id}`,
        currentValue: illnessName
      }
    });
  };

  const handleSelectTreatment = () => {
    router.push({
      pathname: '/pets/health/select-treatment',
      params: { 
        petId: id,
        conditionId: selectedCondition?.id || '',
        returnPath: `/pets/health/illness/${id}`,
        currentValue: treatment
      }
    });
  };

  const handleSelectVeterinarian = () => {
    router.push({
      pathname: '/pets/health/select-veterinarian',
      params: { 
        petId: id,
        returnPath: `/pets/health/illness/${id}`,
        currentValue: veterinarian
      }
    });
  };

  const loadTreatmentsForCondition = async (conditionId: string) => {
    try {
      const { data, error } = await supabaseClient
        .from('medical_treatments')
        .select('*')
        .eq('condition_id', conditionId)
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      // Update treatments list with condition-specific treatments
      const conditionTreatments = data || [];
      setFilteredTreatments(conditionTreatments);
    } catch (error) {
      console.error('Error loading treatments for condition:', error);
    }
  };

  const getFilteredConditionsBySpecies = () => {
    if (!pet) return filteredConditions;
    
    console.log('🔍 Filtering conditions by species:', pet.species);
    console.log('Available conditions before filter:', filteredConditions.length);
    
    const speciesFiltered = filteredConditions.filter(condition => 
      condition.species === pet.species || condition.species === 'both'
    );
    
    console.log('✅ Conditions after species filter:', speciesFiltered.length);
    console.log('Sample conditions:', speciesFiltered.slice(0, 3).map(c => c.name));
    
    return speciesFiltered;
  };
  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDiagnosisDate(selectedDate);
    }
  };

  const handleSubmit = async () => {
    if (!illnessName.trim()) {
      Alert.alert('Error', 'Por favor completa los campos obligatorios');
      return;
    }

    if (!currentUser) {
      Alert.alert('Error', 'Usuario no autenticado');
      return;
    }

    setLoading(true);
    try {
      const healthData = {
        pet_id: id,
        user_id: currentUser.id,
        type: 'illness',
        name: illnessName.trim(),
        diagnosis_date: formatDate(diagnosisDate),
        treatment: treatment.trim() || null,
        veterinarian: veterinarian.trim() || null,
        status: status,
        notes: notes.trim() || null,
        created_at: new Date().toISOString()
      };
      
      let error;
      
      if (isEditing) {
        // Update existing record
        const { error: updateError } = await supabaseClient
          .from('pet_health')
          .update({
            name: illnessName.trim(),
            diagnosis_date: formatDate(diagnosisDate),
            treatment: treatment.trim() || null,
            veterinarian: veterinarian.trim() || null,
            status: status,
            notes: notes.trim() || null
          })
          .eq('id', recordId);
          
        error = updateError;
      } else {
        // Insert new record
        const { error: insertError } = await supabaseClient.from('pet_health').insert(healthData);
        error = insertError;
      }

      if (error) {
        throw error;
      }

      Alert.alert('Éxito', isEditing ? 'Enfermedad actualizada correctamente' : 'Enfermedad registrada correctamente', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error saving illness:', error);
      Alert.alert('Error', 'No se pudo registrar la enfermedad');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>{isEditing ? 'Editar Enfermedad' : 'Agregar Enfermedad'}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.formCard}>
          <View style={styles.iconContainer}>
            <Heart size={40} color="#EF4444" />
          </View>

          {pet && (
            <View style={styles.petInfoContainer}>
              <Text style={styles.petInfoText}>
                {pet.species === 'dog' ? '🐕' : '🐱'} {pet.name} - {pet.breed}
              </Text>
              <Text style={styles.petInfoSubtext}>
                Enfermedades específicas para {pet.species === 'dog' ? 'perros' : 'gatos'}
              </Text>
            </View>
          )}

          {/* Illness Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nombre de la enfermedad *</Text>
            <TouchableOpacity 
              style={styles.selectableInput}
              onPress={handleSelectCondition}
            >
              <Text style={[
                styles.selectableInputText,
                !illnessName && styles.placeholderText
              ]}>
                {illnessName || (pet?.species === 'dog' ? 
                  "Ej: Parvovirus, Otitis, Dermatitis..." : 
                  "Ej: Rinotraqueítis, Cistitis, Calicivirus..."
                )}
              </Text>
              <ChevronDown size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
              <TouchableOpacity 
                style={styles.dropdownButton}
                onPress={() => setShowConditionModal(true)}
              >
                <ChevronDown size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Diagnosis Date */}
          <View style={styles.dateInputContainer}>
            <Text style={styles.dateInputLabel}>Fecha de diagnóstico *</Text>
            <TouchableOpacity 
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
            >
              <Calendar size={20} color="#6B7280" />
              <Text style={styles.dateInputText}>
                {formatDate(diagnosisDate)}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={diagnosisDate}
                mode="date"
                display="default"
                onChange={onDateChange}
              />
            )}
          </View>

          {/* Treatment with Autocomplete */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tratamiento</Text>
            <View style={styles.searchInputContainer}>
              <Search size={20} color="#6B7280" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Medicamentos, terapias, cirugías..."
                value={treatmentQuery}
                onChangeText={(text) => {
                  setTreatmentQuery(text);
                  setTreatment(text);
                  if (text.trim().length > 0) {
                    setShowTreatmentModal(true);
                  } else {
                    setShowTreatmentModal(false);
                  }
                }}
              />
              <TouchableOpacity 
                style={styles.dropdownButton}
                onPress={() => setShowTreatmentModal(true)}
              >
                <ChevronDown size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Veterinarian with Autocomplete */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Veterinario</Text>
            <View style={styles.searchInputContainer}>
              <Search size={20} color="#6B7280" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Nombre del veterinario o clínica"
                value={veterinarianQuery}
                onChangeText={(text) => {
                  setVeterinarianQuery(text);
                  setVeterinarian(text);
                  if (text.trim().length > 0) {
                    setShowClinicModal(true);
                  } else {
                    setShowClinicModal(false);
                  }
                }}
              />
              <TouchableOpacity 
                style={styles.dropdownButton}
                onPress={() => setShowClinicModal(true)}
              >
                <ChevronDown size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          <Input
            label="Notas adicionales"
            placeholder="Síntomas, evolución, observaciones..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />

          <Button
            title={isEditing ? 'Actualizar Enfermedad' : 'Registrar Enfermedad'}
            onPress={handleSubmit}
            loading={loading}
            style={{ marginTop: 24 }}
          />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  formCard: {
    margin: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  petInfoContainer: {
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  petInfoText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#0369A1',
    marginBottom: 4,
  },
  petInfoSubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#0369A1',
  },
  autocompleteContainer: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 6,
  },
  searchInputContainer: {
    position: 'relative',
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingLeft: 45,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    minHeight: 44,
    borderWidth: 1.5,
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: 12,
  },
  dropdownButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalList: {
    maxHeight: 400,
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalItemTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  modalItemCategory: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#2563EB',
    marginBottom: 4,
  },
  modalItemDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 8,
  },
  modalCloseButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  modalCloseText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  
  // Badge styles
  chronicBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  chronicBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#92400E',
  },
  treatmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  prescriptionBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  prescriptionBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#991B1B',
  },
  costRange: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#059669',
    fontWeight: '500',
  },
  emergencyBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  emergencyBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#991B1B',
  },
  clinicRating: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#F59E0B',
    marginTop: 6,
  },
  selectableInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 50,
  },
  selectableInputText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    flex: 1,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  dateInputContainer: {
    marginBottom: 14,
  },
  dateInputLabel: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 6,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    minHeight: 44,
  },
  dateInputText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    marginLeft: 10,
  },
});