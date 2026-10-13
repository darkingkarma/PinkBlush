import {
  useCallback,
  useState,
} from 'react';

import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
} from 'react-native';

import {
  useFocusEffect,
} from '@react-navigation/native';

import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import {
  RootStackParamList,
} from '../../navigator';

import {
  supabase,
} from '../../../supabase';

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

  const getParts = async () => {
    setLoading(true);

    const {
      data,
      error,
    } = await supabase
      .from('garment_parts')
      .select(
        'id, name, description, price, gender, available'
      )
      .eq('garment_id', garment.id)
      .eq('available', true)
      .order('name');

    if (error) {
      console.log(error);
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
    }, [])
  );

  const togglePart = (partId: string) => {
    setSelectedParts((current) => {
      if (current.includes(partId)) {
        return current.filter(
          (id) => id !== partId
        );
      }

      return [...current, partId];
    });
  };

    const continueOrder = () => {
        if (selectedParts.length === 0) {
            return;
        }

        navigation.navigate(
            'ConfigureParts',
            {
            garment,
            selectedPartIds: selectedParts,
            }
        );
    };


  return (
    <View style={styles.container}>
      <FlatList
        data={parts}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            {garment.image_url ? (
              <Image
                source={{
                  uri: garment.image_url,
                }}
                style={styles.garmentImage}
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.placeholderText}>
                  No Image
                </Text>
              </View>
            )}

            <Text style={styles.title}>
              {garment.name}
            </Text>

            <Text style={styles.description}>
              {garment.description ||
                'No description available.'}
            </Text>

            <Text style={styles.sectionTitle}>
              Select Parts
            </Text>

            <Text style={styles.helperText}>
              You can select one or more parts.
            </Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Loading parts...
              </Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>
                No parts available
              </Text>

              <Text style={styles.emptyText}>
                This garment currently has no available parts.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const selected = selectedParts.includes(
            item.id
          );

          return (
            <TouchableOpacity
              style={[
                styles.card,
                selected && styles.selectedCard,
              ]}
              onPress={() =>
                togglePart(item.id)
              }
            >
              <View style={styles.cardHeader}>
                <Text style={styles.partName}>
                  {item.name}
                </Text>

                <View
                  style={[
                    styles.checkbox,
                    selected &&
                      styles.selectedCheckbox,
                  ]}
                >
                  {selected && (
                    <Text style={styles.checkmark}>
                      ✓
                    </Text>
                  )}
                </View>
              </View>

              <Text style={styles.gender}>
                {item.gender}
              </Text>

              <Text style={styles.price}>
                ₱{Number(item.price).toFixed(2)}
              </Text>

              <Text style={styles.partDescription}>
                {item.description ||
                  'No description available.'}
              </Text>

              <Text style={styles.selectText}>
                {selected
                  ? 'Selected'
                  : 'Tap to Select'}
              </Text>
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={
          parts.length > 0 ? (
            <TouchableOpacity
              style={[
                styles.continueButton,
                selectedParts.length === 0 &&
                  styles.disabledButton,
              ]}
              disabled={selectedParts.length === 0}
              onPress={continueOrder}
            >
              <Text style={styles.continueButtonText}>
                Continue
              </Text>
            </TouchableOpacity>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  list: {
    padding: 20,
    paddingBottom: 30,
  },

  garmentImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 18,
  },

  imagePlaceholder: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: '#f3f3f3',
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
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },

  description: {
    fontSize: 15,
    color: '#777',
    lineHeight: 22,
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },

  helperText: {
    fontSize: 14,
    color: '#888',
    marginBottom: 14,
  },

  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    marginBottom: 14,
    padding: 18,
  },

  selectedCard: {
    borderColor: '#d96b8a',
    borderWidth: 2,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  partName: {
    fontSize: 19,
    fontWeight: '700',
    color: '#333',
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },

  selectedCheckbox: {
    backgroundColor: '#d96b8a',
    borderColor: '#d96b8a',
  },

  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  gender: {
    fontSize: 14,
    color: '#888',
    marginTop: 6,
  },

  price: {
    fontSize: 17,
    fontWeight: '600',
    color: '#d96b8a',
    marginTop: 4,
  },

  partDescription: {
    fontSize: 14,
    color: '#777',
    lineHeight: 20,
    marginTop: 4,
  },

  selectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d96b8a',
    marginTop: 10,
  },

  continueButton: {
    backgroundColor: '#d96b8a',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },

  disabledButton: {
    backgroundColor: '#ddd',
  },

  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  emptyContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
});
