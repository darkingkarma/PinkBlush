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
  'SelectFabric'
>;

type Fabric = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price_addition: number;
  available: boolean;
};

export default function SelectFabricScreen({
  route,
  navigation,
}: Props) {
  const {
    garmentPart,
    garment,
    selectedPartIds,
  } = route.params;

  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [loading, setLoading] = useState(true);

  const getFabrics = async () => {
    setLoading(true);

    const {
      data,
      error,
    } = await supabase
      .from('garment_fabrics')
      .select(`
        fabric_id,
        fabrics (
          id,
          name,
          description,
          image_url,
          price_addition,
          available
        )
      `)
      .eq(
        'garment_part_id',
        garmentPart.id
      );

    if (error) {
      console.log(error);
      setFabrics([]);
      setLoading(false);
      return;
    }

    const fabricList =
      (data || [])
        .map((item: any) => item.fabrics)
        .filter(
          (fabric: Fabric | null) =>
            fabric && fabric.available
        );

    setFabrics(fabricList);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      getFabrics();
    }, [])
  );

  const selectFabric = (fabric: Fabric) => {
    navigation.replace(
      'ConfigureParts',
      {
        garment,
        selectedPartIds,
        selectedFabric: {
          partId: garmentPart.id,
          fabric,
        },
      }
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Choose a Fabric
        </Text>

        <Text style={styles.subtitle}>
          {garmentPart.name}
        </Text>
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Loading fabrics...
          </Text>
        </View>
      ) : fabrics.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>
            No fabrics available
          </Text>

          <Text style={styles.emptyText}>
            There are currently no fabrics assigned to this part.
          </Text>
        </View>
      ) : (
        <FlatList
          data={fabrics}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                selectFabric(item)
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
                <Text style={styles.fabricName}>
                  {item.name}
                </Text>

                <Text style={styles.description}>
                  {item.description ||
                    'No description available.'}
                </Text>

                <Text style={styles.price}>
                  +₱
                  {Number(
                    item.price_addition
                  ).toFixed(2)}
                </Text>

                <Text style={styles.selectText}>
                  Select Fabric
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
    paddingBottom: 10,
  },

  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#333',
  },

  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#d96b8a',
    marginTop: 5,
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
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
  },

  image: {
    width: '100%',
    height: 200,
  },

  imagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#f3f3f3',
    justifyContent: 'center',
    alignItems: 'center',
  },

  placeholderText: {
    color: '#999',
    fontSize: 14,
  },

  cardContent: {
    padding: 16,
  },

  fabricName: {
    fontSize: 19,
    fontWeight: '700',
    color: '#333',
  },

  description: {
    fontSize: 14,
    color: '#777',
    lineHeight: 20,
    marginTop: 5,
  },

  price: {
    fontSize: 15,
    fontWeight: '600',
    color: '#d96b8a',
    marginTop: 8,
  },

  selectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d96b8a',
    marginTop: 10,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
});
