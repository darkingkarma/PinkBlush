
import { useEffect, useRef, useState } from 'react';

import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  NavigationContainer,
  getFocusedRouteNameFromRoute,
} from '@react-navigation/native';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import {
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import NotificationsScreen from './shared/notification';
import WelcomeScreen from './screens/customer/welcome';
import LoginScreen from './screens/customer/login';
import RegisterScreen from './screens/customer/register';
import HomeScreen from './screens/customer/home';

import ProfileScreen from './screens/customer/customer-profile/profile';
import MeasurementsScreen from './screens/customer/customer-profile/measurements';
import EditMeasurementsScreen from './screens/customer/customer-profile/edit-measurements';
import PersonalDetailsScreen from './screens/customer/customer-profile/personal-details';

import OrderMeasurementsScreen from './screens/customer/order/order-measurements';
import ChangePasswordScreen from './screens/customer/customer-profile/changepass';
import ReviewOrderScreen from './screens/customer/order/review-order';
import OrderTypeScreen from './screens/customer/order/order-type';
import CustomerCategoriesScreen from './screens/customer/order/categories';
import CustomerGarmentsScreen from './screens/customer/order/garments';
import CustomerGarmentDetailsScreen from './screens/customer/order/garment-details';
import ConfigurePartsScreen from './screens/customer/order/configure-parts';
import MyOrdersScreen from './screens/customer/order/my-orders';
import OrderDetailsScreen from './screens/customer/order/order-details';
import ReviewQuotationScreen from './screens/customer/order/review-quotation';
import CustomOrderScreen from './screens/customer/order/custom-order';
import CatalogScreen from './screens/customer/order/catalog';
import PaymentScreen from './screens/customer/order/payment';
import ReceiptScreen from './screens/customer/order/receipt';

import ReviewCustomOrderScreen from './screens/customer/order/review-custom-order';
import StaffProfileScreen from './screens/staff/profile';
import GarmentCategoriesScreen from './screens/staff/product/garment-categories';
import ManageGarmentsScreen from './screens/staff/product/manage-garments';

import AddGarmentPartScreen from './screens/staff/product/add-garment-part';
import EditGarmentPartScreen from './screens/staff/product/edit-garment-part';

import AddDesignScreen from './screens/staff/product/add-design';
import EditDesignScreen from './screens/staff/product/edit-design';

import FabricsScreen from './screens/staff/product/fabrics';
import ReportsManagementScreen from './screens/staff/reports/reports';
import GarmentDetailsScreen from './screens/staff/product/garment-details';

import ManageOrdersScreen from './screens/staff/orders/manage-orders';
import ReviewRequestScreen from './screens/staff/orders/review-request';
import CatalogOrdersScreen from './screens/staff/orders/catalog-orders';

import ManageTailorsScreen from './screens/staff/tailors/manage-tailors';
import StaffDashboardScreen from './screens/staff/dashboard';

import ManageOrderScreen from './screens/staff/orders/manage-order';
import ManagePaymentsScreen from './screens/staff/payments/manage-payments';

import ResetPasswordScreen from './screens/customer/reset-password';

import { supabase } from './supabase';
import { registerForPushNotificationsAsync } from './pushNotifications';


import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
// =====================================================
// CUSTOM ORDER DRAFT TYPE
// =====================================================

export type CustomOrderDraft = {
  referenceImagePath: string | null;
  garmentDescription: string;
  preferredColor: string | null;
  fabricPreference: string | null;
  neededByDate: string | null;
  specialInstructions: string | null;
};

// =====================================================
// ROOT NAVIGATION TYPES
// =====================================================

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;

  Main: undefined;
  StaffDashboard: undefined;
  Notifications: undefined;
  ManageTailors: undefined;
  MyOrders: undefined;

  OrderDetails: {
    orderId: string;
    orderType: 'custom' | 'catalog';
  };

  ReviewQuotation: {
    orderId: string;
  };
  ResetPassword: undefined;
  OrderType: undefined;
  CustomOrder: undefined;
  CustomerCategories: undefined;

  CustomerGarments: {
    categoryId: string;
    categoryName: string;
  };
ReportsManagement: undefined;
  CustomerGarmentDetails: {
    garment: {
      id: string;
      name: string;
      description: string | null;
      available: boolean;
      category_id: string;
      image_url: string | null;
    };
  };

  ConfigureParts: {
    garment: {
      id: string;
      name: string;
      description: string | null;
      available: boolean;
      category_id: string;
      image_url: string | null;
    };
    selectedPartIds: string[];
    selectedDesigns?: Record<
      string,
      {
        id: string;
        name: string;
        image_url: string | null;
      }
    >;
    selectedFabrics?: Record<
      string,
      {
        id: string;
        name: string;
        price_addition: number;
      }
    >;
  };
  ChangePassword: undefined;
  OrderMeasurements: {
    orderData?: {
      garment: {
        id: string;
        name: string;
        description: string | null;
        available: boolean;
        category_id: string;
        image_url: string | null;
      };
      items: {
        partId: string;
        partName: string;
        designId: string | null;
        designName: string | null;
        designImage: string | null;
        fabricId: string | null;
        fabricName: string | null;
        quantity: number;
        unitPrice: number;
        subtotal: number;
      }[];
      totalAmount: number;
    };

    customOrderData?: CustomOrderDraft;
  };

  ReviewOrder: {
    orderData: {
      garment: {
        id: string;
        name: string;
        description: string | null;
        available: boolean;
        category_id: string;
        image_url: string | null;
      };
      items: {
        partId: string;
        partName: string;
        designId: string | null;
        designName: string | null;
        designImage: string | null;
        fabricId: string | null;
        fabricName: string | null;
        quantity: number;
        unitPrice: number;
        subtotal: number;
      }[];
      totalAmount: number;
    };

    measurement: {
      id: string;
      shoulder: number | null;
      chest: number | null;
      waist: number | null;
      sleeve_length: number | null;
      top_length: number | null;
      hips: number | null;
      inseam: number | null;
      bottom_length: number | null;
    };
  };

  ReviewCustomOrder: {
    customOrderData: CustomOrderDraft;

    measurement: {
      id: string;
      shoulder: number | null;
      chest: number | null;
      waist: number | null;
      sleeve_length: number | null;
      top_length: number | null;
      hips: number | null;
      inseam: number | null;
      bottom_length: number | null;
    };
  };

  Measurements: undefined;
  EditMeasurements: undefined;
  PersonalDetails: undefined;
  ManageGarments: undefined;
  GarmentCategories: undefined;

  Garments: undefined;

  AddGarmentPart: {
    garmentId: string;
  };

  EditGarmentPart: {
    part: {
      id: string;
      garment_id: string;
      name: string;
      description: string | null;
      price: number;
      gender: string;
      available: boolean;
    };
  };

  AddDesign: {
    garmentPartId: string;
  };

  EditDesign: {
    design: {
      id: string;
      garment_part_id: string;
      name: string;
      description: string | null;
      image_url: string | null;
    };
  };
  
  Fabrics: undefined;

  GarmentDetails: {
    garment: {
      id: string;
      name: string;
      description: string | null;
      available: boolean;
      category_id: string;
      image_url: string | null;
    };
  };

  ReviewRequest: {
    order: {
      id: string;
      user_id: string;
      reference_image_url: string | null;
      garment_description: string;
      special_instructions: string | null;
      preferred_color: string | null;
      fabric_preference: string | null;
      needed_by_date: string | null;
      status: string;
      quoted_price: number | null;
      deposit_amount: number | null;
      quotation_note: string | null;
      estimated_completion_date: string | null;
      created_at: string;
    };
  };

  ManageOrder: {
    orderId: string;
    orderType: 'custom' | 'catalog';
  };

  Payment: {
    orderId: string;
    orderType: 'catalog' | 'custom';
    totalAmount: number;
  };

  Receipt: {
    orderId: string;
    paymentId: string;
    orderType: 'catalog' | 'custom';
  };
};

export type MainTabParamList = {
  Home: undefined;
  Catalog: undefined;
  Orders: undefined;
  Profile: undefined;
};


export type StaffTabParamList = {
  Dashboard: undefined;
  ManageOrders: undefined;
  Payments: undefined;
  Tailors: undefined;
  Garments: undefined;
  Profile: undefined;
};

// =====================================================
// NAVIGATORS
// =====================================================

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const StaffTab = createBottomTabNavigator<StaffTabParamList>();

const StaffGarmentStack =
  createNativeStackNavigator<RootStackParamList>();

// =====================================================
// STAFF GARMENT STACK
// =====================================================

function StaffGarmentsStack() {
  return (
    <StaffGarmentStack.Navigator
      initialRouteName="ManageGarments"
      screenOptions={{
        headerShown: true,
        headerTitleAlign: 'center',
        headerTintColor: '#d96b8a',
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTitleStyle: {
          fontWeight: '700',
        },
        headerShadowVisible: false,
      }}
    >
      <StaffGarmentStack.Screen
        name="ManageGarments"
        component={ManageGarmentsScreen}
        options={{ title: 'Garment Management' }}
      />

      <StaffGarmentStack.Screen
        name="GarmentCategories"
        component={GarmentCategoriesScreen}
        options={{ title: 'Garment Categories' }}
      />

      <StaffGarmentStack.Screen
        name="GarmentDetails"
        component={GarmentDetailsScreen}
        options={{ title: 'Manage Garment' }}
      />

      <StaffGarmentStack.Screen
        name="AddGarmentPart"
        component={AddGarmentPartScreen}
        options={{ title: 'Add Garment Part' }}
      />

      <StaffGarmentStack.Screen
        name="EditGarmentPart"
        component={EditGarmentPartScreen}
        options={{ title: 'Edit Garment Part' }}
      />

      <StaffGarmentStack.Screen
        name="AddDesign"
        component={AddDesignScreen}
        options={{ title: 'Add Design' }}
      />

      <StaffGarmentStack.Screen
        name="EditDesign"
        component={EditDesignScreen}
        options={{ title: 'Edit Design' }}
      />

      <StaffGarmentStack.Screen
        name="Fabrics"
        component={FabricsScreen}
        options={{ title: 'Manage Fabrics' }}
      />
    </StaffGarmentStack.Navigator>
  );
}

// =====================================================
// CUSTOMER BOTTOM TABS
// =====================================================

function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#d96b8a',
        tabBarInactiveTintColor: '#999',

        tabBarStyle: {
          height: 65 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 6,
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F3DCE4',
          borderTopWidth: 1,
        },

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Catalog"
        component={CatalogScreen}
        options={{
          tabBarLabel: 'Catalog',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'grid' : 'grid-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Orders"
        component={MyOrdersScreen}
        options={{
          tabBarLabel: 'Orders',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'receipt' : 'receipt-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={
                focused
                  ? 'person-circle'
                  : 'person-circle-outline'
              }
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// =====================================================
// STAFF MANAGE ORDERS TAB
// =====================================================

function StaffManageOrdersTab() {
  const [selectedOrderType, setSelectedOrderType] =
    useState<'catalog' | 'custom'>('catalog');

  return (
    <View style={staffStyles.manageOrdersContainer}>
      <View style={staffStyles.manageOrdersHeader}>
        <Text style={staffStyles.manageOrdersTitle}>
          Manage Orders
        </Text>

        <Text style={staffStyles.manageOrdersSubtitle}>
          View and manage customer orders.
        </Text>

        <View style={staffStyles.orderTypeTabs}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedOrderType('catalog')}
            style={[
              staffStyles.orderTypeTab,
              selectedOrderType === 'catalog' &&
                staffStyles.orderTypeTabActive,
            ]}
          >
            <Text
              style={[
                staffStyles.orderTypeText,
                selectedOrderType === 'catalog' &&
                  staffStyles.orderTypeTextActive,
              ]}
            >
              Catalog Orders
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedOrderType('custom')}
            style={[
              staffStyles.orderTypeTab,
              selectedOrderType === 'custom' &&
                staffStyles.orderTypeTabActive,
            ]}
          >
            <Text
              style={[
                staffStyles.orderTypeText,
                selectedOrderType === 'custom' &&
                  staffStyles.orderTypeTextActive,
              ]}
            >
              Custom Orders
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={staffStyles.manageOrdersContent}>
        {selectedOrderType === 'catalog' ? (
          <CatalogOrdersScreen />
        ) : (
          <ManageOrdersScreen />
        )}
      </View>
    </View>
  );
}

// =====================================================
// STAFF BOTTOM TABS
// =====================================================

function StaffTabs() {
  const insets = useSafeAreaInsets();

  const safeTabBarStyle = {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#F3DCE4',
    borderTopWidth: 1,
    height: 65 + insets.bottom,
    paddingBottom: Math.max(insets.bottom, 8),
    paddingTop: 6,
  };

  return (
    <StaffTab.Navigator
      screenOptions={{
        headerTitleAlign: 'center',
        headerTintColor: '#d96b8a',
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTitleStyle: {
          fontWeight: '700',
        },
        headerShadowVisible: false,

        tabBarActiveTintColor: '#d96b8a',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: safeTabBarStyle,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <StaffTab.Screen
        name="Dashboard"
        component={StaffDashboardScreen}
        options={{
          headerShown: false,
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'grid' : 'grid-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <StaffTab.Screen
        name="ManageOrders"
        component={StaffManageOrdersTab}
        options={{
          headerTitle: 'Manage Orders',
          tabBarLabel: 'Orders',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'receipt' : 'receipt-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <StaffTab.Screen
        name="Payments"
        component={ManagePaymentsScreen}
        options={{
          headerTitle: 'Manage Payments',
          tabBarLabel: 'Payments',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'wallet' : 'wallet-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <StaffTab.Screen
        name="Tailors"
        component={ManageTailorsScreen}
        options={{
          headerTitle: 'Manage Tailors',
          tabBarLabel: 'Tailors',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <StaffTab.Screen
        name="Garments"
        component={StaffGarmentsStack}
        options={({ route }) => {
          const currentScreen =
            getFocusedRouteNameFromRoute(route) ??
            'ManageGarments';

          const isGarmentManagementHome =
            currentScreen === 'ManageGarments';

          return {
            headerShown: false,
            tabBarLabel: 'Garments',

            tabBarStyle: isGarmentManagementHome
              ? safeTabBarStyle
              : { display: 'none' },

            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'shirt' : 'shirt-outline'}
                size={size}
                color={color}
              />
            ),
          };
        }}
      />

      <StaffTab.Screen
        name="Profile"
        component={StaffProfileScreen}
        options={{
          headerTitle: 'My Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </StaffTab.Navigator>
  );
}
// =====================================================
// STAFF STYLES
// =====================================================

const staffStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8FA',
    padding: 24,
  },

  title: {
    fontSize: 23,
    fontWeight: '800',
    color: '#3F2630',
    textAlign: 'center',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 14,
    color: '#8C6674',
    textAlign: 'center',
    marginBottom: 12,
  },

  description: {
    fontSize: 13,
    color: '#8C6674',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },

  logoutButton: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D96B8A',
    borderRadius: 9,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 18,
  },

  logoutButtonText: {
    color: '#B84470',
    fontSize: 14,
    fontWeight: '700',
  },

  // MANAGE ORDERS

  manageOrdersContainer: {
    flex: 1,
    backgroundColor: '#FFF8FA',
  },

  manageOrdersHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2E5EA',
  },

  manageOrdersTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3F2630',
  },

  manageOrdersSubtitle: {
    fontSize: 10,
    color: '#8C6674',
    marginTop: 2,
    marginBottom: 8,
  },

  orderTypeTabs: {
    flexDirection: 'row',
    backgroundColor: '#F9EFF3',
    borderRadius: 8,
    padding: 3,
    gap: 3,
  },

  orderTypeTab: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },

  orderTypeTabActive: {
    backgroundColor: '#D96B8A',
  },

  orderTypeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#936D7B',
  },

  orderTypeTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  manageOrdersContent: {
    flex: 1,
  },
});

// =====================================================
// SCREEN TITLES
// =====================================================

const screenTitles: Partial<
  Record<keyof RootStackParamList, string>
> = {
  Welcome: 'Welcome',
  Login: 'Login',
  Register: 'Create Account',

  StaffDashboard: 'Staff Dashboard',
  ManageTailors: 'Manage Tailors',

  MyOrders: 'My Orders',
  OrderDetails: 'Order Details',
  ReviewQuotation: 'Review Quotation',
  Measurements: 'My Measurements',
  EditMeasurements: 'Edit Measurements',

  OrderType: 'Order Type',
  CustomOrder: 'Custom Order',

  CustomerCategories: 'Categories',
  CustomerGarments: 'Garments',
  CustomerGarmentDetails: 'Garment Details',
  ConfigureParts: 'Configure Garment',
  OrderMeasurements: 'Measurements',
  ReviewOrder: 'Review Order',
  ReviewCustomOrder: 'Review Custom Order',

  Payment: 'Pay Deposit',
  Receipt: 'Order Receipt',
  ReviewRequest: 'Review Custom Order',

  ManageGarments: 'Garment Management',
  GarmentCategories: 'Garment Categories',

  Garments: 'Garments',

  AddGarmentPart: 'Add Garment Part',
  EditGarmentPart: 'Edit Garment Part',

  AddDesign: 'Add Design',
  EditDesign: 'Edit Design',

  Fabrics: 'Manage Fabrics',

  GarmentDetails: 'Garment Details',
  ManageOrder: 'Manage Order',
};

// =====================================================
// MAIN APP NAVIGATOR
// =====================================================

export default function AppNavigator() {
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  const currentUserIdRef = useRef<string | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const passwordRecoveryRef = useRef(false);

  const handleRecoveryUrl = async (incomingUrl: string) => {
    try {
      const parsedUrl = new URL(incomingUrl);

      const params = new URLSearchParams(
        `${parsedUrl.search.slice(1)}&${parsedUrl.hash.slice(1)}`
      );

      if (params.get('type') !== 'recovery') {
        return false;
      }

      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (!accessToken || !refreshToken) {
        setLoading(false);
        Alert.alert(
          'Invalid Recovery Link',
          'The password reset link is incomplete or expired. Please request another one.'
        );
        return true;
      }

      passwordRecoveryRef.current = true;
      setIsPasswordRecovery(true);
      setUserRole(null);
      setLoading(false);

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        passwordRecoveryRef.current = false;
        setIsPasswordRecovery(false);

        Alert.alert(
          'Recovery Failed',
          'Your recovery link may have expired. Please request a new password reset email.'
        );
      }

      return true;
    } catch (error) {
      console.error('Recovery link error:', error);
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;
    const linkingSubscription = Linking.addEventListener(
      'url',
      ({ url }) => {
        void handleRecoveryUrl(url);
      }
    );

    const loadSession = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();

        if (initialUrl) {
          const handled = await handleRecoveryUrl(initialUrl);

          if (handled) return;
        }
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (!session?.user) {
          currentUserIdRef.current = null;
          setUserRole(null);
          setLoading(false);
          return;
        }
        // Prevent users with unverified email addresses
        // from entering the application.
        if (!session.user.email_confirmed_at) {
          currentUserIdRef.current = null;

          await supabase.auth.signOut();

          if (!mounted) return;

          setUserRole(null);
          setLoading(false);
          return;
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();

        if (!mounted) return;

        if (error) {
          console.error(
            'Error loading user role:',
            error.message
          );
        }

        // Register this device for push notifications.
        if (currentUserIdRef.current !== session.user.id) {
          currentUserIdRef.current = session.user.id;

          void registerForPushNotificationsAsync(session.user.id);
        }

        setUserRole(profile?.role || 'customer');
        setLoading(false);
      } catch (error) {
        console.error('Error loading session:', error);

        if (mounted) {
          setUserRole(null);
          setLoading(false);
        }
      }
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || !session?.user) {
        currentUserIdRef.current = null;

        const wasPasswordRecovery = passwordRecoveryRef.current;

        passwordRecoveryRef.current = false;

        // Keep the recovery navigation open until the user
        // presses Go to Login on the Reset Password screen.
        if (!wasPasswordRecovery) {
          setIsPasswordRecovery(false);
        }

        setUserRole(null);
        setLoading(false);
        return;
      }

      // IMPORTANT: Handle password recovery BEFORE normal login events.
      if (passwordRecoveryRef.current) {
        return;
      }

      // A normal login should use normal navigation.
      if (event === 'SIGNED_IN') {
        setIsPasswordRecovery(false);
      }
      if (
        event === 'SIGNED_IN' ||
        event === 'INITIAL_SESSION' ||
        event === 'TOKEN_REFRESHED'
      ) {
        setTimeout(() => {
          if (!mounted) return;

          void (async () => {
            // Check email verification before loading the user's role.
            if (!session.user.email_confirmed_at) {
              currentUserIdRef.current = null;

              await supabase.auth.signOut();

              if (!mounted) return;

              setUserRole(null);
              setLoading(false);
              return;
            }
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .maybeSingle();

            if (!mounted) return;

            if (error) {
              console.error(
                'Error loading user role:',
                error.message
              );
            }

            if (!profile?.role) {
              console.error(
                'User profile or role was not found.'
              );

              setUserRole(null);
              setLoading(false);
              return;
            }

            // Register the device only when the logged-in user changes.
            if (currentUserIdRef.current !== session.user.id) {
              currentUserIdRef.current = session.user.id;

              void registerForPushNotificationsAsync(session.user.id);
            }

            setUserRole(profile.role);
            setLoading(false);
          })();
        }, 0);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  // LOADING

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#fff',
        }}
      >
        <ActivityIndicator
          size="large"
          color="#e8558a"
        />
      </View>
    );
  }

  // NAVIGATION

  return (
    <SafeAreaProvider>
      <NavigationContainer
        key={
          isPasswordRecovery
            ? 'password-recovery'
            : userRole ?? 'guest'
        }
      >
        <Stack.Navigator
          initialRouteName={
            isPasswordRecovery
              ? 'ResetPassword'
              : userRole === 'customer'
                ? 'Main'
                : userRole === 'staff'
                  ? 'StaffDashboard'
                  : 'Welcome'
          }
          screenOptions={({ route }) => {
            const isMain = route.name === 'Main';
            const isStaffMain = route.name === 'StaffDashboard';

            return {
              headerShown: !isMain && !isStaffMain,

              headerBackVisible: true,

              headerTitle:
                screenTitles[
                  route.name as keyof RootStackParamList
                ] ?? route.name,

              headerTitleAlign: 'center',

              headerStyle: {
                backgroundColor: '#fff',
              },

              headerTintColor: '#d96b8a',

              headerTitleStyle: {
                fontSize: 18,
                fontWeight: '700',
              },

              headerShadowVisible: false,
            };
          }}
        >
          {/* AUTH */}

          <Stack.Screen
            name="Welcome"
            component={WelcomeScreen}
          />

          <Stack.Screen
            name="Login"
            component={LoginScreen}
          />

          <Stack.Screen
            name="Register"
            component={RegisterScreen}
          />
          <Stack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
            options={{
              title: 'Reset Password',
              headerBackVisible: false,
            }}
          />

          {/* CUSTOMER MAIN */}

          <Stack.Screen
            name="Main"
            component={MainTabs}
            options={{ headerShown: false }}
          />

          {/* STAFF MAIN */}

          <Stack.Screen
            name="StaffDashboard"
            component={StaffTabs}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="ManageTailors"
            component={ManageTailorsScreen}
            options={{
              title: 'Manage Tailors',
            }}
          />

          <Stack.Screen
            name="ManageOrder"
            component={ManageOrderScreen}
            options={{ title: 'Manage Order' }}
          />

          <Stack.Screen
            name="ReviewRequest"
            component={ReviewRequestScreen}
            options={{
              title: 'Review Custom Order',
            }}
          />

          {/* CUSTOMER ROUTES */}

          <Stack.Screen
            name="MyOrders"
            component={MyOrdersScreen}
          />

          <Stack.Screen
            name="OrderDetails"
            component={OrderDetailsScreen}
          />

          <Stack.Screen
            name="ReviewQuotation"
            component={ReviewQuotationScreen}
          />

          <Stack.Screen
            name="CustomOrder"
            component={CustomOrderScreen}
          />

          <Stack.Screen
            name="Measurements"
            component={MeasurementsScreen}
          />
          <Stack.Screen
            name="ChangePassword"
            component={ChangePasswordScreen}
          />
          <Stack.Screen
            name="EditMeasurements"
            component={EditMeasurementsScreen}
          />
          <Stack.Screen
            name="PersonalDetails"
            component={PersonalDetailsScreen}
            options={{
              title: 'Personal Details',
              headerShown: true,
              headerBackVisible: true,
            }}
          />

          <Stack.Screen
            name="OrderMeasurements"
            component={OrderMeasurementsScreen}
          />

          <Stack.Screen
            name="ReviewOrder"
            component={ReviewOrderScreen}
          />

          <Stack.Screen
            name="ReviewCustomOrder"
            component={ReviewCustomOrderScreen}
          />

          <Stack.Screen
            name="Payment"
            component={PaymentScreen}
            options={{ title: 'Pay Deposit' }}
          />

          <Stack.Screen
            name="Receipt"
            component={ReceiptScreen}
            options={{ title: 'Order Receipt', headerBackVisible: false, }}
          />

          <Stack.Screen
            name="OrderType"
            component={OrderTypeScreen}
          />

          <Stack.Screen
            name="CustomerCategories"
            component={CustomerCategoriesScreen}
          />

          <Stack.Screen
            name="CustomerGarments"
            component={CustomerGarmentsScreen}
          />

          <Stack.Screen
            name="CustomerGarmentDetails"
            component={CustomerGarmentDetailsScreen}
          />

          <Stack.Screen
            name="ConfigureParts"
            component={ConfigurePartsScreen}
          />

          {/* ROOT STAFF ROUTES */}

          <Stack.Screen
            name="ManageGarments"
            component={ManageGarmentsScreen}
          />

          <Stack.Screen
            name="GarmentCategories"
            component={GarmentCategoriesScreen}
          />

          <Stack.Screen
            name="AddGarmentPart"
            component={AddGarmentPartScreen}
          />

          <Stack.Screen
            name="EditGarmentPart"
            component={EditGarmentPartScreen}
          />

          <Stack.Screen
            name="AddDesign"
            component={AddDesignScreen}
          />

          <Stack.Screen
            name="EditDesign"
            component={EditDesignScreen}
          />

          <Stack.Screen
            name="Fabrics"
            component={FabricsScreen}
          />

          <Stack.Screen
            name="GarmentDetails"
            component={GarmentDetailsScreen}
          />
          <Stack.Screen
            name="ReportsManagement"
            component={ReportsManagementScreen}
            options={{
              title: 'Reports Management',
            }}
          />

          <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
