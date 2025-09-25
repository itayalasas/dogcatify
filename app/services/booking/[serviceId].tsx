import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert, Image, TextInput, Modal } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Clock, CreditCard, X, CircleCheck as CheckCircle } from 'lucide-react-native';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useAuth } from '../../../contexts/AuthContext';
import { supabaseClient } from '@/lib/supabase';
import { createServiceBookingOrder } from '../../../utils/mercadoPago';

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
}

const paymentMethods: PaymentMethod[] = [
  {
    id: 'mercadopago',
    name: 'Mercado Pago',
    icon: 'MP',
    description: 'Pago seguro con Mercado Pago',
    color: '#00A650'
  },
  {
    id: 'visa',
    name: 'Visa',
    icon: 'VISA',
    description: 'Tarjeta de crédito o débito',
    color: '#1A1F71'
  },
  {
    id: 'mastercard',
    name: 'Mastercard',
    icon: 'MC',
    description: 'Tarjeta de crédito o débito',
    color: '#EB001B'
  },
  {
    id: 'amex',
    name: 'American Express',
    icon: 'AMEX',
    description: 'Tarjeta de crédito',
    color: '#006FCF'
  },
  {
    id: 'diners',
    name: 'Diners Club',
    icon: 'DC',
    description: 'Tarjeta de crédito',
    color: '#0079BE'
  }
];

const documentTypes = [
  { value: 'CI', label: 'Cédula de Identidad' },
  { value: 'RUT', label: 'RUT' },
  { value: 'PASSPORT', label: 'Pasaporte' },
  { value: 'OTHER', label: 'Otro' }
];

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

  // Payment modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [showCardForm, setShowCardForm] = useState(false);

  // Card form states
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [documentType, setDocumentType] = useState('CI');
  const [documentNumber, setDocumentNumber] = useState('');
  const [showDocumentTypes, setShowDocumentTypes] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

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

  const handleConfirmBooking = () => {
    if (!selectedDate || !selectedTime) {
      Alert.alert('Error', 'Por favor selecciona fecha y hora');
      return;
    }
    setShowPaymentModal(true);
  };

  const handlePaymentMethodSelect = (methodId: string) => {
    setSelectedPaymentMethod(methodId);
    
    if (methodId === 'mercadopago') {
      // Proceder con Mercado Pago
      handleMercadoPagoPayment();
    } else {
      // Mostrar formulario de tarjeta
      setShowPaymentModal(false);
      setTimeout(() => {
        setShowCardForm(true);
      }, 300);
    }
  };

  const handleMercadoPagoPayment = async () => {
    setShowPaymentModal(false);
    setBooking(true);
    
    try {
      console.log('Creating booking with Mercado Pago payment...');
      
      const orderResult = await createServiceBookingOrder({
        serviceId: serviceId!,
        partnerId: partnerId!,
        customerId: currentUser!.id,
        petId: petId!,
        date: selectedDate!,
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

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const handleCardNumberChange = (value: string) => {
    const formatted = formatCardNumber(value);
    if (formatted.replace(/\s/g, '').length <= 16) {
      setCardNumber(formatted);
    }
  };

  const handleExpiryChange = (value: string) => {
    const formatted = formatExpiryDate(value);
    if (formatted.length <= 5) {
      setExpiryDate(formatted);
    }
  };

  const handleCvvChange = (value: string) => {
    const v = value.replace(/[^0-9]/gi, '');
    if (v.length <= 4) {
      setCvv(v);
    }
  };

  const validateCardForm = () => {
    if (!cardholderName.trim()) {
      Alert.alert('Error', 'Por favor ingresa el nombre del titular');
      return false;
    }
    if (!documentNumber.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu número de documento');
      return false;
    }
    if (cardNumber.replace(/\s/g, '').length < 13) {
      Alert.alert('Error', 'Por favor ingresa un número de tarjeta válido');
      return false;
    }
    if (expiryDate.length !== 5) {
      Alert.alert('Error', 'Por favor ingresa una fecha de vencimiento válida (MM/AA)');
      return false;
    }
    if (cvv.length < 3) {
      Alert.alert('Error', 'Por favor ingresa un CVV válido');
      return false;
    }
    return true;
  };

  const handleCardPayment = async () => {
    if (!validateCardForm()) return;

    setProcessingPayment(true);
    try {
      // Simular procesamiento de pago
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Simular éxito/fallo (90% éxito)
      const isSuccess = Math.random() > 0.1;

      if (isSuccess) {
        Alert.alert(
          '¡Pago Exitoso!',
          `Tu reserva ha sido confirmada.\n\nServicio: ${service?.name}\nFecha: ${selectedDate?.toLocaleDateString()}\nHora: ${selectedTime}\nTotal: ${formatPrice(service?.price || 0)}`,
          [{ text: 'OK', onPress: () => router.push('/(tabs)/services') }]
        );
      } else {
        Alert.alert(
          'Pago Rechazado',
          'Tu pago no pudo ser procesado. Por favor verifica los datos de tu tarjeta e intenta nuevamente.',
          [{ text: 'Reintentar' }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error procesando el pago. Intenta nuevamente.');
    } finally {
      setProcessingPayment(false);
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
                <Text style={styles.businessName}>{partner?.business_name}</Text>
                <Text style={styles.serviceName}>{service?.name}</Text>
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
                {availableTimeSlots.map((timeSlot, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.timeSlot,
                      selectedTime === timeSlot && styles.selectedTimeSlot
                    ]}
                    onPress={() => handleTimeSelect(timeSlot)}
                  >
                    <Clock 
                      size={16} 
                      color={selectedTime === timeSlot ? '#FFFFFF' : '#6B7280'} 
                    />
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
          </Card>
        )}

        {/* Notes Section */}
        <Card style={styles.notesCard}>
          <Text style={styles.sectionTitle}>Notas para el proveedor</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Agrega cualquier información adicional para el proveedor"
            placeholderTextColor="#9CA3AF"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </Card>
      </ScrollView>

      {/* Bottom Action Button - Solo aparece cuando fecha y hora están seleccionadas */}
      {selectedDate && selectedTime && (
        <View style={styles.bottomAction}>
          <Card style={styles.bottomCard}>
            <View style={styles.confirmationSummary}>
              <Text style={styles.confirmationText}>
                {selectedDate.toLocaleDateString()} a las {selectedTime}
              </Text>
              <Text style={styles.confirmationPrice}>
                {formatPrice(service?.price || 0)}
              </Text>
            </View>
            <Button
              title="Confirmar Reserva"
              onPress={handleConfirmBooking}
              loading={booking}
              size="large"
              style={styles.confirmButton}
            />
          </Card>
        </View>
      )}

      {/* Payment Method Selection Modal */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.paymentModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecciona método de pago</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.paymentSummary}>
              <Text style={styles.summaryTitle}>Resumen de la reserva</Text>
              <Text style={styles.summaryService}>{service?.name}</Text>
              <Text style={styles.summaryProvider}>{partner?.business_name}</Text>
              <Text style={styles.summaryDateTime}>
                {selectedDate?.toLocaleDateString()} a las {selectedTime}
              </Text>
              <Text style={styles.summaryTotal}>{formatPrice(service?.price || 0)}</Text>
            </View>

            <View style={styles.paymentMethods}>
              {paymentMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={styles.paymentMethodCard}
                  onPress={() => handlePaymentMethodSelect(method.id)}
                >
                  <View style={[styles.paymentMethodIcon, { backgroundColor: method.color }]}>
                    <Text style={styles.paymentMethodIconText}>{method.icon}</Text>
                  </View>
                  <View style={styles.paymentMethodInfo}>
                    <Text style={styles.paymentMethodName}>{method.name}</Text>
                    <Text style={styles.paymentMethodDescription}>{method.description}</Text>
                  </View>
                  <Text style={styles.paymentMethodArrow}>→</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Card Payment Form Modal */}
      <Modal
        visible={showCardForm}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCardForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.cardFormModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pago con Tarjeta</Text>
              <TouchableOpacity onPress={() => setShowCardForm(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.cardFormScroll} showsVerticalScrollIndicator={false}>
              {/* Payment Summary */}
              <View style={styles.cardPaymentSummary}>
                <Text style={styles.cardSummaryTitle}>Total a pagar</Text>
                <Text style={styles.cardSummaryAmount}>{formatPrice(service?.price || 0)}</Text>
                <Text style={styles.cardSummaryService}>{service?.name}</Text>
                <Text style={styles.cardSummaryDate}>
                  {selectedDate?.toLocaleDateString()} a las {selectedTime}
                </Text>
              </View>

              {/* Card Information */}
              <View style={styles.cardSection}>
                <Text style={styles.cardSectionTitle}>Información de la tarjeta</Text>
                
                <View style={styles.cardInputGroup}>
                  <Text style={styles.cardInputLabel}>Número de tarjeta *</Text>
                  <TextInput
                    style={styles.cardInput}
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChangeText={handleCardNumberChange}
                    keyboardType="numeric"
                    maxLength={19}
                    secureTextEntry={false}
                    autoComplete="cc-number"
                  />
                </View>

                <View style={styles.cardRow}>
                  <View style={styles.cardInputHalf}>
                    <Text style={styles.cardInputLabel}>Vencimiento *</Text>
                    <TextInput
                      style={styles.cardInput}
                      placeholder="MM/AA"
                      value={expiryDate}
                      onChangeText={handleExpiryChange}
                      keyboardType="numeric"
                      maxLength={5}
                      autoComplete="cc-exp"
                    />
                  </View>
                  <View style={styles.cardInputHalf}>
                    <Text style={styles.cardInputLabel}>CVV *</Text>
                    <TextInput
                      style={styles.cardInput}
                      placeholder="123"
                      value={cvv}
                      onChangeText={handleCvvChange}
                      keyboardType="numeric"
                      maxLength={4}
                      secureTextEntry={true}
                      autoComplete="cc-csc"
                    />
                  </View>
                </View>
              </View>

              {/* Personal Information */}
              <View style={styles.personalSection}>
                <Text style={styles.cardSectionTitle}>Información personal</Text>
                
                <View style={styles.cardInputGroup}>
                  <Text style={styles.cardInputLabel}>Nombre del titular *</Text>
                  <TextInput
                    style={styles.cardInput}
                    placeholder="Juan Pérez"
                    value={cardholderName}
                    onChangeText={setCardholderName}
                    autoCapitalize="words"
                    autoComplete="name"
                  />
                </View>

                <View style={styles.cardInputGroup}>
                  <Text style={styles.cardInputLabel}>Tipo de documento *</Text>
                  <TouchableOpacity
                    style={styles.documentTypeSelector}
                    onPress={() => setShowDocumentTypes(true)}
                  >
                    <Text style={styles.documentTypeText}>
                      {documentTypes.find(type => type.value === documentType)?.label || 'Seleccionar'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.cardInputGroup}>
                  <Text style={styles.cardInputLabel}>Número de documento *</Text>
                  <TextInput
                    style={styles.cardInput}
                    placeholder="12345678"
                    value={documentNumber}
                    onChangeText={setDocumentNumber}
                    keyboardType="numeric"
                    secureTextEntry={false}
                  />
                </View>
              </View>

              {/* Security Notice */}
              <View style={styles.securityNotice}>
                <Text style={styles.securityText}>
                  🔒 Tu información está protegida con encriptación SSL de 256 bits
                </Text>
              </View>
              {/* Payment Summary */}
              <View style={styles.cardPaymentSummary}>
                <Text style={styles.cardSummaryTitle}>Total a pagar</Text>
                <Text style={styles.cardSummaryAmount}>{formatPrice(service?.price || 0)}</Text>
              </View>

              {/* Card Information */}
              <View style={styles.cardSection}>
                <Text style={styles.cardSectionTitle}>Información de la tarjeta</Text>
                
                <View style={styles.cardInputGroup}>
                  <Text style={styles.cardInputLabel}>Número de tarjeta *</Text>
                  <TextInput
                    style={styles.cardInput}
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChangeText={handleCardNumberChange}
                    keyboardType="numeric"
                    maxLength={19}
                  />
                </View>

                <View style={styles.cardRow}>
                  <View style={styles.cardInputHalf}>
                    <Text style={styles.cardInputLabel}>Vencimiento *</Text>
                    <TextInput
                      style={styles.cardInput}
                      placeholder="MM/AA"
                      value={expiryDate}
                      onChangeText={handleExpiryChange}
                      keyboardType="numeric"
                      maxLength={5}
                    />
                  </View>
                  <View style={styles.cardInputHalf}>
                    <Text style={styles.cardInputLabel}>CVV *</Text>
                    <TextInput
                      style={styles.cardInput}
                      placeholder="123"
                      value={cvv}
                      onChangeText={handleCvvChange}
                      keyboardType="numeric"
                      maxLength={4}
                      secureTextEntry
                    />
                  </View>
                </View>
              </View>

              {/* Personal Information */}
              <View style={styles.personalSection}>
                <Text style={styles.cardSectionTitle}>Información personal</Text>
                
                <View style={styles.cardInputGroup}>
                  <Text style={styles.cardInputLabel}>Nombre del titular *</Text>
                  <TextInput
                    style={styles.cardInput}
                    placeholder="Juan Pérez"
                    value={cardholderName}
                    onChangeText={setCardholderName}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.cardInputGroup}>
                  <Text style={styles.cardInputLabel}>Tipo de documento *</Text>
                  <TouchableOpacity
                    style={styles.documentTypeSelector}
                    onPress={() => setShowDocumentTypes(true)}
                  >
                    <Text style={styles.documentTypeText}>
                      {documentTypes.find(type => type.value === documentType)?.label || 'Seleccionar'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.cardInputGroup}>
                  <Text style={styles.cardInputLabel}>Número de documento *</Text>
                  <TextInput
                    style={styles.cardInput}
                    placeholder="12345678"
                    value={documentNumber}
                    onChangeText={setDocumentNumber}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.cardFormActions}>
              <Button
                title={processingPayment ? "Procesando..." : "Pagar"}
                onPress={handleCardPayment}
                loading={processingPayment}
                size="large"
              />
            </View>
          </View>
        </View>

        {/* Document Type Selection Modal */}
        <Modal
          visible={showDocumentTypes}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDocumentTypes(false)}
        >
          <View style={styles.documentModalOverlay}>
            <View style={styles.documentModal}>
              <Text style={styles.documentModalTitle}>Tipo de Documento</Text>
              {documentTypes.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.documentOption,
                    documentType === type.value && styles.selectedDocumentOption
                  ]}
                  onPress={() => {
                    setDocumentType(type.value);
                    setShowDocumentTypes(false);
                  }}
                >
                  <Text style={[
                    styles.documentOptionText,
                    documentType === type.value && styles.selectedDocumentOptionText
                  ]}>
                    {type.label}
                  </Text>
                  {documentType === type.value && (
                    <CheckCircle size={16} color="#4285F4" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
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

  // Service Info Card
  serviceInfoCard: {
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  serviceSection: {
    marginBottom: 20,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceLogo: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  serviceIcon: {
    fontSize: 28,
    color: '#FFFFFF',
  },
  serviceDetails: {
    flex: 1,
  },
  businessName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 16,
    color: '#4285F4',
    marginBottom: 8,
  },
  servicePrice: {
    fontSize: 20,
    fontWeight: '600',
    color: '#34A853',
  },
  petSection: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 20,
  },
  petSectionTitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  petInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  petPhotoContainer: {
    marginRight: 16,
  },
  petPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  petPhotoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#34A853',
    justifyContent: 'center',
    alignItems: 'center',
  },
  petPhotoPlaceholderText: {
    fontSize: 20,
  },
  petDetails: {
    flex: 1,
  },
  petName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  petBreed: {
    fontSize: 14,
    color: '#9CA3AF',
  },

  // Date Card
  dateCard: {
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
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
    color: '#9CA3AF',
    textAlign: 'center',
  },
  datesScroll: {
    marginHorizontal: -8,
  },
  datesScrollContent: {
    paddingHorizontal: 8,
  },
  dateButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E8EAED',
    minWidth: 65,
    position: 'relative',
  },
  selectedDateButton: {
    backgroundColor: '#4285F4',
    borderColor: '#4285F4',
  },
  todayBadge: {
    position: 'absolute',
    top: -8,
    backgroundColor: '#4285F4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  todayBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dateButtonDay: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  dateButtonDate: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4285F4',
    marginBottom: 2,
  },
  dateButtonMonth: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  selectedDateButtonText: {
    color: '#FFFFFF',
  },

  // Time Card
  timeCard: {
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingTimeSlotsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingTimeSlotsText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  noTimeSlotsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noTimeSlotsText: {
    fontSize: 14,
    color: '#9CA3AF',
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
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E8EAED',
    minWidth: 100,
  },
  selectedTimeSlot: {
    backgroundColor: '#4285F4',
    borderColor: '#4285F4',
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#5F6368',
    marginLeft: 6,
  },
  selectedTimeSlotText: {
    color: '#FFFFFF',
  },

  // Notes Card
  notesCard: {
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  notesInput: {
    fontSize: 16,
    color: '#111827',
    minHeight: 80,
    textAlignVertical: 'top',
    padding: 0,
  },

  // Bottom Action
  bottomAction: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  bottomCard: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  confirmationSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmationText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  confirmationPrice: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#34A853',
  },
  confirmButton: {
    backgroundColor: '#4285F4',
    borderRadius: 16,
  },

  // Payment Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  paymentModalContent: {
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
    fontWeight: '600',
    color: '#111827',
  },
  paymentSummary: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  summaryService: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  summaryProvider: {
    fontSize: 14,
    color: '#4285F4',
    marginBottom: 4,
  },
  summaryDateTime: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  summaryTotal: {
    fontSize: 20,
    fontWeight: '600',
    color: '#34A853',
  },
  paymentMethods: {
    gap: 12,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  paymentMethodIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  paymentMethodIconText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  paymentMethodDescription: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  paymentMethodArrow: {
    fontSize: 18,
    color: '#9CA3AF',
  },

  // Card Form Modal
  cardFormModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  cardFormScroll: {
    flex: 1,
  },
  cardPaymentSummary: {
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  cardSummaryTitle: {
    fontSize: 14,
    color: '#166534',
    marginBottom: 4,
  },
  cardSummaryAmount: {
    fontSize: 24,
    fontWeight: '600',
    color: '#34A853',
  },
  cardSection: {
    marginBottom: 20,
  },
  personalSection: {
    marginBottom: 20,
  },
  cardSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  cardInputGroup: {
    marginBottom: 16,
  },
  cardInputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  cardInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cardInputHalf: {
    flex: 1,
  },
  documentTypeSelector: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  documentTypeText: {
    fontSize: 16,
    color: '#111827',
  },
  cardFormActions: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E8EAED',
  },
  cardPaymentSummary: {
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  cardSummaryTitle: {
    fontSize: 14,
    color: '#166534',
    marginBottom: 4,
  },
  cardSummaryAmount: {
    fontSize: 24,
    fontWeight: '600',
    color: '#34A853',
    marginBottom: 4,
  },
  cardSummaryService: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  cardSummaryDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  cardSection: {
    marginBottom: 20,
  },
  personalSection: {
    marginBottom: 20,
  },
  cardSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  cardInputGroup: {
    marginBottom: 16,
  },
  cardInputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  cardInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    minHeight: 48,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cardInputHalf: {
    flex: 1,
  },
  documentTypeSelector: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
    minHeight: 48,
    justifyContent: 'center',
  },
  documentTypeText: {
    fontSize: 16,
    color: '#111827',
  },
  securityNotice: {
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  securityText: {
    fontSize: 12,
    color: '#166534',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Document Type Modal
  documentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  documentModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 300,
  },
  documentModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  documentOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedDocumentOption: {
    backgroundColor: '#EBF8FF',
  },
  documentOptionText: {
    fontSize: 16,
    color: '#111827',
  },
  selectedDocumentOptionText: {
    color: '#4285F4',
    fontWeight: '500',
  },
});