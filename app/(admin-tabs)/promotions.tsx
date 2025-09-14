import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert, Image, Modal, TextInput } from 'react-native';
import { Plus, Volume2, Calendar, Eye, MousePointer as Click, Heart, X, Camera, Upload } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { supabaseClient } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function AdminPromotions() {
  const { currentUser } = useAuth();
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  
  // Form state
  const [promoTitle, setPromoTitle] = useState('');
  const [promoDescription, setPromoDescription] = useState('');
  const [promoImage, setPromoImage] = useState<string | null>(null);
  const [promoUrl, setPromoUrl] = useState('');
  const [promoStartDate, setPromoStartDate] = useState('');
  const [promoEndDate, setPromoEndDate] = useState('');
  const [promoTargetAudience, setPromoTargetAudience] = useState('all');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [partnerSearchQuery, setPartnerSearchQuery] = useState('');
  const [partners, setPartners] = useState<any[]>([]);
  const [showPartnerSelector, setShowPartnerSelector] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      console.log('No user logged in');
      return;
    }

    console.log('Current user email:', currentUser.email);
    const isAdmin = currentUser.email?.toLowerCase() === 'admin@dogcatify.com';
    if (!isAdmin) {
      console.log('User is not admin');
      return;
    }

    console.log('Fetching promotions data...');
    fetchPromotions();
    fetchPartners();
  }, [currentUser]);

  const fetchPromotions = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('promotions')
        .select(`
          *,
          partners:partner_id(business_name, business_type, logo)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const promotionsData = data?.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        imageURL: item.image_url,
        ctaUrl: item.cta_url,
        startDate: new Date(item.start_date),
        endDate: new Date(item.end_date),
        targetAudience: item.target_audience,
        isActive: item.is_active,
        views: item.views,
        clicks: item.clicks,
        likes: item.likes || [],
        createdAt: new Date(item.created_at),
        createdBy: item.created_by,
        partnerId: item.partner_id,
        partnerInfo: item.partners ? {
          businessName: item.partners.business_name,
          businessType: item.partners.business_type,
          logo: item.partners.logo,
        } : null,
      })) || [];

      setPromotions(promotionsData);
    } catch (error) {
      console.error('Error fetching promotions:', error);
    }
  };

  const fetchPartners = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('partners')
        .select('id, business_name, business_type, logo')
        .eq('is_verified', true)
        .eq('is_active', true)
        .order('business_name', { ascending: true });

      if (error) throw error;
      setPartners(data || []);
    } catch (error) {
      console.error('Error fetching partners:', error);
    }
  };

  const handleSelectImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permisos requeridos', 'Se necesitan permisos para acceder a la galería');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPromoImage(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permisos requeridos', 'Se necesitan permisos para usar la cámara');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPromoImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (imageUri: string): Promise<string> => {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const filename = `promotions/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

    const { error } = await supabaseClient.storage
      .from('dogcatify')
      .upload(filename, blob);

    if (error) throw error;

    const { data: { publicUrl } } = supabaseClient.storage
      .from('dogcatify')
      .getPublicUrl(filename);

    return publicUrl;
  };

  const handleCreatePromotion = async () => {
    console.log('🚀 Starting handleCreatePromotion...');
    console.log('Form validation - checking required fields...');
    console.log('promoTitle:', promoTitle);
    console.log('promoDescription:', promoDescription);
    console.log('promoStartDate:', promoStartDate);
    console.log('promoEndDate:', promoEndDate);
    console.log('promoImage:', promoImage ? 'Image selected' : 'No image');
    
    if (!promoTitle || !promoDescription || !promoStartDate || !promoEndDate || !promoImage) {
      console.log('❌ Validation failed - missing required fields');
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }
    
    console.log('✅ Validation passed, starting creation process...');
    setLoading(true);
    
    try {
      console.log('Step 1: Uploading image...');
      let imageUrl = null;
      if (promoImage) {
        console.log('Image URI:', promoImage);
        try {
          imageUrl = await uploadImage(promoImage);
          console.log('✅ Image uploaded successfully:', imageUrl);
        } catch (uploadError) {
          console.error('❌ Image upload failed:', uploadError);
          throw new Error(`Error subiendo imagen: ${uploadError.message}`);
        }
      }
      
      console.log('Step 2: Preparing promotion data...');
      const promotionData = {
        title: promoTitle.trim(),
        description: promoDescription.trim(),
        image_url: imageUrl,
        cta_url: promoUrl.trim() || null,
        start_date: new Date(promoStartDate).toISOString(),
        end_date: new Date(promoEndDate).toISOString(),
        target_audience: promoTargetAudience,
        is_active: true,
        views: 0,
        clicks: 0,
        likes: [],
        promotion_type: 'feed',
        cta_text: 'Más información',
        created_at: new Date().toISOString(),
        created_by: currentUser?.id,
      };
      
      if (selectedPartnerId) {
        promotionData.partner_id = selectedPartnerId;
      }
      
      console.log('Step 3: Inserting promotion into database...');
      console.log('Promotion data:', promotionData);
      
      const { error } = await supabaseClient
        .from('promotions')
        .insert([promotionData]);
      
      if (error) {
        console.error('❌ Database insertion failed:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        Alert.alert('Error', `No se pudo crear la promoción: ${error.message}`);
        return;
      }
      
      console.log('✅ Promotion created successfully in database');
      
      console.log('Step 4: Resetting form and refreshing data...');
      resetForm();
      setShowPromotionModal(false);
      fetchPromotions();
      
      console.log('✅ Process completed successfully');
      Alert.alert('Éxito', 'Promoción creada correctamente');
    } catch (error) {
      console.error('❌ Error in handleCreatePromotion:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error?.message);
      
      let errorMessage = 'No se pudo crear la promoción';
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = `Error: ${error.message}`;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      console.log('🏁 Finishing handleCreatePromotion, setting loading to false');
      setLoading(false);
    }
  };

  const handleTogglePromotion = async (promotionId: string, isActive: boolean) => {
    try {
      const { error } = await supabaseClient
        .from('promotions')
        .update({ is_active: !isActive })
        .eq('id', promotionId);
      
      if (error) throw error;
      fetchPromotions();
    } catch (error) {
      console.error('Error toggling promotion:', error);
      Alert.alert('Error', 'No se pudo actualizar la promoción');
    }
  };

  const resetForm = () => {
    setPromoTitle('');
    setPromoDescription('');
    setPromoImage(null);
    setPromoUrl('');
    setPromoStartDate('');
    setPromoEndDate('');
    setPromoTargetAudience('all');
    setSelectedPartnerId(null);
    setPartnerSearchQuery('');
  };

  const handleSelectPartner = (partner: any) => {
    setSelectedPartnerId(partner.id);
    setPartnerSearchQuery(partner.business_name);
    setShowPartnerSelector(false);
  };

  const getBusinessTypeIcon = (type: string) => {
    switch (type) {
      case 'veterinary': return '🏥';
      case 'grooming': return '✂️';
      case 'walking': return '🚶';
      case 'boarding': return '🏠';
      case 'shop': return '🛍️';
      case 'shelter': return '🐾';
      default: return '🏢';
    }
  };

  const isPromotionActive = (startDate: Date, endDate: Date) => {
    const now = new Date();
    return now >= startDate && now <= endDate;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setPromoStartDate(selectedDate.toISOString());
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setPromoEndDate(selectedDate.toISOString());
    }
  };

  const isAdmin = currentUser?.email?.toLowerCase() === 'admin@dogcatify.com';
  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.accessDenied}>
          <Text style={styles.accessDeniedTitle}>Acceso Denegado</Text>
          <Text style={styles.accessDeniedText}>
            No tienes permisos para acceder a esta sección
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📢 Gestión de Promociones</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowPromotionModal(true)}
        >
          <Plus size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Promociones Activas ({promotions.length})</Text>
          
          {promotions.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Volume2 size={48} color="#DC2626" />
              <Text style={styles.emptyTitle}>No hay promociones</Text>
              <Text style={styles.emptySubtitle}>
                Crea la primera promoción para la plataforma
              </Text>
            </Card>
          ) : (
            promotions.map((promotion) => (
              <Card key={promotion.id} style={styles.promotionCard}>
                <View style={styles.promotionHeader}>
                  <View style={styles.promotionInfo}>
                    <Text style={styles.promotionTitle}>{promotion.title}</Text>
                    <Text style={styles.promotionDescription} numberOfLines={2}>
                      {promotion.description}
                    </Text>
                    {promotion.partnerInfo && (
                      <Text style={styles.promotionPartner}>
                        {getBusinessTypeIcon(promotion.partnerInfo.businessType)} {promotion.partnerInfo.businessName}
                      </Text>
                    )}
                  </View>
                  
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      { backgroundColor: promotion.isActive ? '#D1FAE5' : '#FEE2E2' }
                    ]}
                    onPress={() => handleTogglePromotion(promotion.id, promotion.isActive)}
                  >
                    <Text style={[
                      styles.statusButtonText,
                      { color: promotion.isActive ? '#065F46' : '#991B1B' }
                    ]}>
                      {promotion.isActive ? 'Activa' : 'Inactiva'}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {promotion.imageURL && (
                  <Image source={{ uri: promotion.imageURL }} style={styles.promotionImage} />
                )}
                
                <View style={styles.promotionStats}>
                  <View style={styles.statItem}>
                    <Eye size={16} color="#6B7280" />
                    <Text style={styles.statText}>{promotion.views || 0} vistas</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Click size={16} color="#6B7280" />
                    <Text style={styles.statText}>{promotion.clicks || 0} clics</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Heart size={16} color="#6B7280" />
                    <Text style={styles.statText}>{promotion.likes?.length || 0} likes</Text>
                  </View>
                </View>
                
                <View style={styles.promotionDates}>
                  <Text style={styles.dateText}>
                    📅 {formatDate(promotion.startDate)} - {formatDate(promotion.endDate)}
                  </Text>
                  <View style={[
                    styles.activeBadge,
                    { backgroundColor: isPromotionActive(promotion.startDate, promotion.endDate) ? '#D1FAE5' : '#FEE2E2' }
                  ]}>
                    <Text style={[
                      styles.activeBadgeText,
                      { color: isPromotionActive(promotion.startDate, promotion.endDate) ? '#065F46' : '#991B1B' }
                    ]}>
                      {isPromotionActive(promotion.startDate, promotion.endDate) ? 'En curso' : 'Finalizada'}
                    </Text>
                  </View>
                </View>
              </Card>
            ))
          )}
        </View>
      </ScrollView>

      {/* Create Promotion Modal */}
      <Modal
        visible={showPromotionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPromotionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Crear Nueva Promoción</Text>
                <TouchableOpacity onPress={() => setShowPromotionModal(false)}>
                  <X size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              
              <Input
                label="Título de la promoción *"
                placeholder="Ej: ¡50% de descuento en consultas!"
                value={promoTitle}
                onChangeText={setPromoTitle}
              />

              <Input
                label="Descripción *"
                placeholder="Describe la promoción..."
                value={promoDescription}
                onChangeText={setPromoDescription}
                multiline
                numberOfLines={3}
              />

              <View style={styles.imageSection}>
                <Text style={styles.imageLabel}>Imagen de la promoción *</Text>
                
                {promoImage ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: promoImage }} style={styles.selectedImage} />
                    <TouchableOpacity 
                      style={styles.changeImageButton}
                      onPress={() => setPromoImage(null)}
                    >
                      <Text style={styles.changeImageText}>Cambiar imagen</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.imageActions}>
                    <TouchableOpacity style={styles.imageActionButton} onPress={handleTakePhoto}>
                      <Camera size={24} color="#6B7280" />
                      <Text style={styles.imageActionText}>Tomar foto</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.imageActionButton} onPress={handleSelectImage}>
                      <Upload size={24} color="#6B7280" />
                      <Text style={styles.imageActionText}>Galería</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <Input
                label="URL de destino (opcional)"
                placeholder="https://ejemplo.com o dogcatify://services/123"
                value={promoUrl}
                onChangeText={setPromoUrl}
              />

              <View style={styles.dateSection}>
                <Text style={styles.dateLabel}>Fecha de inicio *</Text>
                <TouchableOpacity 
                  style={styles.dateInput}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Calendar size={20} color="#6B7280" />
                  <Text style={styles.dateInputText}>
                    {promoStartDate ? formatDate(new Date(promoStartDate)) : 'Seleccionar fecha'}
                  </Text>
                </TouchableOpacity>
                {showStartDatePicker && (
                  <DateTimePicker
                    value={promoStartDate ? new Date(promoStartDate) : new Date()}
                    mode="date"
                    display="default"
                    onChange={onStartDateChange}
                  />
                )}
              </View>

              <View style={styles.dateSection}>
                <Text style={styles.dateLabel}>Fecha de fin *</Text>
                <TouchableOpacity 
                  style={styles.dateInput}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Calendar size={20} color="#6B7280" />
                  <Text style={styles.dateInputText}>
                    {promoEndDate ? formatDate(new Date(promoEndDate)) : 'Seleccionar fecha'}
                  </Text>
                </TouchableOpacity>
                {showEndDatePicker && (
                  <DateTimePicker
                    value={promoEndDate ? new Date(promoEndDate) : new Date()}
                    mode="date"
                    display="default"
                    onChange={onEndDateChange}
                  />
                )}
              </View>

              <View style={styles.partnerSection}>
                <Text style={styles.partnerLabel}>Aliado asociado (opcional)</Text>
                <TouchableOpacity 
                  style={styles.partnerSelector}
                  onPress={() => setShowPartnerSelector(true)}
                >
                  <Text style={styles.partnerSelectorText}>
                    {selectedPartnerId ? 
                      partners.find(p => p.id === selectedPartnerId)?.business_name || 'Aliado seleccionado' :
                      'Seleccionar aliado (opcional)'
                    }
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalActions}>
                <Button
                  title="Cancelar"
                  onPress={() => {
                    setShowPromotionModal(false);
                    resetForm();
                  }}
                  variant="outline"
                  size="large"
                />
                <Button
                  title={loading ? 'Creando...' : 'Crear Promoción'}
                  onPress={handleCreatePromotion}
                  loading={loading}
                  size="large"
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Partner Selector Modal */}
      <Modal
        visible={showPartnerSelector}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPartnerSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.partnerModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Aliado</Text>
              <TouchableOpacity onPress={() => setShowPartnerSelector(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <Input
              placeholder="Buscar aliado..."
              value={partnerSearchQuery}
              onChangeText={setPartnerSearchQuery}
            />
            
            <ScrollView style={styles.partnersList}>
              <TouchableOpacity 
                style={styles.partnerOption}
                onPress={() => {
                  setSelectedPartnerId(null);
                  setPartnerSearchQuery('');
                  setShowPartnerSelector(false);
                }}
              >
                <Text style={styles.partnerOptionText}>Sin aliado específico</Text>
              </TouchableOpacity>
              
              {partners
                .filter(partner => 
                  partner.business_name.toLowerCase().includes(partnerSearchQuery.toLowerCase())
                )
                .map((partner) => (
                <TouchableOpacity 
                  key={partner.id}
                  style={styles.partnerOption}
                  onPress={() => handleSelectPartner(partner)}
                >
                  <Text style={styles.partnerOptionIcon}>
                    {getBusinessTypeIcon(partner.business_type)}
                  </Text>
                  <Text style={styles.partnerOptionText}>{partner.business_name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#DC2626',
    padding: 8,
    borderRadius: 20,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  emptyCard: {
    marginHorizontal: 16,
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  promotionCard: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  promotionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  promotionInfo: {
    flex: 1,
    marginRight: 12,
  },
  promotionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  promotionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 8,
  },
  promotionPartner: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#3B82F6',
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  promotionImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 12,
  },
  promotionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginLeft: 4,
  },
  promotionDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#EF4444',
    marginBottom: 8,
  },
  accessDeniedText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  imageSection: {
    marginBottom: 16,
  },
  imageLabel: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 8,
  },
  imagePreviewContainer: {
    marginBottom: 12,
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  changeImageButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'center',
  },
  changeImageText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  imageActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  imageActionButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  imageActionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  dateSection: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 15,
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
  dateInputText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    marginLeft: 8,
  },
  partnerSection: {
    marginBottom: 20,
  },
  partnerLabel: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 8,
  },
  partnerSelector: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  partnerSelectorText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  modalActions: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 20,
  },
  partnerModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxHeight: '80%',
  },
  partnersList: {
    maxHeight: 300,
    marginTop: 16,
  },
  partnerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  partnerOptionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  partnerOptionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    flex: 1,
  },
});