
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
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';

import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../../navigator';
import { supabase } from '../../supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Resend verification email
  const handleResendVerification = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        Alert.alert('Resend Failed', error.message);
        return;
      }

      Alert.alert(
        'Verification Email Sent',
        `A new verification link has been sent to ${email}. Please check your inbox and spam folder.`
      );
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'Unable to resend verification email.'
      );
    }
  };

  const showVerificationAlert = (email: string) => {
    Alert.alert(
      'Email Not Verified',
      'Please verify your email address before logging in. Check your inbox for the verification link.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resend Email',
          onPress: () => handleResendVerification(email),
        },
      ]
    );
  };

  // Login function
  const handleLogin = async () => {
    if (isLoggingIn) return;

    const enteredUsername = usernameOrEmail.trim();

    if (!enteredUsername || !password) {
      Alert.alert(
        'Error',
        'Please enter your username/email and password.'
      );
      return;
    }

    setIsLoggingIn(true);

    try {
      let loginEmail = enteredUsername;

      // If the user entered a username, retrieve its registered email.
      if (!enteredUsername.includes('@')) {
        const { data, error } = await supabase.rpc(
          'get_email_by_username',
          {
            input_username: enteredUsername.toLowerCase(),
          }
        );

        if (error) {
          console.error('Username lookup error:', error);
          Alert.alert(
            'Login Failed',
            'Unable to find your username. Please try again.'
          );
          return;
        }

        if (typeof data !== 'string' || !data.trim()) {
          Alert.alert(
            'Login Failed',
            'Username not found. Please check your username.'
          );
          return;
        }

        loginEmail = data.trim();
      }

      loginEmail = loginEmail.toLowerCase();

      console.log(
        'Login method:',
        enteredUsername.includes('@') ? 'Email' : 'Username'
      );

      console.log('Resolved login email:', loginEmail);

      // Authenticate using email and password.
      const { data: loginData, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: loginEmail,
          password,
        });

      if (loginError) {
        console.error('Authentication error:', loginError);

        if (
          loginError.code === 'email_not_confirmed' ||
          loginError.message.toLowerCase().includes('email not confirmed')
        ) {
          showVerificationAlert(loginEmail);
          return;
        }

        Alert.alert('Login Failed', loginError.message);
        return;
      }

      if (!loginData.user) {
        Alert.alert(
          'Login Failed',
          'Unable to retrieve your account information.'
        );
        return;
      }

      // Check email verification.
      if (!loginData.user.email_confirmed_at) {
        await supabase.auth.signOut();
        showVerificationAlert(loginEmail);
        return;
      }

      // Retrieve account role.
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

      // Navigate according to role.
      if (profile.role === 'staff') {
        navigation.replace('StaffDashboard');
      } else {
        navigation.replace('Main');
      }

    } catch (error) {
      console.error('Login exception:', error);

      Alert.alert(
        'Login Failed',
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Forgot password function
  const handleForgotPassword = async () => {
    const email = usernameOrEmail.trim().toLowerCase();

    if (!email.includes('@')) {
      Alert.alert(
        'Enter Your Email',
        'Please enter your registered Gmail address first.'
      );
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'pinkblush://reset-password',
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert(
        'Password Reset Email Sent',
        'Please check your Gmail inbox and follow the password reset link.'
      );
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'Unable to send password reset email.'
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingHorizontal: isSmallScreen ? 15 : 25,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.form}>
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
            autoCorrect={false}
            autoComplete="username"
            value={usernameOrEmail}
            onChangeText={setUsernameOrEmail}
          />

          <Text style={styles.label}>Password</Text>

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter your password"
              placeholderTextColor="#aaa"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="current-password"
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.showButton}
              accessibilityRole="button"
              accessibilityLabel={
                showPassword ? 'Hide password' : 'Show password'
              }
            >
              <Text style={styles.showButtonText}>
                {showPassword ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.forgotWrapper}
            onPress={handleForgotPassword}
            disabled={isLoggingIn}
          >
            <Text style={styles.forgotText}>
              Forgot Password?
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              isLoggingIn && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={isLoggingIn}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {isLoggingIn ? 'LOGGING IN...' : 'LOG IN'}
            </Text>
          </TouchableOpacity>

          <View style={styles.bottomTextWrapper}>
            <Text style={styles.bottomText}>
              Don't have an account?{' '}
            </Text>

            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
              disabled={isLoggingIn}
            >
              <Text style={styles.registerText}>
                Create Account
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf9f8',
  },

  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: 40,
    paddingBottom: 40,
  },

  form: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },

  logo: {
    width: '70%',
    maxWidth: 210,
    height: 90,
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
    minHeight: 48,
    marginBottom: 18,
    backgroundColor: '#fff',
    color: '#222',
  },

  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e8558a',
    borderRadius: 6,
    backgroundColor: '#fff',
    minHeight: 48,
    marginBottom: 12,
  },

  passwordInput: {
    flex: 1,
    minWidth: 0,
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

  buttonDisabled: {
    opacity: 0.65,
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

  registerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e8558a',
  },
});
