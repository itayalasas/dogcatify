import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Calendar, Clock, MapPin, User, Phone, CreditCard } from 'lucide-react-native';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useAuth } from '../../../contexts/AuthContext';
import { supabaseClient } from '@/lib/supabase';
import { createServiceBookingOrder } from '../../../utils/mercadoPago';

export default function ServiceBooking() {
  const { serviceId, partnerId, petId } = useLocalSearchParams<{
    serviceId: string;
    partnerId: string;
    petId: string;
  }>();
  
  const { currentUser } = useAuth();
  
  const [service, setService] = useState<any>(null);
  const [partner, setPartner] = useState<any>(null);
  const [pet, setPet] = useState<any>(null);
  const [partnerSchedule, setPartnerSchedule] = useState<any[]>([]);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
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
        .from('business_schedule')
        .select('*')
        .eq('partner_id', partnerId)
        .eq('is_active', true)
        .order('day_of_week', { ascending: true });
      
      if (error) {
        console.error('Error fetching schedule:', error);
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
        slot_duration: 60,
        max_slots: 8,
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
      
      const dayOfWeek = date.getDay();
      
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
    const startTime = daySchedule.start_time;
    const endTime = daySchedule.end_time;
    const slotDuration = daySchedule.slot_duration || 60;
    
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
    setSelectedTime('');
  };

  const handleTimeSelect = (time: string) => {
    console.log('Hora seleccionada:', time);
    setSelectedTime(time);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-UY', {
      style: 'currency',
      currency: 'UYU',
    }).format(price);
  };

  const formatDateForDisplay = (date: Date) => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    
    return {
      dayName: days[date.getDay()],
      dayNumber: date.getDate(),
      monthName: months[date.getMonth()]
    };
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const handleConfirmBooking = async () => {
    if (!selectedDate || !selectedTime) {
      Alert.alert('Error', 'Por favor selecciona fecha y hora');
      return;
    }

    setBooking(true);
    try {
      console.log('Creating booking with Mercado Pago payment...');
      
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
        
        const { Linking } = require('react-native');
        await Linking.openURL(orderResult.paymentUrl);
        
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

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Service and Pet Info Card */}
        <Card style={styles.serviceInfoCard}>
          {/* Service Info */}
          <View style={styles.serviceSection}>
            <View style={styles.serviceHeader}>
              <View style={styles.serviceLogo}>
                <Text style={styles.serviceIcon}>✂️</Text>
              </View>
              <View style={styles.serviceDetails}>
                <Text style={styles.serviceName}>{service?.name}</Text>
                <Text style={styles.serviceProvider}>{partner?.business_name}</Text>
                <Text style={styles.servicePrice}>{formatPrice(service?.price || 0)}</Text>
              </View>
            </View>
          </View>

          {/* Pet Info */}
          <View style={styles.petSection}>
            <Text style={styles.petSectionTitle}>Mascota seleccionada:</Text>
            <View style={styles.petInfo}>
              <View style={styles.petPhotoContainer}>
                {pet?.photo_url ? (
                  <Image source={{ uri: pet.photo_url }} style={styles.petPhoto} />
                ) : (
                  <View style={styles.petPhotoPlaceholder}>
                    <Text style={styles.petPhotoPlaceholderText}>
                      {pet?.species === 'dog' ? '🐕' : '🐱'}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.petDetails}>
                <Text style={styles.petName}>{pet?.name}</Text>
                <Text style={styles.petBreed}>{pet?.breed}</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Date Selection */}
        <Card style={styles.dateCard}>
          <Text style={styles.sectionTitle}>Selecciona una fecha</Text>
          
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
                const todayCheck = isToday(date);
                const dateInfo = formatDateForDisplay(date);
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dateButton,
                      isSelected && styles.selectedDateButton
                    ]}
                    onPress={() => handleDateSelect(date)}
                  >
                    {todayCheck && (
                      <View style={styles.todayBadge}>
                        <Text style={styles.todayBadgeText}>Hoy</Text>
                      </View>
                    )}
                    <Text style={[
                      styles.dateButtonDay,
                      isSelected && styles.selectedDateButtonText
                    ]}>
                      {dateInfo.dayName}
                    </Text>
                    <Text style={[
                      styles.dateButtonDate,
                      isSelected && styles.selectedDateButtonText
                    ]}>
                      {dateInfo.dayNumber}
                    </Text>
                    <Text style={[
                      styles.dateButtonMonth,
                      isSelected && styles.selectedDateButtonText
                    ]}>
                      {dateInfo.monthName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </Card>

        {/* Time Selection */}
        {selectedDate && (
          <Card style={styles.timeCard}>
            <Text style={styles.sectionTitle}>Selecciona una hora</Text>
            
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
                {availableTimeSlots.map((timeSl, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.timeSlot,
                      selectedTime === timeSl && styles.selectedTimeSlot
                    ]}
                    onPress={() => handleTimeSelect(timeSl)}
                  >
                    <Clock 
                      size={16} 
                      color={selectedTime === timeSl ? '#FFFFFF' : '#6B7280'} 
                    />
                    <Text style={[
                      styles.timeSlotText,
                      selectedTime === timeSl && styles.selectedTimeSlotText
                    ]}>
                      {timeSl}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Card>
        )}

        {/* Notes Section */}
        <Card style={styles.notesCard}>
          <Text style={styles.sectionTitle}>Notas para el proveedor</Text>
          <Input
            placeholder="Agrega cualquier información adicional para el proveedor"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            style={styles.notesInput}
          />
        </Card>
      </ScrollView>

      {/* Bottom Action */}
      {selectedDate && selectedTime && (
        <View style={styles.bottomAction}>
          <Button
            title={booking ? "Procesando pago..." : "Confirmar y Pagar"}
            onPress={handleConfirmBooking}
            disabled={booking}
            style={styles.confirmButton}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
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
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  serviceInfoCard: {
    marginBottom: 16,
    padding: 16,
  },
  serviceSection: {
    marginBottom: 16,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  serviceIcon: {
    fontSize: 24,
  },
  serviceDetails: {
    flex: 1,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  serviceProvider: {
    fontSize: 14,
    color: '#3B82F6',
    marginBottom: 4,
  },
  servicePrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10B981',
  },
  petSection: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
  },
  petSectionTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  petInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  petPhotoContainer: {
    marginRight: 12,
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
  },
  petDetails: {
    flex: 1,
  },
  petName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  petBreed: {
    fontSize: 14,
    color: '#6B7280',
  },
  dateCard: {
    marginBottom: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  noAvailabilityContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noAvailabilityText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  datesScroll: {
    marginHorizontal: -4,
  },
  datesScrollContent: {
    paddingHorizontal: 4,
  },
  dateButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 80,
    position: 'relative',
  },
  selectedDateButton: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  todayBadge: {
    position: 'absolute',
    top: -6,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  todayBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dateButtonDay: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  dateButtonDate: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  dateButtonMonth: {
    fontSize: 12,
    color: '#6B7280',
  },
  selectedDateButtonText: {
    color: '#FFFFFF',
  },
  timeCard: {
    marginBottom: 16,
    padding: 16,
  },
  loadingTimeSlotsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingTimeSlotsText: {
    fontSize: 14,
    color: '#6B7280',
  },
  noTimeSlotsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noTimeSlotsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  timeSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 100,
    justifyContent: 'center',
  },
  selectedTimeSlot: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  timeSlotText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
    fontWeight: '500',
  },
  selectedTimeSlotText: {
    color: '#FFFFFF',
  },
  notesCard: {
    marginBottom: 16,
    padding: 16,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  confirmButton: {
    backgroundColor: '#3B82F6',
  },
});