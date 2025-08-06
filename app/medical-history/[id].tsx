import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert, Modal, TextInput, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Plus, Calendar, Syringe, Heart, TriangleAlert as AlertTriangle, Pill, Scale, User, X, Save } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { supabaseClient } from '../../lib/supabase';
import { verifyMedicalHistoryToken } from '../../utils/medicalHistoryTokens';
import { generateMedicalHistoryHTML } from '../../utils/medicalHistoryPDF';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function MedicalHistory() {
  const { id, token } = useLocalSearchParams<{ id: string; token?: string }>();
  const { currentUser } = useAuth();
  
  // Pet and owner data
  const [pet, setPet] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTokenAccess, setIsTokenAccess] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  // Catalog data
  const [vaccines, setVaccines] = useState<any[]>([]);
  const [conditions, setConditions] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [allergies, setAllergies] = useState<any[]>([]);
  const [dewormers, setDewormers] = useState<any[]>([]);
  const [veterinarians, setVeterinarians] = useState<any[]>([]);

  // Form states
  const [currentFormType, setCurrentFormType] = useState<'vaccine' | 'illness' | 'allergy' | 'deworming' | 'weight' | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal states
  const [showVaccineModal, setShowVaccineModal] = useState(false);
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [showAllergyModal, setShowAllergyModal] = useState(false);
  const [showDewormerModal, setShowDewormerModal] = useState(false);
  const [showVetModal, setShowVetModal] = useState(false);
  const [showTempVetModal, setShowTempVetModal] = useState(false);

  useEffect(() => {
    if (id) {
      initializeData();
    }
  }, [id, token]);

  const initializeData = async () => {
    try {
      // If token is provided, verify it first
      if (token) {
        console.log('Verifying token access...');
        const tokenResult = await verifyMedicalHistoryToken(token);
        
        if (!tokenResult.success) {
          Alert.alert('Acceso denegado', tokenResult.error || 'Token inválido');
          router.back();
          return;
        }
        
        setIsTokenAccess(true);
        setCanEdit(false); // Token access is read-only by default
      } else if (currentUser) {
        setCanEdit(true); // Owner can edit
      }

      await Promise.all([
        fetchPetData(),
        fetchMedicalRecords(),
        fetchCatalogData()
      ]);
    } catch (error) {
      console.error('Error initializing data:', error);
      Alert.alert('Error', 'No se pudo cargar la información médica');
    } finally {
      setLoading(false);
    }
  };

  const fetchPetData = async () => {
    try {
      const { data: petData, error: petError } = await supabaseClient
        .from('pets')
        .select('*')
        .eq('id', id)
        .single();

      if (petError) throw petError;
      setPet(petData);

      // Fetch owner data
      const { data: ownerData, error: ownerError } = await supabaseClient
        .from('profiles')
        .select('display_name, email, phone')
        .eq('id', petData.owner_id)
        .single();

      if (ownerError) throw ownerError;
      setOwner(ownerData);
    } catch (error) {
      console.error('Error fetching pet data:', error);
      throw error;
    }
  };

  const fetchMedicalRecords = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('pet_health')
        .select('*')
        .eq('pet_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMedicalRecords(data || []);
    } catch (error) {
      console.error('Error fetching medical records:', error);
      throw error;
    }
  };

  const fetchCatalogData = async () => {
    try {
      await Promise.all([
        fetchVaccines(),
        fetchConditions(),
        fetchTreatments(),
        fetchAllergies(),
        fetchDewormers(),
        fetchVeterinarians()
      ]);
    } catch (error) {
      console.error('Error fetching catalog data:', error);
    }
  };

  const fetchVaccines = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('vaccines_catalog')
        .select('*')
        .eq('is_active', true)
        .in('species', [pet?.species || 'dog', 'both'])
        .order('name', { ascending: true });

      if (error) throw error;
      setVaccines(data || []);
    } catch (error) {
      console.error('Error fetching vaccines:', error);
    }
  };

  const fetchConditions = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('medical_conditions')
        .select('*')
        .eq('is_active', true)
        .in('species', [pet?.species || 'dog', 'both'])
        .order('name', { ascending: true });

      if (error) throw error;
      setConditions(data || []);
    } catch (error) {
      console.error('Error fetching conditions:', error);
    }
  };

  const fetchTreatments = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('medical_treatments')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setTreatments(data || []);
    } catch (error) {
      console.error('Error fetching treatments:', error);
    }
  };

  const fetchAllergies = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('allergies_catalog')
        .select('*')
        .eq('is_active', true)
        .in('species', [pet?.species || 'dog', 'both'])
        .order('name', { ascending: true });

      if (error) throw error;
      setAllergies(data || []);
    } catch (error) {
      console.error('Error fetching allergies:', error);
    }
  };

  const fetchDewormers = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('dewormers_catalog')
        .select('*')
        .eq('is_active', true)
        .in('species', [pet?.species || 'dog', 'both'])
        .order('name', { ascending: true });

      if (error) throw error;
      setDewormers(data || []);
    } catch (error) {
      console.error('Error fetching dewormers:', error);
    }
  };

  const fetchVeterinarians = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('partners')
        .select('*')
        .eq('business_type', 'veterinary')
        .eq('is_verified', true)
        .eq('is_active', true)
        .order('business_name', { ascending: true });

      if (error) throw error;
      setVeterinarians(data || []);
    } catch (error) {
      console.error('Error fetching veterinarians:', error);
    }
  };

  const handleAddRecord = (type: 'vaccine' | 'illness' | 'allergy' | 'deworming' | 'weight') => {
    if (!canEdit) {
      Alert.alert('Solo lectura', 'Esta vista es de solo lectura');
      return;
    }

    setCurrentFormType(type);
    setFormData({});
    setSelectedDate(new Date());

    switch (type) {
      case 'vaccine':
        setShowVaccineModal(true);
        break;
      case 'illness':
        setShowConditionModal(true);
        break;
      case 'allergy':
        setShowAllergyModal(true);
        break;
      case 'deworming':
        setShowDewormerModal(true);
        break;
      case 'weight':
        // Handle weight form directly
        setFormData({ weight: '', weight_unit: 'kg', notes: '' });
        break;
    }
  };

  const handleSelectFromCatalog = (item: any, field: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: item.name,
      selectedItem: item
    }));
    
    // Close appropriate modal
    switch (currentFormType) {
      case 'vaccine':
        setShowVaccineModal(false);
        break;
      case 'illness':
        setShowConditionModal(false);
        break;
      case 'allergy':
        setShowAllergyModal(false);
        break;
      case 'deworming':
        setShowDewormerModal(false);
        break;
    }
  };

  const handleSelectVeterinarian = (vet: any) => {
    setFormData(prev => ({
      ...prev,
      veterinarian: vet.business_name
    }));
    setShowVetModal(false);
  };

  const handleSaveRecord = async () => {
    if (!currentFormType || !canEdit) return;

    setSaving(true);
    try {
      const baseData = {
        pet_id: id,
        user_id: currentUser?.id || owner?.id,
        type: currentFormType,
        created_at: new Date().toISOString()
      };

      let recordData = { ...baseData };

      switch (currentFormType) {
        case 'vaccine':
          recordData = {
            ...recordData,
            name: formData.name || '',
            application_date: formatDate(selectedDate),
            next_due_date: formData.next_due_date || null,
            veterinarian: formData.veterinarian || null,
            notes: formData.notes || null
          };
          break;
        case 'illness':
          recordData = {
            ...recordData,
            name: formData.name || '',
            diagnosis_date: formatDate(selectedDate),
            treatment: formData.treatment || null,
            veterinarian: formData.veterinarian || null,
            status: formData.status || 'active',
            notes: formData.notes || null
          };
          break;
        case 'allergy':
          recordData = {
            ...recordData,
            name: formData.name || '',
            symptoms: formData.symptoms || '',
            severity: formData.severity || null,
            treatment: formData.treatment || null,
            notes: formData.notes || null
          };
          break;
        case 'deworming':
          recordData = {
            ...recordData,
            product_name: formData.product_name || '',
            application_date: formatDate(selectedDate),
            next_due_date: formData.next_due_date || null,
            veterinarian: formData.veterinarian || null,
            notes: formData.notes || null
          };
          break;
        case 'weight':
          recordData = {
            ...recordData,
            weight: parseFloat(formData.weight || '0'),
            weight_unit: formData.weight_unit || 'kg',
            date: formatDate(selectedDate),
            notes: formData.notes || null
          };
          break;
      }

      // Save using Edge Function if token access, otherwise direct insert
      if (isTokenAccess && token) {
        const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/save-medical-record`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            recordData,
            token
          }),
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error);
        }
      } else {
        const { error } = await supabaseClient
          .from('pet_health')
          .insert([recordData]);

        if (error) throw error;
      }

      Alert.alert('Éxito', 'Registro médico guardado correctamente');
      setCurrentFormType(null);
      setFormData({});
      await fetchMedicalRecords();
    } catch (error) {
      console.error('Error saving record:', error);
      Alert.alert('Error', 'No se pudo guardar el registro médico');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getRecordsByType = (type: string) => {
    return medicalRecords.filter(record => record.type === type);
  };

  const renderCatalogModal = (
    visible: boolean,
    onClose: () => void,
    title: string,
    data: any[],
    onSelect: (item: any) => void,
    searchField: string = 'name'
  ) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.catalogList}>
            {data.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.catalogItem}
                onPress={() => onSelect(item)}
              >
                <Text style={styles.catalogItemName}>{item[searchField]}</Text>
                {item.description && (
                  <Text style={styles.catalogItemDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderFormModal = () => {
    if (!currentFormType) return null;

    const getFormTitle = () => {
      switch (currentFormType) {
        case 'vaccine': return 'Agregar Vacuna';
        case 'illness': return 'Agregar Enfermedad';
        case 'allergy': return 'Agregar Alergia';
        case 'deworming': return 'Agregar Desparasitación';
        case 'weight': return 'Agregar Peso';
        default: return 'Agregar Registro';
      }
    };

    return (
      <Modal visible={!!currentFormType} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.formModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{getFormTitle()}</Text>
              <TouchableOpacity onPress={() => setCurrentFormType(null)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContent}>
              {currentFormType === 'vaccine' && (
                <>
                  <TouchableOpacity
                    style={styles.selectInput}
                    onPress={() => setShowVaccineModal(true)}
                  >
                    <Text style={[styles.selectInputText, !formData.name && styles.placeholderText]}>
                      {formData.name || 'Seleccionar vacuna...'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Calendar size={20} color="#6B7280" />
                    <Text style={styles.dateInputText}>
                      Aplicada: {formatDate(selectedDate)}
                    </Text>
                  </TouchableOpacity>

                  <Input
                    placeholder="Próxima dosis (opcional)"
                    value={formData.next_due_date || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, next_due_date: text }))}
                  />

                  <TouchableOpacity
                    style={styles.selectInput}
                    onPress={() => setShowVetModal(true)}
                  >
                    <Text style={[styles.selectInputText, !formData.veterinarian && styles.placeholderText]}>
                      {formData.veterinarian || 'Seleccionar veterinario...'}
                    </Text>
                  </TouchableOpacity>

                  <Input
                    placeholder="Notas adicionales"
                    value={formData.notes || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                    multiline
                    numberOfLines={3}
                  />
                </>
              )}

              {currentFormType === 'illness' && (
                <>
                  <TouchableOpacity
                    style={styles.selectInput}
                    onPress={() => setShowConditionModal(true)}
                  >
                    <Text style={[styles.selectInputText, !formData.name && styles.placeholderText]}>
                      {formData.name || 'Seleccionar enfermedad...'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Calendar size={20} color="#6B7280" />
                    <Text style={styles.dateInputText}>
                      Diagnóstico: {formatDate(selectedDate)}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.selectInput}
                    onPress={() => setShowTreatmentModal(true)}
                  >
                    <Text style={[styles.selectInputText, !formData.treatment && styles.placeholderText]}>
                      {formData.treatment || 'Seleccionar tratamiento...'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.selectInput}
                    onPress={() => setShowVetModal(true)}
                  >
                    <Text style={[styles.selectInputText, !formData.veterinarian && styles.placeholderText]}>
                      {formData.veterinarian || 'Seleccionar veterinario...'}
                    </Text>
                  </TouchableOpacity>

                  <Input
                    placeholder="Notas adicionales"
                    value={formData.notes || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                    multiline
                    numberOfLines={3}
                  />
                </>
              )}

              {currentFormType === 'allergy' && (
                <>
                  <TouchableOpacity
                    style={styles.selectInput}
                    onPress={() => setShowAllergyModal(true)}
                  >
                    <Text style={[styles.selectInputText, !formData.name && styles.placeholderText]}>
                      {formData.name || 'Seleccionar alergia...'}
                    </Text>
                  </TouchableOpacity>

                  <Input
                    placeholder="Síntomas"
                    value={formData.symptoms || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, symptoms: text }))}
                    multiline
                    numberOfLines={2}
                  />

                  <Input
                    placeholder="Severidad (Leve, Moderada, Severa)"
                    value={formData.severity || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, severity: text }))}
                  />

                  <Input
                    placeholder="Tratamiento"
                    value={formData.treatment || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, treatment: text }))}
                  />

                  <Input
                    placeholder="Notas adicionales"
                    value={formData.notes || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                    multiline
                    numberOfLines={3}
                  />
                </>
              )}

              {currentFormType === 'deworming' && (
                <>
                  <TouchableOpacity
                    style={styles.selectInput}
                    onPress={() => setShowDewormerModal(true)}
                  >
                    <Text style={[styles.selectInputText, !formData.product_name && styles.placeholderText]}>
                      {formData.product_name || 'Seleccionar desparasitante...'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Calendar size={20} color="#6B7280" />
                    <Text style={styles.dateInputText}>
                      Aplicado: {formatDate(selectedDate)}
                    </Text>
                  </TouchableOpacity>

                  <Input
                    placeholder="Próxima dosis (opcional)"
                    value={formData.next_due_date || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, next_due_date: text }))}
                  />

                  <TouchableOpacity
                    style={styles.selectInput}
                    onPress={() => setShowVetModal(true)}
                  >
                    <Text style={[styles.selectInputText, !formData.veterinarian && styles.placeholderText]}>
                      {formData.veterinarian || 'Seleccionar veterinario...'}
                    </Text>
                  </TouchableOpacity>

                  <Input
                    placeholder="Notas adicionales"
                    value={formData.notes || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                    multiline
                    numberOfLines={3}
                  />
                </>
              )}

              {currentFormType === 'weight' && (
                <>
                  <View style={styles.weightInputRow}>
                    <View style={styles.weightInput}>
                      <Input
                        placeholder="Peso"
                        value={formData.weight || ''}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, weight: text }))}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.unitSelector}>
                      <TouchableOpacity
                        style={[styles.unitButton, formData.weight_unit === 'kg' && styles.selectedUnit]}
                        onPress={() => setFormData(prev => ({ ...prev, weight_unit: 'kg' }))}
                      >
                        <Text style={styles.unitText}>kg</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.unitButton, formData.weight_unit === 'lb' && styles.selectedUnit]}
                        onPress={() => setFormData(prev => ({ ...prev, weight_unit: 'lb' }))}
                      >
                        <Text style={styles.unitText}>lb</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Calendar size={20} color="#6B7280" />
                    <Text style={styles.dateInputText}>
                      Fecha: {formatDate(selectedDate)}
                    </Text>
                  </TouchableOpacity>

                  <Input
                    placeholder="Notas (opcional)"
                    value={formData.notes || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                    multiline
                    numberOfLines={2}
                  />
                </>
              )}

              <View style={styles.formActions}>
                <Button
                  title="Cancelar"
                  onPress={() => setCurrentFormType(null)}
                  variant="outline"
                  size="large"
                />
                <Button
                  title="Guardar"
                  onPress={handleSaveRecord}
                  loading={saving}
                  size="large"
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderRecordSection = (title: string, icon: React.ReactNode, type: string, records: any[]) => (
    <Card style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          {icon}
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {canEdit && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleAddRecord(type as any)}
          >
            <Plus size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {records.length === 0 ? (
        <Text style={styles.emptyText}>No hay registros de {title.toLowerCase()}</Text>
      ) : (
        records.map((record) => (
          <View key={record.id} style={styles.recordItem}>
            <Text style={styles.recordName}>
              {record.name || record.product_name || `${record.weight} ${record.weight_unit}`}
            </Text>
            <Text style={styles.recordDate}>
              {formatDate(record.application_date || record.diagnosis_date || record.date || record.created_at)}
            </Text>
            {record.veterinarian && (
              <Text style={styles.recordVet}>Dr. {record.veterinarian}</Text>
            )}
            {record.notes && (
              <Text style={styles.recordNotes}>{record.notes}</Text>
            )}
          </View>
        ))
      )}
    </Card>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando historia clínica...</Text>
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
        <Text style={styles.title}>Historia Clínica</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Pet Info */}
        <Card style={styles.petCard}>
          <Text style={styles.petName}>{pet?.name}</Text>
          <Text style={styles.petInfo}>
            {pet?.breed} • {pet?.species === 'dog' ? 'Perro' : 'Gato'} • {pet?.gender === 'male' ? 'Macho' : 'Hembra'}
          </Text>
          {owner && (
            <Text style={styles.ownerInfo}>Propietario: {owner.display_name}</Text>
          )}
        </Card>

        {/* Medical Records Sections */}
        {renderRecordSection(
          'Vacunas',
          <Syringe size={20} color="#3B82F6" />,
          'vaccine',
          getRecordsByType('vaccine')
        )}

        {renderRecordSection(
          'Enfermedades',
          <Heart size={20} color="#EF4444" />,
          'illness',
          getRecordsByType('illness')
        )}

        {renderRecordSection(
          'Alergias',
          <AlertTriangle size={20} color="#F59E0B" />,
          'allergy',
          getRecordsByType('allergy')
        )}

        {renderRecordSection(
          'Desparasitaciones',
          <Pill size={20} color="#10B981" />,
          'deworming',
          getRecordsByType('deworming')
        )}

        {renderRecordSection(
          'Peso',
          <Scale size={20} color="#6B7280" />,
          'weight',
          getRecordsByType('weight')
        )}
      </ScrollView>

      {/* Form Modal */}
      {renderFormModal()}

      {/* Catalog Modals */}
      {renderCatalogModal(
        showVaccineModal,
        () => setShowVaccineModal(false),
        'Seleccionar Vacuna',
        vaccines,
        (item) => handleSelectFromCatalog(item, 'name')
      )}

      {renderCatalogModal(
        showConditionModal,
        () => setShowConditionModal(false),
        'Seleccionar Enfermedad',
        conditions,
        (item) => handleSelectFromCatalog(item, 'name')
      )}

      {renderCatalogModal(
        showTreatmentModal,
        () => setShowTreatmentModal(false),
        'Seleccionar Tratamiento',
        treatments,
        (item) => handleSelectFromCatalog(item, 'treatment')
      )}

      {renderCatalogModal(
        showAllergyModal,
        () => setShowAllergyModal(false),
        'Seleccionar Alergia',
        allergies,
        (item) => handleSelectFromCatalog(item, 'name')
      )}

      {renderCatalogModal(
        showDewormerModal,
        () => setShowDewormerModal(false),
        'Seleccionar Desparasitante',
        dewormers,
        (item) => handleSelectFromCatalog(item, 'product_name')
      )}

      {renderCatalogModal(
        showVetModal,
        () => setShowVetModal(false),
        'Seleccionar Veterinario',
        veterinarians,
        handleSelectVeterinarian,
        'business_name'
      )}

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) setSelectedDate(date);
          }}
        />
      )}
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
  petCard: {
    marginBottom: 16,
    alignItems: 'center',
    paddingVertical: 20,
  },
  petName: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 8,
  },
  petInfo: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  ownerInfo: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginLeft: 8,
  },
  addButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  recordItem: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  recordName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  recordDate: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 2,
  },
  recordVet: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#3B82F6',
    marginBottom: 2,
  },
  recordNotes: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    fontStyle: 'italic',
  },
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
    maxHeight: '70%',
  },
  formModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  catalogList: {
    maxHeight: 400,
  },
  catalogItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  catalogItemName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  catalogItemDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 18,
  },
  formContent: {
    maxHeight: 500,
  },
  selectInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    minHeight: 50,
    justifyContent: 'center',
  },
  selectInputText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    minHeight: 50,
  },
  dateInputText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    marginLeft: 8,
  },
  weightInputRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  weightInput: {
    flex: 2,
  },
  unitSelector: {
    flex: 1,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  unitButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  selectedUnit: {
    backgroundColor: '#3B82F6',
  },
  unitText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
});