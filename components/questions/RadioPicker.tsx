import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type Option<T> = {
  label: string;
  value: T;
};

interface RadioPickerProps<T> {
  options: Option<T>[];
  selected: T;
  onSelect: (value: T) => void;
}

export default function RadioPicker<T extends string>({
  options,
  selected,
  onSelect,
}: RadioPickerProps<T>) {
  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const isSelected = opt.value === selected;

        return (
          <TouchableOpacity
            key={String(opt.value)}
            style={[
              styles.chip,
              isSelected && styles.chipSelected,
            ]}
            onPress={() => onSelect(opt.value)}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.chipText,
                isSelected && styles.chipTextSelected,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#E8F4FD',
    borderWidth: 1,
    borderColor: '#BDD7EE',
  },
  chipSelected: {
    backgroundColor: '#2E6DA4',
    borderColor: '#2E6DA4',
  },
  chipText: {
    fontFamily: 'pixelRegular',
    fontSize: 12,
    color: '#2E6DA4',
  },
  chipTextSelected: {
    color: '#fff',
  },
});