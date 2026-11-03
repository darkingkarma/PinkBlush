import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

import { supabase } from '../../../supabase';

type OrderRecord = {
  id: string;
  status: string | null;
  total_amount: number | null;
  created_at: string;
};

type CustomOrderRecord = {
  id: string;
  status: string | null;
  quoted_price: number | null;
  deposit_amount: number | null;
  created_at: string;
};

type PaymentRecord = {
  id: string;
  order_id: string | null;
  custom_order_id: string | null;
  amount: number | null;
  payment_type: string | null;
  status: string | null;
  created_at: string;
};

type ProductionRecord = {
  id: string;
  order_id: string | null;
  custom_order_id: string | null;
  status: string | null;
  updated_at: string | null;
};

type ExportType = 'pdf' | 'csv' | null;

const PINK = '#D96B8A';
const DARK_PINK = '#B84470';
const BACKGROUND = '#FFF9FB';
const TEXT_DARK = '#392831';
const TEXT_MUTED = '#8D7780';
const DIVIDER = '#F0E3E8';

const normalizeStatus = (
  status: string | null | undefined
) =>
  (status ?? '')
    .toLowerCase()
    .trim()
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ');

const normalizeProgress = (
  status: string | null | undefined
) =>
  (status ?? '')
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_');

const formatMoney = (amount: number) =>
  `₱${Number(amount || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (date: string | null) => {
  if (!date) return 'Not specified';

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Not specified';
  }

  return parsedDate.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const formatLabel = (value: string) =>
  value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const csvEscape = (value: string | number) =>
  `"${String(value).replace(/"/g, '""')}"`;

export default function ReportsManagementScreen() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [customOrders, setCustomOrders] = useState<CustomOrderRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [production, setProduction] = useState<ProductionRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState<ExportType>(null);

  const loadReports = useCallback(async () => {
    try {
      const [
        ordersResult,
        customOrdersResult,
        paymentsResult,
        productionResult,
      ] = await Promise.all([
        supabase
          .from('orders')
          .select('id, status, total_amount, created_at')
          .order('created_at', { ascending: false }),

        supabase
          .from('custom_orders')
          .select(
            'id, status, quoted_price, deposit_amount, created_at'
          )
          .order('created_at', { ascending: false }),

        supabase
          .from('payments')
          .select(`
            id,
            order_id,
            custom_order_id,
            amount,
            payment_type,
            status,
            created_at
          `)
          .order('created_at', { ascending: false }),

        supabase
          .from('production_tracking')
          .select(`
            id,
            order_id,
            custom_order_id,
            status,
            updated_at
          `)
          .order('updated_at', { ascending: false }),
      ]);

      if (ordersResult.error) throw ordersResult.error;
      if (customOrdersResult.error) throw customOrdersResult.error;
      if (paymentsResult.error) throw paymentsResult.error;
      if (productionResult.error) throw productionResult.error;

      setOrders((ordersResult.data || []) as OrderRecord[]);
      setCustomOrders(
        (customOrdersResult.data || []) as CustomOrderRecord[]
      );
      setPayments((paymentsResult.data || []) as PaymentRecord[]);
      setProduction(
        (productionResult.data || []) as ProductionRecord[]
      );
    } catch (error) {
      console.error('Error loading reports:', error);
      Alert.alert('Error', 'Unable to load reports. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadReports();
  };

  // CATALOG ORDER COUNTS

  const catalogPending = orders.filter(
    (o) => normalizeStatus(o.status) === 'pending'
  ).length;

  const catalogAccepted = orders.filter(
    (o) => normalizeStatus(o.status) === 'accepted'
  ).length;

  const catalogInProduction = orders.filter(
    (o) => normalizeStatus(o.status) === 'in production'
  ).length;

  const catalogReady = orders.filter(
    (o) => normalizeStatus(o.status) === 'ready for release'
  ).length;

  const catalogCompleted = orders.filter(
    (o) => normalizeStatus(o.status) === 'completed'
  ).length;

  const catalogCancelled = orders.filter(
    (o) => normalizeStatus(o.status) === 'cancelled'
  ).length;

  // CUSTOM ORDER COUNTS

  const customSubmitted = customOrders.filter(
    (o) => normalizeStatus(o.status) === 'submitted'
  ).length;

  const customUnderReview = customOrders.filter(
    (o) => normalizeStatus(o.status) === 'under review'
  ).length;

  const customQuotationSent = customOrders.filter(
    (o) => normalizeStatus(o.status) === 'quotation sent'
  ).length;

  const customAccepted = customOrders.filter(
    (o) => normalizeStatus(o.status) === 'accepted'
  ).length;

  const customInProduction = customOrders.filter(
    (o) => normalizeStatus(o.status) === 'in production'
  ).length;

  const customReadyForFitting = customOrders.filter(
    (o) => normalizeStatus(o.status) === 'ready for fitting'
  ).length;

  const customReadyForRelease = customOrders.filter(
    (o) => normalizeStatus(o.status) === 'ready for release'
  ).length;

  const customCompleted = customOrders.filter(
    (o) => normalizeStatus(o.status) === 'completed'
  ).length;

  const customDeclined = customOrders.filter(
    (o) => normalizeStatus(o.status) === 'declined'
  ).length;

  const customCancelled = customOrders.filter(
    (o) => normalizeStatus(o.status) === 'cancelled'
  ).length;

  // PAYMENT SUMMARY

  const paidPayments = payments.filter(
    (p) => normalizeStatus(p.status) === 'paid'
  );

  const pendingPayments = payments.filter(
    (p) => normalizeStatus(p.status) === 'pending'
  );

  const depositPayments = paidPayments.filter(
    (p) => normalizeStatus(p.payment_type) === 'deposit'
  );

  const balancePayments = paidPayments.filter(
    (p) => normalizeStatus(p.payment_type) === 'balance'
  );

  const totalPaid = paidPayments.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  );

  const totalDeposits = depositPayments.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  );

  const totalBalancePayments = balancePayments.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  );

  // ORDER VALUE

  const catalogOrderValue = orders.reduce((sum, order) => {
    if (normalizeStatus(order.status) === 'cancelled') {
      return sum;
    }

    return sum + Number(order.total_amount || 0);
  }, 0);

  const customQuotedValue = customOrders.reduce((sum, order) => {
    const status = normalizeStatus(order.status);

    if (status === 'declined' || status === 'cancelled') {
      return sum;
    }

    return sum + Number(order.quoted_price || 0);
  }, 0);

  // OUTSTANDING BALANCE

  const catalogEligibleStatuses = [
    'accepted',
    'in production',
    'ready for release',
  ];

  const customEligibleStatuses = [
    'accepted',
    'in production',
    'ready for fitting',
    'ready for release',
  ];

  const catalogPaidByOrder = new Map<string, number>();
  const customPaidByOrder = new Map<string, number>();

  paidPayments.forEach((payment) => {
    const amount = Number(payment.amount || 0);

    if (payment.order_id) {
      catalogPaidByOrder.set(
        payment.order_id,
        (catalogPaidByOrder.get(payment.order_id) || 0) + amount
      );
    }

    if (payment.custom_order_id) {
      customPaidByOrder.set(
        payment.custom_order_id,
        (customPaidByOrder.get(payment.custom_order_id) || 0) + amount
      );
    }
  });

  const catalogOutstanding = orders.reduce((sum, order) => {
    const status = normalizeStatus(order.status);

    if (!catalogEligibleStatuses.includes(status)) {
      return sum;
    }

    const total = Number(order.total_amount || 0);
    const paid = catalogPaidByOrder.get(order.id) || 0;

    return sum + Math.max(total - paid, 0);
  }, 0);

  const customOutstanding = customOrders.reduce((sum, order) => {
    const status = normalizeStatus(order.status);

    if (!customEligibleStatuses.includes(status)) {
      return sum;
    }

    const total = Number(order.quoted_price || 0);
    const paid = customPaidByOrder.get(order.id) || 0;

    return sum + Math.max(total - paid, 0);
  }, 0);

  const totalOutstanding =
    catalogOutstanding + customOutstanding;

  // PRODUCTION SUMMARY: LATEST RECORD PER ORDER

  const latestProduction = new Map<string, ProductionRecord>();

  production.forEach((record) => {
    const key = record.order_id
      ? `catalog-${record.order_id}`
      : record.custom_order_id
      ? `custom-${record.custom_order_id}`
      : `record-${record.id}`;

    if (!latestProduction.has(key)) {
      latestProduction.set(key, record);
    }
  });

  const productionCounts = {
    assigned: 0,
    cutting: 0,
    sewing: 0,
    fitting: 0,
    finishing: 0,
    ready_for_pickup: 0,
    completed: 0,
  };

  latestProduction.forEach((record) => {
    const status = normalizeProgress(
      record.status
    ) as keyof typeof productionCounts;

    if (status in productionCounts) {
      productionCounts[status]++;
    }
  });

  // RECENT ORDERS

  const recentOrders = [
    ...orders.map((order) => ({
      id: order.id,
      type: 'Catalog',
      status: order.status || '',
      date: order.created_at,
    })),
    ...customOrders.map((order) => ({
      id: order.id,
      type: 'Custom',
      status: order.status || '',
      date: order.created_at,
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.date).getTime() -
        new Date(a.date).getTime()
    )
    .slice(0, 5);

  const recentPayments = payments.slice(0, 5);

  // REPORT DATA USED BY BOTH EXPORT OPTIONS

  const reportSections = [
    {
      title: 'Overall Summary',
      rows: [
        ['Total Orders', orders.length + customOrders.length],
        ['Catalog Orders', orders.length],
        ['Custom Orders', customOrders.length],
        ['Total Paid', formatMoney(totalPaid)],
        ['Outstanding Balance', formatMoney(totalOutstanding)],
        [
          'Orders In Production',
          catalogInProduction + customInProduction,
        ],
      ],
    },
    {
      title: 'Catalog Orders',
      rows: [
        ['Pending', catalogPending],
        ['Accepted', catalogAccepted],
        ['In Production', catalogInProduction],
        ['Ready for Release', catalogReady],
        ['Completed', catalogCompleted],
        ['Cancelled', catalogCancelled],
        ['Catalog Order Value', formatMoney(catalogOrderValue)],
      ],
    },
    {
      title: 'Custom Orders',
      rows: [
        ['Submitted', customSubmitted],
        ['Under Review', customUnderReview],
        ['Quotation Sent', customQuotationSent],
        ['Accepted', customAccepted],
        ['In Production', customInProduction],
        ['Ready for Fitting', customReadyForFitting],
        ['Ready for Release', customReadyForRelease],
        ['Completed', customCompleted],
        ['Declined', customDeclined],
        ['Cancelled', customCancelled],
        ['Custom Quoted Value', formatMoney(customQuotedValue)],
      ],
    },
    {
      title: 'Payments',
      rows: [
        ['Total Paid', formatMoney(totalPaid)],
        ['Deposits Collected', formatMoney(totalDeposits)],
        ['Balance Payments', formatMoney(totalBalancePayments)],
        ['Pending Payments', pendingPayments.length],
        ['Outstanding Balance', formatMoney(totalOutstanding)],
        ['Total Paid Transactions', paidPayments.length],
      ],
    },
    {
      title: 'Production',
      rows: [
        ['Assigned', productionCounts.assigned],
        ['Cutting', productionCounts.cutting],
        ['Sewing', productionCounts.sewing],
        ['Fitting', productionCounts.fitting],
        ['Finishing', productionCounts.finishing],
        ['Ready for Pickup', productionCounts.ready_for_pickup],
        ['Completed', productionCounts.completed],
      ],
    },
  ];

  // EXPORT PDF

  const exportPDF = async () => {
    try {
      setExporting('pdf');

      const generatedDate = formatDate(new Date().toISOString());

      const sectionsHTML = reportSections
        .map(
          (section) => `
            <div class="section">
              <h2>${escapeHtml(section.title)}</h2>
              ${section.rows
                .map(
                  ([label, value]) => `
                    <div class="row">
                      <span>${escapeHtml(String(label))}</span>
                      <strong>${escapeHtml(String(value))}</strong>
                    </div>
                  `
                )
                .join('')}
            </div>
          `
        )
        .join('');

      const ordersHTML = recentOrders
        .map(
          (order) => `
            <div class="recent-row">
              <div>
                <strong>${escapeHtml(order.type)} Order</strong>
                <p>${escapeHtml(order.id)}</p>
                <small>${escapeHtml(formatDate(order.date))}</small>
              </div>
              <strong>${escapeHtml(formatLabel(order.status || 'Unknown'))}</strong>
            </div>
          `
        )
        .join('');

      const paymentsHTML = recentPayments
        .map(
          (payment) => `
            <div class="recent-row">
              <div>
                <strong>${escapeHtml(formatLabel(payment.payment_type || 'Payment'))}</strong>
                <p>${escapeHtml(
                  payment.order_id
                    ? `Order ${payment.order_id}`
                    : payment.custom_order_id
                    ? `Custom ${payment.custom_order_id}`
                    : 'No order'
                )}</p>
                <small>${escapeHtml(formatDate(payment.created_at))}</small>
              </div>
              <div class="right">
                <strong>${escapeHtml(formatMoney(Number(payment.amount || 0)))}</strong>
                <small>${escapeHtml(formatLabel(payment.status || 'Unknown'))}</small>
              </div>
            </div>
          `
        )
        .join('');

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body {
                font-family: Arial, sans-serif;
                color: #392831;
                padding: 25px;
                font-size: 12px;
              }
              h1 {
                color: #B84470;
                font-size: 23px;
                margin-bottom: 5px;
              }
              .subtitle {
                color: #8D7780;
                margin-bottom: 25px;
              }
              h2 {
                font-size: 16px;
                color: #B84470;
                border-bottom: 1px solid #F0E3E8;
                padding-bottom: 8px;
                margin-bottom: 8px;
              }
              .section {
                margin-bottom: 23px;
                page-break-inside: avoid;
              }
              .row {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #F5EDF0;
              }
              .row strong {
                text-align: right;
                margin-left: 15px;
              }
              .recent-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 0;
                border-bottom: 1px solid #F0E3E8;
                page-break-inside: avoid;
              }
              .recent-row p {
                color: #8D7780;
                font-size: 10px;
                margin: 4px 0;
              }
              .recent-row small {
                color: #8D7780;
                font-size: 10px;
              }
              .right {
                text-align: right;
              }
              .footer {
                color: #8D7780;
                font-size: 10px;
                margin-top: 25px;
                text-align: center;
              }
            </style>
          </head>
          <body>
            <h1>Pink Blush</h1>
            <div class="subtitle">
              Garment Order and Production Management System<br />
              Reports Management<br />
              Generated: ${escapeHtml(generatedDate)}
            </div>

            ${sectionsHTML}

            <div class="section">
              <h2>Recent Orders</h2>
              ${ordersHTML || '<p>No orders yet.</p>'}
            </div>

            <div class="section">
              <h2>Recent Payments</h2>
              ${paymentsHTML || '<p>No payments yet.</p>'}
            </div>

            <div class="footer">
              This report is based on the current order, payment,
              and production records.
            </div>
          </body>
        </html>
      `;

      const file = await Print.printToFileAsync({ html });

      const available = await Sharing.isAvailableAsync();

      if (!available) {
        Alert.alert(
          'Sharing unavailable',
          'Your device does not support sharing this PDF.'
        );
        return;
      }

      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Export Pink Blush Report',
        UTI: 'com.adobe.pdf',
      });
    } catch (error) {
      console.error('PDF export error:', error);
      Alert.alert('Export Failed', 'Unable to generate the PDF report.');
    } finally {
      setExporting(null);
    }
  };

  // EXPORT CSV - EXCEL COMPATIBLE

  const exportCSV = async () => {
    try {
      setExporting('csv');

      const rows: (string | number)[][] = [
        ['PINK BLUSH - REPORTS MANAGEMENT'],
        ['Generated', formatDate(new Date().toISOString())],
        [],
      ];

      reportSections.forEach((section) => {
        rows.push([section.title]);
        rows.push(['Description', 'Value']);

        section.rows.forEach(([label, value]) => {
          rows.push([String(label), String(value)]);
        });

        rows.push([]);
      });

      rows.push(['RECENT ORDERS']);
      rows.push(['Order Type', 'Order ID', 'Status', 'Date']);

      recentOrders.forEach((order) => {
        rows.push([
          order.type,
          order.id,
          formatLabel(order.status || 'Unknown'),
          formatDate(order.date),
        ]);
      });

      rows.push([]);
      rows.push(['RECENT PAYMENTS']);
      rows.push([
        'Payment Type',
        'Order Reference',
        'Amount',
        'Status',
        'Date',
      ]);

      recentPayments.forEach((payment) => {
        rows.push([
          formatLabel(payment.payment_type || 'Payment'),
          payment.order_id
            ? `Order ${payment.order_id}`
            : payment.custom_order_id
            ? `Custom ${payment.custom_order_id}`
            : 'No order',
          Number(payment.amount || 0).toFixed(2),
          formatLabel(payment.status || 'Unknown'),
          formatDate(payment.created_at),
        ]);
      });

      const csvContent =
        '\uFEFF' +
        rows
          .map((row) =>
            row.map((value) => csvEscape(value)).join(',')
          )
          .join('\r\n');

      const directory = FileSystem.cacheDirectory;

      if (!directory) {
        throw new Error('File storage is unavailable.');
      }

      const fileUri = `${directory}PinkBlush_Report_${Date.now()}.csv`;

      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const available = await Sharing.isAvailableAsync();

      if (!available) {
        Alert.alert(
          'Sharing unavailable',
          'Your device does not support sharing this CSV file.'
        );
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Pink Blush Report',
        UTI: 'public.comma-separated-values-text',
      });
    } catch (error) {
      console.error('CSV export error:', error);
      Alert.alert('Export Failed', 'Unable to export the CSV report.');
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PINK} />
        <Text style={styles.loadingText}>Loading reports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={PINK}
            colors={[PINK]}
          />
        }
        contentContainerStyle={styles.content}
      >
        <View style={styles.reportContent}>
          {/* HEADER */}

          <View style={styles.header}>
            <Text style={styles.title}>Reports Management</Text>
            <Text style={styles.subtitle}>
              Overview of orders, payments, production, and revenue.
            </Text>
          </View>

          {/* EXPORT BUTTONS */}

          <View style={styles.exportSection}>
            <Text style={styles.exportTitle}>Export Reports</Text>

            <View style={styles.exportButtons}>
              <Pressable
                style={[
                  styles.exportButton,
                  exporting !== null && styles.disabledButton,
                ]}
                disabled={exporting !== null}
                onPress={exportPDF}
              >
                {exporting === 'pdf' ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.exportButtonText}>
                    Export PDF
                  </Text>
                )}
              </Pressable>

              <Pressable
                style={[
                  styles.exportButton,
                  styles.csvButton,
                  exporting !== null && styles.disabledButton,
                ]}
                disabled={exporting !== null}
                onPress={exportCSV}
              >
                {exporting === 'csv' ? (
                  <ActivityIndicator color={DARK_PINK} size="small" />
                ) : (
                  <Text style={styles.csvButtonText}>
                    Export CSV
                  </Text>
                )}
              </Pressable>
            </View>

            <Text style={styles.exportHint}>
              PDF is suitable for printing. CSV can be opened in Excel.
            </Text>
          </View>

          {/* OVERVIEW */}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overall Summary</Text>

            <View style={styles.highlightRow}>
              <Text style={styles.highlightLabel}>Total Orders</Text>
              <Text style={styles.highlightValue}>
                {orders.length + customOrders.length}
              </Text>
            </View>

            <ReportRow label="Catalog Orders" value={orders.length} />
            <ReportRow label="Custom Orders" value={customOrders.length} />

            <ReportDivider />

            <View style={styles.highlightRow}>
              <Text style={styles.highlightLabel}>Total Paid</Text>
              <Text style={styles.moneyHighlight}>
                {formatMoney(totalPaid)}
              </Text>
            </View>

            <ReportRow
              label="Outstanding Balance"
              value={formatMoney(totalOutstanding)}
              highlight
            />

            <ReportRow
              label="Orders In Production"
              value={catalogInProduction + customInProduction}
            />
          </View>

          {/* CATALOG ORDERS */}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Catalog Orders</Text>

            <ReportRow label="Pending" value={catalogPending} />
            <ReportRow label="Accepted" value={catalogAccepted} />
            <ReportRow label="In Production" value={catalogInProduction} />
            <ReportRow label="Ready for Release" value={catalogReady} />
            <ReportRow label="Completed" value={catalogCompleted} />
            <ReportRow label="Cancelled" value={catalogCancelled} />

            <ReportDivider />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Catalog Order Value</Text>
              <Text style={styles.totalValue}>
                {formatMoney(catalogOrderValue)}
              </Text>
            </View>
          </View>

          {/* CUSTOM ORDERS */}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Custom Orders</Text>

            <ReportRow label="Submitted" value={customSubmitted} />
            <ReportRow label="Under Review" value={customUnderReview} />
            <ReportRow label="Quotation Sent" value={customQuotationSent} />
            <ReportRow label="Accepted" value={customAccepted} />
            <ReportRow label="In Production" value={customInProduction} />
            <ReportRow label="Ready for Fitting" value={customReadyForFitting} />
            <ReportRow label="Ready for Release" value={customReadyForRelease} />
            <ReportRow label="Completed" value={customCompleted} />
            <ReportRow label="Declined" value={customDeclined} />
            <ReportRow label="Cancelled" value={customCancelled} />

            <ReportDivider />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Custom Quoted Value</Text>
              <Text style={styles.totalValue}>
                {formatMoney(customQuotedValue)}
              </Text>
            </View>
          </View>

          {/* PAYMENTS */}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payments</Text>

            <View style={styles.highlightRow}>
              <Text style={styles.highlightLabel}>Total Paid</Text>
              <Text style={styles.moneyHighlight}>
                {formatMoney(totalPaid)}
              </Text>
            </View>

            <ReportRow
              label="Deposits Collected"
              value={formatMoney(totalDeposits)}
            />

            <ReportRow
              label="Balance Payments"
              value={formatMoney(totalBalancePayments)}
            />

            <ReportRow
              label="Pending Payments"
              value={pendingPayments.length}
            />

            <ReportRow
              label="Outstanding Balance"
              value={formatMoney(totalOutstanding)}
              highlight
            />

            <ReportRow
              label="Total Paid Transactions"
              value={paidPayments.length}
            />
          </View>

          {/* PRODUCTION */}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Production</Text>

            <ReportRow label="Assigned" value={productionCounts.assigned} />
            <ReportRow label="Cutting" value={productionCounts.cutting} />
            <ReportRow label="Sewing" value={productionCounts.sewing} />
            <ReportRow label="Fitting" value={productionCounts.fitting} />
            <ReportRow label="Finishing" value={productionCounts.finishing} />
            <ReportRow
              label="Ready for Pickup"
              value={productionCounts.ready_for_pickup}
            />
            <ReportRow label="Completed" value={productionCounts.completed} />
          </View>

          {/* RECENT ORDERS */}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>

            {recentOrders.length === 0 ? (
              <Text style={styles.emptyText}>No orders yet.</Text>
            ) : (
              recentOrders.map((order, index) => (
                <View
                  key={`${order.type}-${order.id}`}
                  style={styles.listRow}
                >
                  <View style={styles.listMain}>
                    <Text style={styles.listTitle}>
                      {order.type} Order
                    </Text>
                    <Text style={styles.listId}>
                      {order.id.slice(0, 8)}...
                    </Text>
                    <Text style={styles.listDate}>
                      {formatDate(order.date)}
                    </Text>
                  </View>

                  <View style={styles.listRight}>
                    <Text style={styles.statusText}>
                      {formatLabel(order.status || 'Unknown')}
                    </Text>
                  </View>

                  {index !== recentOrders.length - 1 && (
                    <View style={styles.rowDivider} />
                  )}
                </View>
              ))
            )}
          </View>

          {/* RECENT PAYMENTS */}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Payments</Text>

            {recentPayments.length === 0 ? (
              <Text style={styles.emptyText}>No payments yet.</Text>
            ) : (
              recentPayments.map((payment, index) => (
                <View key={payment.id} style={styles.listRow}>
                  <View style={styles.listMain}>
                    <Text style={styles.listTitle}>
                      {formatLabel(payment.payment_type || 'Payment')}
                    </Text>

                    <Text style={styles.listId}>
                      {payment.order_id
                        ? `Order ${payment.order_id.slice(0, 8)}...`
                        : payment.custom_order_id
                        ? `Custom ${payment.custom_order_id.slice(0, 8)}...`
                        : 'No order'}
                    </Text>

                    <Text style={styles.listDate}>
                      {formatDate(payment.created_at)}
                    </Text>
                  </View>

                  <View style={styles.listRight}>
                    <Text style={styles.paymentAmount}>
                      {formatMoney(Number(payment.amount || 0))}
                    </Text>
                    <Text style={styles.paymentStatus}>
                      {formatLabel(payment.status || 'Unknown')}
                    </Text>
                  </View>

                  {index !== recentPayments.length - 1 && (
                    <View style={styles.rowDivider} />
                  )}
                </View>
              ))
            )}
          </View>

          <Text style={styles.footerText}>
            Reports are based on the current order, payment, and production records.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

type ReportRowProps = {
  label: string;
  value: string | number;
  highlight?: boolean;
};

function ReportRow({
  label,
  value,
  highlight = false,
}: ReportRowProps) {
  return (
    <View style={styles.reportRow}>
      <Text
        style={[
          styles.reportLabel,
          highlight && styles.reportLabelHighlight,
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.reportValue,
          highlight && styles.reportValueHighlight,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function ReportDivider() {
  return <View style={styles.sectionDivider} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 35,
    alignItems: 'center',
  },

  reportContent: {
    width: '100%',
    maxWidth: 600,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: TEXT_MUTED,
  },

  header: {
    marginBottom: 20,
  },

  title: {
    fontSize: 24,
    fontWeight: '800',
    color: TEXT_DARK,
  },

  subtitle: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginTop: 6,
    lineHeight: 19,
  },

  exportSection: {
    marginBottom: 25,
  },

  exportTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT_DARK,
    marginBottom: 10,
  },

  exportButtons: {
    flexDirection: 'row',
    gap: 10,
  },

  exportButton: {
    flex: 1,
    minHeight: 46,
    backgroundColor: DARK_PINK,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },

  csvButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: PINK,
  },

  exportButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  csvButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: DARK_PINK,
  },

  disabledButton: {
    opacity: 0.6,
  },

  exportHint: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 8,
  },

  section: {
    marginBottom: 27,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: TEXT_DARK,
    marginBottom: 12,
  },

  highlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 10,
  },

  highlightLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_DARK,
  },

  highlightValue: {
    fontSize: 22,
    fontWeight: '800',
    color: DARK_PINK,
  },

  moneyHighlight: {
    fontSize: 17,
    fontWeight: '800',
    color: DARK_PINK,
    flexShrink: 1,
    textAlign: 'right',
  },

  reportRow: {
    minHeight: 39,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },

  reportLabel: {
    flex: 1,
    fontSize: 13,
    color: TEXT_MUTED,
  },

  reportValue: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_DARK,
    textAlign: 'right',
    flexShrink: 0,
  },

  reportLabelHighlight: {
    color: DARK_PINK,
    fontWeight: '700',
  },

  reportValueHighlight: {
    color: DARK_PINK,
    fontWeight: '800',
  },

  sectionDivider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginVertical: 9,
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
  },

  totalLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_DARK,
  },

  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: DARK_PINK,
    textAlign: 'right',
  },

  listRow: {
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },

  listMain: {
    flex: 1,
    minWidth: 0,
  },

  listTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_DARK,
  },

  listId: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 4,
  },

  listDate: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 4,
  },

  listRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    maxWidth: '45%',
  },

  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: DARK_PINK,
    textAlign: 'right',
  },

  paymentAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: DARK_PINK,
    textAlign: 'right',
  },

  paymentStatus: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 4,
    textAlign: 'right',
  },

  rowDivider: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: DIVIDER,
  },

  emptyText: {
    fontSize: 13,
    color: TEXT_MUTED,
    paddingVertical: 12,
  },

  footerText: {
    textAlign: 'center',
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 5,
    lineHeight: 17,
  },
});