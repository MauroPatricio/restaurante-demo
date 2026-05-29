const fs = require('fs');

function extractKeys(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');
  const keys = [];
  const regex = /"([^"]+)"\s*:/g;
  let m;
  while ((m = regex.exec(content)) !== null) {
    keys.push(m[1]);
  }
  return [...new Set(keys)];
}

function extractObj(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');
  const obj = {};
  const regex = /"([^"]+)"\s*:\s*"([^"]*)"/g;
  let m;
  while ((m = regex.exec(content)) !== null) {
    obj[m[1]] = m[2];
  }
  return obj;
}

const pt = extractKeys('admin-dashboard/public/locales/pt/translation.json');
const en = extractKeys('admin-dashboard/public/locales/en/translation.json');
const es = extractKeys('admin-dashboard/public/locales/es/translation.json');
const fr = extractKeys('admin-dashboard/public/locales/fr/translation.json');

console.log('PT:', pt.length, 'keys');
console.log('EN:', en.length, 'keys');
console.log('ES:', es.length, 'keys');
console.log('FR:', fr.length, 'keys');

const missingEN = pt.filter(k => !en.includes(k));
const missingES = pt.filter(k => !es.includes(k));
const missingFR = pt.filter(k => !fr.includes(k));

console.log('\nMissing in EN (' + missingEN.length + '):', missingEN.join(', '));
console.log('\nMissing in ES (' + missingES.length + '):', missingES.join(', '));
console.log('\nMissing in FR (' + missingFR.length + '):', missingFR.join(', '));

// Also check for values that are still in Portuguese in EN, ES, FR (i.e., values that are identical to PT key but shouldn't be)
const ptObj = extractObj('admin-dashboard/public/locales/pt/translation.json');
const enObj = extractObj('admin-dashboard/public/locales/en/translation.json');
const esObj = extractObj('admin-dashboard/public/locales/es/translation.json');
const frObj = extractObj('admin-dashboard/public/locales/fr/translation.json');

// Values that look like a key (i.e., have underscores, all_lowercase) - these are untranslated
function isUntranslated(value, key) {
  // A value is "untranslated" if it equals the key itself
  return value === key;
}

const enUntranslated = Object.entries(enObj).filter(([k, v]) => isUntranslated(v, k));
const esUntranslated = Object.entries(esObj).filter(([k, v]) => isUntranslated(v, k));
const frUntranslated = Object.entries(frObj).filter(([k, v]) => isUntranslated(v, k));

console.log('\nUntranslated (value=key) in EN (' + enUntranslated.length + '):', enUntranslated.map(([k]) => k).join(', '));
console.log('\nUntranslated (value=key) in ES (' + esUntranslated.length + '):', esUntranslated.map(([k]) => k).join(', '));
console.log('\nUntranslated (value=key) in FR (' + frUntranslated.length + '):', frUntranslated.map(([k]) => k).join(', '));
