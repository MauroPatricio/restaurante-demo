const fs = require('fs');

const pt = JSON.parse(fs.readFileSync('d:\\Projectos\\restaurante-demo\\qr-menu\\admin-dashboard\\public\\locales\\pt\\translation.json', 'utf8'));

console.log("global_owner_dashboard =", pt.global_owner_dashboard);
console.log("Buffer:", Buffer.from(pt.global_owner_dashboard, 'utf8').toString('hex'));
