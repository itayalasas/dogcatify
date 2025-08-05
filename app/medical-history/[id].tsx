import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert, Modal, TextInput, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Calendar, Plus, Syringe, Heart, TriangleAlert as AlertTriangle, Pill, Scale, User, Save, X } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { verifyMedicalHistoryToken } from '../../utils/medicalHistoryTokens';

interface MedicalRecord {
  id: string;
  type: string;
  name?: string;
  product_name?: string;
  application_date?: string;
  diagnosis_date?: string;
  next_due_date?: string;
  symptoms?: string;
  severity?: string;
  treatment?: string;
  veterinarian?: string;
  weight?: number;
  weight_unit?: string;
  date?: string;
  status?: string;
  notes?: string;
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

export default function MedicalHistoryShared() {
  const { id, token } = useLocalSearchParams<{ id: string; token?: string }>();
  
  // Data state
  const [pet, setPet] = useState<Pet | null>(null);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasValidToken, setHasValidToken] = useState(false);
  
  // Form state
  const [showAddForm, setShowAddForm] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      verifyTokenAndFetchData();
    }
  }, [id, token]);

  const verifyTokenAndFetchData = async () => {
    try {
      console.log('Token provided, verifying access...');
      
      if (token) {
        console.log('Verifying token:', token.substring(0, 10) + '...');
        const tokenResult = await verifyMedicalHistoryToken(token);
        console.log('Token verification result:', tokenResult);
        
        if (!tokenResult.success) {
          Alert.alert('Acceso denegado', tokenResult.error || 'Token inválido');
          return;
        }
        
        setHasValidToken(true);
        console.log('Token valid, fetching medical history...');
      }

      // Fetch data via Edge Function
      await fetchMedicalHistoryViaEdgeFunction();
      
    } catch (error) {
      console.error('Error verifying token and fetching data:', error);
      Alert.alert('Error', 'No se pudo cargar la historia clínica');
    } finally {
      setLoading(false);
    }
  };

  const fetchMedicalHistoryViaEdgeFunction = async () => {
    try {
      console.log('=== CALLING EDGE FUNCTION FOR ALL DATA ===');
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/medical-history-data/${id}${token ? `?token=${token}` : ''}`;
      console.log('Edge Function URL:', edgeFunctionUrl);
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
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
      
      const data = await response.json();
      console.log('Edge Function returned data:', {
        petName: data.pet?.name,
        ownerName: data.owner?.display_name,
        totalRecords: data.medicalRecords?.length || 0,
        recordCounts: data.recordCounts
      });
      
      if (data.success) {
        setPet(data.pet);
        setOwner(data.owner);
        setMedicalRecords(data.medicalRecords || []);
        console.log('=== DATA SET SUCCESSFULLY ===');
      } else {
        throw new Error(data.error || 'Failed to fetch data');
      }
      
    } catch (error) {
      console.error('Error calling Edge Function:', error);
      Alert.alert('Error', 'No se pudo cargar la información médica');
    }
  };

  const handleAddRecord = (recordType: string) => {
    if (!hasValidToken) {
      Alert.alert('Acceso requerido', 'Se necesita un enlace válido para agregar registros');
      return;
    }
    
    // Initialize form data based on record type
    const initialData = {
      type: recordType,
      date: new Date(),
      nextDueDate: null,
    };
    
    setFormData(initialData);
    setShowAddForm(recordType);
  };

  const handleSaveRecord = async () => {
    try {
      setSaving(true);
      
      // Validate required fields based on type
      if (!validateFormData()) {
        return;
      }
      
      // Prepare record data
      const recordData = prepareRecordData();
      
      console.log('Saving medical record:', recordData);
      
      // Call Edge Function to save
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/save-medical-record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          recordData,
          token
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error saving record');
      }
      
      const result = await response.json();
      
      if (result.success) {
        Alert.alert('Éxito', 'Registro médico guardado correctamente');
        setShowAddForm(null);
        setFormData({});
        
        // Refresh data
        await fetchMedicalHistoryViaEdgeFunction();
      } else {
        throw new Error(result.error || 'Error saving record');
      }
      
    } catch (error) {
      console.error('Error saving record:', error);
      Alert.alert('Error', `No se pudo guardar el registro: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const validateFormData = (): boolean => {
    switch (formData.type) {
      case 'vaccine':
        if (!formData.name || !formData.date) {
          Alert.alert('Error', 'Nombre de vacuna y fecha son obligatorios');
          return false;
        }
        break;
      case 'illness':
        if (!formData.name || !formData.date) {
          Alert.alert('Error', 'Nombre de enfermedad y fecha son obligatorios');
          return false;
        }
        break;
      case 'allergy':
        if (!formData.name || !formData.symptoms) {
          Alert.alert('Error', 'Alérgeno y síntomas son obligatorios');
          return false;
        }
        break;
      case 'deworming':
        if (!formData.productName || !formData.date) {
          Alert.alert('Error', 'Producto y fecha son obligatorios');
          return false;
        }
        break;
      case 'weight':
        if (!formData.weight || !formData.date) {
          Alert.alert('Error', 'Peso y fecha son obligatorios');
          return false;
        }
        break;
    }
    return true;
  };

  const prepareRecordData = () => {
    const baseData = {
      pet_id: id,
      user_id: pet?.owner_id || '', // Will be corrected by Edge Function
      type: formData.type,
      created_at: new Date().toISOString(),
    };

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    };

    switch (formData.type) {
      case 'vaccine':
        return {
          ...baseData,
          name: formData.name,
          application_date: formatDate(formData.date),
          next_due_date: formData.nextDueDate ? formatDate(formData.nextDueDate) : null,
          veterinarian: formData.veterinarian || null,
          notes: formData.notes || null,
        };
      
      case 'illness':
        return {
          ...baseData,
          name: formData.name,
          diagnosis_date: formatDate(formData.date),
          symptoms: formData.symptoms || null,
          severity: formData.severity || null,
          treatment: formData.treatment || null,
          veterinarian: formData.veterinarian || null,
          status: formData.status || 'active',
          notes: formData.notes || null,
        };
      
      case 'allergy':
        return {
          ...baseData,
          name: formData.name,
          symptoms: formData.symptoms,
          severity: formData.severity || null,
          treatment: formData.treatment || null,
          notes: formData.notes || null,
        };
      
      case 'deworming':
        return {
          ...baseData,
          product_name: formData.productName,
          application_date: formatDate(formData.date),
          next_due_date: formData.nextDueDate ? formatDate(formData.nextDueDate) : null,
          veterinarian: formData.veterinarian || null,
          notes: formData.notes || null,
        };
      
      case 'weight':
        return {
          ...baseData,
          weight: parseFloat(formData.weight),
          weight_unit: formData.weightUnit || 'kg',
          date: formatDate(formData.date),
          notes: formData.notes || null,
        };
      
      default:
        return baseData;
    }
  };

  const handleDateChange = (field: string, event: any, selectedDate?: Date) => {
    setShowDatePicker(null);
    if (selectedDate) {
      setFormData(prev => ({ ...prev, [field]: selectedDate }));
    }
  };

  const formatAge = (pet: Pet): string => {
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

  const formatWeight = (pet: Pet): string => {
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

  const renderAddForm = () => {
    if (!showAddForm) return null;

    const getFormTitle = () => {
      switch (showAddForm) {
        case 'vaccine': return '💉 Agregar Vacuna';
        case 'illness': return '🏥 Agregar Enfermedad';
        case 'allergy': return '🚨 Agregar Alergia';
        case 'deworming': return '💊 Agregar Desparasitación';
        case 'weight': return '⚖️ Agregar Peso';
        default: return 'Agregar Registro';
      }
    };

    return (
      <Modal
        visible={!!showAddForm}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddForm(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{getFormTitle()}</Text>
              <TouchableOpacity onPress={() => setShowAddForm(null)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
              {showAddForm === 'vaccine' && (
                <>
                  <Input
                    label="Nombre de la vacuna *"
                    placeholder="Ej: DHPP, Rabia, Triple felina..."
                    value={formData.name || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                  />
                  
                  <View style={styles.dateInputContainer}>
                    <Text style={styles.dateLabel}>Fecha de aplicación *</Text>
                    <TouchableOpacity 
                      style={styles.dateInput}
                      onPress={() => setShowDatePicker('date')}
                    >
                      <Calendar size={20} color="#6B7280" />
                      <Text style={styles.dateText}>
                        {formData.date ? formData.date.toLocaleDateString() : 'Seleccionar fecha'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.dateInputContainer}>
                    <Text style={styles.dateLabel}>Próxima dosis</Text>
                    <TouchableOpacity 
                      style={styles.dateInput}
                      onPress={() => setShowDatePicker('nextDueDate')}
                    >
                      <Calendar size={20} color="#6B7280" />
                      <Text style={styles.dateText}>
                        {formData.nextDueDate ? formData.nextDueDate.toLocaleDateString() : 'Seleccionar fecha'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Input
                    label="Veterinario"
                    placeholder="Nombre del veterinario o clínica"
                    value={formData.veterinarian || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, veterinarian: text }))}
                  />

                  <Input
                    label="Notas"
                    placeholder="Observaciones, reacciones, etc."
                    value={formData.notes || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                    multiline
                    numberOfLines={3}
                  />
                </>
              )}

              {showAddForm === 'illness' && (
                <>
                  <Input
                    label="Nombre de la enfermedad *"
                    placeholder="Ej: Gastroenteritis, Dermatitis..."
                    value={formData.name || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                  />
                  
                  <View style={styles.dateInputContainer}>
                    <Text style={styles.dateLabel}>Fecha de diagnóstico *</Text>
                    <TouchableOpacity 
                      style={styles.dateInput}
                      onPress={() => setShowDatePicker('date')}
                    >
                      <Calendar size={20} color="#6B7280" />
                      <Text style={styles.dateText}>
                        {formData.date ? formData.date.toLocaleDateString() : 'Seleccionar fecha'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Input
                    label="Síntomas"
                    placeholder="Síntomas observados..."
                    value={formData.symptoms || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, symptoms: text }))}
                    multiline
                    numberOfLines={2}
                  />

                  <Input
                    label="Severidad"
                    placeholder="Leve, Moderada, Severa..."
                    value={formData.severity || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, severity: text }))}
                  />

                  <Input
                    label="Tratamiento"
                    placeholder="Medicamentos, terapias..."
                    value={formData.treatment || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, treatment: text }))}
                    multiline
                    numberOfLines={2}
                  />

                  <Input
                    label="Veterinario"
                    placeholder="Nombre del veterinario o clínica"
                    value={formData.veterinarian || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, veterinarian: text }))}
                  />

                  <Input
                    label="Notas"
                    placeholder="Observaciones adicionales..."
                    value={formData.notes || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                    multiline
                    numberOfLines={3}
                  />
                </>
              )}

              {showAddForm === 'allergy' && (
                <>
                  <Input
                    label="Alérgeno *"
                    placeholder="Ej: Pollo, Polen, Pulgas..."
                    value={formData.name || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                  />

                  <Input
                    label="Síntomas *"
                    placeholder="Picazón, enrojecimiento, vómitos..."
                    value={formData.symptoms || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, symptoms: text }))}
                    multiline
                    numberOfLines={2}
                  />

                  <Input
                    label="Severidad"
                    placeholder="Leve, Moderada, Severa..."
                    value={formData.severity || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, severity: text }))}
                  />

                  <Input
                    label="Tratamiento"
                    placeholder="Medicamentos, dieta especial..."
                    value={formData.treatment || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, treatment: text }))}
                    multiline
                    numberOfLines={2}
                  />

                  <Input
                    label="Notas"
                    placeholder="Observaciones adicionales..."
                    value={formData.notes || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                    multiline
                    numberOfLines={3}
                  />
                </>
              )}

              {showAddForm === 'deworming' && (
                <>
                  <Input
                    label="Producto utilizado *"
                    placeholder="Ej: Drontal, Milbemax..."
                    value={formData.productName || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, productName: text }))}
                  />
                  
                  <View style={styles.dateInputContainer}>
                    <Text style={styles.dateLabel}>Fecha de aplicación *</Text>
                    <TouchableOpacity 
                      style={styles.dateInput}
                      onPress={() => setShowDatePicker('date')}
                    >
                      <Calendar size={20} color="#6B7280" />
                      <Text style={styles.dateText}>
                        {formData.date ? formData.date.toLocaleDateString() : 'Seleccionar fecha'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.dateInputContainer}>
                    <Text style={styles.dateLabel}>Próxima desparasitación</Text>
                    <TouchableOpacity 
                      style={styles.dateInput}
                      onPress={() => setShowDatePicker('nextDueDate')}
                    >
                      <Calendar size={20} color="#6B7280" />
                      <Text style={styles.dateText}>
                        {formData.nextDueDate ? formData.nextDueDate.toLocaleDateString() : 'Seleccionar fecha'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Input
                    label="Veterinario"
                    placeholder="Nombre del veterinario o clínica"
                    value={formData.veterinarian || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, veterinarian: text }))}
                  />

                  <Input
                    label="Notas"
                    placeholder="Tipo de parásitos, reacciones..."
                    value={formData.notes || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                    multiline
                    numberOfLines={3}
                  />
                </>
              )}

              {showAddForm === 'weight' && (
                <>
                  <View style={styles.weightInputRow}>
                    <View style={styles.weightInput}>
                      <Input
                        label="Peso *"
                        placeholder="0.0"
                        value={formData.weight || ''}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, weight: text }))}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.unitSelector}>
                      <Text style={styles.unitLabel}>Unidad</Text>
                      <View style={styles.unitButtons}>
                        <TouchableOpacity
                          style={[styles.unitButton, (formData.weightUnit || 'kg') === 'kg' && styles.selectedUnitButton]}
                          onPress={() => setFormData(prev => ({ ...prev, weightUnit: 'kg' }))}
                        >
                          <Text style={[styles.unitButtonText, (formData.weightUnit || 'kg') === 'kg' && styles.selectedUnitButtonText]}>kg</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.unitButton, formData.weightUnit === 'lb' && styles.selectedUnitButton]}
                          onPress={() => setFormData(prev => ({ ...prev, weightUnit: 'lb' }))}
                        >
                          <Text style={[styles.unitButtonText, formData.weightUnit === 'lb' && styles.selectedUnitButtonText]}>lb</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  <View style={styles.dateInputContainer}>
                    <Text style={styles.dateLabel}>Fecha *</Text>
                    <TouchableOpacity 
                      style={styles.dateInput}
                      onPress={() => setShowDatePicker('date')}
                    >
                      <Calendar size={20} color="#6B7280" />
                      <Text style={styles.dateText}>
                        {formData.date ? formData.date.toLocaleDateString() : 'Seleccionar fecha'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Input
                    label="Notas"
                    placeholder="Observaciones, condiciones..."
                    value={formData.notes || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                    multiline
                    numberOfLines={3}
                  />
                </>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Cancelar"
                onPress={() => setShowAddForm(null)}
                variant="outline"
                size="large"
                style={styles.modalButton}
              />
              <Button
                title="Guardar"
                onPress={handleSaveRecord}
                loading={saving}
                size="large"
                style={styles.modalButton}
              />
            </View>

            {/* Date Picker */}
            {showDatePicker && Platform.OS !== 'web' && (
              <DateTimePicker
                value={formData[showDatePicker] || new Date()}
                mode="date"
                display="default"
                onChange={(event, date) => handleDateChange(showDatePicker, event, date)}
              />
            )}
          </View>
        </View>
      </Modal>
    );
  };

  // Group records by type
  const vaccines = medicalRecords.filter(r => r.type === 'vaccine');
  const illnesses = medicalRecords.filter(r => r.type === 'illness');
  const allergies = medicalRecords.filter(r => r.type === 'allergy');
  const dewormings = medicalRecords.filter(r => r.type === 'deworming');
  const weightRecords = medicalRecords.filter(r => r.type === 'weight');

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando historia clínica...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!pet || !owner) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No se pudo cargar la información</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🐾 Historia Clínica Veterinaria</Text>
        <Text style={styles.headerSubtitle}>
          Generada el {new Date().toLocaleDateString('es-ES')}
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Pet Profile */}
        <Card style={styles.petCard}>
          <View style={styles.petProfile}>
            <View style={styles.petInfo}>
              <Text style={styles.petName}>{pet.name}</Text>
              <Text style={styles.petBreed}>{pet.breed}</Text>
              <Text style={styles.petDetails}>
                {pet.species === 'dog' ? 'Perro' : 'Gato'} • {pet.gender === 'male' ? 'Macho' : 'Hembra'}
              </Text>
              {pet.color && <Text style={styles.petColor}>Color: {pet.color}</Text>}
            </View>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Edad:</Text>
              <Text style={styles.infoValue}>{formatAge(pet)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Peso:</Text>
              <Text style={styles.infoValue}>{formatWeight(pet)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Estado reproductivo:</Text>
              <Text style={styles.infoValue}>
                {pet.is_neutered ? 'Castrado/Esterilizado' : 'Entero'}
              </Text>
            </View>
            {pet.has_chip && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Microchip:</Text>
                <Text style={styles.infoValue}>{pet.chip_number || 'Sí'}</Text>
              </View>
            )}
          </View>
        </Card>

        {/* Owner Info */}
        <Card style={styles.ownerCard}>
          <Text style={styles.sectionTitle}>👤 Información del Propietario</Text>
          <View style={styles.ownerInfo}>
            <Text style={styles.ownerDetail}>
              <Text style={styles.ownerLabel}>Nombre:</Text> {owner.display_name}
            </Text>
            <Text style={styles.ownerDetail}>
              <Text style={styles.ownerLabel}>Email:</Text> {owner.email}
            </Text>
            {owner.phone && (
              <Text style={styles.ownerDetail}>
                <Text style={styles.ownerLabel}>Teléfono:</Text> {owner.phone}
              </Text>
            )}
          </View>
        </Card>

        {/* Medical Notes */}
        {pet.medical_notes && (
          <Card style={styles.notesCard}>
            <Text style={styles.sectionTitle}>📝 Notas Médicas Generales</Text>
            <Text style={styles.notesText}>{pet.medical_notes}</Text>
          </Card>
        )}

        {/* Vaccines Section */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>💉 Historial de Vacunación ({vaccines.length})</Text>
            {hasValidToken && (
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => handleAddRecord('vaccine')}
              >
                <Plus size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
          
          {vaccines.length > 0 ? (
            vaccines.map((vaccine, index) => (
              <View key={vaccine.id} style={styles.recordItem}>
                <Text style={styles.recordTitle}>
                  💉 {index + 1}. {vaccine.name}
                </Text>
                <Text style={styles.recordDetail}>
                  <Text style={styles.recordLabel}>Fecha de aplicación:</Text> {formatDate(vaccine.application_date || '')}
                </Text>
                {vaccine.next_due_date && (
                  <Text style={styles.recordDetail}>
                    <Text style={styles.recordLabel}>Próxima dosis:</Text> {formatDate(vaccine.next_due_date)}
                  </Text>
                )}
                {vaccine.veterinarian && (
                  <Text style={styles.recordDetail}>
                    <Text style={styles.recordLabel}>Veterinario:</Text> {vaccine.veterinarian}
                  </Text>
                )}
                {vaccine.notes && (
                  <Text style={styles.recordDetail}>
                    <Text style={styles.recordLabel}>Notas:</Text> {vaccine.notes}
                  </Text>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No hay vacunas registradas</Text>
          )}
        </Card>

        {/* Illnesses Section */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🏥 Historial de Enfermedades ({illnesses.length})</Text>
            {hasValidToken && (
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => handleAddRecord('illness')}
              >
                <Plus size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
          
          {illnesses.length > 0 ? (
            illnesses.map((illness, index) => (
              <View key={illness.id} style={styles.recordItem}>
                <Text style={styles.recordTitle}>
                  🏥 {index + 1}. {illness.name}
                  {illness.status === 'active' && <Text style={styles.activeBadge}> • Activa</Text>}
                </Text>
                <Text style={styles.recordDetail}>
                  <Text style={styles.recordLabel}>Fecha de diagnóstico:</Text> {formatDate(illness.diagnosis_date || '')}
                </Text>
                {illness.symptoms && (
                  <Text style={styles.recordDetail}>
                    <Text style={styles.recordLabel}>Síntomas:</Text> {illness.symptoms}
                  </Text>
                )}
                {illness.severity && (
                  <Text style={styles.recordDetail}>
                    <Text style={styles.recordLabel}>Severidad:</Text> {illness.severity}
                  </Text>
                )}
                {illness.treatment && (
                  <Text style={styles.recordDetail}>
                    <Text style={styles.recordLabel}>Tratamiento:</Text> {illness.treatment}
                  </Text>
                )}
                {illness.veterinarian && (
                  <Text style={styles.recordDetail}>
                    <Text style={styles.recordLabel}>Veterinario:</Text> {illness.veterinarian}
                  </Text>
                )}
                {illness.notes && (
                  <Text style={styles.recordDetail}>
                    <Text style={styles.recordLabel}>Notas:</Text> {illness.notes}
                  </Text>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No hay enfermedades registradas</Text>
          )}
        </Card>

        {/* Allergies Section */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🚨 Alergias Conocidas ({allergies.length})</Text>
            {hasValidToken && (
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => handleAddRecord('allergy')}
              >
                <Plus size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
          
          {allergies.length > 0 ? (
            allergies.map((allergy, index) => (
              <View key={allergy.id} style={styles.recordItem}>
                <Text style={styles.recordTitle}>
                  🚨 {index + 1}. {allergy.name}
                </Text>
                {allergy.symptoms && (
                  <Text style={styles.recordDetail}>
                    <Text style={styles.recordLabel}>Síntomas:</Text> {allergy.symptoms}
                  </Text>
                )}
                {allergy.severity && (
                  <Text style={styles.recordDetail}>
                    <Text style={styles.recordLabel}>Severidad:</Text> {allergy.severity}
                  </Text>
                )}
                {allergy.treatment && (
                  <Text style={styles.recordDetail}>
                    <Text style={styles.recordLabel}>Tratamiento:</Text> {allergy.treatment}
                  </Text>
                )}
                {allergy.notes && (
                  <Text style={styles.recordDetail}>
                    <Text style={styles.recordLabel}>Notas:</Text> {allergy.notes}
                  </Text>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No hay alergias registradas</Text>
          )}
        </Card>

        {/* Deworming Section */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>💊 Historial de Desparasitación ({dewormings.length})</Text>
            {hasValidToken && (
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => handleAddRecord('deworming')}
              >
                <Plus size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
          
          {dewormings.length > 0 ? (
            dewormings.map((deworming, index) => (
              <View key={deworming.id} style={styles.recordItem}>
                <Text style={styles.recordTitle}>
                  💊 {index + 1}. {deworming.product_name || deworming.name}
                </Text>
                <Text style={styles.recordDetail}>
                  <Text style={styles.recordLabel}>Fecha de aplicación:</Text> {formatDate(deworming.application_date || '')}
                </Text>
                {deworming.next_due_date && (
                  <Text style={styles.recordDetail}>
                    <Text style={styles.recordLabel}>Próxima dosis:</Text> {formatDate(deworming.next_due_date)}
                  </Text>
                )}
                {deworming.veterinarian && (
                  <Text style={styles.recordDetail}>
                    <Text style={styles.recordLabel}>Veterinario:</Text> {deworming.veterinarian}
                  </Text>
                )}
                {deworming.notes && (
                  <Text style={styles.recordDetail}>
                    <Text style={styles.recordLabel}>Notas:</Text> {deworming.notes}
                  </Text>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No hay desparasitaciones registradas</Text>
          )}
        </Card>

        {/* Weight Section */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>⚖️ Historial de Peso ({weightRecords.length})</Text>
            {hasValidToken && (
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => handleAddRecord('weight')}
              >
                <Plus size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
          
          {weightRecords.length > 0 ? (
            <View style={styles.weightGrid}>
              {weightRecords.slice(0, 12).map((weight, index) => (
                <View key={weight.id} style={styles.weightItem}>
                  <Text style={styles.weightDate}>{formatDate(weight.date || '')}</Text>
                  <Text style={styles.weightValue}>{weight.weight} {weight.weight_unit || 'kg'}</Text>
                  {weight.notes && weight.notes !== 'Peso inicial al registrar la mascota' && (
                    <Text style={styles.weightNotes}>{weight.notes}</Text>
                  )}
                </View>
              ))}
              {weightRecords.length > 12 && (
                <Text style={styles.moreRecordsText}>
                  ... y {weightRecords.length - 12} registros más
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.emptyText}>No hay registros de peso</Text>
          )}
        </Card>

        {/* Footer */}
        <Card style={styles.footerCard}>
          <Text style={styles.footerTitle}>Historia clínica generada por DogCatiFy</Text>
          <Text style={styles.footerText}>
            Fecha de generación: {new Date().toLocaleDateString('es-ES')}
          </Text>
          <Text style={styles.footerText}>
            Mascota: {pet.name} | Propietario: {owner.display_name}
          </Text>
          <Text style={styles.footerNote}>
            Para uso veterinario exclusivamente
          </Text>
        </Card>
      </ScrollView>

      {/* Add Record Form Modal */}
      {renderAddForm()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: 50,
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
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#2D6A6F',
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  petCard: {
    marginBottom: 16,
  },
  petProfile: {
    marginBottom: 16,
  },
  petInfo: {
    alignItems: 'center',
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
    color: '#111827',
    marginBottom: 4,
  },
  petDetails: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 2,
  },
  petColor: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  ownerCard: {
    marginBottom: 16,
  },
  ownerInfo: {
    gap: 8,
  },
  ownerDetail: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
  },
  ownerLabel: {
    fontFamily: 'Inter-SemiBold',
    color: '#2D6A6F',
  },
  notesCard: {
    marginBottom: 16,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  notesText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
    lineHeight: 20,
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#10B981',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordItem: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2D6A6F',
  },
  recordTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#2D6A6F',
    marginBottom: 8,
  },
  recordDetail: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    marginBottom: 4,
  },
  recordLabel: {
    fontFamily: 'Inter-SemiBold',
    color: '#2D6A6F',
  },
  activeBadge: {
    color: '#EF4444',
    fontFamily: 'Inter-SemiBold',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  weightGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  weightItem: {
    backgroundColor: '#EBF8FF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 100,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  weightDate: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#1E40AF',
    marginBottom: 4,
  },
  weightValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#0D47A1',
  },
  weightNotes: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#1976D2',
    marginTop: 4,
    textAlign: 'center',
  },
  moreRecordsText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
    width: '100%',
    paddingVertical: 8,
  },
  footerCard: {
    marginBottom: 24,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 3,
    borderTopColor: '#2D6A6F',
  },
  footerTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  footerText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 4,
  },
  footerNote: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  formContent: {
    flex: 1,
    marginBottom: 20,
  },
  dateInputContainer: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 8,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  dateText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    marginLeft: 8,
  },
  weightInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  weightInput: {
    flex: 2,
  },
  unitSelector: {
    flex: 1,
  },
  unitLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 8,
  },
  unitButtons: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    overflow: 'hidden',
    height: 44,
  },
  unitButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  selectedUnitButton: {
    backgroundColor: '#2D6A6F',
  },
  unitButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  selectedUnitButtonText: {
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  modalButton: {
    flex: 1,
  },
});