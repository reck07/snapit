import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  BarChart3,
  Download,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Search,
  Sprout,
  ChevronRight,
} from 'lucide-react-native';
import {
  getProducts,
  deleteProduct,
  getBrands,
  getSummary,
  refreshBrandsAndTypesFromApi,
} from '../database/database';
import { confirmAction } from '../utils/confirm';
import { exportAllCSV } from '../utils/exportCSV';
import Dropdown from '../components/Dropdown';
import { PressableScale, FadeIn, Spin } from '../components/motion';
import { CURRENCY_OPTIONS, useCurrency } from '../context/CurrencyContext';
import {
  colors,
  fonts,
  radii,
  shadows,
  spacing,
  type,
  transition,
  deviceColumns,
  contentMaxWidth,
} from '../theme';

const WARRANTY_TONES = {
  muted: { bg: colors.row, fg: colors.muted },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  warning: { bg: colors.warningSoft, fg: colors.secondary },
  success: { bg: colors.successSoft, fg: colors.successDark },
};

const CURRENCY_ITEMS = CURRENCY_OPTIONS.map(option => ({
  label: option.label,
  value: option.value,
}));

function getWarrantyStatus(daysLeft) {
  if (daysLeft === null || daysLeft === undefined)
    return { text: 'No warranty info', tone: 'muted' };
  if (daysLeft < 0) return { text: 'Warranty expired', tone: 'danger' };
  if (daysLeft <= 7) return { text: `Expires in ${daysLeft} days`, tone: 'danger' };
  if (daysLeft <= 30) return { text: `Expires in ${daysLeft} days`, tone: 'warning' };
  return { text: `Still covered · ${daysLeft} days`, tone: 'success' };
}

function formatDateDisplay(date, precision) {
  if (!date) return 'Unknown';
  if (precision === 'year_only') return date.split('-')[0];
  if (precision === 'unknown') return 'Unknown';
  return date;
}

function getDeviceIcon(typeName) {
  const name = (typeName || '').toLowerCase();
  if (name.includes('smartphone') || name.includes('phone') || name.includes('mobile'))
    return '📱';
  if (name.includes('tablet') || name.includes('ipad')) return '📟';
  if (name.includes('laptop') || name.includes('notebook') || name.includes('macbook'))
    return '💻';
  if (name.includes('monitor') || name.includes('display')) return '🖥️';
  if (name.includes('watch') || name.includes('wearable')) return '⌚';
  if (name.includes('ac') || name.includes('air')) return '❄️';
  if (name.includes('tv') || name.includes('television')) return '📺';
  if (name.includes('printer')) return '🖨️';
  if (name.includes('fridge') || name.includes('refrigerator')) return '🧊';
  return '📱';
}

function IconButton({ label, onPress, disabled, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[
        styles.iconButton,
        transition,
        hovered && !disabled && styles.iconButtonHover,
        disabled && styles.iconButtonDisabled,
      ]}
    >
      {children}
    </Pressable>
  );
}

function StatCard({ label, value, compact }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text
        style={[styles.statValue, compact && styles.statValueCompact]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}

function EmptyState({ onAdd }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Sprout size={36} color={colors.primary} strokeWidth={1.6} />
      </View>
      <Text style={styles.emptyText}>No devices yet</Text>
      <Text style={styles.emptySubtext}>
        Add your first device to begin a calm, lasting record of the things you own.
      </Text>
      <PressableScale
        style={styles.emptyButton}
        hoverStyle={styles.primaryHover}
        onPress={onAdd}
        accessibilityLabel="Add your first device"
      >
        <Plus size={16} color={colors.white} strokeWidth={2} />
        <Text style={styles.emptyButtonText}>Add Device</Text>
      </PressableScale>
    </View>
  );
}

function DeviceCard({ item, index, cardWidth, navigation, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const warranty = getWarrantyStatus(item.warranty_days_left);
  const tone = WARRANTY_TONES[warranty.tone];
  const brandName = item.brands?.name || '';
  const typeName = item.device_types?.name || '';

  return (
    <FadeIn delay={Math.min(index, 8) * 55} style={{ width: cardWidth }}>
      <View style={[styles.card, transition, hovered && styles.cardHover]}>
        <Pressable
          style={styles.cardMain}
          onPress={() => navigation.navigate('DeviceHistory', { productId: item.id })}
          onHoverIn={() => setHovered(true)}
          onHoverOut={() => setHovered(false)}
          accessibilityLabel={`Open ${item.model_name}`}
        >
          <View style={styles.cardTop}>
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: index % 2 ? colors.secondarySoft : colors.primarySoft },
              ]}
            >
              <Text style={styles.cardIcon}>{getDeviceIcon(typeName)}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.model_name}
              </Text>
              <Text style={styles.cardSubtitle} numberOfLines={1}>
                {[brandName, typeName].filter(Boolean).join(' · ') || 'Uncategorized'}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.muted} strokeWidth={1.8} />
          </View>

          <View style={styles.cardMetaRow}>
            {!!item.purchase_date && (
              <Text style={styles.cardDate}>
                Purchased {formatDateDisplay(item.purchase_date, item.purchase_date_precision)}
              </Text>
            )}
            {!!item.warranty_expiry_date && (
              <View style={[styles.warrantyBadge, { backgroundColor: tone.bg }]}>
                <Text style={[styles.warrantyBadgeText, { color: tone.fg }]}>{warranty.text}</Text>
              </View>
            )}
          </View>
        </Pressable>

        <View style={styles.cardActions}>
          <Pressable
            style={styles.actionButton}
            onPress={() => navigation.navigate('AddDevice', { productId: item.id })}
            accessibilityLabel={`Edit ${item.model_name}`}
          >
            <Pencil size={16} color={colors.muted} strokeWidth={1.8} />
          </Pressable>
          <Pressable
            style={styles.actionButton}
            onPress={() => onDelete(item)}
            accessibilityLabel={`Delete ${item.model_name}`}
          >
            <Trash2 size={16} color={colors.danger} strokeWidth={1.8} />
          </Pressable>
        </View>
      </View>
    </FadeIn>
  );
}

export default function HomeScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const { currency, setCurrency } = useCurrency();
  const compact = width < 720;
  const numColumns = deviceColumns(width);
  const pageWidth = Math.min(width, contentMaxWidth);
  const cardWidth =
    (pageWidth - spacing.md * 2 - spacing.md * (numColumns - 1)) / numColumns;

  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [brandId, setBrandId] = useState(null);
  const [summary, setSummary] = useState({
    deviceCount: 0,
    serviceCount: 0,
    totalSpent: 0,
  });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBrands();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  async function loadBrands() {
    try {
      const data = await getBrands();
      setBrands(data);
      setError('');
    } catch (e) {
      console.error('loadBrands error:', e);
      setError(`Database error: ${e.message}`);
    }
  }

  const loadProducts = useCallback(async () => {
    try {
      const data = await getProducts(search, brandId);
      setProducts(data);
      setError('');
    } catch (e) {
      console.error('loadProducts error:', e);
      setError(`Database error: ${e.message}`);
    }
  }, [search, brandId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
      loadSummary();
    }, [loadProducts])
  );

  async function loadSummary() {
    try {
      const data = await getSummary();
      setSummary(data);
    } catch {
      // non-fatal
    }
  }

  async function handleRefreshBrands() {
    if (refreshing) return;
    setRefreshing(true);
    setError('');
    try {
      const result = await refreshBrandsAndTypesFromApi();
      if (result.success) {
        await loadBrands();
        setError('');
        setNotice(`Catalog synced: ${result.brandsCount} brands, ${result.typesCount} types`);
        setTimeout(() => setNotice(''), 4000);
      } else {
        setError(`Refresh failed: ${result.error}`);
      }
    } catch (e) {
      setError(`Failed to refresh catalog: ${e.message}`);
    } finally {
      setRefreshing(false);
    }
  }

  function handleDelete(product) {
    confirmAction(
      'Delete Device',
      `Remove "${product.model_name}" and all its service history?`,
      async () => {
        try {
          await deleteProduct(product.id);
          await loadProducts();
          await loadSummary();
        } catch (e) {
          setError(`Could not delete device: ${e.message}`);
        }
      }
    );
  }

  const brandItems = [
    { label: 'All Brands', value: null },
    ...brands.map(b => ({ label: b.name, value: b.id })),
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.page}>
        <View style={[styles.topBar, compact && styles.topBarCompact]}>
          <View style={styles.brandBlock}>
            <Text style={styles.logo}>Snap It</Text>
            <Text style={styles.logoSub}>Product managing</Text>
          </View>

          <View style={[styles.topActions, compact && styles.topActionsCompact]}>
            <View style={styles.brandPicker}>
              <Dropdown
                pill
                items={brandItems}
                selectedValue={brandId}
                onValueChange={setBrandId}
                placeholder="All Brands"
              />
            </View>
            <IconButton
              label="Open analytics"
              onPress={() => navigation.navigate('Analytics')}
            >
              <BarChart3 size={18} color={colors.muted} strokeWidth={1.8} />
            </IconButton>
            <IconButton label="Export CSV" onPress={exportAllCSV}>
              <Download size={18} color={colors.muted} strokeWidth={1.8} />
            </IconButton>
            <IconButton
              label="Sync catalog"
              onPress={handleRefreshBrands}
              disabled={refreshing}
            >
              <Spin spinning={refreshing}>
                <RefreshCw
                  size={18}
                  color={refreshing ? colors.primary : colors.muted}
                  strokeWidth={1.8}
                />
              </Spin>
            </IconButton>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <Search size={18} color={colors.muted} strokeWidth={1.8} />
          <TextInput
            style={styles.searchBar}
            placeholder="Search your devices…"
            placeholderTextColor={colors.muted}
            value={searchInput}
            onChangeText={setSearchInput}
          />
        </View>

        <View style={styles.statsRow}>
          <StatCard label="Devices" value={summary.deviceCount} compact={compact} />
          <StatCard label="Services" value={summary.serviceCount} compact={compact} />
        </View>

        {notice ? (
          <View style={styles.noticeBanner}>
            <Text style={styles.noticeBannerText}>{notice}</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Your devices</Text>
          <View style={styles.listMeta}>
            <Text style={styles.listCount}>
              {products.length} {products.length === 1 ? 'device' : 'devices'}
            </Text>
            <View style={styles.currencyPicker}>
              <Dropdown
                pill
                items={CURRENCY_ITEMS}
                selectedValue={currency}
                onValueChange={setCurrency}
                placeholder="Currency"
              />
            </View>
          </View>
        </View>

        <FlatList
          key={`device-grid-${numColumns}`}
          data={products}
          keyExtractor={item => item.id.toString()}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState onAdd={() => navigation.navigate('AddDevice')} />}
          renderItem={({ item, index }) => (
            <DeviceCard
              item={item}
              index={index}
              cardWidth={cardWidth}
              navigation={navigation}
              onDelete={handleDelete}
            />
          )}
        />
      </View>

      <PressableScale
        containerStyle={styles.fabWrap}
        style={styles.fab}
        hoverStyle={styles.fabHover}
        onPress={() => navigation.navigate('AddDevice')}
        accessibilityLabel="Add device"
      >
        <Plus size={26} color={colors.white} strokeWidth={2} />
      </PressableScale>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  page: {
    flex: 1,
    width: '100%',
    maxWidth: contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topBarCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  brandBlock: {
    flexShrink: 0,
  },
  logo: {
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 32,
    color: colors.text,
    letterSpacing: 0.2,
  },
  logoSub: {
    ...type.label,
    fontSize: 10,
    letterSpacing: 1.3,
    marginTop: 1,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    flex: 1,
  },
  topActionsCompact: {
    justifyContent: 'space-between',
    width: '100%',
  },
  brandPicker: {
    width: 190,
    minWidth: 150,
    flexShrink: 1,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconButtonHover: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  iconButtonDisabled: {
    opacity: 0.55,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    height: 48,
  },
  searchBar: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 0,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 72,
    justifyContent: 'center',
    ...shadows.soft,
  },
  statLabel: {
    ...type.label,
    fontSize: 9,
    marginBottom: 2,
  },
  statValue: {
    ...type.number,
    fontSize: 22,
    lineHeight: 27,
  },
  statValueCompact: {
    fontSize: 19,
    lineHeight: 24,
  },
  noticeBanner: {
    backgroundColor: colors.successSoft,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D6E6CB',
  },
  noticeBannerText: {
    ...type.small,
    color: colors.successDark,
  },
  errorBanner: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  errorBannerText: {
    ...type.small,
    color: colors.danger,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  listTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    lineHeight: 27,
    color: colors.text,
    flexShrink: 1,
  },
  listCount: {
    ...type.small,
    fontSize: 12,
  },
  listMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
  },
  currencyPicker: {
    width: 108,
  },
  list: {
    paddingBottom: 100,
    flexGrow: 1,
  },
  columnWrapper: {
    gap: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.soft,
  },
  cardHover: {
    transform: [{ translateY: -4 }],
    borderColor: colors.borderStrong,
    ...shadows.medium,
  },
  cardMain: {
    flex: 1,
    minWidth: 0,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: {
    fontSize: 27,
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  cardSubtitle: {
    ...type.small,
    marginTop: 2,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cardDate: {
    ...type.small,
    fontSize: 12,
  },
  warrantyBadge: {
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  warrantyBadgeText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    lineHeight: 15,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: spacing.sm,
  },
  actionButton: {
    width: 34,
    height: 34,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyText: {
    fontFamily: fonts.heading,
    fontSize: 20,
    lineHeight: 28,
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtext: {
    ...type.body,
    color: colors.muted,
    textAlign: 'center',
    maxWidth: 380,
    marginTop: spacing.xs,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    marginTop: spacing.lg,
    ...shadows.soft,
  },
  primaryHover: {
    backgroundColor: colors.primaryDark,
  },
  emptyButtonText: {
    ...type.button,
    color: colors.white,
  },
  fabWrap: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: radii.full,
    ...shadows.medium,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabHover: {
    backgroundColor: colors.primaryDark,
  },
});
