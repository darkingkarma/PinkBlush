
import { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../../../navigator';
import { supabase } from '../../../supabase';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'CustomerGarmentDetails'
>;

type GarmentPart = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  gender: string;
  available: boolean;
};

export default function CustomerGarmentDetailsScreen({
  route,
  navigation,
}: Props) {
  const { garment } = route.params;

  const [parts, setParts] = useState<GarmentPart[]>([]);
  const [selectedParts, setSelectedParts] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [imageFailed, setImageFailed] = useState(false);

  // Load available parts for this garment.
  const getParts = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setLoadError('');

    try {
      const { data, error } = await supabase
        .from('garment_parts')
        .select('id, name, description, price, gender, available')
        .eq('garment_id', garment.id)
        .eq('available', true)
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      const availableParts = (data ?? []) as GarmentPart[];

      setParts(availableParts);

      // Remove selections for parts that are no longer available.
      setSelectedParts((current) =>
        current.filter((id) =>
          availableParts.some((part) => part.id === id)
        )
      );
    } catch (error) {
      console.error('Get garment parts error:', error);

      setLoadError(
        'Unable to load garment parts. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [garment.id]);

  // Reload when returning to this screen.
  useFocusEffect(
    useCallback(() => {
      void getParts();
    }, [getParts])
  );

  const onRefresh = () => {
    void getParts(true);
  };

  // Select or deselect a garment part.
  const togglePart = (partId: string) => {
    setSelectedParts((current) =>
      current.includes(partId)
        ? current.filter((id) => id !== partId)
        : [...current, partId]
    );
  };

  const selectedItems = parts.filter((part) =>
    selectedParts.includes(part.id)
  );

  const totalPrice = selectedItems.reduce(
    (total, part) => total + Number(part.price || 0),
    0
  );

  // Continue to part configuration.
  const continueOrder = () => {
    if (selectedParts.length === 0) {
      Alert.alert(
        'Select Garment Parts',
        'Please select at least one garment part to continue.'
      );
      return;
    }

    navigation.navigate('ConfigureParts', {
      garment,
      selectedPartIds: selectedParts,
    });
  };

  // Individual part card.
  const renderPart = ({ item }: { item: GarmentPart }) => {
    const selected = selectedParts.includes(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          selected && styles.selectedCard,
        ]}
        onPress={() => togglePart(item.id)}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={styles.partInfo}>
            <Text style={styles.partName}>
              {item.name}
            </Text>

            <Text style={styles.gender}>
              {item.gender || 'Unspecified'}
            </Text>
          </View>

          <View
            style={[
              styles.checkbox,
              selected && styles.selectedCheckbox,
            ]}
          >
            {selected && (
              <Ionicons
                name="checkmark"
                size={17}
                color="#fff"
              />
            )}
          </View>
        </View>

        <Text style={styles.price}>
          ₱{Number(item.price || 0).toFixed(2)}
        </Text>

        <Text style={styles.partDescription}>
          {item.description || 'No description available.'}
        </Text>

        <View style={styles.selectionLabel}>
          <Text
            style={[
              styles.selectText,
              selected && styles.selectedText,
            ]}
          >
            {selected ? 'selected' : 'Tap to Select'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={parts}
        keyExtractor={(item) => item.id}
        renderItem={renderPart}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#d96b8a"
            colors={['#d96b8a']}
          />
        }
        ListHeaderComponent={
          <View>
            {/* Garment Image */}
            {garment.image_url && !imageFailed ? (
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: garment.image_url }}
                  style={styles.garmentImage}
                  resizeMode="contain"
                  onError={() => setImageFailed(true)}
                />
              </View>
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons
                  name="shirt-outline"
                  size={55}
                  color="#d96b8a"
                />

                <Text style={styles.placeholderTitle}>
                  PINK BLUSH
                </Text>

                <Text style={styles.placeholderText}>
                  Garment Collection
                </Text>
              </View>
            )}

            {/* Garment Information */}
            <Text style={styles.title}>
              {garment.name}
            </Text>

            <Text style={styles.description}>
              {garment.description ||
                'No description available.'}
            </Text>

            {/* Parts Header */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionInfo}>
                <Text style={styles.sectionTitle}>
                  Select Garment Parts
                </Text>

                <Text style={styles.helperText}>
                  Select one or more parts for your garment.
                </Text>
              </View>

              <View style={styles.countBadge}>
                <Text style={styles.countText}>
                  {selectedParts.length} Selected
                </Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator
                size="large"
                color="#d96b8a"
              />

              <Text style={styles.emptyText}>
                Loading garment parts...
              </Text>
            </View>
          ) : loadError ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="cloud-offline-outline"
                size={45}
                color="#d96b8a"
              />

              <Text style={styles.emptyTitle}>
                Unable to Load Parts
              </Text>

              <Text style={styles.emptyText}>
                {loadError}
              </Text>

              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => void getParts()}
              >
                <Text style={styles.retryButtonText}>
                  Try Again
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="shirt-outline"
                size={45}
                color="#d96b8a"
              />

              <Text style={styles.emptyTitle}>
                No Parts Available
              </Text>

              <Text style={styles.emptyText}>
                This garment currently has no available parts.
                Please check again later.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          !loading && !loadError && parts.length > 0 ? (
            <View style={styles.footer}>
              {/* Selection Summary */}
              <View style={styles.summary}>
                <View>
                  <Text style={styles.summaryLabel}>
                    Selected Parts
                  </Text>

                  <Text style={styles.summaryCount}>
                    {selectedParts.length} part(s)
                  </Text>
                </View>

                <View style={styles.totalContainer}>
                  <Text style={styles.summaryLabel}>
                    Parts Total
                  </Text>

                  <Text style={styles.totalPrice}>
                    ₱{totalPrice.toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Continue Button */}
              <TouchableOpacity
                style={[
                  styles.continueButton,
                  selectedParts.length === 0 &&
                    styles.disabledButton,
                ]}
                disabled={selectedParts.length === 0}
                onPress={continueOrder}
                activeOpacity={0.8}
              >
                <Text style={styles.continueButtonText}>
                  Continue to Configure
                </Text>

                <Ionicons
                  name="arrow-forward"
                  size={19}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8FA',
  },

  list: {
    padding: 18,
    paddingBottom: 35,
    flexGrow: 1,
  },

  imageContainer: {
    width: '100%',
    height: 230,
    borderRadius: 16,
    marginBottom: 18,
    backgroundColor: '#FFF0F5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    overflow: 'hidden',
  },

  garmentImage: {
    width: '100%',
    height: '100%',
  },

  imagePlaceholder: {
    width: '100%',
    height: 230,
    borderRadius: 16,
    backgroundColor: '#FBEAF0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },

  placeholderTitle: {
    color: '#D96B8A',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 8,
  },

  placeholderText: {
    color: '#B77B91',
    fontSize: 12,
    marginTop: 4,
  },

  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#333',
    marginBottom: 8,
  },

  description: {
    fontSize: 14,
    color: '#777',
    lineHeight: 22,
    marginBottom: 25,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },

  sectionInfo: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#333',
  },

  helperText: {
    fontSize: 13,
    color: '#888',
    marginTop: 5,
  },

  countBadge: {
    backgroundColor: '#FCE7EE',
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },

  countText: {
    color: '#D96B8A',
    fontSize: 12,
    fontWeight: '700',
  },

  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F0E5E9',
    borderRadius: 14,
    marginBottom: 13,
    padding: 17,
  },

  selectedCard: {
    borderColor: '#D96B8A',
    borderWidth: 2,
    backgroundColor: '#FFF7FA',
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  partInfo: {
    flex: 1,
    paddingRight: 12,
  },

  partName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#333',
  },

  checkbox: {
    width: 25,
    height: 25,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#CCC',
    justifyContent: 'center',
    alignItems: 'center',
  },

  selectedCheckbox: {
    backgroundColor: '#D96B8A',
    borderColor: '#D96B8A',
  },

  gender: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },

  price: {
    fontSize: 18,
    fontWeight: '800',
    color: '#D96B8A',
    marginTop: 12,
  },

  partDescription: {
    fontSize: 13,
    color: '#777',
    lineHeight: 20,
    marginTop: 7,
  },

  selectionLabel: {
    marginTop: 12,
  },

  selectText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#999',
  },

  selectedText: {
    color: '#D96B8A',
  },

  footer: {
    marginTop: 8,
  },

  summary: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 17,
    borderWidth: 1,
    borderColor: '#F0E5E9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },

  summaryLabel: {
    fontSize: 12,
    color: '#888',
  },

  summaryCount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginTop: 5,
  },

  totalContainer: {
    alignItems: 'flex-end',
  },

  totalPrice: {
    fontSize: 21,
    fontWeight: '800',
    color: '#D96B8A',
    marginTop: 4,
  },

  continueButton: {
    backgroundColor: '#D96B8A',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },

  disabledButton: {
    backgroundColor: '#D8D8D8',
  },

  continueButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },

  emptyContainer: {
    paddingVertical: 35,
    paddingHorizontal: 15,
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 10,
    marginBottom: 7,
  },

  emptyText: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },

  retryButton: {
    marginTop: 15,
    backgroundColor: '#D96B8A',
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 10,
  },

  retryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
