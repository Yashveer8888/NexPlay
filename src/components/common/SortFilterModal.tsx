import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useThemeStore } from '../../store/useThemeStore';
import { SortField, SortOrder, SortOption } from '../../types/video';

interface SortFilterModalProps {
  visible: boolean;
  onClose: () => void;
  sortOption: SortOption;
  onSelectSort: (option: SortOption) => void;
  title?: string;
}

interface SortChoice {
  field: SortField;
  order: SortOrder;
  label: string;
  subLabel: string;
  iconType: 'calendar' | 'alphabet' | 'size' | 'clock';
}

const SORT_CHOICES: SortChoice[] = [
  {
    field: 'date',
    order: 'desc',
    label: 'Date (Newest First)',
    subLabel: 'Recently added or modified videos',
    iconType: 'calendar',
  },
  {
    field: 'date',
    order: 'asc',
    label: 'Date (Oldest First)',
    subLabel: 'Older videos first',
    iconType: 'calendar',
  },
  {
    field: 'name',
    order: 'asc',
    label: 'Name (A to Z)',
    subLabel: 'Alphabetical order',
    iconType: 'alphabet',
  },
  {
    field: 'name',
    order: 'desc',
    label: 'Name (Z to A)',
    subLabel: 'Reverse alphabetical order',
    iconType: 'alphabet',
  },
  {
    field: 'size',
    order: 'desc',
    label: 'Size (Largest First)',
    subLabel: 'Heaviest files taking most storage',
    iconType: 'size',
  },
  {
    field: 'size',
    order: 'asc',
    label: 'Size (Smallest First)',
    subLabel: 'Lightest video clips first',
    iconType: 'size',
  },
  {
    field: 'duration',
    order: 'desc',
    label: 'Duration (Longest First)',
    subLabel: 'Full-length movies and long clips',
    iconType: 'clock',
  },
  {
    field: 'duration',
    order: 'asc',
    label: 'Duration (Shortest First)',
    subLabel: 'Quick status videos and shorts',
    iconType: 'clock',
  },
];

export const SortFilterModal: React.FC<SortFilterModalProps> = ({
  visible,
  onClose,
  sortOption,
  onSelectSort,
  title = 'Sort Videos By',
}) => {
  const theme = useThemeStore((state) => state.theme);

  const renderIcon = (type: SortChoice['iconType'], isSelected: boolean) => {
    const color = isSelected ? theme.colors.primary : theme.colors.textMuted;
    switch (type) {
      case 'calendar':
        return (
          <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
            <Path d="M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18" />
          </Svg>
        );
      case 'alphabet':
        return (
          <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
            <Path d="M4 19L8 5l4 14M5.5 14h5M15 19h6M15 19l6-8h-6" />
          </Svg>
        );
      case 'size':
        return (
          <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
            <Path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
            <Path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
          </Svg>
        );
      case 'clock':
        return (
          <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
            <Path d="M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2" />
          </Svg>
        );
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.headerIconWrap, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.colors.primary} strokeWidth="2.2">
                      <Path d="M3 6h18M6 12h12M10 18h4" />
                    </Svg>
                  </View>
                  <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>{title}</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textMuted} strokeWidth="2.2">
                    <Path d="M18 6L6 18M6 6l12 12" />
                  </Svg>
                </TouchableOpacity>
              </View>

              {/* Options List */}
              <View style={styles.optionsList}>
                {SORT_CHOICES.map((choice, index) => {
                  const isSelected =
                    sortOption.field === choice.field && sortOption.order === choice.order;

                  return (
                    <TouchableOpacity
                      key={`${choice.field}-${choice.order}-${index}`}
                      style={[
                        styles.optionRow,
                        {
                          backgroundColor: isSelected
                            ? 'rgba(99, 102, 241, 0.12)'
                            : 'transparent',
                          borderColor: isSelected ? theme.colors.primary : 'transparent',
                        },
                      ]}
                      onPress={() => {
                        onSelectSort({ field: choice.field, order: choice.order });
                        onClose();
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.optionIconBox, { backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.2)' : theme.colors.surfaceLight }]}>
                        {renderIcon(choice.iconType, isSelected)}
                      </View>

                      <View style={styles.optionTextBox}>
                        <Text
                          style={[
                            styles.optionLabel,
                            {
                              color: isSelected ? theme.colors.primary : theme.colors.textPrimary,
                              fontWeight: isSelected ? '700' : '500',
                            },
                          ]}
                        >
                          {choice.label}
                        </Text>
                        <Text style={[styles.optionSub, { color: theme.colors.textMuted }]}>
                          {choice.subLabel}
                        </Text>
                      </View>

                      {isSelected ? (
                        <View style={[styles.checkCircle, { backgroundColor: theme.colors.primary }]}>
                          <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="3">
                            <Path d="M20 6L9 17l-5-5" />
                          </Svg>
                        </View>
                      ) : (
                        <View style={[styles.radioCircle, { borderColor: theme.colors.border }]} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
  },
  optionsList: {
    gap: 6,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionTextBox: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 14,
    marginBottom: 2,
  },
  optionSub: {
    fontSize: 11,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    marginLeft: 8,
  },
});
