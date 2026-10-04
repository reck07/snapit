import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function DateField({ value, onChange, placeholder = 'Select date' }) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(`${value}T00:00:00`) : null;
  const today = new Date();
  const [viewYear, setViewYear] = useState(selected ? selected.getFullYear() : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected ? selected.getMonth() : today.getMonth());

  function openPicker() {
    const base = selected || today;
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    setOpen(true);
  }

  function prevMonth() {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }

  function nextMonth() {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function pick(day) {
    onChange(formatDate(new Date(viewYear, viewMonth, day)));
    setOpen(false);
  }

  function isSelected(day) {
    return (
      selected &&
      selected.getFullYear() === viewYear &&
      selected.getMonth() === viewMonth &&
      selected.getDate() === day
    );
  }

  function isToday(day) {
    return (
      today.getFullYear() === viewYear &&
      today.getMonth() === viewMonth &&
      today.getDate() === day
    );
  }

  return (
    <View>
      <TouchableOpacity style={styles.field} onPress={openPicker}>
        <Text style={value ? styles.fieldText : styles.fieldPlaceholder}>
          {value || placeholder}
        </Text>
        <Text style={styles.icon}>📅</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
            <View style={styles.header}>
              <TouchableOpacity onPress={prevMonth} hitSlop={12}>
                <Text style={styles.nav}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.title}>
                {MONTHS[viewMonth]} {viewYear}
              </Text>
              <TouchableOpacity onPress={nextMonth} hitSlop={12}>
                <Text style={styles.nav}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.weekRow}>
              {WEEKDAYS.map((w) => (
                <Text key={w} style={styles.weekday}>
                  {w}
                </Text>
              ))}
            </View>

            <View style={styles.grid}>
              {cells.map((day, i) =>
                day === null ? (
                  <View key={`e${i}`} style={styles.cell} />
                ) : (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.cell,
                      isSelected(day) && styles.cellSelected,
                      isToday(day) && !isSelected(day) && styles.cellToday,
                    ]}
                    onPress={() => pick(day)}
                  >
                    <Text
                      style={[
                        styles.cellText,
                        isSelected(day) && styles.cellTextSelected,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>

            <View style={styles.footer}>
              {value ? (
                <TouchableOpacity
                  onPress={() => {
                    onChange('');
                    setOpen(false);
                  }}
                >
                  <Text style={styles.clear}>Clear</Text>
                </TouchableOpacity>
              ) : (
                <View />
              )}
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Text style={styles.cancel}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fieldText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  fieldPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  icon: {
    fontSize: 16,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingBottom: 12,
    alignSelf: 'center',
    width: 300,
    maxWidth: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  nav: {
    fontSize: 26,
    color: '#007AFF',
    paddingHorizontal: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    marginTop: 10,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    marginTop: 4,
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSelected: {
    backgroundColor: '#007AFF',
    borderRadius: 24,
  },
  cellToday: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 24,
  },
  cellText: {
    fontSize: 15,
    color: '#333',
  },
  cellTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  clear: {
    color: '#c0392b',
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 8,
  },
  cancel: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 8,
  },
});
