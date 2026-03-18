export const ALL_CURRENCIES = [
    { code: "MZN", name: "Metical Moçambicano", symbol: "MT" },
    { code: "USD", name: "US Dollar", symbol: "$" },
    { code: "EUR", name: "Euro", symbol: "€" },
    { code: "ZAR", name: "South African Rand", symbol: "R" },
    { code: "GBP", name: "British Pound", symbol: "£" },
    { code: "BRL", name: "Brazilian Real", symbol: "R$" },
    { code: "AOA", name: "Angolan Kwanza", symbol: "Kz" },
    { code: "CVE", name: "Cape Verdean Escudo", symbol: "$" },
    { code: "STN", name: "São Tomé/Príncipe Dobra", symbol: "Db" },
    { code: "JPY", name: "Japanese Yen", symbol: "¥" },
    { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
    { code: "INR", name: "Indian Rupee", symbol: "₹" },
    { code: "AUD", name: "Australian Dollar", symbol: "A$" },
    { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
    { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
    { code: "MXN", name: "Mexican Peso", symbol: "$" },
    { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
    { code: "SEK", name: "Swedish Krona", symbol: "kr" },
    { code: "NOK", name: "Norwegian Krone", symbol: "kr" },
    { code: "DKK", name: "Danish Krone", symbol: "kr" },
    { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
    { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$" },
    { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$" },
    { code: "TRY", name: "Turkish Lira", symbol: "₺" },
    { code: "RUB", name: "Russian Ruble", symbol: "₽" },
    { code: "THB", name: "Thai Baht", symbol: "฿" },
    { code: "KRW", name: "South Korean Won", symbol: "₩" },
    { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp" }
];

export const getCurrencyDetails = (code) => {
    return ALL_CURRENCIES.find(c => c.code === code) || { code, name: code, symbol: code };
};
