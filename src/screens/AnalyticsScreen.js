import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import {
  BarChart3,
  ChevronRight,
  ShieldAlert,
  Smartphone,
  Sprout,
  Tag,
  UserRound,
  Wrench,
} from 'lucide-react-native';
import {
  getCostAnalytics,
  getTechnicianMemory,
  getWarrantyExpiringSoon,
  getUpcomingServiceReminders,
} from '../database/database';
import { useCurrency } from '../context/CurrencyContext';
import { colors, fonts, radii, shadows, spacing, type } from '../theme';

function SectionTitle({ icon: Icon, children }) {
  return (
    <View style={styles.sectionHeading}>
      <Icon size={17} color={colors.primary} strokeWidth={1.8} />
      <Text style={styles.sectionTitle}>{children}</Text>
    </View>
  );
}

export default function AnalyticsScreen({ navigation }) {
  const { formatCurrency } = useCurrency();
  const [analytics, setAnalytics] = useState(null);
  const [technicians, setTechnicians] = useState([]);
  const [warrantyAlerts, setWarrantyAlerts] = useState([]);
  const [serviceReminders, setServiceReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [costData, techData, warrantyData, serviceData] = await Promise.all([
        getCostAnalytics(),
        getTechnicianMemory(),
        getWarrantyExpiringSoon(30),
        getUpcomingServiceReminders(30),
      ]);
      setAnalytics(costData);
      setTechnicians(techData);
      setWarrantyAlerts(warrantyData);
      setServiceReminders(serviceData);
    } catch (e) {
      console.error('Analytics load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function getWarrantyStatus(daysLeft) {
    if (daysLeft === null || daysLeft === undefined)
      return { text: 'No warranty info', color: colors.muted };
    if (daysLeft <= 0) return { text: 'Warranty expired', color: colors.danger };
    if (daysLeft <= 7) return { text: `Expires in ${daysLeft} days`, color: colors.danger };
    if (daysLeft <= 30) return { text: `Expires in ${daysLeft} days`, color: colors.secondary };
    return { text: `Still covered (${daysLeft} days left)`, color: colors.successDark };
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
      contentContainerStyle={styles.content}
    >
      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Invested</Text>
          <Text style={styles.summaryValue}>
            {formatCurrency((analytics?.totalPurchase || 0) + (analytics?.totalService || 0))}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Purchase Cost</Text>
          <Text style={styles.summaryValue}>{formatCurrency(analytics?.totalPurchase || 0)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Service Cost</Text>
          <Text style={styles.summaryValue}>{formatCurrency(analytics?.totalService || 0)}</Text>
        </View>
      </View>

      {/* Warranty Alerts */}
      {warrantyAlerts.length > 0 && (
        <View style={styles.section}>
          <SectionTitle icon={ShieldAlert}>Warranty Expiring Soon</SectionTitle>
          {warrantyAlerts.map(item => {
            const status = getWarrantyStatus(item.days_left);
            return (
              <View key={item.id} style={styles.alertCard}>
                <View style={styles.alertInfo}>
                  <Text style={styles.alertTitle}>{item.model_name}</Text>
                  <Text style={styles.alertSub}>
                    {item.brand_name} · {item.type_name}
                  </Text>
                </View>
                <View style={styles.alertStatus}>
                  <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
                  <Text style={styles.alertDate}>Expires: {item.warranty_expiry_date}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Service Reminders */}
      {serviceReminders.length > 0 && (
        <View style={styles.section}>
          <SectionTitle icon={Wrench}>Service Due Soon</SectionTitle>
          {serviceReminders.map(item => {
            const status = getWarrantyStatus(item.days_left);
            return (
              <View key={item.id} style={styles.alertCard}>
                <View style={styles.alertInfo}>
                  <Text style={styles.alertTitle}>{item.model_name}</Text>
                  <Text style={styles.alertSub}>
                    {item.brand_name} · {item.type_name}
                  </Text>
                </View>
                <View style={styles.alertStatus}>
                  <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
                  <Text style={styles.alertDate}>Due: {item.trigger_date}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* By Category */}
      {analytics?.byCategory?.length > 0 && (
        <View style={styles.section}>
          <SectionTitle icon={BarChart3}>By Category</SectionTitle>
          {analytics.byCategory.map(cat => (
            <View key={cat.category} style={styles.categoryRow}>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>{cat.category}</Text>
                <Text style={styles.categoryCount}>{cat.device_count} devices</Text>
              </View>
              <View style={styles.categoryCosts}>
                <Text style={styles.categoryCost}>
                  Purchase: {formatCurrency(cat.purchase_total)}
                </Text>
                <Text style={styles.categoryCost}>
                  Service: {formatCurrency(cat.service_total)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* By Brand */}
      {analytics?.byBrand?.length > 0 && (
        <View style={styles.section}>
          <SectionTitle icon={Tag}>By Brand</SectionTitle>
          {analytics.byBrand.map(brand => (
            <View key={brand.brand} style={styles.categoryRow}>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>{brand.brand}</Text>
                <Text style={styles.categoryCount}>{brand.device_count} devices</Text>
              </View>
              <View style={styles.categoryCosts}>
                <Text style={styles.categoryCost}>
                  Purchase: {formatCurrency(brand.purchase_total)}
                </Text>
                <Text style={styles.categoryCost}>
                  Service: {formatCurrency(brand.service_total)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Device Cost Breakdown */}
      {analytics?.byDevice?.length > 0 && (
        <View style={styles.section}>
          <SectionTitle icon={Smartphone}>Device Cost Breakdown</SectionTitle>
          {analytics.byDevice.map(device => {
            const total = (device.purchase_price || 0) + (device.service_total || 0);
            return (
              <TouchableOpacity
                key={device.id}
                style={styles.deviceCostRow}
                onPress={() => navigation.navigate('DeviceHistory', { productId: device.id })}
              >
                <View style={styles.deviceCostInfo}>
                  <Text style={styles.deviceCostName}>{device.model_name}</Text>
                  <Text style={styles.deviceCostMeta}>
                    {device.brand} · {device.type} · {device.service_count} services
                  </Text>
                </View>
                <View style={styles.deviceCostAmounts}>
                  <Text style={styles.deviceTotal}>Total: {formatCurrency(total)}</Text>
                  <Text style={styles.deviceBreakdown}>
                    Buy: {device.purchase_price !== null && device.purchase_price !== undefined
                      ? formatCurrency(device.purchase_price)
                      : '—'}{' '}
                    · Service:{' '}
                    {device.service_total !== null && device.service_total !== undefined
                      ? formatCurrency(device.service_total)
                      : '—'}
                  </Text>
                </View>
                <ChevronRight size={16} color={colors.muted} strokeWidth={1.8} />
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Technician Memory */}
      {technicians.length > 0 && (
        <View style={styles.section}>
          <SectionTitle icon={UserRound}>Technician &amp; Vendor Memory</SectionTitle>
          {technicians.map(tech => (
            <View key={`${tech.vendor_name}-${tech.repairman_name}`} style={styles.techCard}>
              <View style={styles.techHeader}>
                <Text style={styles.techName}>
                  {tech.vendor_name || tech.repairman_name || 'Unknown'}
                </Text>
                <Text style={styles.techVisits}>{tech.visit_count} visits</Text>
              </View>
              {!!(tech.repairman_name && tech.vendor_name) && (
                <Text style={styles.techPerson}>
                  {tech.repairman_name} @ {tech.vendor_name}
                </Text>
              )}
              {!!tech.repairman_contact && (
                <Text style={styles.techContact}>📞 {tech.repairman_contact}</Text>
              )}
              <Text style={styles.techDevices}>Devices: {tech.devices_serviced}</Text>
              <Text style={styles.techLastVisit}>Last visit: {tech.last_visit}</Text>
            </View>
          ))}
        </View>
      )}

      {analytics?.byDevice?.length === 0 && (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Sprout size={30} color={colors.primary} strokeWidth={1.6} />
          </View>
          <Text style={styles.emptyText}>No data yet</Text>
          <Text style={styles.emptySubtext}>
            Add devices and service logs to see your spending and care history.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  loadingText: {
    ...type.body,
    color: colors.muted,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  summaryLabel: {
    ...type.label,
    fontSize: 10,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 19,
    lineHeight: 25,
    color: colors.primary,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    ...type.h4,
    flex: 1,
  },
  alertCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: 12,
    backgroundColor: colors.row,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  alertInfo: {
    flex: 1,
    minWidth: 0,
  },
  alertTitle: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.text,
  },
  alertSub: {
    ...type.small,
    fontSize: 12,
    marginTop: 2,
  },
  alertStatus: {
    alignItems: 'flex-end',
    flexShrink: 1,
  },
  statusText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    marginBottom: 2,
    textAlign: 'right',
  },
  alertDate: {
    ...type.small,
    fontSize: 11,
    textAlign: 'right',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: 12,
    backgroundColor: colors.row,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryInfo: {
    flex: 1,
    minWidth: 0,
  },
  categoryName: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.text,
  },
  categoryCount: {
    ...type.small,
    fontSize: 12,
    marginTop: 2,
  },
  categoryCosts: {
    alignItems: 'flex-end',
    flexShrink: 1,
  },
  categoryCost: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textBody,
    marginTop: 2,
    textAlign: 'right',
  },
  deviceCostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: 12,
    backgroundColor: colors.row,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deviceCostInfo: {
    flex: 1,
    minWidth: 0,
  },
  deviceCostName: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.text,
  },
  deviceCostMeta: {
    ...type.small,
    fontSize: 11,
    marginTop: 2,
  },
  deviceCostAmounts: {
    alignItems: 'flex-end',
    flexShrink: 1,
  },
  deviceTotal: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.text,
    textAlign: 'right',
  },
  deviceBreakdown: {
    ...type.small,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'right',
  },
  techCard: {
    backgroundColor: colors.row,
    borderRadius: radii.md,
    padding: 12,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  techHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  techName: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  techVisits: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    color: colors.primary,
  },
  techPerson: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textBody,
    marginTop: 4,
  },
  techContact: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.primary,
    marginTop: 4,
  },
  techDevices: {
    ...type.small,
    fontSize: 11,
    marginTop: 4,
  },
  techLastVisit: {
    ...type.small,
    fontSize: 11,
    marginTop: 2,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyText: {
    ...type.h3,
    textAlign: 'center',
  },
  emptySubtext: {
    ...type.small,
    textAlign: 'center',
    maxWidth: 380,
    marginTop: spacing.xs,
  },
});
