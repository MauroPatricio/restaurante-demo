import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, TouchableOpacity } from 'react-native';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../contexts/CurrencyContext';

export default function MenuEditor({ route }) {
  const { t } = useTranslation();
  const { convertAndFormat } = useCurrency();
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
      alert(t('fill_name_price'));
      return;
    }
    axios.post(`http://localhost:4000/api/menu/${restaurantId}`, { name, price: parseFloat(price) })
      .then(() => {
        setName('');
        setPrice('');
        loadMenu();
      })
      .catch(() => alert(t('error_add_item')));
  };

  const removeItem = (itemId) => {
    axios.delete(`http://localhost:4000/api/menu/${restaurantId}/${itemId}`)
      .then(loadMenu)
      .catch(() => alert(t('error_remove_item')));
  };

  useEffect(loadMenu, []);

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 10 }}>{t('menu_editor')}</Text>
      
      <TextInput
        placeholder={t('dish_name')}
        value={name}
        onChangeText={setName}
        style={{ borderWidth: 1, padding: 8, marginBottom: 8 }}
      />
      <TextInput
        placeholder={t('price')}
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        style={{ borderWidth: 1, padding: 8, marginBottom: 8 }}
      />
      <Button title={t('add_dish')} onPress={addItem} />

      <FlatList
        data={menu}
        keyExtractor={item => item._id}
        style={{ marginTop: 20 }}
        renderItem={({ item }) => (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderBottomWidth: 1 }}>
            <Text>{item.name} - {convertAndFormat(item.price)}</Text>
            <TouchableOpacity onPress={() => removeItem(item._id)}>
              <Text style={{ color: 'red' }}>{t('remove')}</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}
