import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  MainTabParamList,
  RootStackParamList,
} from '../navigator';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function HomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Pink Blush</Text>
            <Text style={styles.welcome}>Welcome!</Text>
          </View>

          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => {}}
          >
            <Ionicons
              name="notifications-outline"
              size={23}
              color="#d96b8a"
            />
          </TouchableOpacity>
        </View>

        {/* Order Options */}
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>
            What Would You Like to Order?
          </Text>

          <Text style={styles.heroText}>
            Create a custom garment based on your ideas, or browse
            our available products and customize your preferred style.
          </Text>

          {/* Custom Order */}
          <TouchableOpacity
            style={styles.customOrderButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('CustomOrder')}
          >
            <Ionicons
              name="color-wand-outline"
              size={21}
              color="#d96b8a"
              style={styles.buttonIcon}
            />

            <Text style={styles.customOrderButtonText}>
              Custom Order
            </Text>

            <Ionicons
              name="arrow-forward"
              size={20}
              color="#d96b8a"
            />
          </TouchableOpacity>

          {/* Or Divider */}
          <View style={styles.orContainer}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.orLine} />
          </View>

          {/* Catalog */}
          <TouchableOpacity
            style={styles.catalogButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Catalog')}
          >
            <Ionicons
              name="bag-handle-outline"
              size={21}
              color="#fff"
              style={styles.buttonIcon}
            />

            <Text style={styles.catalogButtonText}>
              Browse Available Products
            </Text>

            <Ionicons
              name="arrow-forward"
              size={20}
              color="#fff"
            />
          </TouchableOpacity>

          <Text style={styles.heroFootnote}>
            Custom designs or ready-to-customize garments — the choice is yours!
          </Text>
        </View>

        {/* My Orders */}
        <Text style={styles.sectionTitle}>My Orders</Text>

        <View style={styles.statusRow}>
          <TouchableOpacity
            style={styles.statusCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Orders')}
          >
            <Text style={styles.statusNumber}>0</Text>
            <Text style={styles.statusLabel}>Pending</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statusCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Orders')}
          >
            <Text style={styles.statusNumber}>0</Text>
            <Text style={styles.statusLabel}>In Production</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statusCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Orders')}
          >
            <Text style={styles.statusNumber}>0</Text>
            <Text style={styles.statusLabel}>Completed</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Orders')}
          >
            <Ionicons
              name="cube-outline"
              size={28}
              color="#d96b8a"
              style={styles.actionIcon}
            />

            <Text style={styles.actionTitle}>Track Orders</Text>

            <Text style={styles.actionText}>
              Check your order status
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Orders')}
          >
            <Ionicons
              name="receipt-outline"
              size={28}
              color="#d96b8a"
              style={styles.actionIcon}
            />

            <Text style={styles.actionTitle}>Order History</Text>

            <Text style={styles.actionText}>
              View your submitted orders
            </Text>
          </TouchableOpacity>
        </View>

        {/* Information Card */}
        <View style={styles.infoCard}>
          <Ionicons
            name="sparkles-outline"
            size={30}
            color="#d96b8a"
            style={styles.infoIcon}
          />

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              Pink Blush Garments
            </Text>

            <Text style={styles.infoText}>
              Quality garments made according to your style and measurements.
            </Text>
          </View>
        </View>
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
    paddingBottom: 100,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 25,
  },

  brand: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d96b8a',
  },

  welcome: {
    fontSize: 15,
    color: '#777',
    marginTop: 3,
  },

  notificationButton: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#fce8ee',
    justifyContent: 'center',
    alignItems: 'center',
  },

  heroCard: {
    backgroundColor: '#d96b8a',
    borderRadius: 20,
    padding: 22,
    marginBottom: 28,
  },

  heroTitle: {
    color: '#fff',
    fontSize: 23,
    fontWeight: 'bold',
    marginBottom: 10,
  },

  heroText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 22,
  },

  customOrderButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  customOrderButtonText: {
    color: '#d96b8a',
    fontSize: 15,
    fontWeight: 'bold',
    flex: 1,
  },

  buttonIcon: {
    marginRight: 10,
  },

  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 17,
  },

  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },

  orText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginHorizontal: 14,
  },

  catalogButton: {
    backgroundColor: '#b94f70',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },

  catalogButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },

  heroFootnote: {
    color: '#fff',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 15,
    opacity: 0.9,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 14,
  },

  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },

  statusCard: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: 15,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1d9e0',
  },

  statusNumber: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#d96b8a',
    marginBottom: 5,
  },

  statusLabel: {
    fontSize: 12,
    color: '#777',
    textAlign: 'center',
  },

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },

  actionCard: {
    width: '48%',
    backgroundColor: '#fdf3f6',
    borderRadius: 15,
    padding: 17,
  },

  actionIcon: {
    marginBottom: 12,
  },

  actionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },

  actionText: {
    fontSize: 12,
    color: '#777',
    lineHeight: 17,
  },

  infoCard: {
    backgroundColor: '#fafafa',
    borderRadius: 15,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },

  infoIcon: {
    marginRight: 15,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },

  infoText: {
    fontSize: 12,
    color: '#777',
    lineHeight: 17,
  },
});
