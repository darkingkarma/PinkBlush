//removebable//
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
} from 'react-native';

import { useEffect, useState } from 'react';

import { supabase } from '../../../supabase';

type Organization = {
  id: string;
  name: string;
  description: string | null;
  is_available: boolean;
};

export default function OrganizationsScreen() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('ORGANIZATIONS:', data);
    console.log('ORGANIZATION ERROR:', error);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setOrganizations(data || []);
  };

  const addOrganization = async () => {
    if (!name.trim()) {
      Alert.alert(
        'Required',
        'Please enter an organization name.'
      );
      return;
    }

    const { error } = await supabase
      .from('organizations')
      .insert({
        name: name.trim(),
        description: description.trim() || null,
      });

    if (error) {
      console.log(error);
      Alert.alert(
        'Error',
        'Failed to add organization.'
      );
      return;
    }

    setName('');
    setDescription('');

    loadOrganizations();

    Alert.alert(
      'Success',
      'Organization added successfully.'
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Organizations
      </Text>

      <Text style={styles.subtitle}>
        Add and manage schools and organizations.
      </Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Organization name"
          value={name}
          onChangeText={setName}
        />

        <TextInput
          style={[styles.input, styles.descriptionInput]}
          placeholder="Description"
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <TouchableOpacity
          style={styles.addButton}
          onPress={addOrganization}
        >
          <Text style={styles.addButtonText}>
            Add Organization
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={organizations}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.organizationCard}>
            <View style={styles.organizationInfo}>
              <Text style={styles.organizationName}>
                {item.name}
              </Text>

              {item.description && (
                <Text style={styles.description}>
                  {item.description}
                </Text>
              )}
            </View>

            <Text
              style={[
                styles.status,
                {
                  color: item.is_available
                    ? '#2e8b57'
                    : '#999',
                },
              ]}
            >
              {item.is_available
                ? 'Available'
                : 'Unavailable'}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No organizations found.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf9f8',
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1e2a4a',
    marginTop: 20,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#777',
    marginBottom: 20,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  descriptionInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  addButton: {
    backgroundColor: '#d96b8a',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  organizationCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  organizationInfo: {
    flex: 1,
  },
  organizationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  description: {
    fontSize: 13,
    color: '#777',
  },
  status: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 30,
  },
});
