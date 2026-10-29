
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

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const passwordRules = [
    {
      label: 'At least 8 characters',
      valid: password.length >= 8,
    },
    {
      label: 'One uppercase letter (A-Z)',
      valid: /[A-Z]/.test(password),
    },
    {
      label: 'One lowercase letter (a-z)',
      valid: /[a-z]/.test(password),
    },
    {
      label: 'One number (0-9)',
      valid: /[0-9]/.test(password),
    },
    {
      label: 'One special character (!@#$%)',
      valid: /[^A-Za-z0-9]/.test(password),
    },
  ];

  const validPassword = passwordRules.every((rule) => rule.valid);
  const strengthScore = passwordRules.filter((rule) => rule.valid).length;

  const strengthLabel =
    password.length === 0
      ? ''
      : strengthScore <= 2
      ? 'Weak'
      : strengthScore <= 4
      ? 'Almost there'
      : 'Strong';

  const handleRegister = async () => {
    if (isRegistering) return;

    if (
      !fullName.trim() ||
      !username.trim() ||
      !contactNumber.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const gmailPattern =
      /^[a-z0-9](?:[a-z0-9.]*[a-z0-9])?@gmail\.com$/;

    if (
      !gmailPattern.test(normalizedEmail) ||
      normalizedEmail.split('@')[0].includes('..')
    ) {
      Alert.alert(
        'Invalid Email',
        'Please enter a valid Gmail address ending in @gmail.com.'
      );
      return;
    }

    if (!validPassword) {
      Alert.alert(
        'Weak Password',
        'Your password must meet all five password requirements.'
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setIsRegistering(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
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

      if (!data.user) {
        Alert.alert(
          'Registration Failed',
          'Unable to create your account. Please try again.'
        );
        return;
      }

      // If Supabase automatically signs the new user in,
      // sign them out before showing the Login screen.
      if (data.session) {
        const { error: signOutError } = await supabase.auth.signOut();

        if (signOutError) {
          Alert.alert(
            'Account Created',
            'Your account was created, but automatic sign-out failed. Please sign out before logging in.'
          );
          return;
        }
      }

      Alert.alert(
        'Registration Successful',
        'Your account has been created. Please log in.',
        [
          {
            text: 'Go to Login',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            },
          },
        ],
        { cancelable: false }
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
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
        placeholder="Enter Gmail address"
        placeholderTextColor="#aaa"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
      />

      <Text style={styles.label}>Password</Text>
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Create a strong password"
          placeholderTextColor="#aaa"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete="new-password"
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.showButton}
          accessibilityRole="button"
          accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
        >
          <Text style={styles.showButtonText}>
            {showPassword ? 'Hide' : 'Show'}
          </Text>
        </TouchableOpacity>
      </View>

      {password.length > 0 && (
        <View style={styles.strengthContainer}>
          <View style={styles.strengthHeader}>
            <Text style={styles.strengthTitle}>Password strength</Text>
            <Text
              style={[
                styles.strengthLabel,
                {
                  color:
                    strengthScore === 5
                      ? '#16803c'
                      : strengthScore >= 3
                      ? '#c17b08'
                      : '#d93025',
                },
              ]}
            >
              {strengthLabel}
            </Text>
          </View>

          <View style={styles.strengthBars}>
            {[1, 2, 3, 4, 5].map((bar) => (
              <View
                key={bar}
                style={[
                  styles.strengthBar,
                  {
                    backgroundColor:
                      bar <= strengthScore
                        ? strengthScore === 5
                          ? '#16803c'
                          : strengthScore >= 3
                          ? '#e6a23c'
                          : '#d93025'
                        : '#e5e7eb',
                  },
                ]}
              />
            ))}
          </View>

          {passwordRules.map((rule) => (
            <Text
              key={rule.label}
              style={[
                styles.ruleText,
                { color: rule.valid ? '#16803c' : '#777' },
              ]}
            >
              {rule.valid ? '✓' : '○'} {rule.label}
            </Text>
          ))}
        </View>
      )}

      <Text style={styles.label}>Confirm Password</Text>
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Confirm your password"
          placeholderTextColor="#aaa"
          secureTextEntry={!showConfirmPassword}
          autoCapitalize="none"
          autoComplete="new-password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        <TouchableOpacity
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          style={styles.showButton}
          accessibilityRole="button"
          accessibilityLabel={
            showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
          }
        >
          <Text style={styles.showButtonText}>
            {showConfirmPassword ? 'Hide' : 'Show'}
          </Text>
        </TouchableOpacity>
      </View>

      {confirmPassword.length > 0 && password !== confirmPassword && (
        <Text style={styles.mismatchText}>Passwords do not match.</Text>
      )}

      {confirmPassword.length > 0 &&
        password === confirmPassword &&
        password.length > 0 && (
          <Text style={styles.matchText}>✓ Passwords match.</Text>
        )}

      <TouchableOpacity
        style={[
          styles.button,
          (!validPassword || isRegistering) && styles.buttonDisabled,
        ]}
        onPress={handleRegister}
        activeOpacity={0.8}
        disabled={isRegistering}
      >
        <Text style={styles.buttonText}>
          {isRegistering ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
        </Text>
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e8558a',
    borderRadius: 6,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    color: '#222',
  },
  showButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  showButtonText: {
    color: '#e8558a',
    fontSize: 13,
    fontWeight: '700',
  },
  strengthContainer: {
    marginBottom: 18,
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  strengthTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#444',
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 10,
  },
  strengthBar: {
    height: 5,
    flex: 1,
    borderRadius: 5,
  },
  ruleText: {
    fontSize: 12,
    marginBottom: 5,
  },
  mismatchText: {
    fontSize: 12,
    color: '#d93025',
    marginTop: -5,
    marginBottom: 12,
  },
  matchText: {
    fontSize: 12,
    color: '#16803c',
    marginTop: -5,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#e8558a',
    paddingVertical: 15,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 15,
  },
  buttonDisabled: {
    opacity: 0.75,
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
    flexWrap: 'wrap',
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
