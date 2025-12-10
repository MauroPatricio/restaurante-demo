import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, TouchableOpacity } from 'react-native';
import axios from 'axios';

export default function MenuEditor({ route }) {
  const { restaurantId = 'RESTAURANT_ID_FAKE' } = route.params || {};
  const [menu, setMenu] = useState([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');

  const loadMenu = () => {
    axios.get(`http://localhost:4000/api/menu/${restaurantId}`)
      .then(res => setMenu(res.data))
      .catch(() => setMenu([]));
  };

  const addItem = () => {
    if (!name || !price) {
      alert('Preencha nome e preço!');
      return;
    }
    axios.post(`http://localhost:4000/api/menu/${restaurantId}`, { name, price: parseFloat(price) })
      .then(() => {
        setName('');
        setPrice('');
        loadMenu();
      })
      .catch(() => alert('Erro ao adicionar item'));
  };

  const removeItem = (itemId) => {
    axios.delete(`http://localhost:4000/api/menu/${restaurantId}/${itemId}`)
      .then(loadMenu)
      .catch(() => alert('Erro ao remover item'));
  };

  useEffect(loadMenu, []);

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 10 }}>Editor de Menu</Text>
      
      <TextInput
        placeholder="Nome do prato"
        value={name}
        onChangeText={setName}
        style={{ borderWidth: 1, padding: 8, marginBottom: 8 }}
      />
      <TextInput
        placeholder="Preço"
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        style={{ borderWidth: 1, padding: 8, marginBottom: 8 }}
      />
      <Button title="Adicionar prato" onPress={addItem} />

      <FlatList
        data={menu}
        keyExtractor={item => item._id}
        style={{ marginTop: 20 }}
        renderItem={({ item }) => (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderBottomWidth: 1 }}>
            <Text>{item.name} - ${item.price}</Text>
            <TouchableOpacity onPress={() => removeItem(item._id)}>
              <Text style={{ color: 'red' }}>Remover</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}
