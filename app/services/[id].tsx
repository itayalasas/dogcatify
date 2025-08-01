import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Image, Modal, Alert, Dimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MapPin, Clock, Phone, Calendar, Star, User } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { supabaseClient } from '../../lib/supabase';

const { width } = Dimensions.get('window');

const ServiceDetail = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useAuth();
  const [service, setService] = useState<any>(null);
  const [partnerInfo, setPartnerInfo] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [userPets, setUserPets] = useState<any[]>([]);
  const [selectedPet, setSelectedPet] = useState<string | null>(null);
  const [loadingPets, setLoadingPets] = useState(false);

  useEffect(() => {
    fetchServiceDetails();
    if (currentUser) {
      fetchUserPets();
    }
  }, [id, currentUser]);

  const fetchServiceDetails = async () => {
    try {
      const { data: serviceData, error } = await supabaseClient
        .from('partner_services')
        .select('*')
        .eq('id', id)
        .single();
      
      if (serviceData && !error) {
        setService({
          id: serviceData.id,
          name: serviceData.name,
          description: serviceData.description,
          price: serviceData.price,
          duration: serviceData.duration,
          category: serviceData.category,
          images: serviceData.images,
          partnerId: serviceData.partner_id,
          createdAt: new Date(serviceData.created_at),
        });
        
        // Fetch partner info
        if (serviceData.partner_id) {
          const { data: partnerData, error: partnerError } = await supabaseClient
            .from('partners')
            .select('*')
            .eq('id', serviceData.partner_id)
            .single();
            
          if (partnerData && !partnerError) {
            setPartnerInfo({
              id: partnerData.id,
              businessName: partnerData.business_name,
              businessType: partnerData.business_type,
              address: partnerData.address,
              phone: partnerData.phone,
              logo: partnerData.logo,
              rating: partnerData.rating,
              reviewsCount: partnerData.reviews_count,
            });
          }
        }
      }
      
      // Fetch service reviews
      await fetchServiceReviews();
    } catch (error) {
      console.error('Error fetching service details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchServiceReviews = async () => {
    try {
      const { data: reviewsData, error } = await supabaseClient
        .from('service_reviews')
        .select(`
          *,
          profiles:customer_id(display_name, photo_url),
          pets:pet_id(name)
        `)
        .eq('service_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReviews(reviewsData || []);
      
      // Calculate average rating
      if (reviewsData && reviewsData.length > 0) {
        const avgRating = reviewsData.reduce((sum, review) => sum + review.rating, 0) / reviewsData.length;
        setAverageRating(avgRating);
        setTotalReviews(reviewsData.length);
      }
    } catch (error) {
      console.error('Error fetching service reviews:', error);
    }
  };

  const fetchUserPets = async () => {
    setLoadingPets(true);
    try {
      const { data: petsData, error } = await supabaseClient
        .from('pets')
        .select('*')
        .eq('owner_id', currentUser!.id);
      
      if (petsData && !error) {
        setUserPets(petsData);
      }
    } catch (error) {
      console.error('Error fetching user pets:', error);
    } finally {
      setLoadingPets(false);
    }
  };

  const handleBookService = () => {
    if (!currentUser) {
      Alert.alert('Iniciar sesión', 'Debes iniciar sesión para reservar servicios');
      return;
    }
    
    setShowBookingModal(true);
  };

  const handleSelectPet = (petId: string) => {
    setSelectedPet(petId);
    // Navigate to booking screen with service and pet info
    router.push({
      pathname: '/services/booking',
      params: { 
        serviceId: id,
        partnerId: service.partnerId,
        petId: petId
      }
    });
    setShowBookingModal(false);
  };

  const handleShowReviews = () => {
    setShowReviewsModal(true);
  };

  const calculateReviewPercentages = () => {
    if (reviews.length === 0) return [];
    
    const counts = [0, 0, 0, 0, 0]; // For 1-5 stars
    reviews.forEach(review => {
      if (review.rating >= 1 && review.rating <= 5) {
        counts[review.rating - 1]++;
      }
    });
    
    return counts.map((count, index) => ({
      stars: index + 1,
      count,
      percentage: reviews.length > 0 ? (count / reviews.length) * 100 : 0
    })).reverse(); // Show 5 stars first
  };
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(price);
  };

  const renderStarRating = (rating: number, size: number = 16) => {
    return (
      <View style={styles.starRating}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={size}
            color={star <= rating ? '#F59E0B' : '#E5E7EB'}
            fill={star <= rating ? '#F59E0B' : 'none'}
          />
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando detalles del servicio...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!service) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No se encontró el servicio</Text>
          <Button title="Volver" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace(`/services/partner/${service.partnerId}`)} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Detalle del Servicio</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Partner Profile Card */}
        <Card style={styles.partnerCard}>
          <View style={styles.partnerHeader}>
            {partnerInfo?.logo ? (
              <Image source={{ uri: partnerInfo.logo }} style={styles.partnerLogo} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoPlaceholderText}>
                  {partnerInfo?.businessType === 'veterinary' ? '🏥' : 
                   partnerInfo?.businessType === 'grooming' ? '✂️' : 
                   partnerInfo?.businessType === 'walking' ? '🚶' : 
                   partnerInfo?.businessType === 'boarding' ? '🏠' : 
                   partnerInfo?.businessType === 'shop' ? '🛍️' : '🏢'}
                </Text>
              </View>
            )}
            
            <View style={styles.partnerInfo}>
              <Text style={styles.partnerName}>{partnerInfo?.businessName || 'Negocio'}</Text>
              
              <View style={styles.partnerDetails}>
                <View style={styles.partnerDetail}>
                  <MapPin size={14} color="#6B7280" />
                  <Text style={styles.partnerDetailText} numberOfLines={1}>
                    {partnerInfo?.address || 'Ubicación no disponible'}
                  </Text>
                </View>
                
                <View style={styles.partnerDetail}>
                  <Phone size={14} color="#6B7280" />
                  <Text style={styles.partnerDetailText}>
                    {partnerInfo?.phone || 'Teléfono no disponible'}
                  </Text>
                </View>
              </View>
              
              {averageRating > 0 && (
                <TouchableOpacity style={styles.ratingContainer} onPress={handleShowReviews}>
                  {renderStarRating(averageRating)}
                  <Text style={styles.ratingText}>{averageRating.toFixed(1)}</Text>
                  <Text style={styles.reviewsText}>
                    ({totalReviews} reseñas)
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Card>

        {/* Service Details */}
        <Card style={styles.serviceCard}>
          <Text style={styles.sectionTitle}>Detalles del Servicio</Text>
          
          <Text style={styles.serviceName}>{service.name}</Text>
          
          <View style={styles.serviceDetails}>
            <View style={styles.serviceDetail}>
              <Clock size={16} color="#6B7280" />
              <Text style={styles.serviceDetailText}>
                {service.duration || 60} minutos
              </Text>
            </View>
            
            {averageRating > 0 && (
              <TouchableOpacity style={styles.ratingContainer} onPress={handleShowReviews}>
                {renderStarRating(averageRating)}
                <Text style={styles.ratingText}>{averageRating.toFixed(1)}</Text>
                <Text style={styles.reviewsText}>
                  ({totalReviews} reseñas)
                </Text>
              </TouchableOpacity>
            )}
          </View>
          
          {service.images && service.images.length > 0 && (
            <View style={styles.imagesContainer}>
              <Text style={styles.imagesTitle}>Imágenes</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {service.images.map((imageUrl: string, index: number) => (
                  <Image 
                    key={index} 
                    source={{ uri: imageUrl }} 
                    style={styles.serviceImage} 
                  />
                ))}
              </ScrollView>
            </View>
          )}
        </Card>
        
        <View style={styles.bookingButtonContainer}>
          <Button
            title={`Reservar por ${formatPrice(service.price)}`}
            onPress={handleBookService}
            variant="primary"
          />
        </View>
      </ScrollView>

      {/* Booking Modal */}
      <Modal
        visible={showBookingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBookingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Selecciona tu mascota
              </Text>
              <TouchableOpacity onPress={() => setShowBookingModal(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {loadingPets ? (
              <View style={styles.loadingPetsContainer}>
                <Text style={styles.loadingPetsText}>Cargando mascotas...</Text>
              </View>
            ) : userPets.length === 0 ? (
              <View style={styles.noPetsContainer}>
                <Text style={styles.noPetsTitle}>No tienes mascotas registradas</Text>
                <Text style={styles.noPetsText}>
                  Necesitas registrar al menos una mascota para reservar servicios
                </Text>
                <Button
                  title="Registrar mascota"
                  onPress={() => {
                    setShowBookingModal(false);
                    router.push('/pets/add');
                  }}
                  variant="primary"
                />
              </View>
            ) : (
              <ScrollView style={styles.petsList} showsVerticalScrollIndicator={false}>
                {userPets.map((pet) => (
                  <TouchableOpacity
                    key={pet.id}
                    style={styles.petItem}
                    onPress={() => handleSelectPet(pet.id)}
                  >
                    <View style={styles.petImage}>
                      {pet.photo_url ? (
                        <Image source={{ uri: pet.photo_url }} style={styles.petImage} />
                      ) : (
                        <Text style={styles.logoPlaceholderText}>
                          {pet.species === 'dog' ? '🐕' : 
                           pet.species === 'cat' ? '🐱' : '🐾'}
                        </Text>
                      )}
                    </View>
                    <View style={styles.petInfo}>
                      <Text style={styles.petName}>{pet.name}</Text>
                      <Text style={styles.petBreed}>
                        {pet.breed} • {pet.age} años
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
      
      {/* Reviews Modal */}
      <Modal
        visible={showReviewsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReviewsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Reseñas del servicio
              </Text>
              <TouchableOpacity onPress={() => setShowReviewsModal(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {averageRating > 0 && (
              <View style={styles.overallRating}>
                <View style={styles.ratingDisplay}>
                  <Text style={styles.averageRatingNumber}>
                    {averageRating.toFixed(1)}
                  </Text>
                  {renderStarRating(Math.round(averageRating), 24)}
                </View>
                <Text style={styles.totalReviewsText}>
                  Basado en {totalReviews} reseñas
                </Text>
              </View>
            )}

            {/* Rating Breakdown */}
            {reviews.length > 0 && (
              <View style={styles.ratingBreakdown}>
                <Text style={styles.breakdownTitle}>Distribución de calificaciones</Text>
                {calculateReviewPercentages().map((item) => (
                  <View key={item.stars} style={styles.breakdownRow}>
                    <Text style={styles.breakdownStars}>{item.stars} ⭐</Text>
                    <View style={styles.breakdownBar}>
                      <View 
                        style={[
                          styles.breakdownBarFill, 
                          { width: `${item.percentage}%` }
                        ]} 
                      />
                    </View>
                    <Text style={styles.breakdownPercentage}>
                      {item.percentage.toFixed(0)}%
                    </Text>
                  </View>
                ))}
              </View>
            )}
            
            <ScrollView style={styles.reviewsList} showsVerticalScrollIndicator={false}>
              {reviews.length === 0 ? (
                <View style={styles.noReviewsContainer}>
                  <Text style={styles.noReviewsText}>
                    Aún no hay reseñas para este servicio
                  </Text>
                </View>
              ) : (
                reviews.map((review) => (
                  <View key={review.id} style={styles.reviewItem}>
                    <View style={styles.reviewItemHeader}>
                      <View style={styles.reviewerInfo}>
                        <View style={styles.reviewerAvatar}>
                          {review.profiles?.photo_url ? (
                            <Image 
                              source={{ uri: review.profiles.photo_url }} 
                              style={styles.reviewerAvatarImage} 
                            />
                          ) : (
                            <User size={16} color="#9CA3AF" />
                          )}
                        </View>
                        <View style={styles.reviewerDetails}>
                          <Text style={styles.reviewerName}>
                            {review.profiles?.display_name || 'Usuario'}
                          </Text>
                          <Text style={styles.reviewPetName}>
                            con {review.pets?.name || 'mascota'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.reviewRatingContainer}>
                        {renderStarRating(review.rating, 14)}
                        <Text style={styles.reviewDate}>
                          {new Date(review.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                    
                    {review.comment && (
                      <Text style={styles.reviewComment}>
                        {`"${review.comment}"`}
                      </Text>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  placeholder: {
    width: 40,
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
  partnerCard: {
    marginBottom: 16,
  },
  partnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partnerLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  logoPlaceholderText: {
    fontSize: 32,
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 8,
  },
  partnerDetails: {
    marginBottom: 8,
  },
  partnerDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  partnerDetailText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginLeft: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginLeft: 4,
  },
  reviewsText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginLeft: 4,
  },
  serviceCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 12,
  },
  serviceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  serviceDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceDetailText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginLeft: 4,
  },
  servicePrice: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
  },
  descriptionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  imagesContainer: {
    marginBottom: 16,
  },
  imagesTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  serviceImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 8,
  },
  reviewsCard: {
    marginBottom: 16,
  },
  reviewsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  bookingButtonContainer: {
    marginBottom: 24,
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
    maxHeight: '80%',
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
  modalCloseButton: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 18,
    color: '#6B7280',
  },
  loadingPetsContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingPetsText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  noPetsContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noPetsTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  noPetsText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  petsList: {
    maxHeight: 400,
  },
  petItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  petImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  petInfo: {
    flex: 1,
  },
  petName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  petBreed: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  starRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  overallRating: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  averageRatingNumber: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#F59E0B',
  },
  totalReviewsText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  ratingBreakdown: {
    marginBottom: 20,
  },
  breakdownTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownStars: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    width: 40,
  },
  breakdownBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    marginHorizontal: 12,
  },
  breakdownBarFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 4,
  },
  breakdownPercentage: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    width: 35,
    textAlign: 'right',
  },
  reviewsList: {
    flex: 1,
  },
  reviewItem: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  reviewItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reviewerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  reviewerAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  reviewerDetails: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  reviewPetName: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  reviewRatingContainer: {
    alignItems: 'flex-end',
  },
  reviewDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 4,
  },
  reviewComment: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  noReviewsContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noReviewsText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default ServiceDetail;