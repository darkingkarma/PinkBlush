
import { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../../navigator';
import { supabase } from '../../../supabase';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'CustomerGarments'
>;

type Garment = {
  id: string;
  name: string;
  description: string | null;
  available: boolean;
  category_id: string;
  image_url: string | null;
};

export default function CustomerGarmentsScreen({
  navigation,
  route,
}: Props) {
  const { categoryId, categoryName } = route.params;

  const [garments, setGarments] = useState<Garment[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const getGarments = async () => {
    setLoading(true);
    setErrorMessage('');

    const { data, error } = await supabase
      .from('garments')
      .select(
        'id, name, description, available, category_id, image_url'
      )
      .eq('available', true)
      .eq('category_id', categoryId)
      .order('name');

    if (error) {
      console.error('Error loading garments:', error.message);
      setGarments([]);
      setErrorMessage('Could not load garments. Please try again.');
    } else {
      setGarments(data ?? []);
    }

    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      void getGarments();
    }, [categoryId])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>

        <View style={styles.headerText}>
          <Text style={styles.title}>{categoryName}</Text>
          <Text style={styles.subtitle}>
            Choose a garment from this category.
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#d96b8a" />
          <Text style={styles.emptyText}>Loading garments...</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={42}
            color="#d96b8a"
          />
          <Text style={styles.emptyText}>{errorMessage}</Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => void getGarments()}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : garments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="shirt-outline"
            size={48}
            color="#d96b8a"
          />
          <Text style={styles.emptyTitle}>
            No garments available
          </Text>
          <Text style={styles.emptyText}>
            There are currently no available garments in {categoryName}.
          </Text>
        </View>
      ) : (
        <FlatList
          data={garments}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate('CustomerGarmentDetails', {
                  garment: item,
                })
              }
            >
              {item.image_url ? (
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.image}
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons
                    name="image-outline"
                    size={38}
                    color="#d7a5b5"
                  />
                  <Text style={styles.placeholderText}>
                    No Image Available
                  </Text>
                </View>
              )}

              <View style={styles.cardContent}>
                <Text style={styles.garmentName}>{item.name}</Text>

                <Text style={styles.description}>
                  {item.description || 'No description available.'}
                </Text>

                <View style={styles.selectRow}>
                  <Text style={styles.selectText}>
                    Select Garment
                  </Text>
                  <Ionicons
                    name="arrow-forward-circle"
                    size={22}
                    color="#d96b8a"
                  />
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
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
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 25,
    paddingBottom: 15,
  },
  backButton: {
    padding: 6,
    marginRight: 10,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#d96b8a',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#777',
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 5,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f1d9e0',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 190,
    resizeMode: 'cover',
    backgroundColor: '#f8f8f8',
  },
  imagePlaceholder: {
    width: '100%',
    height: 190,
    backgroundColor: '#fff5f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 13,
    color: '#999',
    marginTop: 8,
  },
  cardContent: {
    padding: 16,
  },
  garmentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    color: '#777',
    lineHeight: 18,
    marginBottom: 12,
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#d96b8a',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 21,
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
    fontWeight: 'bold',
  },
});
