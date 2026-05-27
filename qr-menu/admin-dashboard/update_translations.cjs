const fs = require('fs');
const path = require('path');
const i18nPath = path.join(process.cwd(), 'src/i18n/locales');
const languages = ['en', 'pt', 'es', 'fr', 'zh'];

const textsToAdd = {
    'pt': {
        'subscription_expired_message_premium': 'A sua subscrição premium expirou. Algumas funcionalidades estão agora limitadas.',
        'kitchen_display_system': 'Sistema de Display de Cozinha (KDS)',
        'kds_short': 'KDS',
        'orders_in_queue': 'Pedidos na Fila',
        'avg_prep_time': 'Tempo Médio Prep.',
        'completed_today': 'Concluídos Hoje',
        'open_kds': 'ABRIR KDS',
        'close_kds': 'FECHAR KDS',
        'pending_orders': 'Pendentes',
        'preparing_orders': 'A Preparar',
        'ready_orders': 'Prontos',
        'start_preparing': 'COMEÇAR A PREPARAR',
        'mark_ready': 'MARCAR COMO PRONTO',
        'no_orders': 'Sem pedidos nesta secção'
    },
    'en': {
        'subscription_expired_message_premium': 'Your premium subscription has expired. Some features are now limited.',
        'kitchen_display_system': 'Kitchen Display System (KDS)',
        'kds_short': 'KDS',
        'orders_in_queue': 'Orders in Queue',
        'avg_prep_time': 'Avg. Prep Time',
        'completed_today': 'Completed Today',
        'open_kds': 'OPEN KDS',
        'close_kds': 'CLOSE KDS',
        'pending_orders': 'Pending',
        'preparing_orders': 'Preparing',
        'ready_orders': 'Ready',
        'start_preparing': 'START PREPARING',
        'mark_ready': 'MARK AS READY',
        'no_orders': 'No orders in this section'
    },
    'es': {
        'subscription_expired_message_premium': 'Su suscripción premium ha expirado. Algunas funciones ahora están limitadas.',
        'kitchen_display_system': 'Sistema de Visualización de Cocina (KDS)',
        'kds_short': 'KDS',
        'orders_in_queue': 'Pedidos en Cola',
        'avg_prep_time': 'Tiempo Promedio Prep.',
        'completed_today': 'Completados Hoy',
        'open_kds': 'ABRIR KDS',
        'close_kds': 'CERRAR KDS',
        'pending_orders': 'Pendientes',
        'preparing_orders': 'Preparando',
        'ready_orders': 'Listos',
        'start_preparing': 'COMENZAR A PREPARAR',
        'mark_ready': 'MARCAR COMO LISTO',
        'no_orders': 'No hay pedidos en esta sección'
    },
    'fr': {
        'subscription_expired_message_premium': 'Votre abonnement premium a expiré. Certaines fonctionnalités sont désormais limitées.',
        'kitchen_display_system': 'Système d\'Affichage Cuisine (KDS)',
        'kds_short': 'KDS',
        'orders_in_queue': 'Commandes en Attente',
        'avg_prep_time': 'Temps Moyen Prép.',
        'completed_today': 'Terminées Aujourd\'hui',
        'open_kds': 'OUVRIR KDS',
        'close_kds': 'FERMER KDS',
        'pending_orders': 'En Attente',
        'preparing_orders': 'En Préparation',
        'ready_orders': 'Prêts',
        'start_preparing': 'COMMENCER LA PRÉPARATION',
        'mark_ready': 'MARQUER COMME PRÊT',
        'no_orders': 'Aucune commande dans cette section'
    },
    'zh': {
        'subscription_expired_message_premium': '您的高级订阅已过期。某些功能现在受到限制。',
        'kitchen_display_system': '厨房显示系统 (KDS)',
        'kds_short': 'KDS',
        'orders_in_queue': '排队订单',
        'avg_prep_time': '平均准备时间',
        'completed_today': '今日完成',
        'open_kds': '打开 KDS',
        'close_kds': '关闭 KDS',
        'pending_orders': '待处理',
        'preparing_orders': '准备中',
        'ready_orders': '已准备',
        'start_preparing': '开始准备',
        'mark_ready': '标记为已准备',
        'no_orders': '该部分没有订单'
    }
};

languages.forEach(lang => {
    const filePath = path.join(i18nPath, `${lang}.json`);
    if (fs.existsSync(filePath)) {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const toAdd = textsToAdd[lang] || textsToAdd['en'];
        Object.assign(content, toAdd);
        fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
        console.log(`Updated ${lang}.json`);
    }
});
