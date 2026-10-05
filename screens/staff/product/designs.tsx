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
  RootStackParamList,
} from '../../navigator';

import { supabase } from '../../../supabase';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'Designs'
>;

type Design = {
  id: string;
  garment_part_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
};

type GarmentPart = {
  id: string;
  name: string;
};

export default function DesignsScreen({
  navigation,
}: Props) {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [garmentParts, setGarmentParts] = useState<
    GarmentPart[]
  >([]);
  const [loading, setLoading] = useState(false);

  const getDesigns = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('designs')
      .select('*')
      .order('created_at', {
        ascending: false,
      });

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setDesigns(data || []);
  };

  const getGarmentParts = async () => {
    const { data, error } = await supabase
      .from('garment_parts')
      .select('id, name');

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setGarmentParts(data || []);
  };

  useFocusEffect(
    useCallback(() => {
      getDesigns();
      getGarmentParts();
    }, [])
  );

  const getGarmentPartName = (
    garmentPartId: string
  ) => {
    const part = garmentParts.find(
      item => item.id === garmentPartId
    );

    return part
      ? part.name
      : 'Unknown';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            Designs
          </Text>

          <Text style={styles.subtitle}>
            Manage your garment designs
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() =>
            navigation.navigate('AddDesign')
          }
        >
          <Text style={styles.addButtonText}>
            + Add
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={designs}
        keyExtractor={item => item.id}
        refreshing={loading}
        onRefresh={() => {
          getDesigns();
          getGarmentParts();
        }}
        contentContainerStyle={
          designs.length === 0
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
                style={styles.designImage}
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.placeholderText}>
                  👗
                </Text>
              </View>
            )}

            <View style={styles.info}>
              <Text style={styles.designName}>
                {item.name}
              </Text>

              <Text style={styles.part}>
                Part: {getGarmentPartName(
                  item.garment_part_id
                )}
              </Text>

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
                      'EditDesign',
                      {
                        design: item,
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
                  onPress={() => {
                    Alert.alert(
                      'Delete Design',
                      `Are you sure you want to delete "${item.name}"?`,
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
                              if (
                                item.image_url
                              ) {
                                const fileName =
                                  item.image_url
                                    .split('/')
                                    .pop();

                                if (fileName) {
                                  const {
                                    error:
                                      imageError,
                                  } =
                                    await supabase
                                      .storage
                                      .from(
                                        'garments'
                                      )
                                      .remove([
                                        fileName,
                                      ]);

                                  if (
                                    imageError
                                  ) {
                                    throw imageError;
                                  }
                                }
                              }

                              const {
                                error,
                              } =
                                await supabase
                                  .from(
                                    'designs'
                                  )
                                  .delete()
                                  .eq(
                                    'id',
                                    item.id
                                  );

                              if (error) {
                                throw error;
                              }

                              Alert.alert(
                                'Success',
                                'Design and image deleted successfully.'
                              );

                              getDesigns();
                            } catch (
                              error: any
                            ) {
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
                  }}
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
                No designs found.
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

  designImage: {
    width: 85,
    height: 85,
    borderRadius: 12,
  },

  imagePlaceholder: {
    width: 85,
    height: 85,
    borderRadius: 12,
    backgroundColor: '#fafafa',
    justifyContent: 'center',
    alignItems: 'center',
  },

  placeholderText: {
    fontSize: 30,
  },

  info: {
    flex: 1,
    marginLeft: 12,
  },

  designName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },

  part: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },

  description: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },

  actions: {
    flexDirection: 'row',
    marginTop: 8,
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