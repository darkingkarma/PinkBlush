
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';

import {
  CompositeScreenProps,
  useFocusEffect,
} from '@react-navigation/native';

import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  MainTabParamList,
  RootStackParamList,
} from '../../../navigator';

import {
  useCallback,
  useState,
} from 'react';

import { supabase } from '../../../supabase';
import { unregisterPushNotificationsAsync } from '../../../pushNotifications';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Profile'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function ProfileScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadProfile = async () => {
        try {
          setLoading(true);

          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();

          if (userError) throw userError;

          if (!user) return;

          const { data, error } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', user.id)
            .single();

          if (error) throw error;

          if (isActive) {
            setFullName(data.full_name || '');
            setEmail(data.email || user.email || '');
          }
        } catch (error) {
          console.log('Profile loading error:', error);
        } finally {
          if (isActive) setLoading(false);
        }
      };

      void loadProfile();

      return () => {
        isActive = false;
      };
    }, [])
  );

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of your Pink Blush account?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              const {
                data: { user },
                error: userError,
              } = await supabase.auth.getUser();

              if (userError) throw userError;

              if (user) {
                await unregisterPushNotificationsAsync(user.id);
              }

              const { error } = await supabase.auth.signOut();

              if (error) throw error;
            } catch (error) {
              console.error('Customer logout error:', error);

              Alert.alert(
                'Logout Failed',
                error instanceof Error
                  ? error.message
                  : 'Unable to log out. Please try again.',
              );
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>My Profile</Text>
          <Text style={styles.subtitle}>
            Manage your account and personal information.
          </Text>
        </View>

        {/* Profile Information */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {fullName
                ? fullName.trim().charAt(0).toUpperCase()
                : 'C'}
            </Text>
          </View>

          <View style={styles.profileInfo}>
            {loading ? (
              <ActivityIndicator color="#D96B8A" />
            ) : (
              <>
                <Text style={styles.name}>
                  {fullName || 'Pink Blush Customer'}
                </Text>

                <Text style={styles.email}>
                  {email || 'No email available'}
                </Text>

                <View style={styles.memberBadge}>
                  <Text style={styles.member}>
                    PINK BLUSH CUSTOMER
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Personal Information */}
        <Text style={styles.sectionTitle}>
          Personal Information
        </Text>

        <TouchableOpacity
          style={styles.menuItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('PersonalDetails')}
        >
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>
              Personal Details
            </Text>

            <Text style={styles.menuText}>
              Manage your name and contact information.
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Measurements')}
        >
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>
              My Measurements
            </Text>

            <Text style={styles.menuText}>
              View and manage your garment measurements.
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        {/* Account Settings */}
        <Text style={styles.sectionTitle}>
          Account Settings
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            Your Pink Blush Account
          </Text>

          <Text style={styles.infoText}>
            Keep your personal details and measurements updated
            to make ordering your favorite garments easier.
          </Text>
        </View>

        {/* Change Password */}
        <TouchableOpacity
          style={styles.menuItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('ChangePassword')}
        >
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>
              Change Password
            </Text>

            <Text style={styles.menuText}>
              Update your account password.
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutText}>
            Log Out
          </Text>
        </TouchableOpacity>

        <Text style={styles.version}>
          Pink Blush v1.0.0
        </Text>

        <Text style={styles.footer}>
          Made with love for your perfect fit.
        </Text>
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
    paddingBottom: 110,
  },

  header: {
    marginTop: 20,
    marginBottom: 25,
  },

  title: {
    fontSize: 27,
    fontWeight: 'bold',
    color: '#D96B8A',
  },

  subtitle: {
    fontSize: 13,
    color: '#999',
    marginTop: 6,
  },

  profileCard: {
    backgroundColor: '#FDF1F5',
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },

  avatar: {
    width: 65,
    height: 65,
    borderRadius: 33,
    backgroundColor: '#D96B8A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },

  avatarText: {
    color: '#fff',
    fontSize: 27,
    fontWeight: 'bold',
  },

  profileInfo: {
    flex: 1,
  },

  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },

  email: {
    fontSize: 12,
    color: '#888',
    marginBottom: 9,
  },

  memberBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F8DCE5',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },

  member: {
    fontSize: 9,
    color: '#B84470',
    fontWeight: 'bold',
    letterSpacing: 0.6,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    marginTop: 5,
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F0E5E9',
    borderRadius: 13,
    padding: 17,
    marginBottom: 12,
  },

  menuContent: {
    flex: 1,
  },

  menuTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },

  menuText: {
    fontSize: 12,
    color: '#999',
    lineHeight: 18,
  },

  arrow: {
    fontSize: 26,
    color: '#D96B8A',
    marginLeft: 10,
  },

  infoCard: {
    backgroundColor: '#FDF5F7',
    borderRadius: 13,
    padding: 17,
    marginBottom: 20,
  },

  infoTitle: {
    color: '#B84470',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 7,
  },

  infoText: {
    color: '#888',
    fontSize: 12,
    lineHeight: 19,
  },

  logoutButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D96B8A',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },

  logoutText: {
    color: '#D96B8A',
    fontSize: 14,
    fontWeight: 'bold',
  },

  version: {
    textAlign: 'center',
    color: '#aaa',
    fontSize: 11,
    marginTop: 22,
  },

  footer: {
    textAlign: 'center',
    color: '#C59BA9',
    fontSize: 11,
    marginTop: 7,
  },
});
