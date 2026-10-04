import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getProducts, deleteProduct, getBrands, getSummary, refreshBrandsAndTypesFromApi } from '../database/database';
import { confirmAction } from '../utils/confirm';
import { exportAllCSV } from '../utils/exportCSV';
import Dropdown from '../components/Dropdown';

export default function HomeScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [search, setSearch] = useState('');
  const [brandId, setBrandId] = useState(null);
  const [summary, setSummary] = useState({ deviceCount: 0, serviceCount: 0, totalSpent: 0 });
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBrands();
  }, []);

  async function loadBrands() {
    try {
      const data = await getBrands();
      setBrands(data);
      setError('');
    } catch (e) {
      console.error('loadBrands error:', e);
      setError(`Database error: ${e.message}. If on web, try force-releasing the lock from the lock screen.`);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadProducts();
      loadSummary();
    }, [])
  );

  async function loadProducts() {
    try {
      const data = await getProducts(search, brandId);
      setProducts(data);
      setError('');
    } catch (e) {
      console.error('loadProducts error:', e);
      setError(`Database error: ${e.message}`);
    }
  }

  async function loadSummary() {
    try {
      const data = await getSummary();
      setSummary(data);
    } catch (e) {
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
        setError('Brands & types updated from API!');
        setTimeout(() => setError(''), 3000);
      } else {
        setError(`Refresh failed: ${result.error}`);
      }
    } catch (e) {
      setError('Failed to refresh from API');
    } finally {
      setRefreshing(false);
    }
  }

  function handleDelete(product) {
    confirmAction(
      'Delete Device',
      `Remove "${product.model_name}" and all its service history?`,
      async () => {
        await deleteProduct(product.id);
        loadProducts();
        loadSummary();
      }
    );
  }

  function getWarrantyStatus(daysLeft) {
    if (daysLeft === null || daysLeft === undefined) return { text: 'No warranty info', color: '#999' };
    if (daysLeft < 0) return { text: 'Warranty expired', color: '#e74c3c' };
    if (daysLeft <= 7) return { text: `Expires in ${daysLeft} days`, color: '#e74c3c' };
    if (daysLeft <= 30) return { text: `Expires in ${daysLeft} days`, color: '#f39c12' };
    return { text: `Still covered (${daysLeft} days left)`, color: '#27ae60' };
  }

  function formatDateDisplay(date, precision) {
    if (!date) return 'Unknown';
    if (precision === 'year_only') {
      return date.split('-')[0];
    }
    if (precision === 'unknown') {
      return 'Unknown';
    }
    return date;
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

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchBar}
        placeholder="Search devices, brands, or types..."
        placeholderTextColor="#999"
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.toolbar}>
        <View style={styles.filterWrap}>
          <Dropdown
            items={[{ label: 'All Brands', value: null }, ...brands.map((b) => ({ label: b.name, value: b.id }))]}
            selectedValue={brandId}
            onValueChange={setBrandId}
            placeholder="All Brands"
          />
        </View>
        <TouchableOpacity style={styles.exportButton} onPress={() => navigation.navigate('Analytics')}>
          <Text style={styles.exportButtonText}>📊 Analytics</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exportButton} onPress={exportAllCSV}>
          <Text style={styles.exportButtonText}>⬇ Export CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.exportButton, refreshing && styles.exportButtonDisabled]} 
          onPress={handleRefreshBrands}
          disabled={refreshing}
        >
          <Text style={styles.exportButtonText}>{refreshing ? '⟳ Refreshing...' : '🔄 Refresh API'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{summary.deviceCount}</Text>
          <Text style={styles.statLabel}>Devices</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{summary.serviceCount}</Text>
          <Text style={styles.statLabel}>Services</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>${Number(summary.totalSpent).toFixed(2)}</Text>
          <Text style={styles.statLabel}>Total Spent</Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={products}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No devices yet</Text>
            <Text style={styles.emptySubtext}>Tap + to add your first device</Text>
          </View>
        }
        renderItem={({ item }) => {
          const warranty = getWarrantyStatus(item.warranty_days_left);
          // Supabase returns nested objects: brands.name and device_types.name
          const brandName = item.brands?.name || '';
          const typeName = item.device_types?.name || '';
          return (
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.cardMain}
                onPress={() => navigation.navigate('DeviceHistory', { productId: item.id })}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardIcon}>{getDeviceIcon(typeName)}</Text>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{item.model_name}</Text>
                    <Text style={styles.cardSubtitle}>
                      {brandName} · {typeName}
                    </Text>
                    {item.warranty_expiry_date && (
                      <View style={styles.warrantyBadgeRow}>
                        <View style={[styles.warrantyBadge, { backgroundColor: warranty.color }]}>
                          <Text style={styles.warrantyBadgeText}>{warranty.text}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                  <Text style={styles.arrow}>›</Text>
                </View>
                {item.purchase_date && (
                  <Text style={styles.cardDate}>
                    Purchased: {formatDateDisplay(item.purchase_date, item.purchase_date_precision)}
                  </Text>
                )}
              </TouchableOpacity>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('AddDevice', { productId: item.id })}
                  hitSlop={8}
                >
                  <Text style={styles.actionText}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDelete(item)}
                  hitSlop={8}
                >
                  <Text style={styles.actionText}>🗑</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddDevice')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchBar: {
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  filterWrap: {
    flex: 1,
  },
  exportButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  list: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardMain: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  cardDate: {
    fontSize: 13,
    color: '#999',
    marginTop: 8,
  },
  arrow: {
    fontSize: 24,
    color: '#ccc',
    marginLeft: 4,
  },
  cardActions: {
    marginLeft: 12,
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 6,
  },
  actionText: {
    fontSize: 18,
  },
  warrantyBadgeRow: {
    marginTop: 4,
  },
  warrantyBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  warrantyBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    marginTop: 80,
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
