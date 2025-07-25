import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert, Image } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, ShoppingCart, Plus, Minus, Trash2, Truck } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { supabaseClient } from '../../lib/supabase';
import { createMultiPartnerOrder } from '../../utils/mercadoPago';

export default function Cart() {
  const { currentUser } = useAuth();
  const { cart, removeFromCart, updateQuantity, clearCart, getCartTotal } = useCart();
  const [shippingAddress, setShippingAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingShipping, setLoadingShipping] = useState(true);
  const [partnerShippingInfo, setPartnerShippingInfo] = useState<{[key: string]: {
    name: string;
    hasShipping: boolean;
    cost: number;
  }}>({});

  useEffect(() => {
    if (cart.length > 0) {
      fetchShippingInfo();
    } else {
      setPartnerShippingInfo({});
      setLoadingShipping(false);
    }
  }, [cart]);

  const fetchShippingInfo = async () => {
    setLoadingShipping(true);
    try {
      // Get unique partner IDs from cart
      const partnerIds = [...new Set(cart.map(item => item.partnerId))];
      
      console.log('Fetching shipping info for partners:', partnerIds);
      
      // Fetch shipping information for each partner
      const shippingInfo: {[key: string]: any} = {};
      
      for (const partnerId of partnerIds) {
        try {
          const { data: partnerData, error } = await supabaseClient
            .from('partners')
            .select('business_name, has_shipping, shipping_cost')
            .eq('id', partnerId)
            .single();
          
          if (error) {
            console.error(`Error fetching partner ${partnerId}:`, error);
            // Set default values if partner not found
            shippingInfo[partnerId] = {
              name: cart.find(item => item.partnerId === partnerId)?.partnerName || 'Tienda',
              hasShipping: false,
              cost: 0
            };
          } else {
            shippingInfo[partnerId] = {
              name: partnerData.business_name,
              hasShipping: partnerData.has_shipping || false,
              cost: partnerData.shipping_cost || 0
            };
          }
          
          console.log(`Partner ${partnerId} shipping info:`, shippingInfo[partnerId]);
        } catch (error) {
          console.error(`Error processing partner ${partnerId}:`, error);
          // Set default values on error
          shippingInfo[partnerId] = {
            name: cart.find(item => item.partnerId === partnerId)?.partnerName || 'Tienda',
            hasShipping: false,
            cost: 0
          };
        }
      }
      
      setPartnerShippingInfo(shippingInfo);
      console.log('Final shipping info:', shippingInfo);
    } catch (error) {
      console.error('Error fetching shipping info:', error);
      // Set default shipping info for all partners
      const defaultShippingInfo: {[key: string]: any} = {};
      const partnerIds = [...new Set(cart.map(item => item.partnerId))];
      
      partnerIds.forEach(partnerId => {
        defaultShippingInfo[partnerId] = {
          name: cart.find(item => item.partnerId === partnerId)?.partnerName || 'Tienda',
          hasShipping: false,
          cost: 0
        };
      });
      
      setPartnerShippingInfo(defaultShippingInfo);
    } finally {
      setLoadingShipping(false);
    }
  };

  const calculateShipping = () => {
    if (loadingShipping) return 0;
    
    let totalShipping = 0;
    
    Object.values(partnerShippingInfo).forEach(info => {
      if (info.hasShipping) {
        totalShipping += info.cost;
      }
    });
    
    console.log('Calculated total shipping:', totalShipping);
    return totalShipping;
  };

  const calculateTotal = () => {
    return getCartTotal() + calculateShipping();
  };

  const handleRemoveItem = (itemId: string) => {
    removeFromCart(itemId);
  };

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(itemId);
    } else {
      updateQuantity(itemId, newQuantity);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount);
  };

  const handleMercadoPagoCheckout = async () => {
    if (!shippingAddress.trim()) {
      Alert.alert('Error', 'Por favor ingresa una dirección de envío');
      return;
    }

    setLoading(true);
    
    try {
      console.log('Starting Mercado Pago checkout...');
      console.log('Cart items:', cart);
      console.log('Shipping address:', shippingAddress);
      console.log('Shipping info:', partnerShippingInfo);
      console.log('Total shipping cost:', calculateShipping());
      
      if (!currentUser) {
        Alert.alert('Error', 'Usuario no autenticado');
        return;
      }
      
      console.log('Validating cart items...');
      
      const totalShippingCost = calculateShipping();
      
      // Create orders and payment preferences
      const { orders, paymentPreferences } = await createMultiPartnerOrder(
        cart,
        currentUser,
        shippingAddress,
        totalShippingCost
      );
      
      console.log('Orders created:', orders.length);
      console.log('Payment preferences created:', paymentPreferences.length);
      
      // For now, just show success message
      Alert.alert(
        'Éxito',
        `Se crearon ${orders.length} pedidos. Redirigiendo a Mercado Pago...`,
        [
          {
            text: 'OK',
            onPress: () => {
              clearCart();
              router.push('/(tabs)/orders');
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('Checkout error:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Error al procesar el pago'
      );
    } finally {
      setLoading(false);
    }
  };

  // Keep the component alive with a ping function
  const ping = () => {
    console.log('Cart component is alive');
  };

  useEffect(() => {
    const interval = setInterval(ping, 30000); // Ping every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Call ping immediately
  useEffect(() => {
    ping();
  }, []);

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loginPrompt}>
          <Text style={styles.loginPromptText}>Inicia sesión para ver tu carrito</Text>
          <Button title="Iniciar Sesión" onPress={() => router.push('/auth/login')} />
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
        <Text style={styles.title}>{t('myCart')}</Text>
        <View style={styles.placeholder} />
      </View>

      {cart.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ShoppingCart size={64} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>{t('cartEmpty')}</Text>
          <Text style={styles.emptySubtitle}>
            {t('cartEmptySubtitle')}
          </Text>
          <Button
            title={t('goToShop')}
            onPress={() => router.push('/(tabs)/shop')}
            size="large"
          />
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Cart Items */}
          <View style={styles.itemsContainer}>
            {cart.map((item) => (
              <Card key={item.id} style={styles.itemCard}>
                <View style={styles.itemContent}>
                  <Image 
                    source={{ 
                      uri: item.image || 'https://images.pexels.com/photos/1459244/pexels-photo-1459244.jpeg?auto=compress&cs=tinysrgb&w=200'
                    }} 
                    style={styles.itemImage} 
                  />
                  
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.itemPartner}>{item.partnerName}</Text>
                    <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>
                  </View>
                  
                  <View style={styles.itemActions}>
                    <TouchableOpacity 
                      style={styles.removeButton}
                      onPress={() => handleRemoveItem(item.id)}
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                    
                    <View style={styles.quantityContainer}>
                      <TouchableOpacity 
                        style={styles.quantityButton}
                        onPress={() => handleQuantityChange(item.id, item.quantity - 1)}
                      >
                        <Minus size={16} color="#6B7280" />
                      </TouchableOpacity>
                      
                      <Text style={styles.quantityText}>{item.quantity}</Text>
                      
                      <TouchableOpacity 
                        style={styles.quantityButton}
                        onPress={() => handleQuantityChange(item.id, item.quantity + 1)}
                      >
                        <Plus size={16} color="#6B7280" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Card>
            ))}
          </View>

          {/* Shipping Address */}
          <Card style={styles.shippingCard}>
            <Text style={styles.sectionTitle}>{t('shippingAddress')}</Text>
            <Input
              placeholder={t('enterCompleteAddress')}
              value={shippingAddress}
              onChangeText={setShippingAddress}
              multiline
              numberOfLines={2}
            />
          </Card>

          {/* Order Summary */}
          <Card style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>{t('orderSummary')}</Text>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('subtotal')} ({cart.length} {t('products')})</Text>
              <Text style={styles.summaryValue}>{formatCurrency(getCartTotal())}</Text>
            </View>
            
            {/* Shipping breakdown by store */}
            {Object.keys(partnerShippingInfo).length > 0 && (
              <View style={styles.shippingBreakdown}>
                <Text style={styles.shippingBreakdownTitle}>{t('shippingByStore')}:</Text>
                {Object.entries(partnerShippingInfo).map(([partnerId, info]) => (
                  <View key={partnerId} style={styles.shippingRow}>
                    <Text style={styles.shippingStoreLabel}>{info.name}</Text>
                    <Text style={styles.shippingStoreValue}>
                      {info.hasShipping ? formatCurrency(info.cost) : t('noShipping')}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('shipping')}</Text>
              <Text style={styles.summaryValue}>
                {loadingShipping ? t('calculating') + '...' : formatCurrency(calculateShipping())}
              </Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>{t('total')}</Text>
              <Text style={styles.totalValue}>{formatCurrency(calculateTotal())}</Text>
            </View>
          </Card>

          {/* Checkout Button */}
          <View style={styles.checkoutContainer}>
            <Button
              title={t('payWithMercadoPago')}
              onPress={handleMercadoPagoCheckout}
              loading={loading}
              size="large"
              disabled={cart.length === 0 || !shippingAddress.trim() || loadingShipping}
            />
          </View>
        </ScrollView>
      )}
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
  loginPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loginPromptText: {
    fontSize: 18,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  itemsContainer: {
    marginBottom: 16,
  },
  itemCard: {
    marginBottom: 12,
    padding: 12,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  itemPartner: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
  },
  itemActions: {
    alignItems: 'center',
  },
  removeButton: {
    padding: 8,
    marginBottom: 8,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: 'center',
  },
  shippingCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  summaryCard: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  totalValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
  },
  shippingBreakdown: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  shippingBreakdownTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  shippingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  shippingStoreLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    flex: 1,
  },
  shippingStoreValue: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  checkoutContainer: {
    marginBottom: 24,
  },
});