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

import { Ionicons } from '@expo/vector-icons';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../../../navigator';
import { supabase } from '../../../supabase';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'ChangePassword'
>;

export default function ChangePasswordScreen({ navigation }: Props) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  // Same password requirements as Register
  const passwordRules = [
    {
      label: 'At least 8 characters',
      valid: newPassword.length >= 8,
    },
    {
      label: 'One uppercase letter (A-Z)',
      valid: /[A-Z]/.test(newPassword),
    },
    {
      label: 'One lowercase letter (a-z)',
      valid: /[a-z]/.test(newPassword),
    },
    {
      label: 'One number (0-9)',
      valid: /[0-9]/.test(newPassword),
    },
    {
      label: 'One special character (!@#$%)',
      valid: /[^A-Za-z0-9]/.test(newPassword),
    },
  ];

  const validPassword = passwordRules.every((rule) => rule.valid);

  const strengthScore = passwordRules.filter(
    (rule) => rule.valid
  ).length;

  const strengthLabel =
    newPassword.length === 0
      ? ''
      : strengthScore <= 2
      ? 'Weak'
      : strengthScore <= 4
      ? 'Almost there'
      : 'Strong';

  const handleChangePassword = async () => {
    if (loading) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(
        'Missing Information',
        'Please fill in all password fields.'
      );
      return;
    }

    if (!validPassword) {
      Alert.alert(
        'Weak Password',
        'Your new password must meet all five password requirements.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        'Password Mismatch',
        'Your new password and confirmation do not match.'
      );
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert(
        'Invalid Password',
        'Your new password must be different from your current password.'
      );
      return;
    }

    setLoading(true);

    try {
      // Get the currently logged-in user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user?.email) {
        throw new Error(
          'Unable to identify your account. Please log in again.'
        );
      }

      // Verify current password
      const { error: signInError } =
        await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        });

      if (signInError) {
        Alert.alert(
          'Incorrect Password',
          'Your current password is incorrect.'
        );
        return;
      }

      // Update password
      const { error: updateError } =
        await supabase.auth.updateUser({
          password: newPassword,
        });

      if (updateError) throw updateError;

      Alert.alert(
        'Password Changed',
        'Your password has been successfully updated.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
        { cancelable: false }
      );

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

    } catch (error: any) {
      Alert.alert(
        'Change Password Failed',
        error?.message ||
          'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="lock-closed-outline" size={34} color="#D96B8A" />
          </View>

          <Text style={styles.title}>
            Change Password
          </Text>

          <Text style={styles.subtitle}>
            Keep your Pink Blush account secure by updating your password.
          </Text>
        </View>

        {/* Password Form */}
        <View style={styles.formCard}>

          {/* Current Password */}
          <Text style={styles.label}>
            Current Password
          </Text>

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter current password"
              placeholderTextColor="#aaa"
              secureTextEntry={!showCurrentPassword}
              autoCapitalize="none"
              autoComplete="current-password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />

            <TouchableOpacity
              onPress={() =>
                setShowCurrentPassword(!showCurrentPassword)
              }
              style={styles.showButton}
              accessibilityRole="button"
              accessibilityLabel={
                showCurrentPassword
                  ? 'Hide current password'
                  : 'Show current password'
              }
            >
              <Ionicons
                name={
                  showCurrentPassword
                    ? 'eye-off-outline'
                    : 'eye-outline'
                }
                size={21}
                color="#E8558A"
              />
            </TouchableOpacity>
          </View>

          {/* New Password */}
          <Text style={styles.label}>
            New Password
          </Text>

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter new password"
              placeholderTextColor="#aaa"
              secureTextEntry={!showNewPassword}
              autoCapitalize="none"
              autoComplete="new-password"
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <TouchableOpacity
              onPress={() =>
                setShowNewPassword(!showNewPassword)
              }
              style={styles.showButton}
              accessibilityRole="button"
              accessibilityLabel={
                showNewPassword
                  ? 'Hide new password'
                  : 'Show new password'
              }
            >
              <Ionicons
                name={
                  showNewPassword
                    ? 'eye-off-outline'
                    : 'eye-outline'
                }
                size={21}
                color="#E8558A"
              />
            </TouchableOpacity>
          </View>

          {/* Password Strength */}
          {newPassword.length > 0 && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthHeader}>
                <Text style={styles.strengthTitle}>
                  Password strength
                </Text>

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
                <View
                  key={rule.label}
                  style={styles.ruleRow}
                >
                  <Ionicons
                    name={
                      rule.valid
                        ? 'checkmark-circle'
                        : 'ellipse-outline'
                    }
                    size={15}
                    color={rule.valid ? '#16803c' : '#999'}
                  />

                  <Text
                    style={[
                      styles.ruleText,
                      {
                        color: rule.valid ? '#16803c' : '#777',
                      },
                    ]}
                  >
                    {rule.label}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Confirm Password */}
          <Text style={styles.label}>
            Confirm New Password
          </Text>

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Confirm new password"
              placeholderTextColor="#aaa"
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
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
              <Ionicons
                name={
                  showConfirmPassword
                    ? 'eye-off-outline'
                    : 'eye-outline'
                }
                size={21}
                color="#E8558A"
              />
            </TouchableOpacity>
          </View>

          {/* Password Match Feedback */}
          {confirmPassword.length > 0 &&
            newPassword !== confirmPassword && (
              <View style={styles.feedbackRow}>
                <Ionicons
                  name="close-circle"
                  size={15}
                  color="#d93025"
                />

                <Text style={styles.mismatchText}>
                  Passwords do not match.
                </Text>
              </View>
            )}

          {confirmPassword.length > 0 &&
            newPassword === confirmPassword &&
            newPassword.length > 0 && (
              <View style={styles.feedbackRow}>
                <Ionicons
                  name="checkmark-circle"
                  size={15}
                  color="#16803c"
                />

                <Text style={styles.matchText}>
                  Passwords match.
                </Text>
              </View>
            )}

          {/* Update Button */}
          <TouchableOpacity
            style={[
              styles.button,
              (
                !validPassword ||
                newPassword !== confirmPassword ||
                !currentPassword ||
                loading
              ) && styles.buttonDisabled,
            ]}
            onPress={handleChangePassword}
            activeOpacity={0.8}
            disabled={
              !validPassword ||
              newPassword !== confirmPassword ||
              !currentPassword ||
              loading
            }
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                UPDATE PASSWORD
              </Text>
            )}
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.cancelText}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Your password helps protect your Pink Blush account.
        </Text>
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
    padding: 25,
    paddingTop: 40,
    paddingBottom: 60,
  },

  header: {
    alignItems: 'center',
    marginBottom: 25,
  },

  iconCircle: {
    width: 75,
    height: 75,
    borderRadius: 40,
    backgroundColor: '#FCE7EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },

  title: {
    fontSize: 26,
    fontStyle: 'italic',
    fontWeight: '600',
    color: '#1e2a4a',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },

  formCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F3E4E9',
  },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 13,
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
    fontSize: 13,
  },

  showButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
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

  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    gap: 7,
  },

  ruleText: {
    fontSize: 12,
  },

  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -5,
    marginBottom: 12,
  },

  mismatchText: {
    fontSize: 12,
    color: '#d93025',
  },

  matchText: {
    fontSize: 12,
    color: '#16803c',
  },

  button: {
    backgroundColor: '#e8558a',
    paddingVertical: 15,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  cancelButton: {
    padding: 12,
    alignItems: 'center',
  },

  cancelText: {
    color: '#999',
    fontSize: 13,
    fontWeight: '600',
  },

  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: '#C59BA9',
    marginTop: 22,
  },
});