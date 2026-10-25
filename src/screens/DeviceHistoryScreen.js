import { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Pencil, Plus, Trash2 } from 'lucide-react-native';
import { getProductById, getServiceLogs, deleteServiceLog } from '../database/database';
import { confirmAction } from '../utils/confirm';
import { PressableScale } from '../components/motion';
import { useCurrency } from '../context/CurrencyContext';
import { colors, fonts, radii, shadows, spacing, type } from '../theme';

export default function DeviceHistoryScreen({ route, navigation }) {
  const { productId } = route.params;
  const { formatCurrency } = useCurrency();
  const [product, setProduct] = useState(null);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');

  function getWarrantyStatus(daysLeft) {
    if (daysLeft === null || daysLeft === undefined)
      return { text: 'No warranty info', color: colors.muted };
    if (daysLeft < 0) return { text: 'Warranty expired', color: colors.danger };
    if (daysLeft <= 7) return { text: `Expires in ${daysLeft} days`, color: colors.danger };
    if (daysLeft <= 30) return { text: `Expires in ${daysLeft} days`, color: colors.secondary };
    return { text: `Still covered (${daysLeft} days left)`, color: colors.successDark };
  }

  const loadData = useCallback(async () => {
    try {
      const prod = await getProductById(productId);
      setProduct(prod);
      const data = await getServiceLogs(productId);
      setLogs(data);
      setError('');
    } catch {
      setError('Could not load data.');
    }
  }, [productId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  function handleDeleteLog(log) {
    confirmAction('Delete Entry', 'Remove this service record?', async () => {
      await deleteServiceLog(log.id);
      loadData();
    });
  }

  function formatDateDisplay(date, precision) {
    if (!date) return 'Date unknown';
    if (precision === 'year_only') {
      return date.split('-')[0];
    }
    if (precision === 'unknown') {
      return 'Date unknown';
    }
    return date;
  }

  function getPrecisionBadge(precision) {
    if (precision === 'exact') return { text: 'Exact date', color: colors.successDark };
    if (precision === 'year_only') return { text: 'Month/Year only', color: colors.secondary };
    return { text: 'Approximate', color: colors.muted };
  }

  return (
    <View style={styles.container}>
      {product && (
        <View style={styles.header}>
          <Text style={styles.headerIcon}>{getDeviceIcon(product.type_name)}</Text>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{product.model_name}</Text>
            <Text style={styles.headerSub}>
              {product.brand_name} · {product.type_name}
            </Text>
            <View style={styles.headerDetails}>
              {!!product.purchase_date && (
                <Text style={styles.headerDate}>
                  Purchased:{' '}
                  {formatDateDisplay(product.purchase_date, product.purchase_date_precision)}
                </Text>
              )}
              {product.purchase_price !== null && product.purchase_price !== undefined && (
                <Text style={styles.headerPrice}>
                  Price: {formatCurrency(product.purchase_price) || '—'}
                </Text>
              )}
              {!!product.warranty_expiry_date && (
                <Text style={styles.headerWarranty}>
                  {getWarrantyStatus(product.warranty_days_left).text}
                </Text>
              )}
              {!!product.serial_number && (
                <Text style={styles.headerSerial}>S/N: {product.serial_number}</Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.headerEdit}
            onPress={() => navigation.navigate('AddDevice', { productId: product.id })}
            hitSlop={8}
          >
            <Pencil size={18} color={colors.primary} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.sectionTitle}>Service History</Text>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={logs}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No service records yet</Text>
            <Text style={styles.emptySubtext}>Tap + to log a service entry</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const precisionBadge = getPrecisionBadge(item.date_precision);
          return (
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: precisionBadge.color }]} />
              {index < logs.length - 1 && <View style={styles.timelineLine} />}

              <View style={styles.logCard}>
                <View style={styles.logHeader}>
                  <View style={styles.logDateWrap}>
                    <Text style={styles.logDate}>
                      {formatDateDisplay(item.date, item.date_precision)}
                    </Text>
                    <View style={styles.precisionBadgeRow}>
                      <View
                        style={[styles.precisionBadge, { backgroundColor: precisionBadge.color }]}
                      >
                        <Text style={styles.precisionBadgeText}>{precisionBadge.text}</Text>
                      </View>
                    </View>
                  </View>
                  {!!item.day && <Text style={styles.logDay}>{item.day}</Text>}
                  {!!item.time && <Text style={styles.logTime}>{item.time}</Text>}
                  <TouchableOpacity
                    style={styles.logEdit}
                    onPress={() => navigation.navigate('AddService', { productId, logId: item.id })}
                    hitSlop={8}
                  >
                    <Pencil size={15} color={colors.muted} strokeWidth={1.8} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.logDelete}
                    onPress={() => handleDeleteLog(item)}
                    hitSlop={8}
                  >
                    <Trash2 size={15} color={colors.danger} strokeWidth={1.8} />
                  </TouchableOpacity>
                </View>

                {!!item.note && <Text style={styles.logNote}>{item.note}</Text>}

                <View style={styles.logMeta}>
                  {!!formatCurrency(item.cost) && (
                    <Text style={styles.logCost}>{formatCurrency(item.cost)}</Text>
                  )}
                  {!!item.vendor_name && <Text style={styles.logVendor}>🏢 {item.vendor_name}</Text>}
                  {!!item.repairman_name && (
                    <Text style={styles.logRepairman}>👨‍🔧 {item.repairman_name}</Text>
                  )}
                  {!!item.payment_mode && (
                    <Text style={styles.logPayment}>💳 {item.payment_mode}</Text>
                  )}
                  {!!item.next_service_due && (
                    <Text style={styles.logNextService}>📅 Next: {item.next_service_due}</Text>
                  )}
                </View>

                {!!item.repairman_contact && (
                  <Text style={styles.logContact}>📞 {item.repairman_contact}</Text>
                )}

                {!!item.photo_url && (
                  <Image source={{ uri: item.photo_url }} style={styles.photo} />
                )}
              </View>
            </View>
          );
        }}
      />

      <PressableScale
        containerStyle={styles.fabWrap}
        style={styles.fab}
        hoverStyle={styles.fabHover}
        onPress={() => navigation.navigate('AddService', { productId })}
        accessibilityLabel="Add service entry"
      >
        <Plus size={26} color={colors.white} strokeWidth={2} />
      </PressableScale>
    </View>
  );
}

function getDeviceIcon(typeName) {
  const name = (typeName || '').toLowerCase();
  if (name.includes('smartphone') || name.includes('phone') || name.includes('mobile')) return '📱';
  if (name.includes('tablet') || name.includes('ipad')) return '📟';
  if (name.includes('laptop') || name.includes('notebook') || name.includes('macbook')) return '💻';
  if (name.includes('monitor') || name.includes('display')) return '🖥️';
  if (name.includes('watch') || name.includes('wearable')) return '⌚';
  if (name.includes('ac') || name.includes('air')) return '❄️';
  if (name.includes('tv') || name.includes('television')) return '📺';
  if (name.includes('printer')) return '🖨️';
  if (name.includes('fridge') || name.includes('refrigerator')) return '🧊';
  return '📱';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  headerIcon: {
    fontSize: 34,
    marginRight: spacing.md,
    marginTop: 2,
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    lineHeight: 27,
    color: colors.text,
  },
  headerSub: {
    ...type.small,
    marginTop: 2,
  },
  headerDetails: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  headerDate: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
  headerPrice: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.primary,
  },
  headerWarranty: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.secondary,
  },
  headerSerial: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
  },
  headerEdit: {
    padding: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.primarySoft,
  },
  sectionTitle: {
    ...type.label,
    color: colors.textBody,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  list: {
    padding: spacing.md,
    paddingTop: 0,
    paddingBottom: 100,
    width: '100%',
    maxWidth: 820,
    alignSelf: 'center',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 4,
    minHeight: 60,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: 22,
    marginRight: 12,
    marginLeft: 4,
  },
  timelineLine: {
    position: 'absolute',
    left: 8,
    top: 34,
    bottom: -4,
    width: 2,
    backgroundColor: colors.borderStrong,
  },
  logCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.soft,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  logDateWrap: {
    flex: 1,
    minWidth: 0,
  },
  logDate: {
    fontFamily: fonts.headingRegular,
    fontSize: 14,
    color: colors.text,
  },
  precisionBadgeRow: {
    marginTop: 4,
  },
  precisionBadge: {
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  precisionBadgeText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 10,
    color: colors.white,
  },
  logDay: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
  logTime: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.primary,
  },
  logDelete: {
    padding: 4,
  },
  logEdit: {
    marginLeft: 'auto',
    padding: 4,
  },
  logNote: {
    ...type.body,
    fontSize: 14,
    color: colors.text,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  logMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: 4,
  },
  logCost: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.secondary,
  },
  logVendor: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textBody,
  },
  logRepairman: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textBody,
  },
  logPayment: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
  logNextService: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.primary,
  },
  logContact: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  photo: {
    width: '100%',
    height: 180,
    borderRadius: radii.md,
    marginTop: spacing.sm,
    backgroundColor: colors.row,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    ...type.h3,
  },
  emptySubtext: {
    ...type.small,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  errorBannerText: {
    ...type.small,
    color: colors.danger,
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
