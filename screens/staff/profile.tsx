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
  useCallback,
  useState,
} from 'react';

import { useFocusEffect } from '@react-navigation/native';

import { supabase } from '../../supabase';
import { unregisterPushNotificationsAsync } from '../../pushNotifications';
export default function StaffProfileTab() {
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
          console.log('Staff profile loading error:', error);
        } finally {
          if (isActive) {
            setLoading(false);
          }
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
      'Are you sure you want to log out of your Pink Blush staff account?',
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
              console.error('Staff logout error:', error);

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
            Manage your staff account information.
          </Text>
        </View>

        {/* Profile Information */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {fullName
                ? fullName.trim().charAt(0).toUpperCase()
                : 'S'}
            </Text>
          </View>

          <View style={styles.profileInfo}>
            {loading ? (
              <ActivityIndicator color="#D96B8A" />
            ) : (
              <>
                <Text style={styles.name}>
                  {fullName || 'Pink Blush Staff'}
                </Text>

                <Text style={styles.email}>
                  {email || 'No email available'}
                </Text>

                <View style={styles.memberBadge}>
                  <Text style={styles.member}>
                    PINK BLUSH STAFF
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Account Information */}
        <Text style={styles.sectionTitle}>
          Account Information
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            Staff Account
          </Text>

          <Text style={styles.infoText}>
            This account is used to manage Pink Blush orders,
            payments, tailors, garments, and production activities.
          </Text>
        </View>

        {/* Staff Access */}
        <Text style={styles.sectionTitle}>
          Staff Access
        </Text>

        <View style={styles.menuItem}>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>
              Staff Management
            </Text>

            <Text style={styles.menuText}>
              Access the staff features available to your account,
              including orders, payments, tailors, garments, and
              production management.
            </Text>
          </View>
        </View>

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
          Made with love for better garment management.
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

  infoCard: {
    backgroundColor: '#FDF5F7',
    borderRadius: 13,
    padding: 17,
    marginBottom: 25,
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

  menuItem: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F0E5E9',
    borderRadius: 13,
    padding: 17,
    marginBottom: 20,
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

  logoutButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D96B8A',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
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