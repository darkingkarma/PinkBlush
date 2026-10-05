import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { MainTabParamList } from '../navigator';

type Props = BottomTabScreenProps<MainTabParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Pink Blush</Text>
            <Text style={styles.welcome}>Welcome!</Text>
          </View>

          <TouchableOpacity style={styles.notificationButton}>
            <Text style={styles.notificationIcon}>🔔</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Create Your Perfect Garment</Text>

          <Text style={styles.heroText}>
            Start a new order and customize your garment according to your
            preferred design, measurements, fabric, and color.
          </Text>

          <TouchableOpacity
            style={styles.orderButton}
            onPress={() => {}}
          >
            <Text style={styles.orderButtonText}>Create New Order</Text>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>My Orders</Text>

        <View style={styles.statusRow}>
          <View style={styles.statusCard}>
            <Text style={styles.statusNumber}>0</Text>
            <Text style={styles.statusLabel}>Pending</Text>
          </View>

          <View style={styles.statusCard}>
            <Text style={styles.statusNumber}>0</Text>
            <Text style={styles.statusLabel}>In Production</Text>
          </View>

          <View style={styles.statusCard}>
            <Text style={styles.statusNumber}>0</Text>
            <Text style={styles.statusLabel}>Completed</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => {}}
          >
            <Text style={styles.actionIcon}>📦</Text>
            <Text style={styles.actionTitle}>Track Orders</Text>
            <Text style={styles.actionText}>Check your order status</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => {}}
          >
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={styles.actionTitle}>Order History</Text>
            <Text style={styles.actionText}>View previous orders</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>✨</Text>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Pink Blush Garments</Text>

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
  notificationIcon: {
    fontSize: 20,
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
    marginBottom: 20,
  },
  orderButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderButtonText: {
    color: '#d96b8a',
    fontSize: 15,
    fontWeight: 'bold',
  },
  arrow: {
    color: '#d96b8a',
    fontSize: 20,
    marginLeft: 8,
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
    fontSize: 25,
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
    fontSize: 28,
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