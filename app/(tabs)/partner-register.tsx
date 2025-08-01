import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  SafeAreaView,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Camera, Image as ImageIcon, MapPin, Check, DollarSign } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface BusinessType {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface Country {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
  country_id: string;
}

interface GeocodingResult {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
}

const businessTypes: BusinessType[] = [
  {
    id: 'veterinary',
    name: 'Veterinaria',
    description: 'Servicios médicos para mascotas',
    icon: '🏥',
  },
  {
    id: 'petshop',
    name: 'Pet Shop',
    description: 'Venta de productos para mascotas',
    icon: '🛍️',
  },
  {
    id: 'grooming',
    name: 'Peluquería',
    description: 'Servicios de estética y cuidado',
    icon: '✂️',
  },
  {
    id: 'hotel',
    name: 'Hotel/Guardería',
    description: 'Hospedaje y cuidado temporal',
    icon: '🏨',
  },
  {
    id: 'training',
    name: 'Entrenamiento',
    description: 'Adiestramiento y educación',
    icon: '🎯',
  },
  {
    id: 'shelter',
    name: 'Refugio',
    description: 'Adopción y rescate de mascotas',
    icon: '🏠',
  },
];

export default function PartnerRegister() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Form data
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  
  // Address data
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [department, setDepartment] = useState('');
  const [departmentInput, setDepartmentInput] = useState('');
  const [showDepartmentSuggestions, setShowDepartmentSuggestions] = useState(false);
  const [departmentSuggestions, setDepartmentSuggestions] = useState<Department[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [postalCode, setPostalCode] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  
  // Geocoding
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodingResults, setGeocodingResults] = useState<GeocodingResult[]>([]);
  
  // Images
  const [logo, setLogo] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  
  // Shipping
  const [hasShipping, setHasShipping] = useState(false);
  const [shippingCost, setShippingCost] = useState('');
  
  // Data
  const [countries, setCountries] = useState<Country[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    loadCountries();
    loadDepartments();
  }, []);

  const loadCountries = async () => {
    try {
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setCountries(data || []);
    } catch (error) {
      console.error('Error loading countries:', error);
    }
  };

  const loadDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const handleDepartmentInputChange = (text: string) => {
    setDepartmentInput(text);
    setDepartment(text);
    
    if (text.length > 0) {
      const filtered = departments.filter(dept =>
        dept.name.toLowerCase().includes(text.toLowerCase()) &&
        (!selectedCountry || dept.country_id === selectedCountry.id)
      );
      setDepartmentSuggestions(filtered);
      setShowDepartmentSuggestions(true);
    } else {
      setShowDepartmentSuggestions(false);
    }
  };

  const selectDepartment = (dept: Department) => {
    setDepartment(dept.name);
    setDepartmentInput(dept.name);
    setShowDepartmentSuggestions(false);
  };

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setShowCountryModal(false);
    setDepartment('');
    setDepartmentInput('');
  };

  const geocodeAddress = async () => {
    if (!address || !city) {
      Alert.alert('Error', 'Por favor ingresa la dirección y ciudad');
      return;
    }

    setIsGeocoding(true);
    try {
      const fullAddress = `${address}, ${city}, ${department}, ${selectedCountry?.name || ''}`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=5`
      );
      const results = await response.json();
      
      if (results.length > 0) {
        setGeocodingResults(results);
      } else {
        Alert.alert('Sin resultados', 'No se encontraron coordenadas para esta dirección');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      Alert.alert('Error', 'Error al buscar coordenadas');
    } finally {
      setIsGeocoding(false);
    }
  };

  const selectGeocodingResult = (result: GeocodingResult) => {
    setLatitude(parseFloat(result.lat));
    setLongitude(parseFloat(result.lon));
    setGeocodingResults([]);
  };

  const pickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos requeridos', 'Necesitamos permisos para acceder a tus fotos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setLogo(result.assets[0].uri);
    }
  };

  const pickGalleryImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos requeridos', 'Necesitamos permisos para acceder a tus fotos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newImages = result.assets.map(asset => asset.uri);
      setGalleryImages(prev => [...prev, ...newImages].slice(0, 5)); // Max 5 images
    }
  };

  const uploadImage = async (uri: string, path: string): Promise<string | null> => {
    try {
      console.log('Uploading image to path:', path);
      
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      console.log('Image blob size:', blob.size, 'bytes');

      const { data, error } = await supabase.storage
        .from('dogcatify')
        .upload(path, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('dogcatify')
        .getPublicUrl(path);

      return publicUrl;
    } catch (error) {
      console.error('Error in uploadImage:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'Usuario no autenticado');
      return;
    }

    if (!businessName || !businessType || !address || !city || !phone) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    if (!selectedCountry) {
      Alert.alert('Error', 'Por favor selecciona un país');
      return;
    }

    setLoading(true);

    try {
      let logoUrl = null;
      let galleryUrls: string[] = [];

      // Upload logo if exists
      if (logo) {
        try {
          console.log('Uploading logo...');
          const logoPath = `partners/${user.id}/${Date.now()}_logo.jpg`;
          logoUrl = await uploadImage(logo, logoPath);
          console.log('Logo uploaded successfully:', logoUrl);
        } catch (error) {
          console.error('Error uploading logo:', error);
          const shouldContinue = await new Promise((resolve) => {
            Alert.alert(
              'Error al subir logo',
              '¿Deseas continuar sin logo?',
              [
                { text: 'Cancelar', onPress: () => resolve(false) },
                { text: 'Continuar', onPress: () => resolve(true) }
              ]
            );
          });
          if (!shouldContinue) {
            setLoading(false);
            return;
          }
        }
      }

      // Upload gallery images if exist
      if (galleryImages.length > 0) {
        try {
          console.log('Uploading gallery images...');
          for (let i = 0; i < galleryImages.length; i++) {
            const imagePath = `partners/${user.id}/${Date.now()}_gallery_${i}.jpg`;
            const imageUrl = await uploadImage(galleryImages[i], imagePath);
            if (imageUrl) {
              galleryUrls.push(imageUrl);
            }
          }
          console.log('Gallery images uploaded successfully:', galleryUrls);
        } catch (error) {
          console.error('Error uploading gallery:', error);
          const shouldContinue = await new Promise((resolve) => {
            Alert.alert(
              'Error al subir galería',
              '¿Deseas continuar sin galería?',
              [
                { text: 'Cancelar', onPress: () => resolve(false) },
                { text: 'Continuar', onPress: () => resolve(true) }
              ]
            );
          });
          if (!shouldContinue) {
            setLoading(false);
            return;
          }
        }
      }

      // Build complete address
      const completeAddress = [address, neighborhood, city, department, selectedCountry.name, postalCode]
        .filter(Boolean)
        .join(', ');

      // Create partner application
      const { error } = await supabase
        .from('partner_applications')
        .insert({
          user_id: user.id,
          business_name: businessName,
          business_type: businessType,
          description,
          phone,
          whatsapp: whatsapp || null,
          website: website || null,
          instagram: instagram || null,
          facebook: facebook || null,
          address: completeAddress,
          neighborhood: neighborhood || null,
          city,
          department,
          country: selectedCountry.name,
          postal_code: postalCode || null,
          latitude,
          longitude,
          logo_url: logoUrl,
          gallery_images: galleryUrls,
          has_shipping: hasShipping,
          shipping_cost: hasShipping ? parseFloat(shippingCost) || 0 : null,
          status: 'pending'
        });

      if (error) {
        console.error('Error registering partner:', error);
        throw error;
      }

      Alert.alert(
        'Solicitud Enviada',
        'Tu solicitud ha sido enviada exitosamente. Te notificaremos cuando sea revisada.',
        [{ text: 'OK', onPress: () => router.back() }]
      );

    } catch (error) {
      console.error('Error registering partner:', error);
      Alert.alert('Error', 'Hubo un problema al enviar tu solicitud. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Registro de Aliado</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.introCard}>
          <Text style={styles.introTitle}>¡Únete a nuestra red de aliados!</Text>
          <Text style={styles.introDescription}>
            Completa el formulario para solicitar ser parte de nuestra comunidad de negocios pet-friendly.
          </Text>
        </Card>

        <Card style={styles.formCard}>
          <Text style={styles.sectionTitle}>Información del Negocio</Text>
          
          <Input
            label="Nombre del negocio *"
            placeholder="Ej: Veterinaria San Martín"
            value={businessName}
            onChangeText={setBusinessName}
          />

          <Text style={styles.sectionTitle}>Tipo de Negocio *</Text>
          <View style={styles.businessTypes}>
            {businessTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.businessType,
                  businessType === type.id && styles.selectedBusinessType
                ]}
                onPress={() => setBusinessType(type.id)}
              >
                <Text style={styles.businessTypeIcon}>{type.icon}</Text>
                <Text style={[
                  styles.businessTypeName,
                  businessType === type.id && styles.selectedBusinessTypeName
                ]}>
                  {type.name}
                </Text>
                <Text style={styles.businessTypeDescription}>{type.description}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Descripción"
            placeholder="Describe tu negocio y servicios..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          <View style={styles.imageSection}>
            <Text style={styles.sectionTitle}>Logo del Negocio</Text>
            <TouchableOpacity onPress={pickLogo} style={styles.logoSelector}>
              {logo ? (
                <Image source={{ uri: logo }} style={styles.logoPreview} />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Camera size={32} color="#9CA3AF" />
                  <Text style={styles.logoPlaceholderText}>Subir Logo</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Galería de Fotos</Text>
            <TouchableOpacity onPress={pickGalleryImages} style={styles.gallerySelector}>
              <ImageIcon size={20} color="#3B82F6" />
              <Text style={styles.gallerySelectorText}>
                Agregar Fotos ({galleryImages.length}/5)
              </Text>
            </TouchableOpacity>
            
            {galleryImages.length > 0 && (
              <ScrollView horizontal style={styles.imagePreview}>
                {galleryImages.map((uri, index) => (
                  <Image key={index} source={{ uri }} style={styles.previewImage} />
                ))}
              </ScrollView>
            )}
          </View>

          <Text style={styles.sectionTitle}>Información de Contacto</Text>
          
          <Input
            label="Teléfono *"
            placeholder="Ej: +57 300 123 4567"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Input
            label="WhatsApp"
            placeholder="Ej: +57 300 123 4567"
            value={whatsapp}
            onChangeText={setWhatsapp}
            keyboardType="phone-pad"
          />

          <Input
            label="Sitio Web"
            placeholder="Ej: https://miveterinaria.com"
            value={website}
            onChangeText={setWebsite}
            keyboardType="url"
          />

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Input
                label="Instagram"
                placeholder="@usuario"
                value={instagram}
                onChangeText={setInstagram}
              />
            </View>
            <View style={styles.halfWidth}>
              <Input
                label="Facebook"
                placeholder="@pagina"
                value={facebook}
                onChangeText={setFacebook}
              />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Ubicación</Text>
          
          <TouchableOpacity
            onPress={() => setShowCountryModal(true)}
            style={[styles.input, !selectedCountry && styles.disabledInput]}
          >
            <Text style={[styles.inputText, !selectedCountry && styles.disabledText]}>
              {selectedCountry ? selectedCountry.name : 'Seleccionar País *'}
            </Text>
          </TouchableOpacity>

          <View style={styles.departmentInputGroup}>
            <Input
              label="Departamento/Estado *"
              placeholder="Ej: Cundinamarca"
              value={departmentInput}
              onChangeText={handleDepartmentInputChange}
            />
            {showDepartmentSuggestions && departmentSuggestions.length > 0 && (
              <ScrollView style={styles.departmentSuggestions} nestedScrollEnabled>
                {departmentSuggestions.map((dept) => (
                  <TouchableOpacity
                    key={dept.id}
                    style={styles.departmentSuggestion}
                    onPress={() => selectDepartment(dept)}
                  >
                    <Text style={styles.departmentSuggestionText}>{dept.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          <Input
            label="Ciudad *"
            placeholder="Ej: Bogotá"
            value={city}
            onChangeText={setCity}
          />

          <Input
            label="Barrio/Zona"
            placeholder="Ej: Chapinero"
            value={neighborhood}
            onChangeText={setNeighborhood}
          />

          <Input
            label="Dirección *"
            placeholder="Ej: Calle 123 #45-67"
            value={address}
            onChangeText={setAddress}
          />

          <Input
            label="Código Postal"
            placeholder="Ej: 110111"
            value={postalCode}
            onChangeText={setPostalCode}
            keyboardType="numeric"
          />

          <View style={styles.geocodingSection}>
            <Button
              title={isGeocoding ? "Buscando..." : "Obtener Coordenadas GPS"}
              onPress={geocodeAddress}
              loading={isGeocoding}
              leftIcon={<MapPin size={16} color="#FFFFFF" />}
            />
            <Text style={styles.geocodingHint}>
              Las coordenadas GPS ayudan a los usuarios a encontrar tu negocio más fácilmente
            </Text>
          </View>

          {geocodingResults.length > 0 && (
            <View style={styles.geocodingResults}>
              <Text style={styles.geocodingResultsTitle}>Selecciona la ubicación correcta:</Text>
              {geocodingResults.map((result, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.geocodingResultItem}
                  onPress={() => selectGeocodingResult(result)}
                >
                  <Text style={styles.geocodingResultAddress}>{result.display_name}</Text>
                  <Text style={styles.geocodingResultType}>Tipo: {result.type}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.cancelGeocodingButton}
                onPress={() => setGeocodingResults([])}
              >
                <Text style={styles.cancelGeocodingText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          )}

          {latitude && longitude && (
            <View style={styles.coordinatesDisplay}>
              <Text style={styles.coordinatesTitle}>📍 Coordenadas Confirmadas</Text>
              <Text style={styles.coordinatesText}>Latitud: {latitude.toFixed(6)}</Text>
              <Text style={styles.coordinatesText}>Longitud: {longitude.toFixed(6)}</Text>
              <Text style={styles.coordinatesNote}>✅ Tu negocio será fácil de encontrar</Text>
            </View>
          )}

          {businessType === 'petshop' && (
            <View style={styles.shippingSection}>
              <View style={styles.shippingHeader}>
                <Text style={styles.shippingTitle}>Opciones de Envío</Text>
              </View>
              
              <TouchableOpacity
                style={styles.shippingCheckbox}
                onPress={() => setHasShipping(!hasShipping)}
              >
                <View style={[styles.checkbox, hasShipping && styles.checkedCheckbox]}>
                  {hasShipping && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Ofrece servicio de envío</Text>
              </TouchableOpacity>
              
              {hasShipping && (
                <Input
                  label="Costo de envío"
                  placeholder="Ej: 500"
                  value={shippingCost}
                  onChangeText={setShippingCost}
                  keyboardType="numeric"
                  leftIcon={<DollarSign size={20} color="#6B7280" />}
                />
              )}
            </View>
          )}

          <Button
            title="Enviar Solicitud"
            onPress={handleSubmit}
            loading={loading}
            size="large"
          />
        </Card>
      </ScrollView>

      {/* Modal de selección de país */}
      <Modal
        visible={showCountryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCountryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar País</Text>
              <TouchableOpacity onPress={() => setShowCountryModal(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.optionsList}>
              {countries.map((country) => (
                <TouchableOpacity
                  key={country.id}
                  style={[
                    styles.optionItem,
                    selectedCountry?.id === country.id && styles.selectedOptionItem
                  ]}
                  onPress={() => handleCountrySelect(country)}
                >
                  <Text style={[
                    styles.optionText,
                    selectedCountry?.id === country.id && styles.selectedOptionText
                  ]}>
                    {country.name}
                  </Text>
                  {selectedCountry?.id === country.id && (
                    <Check size={16} color="#2D6A6F" />
                  )}
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
    padding: 6,
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
  },
  introCard: {
    margin: 16,
    marginBottom: 8,
  },
  introTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  introDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  formCard: {
    margin: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  businessTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  businessType: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  selectedBusinessType: {
    backgroundColor: '#EBF8FF',
    borderColor: '#3B82F6',
  },
  businessTypeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  businessTypeName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  selectedBusinessTypeName: {
    color: '#3B82F6',
  },
  businessTypeDescription: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  imageSection: {
    marginBottom: 20,
  },
  logoSelector: {
    alignItems: 'center',
  },
  logoPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  logoPlaceholderText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 4,
  },
  gallerySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF8FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  gallerySelectorText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#3B82F6',
    marginLeft: 8,
  },
  imagePreview: {
    flexDirection: 'row',
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  inputText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  disabledInput: {
    backgroundColor: '#F9FAFB',
    color: '#9CA3AF',
  },
  disabledText: {
    color: '#9CA3AF',
  },
  departmentInputGroup: {
    position: 'relative',
    zIndex: 1000,
  },
  departmentSuggestions: {
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
    maxHeight: 200,
  },
  departmentSuggestion: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  departmentSuggestionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#374151',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  geocodingSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  geocodingHint: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#0369A1',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
  geocodingResults: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  geocodingResultsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    padding: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  geocodingResultItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  geocodingResultAddress: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#111827',
    marginBottom: 4,
    lineHeight: 20,
  },
  geocodingResultType: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  cancelGeocodingButton: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  cancelGeocodingText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  coordinatesDisplay: {
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 16,
  },
  coordinatesTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#166534',
    marginBottom: 8,
  },
  coordinatesText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#166534',
    marginBottom: 2,
  },
  coordinatesNote: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#059669',
    marginTop: 8,
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
  modalCloseText: {
    fontSize: 18,
    color: '#6B7280',
  },
  optionsList: {
    maxHeight: 400,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedOptionItem: {
    backgroundColor: '#F0F9FF',
  },
  optionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    flex: 1,
  },
  selectedOptionText: {
    color: '#2D6A6F',
    fontFamily: 'Inter-Medium',
  },
  shippingSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  shippingHeader: {
    marginBottom: 16,
  },
  shippingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  shippingCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedCheckbox: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
});