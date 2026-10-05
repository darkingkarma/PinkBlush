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

import {
  supabase,
} from '../../../supabase';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'Fabrics'
>;

type Fabric = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price_addition: number;
  available: boolean;
};

export default function FabricsScreen({
  navigation,
}: Props) {
  const [fabrics, setFabrics] =
    useState<Fabric[]>([]);

  const [loading, setLoading] =
    useState(false);

  const getFabrics = async () => {
    setLoading(true);

    const { data, error } =
      await supabase
        .from('fabrics')
        .select('*')
        .order('name');

    setLoading(false);

    if (error) {
      Alert.alert(
        'Error',
        error.message
      );
      return;
    }

    setFabrics(data || []);
  };

  useFocusEffect(
    useCallback(() => {
      getFabrics();
    }, [])
  );

  const deleteFabric = (
    fabric: Fabric
  ) => {
    Alert.alert(
      'Delete Fabric',
      `Are you sure you want to delete "${fabric.name}"?`,
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
              if (fabric.image_url) {
                const imagePath =
                  fabric.image_url.split(
                    '/garments/'
                  )[1];

                if (imagePath) {
                  const {
                    error:
                      imageError,
                  } =
                    await supabase.storage
                      .from('garments')
                      .remove([
                        imagePath,
                      ]);

                  if (imageError) {
                    throw imageError;
                  }
                }
              }

              const { error } =
                await supabase
                  .from('fabrics')
                  .delete()
                  .eq(
                    'id',
                    fabric.id
                  );

              if (error) {
                throw error;
              }

              Alert.alert(
                'Success',
                'Fabric deleted successfully.'
              );

              getFabrics();
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
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            Fabrics
          </Text>

          <Text style={styles.subtitle}>
            Manage your fabrics
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() =>
            navigation.navigate(
              'AddFabric'
            )
          }
        >
          <Text style={styles.addButtonText}>
            + Add
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={fabrics}
        keyExtractor={item => item.id}
        refreshing={loading}
        onRefresh={getFabrics}
        contentContainerStyle={
          fabrics.length === 0
            ? styles.emptyContainer
            : styles.list
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.image_url && (
              <Image
                source={{
                  uri: item.image_url,
                }}
                style={styles.image}
              />
            )}

            <View style={styles.info}>
              <Text style={styles.fabricName}>
                {item.name}
              </Text>

              <View style={styles.details}>
                <View style={styles.detailBox}>
                  <Text
                    style={
                      styles.detailLabel
                    }
                  >
                    Price Addition
                  </Text>

                  <Text
                    style={
                      styles.detailValue
                    }
                  >
                    +₱
                    {Number(
                      item.price_addition
                    ).toFixed(2)}
                  </Text>
                </View>

                <View style={styles.detailBox}>
                  <Text
                    style={
                      styles.detailLabel
                    }
                  >
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
                  style={
                    styles.description
                  }
                  numberOfLines={2}
                >
                  {item.description}
                </Text>
              )}

              <View
                style={styles.actions}
              >
                <TouchableOpacity
                  style={
                    styles.editButton
                  }
                  onPress={() =>
                    navigation.navigate(
                      'EditFabric',
                      {
                        fabric: item,
                      }
                    )
                  }
                >
                  <Text
                    style={styles.editText}
                  >
                    Edit
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={
                    styles.deleteButton
                  }
                  onPress={() =>
                    deleteFabric(item)
                  }
                >
                  <Text
                    style={
                      styles.deleteText
                    }
                  >
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
              <Text
                style={styles.emptyText}
              >
                No fabrics found.
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

  image: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    marginBottom: 12,
  },

  info: {
    flex: 1,
  },

  fabricName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },

  details: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
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
