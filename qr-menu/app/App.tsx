import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CartProvider } from './contexts/CartContext';
import { LoadingProvider } from './contexts/LoadingContext';

import HomeScreen from './screens/HomeScreen';
import CartScreen from './screens/CartScreen';
import CheckoutScreen from './screens/CheckoutScreen';
import OrderStatusScreen from './screens/OrderStatusScreen';
import FeedbackScreen from './screens/FeedbackScreen';
import DeliveryAddressScreen from './screens/DeliveryAddressScreen';
import './i18n';
import { useTranslation } from 'react-i18next';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function HomeTabs() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
        },
      }}
    >
      <Tab.Screen
        name="Menu"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => <span style={{ fontSize: 24 }}>{focused ? '🍽️' : '🍴'}</span>,
          headerShown: false,
          tabBarLabel: t('menu')
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarIcon: ({ focused }) => <span style={{ fontSize: 24 }}>{focused ? '🛒' : '🛍️'}</span>,
          tabBarLabel: t('cart')
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const { t } = useTranslation();
  return (
    <LoadingProvider>
      <CartProvider>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen
              name="Home"
              component={HomeTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Checkout"
              component={CheckoutScreen}
              options={{ title: t('checkout') }}
            />
            <Stack.Screen
              name="DeliveryAddress"
              component={DeliveryAddressScreen}
              options={{ title: t('delivery') }}
            />
            <Stack.Screen
              name="OrderStatus"
              component={OrderStatusScreen}
              options={{ title: t('order_tracking') }}
            />
            <Stack.Screen
              name="Feedback"
              component={FeedbackScreen}
              options={{ title: t('feedback_title') }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </CartProvider>
    </LoadingProvider>
  );
}
