import { useState } from 'react';

import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';

import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigator';
import { supabase } from '../../supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');

  
  const handleLogin = async () => {
    if (!usernameOrEmail.trim() || !password) {
      Alert.alert(
        'Error',
        'Please enter your username/email and password.'
      );
      return;
    }

    try {
      let email = usernameOrEmail.trim();

      // Convert username to email if needed
      if (!email.includes('@')) {
        const { data, error } = await supabase.rpc(
          'get_email_by_username',
          {
            input_username: email,
          }
        );

        if (error || !data) {
          Alert.alert('Login Failed', 'Username not found.');
          return;
        }

        email = data;
      }

      // Sign in with Supabase
      const { data: loginData, error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (loginError) {
        Alert.alert('Login Failed', loginError.message);
        return;
      }

      // Get the user's role
      const { data: profile, error: profileError } =
        await supabase
          .from('profiles')
          .select('role')
          .eq('id', loginData.user.id)
          .single();

      if (profileError || !profile) {
        Alert.alert(
          'Login Failed',
          'User profile was not found.'
        );

        await supabase.auth.signOut();
        return;
      }

      // Navigate to the correct screen
      if (profile.role === 'staff') {
        navigation.replace('StaffDashboard');
      } else {
        navigation.replace('Main');
      }
    } catch (error) {
      Alert.alert(
        'Login Failed',
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.'
      );
    }
  };


  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/Pink Blush Fashion Logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.description}>
        Garment Order and Production Management
      </Text>

      <Text style={styles.title}>Sign In</Text>

      <Text style={styles.label}>Username / Email</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter your username or email"
        placeholderTextColor="#aaa"
        autoCapitalize="none"
        value={usernameOrEmail}
        onChangeText={setUsernameOrEmail}
      />

      <Text style={styles.label}>Password</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter your password"
        placeholderTextColor="#aaa"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.forgotWrapper}>
        <Text style={styles.forgotText}>
          Forgot Password?
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
      >
        <Text style={styles.buttonText}>LOG IN</Text>
      </TouchableOpacity>

      <View style={styles.bottomTextWrapper}>
        <Text style={styles.bottomText}>
          Don't have an account?{' '}
        </Text>

        <TouchableOpacity
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.registerText}>
            Create Account
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 25,
    paddingTop: 50,
    backgroundColor: '#faf9f8',
  },

  logo: {
    width: 220,
    height: 100,
    alignSelf: 'center',
  },

  description: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#555',
    textAlign: 'center',
    marginBottom: 40,
  },

  title: {
    fontSize: 28,
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
    marginBottom: 18,
    backgroundColor: '#fff',
  },

  forgotWrapper: {
    alignSelf: 'flex-end',
    marginBottom: 25,
  },

  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e2a4a',
  },

  button: {
    backgroundColor: '#e8558a',
    paddingVertical: 15,
    borderRadius: 6,
    alignItems: 'center',
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

  registerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e8558a',
  },
});
