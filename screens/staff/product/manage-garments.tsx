
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../../supabase';
import { RootStackParamList } from '../../navigator';

type Props = NativeStackScreenProps<RootStackParamList, 'ManageGarments'>;

type Garment = {
  id: string;
  name: string;
  description: string | null;
  available: boolean;
  category_id: string;
  image_url: string | null;
};

export default function ManageGarmentsScreen({ navigation }: Props) {
  const [garments, setGarments] = useState<Garment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadGarments = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('garments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setGarments((data ?? []) as Garment[]);
    }

    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadGarments();
    }, [loadGarments]),
  );

  const deleteGarment = (item: Garment) => {
    Alert.alert(
      'Delete Garment',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('garments')
              .delete()
              .eq('id', item.id);

            if (error) {
              Alert.alert('Unable to Delete', error.message);
              return;
            }

            Alert.alert('Success', 'Garment deleted successfully.');
            loadGarments();
          },
        },
      ],
    );
  };

  const filteredGarments = garments.filter((item) =>
    item.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>Garment Management</Text>
      <Text style={styles.subtitle}>
        Manage categories, garments, and fabrics.
      </Text>

      <View style={styles.shortcutRow}>
        <TouchableOpacity
          style={styles.shortcutCard}
          onPress={() => navigation.navigate('GarmentCategories')}
        >
          <Ionicons name="grid-outline" size={28} color="#d96b8a" />
          <Text style={styles.shortcutTitle}>Categories</Text>
          <Text style={styles.shortcutDescription}>
            Manage garment categories
          </Text>
          <Text style={styles.shortcutAction}>Open →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shortcutCard}
          onPress={() => navigation.navigate('Fabrics')}
        >
          <Ionicons
            name="color-palette-outline"
            size={28}
            color="#d96b8a"
          />
          <Text style={styles.shortcutTitle}>Fabrics</Text>
          <Text style={styles.shortcutDescription}>
            Manage available fabrics
          </Text>
          <Text style={styles.shortcutAction}>Open →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>All Garments</Text>
          <Text style={styles.countText}>
            {garments.length} garment(s)
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddGarment')}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#888" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search garments..."
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#d96b8a"
          style={{ marginTop: 30 }}
        />
      ) : filteredGarments.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="shirt-outline" size={42} color="#d96b8a" />
          <Text style={styles.emptyTitle}>No garments found</Text>
          <Text style={styles.emptyText}>
            Add a garment or try another search.
          </Text>
        </View>
      ) : (
        filteredGarments.map((item) => (
          <View key={item.id} style={styles.garmentCard}>
            {item.image_url ? (
              <Image
                source={{ uri: item.image_url }}
                style={styles.garmentImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.garmentImage, styles.imagePlaceholder]}>
                <Ionicons name="shirt-outline" size={40} color="#d96b8a" />
              </View>
            )}

            <View style={styles.garmentInfo}>
              <Text style={styles.garmentName}>{item.name}</Text>

              <Text style={styles.garmentDescription}>
                {item.description || 'No description provided.'}
              </Text>

              <Text
                style={[
                  styles.statusText,
                  { color: item.available ? '#24834c' : '#d9534f' },
                ]}
              >
                {item.available ? 'Available' : 'Unavailable'}
              </Text>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.manageButton}
                  onPress={() =>
                    navigation.navigate('GarmentDetails', {
                      garment: item,
                    })
                  }
                >
                  <Ionicons name="settings-outline" size={16} color="#fff" />
                  <Text style={styles.manageButtonText}>Manage</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() =>
                    navigation.navigate('EditGarment', {
                      garment: item,
                    })
                  }
                >
                  <Ionicons name="create-outline" size={16} color="#d96b8a" />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteGarment(item)}
                >
                  <Ionicons name="trash-outline" size={16} color="#d9534f" />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff8fa',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: '#30242a',
  },
  subtitle: {
    fontSize: 14,
    color: '#777',
    marginTop: 5,
    marginBottom: 20,
  },
  shortcutRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 25,
  },
  shortcutCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: '#f1dce3',
  },
  shortcutTitle: {
    color: '#30242a',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
  },
  shortcutDescription: {
    color: '#777',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
  },
  shortcutAction: {
    color: '#d96b8a',
    fontWeight: '700',
    marginTop: 10,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#30242a',
  },
  countText: {
    fontSize: 12,
    color: '#888',
    marginTop: 3,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d96b8a',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#eee0e5',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  emptyState: {
    backgroundColor: '#fff',
    padding: 28,
    borderRadius: 15,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#30242a',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
  },
  emptyText: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  garmentCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#f1dce3',
    overflow: 'hidden',
    marginBottom: 14,
  },
  garmentImage: {
    width: '100%',
    height: 165,
    backgroundColor: '#fff0f5',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  garmentInfo: {
    padding: 14,
  },
  garmentName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#30242a',
  },
  garmentDescription: {
    color: '#777',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d96b8a',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flex: 1.2,
  },
  manageButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff0f5',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flex: 1,
  },
  editButtonText: {
    color: '#d96b8a',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff0ef',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flex: 1,
  },
  deleteButtonText: {
    color: '#d9534f',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
});
