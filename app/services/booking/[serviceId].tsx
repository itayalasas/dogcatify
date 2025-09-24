import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Calendar, Clock, MapPin, User, ChevronDown, CreditCard } from 'lucide-react-native';
import { Phone } from 'lucide-react-native';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useAuth } from '../../../contexts/AuthContext';
import { supabaseClient } from '@/lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createServiceBookingOrder } from '../../../utils/mercadoPago';

export default function ServiceBooking() {
  const { serviceId, partnerId, petId } = useLocalSearchParams<{
    serviceId: string;
    partnerId: string;
    petId: string;
  }>();
  
  // Logs detallados al montar el componente
  console.log('=== ServiceBooking Component Mount ===');
  console.log('📋 Parámetros recibidos:');
  console.log('  - serviceId:', serviceId);
  console.log('  - partnerId:', partnerId);
  console.log('  - petId:', petId);
  console.log('📍 Ruta actual:', router.pathname);
  console.log('=== End ServiceBooking Mount ===');
  
  const { currentUser } = useAuth();
  
  console.log('=== ServiceBooking Component Mount ===');
  console.log('Received serviceId:', serviceId);
  console.log('Received partnerId:', partnerId);
  console.log('Received petId:', petId);
  console.log('Current route:', router.pathname);
  console.log('=== End ServiceBooking Debug ===');
  
  const [service, setService] = useState<any>(null);
  const [partner, setPartner] = useState<any>(null);
  const [pet, setPet] = useState<any>(null);
  const [partnerSchedule, setPartnerSchedule] = useState<any[]>([]);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);

  useEffect(() => {
    if (serviceId && partnerId && petId) {
      fetchBookingData();
    } else {
      console.error('Missing required parameters:', { serviceId, partnerId, petId });
      Alert.alert('Error', 'Parámetros de reserva incompletos');
    }
  }, [serviceId, partnerId, petId]);

  useEffect(() => {
    if (selectedDate && partnerSchedule.length > 0) {
      fetchAvailableTimeSlots(selectedDate);
    }
  }, [selectedDate, partnerSchedule]);
  
  const fetchBookingData = async () => {
    try {
      console.log('Fetching booking data...');
      
      // Fetch service details
      const { data: serviceData, error: serviceError } = await supabaseClient
        .from('partner_services')
        .select('*')
        .eq('id', serviceId)
        .single();
      
      if (serviceError) throw serviceError;
      setService(serviceData);
      
      // Fetch partner details
      const { data: partnerData, error: partnerError } = await supabaseClient
        .from('partners')
        .select('*')
        .eq('id', partnerId)
        .single();
      
      if (partnerError) throw partnerError;
      setPartner(partnerData);
      
      // Fetch pet details
      const { data: petData, error: petError } = await supabaseClient
        .from('pets')
        .select('*')
        .eq('id', petId)
        .single();
      
      if (petError) throw petError;
      setPet(petData);
      
      // Fetch partner schedule
      await fetchPartnerSchedule();
      
      // Fetch existing bookings
      await fetchExistingBookings();
      
      console.log('All booking data fetched successfully');
    } catch (error) {
      console.error('Error fetching booking data:', error);
      Alert.alert('Error', 'No se pudo cargar la información de la reserva');
    } finally {
      setLoading(false);
    }
  };

  const fetchPartnerSchedule = async () => {
    try {
      console.log('Fetching partner schedule for:', partnerId);
      
      const { data: scheduleData, error } = await supabaseClient
        .from('partner_schedules')
        .select('*')
        .eq('partner_id', partnerId)
        .eq('is_active', true)
        .order('day_of_week', { ascending: true });
      
      if (error) {
        console.error('Error fetching schedule:', error);
        // Si no hay horarios configurados, usar horarios por defecto
        generateDefaultSchedule();
        return;
      }
      
      console.log('Partner schedule found:', scheduleData?.length || 0, 'days');
      setPartnerSchedule(scheduleData || []);
      
      if (!scheduleData || scheduleData.length === 0) {
        generateDefaultSchedule();
      } else {
        generateAvailableDates(scheduleData);
      }
    } catch (error) {
      console.error('Error fetching partner schedule:', error);
      generateDefaultSchedule();
    }
  };

  const generateDefaultSchedule = () => {
    console.log('Generating default schedule (Mon-Fri 9-18)');
    const defaultSchedule = [];
    
    // Lunes a Viernes (1-5), 9:00 AM a 6:00 PM
    for (let day = 1; day <= 5; day++) {
      defaultSchedule.push({
        day_of_week: day,
        start_time: '09:00',
        end_time: '18:00',
        slot_duration: 60, // 60 minutos por cita
        max_slots: 8, // 8 citas por día
        is_active: true
      });
    }
    
    setPartnerSchedule(defaultSchedule);
    generateAvailableDates(defaultSchedule);
  };

  const generateAvailableDates = (schedule: any[]) => {
    const dates = [];
    const today = new Date();
    
    // Generar fechas para los próximos 30 días
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dayOfWeek = date.getDay(); // 0 = Domingo, 1 = Lunes, etc.
      
      // Verificar si el negocio está abierto este día
      const isOpenThisDay = schedule.some(s => s.day_of_week === dayOfWeek && s.is_active);
      
      if (isOpenThisDay) {
        dates.push(date);
      }
    }
    
    console.log('Available dates generated:', dates.length);
    setAvailableDates(dates);
  };

  const fetchExistingBookings = async () => {
    try {
      console.log('Fetching existing bookings for partner:', partnerId);
      
      const { data: bookingsData, error } = await supabaseClient
        .from('bookings')
        .select('date, time, status')
        .eq('partner_id', partnerId)
        .in('status', ['pending', 'confirmed'])
        .gte('date', new Date().toISOString());
      
      if (error) {
        console.error('Error fetching bookings:', error);
        setExistingBookings([]);
        return;
      }
      
      console.log('Existing bookings found:', bookingsData?.length || 0);
      setExistingBookings(bookingsData || []);
    } catch (error) {
      console.error('Error fetching existing bookings:', error);
      setExistingBookings([]);
    }
  };

  const fetchAvailableTimeSlots = async (date: Date) => {
    setLoadingTimeSlots(true);
    try {
      console.log('Fetching time slots for date:', date.toDateString());
      
      const dayOfWeek = date.getDay();
      
      // Encontrar el horario para este día de la semana
      const daySchedule = partnerSchedule.find(s => s.day_of_week === dayOfWeek);
      
      if (!daySchedule) {
        console.log('No schedule found for day:', dayOfWeek);
        setAvailableTimeSlots([]);
        return;
      }
      
      console.log('Day schedule found:', daySchedule);
      
      // Generar slots de tiempo basados en el horario del negocio
      const slots = generateTimeSlotsForDay(daySchedule);
      
      // Filtrar slots que ya están ocupados
      const dateString = date.toISOString().split('T')[0];
      const bookedTimes = existingBookings
        .filter(booking => booking.date.startsWith(dateString))
        .map(booking => booking.time);
      
      const availableSlots = slots.filter(slot => !bookedTimes.includes(slot));
      
      console.log('Generated slots:', slots.length);
      console.log('Booked times:', bookedTimes);
      console.log('Available slots:', availableSlots.length);
      
      setAvailableTimeSlots(availableSlots);
    } catch (error) {
      console.error('Error fetching time slots:', error);
      setAvailableTimeSlots([]);
    } finally {
      setLoadingTimeSlots(false);
    }
  };

  const generateTimeSlotsForDay = (daySchedule: any): string[] => {
    const slots = [];
    const startTime = daySchedule.start_time; // "09:00"
    const endTime = daySchedule.end_time; // "18:00"
    const slotDuration = daySchedule.slot_duration || 60; // minutos
    
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    
    for (let minutes = startMinutes; minutes < endMinutes; minutes += slotDuration) {
      const hour = Math.floor(minutes / 60);
      const minute = minutes % 60;
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(timeString);
    }
    
    return slots;
  };

  const handleDateSelect = (date: Date) => {
    console.log('Fecha seleccionada:', date.toDateString());
    setSelectedDate(date);
    setSelectedTime(''); // Reset selected time when date changes
  };

  const handleTimeSelect = (time: string) => {
    console.log('Hora seleccionada:', time);
    setSelectedTime(time);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateShort = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const isDateValid = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date >= today;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-UY', {
      style: 'currency',
      currency: 'UYU',
    }).format(price);
  };

  const handleConfirmBooking = async () => {
    if (!selectedDate || !selectedTime) {
      Alert.alert('Error', 'Por favor selecciona fecha y hora');
      return;
    }

    setBooking(true);
    try {
      console.log('Creating booking with Mercado Pago payment...');
      
      // Create order and get Mercado Pago payment URL
      const orderResult = await createServiceBookingOrder({
        serviceId: serviceId!,
        partnerId: partnerId!,
        customerId: currentUser!.id,
        petId: petId!,
        date: selectedDate,
        time: selectedTime,
        notes: notes.trim() || null,
        serviceName: service?.name || 'Servicio',
        partnerName: partner?.business_name || 'Proveedor',
        petName: pet?.name || 'Mascota',
        totalAmount: service?.price || 0,
        customerInfo: {
          id: currentUser!.id,
          email: currentUser!.email,
          displayName: currentUser!.displayName || 'Cliente',
          phone: currentUser!.phone || ''
        }
      });
      
      if (orderResult.success && orderResult.paymentUrl) {
        console.log('Order created successfully, redirecting to payment...');
        
        // Redirect to Mercado Pago for payment
        const { Linking } = require('react-native');
        await Linking.openURL(orderResult.paymentUrl);
        
        // Navigate back to services after initiating payment
        router.push('/(tabs)/services');
      } else {
        throw new Error(orderResult.error || 'No se pudo crear la orden de pago');
      }
    } catch (error) {
      console.error('Error creating booking with payment:', error);
      Alert.alert('Error', error.message || 'No se pudo procesar el pago de la reserva');
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando información de reserva...</Text>
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
        <Text style={styles.title}>Reservar Servicio</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Service Info */}
        <Card style={styles.serviceCard}>
          <Text style={styles.sectionTitle}>Servicio</Text>
          <Text style={styles.serviceName}>{service?.name}</Text>
          <Text style={styles.servicePrice}>
            ${service?.price?.toLocaleString()} ARS
          </Text>
          <Text style={styles.serviceDuration}>
            Duración: {service?.duration || 60} minutos
          </Text>
        </Card>

        {/* Partner Info */}
        <Card style={styles.partnerCard}>
          <Text style={styles.sectionTitle}>Proveedor</Text>
          <View style={styles.partnerInfo}>
            <View style={styles.partnerLogoContainer}>
              {partner?.logo ? (
                <Image source={{ uri: partner.logo }} style={styles.partnerLogo} />
              ) : (
                <View style={styles.partnerLogoPlaceholder}>
                  <Text style={styles.partnerLogoPlaceholderText}>
                    {partner?.business_type === 'veterinary' ? '🏥' : 
                     partner?.business_type === 'grooming' ? '✂️' : 
                     partner?.business_type === 'walking' ? '🚶' : 
                     partner?.business_type === 'boarding' ? '🏠' : 
                     partner?.business_type === 'shop' ? '🛍️' : 
                     partner?.business_type === 'shelter' ? '🐾' : '🏢'}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.partnerDetails}>
              <Text style={styles.partnerName}>{partner?.business_name}</Text>
              <View style={styles.partnerAddressContainer}>
                <MapPin size={14} color="#6B7280" />
                <Text style={styles.partnerAddress}>{partner?.address}</Text>
              </View>
              <View style={styles.partnerPhoneContainer}>
                <Phone size={14} color="#6B7280" />
                <Text style={styles.partnerPhone}>{partner?.phone || 'No disponible'}</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Pet Info */}
        <Card style={styles.petCard}>
          <Text style={styles.sectionTitle}>Mascota</Text>
          <View style={styles.petInfo}>
            <View style={styles.petPhotoContainer}>
              {pet?.photo_url ? (
                <Image source={{ uri: pet.photo_url }} style={styles.petPhoto} />
              ) : (
                <View style={styles.petPhotoPlaceholder}>
                  <Text style={styles.petPhotoPlaceholderText}>
                    {pet?.species === 'dog' ? '🐕' : 
                     pet?.species === 'cat' ? '🐱' : '🐾'}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.petDetails}>
              <Text style={styles.petName}>{pet?.name}</Text>
              <Text style={styles.petBreed}>
                {pet?.breed} • {pet?.age} {pet?.age_display?.unit === 'years' ? 'años' : 
                                         pet?.age_display?.unit === 'months' ? 'meses' : 'días'}
              </Text>
              <Text style={styles.petGender}>
                {pet?.gender === 'male' ? '♂️ Macho' : '♀️ Hembra'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Date Selection */}
        <Card style={styles.dateCard}>
          <Text style={styles.sectionTitle}>Fecha y Hora</Text>
          
          {/* Step 1: Date Selection */}
          <View style={styles.dateSelectionContainer}>
            <Text style={styles.stepTitle}>1. Selecciona una fecha</Text>
            {availableDates.length === 0 ? (
              <View style={styles.noAvailabilityContainer}>
                <Text style={styles.noAvailabilityText}>
                  No hay fechas disponibles en este momento
                </Text>
              </View>
            ) : (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.datesScroll}
                contentContainerStyle={styles.datesScrollContent}
              >
                {availableDates.slice(0, 14).map((date, index) => {
                  const isSelected = selectedDate && 
                    date.toDateString() === selectedDate.toDateString();
                  const isToday = date.toDateString() === new Date().toDateString();
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dateButton,
                        isSelected && styles.selectedDateButton,
                        isToday && styles.todayDateButton
                      ]}
                      onPress={() => handleDateSelect(date)}
                    >
                      <Text style={[
                        styles.dateButtonDay,
                        isSelected && styles.selectedDateButtonText,
                        isToday && styles.todayDateButtonText
                      ]}>
                        {formatDateShort(date).split(' ')[0]}
                      </Text>
                      <Text style={[
                        styles.dateButtonDate,
                        isSelected && styles.selectedDateButtonText,
                        isToday && styles.todayDateButtonText
                      ]}>
                        {date.getDate()}
                      </Text>
                      <Text style={[
                        styles.dateButtonMonth,
                        isSelected && styles.selectedDateButtonText,
                        isToday && styles.todayDateButtonText
                      ]}>
                        {formatDateShort(date).split(' ')[1]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Step 2: Time Selection */}
          {selectedDate && (
            <View style={styles.timeSelectionContainer}>
              <Text style={styles.stepTitle}>
                2. Selecciona una hora para {formatDate(selectedDate)}
              </Text>
              
              {loadingTimeSlots ? (
                <View style={styles.loadingTimeSlotsContainer}>
                  <Text style={styles.loadingTimeSlotsText}>
                    Cargando horarios disponibles...
                  </Text>
                </View>
              ) : availableTimeSlots.length === 0 ? (
                <View style={styles.noTimeSlotsContainer}>
                  <Text style={styles.noTimeSlotsText}>
                    No hay horarios disponibles para esta fecha
                  </Text>
                </View>
              ) : (
                <View style={styles.timeSlots}>
                  {availableTimeSlots.map((timeSlot) => (
                    <TouchableOpacity
                      key={timeSlot}
                      style={[
                        styles.timeSlot,
                        selectedTime === timeSlot && styles.selectedTimeSlot
                      ]}
                      onPress={() => handleTimeSelect(timeSlot)}
                    >
                      <Text style={[
                        styles.timeSlotText,
                        selectedTime === timeSlot && styles.selectedTimeSlotText
                      ]}>
                        {timeSlot}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </Card>

        {/* Notes */}
        <Card style={styles.notesCard}>
          <Input
            label="Notas adicionales"
            placeholder="Información adicional para el proveedor..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </Card>
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View style={styles.bottomButtonContainer}>
        <View style={styles.paymentInfo}>
          <CreditCard size={16} color="#6B7280" />
          <Text style={styles.paymentInfoText}>
            Pago seguro con Mercado Pago
          </Text>
        </View>
        <Button
          title={`Pagar y Confirmar - ${service?.price ? formatPrice(service.price) : 'Gratis'}`}
          onPress={handleConfirmBooking}
          loading={booking}
          disabled={!selectedDate || !selectedTime}
          size="large"
        />
      </View>
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
  serviceCard: {
    marginBottom: 16,
  },
  partnerCard: {
    marginBottom: 16,
  },
  petCard: {
    marginBottom: 16,
  },
  dateCard: {
    marginBottom: 16,
  },
  notesCard: {
    marginBottom: 16,
  },
  bottomButtonContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  dateSelectionContainer: {
    marginBottom: 24,
  },
  timeSelectionContainer: {
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  noAvailabilityContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noAvailabilityText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  datesScroll: {
    marginBottom: 8,
  },
  datesScrollContent: {
    paddingHorizontal: 4,
  },
  dateButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    minWidth: 70,
    alignItems: 'center',
  },
  selectedDateButton: {
    backgroundColor: '#2D6A6F',
    borderColor: '#2D6A6F',
  },
  todayDateButton: {
    borderColor: '#3B82F6',
    borderWidth: 2,
  },
  dateButtonDay: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 2,
  },
  dateButtonDate: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 2,
  },
  dateButtonMonth: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  selectedDateButtonText: {
    color: '#FFFFFF',
  },
  todayDateButtonText: {
    color: '#3B82F6',
  },
  loadingTimeSlotsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingTimeSlotsText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  noTimeSlotsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noTimeSlotsText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  timeSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlot: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  selectedTimeSlot: {
    backgroundColor: '#2D6A6F',
    borderColor: '#2D6A6F',
  },
  timeSlotText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  selectedTimeSlotText: {
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  servicePrice: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
    marginBottom: 4,
  },
  serviceDuration: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  partnerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partnerLogoContainer: {
    marginRight: 16,
  },
  partnerLogo: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  partnerLogoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  partnerLogoPlaceholderText: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  partnerDetails: {
    flex: 1,
  },
  partnerName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  partnerAddressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  partnerAddress: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginLeft: 6,
    flex: 1,
  },
  partnerPhoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partnerPhone: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginLeft: 6,
  },
  petInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  petPhotoContainer: {
    marginRight: 16,
  },
  petPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  petPhotoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  petPhotoPlaceholderText: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  petDetails: {
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
    marginBottom: 4,
  },
  petGender: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#3B82F6',
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  paymentInfoText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginLeft: 4,
  },
});