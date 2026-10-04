import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { getCostAnalytics, getTechnicianMemory, getWarrantyExpiringSoon, getUpcomingServiceReminders } from '../database/database';
import { confirmAction } from '../utils/confirm';

export default function AnalyticsScreen({ navigation }) {
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

  function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
  }

  function getWarrantyStatus(daysLeft) {
    if (daysLeft === null || daysLeft === undefined) return { text: 'No warranty info', color: '#999' };
    if (daysLeft <= 0) return { text: 'Warranty expired', color: '#e74c3c' };
    if (daysLeft <= 7) return { text: `Expires in ${daysLeft} days`, color: '#e74c3c' };
    if (daysLeft <= 30) return { text: `Expires in ${daysLeft} days`, color: '#f39c12' };
    return { text: `Still covered (${daysLeft} days left)`, color: '#27ae60' };
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
          <Text style={styles.sectionTitle}>⚠️ Warranty Expiring Soon</Text>
          {warrantyAlerts.map((item) => {
            const status = getWarrantyStatus(item.days_left);
            return (
              <View key={item.id} style={styles.alertCard}>
                <View style={styles.alertInfo}>
                  <Text style={styles.alertTitle}>{item.model_name}</Text>
                  <Text style={styles.alertSub}>{item.brand_name} · {item.type_name}</Text>
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
          <Text style={styles.sectionTitle}>🔧 Service Due Soon</Text>
          {serviceReminders.map((item) => {
            const status = getWarrantyStatus(item.days_left);
            return (
              <View key={item.id} style={styles.alertCard}>
                <View style={styles.alertInfo}>
                  <Text style={styles.alertTitle}>{item.model_name}</Text>
                  <Text style={styles.alertSub}>{item.brand_name} · {item.type_name}</Text>
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
          <Text style={styles.sectionTitle}>📊 By Category</Text>
          {analytics.byCategory.map((cat) => (
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
          <Text style={styles.sectionTitle}>🏷️ By Brand</Text>
          {analytics.byBrand.map((brand) => (
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
          <Text style={styles.sectionTitle}>📱 Device Cost Breakdown</Text>
          {analytics.byDevice.map((device) => {
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
                    Buy: {formatCurrency(device.purchase_price)} · Service: {formatCurrency(device.service_total)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Technician Memory */}
      {technicians.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👨‍🔧 Technician & Vendor Memory</Text>
          {technicians.map((tech) => (
            <View key={`${tech.vendor_name}-${tech.repairman_name}`} style={styles.techCard}>
              <View style={styles.techHeader}>
                <Text style={styles.techName}>
                  {tech.vendor_name || tech.repairman_name || 'Unknown'}
                </Text>
                <Text style={styles.techVisits}>{tech.visit_count} visits</Text>
              </View>
              {tech.repairman_name && tech.vendor_name && (
                <Text style={styles.techPerson}>{tech.repairman_name} @ {tech.vendor_name}</Text>
              )}
              {tech.repairman_contact && (
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
          <Text style={styles.emptyText}>No data yet</Text>
          <Text style={styles.emptySubtext}>Add devices and service logs to see analytics</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  alertCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#fafafa',
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  alertInfo: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  alertSub: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  alertStatus: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  alertDate: {
    fontSize: 12,
    color: '#999',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#fafafa',
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  categoryCount: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  categoryCosts: {
    alignItems: 'flex-end',
  },
  categoryCost: {
    fontSize: 13,
    color: '#333',
    marginTop: 2,
  },
  deviceCostRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#fafafa',
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  deviceCostInfo: {
    flex: 1,
  },
  deviceCostName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  deviceCostMeta: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  deviceCostAmounts: {
    alignItems: 'flex-end',
  },
  deviceTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  deviceBreakdown: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  techCard: {
    backgroundColor: '#fafafa',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  techHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  techName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  techVisits: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  techPerson: {
    fontSize: 13,
    color: '#333',
    marginTop: 4,
  },
  techContact: {
    fontSize: 13,
    color: '#007AFF',
    marginTop: 4,
  },
  techDevices: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  techLastVisit: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  empty: {
    alignItems: 'center',
    marginTop: 40,
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 4,
  },
});