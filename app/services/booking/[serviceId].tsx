import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Calendar, Clock, MapPin, User } from 'lucide-react-native';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useAuth } from '../../../contexts/AuthContext';
import { supabaseClient } from '@/lib/supabase';

export default function ServiceBooking() {
  const { serviceId, partnerId, petId } = useLocalSearchParams<{
    serviceId: string;
    partnerId: string;
    petId: string;
  }>();
  
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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
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
    } catch (error) {
      console.error('Error fetching booking data:', error);
      Alert.alert('Error', 'No se pudo cargar la información de la reserva');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedDate || !selectedTime) {
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
        date: selectedDate.toISOString().split('T')[0],
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
        [{ text: 'OK', onPress: () => router.back() }]
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
          <Text style={styles.comingSoon}>
            Selección de fecha y hora próximamente disponible
          </Text>
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
          title="Confirmar Reserva"
          onPress={handleConfirmBooking}
          loading={booking}
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
  comingSoon: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
});