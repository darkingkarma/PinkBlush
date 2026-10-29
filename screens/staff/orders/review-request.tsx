
import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  RootStackParamList,
} from '../../navigator';
import { supabase } from '../../../supabase';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'ReviewRequest'
>;

type CustomerProfile = {
  full_name: string | null;
  username: string | null;
  email: string | null;
  contact_number: string | null;
};

export default function ReviewRequestScreen({
  route,
  navigation,
}: Props) {
  const { order } = route.params;

  const [customer, setCustomer] =
    useState<CustomerProfile | null>(null);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState('');

  const [quotedPrice, setQuotedPrice] = useState(
    order.quoted_price != null ? String(order.quoted_price) : ''
  );

  const [depositAmount, setDepositAmount] = useState(
    order.deposit_amount != null
      ? String(order.deposit_amount)
      : ''
  );

  const [quotationNote, setQuotationNote] = useState(
    order.quotation_note ?? ''
  );

  const [saving, setSaving] = useState(false);

  const isLocked = [
    'accepted',
    'declined',
    'completed',
  ].includes(order.status);

  const formatStatus = (status: string) =>
    status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

  const formatMoney = (amount: number) =>
    `₱${amount.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  useEffect(() => {
    let mounted = true;

    const loadDetails = async () => {
      const { data: profile, error: profileError } =
        await supabase
          .from('profiles')
          .select('full_name, username, email, contact_number')
          .eq('id', order.user_id)
          .maybeSingle();

      if (!mounted) return;

      if (profileError) {
        console.warn(
          'Could not load customer details:',
          profileError.message
        );
      } else {
        setCustomer(profile);
      }

      const path = order.reference_image_url?.trim();

      if (!path) {
        setImageError('No reference image was provided.');
        return;
      }

      if (/^https?:\/\//i.test(path)) {
        setImageUrl(path);
        return;
      }

      setImageLoading(true);

      try {
        const { data, error } = await supabase.storage
          .from('custom-order-images')
          .createSignedUrl(path.replace(/^\/+/, ''), 3600);

        if (!mounted) return;

        if (error || !data?.signedUrl) {
          setImageError('The reference image could not be loaded.');
          return;
        }

        setImageUrl(data.signedUrl);
      } catch {
        if (mounted) {
          setImageError('The reference image could not be loaded.');
        }
      } finally {
        if (mounted) setImageLoading(false);
      }
    };

    void loadDetails();

    return () => {
      mounted = false;
    };
  }, [order.user_id, order.reference_image_url]);

  const sendQuotation = async () => {
    if (isLocked) {
      Alert.alert(
        'Quotation Locked',
        'This order has already been accepted, declined, or completed.'
      );
      return;
    }

    const price = Number(quotedPrice);
    const deposit = Number(depositAmount);

    if (
      quotedPrice.trim() === '' ||
      depositAmount.trim() === '' ||
      !Number.isFinite(price) ||
      !Number.isFinite(deposit) ||
      price <= 0 ||
      deposit < 0
    ) {
      Alert.alert(
        'Invalid Amount',
        'Enter a valid total price and deposit amount.'
      );
      return;
    }

    if (deposit > price) {
      Alert.alert(
        'Invalid Deposit',
        'The deposit cannot be greater than the total price.'
      );
      return;
    }

    setSaving(true);

    try {
      const { data, error } = await supabase
        .from('custom_orders')
        .update({
          quoted_price: price,
          deposit_amount: deposit,
          quotation_note: quotationNote.trim() || null,
          status: 'quotation_sent',
        })
        .eq('id', order.id)
        .in('status', [
          'submitted',
          'under_review',
          'quoted',
          'quotation_sent',
        ])
        .select('id');

      if (error) throw error;

      if (!data || data.length === 0) {
        Alert.alert(
          'Quotation Not Saved',
          'The order status may have changed. Return to the order list and refresh.'
        );
        return;
      }

      Alert.alert(
        'Quotation Sent',
        'The quotation has been saved. The customer can view it in My Orders.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Could Not Send Quotation',
        error?.message ?? 'Please check your database permissions.'
      );
    } finally {
      setSaving(false);
    }
  };

  const customerName =
    customer?.full_name?.trim() ||
    customer?.username?.trim() ||
    'Name not provided';

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <Ionicons
              name="shirt-outline"
              size={28}
              color="#d96b8a"
            />
          </View>

          <Text style={styles.heading}>
            Custom Order Request
          </Text>

          <Text style={styles.subtitle}>
            Review the customer's requirements before preparing a quotation.
          </Text>

          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {formatStatus(order.status)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Customer Information
        </Text>

        <View style={styles.card}>
          <DetailRow
            icon="person-outline"
            label="Name"
            value={customerName}
          />
          <DetailRow
            icon="mail-outline"
            label="Email"
            value={customer?.email || 'Email not available'}
          />
          <DetailRow
            icon="call-outline"
            label="Contact Number"
            value={
              customer?.contact_number ||
              'Contact number not provided'
            }
          />
          <DetailRow
            icon="calendar-outline"
            label="Date Submitted"
            value={new Date(order.created_at).toLocaleDateString()}
          />
        </View>

        <Text style={styles.sectionTitle}>
          Garment Requirements
        </Text>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>
            Garment Description
          </Text>
          <Text style={styles.description}>
            {order.garment_description}
          </Text>

          <Text style={styles.fieldLabel}>
            Preferred Color
          </Text>
          <Text style={styles.description}>
            {order.preferred_color || 'No preferred color specified.'}
          </Text>

          <Text style={styles.fieldLabel}>
            Fabric Preference
          </Text>
          <Text style={styles.description}>
            {order.fabric_preference || 'No fabric preference specified.'}
          </Text>

          <Text style={styles.fieldLabel}>
            Needed-by Date
          </Text>
          <Text style={styles.description}>
            {order.needed_by_date
              ? new Date(
                  `${order.needed_by_date}T12:00:00`
                ).toLocaleDateString()
              : 'No preferred date specified.'}
          </Text>

          <Text style={styles.fieldLabel}>
            Special Instructions
          </Text>
          <Text style={styles.description}>
            {order.special_instructions ||
              'No special instructions provided.'}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          Reference Image
        </Text>

        <View style={styles.card}>
          {imageLoading ? (
            <View style={styles.imagePlaceholder}>
              <ActivityIndicator color="#d96b8a" size="large" />
              <Text style={styles.mutedText}>
                Loading reference image...
              </Text>
            </View>
          ) : imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.referenceImage}
              resizeMode="contain"
              onError={() => {
                setImageUrl(null);
                setImageError('The image could not be displayed.');
              }}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons
                name="image-outline"
                size={35}
                color="#c5a3ae"
              />
              <Text style={styles.mutedText}>
                {imageError || 'No reference image available.'}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>
          Quotation Details
        </Text>

        <View style={styles.card}>
          {order.quoted_price != null && (
            <View style={styles.existingQuote}>
              <Text style={styles.existingQuoteLabel}>
                Current Quotation
              </Text>
              <Text style={styles.existingQuoteAmount}>
                {formatMoney(Number(order.quoted_price))}
              </Text>
              {order.deposit_amount != null && (
                <Text style={styles.mutedText}>
                  Deposit: {formatMoney(Number(order.deposit_amount))}
                </Text>
              )}
            </View>
          )}

          <Text style={styles.fieldLabel}>
            Total Price (₱)
          </Text>
          <TextInput
            style={styles.input}
            value={quotedPrice}
            onChangeText={setQuotedPrice}
            placeholder="e.g. 1500"
            keyboardType="decimal-pad"
            editable={!isLocked && !saving}
          />

          <Text style={styles.fieldLabel}>
            Required Deposit (₱)
          </Text>
          <TextInput
            style={styles.input}
            value={depositAmount}
            onChangeText={setDepositAmount}
            placeholder="e.g. 500"
            keyboardType="decimal-pad"
            editable={!isLocked && !saving}
          />

          {quotedPrice.trim() !== '' &&
            depositAmount.trim() !== '' &&
            Number.isFinite(Number(quotedPrice)) &&
            Number.isFinite(Number(depositAmount)) &&
            Number(quotedPrice) >= Number(depositAmount) &&
            Number(quotedPrice) >= 0 &&
            Number(depositAmount) >= 0 && (
              <View style={styles.balanceBox}>
                <Text style={styles.balanceLabel}>
                  Remaining Balance
                </Text>
                <Text style={styles.balanceAmount}>
                  {formatMoney(
                    Number(quotedPrice) - Number(depositAmount)
                  )}
                </Text>
              </View>
            )}

          <Text style={styles.fieldLabel}>
            Quotation Note
          </Text>
          <TextInput
            style={[styles.input, styles.noteInput]}
            value={quotationNote}
            onChangeText={setQuotationNote}
            placeholder="Explain the price, materials, or estimated completion time."
            multiline
            textAlignVertical="top"
            editable={!isLocked && !saving}
          />

          {isLocked ? (
            <View style={styles.lockedNotice}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color="#8a6470"
              />
              <Text style={styles.lockedText}>
                This quotation cannot be changed because the order is already {formatStatus(order.status).toLowerCase()}.
              </Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  saving && styles.disabledButton,
                ]}
                onPress={sendQuotation}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name="send-outline"
                      size={18}
                      color="#fff"
                    />
                    <Text style={styles.sendButtonText}>
                      Save and Send Quotation
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.helperText}>
                Sending a quotation does not process a payment. The customer must respond to the quotation in My Orders.
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={19} color="#d96b8a" />
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf9f8',
  },
  content: {
    padding: 16,
    paddingBottom: 35,
  },
  introCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0e6e9',
  },
  introIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#fff0f4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heading: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#1e2a4a',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#777',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 7,
  },
  statusBadge: {
    backgroundColor: '#fff0f4',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: 13,
  },
  statusText: {
    color: '#b44e70',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e2a4a',
    marginTop: 22,
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0e6e9',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 15,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: '#98727f',
    marginBottom: 3,
  },
  detailValue: {
    fontSize: 14,
    color: '#443940',
    lineHeight: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 8,
  },
  description: {
    backgroundColor: '#fff8fa',
    borderWidth: 1,
    borderColor: '#f1e6ea',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    lineHeight: 21,
    color: '#55464c',
  },
  referenceImage: {
    width: '100%',
    height: 260,
    backgroundColor: '#fff8fa',
    borderRadius: 10,
  },
  imagePlaceholder: {
    minHeight: 140,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff8fa',
    borderRadius: 10,
  },
  mutedText: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 18,
  },
  existingQuote: {
    backgroundColor: '#f0faf3',
    borderRadius: 10,
    padding: 13,
    marginBottom: 5,
  },
  existingQuoteLabel: {
    fontSize: 12,
    color: '#50765d',
  },
  existingQuoteAmount: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#238052',
    marginTop: 4,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e6dce0',
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
  },
  noteInput: {
    minHeight: 100,
  },
  balanceBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff8fa',
    borderRadius: 9,
    padding: 12,
    marginTop: 12,
  },
  balanceLabel: {
    fontSize: 12,
    color: '#76515e',
  },
  balanceAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#b44e70',
  },
  sendButton: {
    backgroundColor: '#d96b8a',
    borderRadius: 11,
    padding: 15,
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
  },
  disabledButton: {
    opacity: 0.65,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  helperText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 12,
  },
  lockedNotice: {
    flexDirection: 'row',
    gap: 9,
    alignItems: 'center',
    backgroundColor: '#f7f0f2',
    borderRadius: 10,
    padding: 13,
    marginTop: 18,
  },
  lockedText: {
    flex: 1,
    color: '#76515e',
    fontSize: 12,
    lineHeight: 18,
  },
});
