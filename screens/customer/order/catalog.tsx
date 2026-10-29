
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';

import { supabase } from '../../../supabase';

type Category = {
  id: string;
  name: string;
  description: string | null;
};

type Garment = {
  id: string;
  name: string;
  description: string | null;
  available: boolean;
  category_id: string;
  image_url: string | null;
};

type CatalogNavigation = NavigationProp<
  ParamListBase & {
    CustomerGarmentDetails: { garment: Garment };
  }
>;

export default function CatalogScreen() {
  const navigation = useNavigation<CatalogNavigation>();

  const [categories, setCategories] = useState<Category[]>([]);
  const [garments, setGarments] = useState<Garment[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadCatalog = useCallback(async () => {
    setErrorMessage('');

    try {
      const [categoryResult, garmentResult] = await Promise.all([
        supabase
          .from('garment_categories')
          .select('id, name, description')
          .order('name', { ascending: true }),

        supabase
          .from('garments')
          .select(
            'id, name, description, available, category_id, image_url'
          )
          .eq('available', true)
          .order('created_at', { ascending: false }),
      ]);

      if (categoryResult.error) {
        throw categoryResult.error;
      }

      if (garmentResult.error) {
        throw garmentResult.error;
      }

      setCategories(categoryResult.data ?? []);
      setGarments(garmentResult.data ?? []);
    } catch (error) {
      console.error('Error loading catalog:', error);
      setErrorMessage(
        'Unable to load the catalog. Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const filteredGarments = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return garments.filter((garment) => {
      const matchesCategory =
        selectedCategory === 'all' ||
        garment.category_id === selectedCategory;

      const matchesSearch =
        !searchText ||
        garment.name.toLowerCase().includes(searchText) ||
        (garment.description ?? '').toLowerCase().includes(searchText);

      return matchesCategory && matchesSearch;
    });
  }, [garments, search, selectedCategory]);

  const getCategoryName = (categoryId: string) => {
    return (
      categories.find((category) => category.id === categoryId)?.name ??
      'Garment'
    );
  };

  const openGarment = (garment: Garment) => {
    navigation.navigate('CustomerGarmentDetails', { garment });
  };

  const renderGarment = ({ item }: { item: Garment }) => (
    <TouchableOpacity
      style={styles.garmentCard}
      activeOpacity={0.85}
      onPress={() => openGarment(item)}
    >
      {item.image_url ? (
        <Image
          source={{ uri: item.image_url }}
          style={styles.garmentImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Ionicons
            name="shirt-outline"
            size={42}
            color="#d96b8a"
          />
          <Text style={styles.placeholderText}>Pink Blush</Text>
        </View>
      )}

      <View style={styles.garmentInfo}>
        <Text style={styles.categoryName} numberOfLines={1}>
          {getCategoryName(item.category_id)}
        </Text>

        <Text style={styles.garmentName} numberOfLines={2}>
          {item.name}
        </Text>

        <Text style={styles.garmentDescription} numberOfLines={2}>
          {item.description || 'Customize this garment to your preference.'}
        </Text>

        <View style={styles.customizeRow}>
          <Text style={styles.customizeText}>View and customize</Text>
          <Ionicons name="arrow-forward" size={16} color="#d96b8a" />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#d96b8a" />
        <Text style={styles.loadingText}>Loading catalog...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Our Catalog</Text>
        <Text style={styles.subtitle}>
          Find a garment and customize it your way.
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={21} color="#999" />

        <TextInput
          style={styles.searchInput}
          placeholder="Search garments..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          autoCapitalize="none"
        />

        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.categorySection}>
        <Text style={styles.sectionTitle}>Categories</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
        >
          <TouchableOpacity
            style={[
              styles.categoryChip,
              selectedCategory === 'all' && styles.activeCategoryChip,
            ]}
            onPress={() => setSelectedCategory('all')}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === 'all' &&
                  styles.activeCategoryChipText,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          {categories.map((category) => {
            const isSelected = selectedCategory === category.id;

            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryChip,
                  isSelected && styles.activeCategoryChip,
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    isSelected && styles.activeCategoryChipText,
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {errorMessage ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="cloud-offline-outline"
            size={48}
            color="#d96b8a"
          />
          <Text style={styles.emptyTitle}>Catalog unavailable</Text>
          <Text style={styles.emptyText}>{errorMessage}</Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              void loadCatalog();
            }}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredGarments}
          renderItem={renderGarment}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.garmentRow}
          contentContainerStyle={styles.garmentList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void loadCatalog();
              }}
              tintColor="#d96b8a"
            />
          }
          ListHeaderComponent={
            <Text style={styles.resultsText}>
              {filteredGarments.length}{' '}
              {filteredGarments.length === 1 ? 'garment' : 'garments'} available
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="shirt-outline"
                size={48}
                color="#d96b8a"
              />
              <Text style={styles.emptyTitle}>
                No garments found
              </Text>
              <Text style={styles.emptyText}>
                Try another search or select a different category.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setSearch('');
                  setSelectedCategory('all');
                }}
              >
                <Text style={styles.resetText}>Clear filters</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff9fb',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff9fb',
  },
  loadingText: {
    marginTop: 12,
    color: '#777',
    fontSize: 14,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
  },
  heading: {
    fontSize: 25,
    fontWeight: '800',
    color: '#3d2931',
  },
  subtitle: {
    marginTop: 5,
    fontSize: 13,
    color: '#837078',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 18,
    marginBottom: 18,
    paddingHorizontal: 13,
    height: 48,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#f0dce3',
    backgroundColor: '#fff',
    gap: 9,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#3d2931',
  },
  categorySection: {
    marginBottom: 12,
  },
  sectionTitle: {
    marginHorizontal: 18,
    marginBottom: 10,
    fontSize: 16,
    fontWeight: '700',
    color: '#3d2931',
  },
  categoryList: {
    paddingHorizontal: 18,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#edd6df',
    backgroundColor: '#fff',
  },
  activeCategoryChip: {
    backgroundColor: '#d96b8a',
    borderColor: '#d96b8a',
  },
  categoryChipText: {
    color: '#755c66',
    fontSize: 13,
    fontWeight: '600',
  },
  activeCategoryChipText: {
    color: '#fff',
  },
  resultsText: {
    marginHorizontal: 18,
    marginTop: 6,
    marginBottom: 12,
    fontSize: 12,
    color: '#8a7880',
  },
  garmentList: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  garmentRow: {
    gap: 10,
    marginBottom: 12,
  },
  garmentCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f2e4e9',
  },
  garmentImage: {
    width: '100%',
    height: 155,
    backgroundColor: '#f9edf1',
  },
  imagePlaceholder: {
    height: 155,
    backgroundColor: '#fbeaf0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    marginTop: 5,
    color: '#d96b8a',
    fontSize: 12,
    fontWeight: '700',
  },
  garmentInfo: {
    padding: 11,
  },
  categoryName: {
    color: '#d96b8a',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  garmentName: {
    marginTop: 5,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
    color: '#3d2931',
  },
  garmentDescription: {
    marginTop: 5,
    minHeight: 32,
    fontSize: 11,
    lineHeight: 16,
    color: '#897981',
  },
  customizeRow: {
    marginTop: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customizeText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#d96b8a',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 35,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: '700',
    color: '#3d2931',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 19,
    color: '#897981',
    textAlign: 'center',
  },
  resetText: {
    marginTop: 16,
    color: '#d96b8a',
    fontWeight: '700',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#d96b8a',
    borderRadius: 10,
    paddingHorizontal: 22,
    paddingVertical: 11,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
