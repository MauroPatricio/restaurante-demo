import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import io from 'socket.io-client';
import { useTranslation } from 'react-i18next';

export default function StatusScreen() {
  const { t } = useTranslation();
  const [msg, setMsg] = useState(t('waiting_updates'));

  useEffect(() => {
    const socket = io('http://localhost:4000');
    socket.on('order-status', data => setMsg(t('status_updated', { status: t(data) })));
    return () => socket.disconnect();
  }, [t]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>{msg}</Text>
    </View>
  );
}
