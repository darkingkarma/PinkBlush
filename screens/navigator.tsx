import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Text,
  View,
} from 'react-native';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import WelcomeScreen from './customer/welcome';
import LoginScreen from './customer/login';
import RegisterScreen from './customer/register';
import HomeScreen from './customer/home';
import ProfileScreen from './customer/customer-profile/profile';
import MeasurementsScreen from './customer/customer-profile/measurements';
import EditMeasurementsScreen from './customer/customer-profile/edit-measurements';
import StaffDashboard from './staff/dashboard';

import GarmentCategoriesScreen from './staff/product/garment-categories';
import AddGarmentCategoryScreen from './staff/product/add-garment-category';
import EditGarmentCategoryScreen from './staff/product/edit-garment-category';

import ManageGarmentsScreen from './staff/product/manage-garments';
import GarmentsScreen from './staff/product/garment';
import AddGarmentScreen from './staff/product/add-garment';
import EditGarmentScreen from './staff/product/edit-garment';

import GarmentPartsScreen from './staff/product/garment-parts';
import AddGarmentPartScreen from './staff/product/add-garment-part';
import EditGarmentPartScreen from './staff/product/edit-garment-part';

import DesignsScreen from './staff/product/designs';
import AddDesignScreen from './staff/product/add-design';
import EditDesignScreen from './staff/product/edit-design';

import FabricsScreen from './staff/product/fabrics';
import AddFabricScreen from './staff/product/add-fabric';
import EditFabricScreen from './staff/product/edit-fabric';

import ManageGarmentFabricsScreen from './staff/product/manage-garment-fabrics';

import GarmentDetailsScreen from './staff/product/garment-details';

import { supabase } from '../supabase';

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  Main: undefined;
  StaffDashboard: undefined;
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
  Measurements: undefined;
  EditMeasurements: undefined;
  AddGarment: undefined;
  EditGarment: { garment: { id: string; name: string; description: string | null; available: boolean; category_id: string;image_url: string | null; }; };

  GarmentParts: undefined;
  AddGarmentPart: undefined;
  EditGarmentPart: { part: { id: string; garment_id: string; name: string; description: string | null; price: number; gender: string; available: boolean; }; };

  Designs: undefined;
  AddDesign: undefined;
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
  EditFabric: { fabric: { id: string; name: string; description: string | null; image_url: string | null; price_addition: number; available: boolean; }; };

  ManageGarmentFabrics: undefined;

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

};
 
export type MainTabParamList = {
  Home: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 22, color }}>⌂</Text>
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>👤</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!session?.user) {
          setUserRole(null);
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        setUserRole(profile?.role || 'customer');
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      setUserRole(null);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    setUserRole(profile?.role || 'customer');
    setLoading(false);
  };

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

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {!userRole && (
          <>
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
          </>
        )}

        {userRole === 'customer' && (
          <>
            <Stack.Screen
              name="Main"
              component={MainTabs}
            />

            <Stack.Screen
              name="Measurements"
              component={MeasurementsScreen}
            />

            <Stack.Screen
              name="EditMeasurements"
              component={EditMeasurementsScreen}
            />
          </>
        )}

        {userRole === 'staff' && (
          <>
            <Stack.Screen
              name="StaffDashboard"
              component={StaffDashboard}
            />

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
            <Stack.Screen name="EditGarment" component={EditGarmentScreen} />

            <Stack.Screen
              name="GarmentParts"
              component={GarmentPartsScreen}
            />

            <Stack.Screen
              name="AddGarmentPart"
              component={AddGarmentPartScreen}
            />
            <Stack.Screen name="EditGarmentPart" component={EditGarmentPartScreen} />

            <Stack.Screen
              name="Designs"
              component={DesignsScreen}
            />

            <Stack.Screen
              name="AddDesign"
              component={AddDesignScreen}
            />

            <Stack.Screen
              name="EditDesign"
              component={EditDesignScreen}
            />
            
            <Stack.Screen name="Fabrics" component={FabricsScreen} /> 
            <Stack.Screen name="AddFabric" component={AddFabricScreen} />

            <Stack.Screen
              name="EditFabric"
              component={EditFabricScreen}
            />

            <Stack.Screen
              name="ManageGarmentFabrics"
              component={ManageGarmentFabricsScreen}
            />

            <Stack.Screen
              name="GarmentDetails"
              component={GarmentDetailsScreen}
            />

          </>
          
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
