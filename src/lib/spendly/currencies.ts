export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  locale: string;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: "INR", symbol: "₹", name: "Indian Rupee", locale: "en-IN" },
  { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US" },
  { code: "EUR", symbol: "€", name: "Euro", locale: "de-DE" },
  { code: "GBP", symbol: "£", name: "British Pound", locale: "en-GB" },
  { code: "AED", symbol: "د.إ ", name: "UAE Dirham", locale: "en-AE" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", locale: "en-AU" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar", locale: "en-CA" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar", locale: "en-SG" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", locale: "ja-JP" },
  { code: "CNY", symbol: "CN¥", name: "Chinese Yuan", locale: "zh-CN" },
  { code: "ZAR", symbol: "R", name: "South African Rand", locale: "en-ZA" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira", locale: "en-NG" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real", locale: "pt-BR" },
  { code: "MXN", symbol: "MX$", name: "Mexican Peso", locale: "es-MX" },
  { code: "CHF", symbol: "CHF ", name: "Swiss Franc", locale: "de-CH" },
  { code: "SEK", symbol: "kr ", name: "Swedish Krona", locale: "sv-SE" },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar", locale: "en-NZ" },
  { code: "PKR", symbol: "₨", name: "Pakistani Rupee", locale: "en-PK" },
  { code: "LKR", symbol: "Rs ", name: "Sri Lankan Rupee", locale: "en-LK" },
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka", locale: "en-BD" },
  { code: "PHP", symbol: "₱", name: "Philippine Peso", locale: "en-PH" },
  { code: "IDR", symbol: "Rp ", name: "Indonesian Rupiah", locale: "id-ID" },
  { code: "MYR", symbol: "RM ", name: "Malaysian Ringgit", locale: "ms-MY" },
  { code: "KRW", symbol: "₩", name: "South Korean Won", locale: "ko-KR" },
];

export const DEFAULT_CURRENCY_CODE = "INR";

export function findCurrency(code?: string): CurrencyInfo {
  return (
    CURRENCIES.find((x) => x.code === code) ??
    (CURRENCIES[0] as CurrencyInfo)
  );
}

export function findCurrencyBySymbol(symbol: string): CurrencyInfo | undefined {
  return CURRENCIES.find((x) => x.symbol.trim() === symbol.trim());
}
