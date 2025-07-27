import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Modal, Alert, Image } from 'react-native';
import { Plus, Megaphone, Calendar, Eye, Target, Search, DollarSign, FileText } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { supabaseClient } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { NotificationService } from '../../utils/notifications';

export default function AdminPromotions() {
  const { currentUser } = useAuth();
  const [promotions, setPromotions] = useState<any[]>([]);
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [showPartnerSelector, setShowPartnerSelector] = useState(false);
  const [partnerSearchQuery, setPartnerSearchQuery] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);

  // Promotion form state
  const [promoTitle, setPromoTitle] = useState('');
  const [promoDescription, setPromoDescription] = useState('');
  const [promoImage, setPromoImage] = useState<string | null>(null);
  const [promoStartDate, setPromoStartDate] = useState('');
  const [promoEndDate, setPromoEndDate] = useState('');
  const [promoTargetAudience, setPromoTargetAudience] = useState('all');
  const [loading, setLoading] = useState(false);
  const [promoUrl, setPromoUrl] = useState('');

  // Promotion form
  const [promoLinkType, setPromoLinkType] = useState<'external' | 'internal' | 'none'>('none');
  const [internalLinkType, setInternalLinkType] = useState<'service' | 'product' | 'partner'>('partner');
  const [selectedInternalId, setSelectedInternalId] = useState<string | null>(null);
  const [internalItems, setInternalItems] = useState<any[]>([]);

  // Billing state
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [selectedPromotionForBilling, setSelectedPromotionForBilling] = useState<any>(null);
  const [costPerClick, setCostPerClick] = useState('100');
  const [billingNotes, setBillingNotes] = useState('');
  const [billingLoading, setBillingLoading] = useState(false);

  const [partners, setPartners] = useState<any[]>([]);

  function getSelectedPartner() {
    return partners.find(p => p.id === selectedPartnerId) || null;
  }

  function getFilteredPartners() {
    if (!partnerSearchQuery) return partners;
    return partners.filter(p =>
      p.businessName.toLowerCase().includes(partnerSearchQuery.toLowerCase()) ||
      p.businessType.toLowerCase().includes(partnerSearchQuery.toLowerCase())
    );
  }

  function getBusinessTypeIcon(type: string) {
    if (type === 'Tienda') return '🏪';
    if (type === 'Veterinaria') return '🐾';
    return '🏢';
  }

  useEffect(() => {
    if (!currentUser) {
      console.log('No current user in promotions');
      return;
    }
    const isAdmin = currentUser.email?.toLowerCase() === 'admin@dogcatify.com';
    if (!isAdmin) {
      console.log('User is not admin in promotions');
      return;
    }
    fetchPromotions();
    fetchPartners();
  }, [currentUser]);

  useEffect(() => {
    if (promoLinkType === 'internal') {
      fetchInternalItems();
    }
  }, [internalLinkType, promoLinkType]);

  const fetchPartners = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('partners')
        .select('id, business_name, business_type, logo, is_verified, is_active')
        .eq('is_verified', true)
        .eq('is_active', true)
        .order('business_name', { ascending: true });
      
      if (error) throw error;
      
      const partnersData = data?.map(partner => ({
        id: partner.id,
        businessName: partner.business_name,
        businessType: partner.business_type,
        logo: partner.logo
      })) || [];
      
      setPartners(partnersData);
    } catch (error) {
      console.error('Error fetching partners:', error);
    }
  };

  const fetchInternalItems = async () => {
    try {
      let data, error;
      
      if (internalLinkType === 'service') {
        const result = await supabaseClient
          .from('partner_services')
          .select(`
            id, 
            name, 
            price,
            partners!inner(business_name)
          `)
          .eq('is_active', true)
          .order('name', { ascending: true });
        data = result.data;
        error = result.error;
      } else if (internalLinkType === 'product') {
        const result = await supabaseClient
          .from('partner_products')
          .select(`
            id, 
            name, 
            price,
            partners!inner(business_name)
          `)
          .eq('is_active', true)
          .order('name', { ascending: true });
        data = result.data;
        error = result.error;
      } else if (internalLinkType === 'partner') {
        const result = await supabaseClient
          .from('partners')
          .select('id, business_name, business_type')
          .eq('is_verified', true)
          .eq('is_active', true)
          .order('business_name', { ascending: true });
        data = result.data;
        error = result.error;
      }
      
      if (error) throw error;
      setInternalItems(data || []);
    } catch (error) {
      console.error('Error fetching internal items:', error);
      setInternalItems([]);
    }
  };

  const fetchPromotions = () => {
    const fetchData = async () => {
      try {
        const { data, error } = await supabaseClient
          .from('promotions')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) return;
        const promotionsData = data?.map(item => ({
          id: item.id,
          title: item.title,
          description: item.description,
          imageURL: item.image_url,
          startDate: new Date(item.start_date),
          endDate: new Date(item.end_date),
          targetAudience: item.target_audience,
          isActive: item.is_active,
          views: item.views,
          clicks: item.clicks,
          createdAt: new Date(item.created_at),
          createdBy: item.created_by,
          partnerId: item.partner_id,
          partnerInfo: item.partners ? {
            businessName: item.partners.business_name,
            businessType: item.partners.business_type,
            logo: item.partners.logo,
          } : null,
        })) || [];
        setPromotions(promotionsData);
      } catch (error) {}
    };
    fetchData();
    const subscription = supabaseClient
      .channel('promotions_channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'promotions' },
        () => fetchData()
      )
      .subscribe();
    return () => subscription.unsubscribe();
  };

  const handleSelectImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permisos requeridos', 'Se necesitan permisos para acceder a la galería');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPromoImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (imageUri: string): Promise<string> => {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const filename = `promotions/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
    const { error } = await supabaseClient.storage
      .from('dogcatify')
      .upload(filename, blob);
    if (error) throw error;
    const { data: { publicUrl } } = supabaseClient.storage
      .from('dogcatify')
      .getPublicUrl(filename);
    return publicUrl;
  };

  const handleCreatePromotion = async () => {
    console.log('Starting promotion creation...');
    console.log('Form data:', {
      promoTitle,
      promoDescription,
      promoStartDate,
      promoEndDate,
      promoImage: !!promoImage,
      promoLinkType,
      selectedPartnerId
    });
    
    if (!promoTitle || !promoDescription || !promoStartDate || !promoEndDate) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios: título, descripción, fecha de inicio y fecha de fin');
      return;
    }
    
    // Validate dates
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
    
    // Validate URL if external link is selected
    if (promoLinkType === 'external' && !promoUrl.trim()) {
      Alert.alert('Error', 'Por favor ingresa una URL válida');
      return;
    }
    
    // Validate internal link if selected
    if (promoLinkType === 'internal' && !selectedInternalId) {
      Alert.alert('Error', 'Por favor selecciona un elemento interno');
      return;
    }
    
    setLoading(true);
    try {
      console.log('Uploading image...');
      let imageUrl = null;
      if (promoImage) {
        try {
          imageUrl = await uploadImage(promoImage);
          console.log('Image uploaded successfully:', imageUrl);
        } catch (imageError) {
          console.error('Error uploading image:', imageError);
          Alert.alert('Error', 'No se pudo subir la imagen. Intenta con otra imagen.');
          setLoading(false);
          return;
        }
      }
      
      // Generate CTA URL based on link type
      console.log('Generating CTA URL...');
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
      
      console.log('Creating promotion data...');
      const promotionData: any = {
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
      
      console.log('Inserting promotion into database...', promotionData);
      const { data, error } = await supabaseClient
        .from('promotions')
        .insert([promotionData]);
      
      if (error) {
        console.error('Database error:', error);
        Alert.alert('Error', `Error de base de datos: ${error.message || 'Error desconocido'}`);
        return;
      }
      
      console.log('Promotion created successfully:', data);
      
      // Reset form
      setPromoTitle('');
      setPromoDescription('');
      setPromoImage(null);
      setPromoStartDate('');
      setPromoEndDate('');
      setPromoTargetAudience('all');
      setPromoUrl('');
      setPromoLinkType('none');
      setSelectedInternalId(null);
      setSelectedPartnerId(null);
      setPartnerSearchQuery('');
      setShowPromotionModal(false);
      
      // Refresh promotions list
      fetchPromotions();
      
      Alert.alert('Éxito', 'Promoción creada correctamente');
    } catch (error) {
      console.error('Unexpected error creating promotion:', error);
      Alert.alert('Error', `Error inesperado: ${error.message || 'No se pudo crear la promoción'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePromotion = async (promotionId: string, isActive: boolean) => {
    try {
      // Actualiza el estado local para feedback inmediato
      setPromotions(prev => prev.map(promo => 
        promo.id === promotionId 
          ? { ...promo, isActive: !isActive }
          : promo
      ));
      const { error } = await supabaseClient
        .from('promotions')
        .update({ is_active: !isActive })
        .eq('id', promotionId);
      if (error) {
        // Revierte el estado local si falla la actualización
        setPromotions(prev => prev.map(promo => 
          promo.id === promotionId 
            ? { ...promo, isActive: isActive }
            : promo
        ));
        throw error;
      }
    } catch (error) {
      // Puedes mostrar un alert si quieres
      // Alert.alert('Error', 'No se pudo actualizar el estado de la promoción');
    }
  };

  const handleGenerateBilling = async (promotion: any) => {
    if (!promotion.partnerId) {
      Alert.alert('Error', 'Esta promoción no tiene un aliado asociado');
      return;
    }

    if (!promotion.clicks || promotion.clicks === 0) {
      Alert.alert('Sin clicks', 'Esta promoción no tiene clicks registrados para facturar');
      return;
    }

    setSelectedPromotionForBilling(promotion);
    setCostPerClick('100'); // Default cost per click
    setBillingNotes('');
    setShowBillingModal(true);
  };

  const handleCreateBilling = async () => {
    if (!selectedPromotionForBilling || !costPerClick) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    setBillingLoading(true);
    try {
      console.log('=== BILLING EMAIL DEBUG ===');
      console.log('Selected promotion:', selectedPromotionForBilling.title);
      console.log('Clicks:', selectedPromotionForBilling.clicks);
      
      // Calculate billing amount
      const totalClicks = selectedPromotionForBilling.clicks || 0;
      const costPerClickNum = parseFloat(costPerClick) || 100;
      const totalAmount = totalClicks * costPerClickNum;
      
      console.log('Total amount calculated:', totalAmount);
      
      // Generate PDF content (simple HTML that can be converted to PDF)
      const pdfContent = generateInvoicePDF(selectedPromotionForBilling, totalClicks, costPerClickNum, totalAmount, 'billing@example.com');
      console.log('PDF content generated');

      // Send email with PDF attachment
      const emailResult = await sendBillingEmail('billing@example.com', selectedPromotionForBilling, pdfContent, totalAmount);
      
      if (emailResult.success) {
        // Save billing record to database
        await saveBillingRecord(selectedPromotionForBilling, totalClicks, costPerClickNum, totalAmount, 'billing@example.com');
        
        Alert.alert(
          'Factura enviada',
          `Se ha enviado la factura por $${totalAmount.toLocaleString()} a billing@example.com`
        );
        
        setSelectedPromotionForBilling(null);
        setShowBillingModal(false);
      } else {
        throw new Error(emailResult.error || 'Error al enviar el email');
      }
    } catch (error) {
      console.error('Error sending billing email:', error);
      Alert.alert('Error', 'No se pudo enviar la factura: ' + error.message);
    } finally {
      setBillingLoading(false);
    }
  };
  
  const generateInvoicePDF = (promotion: any, clicks: number, costPerClick: number, totalAmount: number, clientEmail: string) => {
    const invoiceNumber = `INV-${Date.now()}`;
    const currentDate = new Date().toLocaleDateString('es-ES');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Factura - DogCatiFy</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2D6A6F; padding-bottom: 20px; }
          .company-name { font-size: 24px; font-weight: bold; color: #2D6A6F; margin-bottom: 5px; }
          .invoice-title { font-size: 20px; margin-top: 15px; }
          .invoice-info { display: flex; justify-content: space-between; margin: 20px 0; }
          .client-info, .invoice-details { width: 45%; }
          .section-title { font-weight: bold; margin-bottom: 10px; color: #2D6A6F; }
          .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          .table th { background-color: #f8f9fa; font-weight: bold; }
          .total-row { background-color: #f0f9ff; font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">DogCatiFy</div>
          <div>Plataforma de Servicios para Mascotas</div>
          <div class="invoice-title">FACTURA DE PROMOCIÓN</div>
        </div>
        
        <div class="invoice-info">
          <div class="client-info">
            <div class="section-title">Facturar a:</div>
            <div>${clientEmail}</div>
            <div>Promoción: ${promotion.title}</div>
          </div>
          <div class="invoice-details">
            <div class="section-title">Detalles de Factura:</div>
            <div>Número: ${invoiceNumber}</div>
            <div>Fecha: ${currentDate}</div>
            <div>Período: ${promotion.startDate} - ${promotion.endDate}</div>
          </div>
        </div>
        
        <table class="table">
          <thead>
            <tr>
              <th>Descripción</th>
              <th>Cantidad</th>
              <th>Precio Unitario</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Clicks en promoción "${promotion.title}"</td>
              <td>${clicks}</td>
              <td>$${costPerClick.toLocaleString()}</td>
              <td>$${totalAmount.toLocaleString()}</td>
            </tr>
            <tr class="total-row">
              <td colspan="3"><strong>TOTAL A PAGAR</strong></td>
              <td><strong>$${totalAmount.toLocaleString()}</strong></td>
            </tr>
          </tbody>
        </table>
        
        <div class="footer">
          <p>DogCatiFy - Plataforma de Servicios para Mascotas</p>
          <p>Esta factura fue generada automáticamente el ${currentDate}</p>
        </div>
      </body>
      </html>
    `;
  };
  
  const sendBillingEmail = async (email: string, promotion: any, pdfContent: string, totalAmount: number) => {
    try {
      console.log('Sending billing email to:', email);
      
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      const apiUrl = `${supabaseUrl}/functions/v1/send-email`;
      
      const emailData = {
        to: email,
        subject: `Factura de Promoción - ${promotion.title}`,
        text: `Adjunto encontrarás la factura por la promoción "${promotion.title}" por un total de $${totalAmount.toLocaleString()}.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #2D6A6F; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Factura de Promoción</h1>
            </div>
            <div style="padding: 20px; background-color: #f9f9f9;">
              <p>Estimado cliente,</p>
              <p>Adjunto encontrarás la factura correspondiente a la promoción <strong>"${promotion.title}"</strong>.</p>
              <div style="background-color: white; border-left: 4px solid #2D6A6F; padding: 15px; margin: 20px 0;">
                <p><strong>Promoción:</strong> ${promotion.title}</p>
                <p><strong>Total de clicks:</strong> ${promotion.clicks || 0}</p>
                <p><strong>Monto total:</strong> $${totalAmount.toLocaleString()}</p>
              </div>
              <p>Gracias por utilizar DogCatiFy para promocionar tu negocio.</p>
              <p>Saludos cordiales,<br>El equipo de DogCatiFy</p>
            </div>
          </div>
        `,
        attachment: pdfContent // Send HTML content as attachment
      };
      
      console.log('Making API call to:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify(emailData),
      });
      
      console.log('Email API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Email API error:', errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Email sent successfully:', result);
      
      return { success: true, result };
    } catch (error) {
      console.error('Error in sendBillingEmail:', error);
      return { success: false, error: error.message };
    }
  };
  
  const saveBillingRecord = async (promotion: any, clicks: number, costPerClick: number, totalAmount: number, email: string) => {
    try {
      const billingData = {
        promotion_id: promotion.id,
        partner_id: promotion.partnerId,
        total_clicks: clicks,
        cost_per_click: costPerClick,
        total_amount: totalAmount,
        billing_period_start: promotion.startDate.toISOString(),
        billing_period_end: promotion.endDate.toISOString(),
        status: 'pending',
        invoice_number: `INV-${Date.now()}`,
        notes: billingNotes.trim() || null,
        created_at: new Date().toISOString(),
        created_by: currentUser?.id
      };
      
      const { error } = await supabaseClient
        .from('promotion_billing')
        .insert([billingData]);
      
      if (error) throw error;
      
      console.log('Billing record saved successfully');
    } catch (error) {
      console.error('Error saving billing record:', error);
      throw error;
    }
  };
}