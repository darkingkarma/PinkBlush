
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

import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../../navigator';
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

  const getParts = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('garment_parts')
      .select('id, name, description, price, gender, available')
      .eq('garment_id', garment.id)
      .eq('available', true)
      .order('name');

    if (error) {
      console.log('Get garment parts error:', error.message);
      Alert.alert('Error', 'Unable to load garment parts.');
      setParts([]);
      setLoading(false);
      return;
    }

    setParts(data || []);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      getParts();
    }, [garment.id])
  );

  const onRefresh = async () => {
    setRefreshing(true);

    const { data, error } = await supabase
      .from('garment_parts')
      .select('id, name, description, price, gender, available')
      .eq('garment_id', garment.id)
      .eq('available', true)
      .order('name');

    if (error) {
      Alert.alert('Error', 'Unable to refresh garment parts.');
    } else {
      setParts(data || []);
    }

    setRefreshing(false);
  };

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
            <Text style={styles.partName}>{item.name}</Text>

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
              <Text style={styles.checkmark}>✓</Text>
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
            {selected ? '✓ Selected' : 'Tap to Select'}
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#d96b8a"
          />
        }
        ListHeaderComponent={
          <View>
            {garment.image_url ? (
              <Image
                source={{ uri: garment.image_url }}
                style={styles.garmentImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.placeholderText}>
                  No Image Available
                </Text>
              </View>
            )}

            <Text style={styles.title}>{garment.name}</Text>

            <Text style={styles.description}>
              {garment.description ||
                'No description available.'}
            </Text>

            <View style={styles.sectionHeader}>
              <View>
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
              <ActivityIndicator size="large" color="#d96b8a" />
              <Text style={styles.emptyText}>
                Loading garment parts...
              </Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
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
          !loading && parts.length > 0 ? (
            <View style={styles.footer}>
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
  },

  garmentImage: {
    width: '100%',
    height: 230,
    borderRadius: 16,
    marginBottom: 18,
    backgroundColor: '#F3E8EC',
  },

  imagePlaceholder: {
    width: '100%',
    height: 230,
    borderRadius: 16,
    backgroundColor: '#F3E8EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },

  placeholderText: {
    color: '#999',
    fontSize: 14,
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

  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
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
    alignItems: 'center',
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
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 7,
  },

  emptyText: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },
});
