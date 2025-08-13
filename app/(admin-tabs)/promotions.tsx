import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Modal, Alert, Image, Switch, TextInput } from 'react-native';
import { Plus, DollarSign, Calendar, Search, Eye, MousePointer as Click, Heart, ChevronDown, Check, Camera, Upload } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { supabaseClient } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';

export default function AdminPromotions() {
  const { currentUser } = useAuth();
  const [promotions, setPromotions] = useState<any[]>([]);
  const [filteredPromotions, setFilteredPromotions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [loading, setLoading] = useState(false);

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
  const [filteredPartners, setFilteredPartners] = useState<any[]>([]);
  const [showPartnerSelector, setShowPartnerSelector] = useState(false);

  // Discount state
  const [hasDiscount, setHasDiscount] = useState(false);
  const [discountPercentage, setDiscountPercentage] = useState('');

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

  useEffect(() => {
    if (searchQuery.trim()) {
      setFilteredPromotions(
        promotions.filter(promotion => 
          promotion.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          promotion.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } else {
      setFilteredPromotions(promotions);
    }
  }, [searchQuery, promotions]);

  useEffect(() => {
    if (partnerSearchQuery.trim()) {
      setFilteredPartners(
        partners.filter(partner => 
          partner.business_name.toLowerCase().includes(partnerSearchQuery.toLowerCase())
        )
      );
    } else {
      setFilteredPartners(partners);
    }
  }, [partnerSearchQuery, partners]);

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
        ctaText: item.cta_text,
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
        promotionType: item.promotion_type,
        hasDiscount: item.has_discount || false,
        discountPercentage: item.discount_percentage || 0,
        partnerInfo: item.partners ? {
          businessName: item.partners.business_name,
          businessType: item.partners.business_type,
          logo: item.partners.logo,
        } : null,
      })) || [];

      setPromotions(promotionsData);
      setFilteredPromotions(promotionsData);
    } catch (error) {
      console.error('Error fetching promotions:', error);
    }
  };

  const fetchPartners = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('partners')
        .select('*')
        .eq('is_verified', true)
        .eq('is_active', true)
        .order('business_name', { ascending: true });

      if (error) throw error;
      setPartners(data || []);
      setFilteredPartners(data || []);
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
      mediaTypes: ImagePicker.MediaType.Images,
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
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPromoImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (imageUri: string): Promise<string> => {
    console.log('📤 Starting image upload process...');
    console.log('Image URI:', imageUri);
    
    try {
      console.log('Step 1: Fetching image from URI...');
      const response = await fetch(imageUri);
      console.log('Fetch response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      
      console.log('Step 2: Converting to blob...');
      const blob = await response.blob();
      console.log('Blob created - Size:', blob.size, 'Type:', blob.type);
      
      const filename = `promotions/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      console.log('Step 3: Uploading to Supabase Storage with filename:', filename);
      
      const { data, error } = await supabaseClient.storage
        .from('dogcatify')
        .upload(filename, blob);

      if (error) {
        console.error('❌ Supabase Storage upload error:', error);
        throw error;
      }
      
      console.log('✅ Upload successful, data:', data);
      console.log('Step 4: Getting public URL...');
      
      const { data: { publicUrl } } = supabaseClient.storage
        .from('dogcatify')
        .getPublicUrl(filename);
      
      console.log('✅ Public URL generated:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('❌ Error in uploadImage:', error);
      throw error;
    }
  };

  const handleCreatePromotion = async () => {
    console.log('🚀 Starting promotion creation process...');
    console.log('Form validation - Title:', !!promoTitle, 'Description:', !!promoDescription, 'Start Date:', !!promoStartDate, 'End Date:', !!promoEndDate, 'Image:', !!promoImage);
    
    if (!promoTitle || !promoDescription || !promoStartDate || !promoEndDate || !promoImage) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    // Validate discount percentage if discount is enabled
    if (hasDiscount) {
      const discountNum = parseFloat(discountPercentage);
      if (isNaN(discountNum) || discountNum <= 0 || discountNum > 100) {
        Alert.alert('Error', 'El porcentaje de descuento debe ser un número entre 1 y 100');
        return;
      }
    }

    setLoading(true);
    try {
      console.log('Step 1: Uploading image...');
      let imageUrl = null;
      if (promoImage) {
        imageUrl = await uploadImage(promoImage);
        console.log('✅ Image uploaded successfully:', imageUrl);
      }

      console.log('Step 2: Preparing promotion data...');
      
      // Generate CTA URL based on partner selection
      let ctaUrl = promoUrl.trim() || null;
      if (selectedPartnerId && !ctaUrl) {
        const selectedPartner = partners.find(p => p.id === selectedPartnerId);
        if (selectedPartner) {
          if (selectedPartner.business_type === 'shop') {
            ctaUrl = `dogcatify://products/${selectedPartnerId}`;
          } else if (selectedPartner.business_type === 'shelter') {
            ctaUrl = `dogcatify://services/shelter/${selectedPartnerId}`;
          } else {
            ctaUrl = `dogcatify://services/partner/${selectedPartnerId}`;
          }
        }
      }
      
      const promotionData = {
        title: promoTitle.trim(),
        description: promoDescription.trim(),
        image_url: imageUrl,
        cta_url: ctaUrl,
        cta_text: 'Más información',
        start_date: new Date(promoStartDate).toISOString(),
        end_date: new Date(promoEndDate).toISOString(),
        target_audience: promoTargetAudience,
        is_active: true,
        views: 0,
        clicks: 0,
        likes: [],
        promotion_type: 'feed',
        has_discount: hasDiscount,
        discount_percentage: hasDiscount ? parseFloat(discountPercentage) : null,
        created_at: new Date().toISOString(),
        created_by: currentUser?.id,
      };
      
      if (selectedPartnerId) {
        promotionData.partner_id = selectedPartnerId;
      }
      
      console.log('Step 3: Promotion data prepared:', promotionData);
      console.log('Step 4: Inserting into database...');
      
      const { error } = await supabaseClient
        .from('promotions')
        .insert([promotionData]);
      
      if (error) {
        console.error('❌ Database insertion error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        Alert.alert('Error', `No se pudo crear la promoción: ${error.message}`);
        return;
      }
      
      console.log('✅ Promotion created successfully in database');
      console.log('Step 5: Cleaning up and refreshing...');
      
      resetForm();
      setShowPromotionModal(false);
      fetchPromotions();
      Alert.alert('Éxito', 'Promoción creada correctamente');
    } catch (error) {
      console.error('❌ Error in handleCreatePromotion:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      
      let errorMessage = 'No se pudo crear la promoción';
      if (error?.message?.includes('Network request failed')) {
        errorMessage = 'Error de conexión. Verifica tu internet e intenta nuevamente.';
      } else if (error?.message?.includes('Storage')) {
        errorMessage = 'Error al subir la imagen. Intenta con una imagen más pequeña.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePromotion = async (promotionId: string, isActive: boolean) => {
    try {
      const { error } = await supabaseClient
        .from('promotions')
        .update({ is_active: !isActive })
        .eq('id', promotionId);
      
      if (error) {
        throw error;
      }
      
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
    setHasDiscount(false);
    setDiscountPercentage('');
  };

  const handleSelectPartner = (partner: any) => {
    setSelectedPartnerId(partner.id);
    setPartnerSearchQuery(partner.business_name);
    setShowPartnerSelector(false);
  };

  const handleDiscountPercentageChange = (value: string) => {
    // Only allow numbers and one decimal point
    const numericValue = value.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = numericValue.split('.');
    if (parts.length > 2) {
      return;
    }
    
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      return;
    }
    
    // Limit to 100%
    const num = parseFloat(numericValue);
    if (!isNaN(num) && num > 100) {
      return;
    }
    
    setDiscountPercentage(numericValue);
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
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Input
            placeholder="Buscar promociones..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon={<Search size={20} color="#9CA3AF" />}
          />
        </View>

        {/* Promotions List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Promociones Activas ({filteredPromotions.filter(p => p.isActive).length})
          </Text>
          
          {filteredPromotions.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No hay promociones</Text>
              <Text style={styles.emptySubtitle}>
                Crea la primera promoción para la plataforma
              </Text>
            </Card>
          ) : (
            filteredPromotions.map((promotion) => (
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
                    {promotion.hasDiscount && (
                      <View style={styles.discountBadge}>
                        <DollarSign size={12} color="#FFFFFF" />
                        <Text style={styles.discountText}>{promotion.discountPercentage}% OFF</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.promotionActions}>
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
                    📅 {promotion.startDate.toLocaleDateString()} - {promotion.endDate.toLocaleDateString()}
                  </Text>
                  <View style={[
                    styles.activeBadge,
                    { backgroundColor: isPromotionActive(promotion.startDate, promotion.endDate) ? '#D1FAE5' : '#FEE2E2' }
                  ]}>
                    <Text style={[
                      styles.activeBadgeText,
                      { color: isPromotionActive(promotion.startDate, promotion.endDate) ? '#065F46' : '#991B1B' }
                    ]}>
                      {isPromotionActive(promotion.startDate, promotion.endDate) ? 'En período activo' : 'Fuera de período'}
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
              <Text style={styles.modalTitle}>Crear Nueva Promoción</Text>
              
              <Input
                label="Título de la promoción *"
                placeholder="Ej: ¡50% OFF en servicios veterinarios!"
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

              {/* Discount Section */}
              <View style={styles.discountSection}>
                <View style={styles.discountHeader}>
                  <Text style={styles.discountLabel}>Esta promoción incluye descuento</Text>
                  <Switch
                    value={hasDiscount}
                    onValueChange={setHasDiscount}
                    trackColor={{ false: '#E5E7EB', true: '#DC2626' }}
                    thumbColor={hasDiscount ? '#FFFFFF' : '#FFFFFF'}
                  />
                </View>
                
                {hasDiscount && (
                  <View style={styles.discountInputContainer}>
                    <View style={styles.discountInputWrapper}>
                      <DollarSign size={20} color="#6B7280" />
                      <TextInput
                        style={styles.discountInput}
                        placeholder="15"
                        value={discountPercentage}
                        onChangeText={handleDiscountPercentageChange}
                        keyboardType="numeric"
                      />
                      <Text style={styles.percentSymbol}>%</Text>
                    </View>
                    <Text style={styles.discountHint}>
                      Ingresa solo el número (ej: 15 para 15% de descuento)
                    </Text>
                  </View>
                )}
              </View>

              {/* Partner Selection */}
              <View style={styles.partnerSection}>
                <Text style={styles.partnerLabel}>Negocio asociado (opcional)</Text>
                <TouchableOpacity
                  style={styles.partnerSelector}
                  onPress={() => setShowPartnerSelector(!showPartnerSelector)}
                >
                  <Text style={[
                    styles.partnerSelectorText,
                    !selectedPartnerId && styles.placeholderText
                  ]}>
                    {selectedPartnerId ? 
                      partners.find(p => p.id === selectedPartnerId)?.business_name || 'Negocio seleccionado' :
                      'Seleccionar negocio...'
                    }
                  </Text>
                  <ChevronDown size={20} color="#6B7280" />
                </TouchableOpacity>
                
                {showPartnerSelector && (
                  <View style={styles.partnerDropdown}>
                    <Input
                      placeholder="Buscar negocio..."
                      value={partnerSearchQuery}
                      onChangeText={setPartnerSearchQuery}
                      leftIcon={<Search size={16} color="#9CA3AF" />}
                    />
                    <ScrollView style={styles.partnersList} showsVerticalScrollIndicator={false}>
                      <TouchableOpacity
                        style={styles.partnerOption}
                        onPress={() => {
                          setSelectedPartnerId(null);
                          setPartnerSearchQuery('');
                          setShowPartnerSelector(false);
                        }}
                      >
                        <Text style={styles.partnerOptionText}>Sin negocio asociado</Text>
                      </TouchableOpacity>
                      {filteredPartners.map((partner) => (
                        <TouchableOpacity
                          key={partner.id}
                          style={[
                            styles.partnerOption,
                            selectedPartnerId === partner.id && styles.selectedPartnerOption
                          ]}
                          onPress={() => handleSelectPartner(partner)}
                        >
                          <Text style={styles.partnerOptionIcon}>
                            {getBusinessTypeIcon(partner.business_type)}
                          </Text>
                          <Text style={[
                            styles.partnerOptionText,
                            selectedPartnerId === partner.id && styles.selectedPartnerOptionText
                          ]}>
                            {partner.business_name}
                          </Text>
                          {selectedPartnerId === partner.id && (
                            <Check size={16} color="#DC2626" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <Input
                label="URL personalizada (opcional)"
                placeholder="https://ejemplo.com o dogcatify://services/123"
                value={promoUrl}
                onChangeText={setPromoUrl}
              />

              <View style={styles.dateSection}>
                <View style={styles.dateInput}>
                  <Input
                    label="Fecha de inicio *"
                    placeholder="YYYY-MM-DD"
                    value={promoStartDate}
                    onChangeText={setPromoStartDate}
                    leftIcon={<Calendar size={20} color="#6B7280" />}
                  />
                </View>
                <View style={styles.dateInput}>
                  <Input
                    label="Fecha de fin *"
                    placeholder="YYYY-MM-DD"
                    value={promoEndDate}
                    onChangeText={setPromoEndDate}
                    leftIcon={<Calendar size={20} color="#6B7280" />}
                  />
                </View>
              </View>

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
              
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowPromotionModal(false);
                    resetForm();
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.createButton, loading && styles.disabledButton]}
                  onPress={handleCreatePromotion}
                  disabled={loading}
                >
                  <Text style={styles.createButtonText}>
                    {loading ? 'Creando...' : 'Crear Promoción'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8,
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
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#3B82F6',
    marginBottom: 8,
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  discountText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  promotionActions: {
    alignItems: 'flex-end',
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
    resizeMode: 'cover',
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
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
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
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
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
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 20,
  },
  discountSection: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  discountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  discountLabel: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  discountInputContainer: {
    marginTop: 8,
  },
  discountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
  },
  discountInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    marginLeft: 8,
    textAlign: 'center',
  },
  percentSymbol: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#DC2626',
    marginLeft: 8,
  },
  discountHint: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  partnerSection: {
    marginBottom: 16,
    position: 'relative',
    zIndex: 1000,
  },
  partnerLabel: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 8,
  },
  partnerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
  },
  partnerSelectorText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    flex: 1,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  partnerDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1001,
    maxHeight: 300,
  },
  partnersList: {
    maxHeight: 200,
  },
  partnerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedPartnerOption: {
    backgroundColor: '#FEF2F2',
  },
  partnerOptionIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  partnerOptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    flex: 1,
  },
  selectedPartnerOptionText: {
    color: '#DC2626',
    fontFamily: 'Inter-Medium',
  },
  dateSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  dateInput: {
    flex: 1,
  },
  imageSection: {
    marginBottom: 20,
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
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#DC2626',
  },
  createButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.6,
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
});