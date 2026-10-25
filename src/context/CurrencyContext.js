import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY = '@snapit/currency';
const DEFAULT_CURRENCY = 'INR';

export const CURRENCY_OPTIONS = [
  { label: 'INR ₹', value: 'INR', locale: 'en-IN', symbol: '₹' },
  { label: 'USD $', value: 'USD', locale: 'en-US', symbol: '$' },
  { label: 'EUR €', value: 'EUR', locale: 'de-DE', symbol: '€' },
  { label: 'GBP £', value: 'GBP', locale: 'en-GB', symbol: '£' },
  { label: 'AED د.إ', value: 'AED', locale: 'ar-AE', symbol: 'د.إ' },
  { label: 'PKR ₨', value: 'PKR', locale: 'en-PK', symbol: '₨' },
  { label: 'SAR ﷼', value: 'SAR', locale: 'ar-SA', symbol: '﷼' },
  { label: 'AUD $', value: 'AUD', locale: 'en-AU', symbol: 'A$' },
  { label: 'CAD $', value: 'CAD', locale: 'en-CA', symbol: 'C$' },
  { label: 'SGD $', value: 'SGD', locale: 'en-SG', symbol: 'S$' },
];

const CurrencyContext = createContext(null);

function isSupported(code) {
  return CURRENCY_OPTIONS.some(option => option.value === code);
}

async function readStoredCurrency() {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isSupported(stored)) return stored;
    }
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    return isSupported(stored) ? stored : DEFAULT_CURRENCY;
  } catch {
    return DEFAULT_CURRENCY;
  }
}

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(DEFAULT_CURRENCY);

  useEffect(() => {
    let active = true;
    readStoredCurrency().then(code => {
      if (active) setCurrencyState(code);
    });
    return () => {
      active = false;
    };
  }, []);

  const setCurrency = useCallback(code => {
    if (!isSupported(code)) return;
    setCurrencyState(code);
    AsyncStorage.setItem(STORAGE_KEY, code).catch(() => {});
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, code);
      } catch {
        // localStorage can be unavailable in private mode; AsyncStorage still runs.
      }
    }
  }, []);

  const currencyOption = useMemo(
    () => CURRENCY_OPTIONS.find(option => option.value === currency) || CURRENCY_OPTIONS[0],
    [currency]
  );

  const formatCurrency = useCallback(
    value => {
      if (value === null || value === undefined || value === '') return null;
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return null;
      try {
        return new Intl.NumberFormat(currencyOption.locale, {
          style: 'currency',
          currency: currencyOption.value,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(numeric);
      } catch {
        return `${currencyOption.symbol}${numeric.toFixed(2)}`;
      }
    },
    [currencyOption]
  );

  const value = useMemo(
    () => ({
      currency,
      setCurrency,
      currencyOption,
      currencySymbol: currencyOption.symbol,
      formatCurrency,
    }),
    [currency, setCurrency, currencyOption, formatCurrency]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used inside CurrencyProvider');
  }
  return context;
}
