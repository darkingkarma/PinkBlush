import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  Platform,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../../navigator';
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
    order.quoted_price != null
      ? String(order.quoted_price)
      : ''
  );

  const [depositAmount, setDepositAmount] = useState(
    order.deposit_amount != null
      ? String(order.deposit_amount)
      : ''
  );

  const [quotationNote, setQuotationNote] = useState(
    order.quotation_note ?? ''
  );

  const [estimatedCompletionDate, setEstimatedCompletionDate] =
    useState<Date | null>(
      order.estimated_completion_date
        ? new Date(
            `${order.estimated_completion_date}T12:00:00`
          )
        : null
    );

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [declining, setDeclining] = useState(false);

  const isLocked = [
    'accepted',
    'declined',
    'completed',
  ].includes(order.status);

  const isBusy = saving || declining;

  const editableStatuses = [
    'submitted',
    'under_review',
    'quoted',
    'quotation_sent',
  ];

  const formatStatus = (status: string) =>
    status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

  const formatMoney = (amount: number) =>
    `₱${amount.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const toDatabaseDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  // DateTimePicker v9.1.0 API
    const handleDateValueChange = (
        event: any,
        selectedDate?: Date
    ) => {
        if (selectedDate) {
            setEstimatedCompletionDate(selectedDate);
        }

        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
    };

  const handleDateDismiss = () => {
    setShowDatePicker(false);
  };

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
          setImageError(
            'The reference image could not be loaded.'
          );
          return;
        }

        setImageUrl(data.signedUrl);
      } catch {
        if (mounted) {
          setImageError(
            'The reference image could not be loaded.'
          );
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
    if (isLocked || isBusy) return;

    if (!estimatedCompletionDate) {
      Alert.alert(
        'Completion Date Required',
        'Please select an estimated completion date before sending the quotation.'
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
          estimated_completion_date:
            toDatabaseDate(estimatedCompletionDate),
          status: 'quotation_sent',
        })
        .eq('id', order.id)
        .in('status', editableStatuses)
        .select('id');

      if (error) throw error;

      if (!data || data.length === 0) {
        Alert.alert(
          'Quotation Not Saved',
          'The order status may have changed. Return to Manage Orders and refresh.'
        );
        return;
      }

      Alert.alert(
        'Quotation Sent',
        'The quotation and estimated completion date have been saved. The customer can review the quotation in My Orders.',
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
        error?.message ??
          'Please check your database permissions.'
      );
    } finally {
      setSaving(false);
    }
  };

  const declineRequest = async () => {
    if (isLocked || isBusy) return;

    const reason = declineReason.trim();

    if (!reason) {
      Alert.alert(
        'Reason Required',
        'Please explain why this custom order request is being declined.'
      );
      return;
    }

    Alert.alert(
      'Decline Custom Order?',
      'Are you sure you want to decline this request? The customer will be able to see the reason.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Decline Request',
          style: 'destructive',
          onPress: () => {
            void confirmDecline(reason);
          },
        },
      ]
    );
  };

  const confirmDecline = async (reason: string) => {
    if (isLocked || isBusy) return;

    setDeclining(true);

    try {
      const { data, error } = await supabase
        .from('custom_orders')
        .update({
          status: 'declined',
          decline_reason: reason,
        })
        .eq('id', order.id)
        .in('status', editableStatuses)
        .select('id');

      if (error) throw error;

      if (!data || data.length === 0) {
        Alert.alert(
          'Request Not Declined',
          'The order status may have changed. Return to Manage Orders and refresh.'
        );
        return;
      }

      Alert.alert(
        'Request Declined',
        'The request has been declined and the reason has been saved.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Could Not Decline Request',
        error?.message ??
          'Please check your database permissions.'
      );
    } finally {
      setDeclining(false);
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
            value={new Date(
              order.created_at
            ).toLocaleDateString()}
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
            {order.preferred_color ||
              'No preferred color specified.'}
          </Text>

          <Text style={styles.fieldLabel}>
            Fabric Preference
          </Text>
          <Text style={styles.description}>
            {order.fabric_preference ||
              'No fabric preference specified.'}
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
              <ActivityIndicator
                color="#d96b8a"
                size="large"
              />
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
                setImageError(
                  'The image could not be displayed.'
                );
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
                {imageError ||
                  'No reference image available.'}
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
                  Deposit:{' '}
                  {formatMoney(Number(order.deposit_amount))}
                </Text>
              )}

              {order.estimated_completion_date && (
                <Text style={styles.mutedText}>
                  Estimated completion:{' '}
                  {new Date(
                    `${order.estimated_completion_date}T12:00:00`
                  ).toLocaleDateString()}
                </Text>
              )}
            </View>
          )}

          <Text style={styles.fieldLabel}>
            Estimated Completion Date *
          </Text>

          <TouchableOpacity
            style={[
              styles.dateButton,
              isLocked && styles.readOnlyInput,
            ]}
            onPress={() => setShowDatePicker(true)}
            disabled={isLocked || isBusy}
            activeOpacity={0.7}
          >
            <Ionicons
              name="calendar-outline"
              size={20}
              color="#d96b8a"
            />

            <Text
              style={[
                styles.dateButtonText,
                !estimatedCompletionDate &&
                  styles.placeholderText,
              ]}
            >
              {estimatedCompletionDate
                ? formatDate(estimatedCompletionDate)
                : 'Select estimated completion date'}
            </Text>

            {!isLocked && (
              <Ionicons
                name="chevron-down"
                size={18}
                color="#98727f"
              />
            )}
          </TouchableOpacity>

          {showDatePicker && (
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={estimatedCompletionDate ?? new Date()}
                mode="date"
                minimumDate={new Date()}
                display="default"
                onValueChange={handleDateValueChange}
                onDismiss={handleDateDismiss}
              />

              <TouchableOpacity
                style={styles.doneDateButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.doneDateText}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.dateHelper}>
            This is the date the staff expects the garment to be finished. It may differ from the customer's needed-by date.
          </Text>

          <Text style={styles.fieldLabel}>
            Total Price (₱) *
          </Text>

          <TextInput
            style={[
              styles.input,
              isLocked && styles.readOnlyInput,
            ]}
            value={quotedPrice}
            onChangeText={setQuotedPrice}
            placeholder="e.g. 1500"
            placeholderTextColor="#999"
            keyboardType="decimal-pad"
            editable={!isLocked && !isBusy}
          />

          <Text style={styles.fieldLabel}>
            Required Deposit (₱) *
          </Text>

          <TextInput
            style={[
              styles.input,
              isLocked && styles.readOnlyInput,
            ]}
            value={depositAmount}
            onChangeText={setDepositAmount}
            placeholder="e.g. 500"
            placeholderTextColor="#999"
            keyboardType="decimal-pad"
            editable={!isLocked && !isBusy}
          />

          {quotedPrice.trim() !== '' &&
            depositAmount.trim() !== '' &&
            Number.isFinite(Number(quotedPrice)) &&
            Number.isFinite(Number(depositAmount)) &&
            Number(quotedPrice) >= Number(depositAmount) &&
            Number(quotedPrice) > 0 &&
            Number(depositAmount) >= 0 && (
              <View style={styles.balanceBox}>
                <Text style={styles.balanceLabel}>
                  Remaining Balance
                </Text>

                <Text style={styles.balanceAmount}>
                  {formatMoney(
                    Number(quotedPrice) -
                      Number(depositAmount)
                  )}
                </Text>
              </View>
            )}

          <Text style={styles.fieldLabel}>
            Quotation Note (Optional)
          </Text>

          <TextInput
            style={[
              styles.input,
              styles.noteInput,
              isLocked && styles.readOnlyInput,
            ]}
            value={quotationNote}
            onChangeText={setQuotationNote}
            placeholder="Add pricing details, included alterations, or payment reminders..."
            placeholderTextColor="#999"
            multiline
            textAlignVertical="top"
            editable={!isLocked && !isBusy}
          />

          {isLocked ? (
            <View style={styles.lockedNotice}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color="#8a6470"
              />

              <Text style={styles.lockedText}>
                This order cannot be changed because it is already{' '}
                {formatStatus(order.status).toLowerCase()}.
              </Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  isBusy && styles.disabledButton,
                ]}
                onPress={sendQuotation}
                disabled={isBusy}
                activeOpacity={0.8}
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

              <View style={styles.declineDivider} />

              <Text style={styles.declineHeading}>
                Decline This Request
              </Text>

              <Text style={styles.declineDescription}>
                If the shop cannot accommodate this order, provide a reason. The customer will be able to see it in their order details.
              </Text>

              <Text style={styles.fieldLabel}>
                Reason for Declining *
              </Text>

              <TextInput
                style={[
                  styles.input,
                  styles.noteInput,
                  styles.declineInput,
                ]}
                value={declineReason}
                onChangeText={setDeclineReason}
                placeholder="Explain why this request cannot be accommodated..."
                placeholderTextColor="#999"
                multiline
                textAlignVertical="top"
                editable={!isBusy}
                maxLength={1000}
              />

              <TouchableOpacity
                style={[
                  styles.declineButton,
                  isBusy && styles.disabledButton,
                ]}
                onPress={declineRequest}
                disabled={isBusy}
                activeOpacity={0.8}
              >
                {declining ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name="close-circle-outline"
                      size={19}
                      color="#fff"
                    />
                    <Text style={styles.declineButtonText}>
                      Decline Request
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.helperText}>
                Declining the request is separate from the customer declining a quotation.
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
      <Ionicons
        name={icon}
        size={19}
        color="#d96b8a"
      />

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
  readOnlyInput: {
    backgroundColor: '#f7f3f4',
    opacity: 0.8,
  },
  noteInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dateButton: {
    minHeight: 49,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e6dce0',
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 14,
    color: '#443940',
  },
  placeholderText: {
    color: '#999',
  },
  datePickerContainer: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f0d5df',
  },
  doneDateButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  doneDateText: {
    color: '#b44e70',
    fontWeight: 'bold',
  },
  dateHelper: {
    fontSize: 11,
    color: '#888',
    lineHeight: 17,
    marginTop: 7,
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
  declineDivider: {
    height: 1,
    backgroundColor: '#f0e6e9',
    marginTop: 25,
    marginBottom: 20,
  },
  declineHeading: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#a33c49',
  },
  declineDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: '#888',
    marginTop: 6,
  },
  declineInput: {
    borderColor: '#e8cbd0',
    backgroundColor: '#fffdfd',
  },
  declineButton: {
    backgroundColor: '#b94c58',
    borderRadius: 11,
    padding: 15,
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
  },
  declineButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
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
