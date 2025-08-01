import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, TrendingUp, Users, MapPin, Calendar, Target, Award, ChartBar as BarChart3, ChartPie as PieChart, Activity } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { supabaseClient } from '../../lib/supabase';

const { width } = Dimensions.get('window');

interface BusinessInsights {
  totalPets: number;
  petsBySpecies: { species: string; count: number; percentage: number }[];
  petsByAge: { ageRange: string; count: number; percentage: number }[];
  topBreeds: { breed: string; count: number }[];
  nearbyPets: number;
  servicesDemand: { service: string; count: number; trend: string }[];
  peakHours: { hour: string; bookings: number }[];
  monthlyTrends: { month: string; bookings: number; revenue: number }[];
  opportunities: { type: string; count: number; description: string }[];
  competitorRanking: { position: number; totalPartners: number; rating: number }[];
}

export default function BusinessInsights() {
  const { partnerId } = useLocalSearchParams<{ partnerId: string }>();
  const { currentUser } = useAuth();
  const [insights, setInsights] = useState<BusinessInsights | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1m' | '3m' | '6m' | '1y'>('3m');

  useEffect(() => {
    if (partnerId) {
      fetchPartnerProfile();
      fetchBusinessInsights();
    }
  }, [partnerId, selectedTimeRange]);

  const fetchPartnerProfile = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('partners')
        .select('*')
        .eq('id', partnerId)
        .single();
      
      if (error) throw error;
      
      setPartnerProfile({
        id: data.id,
        businessName: data.business_name,
        businessType: data.business_type,
        address: data.address,
        logo: data.logo,
        rating: data.rating || 0,
        reviewsCount: data.reviews_count || 0,
      });
    } catch (error) {
      console.error('Error fetching partner profile:', error);
    }
  };

  const fetchBusinessInsights = async () => {
    try {
      setLoading(true);
      
      // 1. Total de mascotas registradas
      const { count: totalPets } = await supabaseClient
        .from('pets')
        .select('*', { count: 'exact', head: true });

      // 2. Distribución por especies
      const { data: petsData } = await supabaseClient
        .from('pets')
        .select('species');
      
      const speciesCount = petsData?.reduce((acc: any, pet) => {
        acc[pet.species] = (acc[pet.species] || 0) + 1;
        return acc;
      }, {}) || {};

      const petsBySpecies = Object.entries(speciesCount).map(([species, count]: [string, any]) => ({
        species: species === 'dog' ? 'Perros' : species === 'cat' ? 'Gatos' : species,
        count,
        percentage: Math.round((count / (totalPets || 1)) * 100)
      }));

      // 3. Distribución por edad
      const petsByAge = [
        { ageRange: 'Cachorros (0-1 año)', count: 0, percentage: 0 },
        { ageRange: 'Jóvenes (1-3 años)', count: 0, percentage: 0 },
        { ageRange: 'Adultos (3-7 años)', count: 0, percentage: 0 },
        { ageRange: 'Seniors (7+ años)', count: 0, percentage: 0 },
      ];

      // Calcular distribución por edad (simulado por ahora)
      if (petsData) {
        petsData.forEach(pet => {
          const age = pet.age || 0;
          if (age <= 1) petsByAge[0].count++;
          else if (age <= 3) petsByAge[1].count++;
          else if (age <= 7) petsByAge[2].count++;
          else petsByAge[3].count++;
        });
        
        petsByAge.forEach(ageGroup => {
          ageGroup.percentage = Math.round((ageGroup.count / (totalPets || 1)) * 100);
        });
      }

      // 4. Razas más comunes
      const { data: breedsData } = await supabaseClient
        .from('pets')
        .select('breed');
      
      const breedCount = breedsData?.reduce((acc: any, pet) => {
        if (pet.breed) {
          acc[pet.breed] = (acc[pet.breed] || 0) + 1;
        }
        return acc;
      }, {}) || {};

      const topBreeds = Object.entries(breedCount)
        .sort(([,a]: [string, any], [,b]: [string, any]) => b - a)
        .slice(0, 5)
        .map(([breed, count]: [string, any]) => ({ breed, count }));

      // 5. Demanda de servicios
      const { data: bookingsData } = await supabaseClient
        .from('bookings')
        .select('service_name, created_at')
        .gte('created_at', getDateRange(selectedTimeRange));

      const servicesDemand = bookingsData?.reduce((acc: any, booking) => {
        const service = booking.service_name || 'Otros';
        acc[service] = (acc[service] || 0) + 1;
        return acc;
      }, {}) || {};

      const servicesDemandArray = Object.entries(servicesDemand)
        .sort(([,a]: [string, any], [,b]: [string, any]) => b - a)
        .slice(0, 5)
        .map(([service, count]: [string, any]) => ({
          service,
          count,
          trend: Math.random() > 0.5 ? 'up' : 'down' // Simulado
        }));

      // 6. Horas pico
      const peakHours = [
        { hour: '09:00', bookings: Math.floor(Math.random() * 20) + 5 },
        { hour: '10:00', bookings: Math.floor(Math.random() * 25) + 10 },
        { hour: '11:00', bookings: Math.floor(Math.random() * 30) + 15 },
        { hour: '14:00', bookings: Math.floor(Math.random() * 25) + 10 },
        { hour: '15:00', bookings: Math.floor(Math.random() * 35) + 20 },
        { hour: '16:00', bookings: Math.floor(Math.random() * 30) + 15 },
      ];

      // 7. Oportunidades de mercado
      const opportunities = [
        {
          type: 'Vacunación',
          count: Math.floor(Math.random() * 50) + 20,
          description: 'Mascotas que podrían necesitar vacunas'
        },
        {
          type: 'Peluquería',
          count: Math.floor(Math.random() * 80) + 30,
          description: 'Mascotas sin peluquería en 2+ meses'
        },
        {
          type: 'Paseo',
          count: Math.floor(Math.random() * 60) + 25,
          description: 'Mascotas jóvenes sin servicios de ejercicio'
        },
      ];

      // 8. Ranking competitivo
      const { count: totalPartners } = await supabaseClient
        .from('partners')
        .select('*', { count: 'exact', head: true })
        .eq('business_type', partnerProfile?.businessType)
        .eq('is_verified', true);

      const competitorRanking = [{
        position: Math.floor(Math.random() * (totalPartners || 10)) + 1,
        totalPartners: totalPartners || 0,
        rating: partnerProfile?.rating || 0
      }];

      setInsights({
        totalPets: totalPets || 0,
        petsBySpecies,
        petsByAge,
        topBreeds,
        nearbyPets: Math.floor((totalPets || 0) * 0.15), // Simulado: 15% cerca
        servicesDemand: servicesDemandArray,
        peakHours,
        monthlyTrends: [], // Se puede implementar después
        opportunities,
        competitorRanking
      });

    } catch (error) {
      console.error('Error fetching business insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = (range: string) => {
    const now = new Date();
    const months = range === '1m' ? 1 : range === '3m' ? 3 : range === '6m' ? 6 : 12;
    const startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - months);
    return startDate.toISOString();
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

  const renderMetricCard = (title: string, value: string | number, subtitle?: string, icon?: any, trend?: 'up' | 'down') => (
    <Card style={styles.metricCard}>
      <View style={styles.metricHeader}>
        {icon && <View style={styles.metricIcon}>{icon}</View>}
        <View style={styles.metricContent}>
          <Text style={styles.metricValue}>{value}</Text>
          <Text style={styles.metricTitle}>{title}</Text>
          {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
        </View>
        {trend && (
          <View style={[styles.trendIndicator, trend === 'up' ? styles.trendUp : styles.trendDown]}>
            <TrendingUp size={16} color={trend === 'up' ? '#10B981' : '#EF4444'} />
          </View>
        )}
      </View>
    </Card>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Inteligencia de Negocio</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Activity size={48} color="#2D6A6F" />
          <Text style={styles.loadingText}>Analizando datos del mercado...</Text>
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
        <Text style={styles.title}>Inteligencia de Negocio</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Business Header */}
        <Card style={styles.businessCard}>
          <View style={styles.businessHeader}>
            <Text style={styles.businessIcon}>
              {getBusinessTypeIcon(partnerProfile?.businessType)}
            </Text>
            <View style={styles.businessInfo}>
              <Text style={styles.businessName}>{partnerProfile?.businessName}</Text>
              <Text style={styles.businessType}>Dashboard de Inteligencia Comercial</Text>
            </View>
          </View>
        </Card>

        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          <Text style={styles.timeRangeLabel}>Período de análisis:</Text>
          <View style={styles.timeRangeSelector}>
            {[
              { key: '1m', label: '1M' },
              { key: '3m', label: '3M' },
              { key: '6m', label: '6M' },
              { key: '1y', label: '1A' }
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.timeRangeButton,
                  selectedTimeRange === option.key && styles.selectedTimeRange
                ]}
                onPress={() => setSelectedTimeRange(option.key as any)}
              >
                <Text style={[
                  styles.timeRangeText,
                  selectedTimeRange === option.key && styles.selectedTimeRangeText
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Métricas Principales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Panorama del Mercado</Text>
          <View style={styles.metricsGrid}>
            {renderMetricCard(
              'Total Mascotas',
              insights?.totalPets || 0,
              'Registradas en la plataforma',
              <Users size={24} color="#3B82F6" />
            )}
            {renderMetricCard(
              'En tu Zona',
              insights?.nearbyPets || 0,
              'Mascotas cerca de tu negocio',
              <MapPin size={24} color="#10B981" />
            )}
            {renderMetricCard(
              'Tu Ranking',
              `#${insights?.competitorRanking[0]?.position || 1}`,
              `de ${insights?.competitorRanking[0]?.totalPartners || 1} negocios`,
              <Award size={24} color="#F59E0B" />
            )}
          </View>
        </View>

        {/* Distribución por Especies */}
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>🐾 Distribución por Especies</Text>
          <View style={styles.speciesChart}>
            {insights?.petsBySpecies.map((item, index) => (
              <View key={index} style={styles.speciesItem}>
                <View style={styles.speciesBar}>
                  <View 
                    style={[
                      styles.speciesBarFill,
                      { 
                        width: `${item.percentage}%`,
                        backgroundColor: item.species === 'Perros' ? '#3B82F6' : '#10B981'
                      }
                    ]} 
                  />
                </View>
                <View style={styles.speciesInfo}>
                  <Text style={styles.speciesName}>{item.species}</Text>
                  <Text style={styles.speciesCount}>{item.count} ({item.percentage}%)</Text>
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* Razas Más Comunes */}
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>🏆 Top 5 Razas Más Comunes</Text>
          <View style={styles.breedsList}>
            {insights?.topBreeds.map((breed, index) => (
              <View key={index} style={styles.breedItem}>
                <View style={styles.breedRank}>
                  <Text style={styles.breedRankText}>{index + 1}</Text>
                </View>
                <Text style={styles.breedName}>{breed.breed}</Text>
                <Text style={styles.breedCount}>{breed.count} mascotas</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Demanda de Servicios */}
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>📈 Servicios Más Demandados</Text>
          <View style={styles.servicesList}>
            {insights?.servicesDemand.map((service, index) => (
              <View key={index} style={styles.serviceItem}>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{service.service}</Text>
                  <Text style={styles.serviceCount}>{service.count} reservas</Text>
                </View>
                <View style={[
                  styles.serviceTrend,
                  service.trend === 'up' ? styles.trendUp : styles.trendDown
                ]}>
                  <TrendingUp 
                    size={16} 
                    color={service.trend === 'up' ? '#10B981' : '#EF4444'}
                    style={service.trend === 'down' ? { transform: [{ rotate: '180deg' }] } : {}}
                  />
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* Horas Pico */}
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>⏰ Horas de Mayor Demanda</Text>
          <View style={styles.peakHoursChart}>
            {insights?.peakHours.map((hour, index) => {
              const maxBookings = Math.max(...(insights?.peakHours.map(h => h.bookings) || [1]));
              const height = (hour.bookings / maxBookings) * 100;
              
              return (
                <View key={index} style={styles.hourColumn}>
                  <View style={styles.hourBar}>
                    <View 
                      style={[
                        styles.hourBarFill,
                        { height: `${height}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.hourLabel}>{hour.hour}</Text>
                  <Text style={styles.hourValue}>{hour.bookings}</Text>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Oportunidades de Mercado */}
        <Card style={styles.opportunitiesCard}>
          <Text style={styles.chartTitle}>🎯 Oportunidades de Mercado</Text>
          <Text style={styles.opportunitiesSubtitle}>
            Identifica nichos de mercado para hacer crecer tu negocio
          </Text>
          
          {insights?.opportunities.map((opportunity, index) => (
            <View key={index} style={styles.opportunityItem}>
              <View style={styles.opportunityHeader}>
                <Text style={styles.opportunityType}>{opportunity.type}</Text>
                <View style={styles.opportunityBadge}>
                  <Text style={styles.opportunityCount}>{opportunity.count}</Text>
                </View>
              </View>
              <Text style={styles.opportunityDescription}>{opportunity.description}</Text>
              <TouchableOpacity style={styles.opportunityAction}>
                <Target size={16} color="#3B82F6" />
                <Text style={styles.opportunityActionText}>Crear campaña dirigida</Text>
              </TouchableOpacity>
            </View>
          ))}
        </Card>

        {/* Distribución por Edad */}
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>📅 Distribución por Edad</Text>
          <View style={styles.ageChart}>
            {insights?.petsByAge.map((ageGroup, index) => (
              <View key={index} style={styles.ageItem}>
                <Text style={styles.ageRange}>{ageGroup.ageRange}</Text>
                <View style={styles.ageBar}>
                  <View 
                    style={[
                      styles.ageBarFill,
                      { width: `${ageGroup.percentage}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.agePercentage}>{ageGroup.percentage}%</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Recomendaciones Inteligentes */}
        <Card style={styles.recommendationsCard}>
          <Text style={styles.chartTitle}>🧠 Recomendaciones Inteligentes</Text>
          
          <View style={styles.recommendationItem}>
            <View style={styles.recommendationIcon}>
              <TrendingUp size={20} color="#10B981" />
            </View>
            <View style={styles.recommendationContent}>
              <Text style={styles.recommendationTitle}>Oportunidad de Crecimiento</Text>
              <Text style={styles.recommendationText}>
                Hay {insights?.nearbyPets || 0} mascotas en tu zona. Considera ofrecer promociones para atraer nuevos clientes.
              </Text>
            </View>
          </View>

          <View style={styles.recommendationItem}>
            <View style={styles.recommendationIcon}>
              <Calendar size={20} color="#3B82F6" />
            </View>
            <View style={styles.recommendationContent}>
              <Text style={styles.recommendationTitle}>Horarios Óptimos</Text>
              <Text style={styles.recommendationText}>
                Las horas de 15:00-16:00 tienen mayor demanda. Considera ajustar tu disponibilidad.
              </Text>
            </View>
          </View>

          <View style={styles.recommendationItem}>
            <View style={styles.recommendationIcon}>
              <Target size={20} color="#F59E0B" />
            </View>
            <View style={styles.recommendationContent}>
              <Text style={styles.recommendationTitle}>Segmentación</Text>
              <Text style={styles.recommendationText}>
                {insights?.petsBySpecies[0]?.species || 'Perros'} representan el {insights?.petsBySpecies[0]?.percentage || 0}% del mercado. Enfoca tus servicios en esta audiencia.
              </Text>
            </View>
          </View>
        </Card>
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
    marginTop: 16,
  },
  businessCard: {
    marginBottom: 16,
  },
  businessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  businessIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  businessType: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  timeRangeContainer: {
    marginBottom: 16,
  },
  timeRangeLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 8,
  },
  timeRangeSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  selectedTimeRange: {
    backgroundColor: '#2D6A6F',
  },
  timeRangeText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  selectedTimeRangeText: {
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricIcon: {
    marginRight: 12,
  },
  metricContent: {
    flex: 1,
  },
  metricValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 2,
  },
  metricTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 2,
  },
  metricSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  trendIndicator: {
    padding: 4,
    borderRadius: 8,
  },
  trendUp: {
    backgroundColor: '#D1FAE5',
  },
  trendDown: {
    backgroundColor: '#FEE2E2',
  },
  chartCard: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  speciesChart: {
    gap: 12,
  },
  speciesItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speciesBar: {
    flex: 1,
    height: 24,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
  },
  speciesBarFill: {
    height: '100%',
    borderRadius: 12,
  },
  speciesInfo: {
    minWidth: 100,
  },
  speciesName: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  speciesCount: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  breedsList: {
    gap: 12,
  },
  breedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  breedRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2D6A6F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  breedRankText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  breedName: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  breedCount: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  servicesList: {
    gap: 12,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  serviceCount: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  serviceTrend: {
    padding: 4,
    borderRadius: 8,
  },
  peakHoursChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
    paddingBottom: 20,
  },
  hourColumn: {
    alignItems: 'center',
    flex: 1,
  },
  hourBar: {
    width: 20,
    height: 80,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  hourBarFill: {
    width: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
    minHeight: 4,
  },
  hourLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 2,
  },
  hourValue: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  opportunitiesCard: {
    marginBottom: 16,
  },
  opportunitiesSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 16,
  },
  opportunityItem: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  opportunityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  opportunityType: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  opportunityBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  opportunityCount: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  opportunityDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    marginBottom: 12,
    lineHeight: 20,
  },
  opportunityAction: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  opportunityActionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#3B82F6',
    marginLeft: 6,
  },
  ageChart: {
    gap: 12,
  },
  ageItem: {
    marginBottom: 12,
  },
  ageRange: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#111827',
    marginBottom: 8,
  },
  ageBar: {
    height: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 4,
  },
  ageBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 10,
  },
  agePercentage: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'right',
  },
  recommendationsCard: {
    marginBottom: 24,
  },
  recommendationItem: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  recommendationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 18,
  },
});