import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';

import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import {
  RootStackParamList,
} from '../../navigator';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'ManageGarments'
>;

export default function ManageGarmentsScreen({
  navigation,
}: Props) {
  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>
          Manage Garments
        </Text>

        <Text style={styles.subtitle}>
          Manage the garments, parts, designs, and fabrics available in the shop.
        </Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() =>
            navigation.navigate('GarmentCategories')
          }
        >
          <View style={styles.icon}>
            <Text>👕</Text>
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.menuTitle}>
              Garment Categories
            </Text>

            <Text style={styles.menuText}>
              Manage categories such as School Uniform and Company Uniform.
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() =>
            navigation.navigate('Garments')
          }
        >
          <View style={styles.icon}>
            <Text>👗</Text>
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.menuTitle}>
              Garments
            </Text>

            <Text style={styles.menuText}>
              Manage the actual garments offered by the shop.
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() =>
            navigation.navigate('GarmentParts')
          }
        >
          <View style={styles.icon}>
            <Text>✂️</Text>
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.menuTitle}>
              Garment Parts
            </Text>

            <Text style={styles.menuText}>
              Manage parts such as Upper and Lower with their prices.
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() =>
            navigation.navigate('Designs')
          }
        >
          <View style={styles.icon}>
            <Text>🎨</Text>
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.menuTitle}>
              Designs
            </Text>

            <Text style={styles.menuText}>
              Manage garment designs and images.
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() =>
            navigation.navigate('Fabrics')
          }
        >
          <View style={styles.icon}>
            <Text>🧵</Text>
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.menuTitle}>
              Fabrics
            </Text>

            <Text style={styles.menuText}>
              Manage available fabrics and additional prices.
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() =>
            navigation.navigate(
              'ManageGarmentFabrics'
            )
          }
        >
          <Text style={styles.menuText}>
            Manage Garment Fabrics
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#d96b8a',
    marginTop: 20,
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 14,
    color: '#777',
    lineHeight: 20,
    marginBottom: 25,
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
  },

  icon: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: '#fce8ee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },

  textContainer: {
    flex: 1,
  },

  menuTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },

  menuText: {
    fontSize: 12,
    color: '#888',
    lineHeight: 17,
  },

  arrow: {
    fontSize: 28,
    color: '#bbb',
    marginLeft: 8,
  },
});
