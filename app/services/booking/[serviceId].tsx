import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Calendar, Clock, MapPin, User, ChevronDown } from 'lucide-react-native';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useAuth } from '../../../contexts/AuthContext';
import { supabaseClient } from '@/lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';

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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    if (serviceId && partnerId && petId) {
      fetchBookingData();
    } else {
      console.error('Missing required parameters:', { serviceId, partnerId, petId });
      Alert.alert('Error', 'Parámetros de reserva incompletos');
    }
  }, [serviceId, partnerId, petId]);

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
      
      console.log('All booking data fetched successfully');
      
      // Generate available time slots for today and future dates
      generateAvailableTimeSlots();
    } catch (error) {
      console.error('Error fetching booking data:', error);
      Alert.alert('Error', 'No se pudo cargar la información de la reserva');
    } finally {
      setLoading(false);
    }
  };

  const generateAvailableTimeSlots = () => {
    // Generate time slots from 9 AM to 6 PM with 1-hour intervals
    const slots = [];
    for (let hour = 9; hour <= 18; hour++) {
      const timeString = `${hour.toString().padStart(2, '0')}:00`;
      slots.push(timeString);
    }
    setAvailableTimeSlots(slots);
    
    // Set default time to first available slot
    if (slots.length > 0) {
      setSelectedTime(slots[0]);
    }
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      console.log('Fecha seleccionada:', date.toLocaleDateString());
    }
  };

  const handleTimeChange = (event: any, time?: Date) => {
    setShowTimePicker(false);
    if (time) {
      const timeString = time.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      setSelectedTime(timeString);
      console.log('Hora seleccionada:', timeString);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isDateValid = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date >= today;
  };

  const isTimeSlotAvailable = (timeSlot: string) => {
    // For now, all time slots are available
    // In a real app, you would check against existing bookings
    return true;
  };

  const getMinimumDate = () => {
    return new Date(); // Today
  };

  const handleConfirmBooking = async () => {
    if (!selectedDate || !selectedTime || !isDateValid(selectedDate)) {
      Alert.alert('Error', 'Por favor selecciona fecha y hora');
      return;
    }

    setBooking(true);
    try {
      const bookingData = {
        service_id: serviceId,
        partner_id: partnerId,
        customer_id: currentUser!.id,
        pet_id: petId,
        date: selectedDate.toISOString(),
        time: selectedTime,
        status: 'pending',
        notes: notes.trim() || null,
        total_amount: service?.price || 0,
        service_name: service?.name,
        partner_name: partner?.business_name,
        pet_name: pet?.name,
        created_at: new Date().toISOString()
      };

      const { error } = await supabaseClient
        .from('bookings')
        .insert([bookingData]);

      if (error) throw error;

      Alert.alert(
        'Reserva confirmada',
        'Tu reserva ha sido confirmada exitosamente',
        [{ text: 'OK', onPress: () => router.push('/(tabs)/services') }]
      );
    } catch (error) {
      console.error('Error creating booking:', error);
      Alert.alert('Error', 'No se pudo crear la reserva');
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
            {partner?.logo && (
              <Image source={{ uri: partner.logo }} style={styles.partnerLogo} />
            )}
            <View style={styles.partnerDetails}>
              <Text style={styles.partnerName}>{partner?.business_name}</Text>
              <Text style={styles.partnerAddress}>{partner?.address}</Text>
            </View>
          </View>
        </Card>

        {/* Pet Info */}
        <Card style={styles.petCard}>
          <Text style={styles.sectionTitle}>Mascota</Text>
          <View style={styles.petInfo}>
            {pet?.photo_url && (
              <Image source={{ uri: pet.photo_url }} style={styles.petPhoto} />
            )}
            <View style={styles.petDetails}>
              <Text style={styles.petName}>{pet?.name}</Text>
              <Text style={styles.petBreed}>{pet?.breed}</Text>
            </View>
          </View>
        </Card>

        {/* Date Selection */}
        <Card style={styles.dateCard}>
          <Text style={styles.sectionTitle}>Fecha y Hora</Text>
          
          {/* Date Picker */}
          <View style={styles.dateTimeContainer}>
            <Text style={styles.inputLabel}>Fecha de la cita *</Text>
            <TouchableOpacity 
              style={styles.dateTimeButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Calendar size={20} color="#6B7280" />
              <Text style={styles.dateTimeButtonText}>
                {formatDate(selectedDate)}
              </Text>
              <ChevronDown size={20} color="#6B7280" />
            </TouchableOpacity>
            
            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                onChange={handleDateChange}
                minimumDate={getMinimumDate()}
              />
            )}
          </View>

          {/* Time Picker */}
          <View style={styles.dateTimeContainer}>
            <Text style={styles.inputLabel}>Hora de la cita *</Text>
            <TouchableOpacity 
              style={styles.dateTimeButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Clock size={20} color="#6B7280" />
              <Text style={styles.dateTimeButtonText}>
                {selectedTime || 'Seleccionar hora'}
              </Text>
              <ChevronDown size={20} color="#6B7280" />
            </TouchableOpacity>
            
            {showTimePicker && (
              <DateTimePicker
                value={new Date(`2000-01-01T${selectedTime || '09:00'}:00`)}
                mode="time"
                display="default"
                onChange={handleTimeChange}
                is24Hour={true}
              />
            )}
          </View>

          {/* Available Time Slots */}
          {availableTimeSlots.length > 0 && (
            <View style={styles.timeSlotsContainer}>
              <Text style={styles.timeSlotsTitle}>Horarios disponibles:</Text>
              <View style={styles.timeSlots}>
                {availableTimeSlots.map((timeSlot) => (
                  <TouchableOpacity
                    key={timeSlot}
                    style={[
                      styles.timeSlot,
                      selectedTime === timeSlot && styles.selectedTimeSlot,
                      !isTimeSlotAvailable(timeSlot) && styles.unavailableTimeSlot
                    ]}
                    onPress={() => setSelectedTime(timeSlot)}
                    disabled={!isTimeSlotAvailable(timeSlot)}
                  >
                    <Text style={[
                      styles.timeSlotText,
                      selectedTime === timeSlot && styles.selectedTimeSlotText,
                      !isTimeSlotAvailable(timeSlot) && styles.unavailableTimeSlotText
                    ]}>
                      {timeSlot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
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

        <Button
          title={`Confirmar Reserva - ${service?.price ? formatPrice(service.price) : 'Gratis'}`}
          onPress={handleConfirmBooking}
          loading={booking}
          disabled={!selectedDate || !selectedTime || !isDateValid(selectedDate)}
          size="large"
        />
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
    marginBottom: 24,
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
  partnerLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  partnerDetails: {
    flex: 1,
  },
  partnerName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  partnerAddress: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  petInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  petPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
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
  },
  dateTimeContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 8,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 50,
  },
  dateTimeButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    flex: 1,
    marginLeft: 12,
  },
  timeSlotsContainer: {
    marginTop: 16,
  },
  timeSlotsTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 12,
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
    paddingVertical: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  selectedTimeSlot: {
    backgroundColor: '#2D6A6F',
    borderColor: '#2D6A6F',
  },
  unavailableTimeSlot: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    opacity: 0.5,
  },
  timeSlotText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
  },
  selectedTimeSlotText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },
  unavailableTimeSlotText: {
    color: '#9CA3AF',
  },
});