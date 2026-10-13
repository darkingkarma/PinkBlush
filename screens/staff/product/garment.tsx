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

import { Ionicons } from '@expo/vector-icons';

import {
  useFocusEffect,
} from '@react-navigation/native';

import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import {
  RootStackParamList,
} from '../../navigator';

import { supabase } from '../../../supabase';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'Garments'
>;

type Garment = {
  id: string;
  name: string;
  description: string | null;
  available: boolean;
  category_id: string;
  image_url: string | null;
};

export default function GarmentsScreen({
  navigation,
}: Props) {
  const [garments, setGarments] = useState<Garment[]>([]);
  const [loading, setLoading] = useState(false);

  const getGarments = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('garments')
      .select('*')
      .order('created_at', {
        ascending: false,
      });

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setGarments(data || []);
  };

  useFocusEffect(
    useCallback(() => {
      getGarments();
    }, [])
  );

  const deleteGarment = (garment: Garment) => {
    Alert.alert(
      'Delete Garment',
      `Are you sure you want to delete "${garment.name}"?`,
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
              if (garment.image_url) {
                const fileName =
                  garment.image_url.split('/').pop();

                if (fileName) {
                  const { error: imageError } =
                    await supabase.storage
                      .from('garments')
                      .remove([fileName]);

                  if (imageError) {
                    throw imageError;
                  }
                }
              }

              const { error } = await supabase
                .from('garments')
                .delete()
                .eq('id', garment.id);

              if (error) {
                throw error;
              }

              Alert.alert(
                'Success',
                'Garment and image deleted successfully.'
              );

              getGarments();
            } catch (error: any) {
              Alert.alert(
                'Error',
                error.message ||
                  'Something went wrong.'
              );
            }
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
            Garments
          </Text>

          <Text style={styles.subtitle}>
            Manage your garment catalog
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() =>
            navigation.navigate('AddGarment')
          }
        >
          <Text style={styles.addButtonText}>
            + Add
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={garments}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={getGarments}
        contentContainerStyle={
          garments.length === 0
            ? styles.emptyContainer
            : styles.list
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.image_url ? (
              <Image
                source={{
                  uri: item.image_url,
                }}
                style={styles.garmentImage}
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons
                  name="image-outline"
                  size={32}
                  color="#d96b8a"
                />
              </View>
            )}

            <View style={styles.info}>
              <Text style={styles.garmentName}>
                {item.name}
              </Text>

              {item.description && (
                <Text
                  style={styles.description}
                  numberOfLines={2}
                >
                  {item.description}
                </Text>
              )}

              <Text
                style={[
                  styles.status,
                  item.available
                    ? styles.available
                    : styles.unavailable,
                ]}
              >
                {item.available
                  ? 'Available'
                  : 'Unavailable'}
              </Text>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.manageButton}
                  onPress={() =>
                    navigation.navigate(
                      'GarmentDetails',
                      {
                        garment: item,
                      }
                    )
                  }
                >
                  <Text style={styles.manageButtonText}>
                    Manage
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() =>
                    navigation.navigate(
                      'EditGarment',
                      {
                        garment: item,
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
                    deleteGarment(item)
                  }
                >
                  <Text style={styles.deleteText}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                No garments found.
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
    paddingTop: 25,
    paddingBottom: 15,
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#d96b8a',
  },

  subtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },

  addButton: {
    backgroundColor: '#d96b8a',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },

  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },

  list: {
    padding: 20,
    paddingTop: 5,
    paddingBottom: 30,
  },

  card: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 15,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },

  garmentImage: {
    width: 85,
    height: 85,
    borderRadius: 12,
  },

  imagePlaceholder: {
    width: 85,
    height: 85,
    borderRadius: 12,
    backgroundColor: '#fdf2f5',
    justifyContent: 'center',
    alignItems: 'center',
  },

  info: {
    flex: 1,
    marginLeft: 12,
  },

  garmentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },

  description: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },

  status: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 5,
  },

  available: {
    color: '#4caf50',
  },

  unavailable: {
    color: '#f44336',
  },

  actions: {
    flexDirection: 'row',
    marginTop: 8,
    flexWrap: 'wrap',
    rowGap: 6,
  },

  manageButton: {
    borderWidth: 1,
    borderColor: '#d96b8a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },

  manageButtonText: {
    color: '#d96b8a',
    fontSize: 12,
    fontWeight: 'bold',
  },

  editButton: {
    borderWidth: 1,
    borderColor: '#d96b8a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },

  editText: {
    color: '#d96b8a',
    fontSize: 12,
    fontWeight: 'bold',
  },

  deleteButton: {
    borderWidth: 1,
    borderColor: '#e57373',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  deleteText: {
    color: '#e57373',
    fontSize: 12,
    fontWeight: 'bold',
  },

  emptyContainer: {
    flexGrow: 1,
    padding: 20,
  },

  empty: {
    alignItems: 'center',
    marginTop: 50,
  },

  emptyText: {
    color: '#888',
    fontSize: 14,
  },
});
