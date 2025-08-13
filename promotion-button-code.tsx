// Código del botón "Agregar Promoción" en el header
<TouchableOpacity 
  style={styles.addButton}
  onPress={() => setShowPromotionModal(true)}
>
  <Plus size={24} color="#FFFFFF" />
</TouchableOpacity>

// Estilos del botón
const styles = StyleSheet.create({
  addButton: {
    backgroundColor: '#DC2626',
    padding: 8,
    borderRadius: 20,
  },
  // ... otros estilos
});

// Estado para controlar el modal
const [showPromotionModal, setShowPromotionModal] = useState(false);

// El modal completo para crear promociones
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
        
        {/* Formulario de promoción */}
        <Input
          label="Título de la promoción *"
          placeholder="Ej: Descuento especial en servicios"
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

        {/* Selección de imagen */}
        <View style={styles.imageSection}>
          <Text style={styles.imageLabel}>Imagen de la promoción</Text>
          
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
                <Text style={styles.imageActionText}>📷 Galería</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Fechas */}
        <Input
          label="Fecha de inicio *"
          placeholder="YYYY-MM-DD"
          value={promoStartDate}
          onChangeText={setPromoStartDate}
        />

        <Input
          label="Fecha de fin *"
          placeholder="YYYY-MM-DD"
          value={promoEndDate}
          onChangeText={setPromoEndDate}
        />

        {/* Configuración de enlaces */}
        <View style={styles.linkSection}>
          <Text style={styles.linkLabel}>Tipo de enlace</Text>
          <View style={styles.linkTypeSelector}>
            <TouchableOpacity
              style={[styles.linkTypeButton, promoLinkType === 'none' && styles.selectedLinkType]}
              onPress={() => setPromoLinkType('none')}
            >
              <Text style={styles.linkTypeText}>Sin enlace</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.linkTypeButton, promoLinkType === 'external' && styles.selectedLinkType]}
              onPress={() => setPromoLinkType('external')}
            >
              <Text style={styles.linkTypeText}>Enlace externo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.linkTypeButton, promoLinkType === 'internal' && styles.selectedLinkType]}
              onPress={() => setPromoLinkType('internal')}
            >
              <Text style={styles.linkTypeText}>Enlace interno</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* URL externa */}
        {promoLinkType === 'external' && (
          <Input
            label="URL externa"
            placeholder="https://ejemplo.com"
            value={promoUrl}
            onChangeText={setPromoUrl}
          />
        )}

        {/* Selección de aliado */}
        <View style={styles.partnerSection}>
          <Text style={styles.partnerLabel}>Aliado asociado (opcional)</Text>
          <TouchableOpacity
            style={styles.partnerSelector}
            onPress={() => setShowPartnerSelector(true)}
          >
            <Text style={styles.partnerSelectorText}>
              {getSelectedPartner()?.businessName || 'Seleccionar aliado...'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Botones de acción */}
        <View style={styles.modalActions}>
          <TouchableOpacity 
            style={styles.cancelModalButton}
            onPress={() => setShowPromotionModal(false)}
          >
            <Text style={styles.cancelModalButtonText}>Cancelar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.createModalButton, loading && styles.disabledButton]}
            onPress={handleCreatePromotion}
            disabled={loading}
          >
            <Text style={styles.createModalButtonText}>
              {loading ? 'Creando...' : 'Crear Promoción'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  </View>
</Modal>

// Función para manejar la creación de promociones
const handleCreatePromotion = async () => {
  console.log('Starting promotion creation...');
  
  if (!promoTitle || !promoDescription || !promoStartDate || !promoEndDate) {
    Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
    return;
  }
  
  // Validar fechas
  const startDate = new Date(promoStartDate);
  const endDate = new Date(promoEndDate);
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    Alert.alert('Error', 'Las fechas ingresadas no son válidas. Usa el formato YYYY-MM-DD');
    return;
  }
  
  if (endDate <= startDate) {
    Alert.alert('Error', 'La fecha de fin debe ser posterior a la fecha de inicio');
    return;
  }
  
  setLoading(true);
  try {
    // Subir imagen si existe
    let imageUrl = null;
    if (promoImage) {
      imageUrl = await uploadImage(promoImage);
    }
    
    // Generar URL del CTA basado en el tipo de enlace
    let ctaUrl = null;
    if (promoLinkType === 'external') {
      ctaUrl = promoUrl.trim();
    } else if (promoLinkType === 'internal' && selectedInternalId) {
      if (internalLinkType === 'service') {
        ctaUrl = `dogcatify://services/${selectedInternalId}`;
      } else if (internalLinkType === 'product') {
        ctaUrl = `dogcatify://products/${selectedInternalId}`;
      } else if (internalLinkType === 'partner') {
        ctaUrl = `dogcatify://partners/${selectedInternalId}`;
      }
    }
    
    // Crear datos de la promoción
    const promotionData = {
      title: promoTitle.trim(),
      description: promoDescription.trim(),
      image_url: imageUrl,
      cta_url: ctaUrl,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
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
    
    // Insertar en la base de datos
    const { data, error } = await supabaseClient
      .from('promotions')
      .insert([promotionData]);
    
    if (error) {
      Alert.alert('Error', `Error de base de datos: ${error.message}`);
      return;
    }
    
    // Limpiar formulario y cerrar modal
    resetForm();
    setShowPromotionModal(false);
    fetchPromotions();
    
    Alert.alert('Éxito', 'Promoción creada correctamente');
  } catch (error) {
    Alert.alert('Error', `Error inesperado: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

// Función para limpiar el formulario
const resetForm = () => {
  setPromoTitle('');
  setPromoDescription('');
  setPromoImage(null);
  setPromoUrl('');
  setPromoStartDate('');
  setPromoEndDate('');
  setPromoTargetAudience('all');
  setPromoLinkType('none');
  setSelectedInternalId(null);
  setSelectedPartnerId(null);
  setPartnerSearchQuery('');
};