import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Alert,
} from 'react-native';

import {
  CompositeScreenProps,
} from '@react-navigation/native';

import {
  BottomTabScreenProps,
} from '@react-navigation/bottom-tabs';

import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import {
  MainTabParamList,
  RootStackParamList,
} from '../../navigator';

import { useEffect, useState } from 'react';

import { supabase } from '../../../supabase';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Profile'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function ProfileScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    if (error) {
      console.log(error);
      return;
    }

    setFullName(data.full_name || '');
    setEmail(data.email || user.email || '');
  };

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            const { error } =
              await supabase.auth.signOut();

            if (error) {
              Alert.alert(
                'Error',
                'Failed to log out.'
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
        <Text style={styles.title}>
          My Profile
        </Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              👤
            </Text>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.name}>
              {fullName || 'Customer'}
            </Text>

            <Text style={styles.email}>
              {email}
            </Text>

            <Text style={styles.member}>
              Pink Blush Customer
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Personal Information
        </Text>

        <TouchableOpacity
          style={styles.menuItem}
        >
          <View style={styles.menuIcon}>
            <Text>👤</Text>
          </View>

          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>
              Personal Details
            </Text>

            <Text style={styles.menuText}>
              Manage your name and contact information
            </Text>
          </View>

          <Text style={styles.arrow}>
            ›
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() =>
            navigation.navigate('Measurements')
          }
        >
          <View style={styles.menuIcon}>
            <Text>📏</Text>
          </View>

          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>
              My Measurements
            </Text>

            <Text style={styles.menuText}>
              View and manage your garment measurements
            </Text>
          </View>

          <Text style={styles.arrow}>
            ›
          </Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>
          Account
        </Text>

        <TouchableOpacity
          style={styles.menuItem}
        >
          <View style={styles.menuIcon}>
            <Text>🔔</Text>
          </View>

          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>
              Notifications
            </Text>

            <Text style={styles.menuText}>
              Manage your notification preferences
            </Text>
          </View>

          <Text style={styles.arrow}>
            ›
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
        >
          <View style={styles.menuIcon}>
            <Text>🔒</Text>
          </View>

          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>
              Change Password
            </Text>

            <Text style={styles.menuText}>
              Update your account password
            </Text>
          </View>

          <Text style={styles.arrow}>
            ›
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>
            Log Out
          </Text>
        </TouchableOpacity>

        <Text style={styles.version}>
          Pink Blush v1.0.0
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

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#d96b8a',
    marginTop: 20,
    marginBottom: 25,
  },

  profileCard: {
    backgroundColor: '#fdf1f5',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },

  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#d96b8a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },

  avatarText: {
    fontSize: 32,
  },

  profileInfo: {
    flex: 1,
  },

  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },

  email: {
    fontSize: 13,
    color: '#777',
    marginBottom: 5,
  },

  member: {
    fontSize: 12,
    color: '#d96b8a',
    fontWeight: '600',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
  },

  menuIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#fce8ee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },

  menuContent: {
    flex: 1,
  },

  menuTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },

  menuText: {
    fontSize: 12,
    color: '#888',
    lineHeight: 17,
  },

  arrow: {
    fontSize: 28,
    color: '#bbb',
    marginLeft: 8,
  },

  logoutButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d96b8a',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 15,
  },

  logoutText: {
    color: '#d96b8a',
    fontSize: 15,
    fontWeight: 'bold',
  },

  version: {
    textAlign: 'center',
    color: '#aaa',
    fontSize: 12,
    marginTop: 20,
  },
});
