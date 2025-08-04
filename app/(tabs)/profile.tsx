tyle={styles.partnerButton}
                />
                <Button
                  title="Registrar Otro Negocio"
                  onPress={() => router.push('/(tabs)/partner-register')}
                  variant="outline"
                  size="large"
                  style={styles.paimport { CreditCard as Edit, ChevronRight, ShoppingBag, Bell, Globe, CircleHelp as HelpCircle, LogOut, Fingerprint, Store, Shield, Trash2, CreditCard } from 'lucide-react-native'le={t('registerBusiness')}
                onPress={handlePartnerMode}
                size="large"
              />
            </View>
          )}
        </Card>

        {/* Menu Options */}
        <Card style={styles.menuCard}>
          <TouchableOpacity style={styles.menuOption} onPress={handleEditProfile}>
            <View style={styles.menuOptionLeft}>
              <Edit size={20} color="#6B7280" />
              <Text style={styles.menuOptionText}>Editar perfil</Text>
            </View>
            <ChevronRight size={16} color="#6B7280" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuOption} onPress={handleMyOrders}>
            <View style={styles.menuOptionLeft}>
              <ShoppingBag size={20} color="#6B7280" />
              <Text style={styles.menuOptionText}>{t('myOrders')}</Text>
            </View>
            <ChevronRight size={16} color="#6B7280" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuOption} onPress={() => router.push('/cart')}>
            <View style={styles.menuOptionLeft}>
              <ShoppingBag size={20} color="#6B7280" />
              <Text style={styles.menuOptionText}>Mi Carrito</Text>
            </View>
            <ChevronRight size={16} color="#6B7280" />
          </TouchableOpacity>

          {partnerProfile && (
            <TouchableOpacity 
              style={styles.menuOption} 
              onPress={() => router.push('/profile/mercadopago-config')}
            >
              <View style={styles.menuOptionLeft}>
                <CreditCard size={20} color="#6B7280" />
                <Text style={styles.menuOptionText}>Configurar Mercado Pago</Text>
              </View>
              <ChevronRight size={16} color="#6B7280" />
            </TouchableOpacity>
          )}
        </Card>

        {/* Settings */}
        <Card style={styles.menuCard}>
          <View style={styles.menuOption}>
            <View style={styles.menuOptionLeft}>
              <Bell size={20} color="#6B7280" />
              <Text style={styles.menuOptionText}>{t('notifications')}</Text>
            </View>
            <Switch
              value={true}
              onValueChange={() => {}}
              trackColor={{ false: '#E5E7EB', true: '#2D6A6F' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {isBiometricSupported && (
            <View style={styles.menuOption}>
              <View style={styles.menuOptionLeft}>
                <Fingerprint size={20} color="#6B7280" />
                <Text style={styles.menuOptionText}>
                  {biometricType || t('biometricAuth')}
                </Text>
              </View>
              <Switch
                value={isBiometricEnabled}
                onValueChange={handleToggleBiometric}
                trackColor={{ false: '#E5E7EB', true: '#2D6A6F' }}
                thumbColor="#FFFFFF"
              />
            </View>
          )}

          <TouchableOpacity style={styles.menuOption} onPress={handleLanguageChange}>
            <View style={styles.menuOptionLeft}>
              <Globe size={20} color="#6B7280" />
              <Text style={styles.menuOptionText}>{t('language')}</Text>
            </View>
            <View style={styles.languageIndicator}>
              <Text style={styles.languageText}>
                {language === 'es' ? t('spanish') : t('english')}
              </Text>
              <ChevronRight size={16} color="#6B7280" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuOption} 
            onPress={() => router.push('/profile/help-support')}
          >
            <View style={styles.menuOptionLeft}>
              <HelpCircle size={20} color="#6B7280" />
              <Text style={styles.menuOptionText}>{t('helpSupport')}</Text>
            </View>
            <ChevronRight size={16} color="#6B7280" />
          </TouchableOpacity>
        </Card>

        {/* Advanced Settings */}
        <Card style={styles.menuCard}>
          <TouchableOpacity 
            style={styles.menuOption} 
            onPress={() => router.push('/profile/delete-account')}
          >
            <View style={styles.menuOptionLeft}>
              <Trash2 size={20} color="#EF4444" />
              <Text style={[styles.menuOptionText, styles.dangerText]}>Eliminar cuenta</Text>
            </View>
            <ChevronRight size={16} color="#EF4444" />
          </TouchableOpacity>
        </Card>
        {/* Logout */}
        <Card style={styles.logoutCard}>
          <TouchableOpacity style={styles.logoutOption} onPress={handleLogout}>
            <LogOut size={20} color="#10B981" />
            <Text style={[styles.logoutText, styles.logoutTextGreen]}>{t('signOut')}</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#2D6A6F',
  },
  editButton: {
    padding: 8,
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
  profileCard: {
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  profileBio: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#2D6A6F',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 4,
  },
  adminCard: {
    marginBottom: 16,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  adminOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  adminInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  adminDetails: {
    marginLeft: 12,
    flex: 1,
  },
  adminTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#DC2626',
    marginBottom: 2,
  },
  adminDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#991B1B',
    lineHeight: 18,
  },
  partnerCard: {
    marginBottom: 16,
  },
  partnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  partnerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#2D6A6F',
    marginLeft: 8,
  },
  partnerButtons: {
    gap: 12,
    width: '100%',
  },
  partnerButton: {
    width: '100%',
  },
  partnerActive: {
    alignItems: 'center',
  },
  partnerActiveText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#059669',
    textAlign: 'center',
    marginBottom: 12,
  },
  businessInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  businessName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  verifiedBadge: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#10B981',
  },
  partnerInactive: {
    alignItems: 'center',
  },
  partnerInactiveText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  partnerDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  menuCard: {
    marginBottom: 16,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuOptionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    marginLeft: 12,
  },
  languageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginRight: 8,
  },
  logoutCard: {
    marginBottom: 32,
  },
  logoutOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  logoutText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
    marginLeft: 8,
  },
  logoutTextGreen: {
    color: '#10B981',
  },
  dangerText: {
    color: '#EF4444',
  },
});