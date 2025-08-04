import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Calendar, Pill, ChevronDown } from 'lucide-react-native';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Card } from '../../../../components/ui/Card';
import { supabaseClient } from '../../../../lib/supabase';
import { useAuth } from '../../../../contexts/AuthContext';

export default function AddDeworming() {
  const { id, recordId, refresh } = useLocalSearchParams<{ id: string; recordId?: string; refresh?: string }>();
  const params = useLocalSearchParams();
  const { currentUser } = useAuth();
  
  // Pet data
  const [pet, setPet] = useState<any>(null);
  
  // Form data
  const [productName, setProductName] = useState('');
  const [applicationDate, setApplicationDate] = useState(new Date());
  const [nextDueDate, setNextDueDate] = useState<Date | null>(null);
  const [veterinarian, setVeterinarian] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [showApplicationDatePicker, setShowApplicationDatePicker] = useState(false);
  const [showNextDueDatePicker, setShowNextDueDatePicker] = useState(false);

  // Handle return parameters from selection screens
  useEffect(() => {
    // Handle selected dewormer
    if (params.selectedDewormer) {
      try {
        const dewormer = JSON.parse(params.selectedDewormer as string);
        setProductName(dewormer.name);
        console.log('Selected dewormer:', dewormer.name);
      } catch (error) {
        console.error('Error parsing selected dewormer:', error);
      }
    }
    
    // Handle preserved values
    if (params.currentVeterinarian && typeof params.currentVeterinarian === 'string') {
      setVeterinarian(params.currentVeterinarian);
    }
    
    if (params.currentNotes && typeof params.currentNotes === 'string') {
      setNotes(params.currentNotes);
    }
    
    if (params.currentNextDueDate && typeof params.currentNextDueDate === 'string') {
      try {
        setNextDueDate(new Date(params.currentNextDueDate));
      } catch (error) {
        console.error('Error parsing next due date:', error);
      }
    }
  }, [params.selectedDewormer, params.currentVeterinarian, params.currentNotes, params.currentNextDueDate]);

  useEffect(() => {
    fetchPetData();
    
    if (recordId) {
      setIsEditing(true);
      fetchDewormingDetails();
    }
  }, [recordId]);

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

  const handleSelectDewormer = () => {
    router.push({
      pathname: '/pets/health/select-dewormer',
      params: { 
        petId: id,
        species: pet?.species || 'dog',
        returnPath: `/pets/health/deworming/${id}`,
        currentValue: productName,
        // Preserve current form values
        currentVeterinarian: veterinarian,
        currentNotes: notes,
        currentNextDueDate: nextDueDate?.toISOString()
      }
    });
  };

  const fetchDewormingDetails = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('pet_health')
        .select('*')
        .eq('id', recordId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setProductName(data.product_name || '');
        
        // Parse application date
        if (data.application_date) {
          const [day, month, year] = data.application_date.split('/');
          if (day && month && year) {
            setApplicationDate(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
          }
        }
        
        // Parse next due date
        if (data.next_due_date) {
          const [day, month, year] = data.next_due_date.split('/');
          if (day && month && year) {
            setNextDueDate(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
          }
        }
        
        setVeterinarian(data.veterinarian || '');
        setNotes(data.notes || '');
      }
    } catch (error) {
      console.error('Error fetching deworming details:', error);
      Alert.alert('Error', 'No se pudo cargar la información de la desparasitación');
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString();
  };

  const onApplicationDateChange = (event: any, selectedDate?: Date) => {
    setShowApplicationDatePicker(false);
    if (selectedDate) {
      setApplicationDate(selectedDate);
    }
  };

  const onNextDueDateChange = (event: any, selectedDate?: Date) => {
    setShowNextDueDatePicker(false);
    if (selectedDate) {
      setNextDueDate(selectedDate);
    }
  };

  const handleSubmit = async () => {
    if (!productName.trim() || !applicationDate) {
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
        type: 'deworming',
        product_name: productName.trim(),
        application_date: formatDate(applicationDate),
        next_due_date: nextDueDate ? formatDate(nextDueDate) : null,
        veterinarian: veterinarian.trim() || null,
        notes: notes.trim() || null,
        created_at: new Date().toISOString()
      };
      
      let error;
      
      if (isEditing) {
        // Update existing record
        const { error: updateError } = await supabaseClient
          .from('pet_health')
          .update({
            product_name: productName.trim(),
            application_date: formatDate(applicationDate),
            next_due_date: nextDueDate ? formatDate(nextDueDate) : null,
            veterinarian: veterinarian.trim() || null,
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

      // Regenerate medical alerts after adding/updating deworming
      try {
        const { error: alertsError } = await supabaseClient
          .rpc('generate_medical_alerts', { pet_id_param: id });
        
        if (alertsError) {
          console.error('Error generating medical alerts:', alertsError);
        }
      } catch (alertsError) {
        console.error('Error calling generate_medical_alerts:', alertsError);
      }

      Alert.alert('Éxito', 'Desparasitación guardada correctamente', [
        { text: 'OK', onPress: () => router.push({
          pathname: `/pets/${id}`,
          params: { activeTab: 'health' }
        }) }
      ]);
    } catch (error) {
      console.error('Error saving deworming:', error);
      Alert.alert('Error', 'No se pudo registrar la desparasitación');
    } finally {
      setLoading(false);
    }
  };

  const handleBackNavigation = () => {
    router.push({
      pathname: `/pets/${id}`,
      params: { activeTab: 'health' }
    });
  };
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackNavigation} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>{isEditing ? 'Editar Desparasitación' : 'Agregar Desparasitación'}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.formCard}>
          <View style={styles.iconContainer}>
            <Pill size={40} color="#10B981" />
          </View>

          {pet && (
            <View style={styles.petInfoContainer}>
              <Text style={styles.petInfoText}>
                {pet.species === 'dog' ? '🐕' : '🐱'} {pet.name} - {pet.breed}
              </Text>
              <Text style={styles.petInfoSubtext}>
                Desparasitantes para {pet.species === 'dog' ? 'perros' : 'gatos'}
              </Text>
            </View>
          )}

          {/* Product Name - Navigable */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Producto utilizado *</Text>
            <TouchableOpacity 
              style={styles.selectableInput}
              onPress={handleSelectDewormer}
            >
              <Text style={[
                styles.selectableInputText,
                !productName && styles.placeholderText
              ]}>
                {productName || (pet?.species === 'dog' ? 
                  "Seleccionar desparasitante para perros..." : 
                  "Seleccionar desparasitante para gatos..."
                )}
              </Text>
              <ChevronDown size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Application Date */}
          <View style={styles.dateInputContainer}>
            <Text style={styles.dateInputLabel}>Fecha de aplicación *</Text>
            <TouchableOpacity 
              style={styles.dateInput}
              onPress={() => setShowApplicationDatePicker(true)}
            >
              <Calendar size={20} color="#6B7280" />
              <Text style={styles.dateInputText}>
                {formatDate(applicationDate)}
              </Text>
            </TouchableOpacity>
            {showApplicationDatePicker && (
              <DateTimePicker
                value={applicationDate}
                mode="date"
                display="default"
                onChange={onApplicationDateChange}
              />
            )}
          </View>

          {/* Next Due Date */}
          <View style={styles.dateInputContainer}>
            <Text style={styles.dateInputLabel}>Próxima desparasitación</Text>
            <TouchableOpacity 
              style={styles.dateInput}
              onPress={() => setShowNextDueDatePicker(true)}
            >
              <Calendar size={20} color="#6B7280" />
              <Text style={styles.dateInputText}>
                {nextDueDate ? formatDate(nextDueDate) : 'No establecida'}
              </Text>
            </TouchableOpacity>
            {showNextDueDatePicker && (
              <DateTimePicker
                value={nextDueDate || new Date()}
                mode="date"
                display="default"
                onChange={onNextDueDateChange}
              />
            )}
          </View>

          <Input
            label="Veterinario"
            placeholder="Nombre del veterinario o clínica"
            value={veterinarian}
            onChangeText={setVeterinarian}
          />

          <Input
            label="Notas adicionales"
            placeholder="Tipo de parásitos, reacciones, etc."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />

          <Button
            title={isEditing ? "Actualizar Desparasitación" : "Guardar Desparasitación"}
            onPress={handleSubmit}
            loading={loading}
            size="large"
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
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 6,
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