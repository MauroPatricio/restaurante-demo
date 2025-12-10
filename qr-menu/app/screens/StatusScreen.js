import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import io from 'socket.io-client';

export default function StatusScreen() {
  const [msg, setMsg] = useState('Aguardando atualizações...');

  useEffect(() => {
    const socket = io('http://localhost:4000');
    socket.on('order-status', data => setMsg('Status atualizado: ' + data));
    return () => socket.disconnect();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>{msg}</Text>
    </View>
  );
}
