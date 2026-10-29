
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigator';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderType'>;

export default function OrderTypeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        <Text style={styles.title}>Create an Order</Text>
        <Text style={styles.subtitle}>
          How would you like to create your garment?
        </Text>

        <TouchableOpacity
          style={styles.option}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('CustomOrder')}
        >
          <View style={styles.iconBox}>
            <Ionicons name="color-wand-outline" size={36} color="#d96b8a" />
          </View>

          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Custom</Text>
            <Text style={styles.description}>
              Create a garment based on your own design and preferences.
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={24} color="#d96b8a" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.option}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('CustomerCategories')}
        >
          <View style={styles.iconBox}>
            <Ionicons name="shirt-outline" size={36} color="#d96b8a" />
          </View>

          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Pink Blush Offered</Text>
            <Text style={styles.description}>
              Browse our available garment collections and choose what you like.
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={24} color="#d96b8a" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff8fa',
  },
  content: {
    padding: 22,
    paddingTop: 18,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  backText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  title: {
    fontSize: 29,
    fontWeight: '800',
    color: '#333',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 28,
    fontSize: 15,
    lineHeight: 22,
    color: '#777',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f1d3de',
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
    minHeight: 125,
  },
  iconBox: {
    width: 62,
    height: 62,
    borderRadius: 16,
    backgroundColor: '#fce8ef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    flex: 1,
    marginHorizontal: 13,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
    marginBottom: 7,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    color: '#777',
  },
});
