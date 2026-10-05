import { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigator';
import { supabase } from '../../supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRegister = async () => {
    if (
      !fullName ||
      !username ||
      !contactNumber ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
      options: {
        data: {
          username: username.trim().toLowerCase(),
          full_name: fullName.trim(),
          contact_number: contactNumber.trim(),
        },
      },
    });

    if (error) {
      Alert.alert('Registration Failed', error.message);
      return;
    }

    Alert.alert(
      'Success',
      'Account created successfully!',
      [
        {
          text: 'OK',
          onPress: () => navigation.navigate('Login'),
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Image
        source={require('../../assets/Pink Blush Fashion Logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.description}>
        Garment Order and Production Management
      </Text>

      <Text style={styles.title}>Create Account</Text>

      <Text style={styles.label}>Username</Text>
      <TextInput
        style={styles.input}
        placeholder="Create a username"
        placeholderTextColor="#aaa"
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />

      <Text style={styles.label}>Full Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your full name"
        placeholderTextColor="#aaa"
        value={fullName}
        onChangeText={setFullName}
      />

      <Text style={styles.label}>Contact Number</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter contact number"
        placeholderTextColor="#aaa"
        keyboardType="phone-pad"
        value={contactNumber}
        onChangeText={setContactNumber}
      />

      <Text style={styles.label}>Email Address</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter email"
        placeholderTextColor="#aaa"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Create password"
        placeholderTextColor="#aaa"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Text style={styles.label}>Confirm Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Confirm password"
        placeholderTextColor="#aaa"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleRegister}
      >
        <Text style={styles.buttonText}>CREATE ACCOUNT</Text>
      </TouchableOpacity>

      <View style={styles.bottomTextWrapper}>
        <Text style={styles.bottomText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginText}>Log In</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf9f8',
  },
  contentContainer: {
    padding: 25,
    paddingTop: 40,
    paddingBottom: 40,
  },
  logo: {
    width: 220,
    height: 100,
    alignSelf: 'center',
  },
  description: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#555',
    textAlign: 'center',
    marginBottom: 25,
  },
  title: {
    fontSize: 26,
    fontStyle: 'italic',
    fontWeight: '600',
    color: '#1e2a4a',
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e8558a',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#e8558a',
    paddingVertical: 15,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  bottomTextWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  bottomText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  loginText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e8558a',
  },
});
