import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function Tables(){
    const { t } = useTranslation();
    return <View><Text>{t('tables')}</Text></View>;
}
