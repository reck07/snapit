import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getProductById, getServiceLogs, deleteServiceLog } from '../database/database';
import { confirmAction } from '../utils/confirm';

export default function DeviceHistoryScreen({ route, navigation }) {
  const { productId } = route.params;
  const [product, setProduct] = useState(null);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');

  function getWarrantyStatus(daysLeft) {
    if (daysLeft === null || daysLeft === undefined) return { text: 'No warranty info', color: '#999' };
    if (daysLeft < 0) return { text: 'Warranty expired', color: '#e74c3c' };
    if (daysLeft <= 7) return { text: `Expires in ${daysLeft} days`, color: '#e74c3c' };
    if (daysLeft <= 30) return { text: `Expires in ${daysLeft} days`, color: '#f39c12' };
    return { text: `Still covered (${daysLeft} days left)`, color: '#27ae60' };
  }

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    try {
      const prod = await getProductById(productId);
      setProduct(prod);
      const data = await getServiceLogs(productId);
      setLogs(data);
      setError('');
    } catch (e) {
      setError('Could not load data.');
    }
  }

  function handleDeleteLog(log) {
    confirmAction(
      'Delete Entry',
      'Remove this service record?',
      async () => {
        await deleteServiceLog(log.id);
        loadData();
      }
    );
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
    if (precision === 'exact') return { text: 'Exact date', color: '#27ae60' };
    if (precision === 'year_only') return { text: 'Month/Year only', color: '#f39c12' };
    return { text: 'Approximate', color: '#999' };
  }

  function formatCurrency(value) {
    if (value === null || value === undefined || value === '') return null;
    return `$${parseFloat(value).toFixed(2)}`;
  }

  return (
    <View style={styles.container}>
      {product && (
        <View style={styles.header}>
          <Text style={styles.headerIcon}>
            {getDeviceIcon(product.type_name)}
          </Text>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{product.model_name}</Text>
            <Text style={styles.headerSub}>
              {product.brand_name} · {product.type_name}
            </Text>
            <View style={styles.headerDetails}>
              {product.purchase_date && (
                <Text style={styles.headerDate}>
                  Purchased: {formatDateDisplay(product.purchase_date, product.purchase_date_precision)}
                </Text>
              )}
              {product.purchase_price !== null && product.purchase_price !== undefined && (
                <Text style={styles.headerPrice}>Price: ${product.purchase_price.toFixed(2)}</Text>
              )}
              {product.warranty_expiry_date && (
                <Text style={styles.headerWarranty}>
                  {getWarrantyStatus(product.warranty_days_left).text}
                </Text>
              )}
              {product.serial_number && (
                <Text style={styles.headerSerial}>S/N: {product.serial_number}</Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.headerEdit}
            onPress={() => navigation.navigate('AddDevice', { productId: product.id })}
            hitSlop={8}
          >
            <Text style={styles.headerEditText}>✏️</Text>
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
        keyExtractor={(item) => item.id.toString()}
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
              <View style={[
                styles.timelineDot,
                { backgroundColor: precisionBadge.color }
              ]} />
              {index < logs.length - 1 && <View style={styles.timelineLine} />}

              <View style={styles.logCard}>
                <View style={styles.logHeader}>
                  <View style={styles.logDateWrap}>
                    <Text style={styles.logDate}>{formatDateDisplay(item.date, item.date_precision)}</Text>
                    <View style={styles.precisionBadgeRow}>
                      <View style={[
                        styles.precisionBadge,
                        { backgroundColor: precisionBadge.color }
                      ]}>
                        <Text style={styles.precisionBadgeText}>{precisionBadge.text}</Text>
                      </View>
                    </View>
                  </View>
                  {item.day && <Text style={styles.logDay}>{item.day}</Text>}
                  {item.time && <Text style={styles.logTime}>{item.time}</Text>}
                  <TouchableOpacity
                    style={styles.logEdit}
                    onPress={() =>
                      navigation.navigate('AddService', { productId, logId: item.id })
                    }
                    hitSlop={8}
                  >
                    <Text style={styles.logEditText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.logDelete}
                    onPress={() => handleDeleteLog(item)}
                    hitSlop={8}
                  >
                    <Text style={styles.logDeleteText}>🗑</Text>
                  </TouchableOpacity>
                </View>

                {item.note && <Text style={styles.logNote}>{item.note}</Text>}

                <View style={styles.logMeta}>
                  {formatCurrency(item.cost) && (
                    <Text style={styles.logCost}>{formatCurrency(item.cost)}</Text>
                  )}
                  {item.vendor_name && (
                    <Text style={styles.logVendor}>🏢 {item.vendor_name}</Text>
                  )}
                  {item.repairman_name && (
                    <Text style={styles.logRepairman}>👨‍🔧 {item.repairman_name}</Text>
                  )}
                  {item.payment_mode && (
                    <Text style={styles.logPayment}>💳 {item.payment_mode}</Text>
                  )}
                  {item.next_service_due && (
                    <Text style={styles.logNextService}>📅 Next: {item.next_service_due}</Text>
                  )}
                </View>

                {item.repairman_contact && (
                  <Text style={styles.logContact}>📞 {item.repairman_contact}</Text>
                )}

                {item.photo_url && (
                  <Image source={{ uri: item.photo_url }} style={styles.photo} />
                )}
              </View>
            </View>
          );
        }}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddService', { productId })}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerIcon: {
    fontSize: 36,
    marginRight: 12,
    marginTop: 4,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  headerSub: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  headerDetails: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  headerDate: {
    fontSize: 13,
    color: '#999',
  },
  headerPrice: {
    fontSize: 13,
    color: '#27ae60',
    fontWeight: '600',
  },
  headerWarranty: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
  },
  headerSerial: {
    fontSize: 12,
    color: '#999',
  },
  headerEdit: {
    padding: 8,
  },
  headerEditText: {
    fontSize: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  list: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 80,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 4,
    minHeight: 60,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    marginTop: 18,
    marginRight: 12,
    marginLeft: 4,
  },
  timelineLine: {
    position: 'absolute',
    left: 9,
    top: 30,
    bottom: 0,
    width: 2,
    backgroundColor: '#d0d0d0',
  },
  logCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  logDateWrap: {
    flex: 1,
  },
  logDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  precisionBadgeRow: {
    marginTop: 4,
  },
  precisionBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  precisionBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  logDay: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
  },
  logTime: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
  logDelete: {
    marginLeft: 8,
    padding: 4,
  },
  logDeleteText: {
    fontSize: 16,
  },
  logEdit: {
    marginLeft: 'auto',
    padding: 4,
  },
  logEditText: {
    fontSize: 15,
  },
  logNote: {
    fontSize: 15,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  logMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 4,
  },
  logCost: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e67e22',
  },
  logVendor: {
    fontSize: 13,
    color: '#007AFF',
  },
  logRepairman: {
    fontSize: 13,
    color: '#555',
  },
  logPayment: {
    fontSize: 13,
    color: '#8e44ad',
  },
  logNextService: {
    fontSize: 13,
    color: '#f39c12',
    fontWeight: '600',
  },
  logContact: {
    fontSize: 13,
    color: '#777',
    marginTop: 2,
  },
  photo: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: '#eee',
  },
  empty: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 4,
  },
  errorBanner: {
    backgroundColor: '#fff3f3',
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f5c6c6',
  },
  errorBannerText: {
    color: '#c0392b',
    fontSize: 13,
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  fabText: {
    fontSize: 28,
    color: '#fff',
    lineHeight: 30,
  },
});