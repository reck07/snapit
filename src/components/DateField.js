import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors, fonts, radii, shadows, spacing, type } from '../theme';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
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
    setViewMonth(m => {
      if (m === 0) {
        setViewYear(y => y - 1);
        return 11;
      }
      return m - 1;
    });
  }

  function nextMonth() {
    setViewMonth(m => {
      if (m === 11) {
        setViewYear(y => y + 1);
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
      today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day
    );
  }

  return (
    <View style={styles.root}>
      <TouchableOpacity style={styles.field} onPress={openPicker}>
        <Text style={value ? styles.fieldText : styles.fieldPlaceholder}>
          {value || placeholder}
        </Text>
        <CalendarDays size={18} color={colors.muted} strokeWidth={1.8} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
            <View style={styles.header}>
              <TouchableOpacity onPress={prevMonth} hitSlop={12}>
                <ChevronLeft size={22} color={colors.primary} strokeWidth={2} />
              </TouchableOpacity>
              <Text style={styles.title}>
                {MONTHS[viewMonth]} {viewYear}
              </Text>
              <TouchableOpacity onPress={nextMonth} hitSlop={12}>
                <ChevronRight size={22} color={colors.primary} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <View style={styles.weekRow}>
              {WEEKDAYS.map(w => (
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
                    <Text style={[styles.cellText, isSelected(day) && styles.cellTextSelected]}>
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
  root: {
    width: '100%',
    flexShrink: 0,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    minHeight: 48,
    ...shadows.soft,
  },
  fieldText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
  },
  fieldPlaceholder: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.muted,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingBottom: spacing.sm,
    alignSelf: 'center',
    width: 320,
    maxWidth: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.deep,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...type.h4,
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    marginTop: 10,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.bodySemibold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.muted,
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
    backgroundColor: colors.primary,
    borderRadius: 24,
  },
  cellToday: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 24,
  },
  cellText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textBody,
  },
  cellTextSelected: {
    fontFamily: fonts.bodyBold,
    color: colors.white,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  clear: {
    fontFamily: fonts.bodySemibold,
    color: colors.danger,
    fontSize: 14,
    paddingVertical: spacing.sm,
  },
  cancel: {
    fontFamily: fonts.bodySemibold,
    color: colors.primary,
    fontSize: 14,
    paddingVertical: spacing.sm,
  },
});
