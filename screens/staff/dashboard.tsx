
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';

import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import {
  RootStackParamList,
} from '../navigator';

import { supabase } from '../../supabase';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'StaffDashboard'
>;

export default function StaffDashboard({
  navigation,
}: Props) {
  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.auth.signOut();

            if (error) {
              Alert.alert('Logout Failed', error.message);
              return;
            }

            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Staff Dashboard
      </Text>

      <Text style={styles.subtitle}>
        Welcome to Pink Blush Staff Management
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() =>
          navigation.navigate('ManageGarments')
        }
      >
        <Text style={styles.buttonText}>
          Manage Garments
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() =>
          navigation.navigate('CustomOrder')
        }
      >
        <Text style={styles.buttonText}>
          Custom Orders
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutButtonText}>
          Logout
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#faf9f8',
    padding: 25,
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e2a4a',
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginBottom: 30,
  },

  button: {
    width: '100%',
    backgroundColor: '#d96b8a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },

  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  logoutButton: {
    width: '100%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d96b8a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 3,
  },

  logoutButtonText: {
    color: '#d96b8a',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
