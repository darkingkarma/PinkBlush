import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  View,
  Text,
  Alert,
  StyleSheet,
  TouchableOpacity,
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

import WelcomeScreen from './customer/welcome';
import LoginScreen from './customer/login';
import RegisterScreen from './customer/register';
import HomeScreen from './customer/home';

import ProfileScreen from './customer/customer-profile/profile';
import MeasurementsScreen from './customer/customer-profile/measurements';
import EditMeasurementsScreen from './customer/customer-profile/edit-measurements';

import OrderMeasurementsScreen from './customer/order/order-measurements';
import ReviewOrderScreen from './customer/order/review-order';
import OrderTypeScreen from './customer/order/order-type';
import CustomerCategoriesScreen from './customer/order/categories';
import CustomerGarmentsScreen from './customer/order/garments';
import CustomerGarmentDetailsScreen from './customer/order/garment-details';
import ConfigurePartsScreen from './customer/order/configure-parts';
import MyOrdersScreen from './customer/order/my-orders';
import CustomOrderScreen from './customer/order/custom-order';
import CatalogScreen from './customer/order/catalog';

import GarmentCategoriesScreen from './staff/product/garment-categories';
import AddGarmentCategoryScreen from './staff/product/add-garment-category';
import EditGarmentCategoryScreen from './staff/product/edit-garment-category';

import ManageGarmentsScreen from './staff/product/manage-garments';
import GarmentsScreen from './staff/product/garment';
import AddGarmentScreen from './staff/product/add-garment';
import EditGarmentScreen from './staff/product/edit-garment';

import AddGarmentPartScreen from './staff/product/add-garment-part';
import EditGarmentPartScreen from './staff/product/edit-garment-part';

import AddDesignScreen from './staff/product/add-design';
import EditDesignScreen from './staff/product/edit-design';

import FabricsScreen from './staff/product/fabrics';
import AddFabricScreen from './staff/product/add-fabric';
import EditFabricScreen from './staff/product/edit-fabric';

import GarmentDetailsScreen from './staff/product/garment-details';

import ManageOrdersScreen from './staff/orders/manage-orders';
import ReviewRequestScreen from './staff/orders/review-request';

import { supabase } from '../supabase';

// =====================================================
// ROOT NAVIGATION TYPES
// =====================================================

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;

  Main: undefined;
  StaffDashboard: undefined;
  MyOrders: undefined;

  OrderType: undefined;
  CustomOrder: undefined;
  CustomerCategories: undefined;

  CustomerGarments: {
    categoryId: string;
    categoryName: string;
  };

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

  OrderMeasurements: {
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

  Measurements: undefined;
  EditMeasurements: undefined;

  ManageGarments: undefined;
  GarmentCategories: undefined;
  AddGarmentCategory: undefined;

  EditGarmentCategory: {
    category: {
      id: string;
      name: string;
      description: string | null;
    };
  };

  Garments: undefined;
  AddGarment: undefined;

  EditGarment: {
    garment: {
      id: string;
      name: string;
      description: string | null;
      available: boolean;
      category_id: string;
      image_url: string | null;
    };
  };

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
  AddFabric: undefined;

  EditFabric: {
    fabric: {
      id: string;
      name: string;
      description: string | null;
      image_url: string | null;
      price_addition: number;
      available: boolean;
    };
  };

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
      created_at: string;
    };
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
        name="AddGarmentCategory"
        component={AddGarmentCategoryScreen}
        options={{ title: 'Add Category' }}
      />

      <StaffGarmentStack.Screen
        name="EditGarmentCategory"
        component={EditGarmentCategoryScreen}
        options={{ title: 'Edit Category' }}
      />

      <StaffGarmentStack.Screen
        name="Garments"
        component={GarmentsScreen}
        options={{ title: 'All Garments' }}
      />

      <StaffGarmentStack.Screen
        name="AddGarment"
        component={AddGarmentScreen}
        options={{ title: 'Add Garment' }}
      />

      <StaffGarmentStack.Screen
        name="EditGarment"
        component={EditGarmentScreen}
        options={{ title: 'Edit Garment' }}
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

      <StaffGarmentStack.Screen
        name="AddFabric"
        component={AddFabricScreen}
        options={{ title: 'Add Fabric' }}
      />

      <StaffGarmentStack.Screen
        name="EditFabric"
        component={EditFabricScreen}
        options={{ title: 'Edit Fabric' }}
      />
    </StaffGarmentStack.Navigator>
  );
}

// =====================================================
// CUSTOMER BOTTOM TABS
// =====================================================

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#d96b8a',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#f1d9e0',
          height: 65,
          paddingBottom: 8,
          paddingTop: 6,
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
// STAFF DASHBOARD TAB
// =====================================================

function StaffDashboardTab() {
  return (
    <View style={staffStyles.container}>
      <Ionicons
        name="grid-outline"
        size={55}
        color="#d96b8a"
      />

      <Text style={staffStyles.title}>
        Staff Dashboard
      </Text>

      <Text style={staffStyles.subtitle}>
        Welcome to Pink Blush Staff Management
      </Text>

      <Text style={staffStyles.description}>
        Use the tabs below to manage orders and garments.
      </Text>
    </View>
  );
}

// =====================================================
// STAFF MANAGE ORDERS TAB
// =====================================================

function StaffManageOrdersTab() {
  return <ManageOrdersScreen />;
}

// =====================================================
// STAFF PROFILE TAB
// =====================================================

function StaffProfileTab() {
  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.auth.signOut();

          if (error) {
            Alert.alert('Logout Failed', error.message);
          }
        },
      },
    ]);
  };

  return (
    <View style={staffStyles.container}>
      <Ionicons
        name="person-circle-outline"
        size={70}
        color="#d96b8a"
      />

      <Text style={staffStyles.title}>
        Staff Profile
      </Text>

      <Text style={staffStyles.subtitle}>
        Pink Blush Staff Account
      </Text>

      <TouchableOpacity
        style={staffStyles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={staffStyles.logoutButtonText}>
          Logout
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// =====================================================
// STAFF BOTTOM TABS
// =====================================================

function StaffTabs() {
  return (
    <StaffTab.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerShown: true,

        tabBarActiveTintColor: '#d96b8a',
        tabBarInactiveTintColor: '#999',

        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#f1d9e0',
          height: 65,
          paddingBottom: 8,
          paddingTop: 6,
        },

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },

        headerTitleAlign: 'center',

        headerStyle: {
          backgroundColor: '#fff',
        },

        headerTintColor: '#d96b8a',

        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '700',
        },
      }}
    >
      {/* DASHBOARD */}

      <StaffTab.Screen
        name="Dashboard"
        component={StaffDashboardTab}
        options={{
          headerTitle: 'Staff Dashboard',
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

      {/* ORDERS */}

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

      {/* GARMENTS
          Show tabs only on the main Garment Management screen. */}

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
              ? {
                  backgroundColor: '#fff',
                  borderTopColor: '#f1d9e0',
                  height: 65,
                  paddingBottom: 8,
                  paddingTop: 6,
                }
              : {
                  display: 'none',
                },

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

      {/* PROFILE */}

      <StaffTab.Screen
        name="Profile"
        component={StaffProfileTab}
        options={{
          headerTitle: 'Staff Profile',
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
    backgroundColor: '#faf9f8',
    padding: 25,
  },

  title: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#1e2a4a',
    marginTop: 16,
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    marginBottom: 12,
  },

  description: {
    fontSize: 13,
    color: '#777',
    textAlign: 'center',
    lineHeight: 20,
  },

  logoutButton: {
    width: '100%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d96b8a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 15,
  },

  logoutButtonText: {
    color: '#d96b8a',
    fontSize: 16,
    fontWeight: 'bold',
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

  MyOrders: 'My Orders',
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

  ManageGarments: 'Garment Management',
  GarmentCategories: 'Garment Categories',
  AddGarmentCategory: 'Add Category',
  EditGarmentCategory: 'Edit Category',

  Garments: 'Garments',
  AddGarment: 'Add Garment',
  EditGarment: 'Edit Garment',

  AddGarmentPart: 'Add Garment Part',
  EditGarmentPart: 'Edit Garment Part',

  AddDesign: 'Add Design',
  EditDesign: 'Edit Design',

  Fabrics: 'Manage Fabrics',
  AddFabric: 'Add Fabric',
  EditFabric: 'Edit Fabric',

  GarmentDetails: 'Garment Details',
};

// =====================================================
// MAIN APP NAVIGATOR
// =====================================================

export default function AppNavigator() {
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (!session?.user) {
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
        setUserRole(null);
        setLoading(false);
        return;
      }

      if (
        event === 'SIGNED_IN' ||
        event === 'INITIAL_SESSION' ||
        event === 'TOKEN_REFRESHED'
      ) {
        setTimeout(() => {
          if (!mounted) return;

          void (async () => {
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

            setUserRole(profile.role);
            setLoading(false);
          })();
        }, 0);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
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
    <NavigationContainer key={userRole ?? 'guest'}>
      <Stack.Navigator
        initialRouteName={
          userRole === 'customer'
            ? 'Main'
            : userRole === 'staff'
              ? 'StaffDashboard'
              : 'Welcome'
        }
        screenOptions={({ route }) => {
          const isMain =
            route.name === 'Main';

          const isStaffMain =
            route.name === 'StaffDashboard';

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
          name="CustomOrder"
          component={CustomOrderScreen}
        />

        <Stack.Screen
          name="Measurements"
          component={MeasurementsScreen}
        />

        <Stack.Screen
          name="EditMeasurements"
          component={EditMeasurementsScreen}
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

        {/* ROOT STAFF ROUTES
            Retained to support any existing screens
            that currently navigate through the root stack. */}

        <Stack.Screen
          name="ManageGarments"
          component={ManageGarmentsScreen}
        />
        

        <Stack.Screen
          name="GarmentCategories"
          component={GarmentCategoriesScreen}
        />

        <Stack.Screen
          name="AddGarmentCategory"
          component={AddGarmentCategoryScreen}
        />

        <Stack.Screen
          name="EditGarmentCategory"
          component={EditGarmentCategoryScreen}
        />

        <Stack.Screen
          name="Garments"
          component={GarmentsScreen}
        />

        <Stack.Screen
          name="AddGarment"
          component={AddGarmentScreen}
        />

        <Stack.Screen
          name="EditGarment"
          component={EditGarmentScreen}
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
          name="AddFabric"
          component={AddFabricScreen}
        />

        <Stack.Screen
          name="EditFabric"
          component={EditFabricScreen}
        />

        <Stack.Screen
          name="GarmentDetails"
          component={GarmentDetailsScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}