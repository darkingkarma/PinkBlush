import {
  useCallback,
  useState,
} from 'react';

import {
  Alert,
  FlatList,
  Image,
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
  supabase,
} from '../../../supabase';

import {
  RootStackParamList,
} from '../../navigator';

type Props =
  NativeStackScreenProps<
    RootStackParamList,
    'GarmentDetails'
  >;

type Part = {
  id: string;
  garment_id: string;
  name: string;
  description: string | null;
  price: number;
  gender: string;
  available: boolean;
};

export default function GarmentDetailsScreen({
  route,
  navigation,
}: Props) {
  const {
    garment,
  } = route.params;

  const [
    parts,
    setParts,
  ] = useState<Part[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const getParts = async () => {
    try {
      setLoading(true);

      const {
        data,
        error,
      } = await supabase
        .from('garment_parts')
        .select('*')
        .eq(
          'garment_id',
          garment.id
        )
        .order('name');

      if (error) {
        throw error;
      }

      setParts(
        data || []
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message ||
          'Failed to load garment parts.'
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      getParts();
    }, [])
  );

  const deletePart = (
    part: Part
  ) => {
    Alert.alert(
      'Delete Part',
      `Are you sure you want to delete ${part.name}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const {
                error,
              } = await supabase
                .from('garment_parts')
                .delete()
                .eq(
                  'id',
                  part.id
                );

              if (error) {
                throw error;
              }

              getParts();
            } catch (error: any) {
              Alert.alert(
                'Error',
                error.message ||
                  'Failed to delete part.'
              );
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={parts}
        keyExtractor={
          item => item.id
        }
        refreshing={loading}
        onRefresh={getParts}
        contentContainerStyle={
          styles.list
        }
        ListHeaderComponent={
          <>
            {garment.image_url && (
              <Image
                source={{
                  uri: garment.image_url,
                }}
                style={styles.garmentImage}
              />
            )}

            <Text style={styles.title}>
              {garment.name}
            </Text>

            <Text style={styles.description}>
              {garment.description ||
                'No description.'}
            </Text>

            <Text style={styles.status}>
              {garment.available
                ? 'Available'
                : 'Unavailable'}
            </Text>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Parts
              </Text>

              <TouchableOpacity
                style={styles.addButton}
                onPress={() =>
                  navigation.navigate(
                    'AddGarmentPart'
                  )
                }
              >
                <Text style={styles.addButtonText}>
                  Add Part
                </Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>
              No parts added yet.
            </Text>
          ) : null
        }
        renderItem={({
          item,
        }) => (
          <View style={styles.partCard}>
            <Text style={styles.partName}>
              {item.name}
            </Text>

            <Text style={styles.partInfo}>
              Gender: {item.gender}
            </Text>

            <Text style={styles.partInfo}>
              Price: ₱
              {Number(
                item.price
              ).toFixed(2)}
            </Text>

            <Text style={styles.partInfo}>
              Status:{' '}
              {item.available
                ? 'Available'
                : 'Unavailable'}
            </Text>

            {item.description && (
              <Text style={styles.partDescription}>
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
    paddingBottom: 40,
  },

  garmentImage: {
    width: '100%',
    height: 220,
    borderRadius: 10,
    marginBottom: 15,
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },

  description: {
    marginTop: 8,
    color: '#666',
    lineHeight: 20,
  },

  status: {
    marginTop: 8,
    color: '#d96b8a',
    fontWeight: '600',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 25,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },

  addButton: {
    backgroundColor: '#d96b8a',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },

  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },

  partCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
  },

  partName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
  },

  partInfo: {
    marginTop: 5,
    color: '#555',
  },

  partDescription: {
    marginTop: 8,
    color: '#666',
  },

  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
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
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },

  deleteText: {
    color: '#777',
    fontWeight: '600',
  },

  emptyText: {
    textAlign: 'center',
    color: '#777',
    marginTop: 20,
  },
});
