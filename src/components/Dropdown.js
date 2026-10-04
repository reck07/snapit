import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';

export default function Dropdown({ items, selectedValue, onValueChange, placeholder, disabled }) {
  const [open, setOpen] = useState(false);
  const selected = items.find((i) => i.value === selectedValue);

  return (
    <View>
      <TouchableOpacity
        style={[styles.field, disabled && styles.fieldDisabled]}
        onPress={() => {
          if (!disabled) setOpen(true);
        }}
      >
        <Text style={selected ? styles.fieldText : styles.fieldPlaceholder}>
          {selected ? selected.label : placeholder || 'Select...'}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>{placeholder || 'Select'}</Text>
            <FlatList
              data={items}
              keyExtractor={(item) => String(item.value)}
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
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {item.label}
                    </Text>
                    {isSelected ? <Text style={styles.check}>✓</Text> : null}
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
  chevron: {
    fontSize: 14,
    color: '#666',
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
    maxHeight: 360,
    paddingBottom: 8,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  optionSelected: {
    backgroundColor: '#f0f7ff',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  optionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  check: {
    fontSize: 16,
    color: '#007AFF',
  },
});
