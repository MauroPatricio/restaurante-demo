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

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function HomeTabs() {
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
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarIcon: ({ focused }) => <span style={{ fontSize: 24 }}>{focused ? '🛒' : '🛍️'}</span>,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
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
              options={{ title: 'Checkout' }}
            />
            <Stack.Screen
              name="DeliveryAddress"
              component={DeliveryAddressScreen}
              options={{ title: 'Delivery Address' }}
            />
            <Stack.Screen
              name="OrderStatus"
              component={OrderStatusScreen}
              options={{ title: 'Order Status' }}
            />
            <Stack.Screen
              name="Feedback"
              component={FeedbackScreen}
              options={{ title: 'Share Feedback' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </CartProvider>
    </LoadingProvider>
  );
}
