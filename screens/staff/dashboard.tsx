import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import {
  RootStackParamList,
} from '../navigator';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'StaffDashboard'
>;

export default function StaffDashboard({
  navigation,
}: Props) {
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
  },

  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
