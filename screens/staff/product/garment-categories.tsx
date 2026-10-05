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
  supabase,
} from '../../../supabase';

import {
  RootStackParamList,
} from '../../navigator';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'GarmentCategories'
>;

type Category = {
  id: string;
  name: string;
  description: string | null;
};

export default function GarmentCategoriesScreen({
  navigation,
}: Props) {
  const [categories, setCategories] =
    useState<Category[]>([]);

  const getCategories = async () => {
    const {
      data,
      error,
    } = await supabase
      .from('garment_categories')
      .select('*')
      .order('created_at', {
        ascending: false,
      });

    if (error) {
      Alert.alert(
        'Error',
        error.message
      );
      return;
    }

    setCategories(data || []);
  };

  useFocusEffect(
    useCallback(() => {
      getCategories();
    }, [])
  );

  const deleteCategory = (
    category: Category
  ) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const {
              error,
            } = await supabase
              .from('garment_categories')
              .delete()
              .eq('id', category.id);

            if (error) {
              Alert.alert(
                'Error',
                error.message
              );
              return;
            }

            Alert.alert(
              'Success',
              'Category deleted successfully.'
            );

            getCategories();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Garment Categories
      </Text>

      <Text style={styles.subtitle}>
        Manage your garment categories
      </Text>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() =>
          navigation.navigate(
            'AddGarmentCategory'
          )
        }
      >
        <Text style={styles.addButtonText}>
          + Add Category
        </Text>
      </TouchableOpacity>

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.list
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No categories found.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.info}>
              <Text style={styles.name}>
                {item.name}
              </Text>

              {item.description ? (
                <Text style={styles.description}>
                  {item.description}
                </Text>
              ) : null}
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() =>
                  navigation.navigate(
                    'EditGarmentCategory',
                    {
                      category: item,
                    }
                  )
                }
              >
                <Text style={styles.buttonText}>
                  Edit
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() =>
                  deleteCategory(item)
                }
              >
                <Text style={styles.buttonText}>
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
    padding: 20,
  },

  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#333',
  },

  subtitle: {
    fontSize: 14,
    color: '#777',
    marginTop: 5,
    marginBottom: 20,
  },

  addButton: {
    backgroundColor: '#d96b8a',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },

  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  list: {
    paddingBottom: 20,
  },

  card: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
  },

  info: {
    marginBottom: 12,
  },

  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },

  description: {
    fontSize: 14,
    color: '#777',
    marginTop: 5,
  },

  actions: {
    flexDirection: 'row',
    gap: 10,
  },

  editButton: {
    flex: 1,
    backgroundColor: '#777',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },

  deleteButton: {
    flex: 1,
    backgroundColor: '#d9534f',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },

  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },

  emptyText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 40,
  },
});