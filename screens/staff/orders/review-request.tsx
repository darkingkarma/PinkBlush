import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../../../navigator';
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
  const { width } = useWindowDimensions();

  const isLargeScreen = width >= 700;
  const imageHeight = Math.min(
    Math.max(width * 0.42, 190),
    320
  );

  const [customer, setCustomer] =
    useState<CustomerProfile | null>(null);

  const [reviewStatus, setReviewStatus] =
    useState(order.status);

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
  const [reviewUpdating, setReviewUpdating] = useState(false);

  const editableStatuses = [
    'under_review',
    'quotation_sent',
  ];

  const canManageQuotation =
    editableStatuses.includes(reviewStatus);

  const isBusy =
    saving || declining || reviewUpdating;

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

  const todayDate = toDatabaseDate(new Date());

  // Use the standard React Native DateTimePicker onChange callback.
  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (event?.type === 'set' && selectedDate) {
      setEstimatedCompletionDate(selectedDate);
    }

    // Android uses a native dialog that closes after selection
    // or dismissal. iOS keeps the picker visible until Done is pressed.
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
  };

  // Automatically mark newly opened requests as under review.
  useEffect(() => {
    let mounted = true;

    const markAsUnderReview = async () => {
      if (order.status !== 'submitted') return;

      setReviewUpdating(true);

      try {
        const { data, error } = await supabase
          .from('custom_orders')
          .update({
            status: 'under_review',
          })
          .eq('id', order.id)
          .eq('status', 'submitted')
          .select('id');

        if (error) throw error;

        if (!mounted) return;

        if (data && data.length > 0) {
          setReviewStatus('under_review');
        } else {
          // The request may have been updated elsewhere.
          const { data: latestOrder, error: latestError } =
            await supabase
              .from('custom_orders')
              .select('status')
              .eq('id', order.id)
              .maybeSingle();

          if (latestError) throw latestError;

          if (mounted && latestOrder?.status) {
            setReviewStatus(latestOrder.status);
          }
        }
      } catch (error: any) {
        console.warn(
          'Could not update request status:',
          error?.message
        );

        if (mounted) {
          Alert.alert(
            'Status Not Updated',
            'The request could not automatically be marked as under review. Please refresh Manage Orders and try again.'
          );
        }
      } finally {
        if (mounted) {
          setReviewUpdating(false);
        }
      }
    };

    void markAsUnderReview();

    return () => {
      mounted = false;
    };
  }, [order.id, order.status]);

  // Load customer details and reference image.
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

  const neededByDate = order.needed_by_date
    ? new Date(`${order.needed_by_date}T12:00:00`)
    : null;

  const dateIsLate =
    !!estimatedCompletionDate &&
    !!order.needed_by_date &&
    toDatabaseDate(estimatedCompletionDate) >
      order.needed_by_date;

  const sendQuotation = async () => {
    if (!canManageQuotation || isBusy) return;

    if (!estimatedCompletionDate) {
      Alert.alert(
        'Completion Date Required',
        'Please select an estimated completion date before sending the quotation.'
      );
      return;
    }

    // Validate that the estimated completion date is not in the past.
    if (toDatabaseDate(estimatedCompletionDate) < todayDate) {
      Alert.alert(
        'Invalid Completion Date',
        'The estimated completion date cannot be earlier than today.'
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
      deposit <= 0
    ) {
      Alert.alert(
        'Invalid Amount',
        'Enter a valid total price and a deposit greater than ₱0.'
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
          'The request status may have changed. Return to Manage Orders and refresh.'
        );
        return;
      }

      setReviewStatus('quotation_sent');

      Alert.alert(
        'Quotation Sent',
        'The quotation and estimated completion date have been saved. The customer can now review it in My Orders.',
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
    if (!canManageQuotation || isBusy) return;

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
    if (!canManageQuotation || isBusy) return;

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
          'The request status may have changed. Return to Manage Orders and refresh.'
        );
        return;
      }

      setReviewStatus('declined');

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
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: isLargeScreen ? 24 : 16,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.contentInner,
              {
                maxWidth: isLargeScreen ? 850 : 620,
              },
            ]}
          >
            {/* Request heading */}
            <View style={styles.introCard}>
              <Text style={styles.heading}>
                Custom Order Request
              </Text>

              <Text style={styles.subtitle}>
                Review the customer's requirements before preparing a quotation.
              </Text>

              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {formatStatus(reviewStatus)}
                </Text>
              </View>

              {reviewUpdating && (
                <View style={styles.reviewUpdating}>
                  <ActivityIndicator
                    size="small"
                    color="#d96b8a"
                  />
                  <Text style={styles.mutedText}>
                    Updating request status...
                  </Text>
                </View>
              )}
            </View>

            {/* Customer information */}
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
                ).toLocaleDateString('en-PH')}
              />
            </View>

            {/* Garment requirements */}
            <Text style={styles.sectionTitle}>
              Garment Requirements
            </Text>

            <View style={styles.card}>
              <Text style={styles.fieldLabel}>
                Garment Description
              </Text>
              <Text style={styles.description}>
                {order.garment_description ||
                  'No description provided.'}
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
                Customer's Needed-by Date
              </Text>
              <Text style={styles.description}>
                {neededByDate
                  ? formatDate(neededByDate)
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

            {/* Reference image */}
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
                  style={[
                    styles.referenceImage,
                    { height: imageHeight },
                  ]}
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

            {/* Quotation */}
            <Text style={styles.sectionTitle}>
              Quotation Details
            </Text>

            <View style={styles.card}>
              {order.quoted_price != null && (
                <View style={styles.existingQuote}>
                  <Text style={styles.existingQuoteLabel}>
                    Previous Quotation
                  </Text>

                  <Text style={styles.existingQuoteAmount}>
                    {formatMoney(Number(order.quoted_price))}
                  </Text>

                  {order.deposit_amount != null && (
                    <Text style={styles.mutedText}>
                      Required deposit:{' '}
                      {formatMoney(Number(order.deposit_amount))}
                    </Text>
                  )}

                  {order.estimated_completion_date && (
                    <Text style={styles.mutedText}>
                      Estimated completion:{' '}
                      {formatDate(
                        new Date(
                          `${order.estimated_completion_date}T12:00:00`
                        )
                      )}
                    </Text>
                  )}
                </View>
              )}

              {canManageQuotation ? (
                <>
                  <Text style={styles.fieldLabel}>
                    Estimated Completion Date *
                  </Text>

                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker(true)}
                    disabled={isBusy}
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

                    <Ionicons
                      name="chevron-down"
                      size={18}
                      color="#98727f"
                    />
                  </TouchableOpacity>

                  {showDatePicker && (
                    <View style={styles.datePickerContainer}>
                      <DateTimePicker
                        value={
                          estimatedCompletionDate ?? new Date()
                        }
                        mode="date"
                        minimumDate={new Date()}
                        display={
                          Platform.OS === 'ios'
                            ? 'spinner'
                            : 'default'
                        }
                        onChange={handleDateChange}
                      />

                      {Platform.OS === 'ios' && (
                        <TouchableOpacity
                          style={styles.doneDateButton}
                          onPress={() =>
                            setShowDatePicker(false)
                          }
                        >
                          <Text style={styles.doneDateText}>
                            Done
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  <Text style={styles.dateHelper}>
                    This is the date staff expects the garment to be finished. It may differ from the customer's needed-by date.
                  </Text>

                  {dateIsLate && (
                    <View style={styles.warningBox}>
                      <Ionicons
                        name="warning-outline"
                        size={18}
                        color="#a66b20"
                      />
                      <Text style={styles.warningText}>
                        Your estimated completion date is later than the customer's needed-by date. Please confirm that the customer can accept this schedule.
                      </Text>
                    </View>
                  )}

                  <Text style={styles.fieldLabel}>
                    Total Price (₱) *
                  </Text>

                  <TextInput
                    style={styles.input}
                    value={quotedPrice}
                    onChangeText={setQuotedPrice}
                    placeholder="e.g. 1500"
                    placeholderTextColor="#999"
                    keyboardType="decimal-pad"
                    editable={!isBusy}
                    maxLength={12}
                  />

                  <Text style={styles.fieldLabel}>
                    Required Online Deposit (₱) *
                  </Text>

                  <TextInput
                    style={styles.input}
                    value={depositAmount}
                    onChangeText={setDepositAmount}
                    placeholder="e.g. 500"
                    placeholderTextColor="#999"
                    keyboardType="decimal-pad"
                    editable={!isBusy}
                    maxLength={12}
                  />

                  {quotedPrice.trim() !== '' &&
                    depositAmount.trim() !== '' &&
                    Number.isFinite(Number(quotedPrice)) &&
                    Number.isFinite(Number(depositAmount)) &&
                    Number(quotedPrice) >=
                      Number(depositAmount) &&
                    Number(quotedPrice) > 0 &&
                    Number(depositAmount) > 0 && (
                      <View style={styles.balanceBox}>
                        <Text style={styles.balanceLabel}>
                          Remaining Balance (Cash at Pickup)
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
                    ]}
                    value={quotationNote}
                    onChangeText={setQuotationNote}
                    placeholder="Add pricing details, included alterations, or payment reminders..."
                    placeholderTextColor="#999"
                    multiline
                    textAlignVertical="top"
                    editable={!isBusy}
                    maxLength={1500}
                  />

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
                          {reviewStatus === 'quotation_sent'
                            ? 'Update and Resend Quotation'
                            : 'Save and Send Quotation'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <Text style={styles.helperText}>
                    Sending a quotation does not process a payment. The customer must accept the quotation before paying the online deposit.
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
              ) : (
                <View style={styles.lockedNotice}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={19}
                    color="#8a6470"
                  />

                  <View style={styles.lockedContent}>
                    <Text style={styles.lockedTitle}>
                      Quotation Editing Unavailable
                    </Text>

                    <Text style={styles.lockedText}>
                      {reviewStatus === 'accepted'
                        ? 'The customer has accepted the quotation. This request can now proceed to deposit and production.'
                        : reviewStatus === 'declined'
                        ? 'This request has been declined.'
                        : reviewStatus === 'completed'
                        ? 'This order has already been completed.'
                        : reviewStatus === 'cancelled'
                        ? 'This request has been cancelled.'
                        : 'This order has progressed beyond the quotation stage. Quotation editing and request declining are no longer available here.'}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  keyboardContainer: {
    flex: 1,
  },
  content: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 40,
  },
  contentInner: {
    width: '100%',
    alignSelf: 'center',
  },
  introCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0e6e9',
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
  reviewUpdating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
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
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: '#fff7e9',
    borderWidth: 1,
    borderColor: '#f1dfbd',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#8b6229',
  },
  balanceBox: {
    backgroundColor: '#fff8fa',
    borderRadius: 9,
    padding: 12,
    marginTop: 12,
    gap: 5,
  },
  balanceLabel: {
    fontSize: 12,
    color: '#76515e',
  },
  balanceAmount: {
    fontSize: 17,
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
    textAlign: 'center',
    flexShrink: 1,
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
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: '#f7f0f2',
    borderRadius: 10,
    padding: 14,
    marginTop: 10,
  },
  lockedContent: {
    flex: 1,
  },
  lockedTitle: {
    color: '#76515e',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  lockedText: {
    color: '#76515e',
    fontSize: 12,
    lineHeight: 18,
  },
});