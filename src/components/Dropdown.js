import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';
import { colors, fonts, radii, shadows, spacing } from '../theme';

export default function Dropdown({
  items,
  selectedValue,
  onValueChange,
  placeholder,
  disabled,
  pill = false,
}) {
  const [open, setOpen] = useState(false);
  const selected = items.find(i => i.value === selectedValue);

  return (
    <View>
      <TouchableOpacity
        style={[styles.field, pill && styles.fieldPill, disabled && styles.fieldDisabled]}
        onPress={() => {
          if (!disabled) setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={selected ? selected.label : placeholder || 'Select'}
      >
        <Text
          style={selected ? styles.fieldText : styles.fieldPlaceholder}
          numberOfLines={1}
        >
          {selected ? selected.label : placeholder || 'Select…'}
        </Text>
        <ChevronDown size={16} color={colors.muted} strokeWidth={1.8} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>{placeholder || 'Select'}</Text>
            <FlatList
              data={items}
              keyExtractor={item => String(item.value)}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = item.value === selectedValue;
                return (
                  <TouchableOpacity
                    style={[styles.option, isSelected && styles.optionSelected]}
                    onPress={() => {
                      onValueChange(item.value);
                      setOpen(false);
                    }}
                  >
                    <Text
                      style={[styles.optionText, isSelected && styles.optionTextSelected]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                    {isSelected ? (
                      <Check size={16} color={colors.primary} strokeWidth={2} />
                    ) : null}
                  </TouchableOpacity>
                );
              }}
            />
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
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    minHeight: 48,
    ...shadows.soft,
  },
  fieldPill: {
    borderRadius: radii.full,
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  fieldDisabled: {
    opacity: 0.55,
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
    maxHeight: 420,
    paddingBottom: spacing.sm,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.deep,
  },
  sheetTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    lineHeight: 25,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionSelected: {
    backgroundColor: colors.primarySoft,
  },
  optionText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textBody,
  },
  optionTextSelected: {
    fontFamily: fonts.bodySemibold,
    color: colors.primary,
  },
});
