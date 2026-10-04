import React, { useState, useEffect } from 'react';
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
  Switch,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateField from '../components/DateField';
import { addServiceLogFull, updateServiceLogFull, getServiceLogById } from '../database/database';
import { uriToPersistable } from '../utils/photo';

const PRECISION_OPTIONS = [
  { label: 'Exact date', value: 'exact' },
  { label: 'Month/Year', value: 'year_only' },
  { label: 'Don\'t know', value: 'unknown' },
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
    } catch (e) {
      setError('Could not load this entry. Please refresh.');
    }
  }

  function handleDateChange(newDate) {
    setDate(newDate);
    setDay(dayFromDate(newDate) || day);
    setErrors((prev) => ({ ...prev, date: undefined }));
  }

  function handleYearMonthChange() {
    if (serviceYear && serviceMonth) {
      setDate(`${serviceYear}-${serviceMonth}-01`);
    }
    setErrors((prev) => ({ ...prev, date: undefined }));
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
    if (datePrecision === 'year_only' && (!serviceYear || !serviceMonth)) errs.date = 'Please enter year and month';
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
        date: (datePrecision === 'unknown' || !date) ? null : date,
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
            {PRECISION_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.precisionButton,
                  datePrecision === opt.value && styles.precisionButtonActive
                ]}
                onPress={() => setDatePrecision(opt.value)}
              >
                <Text style={[
                  styles.precisionButtonText,
                  datePrecision === opt.value && styles.precisionButtonTextActive
                ]}>
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
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Year</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2024"
                  placeholderTextColor="#999"
                  value={serviceYear}
                  onChangeText={(t) => { setServiceYear(t.replace(/\D/g, '').slice(0, 4)); handleYearMonthChange(); }}
                  keyboardType="numeric"
                  maxLength={4}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Month</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1-12"
                  placeholderTextColor="#999"
                  value={serviceMonth}
                  onChangeText={(t) => { setServiceMonth(t.replace(/\D/g, '').slice(0, 2)); handleYearMonthChange(); }}
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
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Day</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Mon"
                placeholderTextColor="#999"
                value={day}
                onChangeText={setDay}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Time</Text>
              <View style={styles.timeRow}>
                <TextInput
                  style={[styles.input, styles.timeInput, errors.time && styles.inputError]}
                  placeholder="HH:MM"
                  placeholderTextColor="#999"
                  value={time}
                  onChangeText={(t) => {
                    setTime(t);
                    setErrors((prev) => ({ ...prev, time: undefined }));
                  }}
                  keyboardType="numbers-and-punctuation"
                />
                <TouchableOpacity style={styles.nowButton} onPress={() => setTime(getCurrentTime())}>
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
            placeholderTextColor="#999"
            value={note}
            onChangeText={(t) => {
              setNote(t);
              setErrors((prev) => ({ ...prev, note: undefined }));
            }}
            multiline
            numberOfLines={4}
          />
          {errors.note ? <Text style={styles.fieldError}>{errors.note}</Text> : null}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Cost paid ($) — optional</Text>
          <Text style={styles.helpText}>How much did you pay for this service?</Text>
          <TextInput
            style={[styles.input, errors.cost && styles.inputError]}
            placeholder="e.g. 150.00"
            placeholderTextColor="#999"
            value={cost}
            onChangeText={(t) => {
              setCost(t);
              setErrors((prev) => ({ ...prev, cost: undefined }));
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
            placeholderTextColor="#999"
            value={paymentMode}
            onChangeText={setPaymentMode}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Technician / Shop Name — optional</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Ramesh AC Repair, Samsung Service Center"
            placeholderTextColor="#999"
            value={vendorName}
            onChangeText={setVendorName}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Technician Name — optional</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. John, Ramesh"
            placeholderTextColor="#999"
            value={repairmanName}
            onChangeText={setRepairmanName}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Contact Number — optional</Text>
          <TextInput
            style={styles.input}
            placeholder={'Phone, WhatsApp, or "Ramesh: 98xxxxxxxx"'}
            placeholderTextColor="#999"
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
          {errors.nextServiceDue ? <Text style={styles.fieldError}>{errors.nextServiceDue}</Text> : null}
          <Text style={styles.helpText}>We'll remind you when it's due</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Photo — optional</Text>
          <View style={styles.photoRow}>
            <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
              <Text style={styles.photoButtonText}>📷 Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
              <Text style={styles.photoButtonText}>🖼 Gallery</Text>
            </TouchableOpacity>
          </View>
          {photoUri ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: photoUri }} style={styles.preview} />
              <TouchableOpacity style={styles.removePhoto} onPress={() => setPhotoUri(null)}>
                <Text style={styles.removePhotoText}>✕ Remove photo</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Save Service Entry'}
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
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
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeInput: {
    flex: 1,
  },
  nowButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  nowButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
});