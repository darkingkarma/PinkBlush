import {
  useCallback,
  useState,
} from 'react';

import {
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
}: Props) {
  const [garments, setGarments] = useState<Garment[]>([]);
  const [loading, setLoading] = useState(true);

  const getGarments = async () => {
    setLoading(true);

    const {
      data,
      error,
    } = await supabase
      .from('garments')
        .select(
            'id, name, description, available, category_id, image_url'
        )
      .eq('available', true)
      .order('name');

    if (error) {
      console.log(error);
      setGarments([]);
      setLoading(false);
      return;
    }

    setGarments(data || []);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      getGarments();
    }, [])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Choose a Garment
        </Text>

        <Text style={styles.subtitle}>
          Select a garment to start your order.
        </Text>
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Loading garments...
          </Text>
        </View>
      ) : garments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>
            No garments available
          </Text>

          <Text style={styles.emptyText}>
            There are currently no available garments.
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
                    onPress={() =>
                        navigation.navigate(
                        'CustomerGarmentDetails',
                        {
                            garment: item,
                        }
                        )
                    }
                >
              {item.image_url ? (
                <Image
                  source={{
                    uri: item.image_url,
                  }}
                  style={styles.image}
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.placeholderText}>
                    No Image
                  </Text>
                </View>
              )}

              <View style={styles.cardContent}>
                <Text style={styles.garmentName}>
                  {item.name}
                </Text>

                <Text style={styles.description}>
                  {item.description ||
                    'No description available.'}
                </Text>

                <Text style={styles.selectText}>
                  Select Garment
                </Text>
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
    padding: 20,
    paddingTop: 25,
    paddingBottom: 10,
  },

  title: {
    fontSize: 27,
    fontWeight: 'bold',
    color: '#d96b8a',
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 14,
    color: '#777',
  },

  list: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },

  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 16,
    marginBottom: 15,
    overflow: 'hidden',
  },

  image: {
    width: '100%',
    height: 190,
    resizeMode: 'cover',
  },

  imagePlaceholder: {
    width: '100%',
    height: 190,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },

  placeholderText: {
    fontSize: 13,
    color: '#aaa',
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
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
});