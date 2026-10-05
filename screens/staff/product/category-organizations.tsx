import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
} from 'react-native';

import { useEffect, useState } from 'react';

import { supabase } from '../../../supabase';

type Category = {
  id: string;
  name: string;
};

type Organization = {
  id: string;
  name: string;
};

type Connection = {
  id: string;
  category_id: string;
  organization_id: string;
  category_name: string;
  organization_name: string;
};

export default function CategoryOrganizationsScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedOrganization, setSelectedOrganization] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: categoryData } = await supabase
      .from('garment_categories')
      .select('id, name')
      .eq('is_available', true)
      .order('name');

    const { data: organizationData } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('is_available', true)
      .order('name');

    setCategories(categoryData || []);
    setOrganizations(organizationData || []);

    loadConnections();
  };

  const loadConnections = async () => {
    const { data, error } = await supabase
      .from('category_organizations')
      .select(`
        id,
        category_id,
        organization_id,
        garment_categories (
          name
        ),
        organizations (
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.log(error);
      return;
    }

    const formatted = (data || []).map((item: any) => ({
      id: item.id,
      category_id: item.category_id,
      organization_id: item.organization_id,
      category_name: item.garment_categories?.name || '',
      organization_name: item.organizations?.name || '',
    }));

    setConnections(formatted);
  };

  const addConnection = async () => {
    if (!selectedCategory || !selectedOrganization) {
      Alert.alert(
        'Required',
        'Please select a category and organization.'
      );
      return;
    }

    const { error } = await supabase
      .from('category_organizations')
      .insert({
        category_id: selectedCategory,
        organization_id: selectedOrganization,
      });

    if (error) {
      if (error.code === '23505') {
        Alert.alert(
          'Already Exists',
          'This organization is already connected to this category.'
        );
      } else {
        Alert.alert(
          'Error',
          error.message
        );
      }

      return;
    }

    setSelectedCategory(null);
    setSelectedOrganization(null);

    loadConnections();

    Alert.alert(
      'Success',
      'Category and organization connected.'
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Category Organizations
      </Text>

      <Text style={styles.subtitle}>
        Connect garment categories with organizations.
      </Text>

      <View style={styles.form}>
        <Text style={styles.label}>
          Select Category
        </Text>

        <View style={styles.options}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.option,
                selectedCategory === category.id &&
                  styles.selectedOption,
              ]}
              onPress={() =>
                setSelectedCategory(category.id)
              }
            >
              <Text
                style={[
                  styles.optionText,
                  selectedCategory === category.id &&
                    styles.selectedOptionText,
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>
          Select Organization
        </Text>

        <View style={styles.options}>
          {organizations.map((organization) => (
            <TouchableOpacity
              key={organization.id}
              style={[
                styles.option,
                selectedOrganization === organization.id &&
                  styles.selectedOption,
              ]}
              onPress={() =>
                setSelectedOrganization(organization.id)
              }
            >
              <Text
                style={[
                  styles.optionText,
                  selectedOrganization === organization.id &&
                    styles.selectedOptionText,
                ]}
              >
                {organization.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={addConnection}
        >
          <Text style={styles.addButtonText}>
            Connect
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>
        Connected Categories
      </Text>

      <FlatList
        data={connections}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.connectionCard}>
            <Text style={styles.categoryName}>
              {item.category_name}
            </Text>

            <Text style={styles.arrow}>
              →
            </Text>

            <Text style={styles.organizationName}>
              {item.organization_name}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No connections found.
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
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  options: {
    marginBottom: 20,
  },
  option: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  selectedOption: {
    backgroundColor: '#d96b8a',
    borderColor: '#d96b8a',
  },
  optionText: {
    fontSize: 14,
    color: '#333',
  },
  selectedOptionText: {
    color: '#fff',
    fontWeight: 'bold',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e2a4a',
    marginBottom: 12,
  },
  connectionCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryName: {
    flex: 1,
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  arrow: {
    fontSize: 20,
    color: '#999',
    marginHorizontal: 10,
  },
  organizationName: {
    flex: 1,
    fontSize: 15,
    fontWeight: 'bold',
    color: '#d96b8a',
    textAlign: 'right',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
  },
});
