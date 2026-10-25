import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  useWindowDimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon, X } from 'lucide-react-native';
import DateField from '../components/DateField';
import { PressableScale } from '../components/motion';
import { useCurrency } from '../context/CurrencyContext';
import { colors, fonts, radii, shadows, spacing, type } from '../theme';
import { addServiceLogFull, updateServiceLogFull, getServiceLogById } from '../database/database';
import { uriToPersistable } from '../utils/photo';

const PRECISION_OPTIONS = [
  { label: 'Exact date', value: 'exact' },
  { label: 'Month/Year', value: 'year_only' },
  { label: "Don't know", value: 'unknown' },
];

function getToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDayName() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[new Date().getDay()];
}

function getCurrentTime() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function dayFromDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[d.getDay()];
}

export default function AddServiceScreen({ route, navigation }) {
  const { productId } = route.params;
  const editingId = route.params?.logId ?? null;
  const { width } = useWindowDimensions();
  const wide = width >= 600;
  const { currency } = useCurrency();

  const [note, setNote] = useState('');
  const [cost, setCost] = useState('');
  const [repairmanName, setRepairmanName] = useState('');
  const [repairmanContact, setRepairmanContact] = useState('');
  const [vendorName, setVendorName] = useState('');

  // Service date with precision
  const [date, setDate] = useState(getToday());
  const [datePrecision, setDatePrecision] = useState('exact');
  const [serviceYear, setServiceYear] = useState('');
  const [serviceMonth, setServiceMonth] = useState('');
  const [day, setDay] = useState(getDayName());
  const [time, setTime] = useState(getCurrentTime());
  const [nextServiceDue, setNextServiceDue] = useState('');
  const [paymentMode, setPaymentMode] = useState('');

  const [photoUri, setPhotoUri] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    navigation.setOptions({ title: editingId ? 'Edit Service Entry' : 'Add Service Entry' });
  }, [editingId, navigation]);

  useEffect(() => {
    if (editingId) {
      loadLog(editingId);
    }
  }, [editingId]);

  async function loadLog(logId) {
    try {
      const log = await getServiceLogById(logId);
      if (!log) return;
      setNote(log.note || '');
      setCost(log.cost !== null && log.cost !== undefined ? String(log.cost) : '');
      setRepairmanName(log.repairman_name || '');
      setRepairmanContact(log.repairman_contact || '');
      setVendorName(log.vendor_name || '');
      setDate(log.date || getToday());
      setDatePrecision(log.date_precision || 'exact');
      if (log.date) {
        const parts = log.date.split('-');
        if (parts.length >= 2) {
          setServiceYear(parts[0]);
          setServiceMonth(parts[1]);
        }
      }
      setDay(log.day || dayFromDate(log.date) || getDayName());
      setTime(log.time || getCurrentTime());
      setNextServiceDue(log.next_service_due || '');
      setPaymentMode(log.payment_mode || '');
      setPhotoUri(log.photo_url || null);
    } catch {
      setError('Could not load this entry. Please refresh.');
    }
  }

  function handleDateChange(newDate) {
    setDate(newDate);
    setDay(dayFromDate(newDate) || day);
    setErrors(prev => ({ ...prev, date: undefined }));
  }

  function handleYearMonthChange(year, month) {
    const monthNum = Number(month);
    if (year && month && monthNum >= 1 && monthNum <= 12) {
      setDate(`${year}-${String(month).padStart(2, '0')}-01`);
    }
    setErrors(prev => ({ ...prev, date: undefined }));
  }

  async function pickImage() {
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
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your camera');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handleSave() {
    if (saving) return;

    const errs = {};
    // note is now optional per project brief - only device selection required
    if (datePrecision === 'exact' && !date) errs.date = 'Please select a date';
    if (datePrecision === 'year_only' && (!serviceYear || !serviceMonth))
      errs.date = 'Please enter year and month';
    if (datePrecision === 'year_only' && serviceMonth) {
      const monthNum = Number(serviceMonth);
      if (monthNum < 1 || monthNum > 12) errs.date = 'Month must be between 1 and 12';
    }
    if (time && !/^\d{1,2}:\d{2}$/.test(time.trim())) errs.time = 'Use HH:MM format';
    if (cost && isNaN(parseFloat(cost))) errs.cost = 'Cost must be a number';
    if (nextServiceDue && !/^\d{4}-\d{2}-\d{2}$/.test(nextServiceDue)) {
      errs.nextServiceDue = 'Use YYYY-MM-DD format';
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const persistPhoto = await uriToPersistable(photoUri);
      const fields = {
        note: note.trim(),
        cost: cost ? parseFloat(cost) : null,
        repairmanName: repairmanName.trim() || null,
        repairmanContact: repairmanContact.trim() || null,
        vendorName: vendorName.trim() || null,
        date: datePrecision === 'unknown' || !date ? null : date,
        datePrecision: datePrecision,
        day: day || null,
        time: time.trim() || getCurrentTime(),
        photoUrl: persistPhoto,
        nextServiceDue: nextServiceDue || null,
        paymentMode: paymentMode.trim() || null,
      };
      if (editingId) {
        await updateServiceLogFull(editingId, fields);
      } else {
        await addServiceLogFull(productId, fields);
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
      setSaving(false);
    }
  }

  const showDateField = datePrecision === 'exact';
  const showYearMonthField = datePrecision === 'year_only';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        {/* Date with precision */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Service Date</Text>
          <Text style={styles.helpText}>How sure are you about the date?</Text>

          <View style={styles.precisionSelector}>
            {PRECISION_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.precisionButton,
                  datePrecision === opt.value && styles.precisionButtonActive,
                ]}
                onPress={() => setDatePrecision(opt.value)}
              >
                <Text
                  style={[
                    styles.precisionButtonText,
                    datePrecision === opt.value && styles.precisionButtonTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {showDateField && (
            <DateField value={date} onChange={handleDateChange} placeholder="Select service date" />
          )}

          {showYearMonthField && (
            <View style={styles.rowWide}>
              <View style={[styles.fieldGroup, styles.fieldGroupRow]}>
                <Text style={styles.label}>Year</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2024"
                  placeholderTextColor={colors.muted}
                  value={serviceYear}
                  onChangeText={t => {
                    const next = t.replace(/\D/g, '').slice(0, 4);
                    setServiceYear(next);
                    handleYearMonthChange(next, serviceMonth);
                  }}
                  keyboardType="numeric"
                  maxLength={4}
                />
              </View>
              <View style={[styles.fieldGroup, styles.fieldGroupRow]}>
                <Text style={styles.label}>Month</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1-12"
                  placeholderTextColor={colors.muted}
                  value={serviceMonth}
                  onChangeText={t => {
                    const next = t.replace(/\D/g, '').slice(0, 2);
                    setServiceMonth(next);
                    handleYearMonthChange(serviceYear, next);
                  }}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
            </View>
          )}

          {datePrecision === 'unknown' && (
            <Text style={styles.helpText}>No specific date recorded — that's fine!</Text>
          )}

          {errors.date ? <Text style={styles.fieldError}>{errors.date}</Text> : null}
        </View>

        {showDateField && (
          <View style={wide ? styles.rowWide : null}>
            <View style={[styles.fieldGroup, styles.fieldGroupRow]}>
              <Text style={styles.label}>Day</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Mon"
                placeholderTextColor={colors.muted}
                value={day}
                onChangeText={setDay}
              />
            </View>
            <View style={[styles.fieldGroup, styles.fieldGroupRow]}>
              <Text style={styles.label}>Time</Text>
              <View style={styles.timeRow}>
                <TextInput
                  style={[styles.input, styles.timeInput, errors.time && styles.inputError]}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.muted}
                  value={time}
                  onChangeText={t => {
                    setTime(t);
                    setErrors(prev => ({ ...prev, time: undefined }));
                  }}
                  keyboardType="numbers-and-punctuation"
                />
                <TouchableOpacity
                  style={styles.nowButton}
                  onPress={() => setTime(getCurrentTime())}
                >
                  <Text style={styles.nowButtonText}>Now</Text>
                </TouchableOpacity>
              </View>
              {errors.time ? <Text style={styles.fieldError}>{errors.time}</Text> : null}
            </View>
          </View>
        )}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>What was done?</Text>
          <Text style={styles.helpText}>Optional — describe the repair or service</Text>
          <TextInput
            style={[styles.input, styles.textArea, errors.note && styles.inputError]}
            placeholder="e.g. Gas refill, filter cleaned, compressor replaced"
            placeholderTextColor={colors.muted}
            value={note}
            onChangeText={t => {
              setNote(t);
              setErrors(prev => ({ ...prev, note: undefined }));
            }}
            multiline
            numberOfLines={4}
          />
          {errors.note ? <Text style={styles.fieldError}>{errors.note}</Text> : null}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Cost paid ({currency}) — optional</Text>
          <Text style={styles.helpText}>How much did you pay for this service?</Text>
          <TextInput
            style={[styles.input, errors.cost && styles.inputError]}
            placeholder="e.g. 150.00"
            placeholderTextColor={colors.muted}
            value={cost}
            onChangeText={t => {
              setCost(t);
              setErrors(prev => ({ ...prev, cost: undefined }));
            }}
            keyboardType="decimal-pad"
          />
          {errors.cost ? <Text style={styles.fieldError}>{errors.cost}</Text> : null}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Payment Mode — optional</Text>
          <TextInput
            style={styles.input}
            placeholder="Cash, UPI, Card, etc."
            placeholderTextColor={colors.muted}
            value={paymentMode}
            onChangeText={setPaymentMode}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Technician / Shop Name — optional</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Ramesh AC Repair, Samsung Service Center"
            placeholderTextColor={colors.muted}
            value={vendorName}
            onChangeText={setVendorName}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Technician Name — optional</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. John, Ramesh"
            placeholderTextColor={colors.muted}
            value={repairmanName}
            onChangeText={setRepairmanName}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Contact Number — optional</Text>
          <TextInput
            style={styles.input}
            placeholder={'Phone, WhatsApp, or "Ramesh: 98xxxxxxxx"'}
            placeholderTextColor={colors.muted}
            value={repairmanContact}
            onChangeText={setRepairmanContact}
          />
          <Text style={styles.helpText}>Free text — paste whatever you have in contacts</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Next Service Due — optional</Text>
          <DateField
            value={nextServiceDue}
            onChange={setNextServiceDue}
            placeholder="Select next service date"
          />
          {errors.nextServiceDue ? (
            <Text style={styles.fieldError}>{errors.nextServiceDue}</Text>
          ) : null}
          <Text style={styles.helpText}>We'll remind you when it's due</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Photo — optional</Text>
          <View style={styles.photoRow}>
            <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
              <Camera size={16} color={colors.primary} strokeWidth={1.8} />
              <Text style={styles.photoButtonText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
              <ImageIcon size={16} color={colors.primary} strokeWidth={1.8} />
              <Text style={styles.photoButtonText}>Gallery</Text>
            </TouchableOpacity>
          </View>
          {photoUri ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: photoUri }} style={styles.preview} />
              <TouchableOpacity style={styles.removePhoto} onPress={() => setPhotoUri(null)}>
                <X size={13} color={colors.white} strokeWidth={2} />
                <Text style={styles.removePhotoText}>Remove photo</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <PressableScale
          style={styles.saveButton}
          hoverStyle={styles.saveButtonHover}
          onPress={handleSave}
          disabled={saving}
          accessibilityLabel={editingId ? 'Save service changes' : 'Save service entry'}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Save Service Entry'}
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
  inputError: {
    borderColor: colors.danger,
  },
  fieldError: {
    fontFamily: fonts.body,
    color: colors.danger,
    fontSize: 12,
    marginTop: 5,
  },
  textArea: {
    minHeight: 92,
    textAlignVertical: 'top',
    paddingTop: 14,
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
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeInput: {
    flex: 1,
  },
  nowButton: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  nowButtonText: {
    fontFamily: fonts.bodySemibold,
    color: colors.primary,
    fontSize: 13,
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
});
