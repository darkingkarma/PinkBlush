//no more use of this

import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  useFocusEffect,
} from '@react-navigation/native';

import {
  supabase,
} from '../../../supabase';

type Garment = {
  id: string;
  name: string;
};

type GarmentPart = {
  id: string;
  garment_id: string;
  name: string;
  gender: string;
};

type Fabric = {
  id: string;
  name: string;
  price_addition: number;
  available: boolean;
};

type GarmentFabric = {
  id: string;
  garment_part_id: string;
  fabric_id: string;
};

export default function ManageGarmentFabricsScreen({
  navigation,
}: any) {
  const [
    garments,
    setGarments,
  ] = useState<Garment[]>([]);

  const [
    parts,
    setParts,
  ] = useState<GarmentPart[]>([]);

  const [
    fabrics,
    setFabrics,
  ] = useState<Fabric[]>([]);

  const [
    assignments,
    setAssignments,
  ] = useState<GarmentFabric[]>([]);

  const [
    selectedGarment,
    setSelectedGarment,
  ] = useState<string | null>(null);

  const [
    selectedPart,
    setSelectedPart,
  ] = useState<string | null>(null);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);

      const [
        garmentsResult,
        partsResult,
        fabricsResult,
        assignmentsResult,
      ] = await Promise.all([
        supabase
          .from('garments')
          .select('id, name')
          .order('name'),

        supabase
          .from('garment_parts')
          .select(
            'id, garment_id, name, gender'
          )
          .order('name'),

        supabase
          .from('fabrics')
          .select(
            'id, name, price_addition, available'
          )
          .order('name'),

        supabase
          .from('garment_fabrics')
          .select(
            'id, garment_part_id, fabric_id'
          ),
      ]);

      if (garmentsResult.error) {
        throw garmentsResult.error;
      }

      if (partsResult.error) {
        throw partsResult.error;
      }

      if (fabricsResult.error) {
        throw fabricsResult.error;
      }

      if (assignmentsResult.error) {
        throw assignmentsResult.error;
      }

      setGarments(
        garmentsResult.data || []
      );

      setParts(
        partsResult.data || []
      );

      setFabrics(
        fabricsResult.data || []
      );

      setAssignments(
        assignmentsResult.data || []
      );

      if (
        !selectedGarment &&
        garmentsResult.data &&
        garmentsResult.data.length > 0
      ) {
        setSelectedGarment(
          garmentsResult.data[0].id
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message ||
          'Failed to load data.'
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    if (!selectedGarment) {
      setSelectedPart(null);
      return;
    }

    const garmentParts =
      parts.filter(
        part =>
          part.garment_id ===
          selectedGarment
      );

    if (
      garmentParts.length > 0
    ) {
      setSelectedPart(
        currentPart => {
          const stillExists =
            garmentParts.some(
              part =>
                part.id ===
                currentPart
            );

          return stillExists
            ? currentPart
            : garmentParts[0].id;
        }
      );
    } else {
      setSelectedPart(null);
    }
  }, [
    selectedGarment,
    parts,
  ]);

  const selectedParts =
    parts.filter(
      part =>
        part.garment_id ===
        selectedGarment
    );

  const toggleFabric = async (
    fabricId: string
  ) => {
    if (!selectedPart) {
      return;
    }

    const existingAssignment =
      assignments.find(
        assignment =>
          assignment.garment_part_id ===
            selectedPart &&
          assignment.fabric_id ===
            fabricId
      );

    try {
      if (existingAssignment) {
        const { error } =
          await supabase
            .from('garment_fabrics')
            .delete()
            .eq(
              'id',
              existingAssignment.id
            );

        if (error) {
          throw error;
        }

        setAssignments(
          current =>
            current.filter(
              assignment =>
                assignment.id !==
                existingAssignment.id
            )
        );
      } else {
        const { data, error } =
          await supabase
            .from('garment_fabrics')
            .insert({
              garment_part_id:
                selectedPart,
              fabric_id:
                fabricId,
            })
            .select()
            .single();

        if (error) {
          throw error;
        }

        if (data) {
          setAssignments(
            current => [
              ...current,
              data,
            ]
          );
        }
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message ||
          'Failed to update fabric assignment.'
      );
    }
  };

  const isAssigned = (
    fabricId: string
  ) => {
    if (!selectedPart) {
      return false;
    }

    return assignments.some(
      assignment =>
        assignment.garment_part_id ===
          selectedPart &&
        assignment.fabric_id ===
          fabricId
    );
  };

  const selectedGarmentName =
    garments.find(
      garment =>
        garment.id ===
        selectedGarment
    )?.name || '';

  const selectedPartName =
    selectedParts.find(
      part =>
        part.id ===
        selectedPart
    );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Manage Garment Fabrics
      </Text>

      <Text style={styles.label}>
        Select Garment
      </Text>

      <FlatList
        horizontal
        data={garments}
        keyExtractor={
          item => item.id
        }
        showsHorizontalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.horizontalList
        }
        renderItem={({
          item,
        }) => (
          <TouchableOpacity
            style={[
              styles.selectionButton,
              selectedGarment ===
                item.id &&
                styles.selectedButton,
            ]}
            onPress={() => {
              setSelectedGarment(
                item.id
              );
            }}
          >
            <Text
              style={[
                styles.selectionText,
                selectedGarment ===
                  item.id &&
                  styles.selectedText,
              ]}
            >
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
      />

      <Text style={styles.label}>
        Select Part
      </Text>

      <FlatList
        horizontal
        data={selectedParts}
        keyExtractor={
          item => item.id
        }
        showsHorizontalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.horizontalList
        }
        renderItem={({
          item,
        }) => (
          <TouchableOpacity
            style={[
              styles.selectionButton,
              selectedPart ===
                item.id &&
                styles.selectedButton,
            ]}
            onPress={() => {
              setSelectedPart(
                item.id
              );
            }}
          >
            <Text
              style={[
                styles.selectionText,
                selectedPart ===
                  item.id &&
                  styles.selectedText,
              ]}
            >
              {item.name} - {item.gender}
            </Text>
          </TouchableOpacity>
        )}
      />

      {selectedPartName && (
        <View style={styles.selectedInfo}>
          <Text style={styles.selectedInfoTitle}>
            {selectedGarmentName}
          </Text>

          <Text style={styles.selectedInfoText}>
            {selectedPartName.name} -{' '}
            {selectedPartName.gender}
          </Text>
        </View>
      )}

      <Text style={styles.label}>
        Available Fabrics
      </Text>

      <FlatList
        data={fabrics}
        keyExtractor={
          item => item.id
        }
        refreshing={loading}
        onRefresh={loadData}
        contentContainerStyle={
          styles.fabricList
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No fabrics available.
          </Text>
        }
        renderItem={({
          item,
        }) => {
          const assigned =
            isAssigned(item.id);

          return (
            <TouchableOpacity
              style={[
                styles.fabricItem,
                assigned &&
                  styles.assignedFabric,
              ]}
              onPress={() =>
                toggleFabric(item.id)
              }
              disabled={
                !item.available
              }
            >
              <View style={styles.fabricInfo}>
                <Text style={styles.fabricName}>
                  {item.name}
                </Text>

                <Text style={styles.fabricPrice}>
                  Price Addition: ₱
                  {Number(
                    item.price_addition
                  ).toFixed(2)}
                </Text>

                <Text style={styles.fabricStatus}>
                  {item.available
                    ? 'Available'
                    : 'Unavailable'}
                </Text>
              </View>

              <Text
                style={[
                  styles.assignText,
                  assigned &&
                    styles.removeText,
                ]}
              >
                {assigned
                  ? 'Assigned'
                  : 'Assign'}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginTop: 10,
    marginBottom: 8,
  },

  horizontalList: {
    gap: 10,
    paddingBottom: 5,
  },

  selectionButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  selectedButton: {
    borderColor: '#d96b8a',
    backgroundColor: '#fff5f8',
  },

  selectionText: {
    color: '#555',
    fontWeight: '600',
  },

  selectedText: {
    color: '#d96b8a',
  },

  selectedInfo: {
    marginTop: 15,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff5f8',
  },

  selectedInfoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },

  selectedInfoText: {
    marginTop: 3,
    color: '#666',
  },

  fabricList: {
    paddingBottom: 30,
  },

  fabricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },

  assignedFabric: {
    borderColor: '#d96b8a',
    backgroundColor: '#fff5f8',
  },

  fabricInfo: {
    flex: 1,
  },

  fabricName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },

  fabricPrice: {
    marginTop: 4,
    fontSize: 13,
    color: '#666',
  },

  fabricStatus: {
    marginTop: 3,
    fontSize: 12,
    color: '#777',
  },

  assignText: {
    color: '#d96b8a',
    fontWeight: '700',
    marginLeft: 10,
  },

  removeText: {
    color: '#999',
  },

  emptyText: {
    textAlign: 'center',
    color: '#777',
    marginTop: 30,
  },
});
