import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  Platform,
  useWindowDimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon, ScanLine, X } from 'lucide-react-native';
import Dropdown from '../components/Dropdown';
import DateField from '../components/DateField';
import { PressableScale } from '../components/motion';
import { useCurrency } from '../context/CurrencyContext';
import { colors, fonts, radii, shadows, spacing, type } from '../theme';
import {
  addProductFull,
  updateProductFull,
  getProductById,
  getBrands,
  getDeviceTypes,
  getBrandIdByName,
  getTypeIdByName,
} from '../database/database';
import { getCategoryNames, getBrandsForCategory, getCategoryById, getCategoryIdByName } from '../data/deviceCatalog';
import { lookupByBarcode } from '../utils/apiClient';
import { uriToPersistable } from '../utils/photo';

const PRECISION_OPTIONS = [
  { label: 'Exact date', value: 'exact' },
  { label: 'Year only', value: 'year_only' },
  { label: "Don't know", value: 'unknown' },
];

function computeWarrantyExpiry(purchaseDate, warrantyMonths) {
  if (!purchaseDate || !warrantyMonths) return null;
  const date = new Date(purchaseDate + 'T00:00:00');
  date.setMonth(date.getMonth() + parseInt(warrantyMonths));
  return date.toISOString().split('T')[0];
}

export default function AddDeviceScreen({ route, navigation }) {
  const { width } = useWindowDimensions();
  const wide = width >= 600;
  const { currency } = useCurrency();

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
  const [seller, setSeller] = useState('');
  const [serialNumber, setSerialNumber] = useState('');

  const [hasBill, setHasBill] = useState(false);
  const [billPhoto, setBillPhoto] = useState(null);
  const [invoicePhoto, setInvoicePhoto] = useState(null);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');

  const categories = getCategoryNames();
  const brandsForCategory = useCallback(catId => getBrandsForCategory(catId), []);

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
          const brandMatch = brandsForCategory(selectedType)?.find(
            b =>
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
        setSelectedType(getCategoryIdByName(type?.name) || '');
        setSelectedBrand(brand?.name || '');
        setPurchaseDate(product.purchase_date || '');
        setPurchaseDatePrecision(product.purchase_date_precision || 'exact');
        if (product.purchase_date_precision === 'year_only' && product.purchase_date) {
          setPurchaseYear(product.purchase_date.split('-')[0]);
        }
        setPurchasePrice(product.purchase_price ? String(product.purchase_price) : '');
        setHasBill(product.has_bill === true || product.has_bill === 1);
        setBillPhoto(product.bill_photo_path || null);
        setWarrantyMonths(
          product.warranty_period_months ? String(product.warranty_period_months) : ''
        );
        setWarrantyExpiryDate(product.warranty_expiry_date || '');
        setSeller(product.seller || '');
        setSerialNumber(product.serial_number || '');
        setInvoicePhoto(product.invoice_photo_path || null);
      }
    } catch (e) {
      console.error('Failed to load product:', e);
    }
  }

  // Handler functions
  function handleBrandChange(val) {
    setSelectedBrand(val);
    setErrors(prev => ({ ...prev, brand: undefined }));
  }

  function handleTypeChange(val) {
    setSelectedType(val);
    setErrors(prev => ({ ...prev, type: undefined }));
  }

  function handlePurchaseDateChange(newDate) {
    setPurchaseDate(newDate);
    if (warrantyMonths) {
      const expiry = computeWarrantyExpiry(newDate, warrantyMonths);
      setWarrantyExpiryDate(expiry);
    }
    setErrors(prev => ({ ...prev, purchaseDate: undefined }));
  }

  function handlePurchaseYearChange(year) {
    setPurchaseYear(year);
    setPurchaseDate(year ? `${year}-01-01` : '');
    if (warrantyMonths && year) {
      const expiry = computeWarrantyExpiry(`${year}-01-01`, warrantyMonths);
      setWarrantyExpiryDate(expiry);
    }
    setErrors(prev => ({ ...prev, purchaseDate: undefined }));
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
    setErrors(prev => ({ ...prev, warrantyMonths: undefined }));
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
    if (purchasePrice && isNaN(parseFloat(purchasePrice)))
      errs.purchasePrice = 'Price must be a number';
    if (warrantyMonths && (isNaN(parseInt(warrantyMonths)) || parseInt(warrantyMonths) < 0)) {
      errs.warrantyMonths = 'Warranty months must be a positive number';
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      // Look up database IDs from names
      const brandId = await getBrandIdByName(selectedBrand);
      const category = getCategoryById(selectedType);
      const typeId = await getTypeIdByName(brandId, category?.name || selectedType);

      if (!brandId || !typeId) {
        Alert.alert(
          'Error',
          'Selected brand or type not found in database. Try refreshing brands.'
        );
        setSaving(false);
        return;
      }

      const fields = {
        modelName: modelName.trim() || 'Unnamed device',
        typeId: typeId,
        brandId: brandId,
        purchaseDate: purchaseDate || null,
        purchaseDatePrecision: purchaseDatePrecision,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
        hasBill: hasBill,
        billPhoto: billPhoto,
        warrantyPeriodMonths: warrantyMonths ? parseInt(warrantyMonths) : null,
        warrantyExpiryDate: warrantyExpiryDate || null,
        seller: seller.trim() || null,
        serialNumber: serialNumber.trim() || null,
        invoicePhoto: invoicePhoto,
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
          <View style={[styles.fieldGroup, styles.fieldGroupRow]}>
            <Text style={styles.label}>Category *</Text>
            <Dropdown
              items={categories}
              selectedValue={selectedType}
              onValueChange={handleTypeChange}
              placeholder="Select Category"
            />
            {errors.type ? <Text style={styles.fieldError}>{errors.type}</Text> : null}
          </View>

          <View style={[styles.fieldGroup, styles.fieldGroupRow]}>
            <Text style={styles.label}>Brand *</Text>
            <Dropdown
              items={
                selectedType
                  ? brandsForCategory(selectedType).map(b => ({ label: b, value: b }))
                  : []
              }
              selectedValue={selectedBrand}
              onValueChange={handleBrandChange}
              placeholder={!selectedType ? 'Select category first' : 'Select Brand'}
              disabled={!selectedType}
            />
            {errors.brand ? <Text style={styles.fieldError}>{errors.brand}</Text> : null}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Model Name</Text>
          <View style={styles.inputWithButton}>
            <TextInput
              style={[styles.input, styles.modelInput, errors.model && styles.inputError]}
              placeholder="e.g. 1.5 Ton Split AC, Galaxy S23 (or tap Scan)"
              placeholderTextColor={colors.muted}
              value={modelName}
              onChangeText={t => {
                setModelName(t);
                setErrors(prev => ({ ...prev, model: undefined }));
              }}
            />
            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Alert.alert(
                    'Scan unavailable',
                    'Barcode lookup is currently available in the web build only.'
                  );
                  return;
                }
                const barcode = window.prompt('Enter barcode/UPC number:');
                if (barcode && barcode.trim()) {
                  lookupProductByBarcode(barcode.trim());
                }
              }}
            >
              <ScanLine size={16} color={colors.primary} strokeWidth={1.8} />
              <Text style={styles.scanButtonText}>Scan</Text>
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
            {PRECISION_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.precisionButton,
                  purchaseDatePrecision === opt.value && styles.precisionButtonActive,
                ]}
                onPress={() => {
                  setPurchaseDatePrecision(opt.value);
                  if (opt.value === 'exact') setPurchaseDate('');
                  if (opt.value === 'year_only') setPurchaseYear('');
                }}
              >
                <Text
                  style={[
                    styles.precisionButtonText,
                    purchaseDatePrecision === opt.value && styles.precisionButtonTextActive,
                  ]}
                >
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
              placeholderTextColor={colors.muted}
              value={purchaseYear}
              onChangeText={t => handlePurchaseYearChange(t.replace(/\D/g, '').slice(0, 4))}
              keyboardType="numeric"
              maxLength={4}
            />
          )}

          {purchaseDatePrecision === 'unknown' && (
            <Text style={styles.helpText}>No purchase date recorded - that's fine!</Text>
          )}
        </View>

        <View style={wide ? styles.rowWide : null}>
          <View style={[styles.fieldGroup, styles.fieldGroupRow]}>
            <Text style={styles.label}>Purchase Price ({currency})</Text>
            <TextInput
              style={[styles.input, errors.purchasePrice && styles.inputError]}
              placeholder="e.g. 1299.99 (optional)"
              placeholderTextColor={colors.muted}
              value={purchasePrice}
              onChangeText={t => {
                setPurchasePrice(t);
                setErrors(prev => ({ ...prev, purchasePrice: undefined }));
              }}
              keyboardType="decimal-pad"
            />
            {errors.purchasePrice ? (
              <Text style={styles.fieldError}>{errors.purchasePrice}</Text>
            ) : null}
          </View>

          <View style={[styles.fieldGroup, styles.fieldGroupRow]}>
            <Text style={styles.label}>Warranty period (months)</Text>
            <TextInput
              style={[styles.input, errors.warrantyMonths && styles.inputError]}
              placeholder="e.g. 12 (optional)"
              placeholderTextColor={colors.muted}
              value={warrantyMonths}
              onChangeText={handleWarrantyMonthsChange}
              keyboardType="numeric"
            />
            {errors.warrantyMonths ? (
              <Text style={styles.fieldError}>{errors.warrantyMonths}</Text>
            ) : null}
            <Text style={styles.helpText}>How long is the warranty? (e.g. 12 for 1 year)</Text>
          </View>
        </View>

        {!!warrantyExpiryDate && (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Warranty Expires</Text>
            <DateField
              value={warrantyExpiryDate}
              onChange={d => setWarrantyExpiryDate(d)}
              placeholder={warrantyExpiryDate}
            />
            <Text style={styles.helpText}>Auto-computed from purchase date + warranty months</Text>
          </View>
        )}

        {/* Bill Photo */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Bill / Receipt Photo</Text>
          <View style={styles.photoRow}>
            <TouchableOpacity style={styles.photoButton} onPress={takeBillPhoto}>
              <Camera size={16} color={colors.primary} strokeWidth={1.8} />
              <Text style={styles.photoButtonText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoButton} onPress={pickBillPhoto}>
              <ImageIcon size={16} color={colors.primary} strokeWidth={1.8} />
              <Text style={styles.photoButtonText}>Gallery</Text>
            </TouchableOpacity>
          </View>
          {!!billPhoto && (
            <View style={styles.previewWrap}>
              <Image source={{ uri: billPhoto }} style={styles.preview} />
              <TouchableOpacity
                style={styles.removePhoto}
                onPress={() => {
                  setBillPhoto(null);
                  setHasBill(false);
                }}
              >
                <X size={13} color={colors.white} strokeWidth={2} />
                <Text style={styles.removePhotoText}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Invoice Photo */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Invoice Photo</Text>
          <View style={styles.photoRow}>
            <TouchableOpacity style={styles.photoButton} onPress={takeInvoicePhoto}>
              <Camera size={16} color={colors.primary} strokeWidth={1.8} />
              <Text style={styles.photoButtonText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoButton} onPress={pickInvoicePhoto}>
              <ImageIcon size={16} color={colors.primary} strokeWidth={1.8} />
              <Text style={styles.photoButtonText}>Gallery</Text>
            </TouchableOpacity>
          </View>
          {!!invoicePhoto && (
            <View style={styles.previewWrap}>
              <Image source={{ uri: invoicePhoto }} style={styles.preview} />
              <TouchableOpacity style={styles.removePhoto} onPress={() => setInvoicePhoto(null)}>
                <X size={13} color={colors.white} strokeWidth={2} />
                <Text style={styles.removePhotoText}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Additional optional fields */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Seller / Store</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Best Buy, Amazon, Local Shop (optional)"
            placeholderTextColor={colors.muted}
            value={seller}
            onChangeText={setSeller}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Serial Number / IMEI</Text>
          <TextInput
            style={styles.input}
            placeholder="Optional"
            placeholderTextColor={colors.muted}
            value={serialNumber}
            onChangeText={setSerialNumber}
          />
        </View>

        <PressableScale
          style={styles.saveButton}
          hoverStyle={styles.saveButtonHover}
          onPress={handleSave}
          disabled={saving}
          accessibilityLabel={editingId ? 'Save device changes' : 'Save device'}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Save Device'}
          </Text>
        </PressableScale>
      </View>
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
    alignItems: 'center',
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.medium,
  },
  subtitle: {
    ...type.body,
    color: colors.muted,
    marginBottom: spacing.md,
  },
  errorBanner: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.md,
    padding: 12,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  errorBannerText: {
    ...type.small,
    color: colors.danger,
  },
  rowWide: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  fieldGroup: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    marginBottom: 4,
    width: '100%',
  },
  fieldGroupRow: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    width: 'auto',
  },
  label: {
    ...type.label,
    color: colors.textBody,
    marginBottom: 6,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: 14,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modelInput: {
    flex: 1,
  },
  inputError: {
    borderColor: colors.danger,
  },
  fieldError: {
    fontFamily: fonts.body,
    color: colors.danger,
    fontSize: 12,
    marginTop: 5,
  },
  sectionDivider: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    ...type.label,
    color: colors.textBody,
  },
  precisionSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  precisionButton: {
    backgroundColor: colors.row,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.border,
  },
  precisionButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  precisionButtonText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textBody,
  },
  precisionButtonTextActive: {
    fontFamily: fonts.bodySemibold,
    color: colors.white,
  },
  helpText: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted,
    marginTop: 6,
    fontStyle: 'italic',
  },
  photoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: 13,
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoButtonText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
  },
  previewWrap: {
    marginTop: spacing.md,
    position: 'relative',
  },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: radii.md,
    backgroundColor: colors.row,
  },
  removePhoto: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.overlay,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  removePhotoText: {
    fontFamily: fonts.bodySemibold,
    color: colors.white,
    fontSize: 12,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: spacing.xl,
    ...shadows.soft,
  },
  saveButtonHover: {
    backgroundColor: colors.primaryDark,
  },
  saveButtonText: {
    ...type.button,
    color: colors.white,
    fontSize: 15,
  },
  inputWithButton: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'stretch',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  scanButtonText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    color: colors.primary,
  },
});
