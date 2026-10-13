//no more use of this

import {
  useCallback,
  useState,
} from 'react';

import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
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
  RootStackParamList
>;

type GarmentPart = {
  id: string;
  garment_id: string;
  name: string;
  description: string | null;
  price: number;
  gender: string;
  available: boolean;
};

type Garment = {
  id: string;
  name: string;
};

export default function GarmentPartsScreen({
  navigation,
}: Props) {
  const [parts, setParts] = useState<GarmentPart[]>([]);
  const [garments, setGarments] = useState<Garment[]>([]);
  const [loading, setLoading] = useState(false);

  const getParts = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('garment_parts')
      .select('*')
      .order('created_at', {
        ascending: false,
      });

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setParts(data || []);
  };

  const getGarments = async () => {
    const { data, error } = await supabase
      .from('garments')
      .select('id, name');

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setGarments(data || []);
  };

  useFocusEffect(
    useCallback(() => {
      getParts();
      getGarments();
    }, [])
  );

  const getGarmentName = (
    garmentId: string
  ) => {
    const garment = garments.find(
      item => item.id === garmentId
    );

    return garment
      ? garment.name
      : 'Unknown Garment';
  };

  const deletePart = (part: GarmentPart) => {
    Alert.alert(
      'Delete Garment Part',
      `Are you sure you want to delete "${part.name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('garment_parts')
              .delete()
              .eq('id', part.id);

            if (error) {
              Alert.alert(
                'Error',
                error.message
              );
              return;
            }

            Alert.alert(
              'Success',
              'Garment part deleted successfully.'
            );

            getParts();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            Garment Parts
          </Text>

          <Text style={styles.subtitle}>
            Manage your garment parts
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}

        >
          <Text style={styles.addButtonText}>
            + Add
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={parts}
        keyExtractor={item => item.id}
        refreshing={loading}
        onRefresh={() => {
          getParts();
          getGarments();
        }}
        contentContainerStyle={
          parts.length === 0
            ? styles.emptyContainer
            : styles.list
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.partName}>
              {item.name}
            </Text>

            <Text style={styles.garmentName}>
              Garment: {getGarmentName(
                item.garment_id
              )}
            </Text>

            <View style={styles.details}>
              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>
                  Gender
                </Text>

                <Text style={styles.detailValue}>
                  {item.gender}
                </Text>
              </View>

              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>
                  Price
                </Text>

                <Text style={styles.detailValue}>
                  ₱{Number(item.price).toFixed(2)}
                </Text>
              </View>

              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>
                  Status
                </Text>

                <Text
                  style={[
                    styles.detailValue,
                    item.available
                      ? styles.available
                      : styles.unavailable,
                  ]}
                >
                  {item.available
                    ? 'Available'
                    : 'Unavailable'}
                </Text>
              </View>
            </View>

            {item.description && (
              <Text
                style={styles.description}
                numberOfLines={2}
              >
                {item.description}
              </Text>
            )}

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() =>
                  navigation.navigate(
                    'EditGarmentPart',
                    {
                      part: item,
                    }
                  )
                }
              >
                <Text style={styles.editText}>
                  Edit
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() =>
                  deletePart(item)
                }
              >
                <Text style={styles.deleteText}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                No garment parts found.
              </Text>
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
    backgroundColor: '#fff',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },

  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },

  addButton: {
    backgroundColor: '#d96b8a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },

  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },

  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  empty: {
    alignItems: 'center',
    padding: 20,
  },

  emptyText: {
    fontSize: 15,
    color: '#888',
  },

  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
  },

  partName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },

  garmentName: {
    fontSize: 14,
    color: '#777',
    marginTop: 5,
  },

  details: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 15,
  },

  detailBox: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 10,
  },

  detailLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },

  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
  },

  available: {
    color: '#4a9b62',
  },

  unavailable: {
    color: '#d9534f',
  },

  description: {
    fontSize: 13,
    color: '#777',
    marginTop: 12,
    lineHeight: 18,
  },

  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },

  editButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d96b8a',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },

  editText: {
    color: '#d96b8a',
    fontWeight: '600',
  },

  deleteButton: {
    flex: 1,
    backgroundColor: '#f3f3f3',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },

  deleteText: {
    color: '#d9534f',
    fontWeight: '600',
  },
});