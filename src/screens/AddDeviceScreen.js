import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  useWindowDimensions,
  Image,
  Switch,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Dropdown from '../components/Dropdown';
import DateField from '../components/DateField';
import { 
  addProductFull, 
  updateProductFull, 
  getProductById,
  getBrandIdByName,
  getTypeIdByName,
  getBrands,
  getDeviceTypes
} from '../database/database';
import { 
  DEVICE_CATEGORIES, 
  getCategoryNames, 
  getBrandsForCategory,
  getDefaultWarranty,
  getServiceInterval,
} from '../data/deviceCatalog';
import { lookupByBarcode } from '../utils/apiClient';

const PRECISION_OPTIONS = [
  { label: 'Exact date', value: 'exact' },
  { label: 'Year only', value: 'year_only' },
  { label: 'Don\'t know', value: 'unknown' },
];

function computeWarrantyExpiry(purchaseDate, warrantyMonths) {
  if (!purchaseDate || !warrantyMonths) return null;
  const date = new Date(purchaseDate + 'T00:00:00');
  date.setMonth(date.getMonth() + parseInt(warrantyMonths));
  return date.toISOString().split('T')[0];
}

export default function AddDeviceScreenTest({ route, navigation }) {
  const { width } = useWindowDimensions();
  const wide = width >= 600;

  const editingId = route.params?.productId ?? null;

  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [modelName, setModelName] = useState('');
  
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchaseDatePrecision, setPurchaseDatePrecision] = useState('exact');
  const [purchaseYear, setPurchaseYear] = useState('');
  
  const [purchasePrice, setPurchasePrice] = useState('');
  
  const [warrantyMonths, setWarrantyMonths] = useState('');
  const [warrantyExpiryDate, setWarrantyExpiryDate] = useState('');
  const [nextServiceDue, setNextServiceDue] = useState('');
  const [seller, setSeller] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');

  const categories = getCategoryNames();
  const brandsForCategory = useCallback((catId) => getBrandsForCategory(catId), []);

  // Lookup product by barcode using backend API
  async function lookupProductByBarcode(barcode) {
    setError('Looking up product...');
    try {
      const result = await lookupByBarcode(barcode);
      if (result.productData?.product?.data?.product) {
        const p = result.productData.product.data.product;
        // Auto-fill fields from barcode lookup
        if (p.name) setModelName(p.name);
        if (p.brand) {
          // Find brand in our dropdown
          const brandMatch = brandsForCategory(selectedType)?.find(b => 
            b.toLowerCase().includes(p.brand.toLowerCase()) || 
            p.brand.toLowerCase().includes(b.toLowerCase())
          );
          if (brandMatch) setSelectedBrand(brandMatch);
        }
        if (p.price) setPurchasePrice(String(p.price));
        setError(`Found: ${p.name}${p.brand ? ` (${p.brand})` : ''}`);
        setTimeout(() => setError(''), 3000);
      } else if (result.searchResults?.results?.length > 0) {
        setError(`Found ${result.searchResults.results.length} results - please fill manually`);
        setTimeout(() => setError(''), 3000);
      } else {
        setError('Product not found in database - please fill manually');
        setTimeout(() => setError(''), 3000);
      }
    } catch (e) {
      console.error('Barcode lookup error:', e);
      setError('Lookup failed - please fill manually');
      setTimeout(() => setError(''), 3000);
    }
  }

  useEffect(() => {
    navigation.setOptions({ title: editingId ? 'Edit Device' : 'Add Device' });
  }, [editingId, navigation]);

  useEffect(() => {
    if (editingId) {
      loadProduct(editingId);
    }
  }, [editingId]);

  async function loadProduct(productId) {
    try {
      const product = await getProductById(productId);
      if (product) {
        // Get brand and type names for dropdowns
        const brands = await getBrands();
        const brand = brands.find(b => b.id === product.brand_id);
        const types = await getDeviceTypes(product.brand_id);
        const type = types.find(t => t.id === product.type_id);
        
        setModelName(product.model_name || '');
        setSelectedType(type?.name || '');
        setSelectedBrand(brand?.name || '');
        setPurchaseDate(product.purchase_date || '');
        setPurchaseDatePrecision(product.purchase_date_precision || 'exact');
        if (product.purchase_date_precision === 'year_only' && product.purchase_date) {
          setPurchaseYear(product.purchase_date.split('-')[0]);
        }
        setPurchasePrice(product.purchase_price ? String(product.purchase_price) : '');
        setHasBill(product.has_bill === 1);
        setBillPhoto(product.bill_photo || null);
        setWarrantyMonths(product.warranty_period_months ? String(product.warranty_period_months) : '');
        setWarrantyExpiryDate(product.warranty_expiry_date || '');
        setSeller(product.seller || '');
        setSerialNumber(product.serial_number || '');
        setInvoicePhoto(product.invoice_photo || null);
      }
    } catch (e) {
      console.error('Failed to load product:', e);
    }
  }

  // Handler functions
  function handleBrandChange(val) {
    setSelectedBrand(val);
    setErrors((prev) => ({ ...prev, brand: undefined }));
  }

  function handleTypeChange(val) {
    setSelectedType(val);
    setErrors((prev) => ({ ...prev, type: undefined }));
  }

  function handlePurchaseDateChange(newDate) {
    setPurchaseDate(newDate);
    if (warrantyMonths) {
      const expiry = computeWarrantyExpiry(newDate, warrantyMonths);
      setWarrantyExpiryDate(expiry);
    }
    setErrors((prev) => ({ ...prev, purchaseDate: undefined }));
  }

  function handlePurchaseYearChange(year) {
    setPurchaseYear(year);
    setPurchaseDate(year ? `${year}-01-01` : '');
    if (warrantyMonths && year) {
      const expiry = computeWarrantyExpiry(`${year}-01-01`, warrantyMonths);
      setWarrantyExpiryDate(expiry);
    }
    setErrors((prev) => ({ ...prev, purchaseDate: undefined }));
  }

  function handleWarrantyMonthsChange(val) {
    setWarrantyMonths(val);
    const baseDate = purchaseDate || (purchaseYear ? `${purchaseYear}-01-01` : '');
    if (baseDate && val) {
      const expiry = computeWarrantyExpiry(baseDate, val);
      setWarrantyExpiryDate(expiry);
    } else {
      setWarrantyExpiryDate('');
    }
    setErrors((prev) => ({ ...prev, warrantyMonths: undefined }));
  }

  async function pickBillPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photo library');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled) {
      const persistPhoto = await uriToPersistable(result.assets[0].uri);
      setBillPhoto(persistPhoto);
      setHasBill(true);
    }
  }

  async function takeBillPhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your camera');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });
    if (!result.canceled) {
      const persistPhoto = await uriToPersistable(result.assets[0].uri);
      setBillPhoto(persistPhoto);
      setHasBill(true);
    }
  }

  async function pickInvoicePhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photo library');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled) {
      const persistPhoto = await uriToPersistable(result.assets[0].uri);
      setInvoicePhoto(persistPhoto);
    }
  }

  async function takeInvoicePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your camera');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });
    if (!result.canceled) {
      const persistPhoto = await uriToPersistable(result.assets[0].uri);
      setInvoicePhoto(persistPhoto);
    }
  }

  async function handleSave() {
    if (saving) return;

    const errs = {};
    if (!selectedBrand) errs.brand = 'Please select a brand';
    if (!selectedType) errs.type = 'Please select a device type';
    // Model name is optional - can be filled by scan or typed manually
    if (purchasePrice && isNaN(parseFloat(purchasePrice))) errs.purchasePrice = 'Price must be a number';
    if (warrantyMonths && (isNaN(parseInt(warrantyMonths)) || parseInt(warrantyMonths) < 0)) {
      errs.warrantyMonths = 'Warranty months must be a positive number';
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      // Look up database IDs from names
      const brandId = await getBrandIdByName(selectedBrand);
      const typeId = await getTypeIdByName(brandId, selectedType);
      
      if (!brandId || !typeId) {
        Alert.alert('Error', 'Selected brand or type not found in database. Try refreshing brands.');
        setSaving(false);
        return;
      }
      
      const fields = {
        modelName: modelName.trim(),
        typeId: typeId,
        brandId: brandId,
        purchaseDate: purchaseDate || null,
        purchaseDatePrecision: purchaseDatePrecision,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
        hasBill: hasBill,
        billPhoto: null,
        warrantyPeriodMonths: warrantyMonths ? parseInt(warrantyMonths) : null,
        warrantyExpiryDate: warrantyExpiryDate || null,
        seller: seller.trim() || null,
        serialNumber: serialNumber.trim() || null,
        invoicePhoto: null,
      };
      
      if (editingId) {
        await updateProductFull(editingId, fields);
      } else {
        const productId = await addProductFull(fields);
        if (fields.warrantyExpiryDate) {
          const { createWarrantyReminder } = await import('../database/database');
          await createWarrantyReminder(productId, fields.warrantyExpiryDate);
        }
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
      setSaving(false);
    }
  }

  const showDateField = purchaseDatePrecision === 'exact';
  const showYearField = purchaseDatePrecision === 'year_only';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.subtitle}>
          Add a device - only name and category required, rest optional
        </Text>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        {/* Required fields first - Category first, then Brand */}
        <View style={wide ? styles.rowWide : null}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Category *</Text>
            <Dropdown
              items={categories}
              selectedValue={selectedType}
              onValueChange={handleTypeChange}
              placeholder="Select Category"
            />
            {errors.type ? <Text style={styles.fieldError}>{errors.type}</Text> : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Brand *</Text>
            <Dropdown
              items={selectedType 
                ? brandsForCategory(selectedType).map(b => ({ label: b, value: b }))
                : []
              }
              selectedValue={selectedBrand}
              onValueChange={handleBrandChange}
              placeholder={
                !selectedType
                  ? 'Select category first'
                  : 'Select Brand'
              }
              disabled={!selectedType}
            />
            {errors.brand ? <Text style={styles.fieldError}>{errors.brand}</Text> : null}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Model Name</Text>
          <View style={styles.inputWithButton}>
            <TextInput
              style={[styles.input, errors.model && styles.inputError]}
              placeholder="e.g. 1.5 Ton Split AC, Galaxy S23 (or tap 📷 Scan)"
              placeholderTextColor="#999"
              value={modelName}
              onChangeText={(t) => {
                setModelName(t);
                setErrors((prev) => ({ ...prev, model: undefined }));
              }}
            />
            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => {
                // Simple approach: prompt for barcode number
                const barcode = prompt('Enter barcode/UPC number:');
                if (barcode && barcode.trim()) {
                  lookupProductByBarcode(barcode.trim());
                }
              }}
            >
              <Text style={styles.scanButtonText}>📷 Scan</Text>
            </TouchableOpacity>
          </View>
          {/* Model name is optional - can be filled by scan or typed manually */}
        </View>

        {/* Purchase info - all optional with precision */}
        <View style={styles.sectionDivider}>
          <Text style={styles.sectionTitle}>Purchase Info (all optional)</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>When purchased?</Text>
          <Text style={styles.helpText}>How sure are you about the date?</Text>
          
          {/* Precision selector */}
          <View style={styles.precisionSelector}>
            {PRECISION_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.precisionButton,
                  purchaseDatePrecision === opt.value && styles.precisionButtonActive
                ]}
                onPress={() => {
                  setPurchaseDatePrecision(opt.value);
                  if (opt.value === 'exact') setPurchaseDate('');
                  if (opt.value === 'year_only') setPurchaseYear('');
                }}
              >
                <Text style={[
                  styles.precisionButtonText,
                  purchaseDatePrecision === opt.value && styles.precisionButtonTextActive
                ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {showDateField && (
            <DateField
              value={purchaseDate}
              onChange={handlePurchaseDateChange}
              placeholder="Select exact date"
            />
          )}

          {showYearField && (
            <TextInput
              style={styles.input}
              placeholder="e.g. 2023"
              placeholderTextColor="#999"
              value={purchaseYear}
              onChangeText={(t) => handlePurchaseYearChange(t.replace(/\D/g, '').slice(0, 4))}
              keyboardType="numeric"
              maxLength={4}
            />
          )}

          {purchaseDatePrecision === 'unknown' && (
            <Text style={styles.helpText}>No purchase date recorded - that's fine!</Text>
          )}
        </View>

        <View style={wide ? styles.rowWide : null}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Purchase Price ($)</Text>
            <TextInput
              style={[styles.input, errors.purchasePrice && styles.inputError]}
              placeholder="e.g. 1299.99 (optional)"
              placeholderTextColor="#999"
              value={purchasePrice}
              onChangeText={(t) => { setPurchasePrice(t); setErrors((prev) => ({ ...prev, purchasePrice: undefined })); }}
              keyboardType="decimal-pad"
            />
            {errors.purchasePrice ? <Text style={styles.fieldError}>{errors.purchasePrice}</Text> : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Warranty period (months)</Text>
            <TextInput
              style={[styles.input, errors.warrantyMonths && styles.inputError]}
              placeholder="e.g. 12 (optional)"
              placeholderTextColor="#999"
              value={warrantyMonths}
              onChangeText={handleWarrantyMonthsChange}
              keyboardType="numeric"
            />
            {errors.warrantyMonths ? <Text style={styles.fieldError}>{errors.warrantyMonths}</Text> : null}
            <Text style={styles.helpText}>How long is the warranty? (e.g. 12 for 1 year)</Text>
          </View>
        </View>

        {warrantyExpiryDate && (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Warranty Expires</Text>
            <DateField
              value={warrantyExpiryDate}
              onChange={(d) => setWarrantyExpiryDate(d)}
              placeholder={warrantyExpiryDate}
            />
            <Text style={styles.helpText}>Auto-computed from purchase date + warranty months</Text>
          </View>
        )}

        {/* Additional optional fields */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Seller / Store</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Best Buy, Amazon, Local Shop (optional)"
            placeholderTextColor="#999"
            value={seller}
            onChangeText={setSeller}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Serial Number / IMEI</Text>
          <TextInput
            style={styles.input}
            placeholder="Optional"
            placeholderTextColor="#999"
            value={serialNumber}
            onChangeText={setSerialNumber}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Save Device'}
          </Text>
        </TouchableOpacity>
      </View>
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
    alignItems: 'center',
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  errorBanner: {
    backgroundColor: '#fff3f3',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f5c6c6',
  },
  errorBannerText: {
    color: '#c0392b',
    fontSize: 13,
    lineHeight: 18,
  },
  rowWide: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldGroup: {
    flex: 1,
    marginBottom: 4,
    width: '100%',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  fieldError: {
    color: '#e74c3c',
    fontSize: 13,
    marginTop: 5,
  },
  sectionDivider: {
    marginTop: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  precisionSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  precisionButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  precisionButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  precisionButtonText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  precisionButtonTextActive: {
    color: '#fff',
  },
  helpText: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
    fontStyle: 'italic',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  photoButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  photoButtonText: {
    fontSize: 15,
    color: '#333',
  },
  previewWrap: {
    marginTop: 12,
    position: 'relative',
  },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#eee',
  },
  removePhoto: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  removePhotoText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 32,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  inputWithButton: {
    flexDirection: 'row',
    gap: 8,
  },
  scanButton: {
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d0d0d0',
  },
  scanButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
});