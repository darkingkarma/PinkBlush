
import { useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../navigator';
import { supabase } from '../../supabase';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'ResetPassword'
>;

export default function ResetPasswordScreen({
  navigation,
}: Props) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  // Same password requirements as RegisterScreen.
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

  const validPassword = passwordRules.every(
    (rule) => rule.valid
  );

  const strengthScore = passwordRules.filter(
    (rule) => rule.valid
  ).length;

  const strengthLabel =
    password.length === 0
      ? ''
      : strengthScore <= 2
      ? 'Weak'
      : strengthScore <= 4
      ? 'Almost there'
      : 'Strong';

  const strengthColor =
    strengthScore === 5
      ? '#16803c'
      : strengthScore >= 3
      ? '#e6a23c'
      : '#d93025';

  const passwordsMatch =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password === confirmPassword;

  const handleResetPassword = async () => {
    if (isSaving) return;

    if (!password || !confirmPassword) {
      Alert.alert(
        'Missing Information',
        'Please enter and confirm your new password.'
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
      Alert.alert(
        'Password Mismatch',
        'Your passwords do not match.'
      );
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        Alert.alert(
          'Password Reset Failed',
          error.message
        );
        return;
      }

      // Sign out after successfully updating the password.
      await supabase.auth.signOut();

      Alert.alert(
        'Password Updated',
        'Your password has been changed successfully. You can now log in using your new password.',
        [
          {
            text: 'Go to Login',
            onPress: () => navigation.replace('Login'),
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'Unable to update your password.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Reset Password</Text>

        <Text style={styles.description}>
          Create a new strong password for your Pink Blush account.
        </Text>

        {/* New Password */}
        <Text style={styles.label}>New Password</Text>

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Enter new password"
            placeholderTextColor="#aaa"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
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

        {/* Password Strength and Requirements */}
        {password.length > 0 && (
          <View style={styles.strengthContainer}>
            <View style={styles.strengthHeader}>
              <Text style={styles.strengthTitle}>
                Password strength
              </Text>

              <Text
                style={[
                  styles.strengthLabel,
                  { color: strengthColor },
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
                          ? strengthColor
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
                  {
                    color: rule.valid ? '#16803c' : '#777',
                  },
                ]}
              >
                {rule.valid ? '✓' : '○'} {rule.label}
              </Text>
            ))}
          </View>
        )}

        {/* Confirm New Password */}
        <Text style={styles.label}>Confirm New Password</Text>

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Re-enter new password"
            placeholderTextColor="#aaa"
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <TouchableOpacity
            onPress={() =>
              setShowConfirmPassword(!showConfirmPassword)
            }
            style={styles.showButton}
            accessibilityRole="button"
            accessibilityLabel={
              showConfirmPassword
                ? 'Hide confirm password'
                : 'Show confirm password'
            }
          >
            <Text style={styles.showButtonText}>
              {showConfirmPassword ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Password Match Feedback */}
        {confirmPassword.length > 0 && (
          <Text
            style={
              passwordsMatch
                ? styles.matchText
                : styles.mismatchText
            }
          >
            {passwordsMatch
              ? '✓ Passwords match.'
              : 'Passwords do not match.'}
          </Text>
        )}

        {/* Update Password Button */}
        <TouchableOpacity
          style={[
            styles.button,
            isSaving && styles.buttonDisabled,
          ]}
          onPress={handleResetPassword}
          activeOpacity={0.8}
          disabled={isSaving}
          accessibilityRole="button"
        >
          {isSaving ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.buttonText}>
                UPDATING PASSWORD...
              </Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>
              UPDATE PASSWORD
            </Text>
          )}
        </TouchableOpacity>
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
    padding: 25,
    paddingTop: 40,
    paddingBottom: 50,
  },

  title: {
    fontSize: 27,
    fontWeight: '700',
    color: '#1e2a4a',
    marginBottom: 10,
  },

  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
    lineHeight: 21,
  },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
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

  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
