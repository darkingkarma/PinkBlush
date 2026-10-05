import { StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <Text style={styles.title}>Welcome to</Text>

        <Image
          source={require('../../assets/Pink Blush Fashion Logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.description}>
          Garment Order and Production Management
        </Text>
      </View>

      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.buttonText}>Log in</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.registerText}>Create an account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf9f8',
    paddingHorizontal: 25,
    paddingBottom: 100,
    paddingTop: 100,
    justifyContent: 'space-between',
  },
  topSection: {
    alignItems: 'center',
    marginTop: 100,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#e8558a',
    marginBottom: 10,
  },
  logo: {
    width: 260,
    height: 130,
  },
  description: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#555',
    textAlign: 'center',
    marginTop: 4,
  },
  bottomSection: {
    width: '100%',
  },
  button: {
    backgroundColor: '#e8558a',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  registerButton: {
    borderWidth: 1.5,
    borderColor: '#e8558a',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  registerText: {
    color: '#e8558a',
    fontSize: 16,
    fontWeight: '600',
  },
});