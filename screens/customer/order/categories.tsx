
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../../navigator';
import { supabase } from '../../../supabase';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'CustomerCategories'
>;

type Category = {
  id: string;
  name: string;
  description: string | null;
};

export default function CustomerCategoriesScreen({
  navigation,
}: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    setLoading(true);
    setErrorMessage('');

    const { data, error } = await supabase
      .from('garment_categories')
      .select('id, name, description')
      .order('name');

    if (error) {
      console.error('Category loading error:', error.message);
      setErrorMessage('Could not load categories. Please try again.');
      setCategories([]);
    } else {
      setCategories(data ?? []);
    }

    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>

        <Text style={styles.headerTitle}>Choose a Category</Text>

        <View style={{ width: 25 }} />
      </View>

      <Text style={styles.subtitle}>
        Browse the garment categories offered by Pink Blush.
      </Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#d96b8a" />
          <Text style={styles.message}>Loading categories...</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.center}>
          <Text style={styles.message}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadCategories}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : categories.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="shirt-outline" size={48} color="#d96b8a" />
          <Text style={styles.emptyTitle}>No Categories Yet</Text>
          <Text style={styles.message}>
            Please check back when categories have been added.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryCard}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate('CustomerGarments', {
                  categoryId: category.id,
                  categoryName: category.name,
                })
              }
            >
              <View style={styles.categoryIcon}>
                <Ionicons name="shirt-outline" size={29} color="#d96b8a" />
              </View>

              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>{category.name}</Text>
                {!!category.description && (
                  <Text style={styles.categoryDescription}>
                    {category.description}
                  </Text>
                )}
              </View>

              <Ionicons
                name="chevron-forward"
                size={23}
                color="#d96b8a"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff8fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#333',
  },
  subtitle: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    fontSize: 14,
    lineHeight: 21,
    color: '#777',
  },
  list: {
    paddingHorizontal: 18,
    paddingBottom: 25,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1d3de',
    padding: 15,
    marginBottom: 13,
  },
  categoryIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#fce8ef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryInfo: {
    flex: 1,
    marginHorizontal: 13,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  categoryDescription: {
    marginTop: 5,
    fontSize: 13,
    color: '#777',
    lineHeight: 18,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 25,
  },
  message: {
    color: '#777',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 21,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 12,
  },
  retryButton: {
    backgroundColor: '#d96b8a',
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 15,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
  },
});
