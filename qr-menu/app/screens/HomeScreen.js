import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { menuAPI } from '../services/api';
import { useCart } from '../contexts/CartContext';
import MenuCard from '../components/MenuCard';

export default function HomeScreen({ navigation }) {
  const [menu, setMenu] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasPermission, setHasPermission] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);

  const { restaurantId, tableId, setContext, addItem } = useCart();

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    if (restaurantId) {
      fetchMenu();
      fetchCategories();
    }
  }, [restaurantId, selectedCategory]);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const params = selectedCategory !== 'all' ? { category: selectedCategory } : {};
      const response = await menuAPI.getMenu(restaurantId || 'FAKE_ID', params);
      setMenu(response.data.items || response.data || []);
    } catch (error) {
      console.error('Failed to fetch menu:', error);
      // Fallback to demo data
      setMenu([
        {
          _id: '1',
          name: 'Pizza Margherita',
          description: 'Classic tomato sauce, mozzarella, and fresh basil',
          price: 350,
          category: 'Main Course',
          available: true,
          photo: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400'
        },
        {
          _id: '2',
          name: 'Spaghetti Carbonara',
          description: 'Creamy pasta with bacon and parmesan',
          price: 420,
          category: 'Main Course',
          available: true,
          photo: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400'
        },
        {
          _id: '3',
          name: 'Tiramisu',
          description: 'Italian coffee-flavored dessert',
          price: 180,
          category: 'Dessert',
          available: true,
          photo: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400'
        },
        {
          _id: '4',
          name: 'Caesar Salad',
          description: 'Fresh romaine lettuce with Caesar dressing',
          price: 250,
          category: 'Appetizer',
          available: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await menuAPI.getCategories(restaurantId || 'FAKE_ID');
      setCategories(response.data.categories || []);
    } catch (error) {
      setCategories(['Appetizer', 'Main Course', 'Dessert', 'Drinks']);
    }
  };

  const handleBarCodeScanned = ({ data }) => {
    setScanning(false);
    try {
      const parsed = JSON.parse(data);
      setContext(parsed.restaurantId, parsed.tableId);
      alert(`Table ${parsed.tableId} selected!`);
    } catch {
      alert('Invalid QR code');
    }
  };

  const handleAddToCart = (item) => {
    addItem(item, 1, []);
    alert(`${item.name} added to cart!`);
  };

  const filteredMenu = menu.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (scanning) {
    return (
      <BarCodeScanner
        onBarCodeScanned={handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Menu</Text>
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => setScanning(true)}
        >
          <Text style={styles.scanButtonText}>📷 Scan QR</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search menu..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Category Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
      >
        <TouchableOpacity
          style={[
            styles.categoryTab,
            selectedCategory === 'all' && styles.categoryTabActive
          ]}
          onPress={() => setSelectedCategory('all')}
        >
          <Text style={[
            styles.categoryTabText,
            selectedCategory === 'all' && styles.categoryTabTextActive
          ]}>
            All
          </Text>
        </TouchableOpacity>

        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryTab,
              selectedCategory === category && styles.categoryTabActive
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={[
              styles.categoryTabText,
              selectedCategory === category && styles.categoryTabTextActive
            ]}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Menu List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading menu...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredMenu}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <MenuCard
              item={item}
              onPress={() => navigation.navigate('ItemDetail', { item })}
              onAddToCart={handleAddToCart}
            />
          )}
          contentContainerStyle={styles.menuList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No items found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  scanButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  searchInput: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 16,
  },
  categoriesContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  categoryTabActive: {
    backgroundColor: '#2563eb',
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  categoryTabTextActive: {
    color: '#fff',
  },
  menuList: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
  },
});
