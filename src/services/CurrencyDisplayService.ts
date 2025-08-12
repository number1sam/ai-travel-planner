export interface CurrencyRate {
  from: string;
  to: string;
  rate: number;
  timestamp: string;
}

export interface PriceDisplay {
  native: {
    amount: number;
    currency: string;
    formatted: string;
  };
  usd: {
    amount: number;
    formatted: string;
    approximate: boolean;
  };
  gbp: {
    amount: number;
    formatted: string;
    approximate: boolean;
  };
  taxes_included: boolean;
  rate_timestamp: string;
}

export class CurrencyDisplayService {
  private rates: Map<string, Map<string, CurrencyRate>> = new Map();
  private lastUpdate: string = '';

  constructor() {
    this.initializeDefaultRates();
  }

  private initializeDefaultRates(): void {
    // Default rates (should be updated from API)
    const defaultRates = [
      { from: 'EUR', to: 'USD', rate: 1.09 },
      { from: 'EUR', to: 'GBP', rate: 0.85 },
      { from: 'USD', to: 'EUR', rate: 0.92 },
      { from: 'USD', to: 'GBP', rate: 0.78 },
      { from: 'GBP', to: 'EUR', rate: 1.18 },
      { from: 'GBP', to: 'USD', rate: 1.28 },
      // Add more currency pairs as needed
      { from: 'JPY', to: 'USD', rate: 0.0067 },
      { from: 'JPY', to: 'GBP', rate: 0.0052 },
      { from: 'CAD', to: 'USD', rate: 0.74 },
      { from: 'CAD', to: 'GBP', rate: 0.58 },
      { from: 'AUD', to: 'USD', rate: 0.67 },
      { from: 'AUD', to: 'GBP', rate: 0.52 },
      { from: 'CHF', to: 'USD', rate: 1.11 },
      { from: 'CHF', to: 'GBP', rate: 0.87 },
    ];

    const timestamp = new Date().toISOString();
    
    defaultRates.forEach(({ from, to, rate }) => {
      if (!this.rates.has(from)) {
        this.rates.set(from, new Map());
      }
      this.rates.get(from)!.set(to, {
        from,
        to,
        rate,
        timestamp
      });
    });

    this.lastUpdate = timestamp;
  }

  async updateRatesFromAPI(): Promise<void> {
    try {
      // In a real implementation, fetch from a currency API
      // For now, we'll simulate an API call
      const timestamp = new Date().toISOString();
      
      // Simulate fetching fresh rates
      const freshRates = await this.fetchCurrencyRates();
      
      freshRates.forEach(rate => {
        if (!this.rates.has(rate.from)) {
          this.rates.set(rate.from, new Map());
        }
        this.rates.get(rate.from)!.set(rate.to, {
          ...rate,
          timestamp
        });
      });

      this.lastUpdate = timestamp;
    } catch (error) {
      console.warn('Failed to update currency rates:', error);
      // Continue with cached/default rates
    }
  }

  private async fetchCurrencyRates(): Promise<CurrencyRate[]> {
    // Simulate API call - in production, call a real currency API
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          { from: 'EUR', to: 'USD', rate: 1.0845, timestamp: new Date().toISOString() },
          { from: 'EUR', to: 'GBP', rate: 0.8532, timestamp: new Date().toISOString() },
          { from: 'USD', to: 'GBP', rate: 0.7867, timestamp: new Date().toISOString() },
          // Add more pairs as needed
        ]);
      }, 100);
    });
  }

  convertPrice(
    amount: number, 
    fromCurrency: string, 
    toCurrency: string
  ): { amount: number; approximate: boolean } {
    if (fromCurrency === toCurrency) {
      return { amount, approximate: false };
    }

    const fromRates = this.rates.get(fromCurrency);
    if (!fromRates || !fromRates.has(toCurrency)) {
      // Try reverse conversion
      const toRates = this.rates.get(toCurrency);
      if (toRates && toRates.has(fromCurrency)) {
        const reverseRate = toRates.get(fromCurrency)!.rate;
        return {
          amount: Math.round((amount / reverseRate) * 100) / 100,
          approximate: true
        };
      }
      
      // Fallback: use USD as intermediary
      if (fromCurrency !== 'USD' && toCurrency !== 'USD') {
        const toUSD = this.convertPrice(amount, fromCurrency, 'USD');
        const final = this.convertPrice(toUSD.amount, 'USD', toCurrency);
        return {
          amount: final.amount,
          approximate: true
        };
      }

      // If all else fails, return original amount
      console.warn(`No exchange rate found for ${fromCurrency} to ${toCurrency}`);
      return { amount, approximate: true };
    }

    const rate = fromRates.get(toCurrency)!.rate;
    return {
      amount: Math.round((amount * rate) * 100) / 100,
      approximate: false
    };
  }

  formatPrice(amount: number, currency: string): string {
    const currencySymbols: Record<string, string> = {
      'USD': '$',
      'GBP': '£',
      'EUR': '€',
      'JPY': '¥',
      'CAD': 'C$',
      'AUD': 'A$',
      'CHF': 'CHF',
    };

    const symbol = currencySymbols[currency] || currency;
    
    // Format with appropriate decimal places
    if (currency === 'JPY') {
      // Japanese Yen doesn't use decimal places
      return `${symbol}${Math.round(amount).toLocaleString()}`;
    }
    
    return `${symbol}${amount.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  }

  createPriceDisplay(
    amount: number,
    currency: string,
    taxesIncluded: boolean = false
  ): PriceDisplay {
    const usdConversion = this.convertPrice(amount, currency, 'USD');
    const gbpConversion = this.convertPrice(amount, currency, 'GBP');

    return {
      native: {
        amount,
        currency,
        formatted: this.formatPrice(amount, currency)
      },
      usd: {
        amount: usdConversion.amount,
        formatted: this.formatPrice(usdConversion.amount, 'USD'),
        approximate: usdConversion.approximate || currency !== 'USD'
      },
      gbp: {
        amount: gbpConversion.amount,
        formatted: this.formatPrice(gbpConversion.amount, 'GBP'),
        approximate: gbpConversion.approximate || currency !== 'GBP'
      },
      taxes_included: taxesIncluded,
      rate_timestamp: this.lastUpdate
    };
  }

  formatPriceForDisplay(
    priceDisplay: PriceDisplay,
    perNight: boolean = true,
    showBoth: boolean = true
  ): string {
    const period = perNight ? '/night' : '';
    const taxNote = priceDisplay.taxes_included ? ' (taxes incl.)' : ' (taxes excl.)';

    if (!showBoth) {
      return `${priceDisplay.native.formatted}${period}${taxNote}`;
    }

    const approxNote = (priceDisplay.usd.approximate || priceDisplay.gbp.approximate) ? 'Approx. ' : '';
    
    return `${priceDisplay.native.formatted}${period} | ${approxNote}${priceDisplay.usd.formatted} | ${priceDisplay.gbp.formatted}${taxNote}`;
  }

  // Bulk conversion for multiple prices
  convertMultiplePrices(
    prices: Array<{ amount: number; currency: string }>,
    targetCurrencies: string[] = ['USD', 'GBP']
  ): Array<{ original: any; conversions: Record<string, { amount: number; approximate: boolean }> }> {
    return prices.map(price => {
      const conversions: Record<string, { amount: number; approximate: boolean }> = {};
      
      targetCurrencies.forEach(targetCurrency => {
        conversions[targetCurrency] = this.convertPrice(
          price.amount, 
          price.currency, 
          targetCurrency
        );
      });

      return {
        original: price,
        conversions
      };
    });
  }

  // Get rate information for transparency
  getRateInfo(fromCurrency: string, toCurrency: string): CurrencyRate | null {
    const fromRates = this.rates.get(fromCurrency);
    if (fromRates && fromRates.has(toCurrency)) {
      return fromRates.get(toCurrency)!;
    }
    return null;
  }

  // Check if rates are stale (older than 1 hour)
  areRatesStale(): boolean {
    if (!this.lastUpdate) return true;
    
    const lastUpdateTime = new Date(this.lastUpdate).getTime();
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    return lastUpdateTime < oneHourAgo;
  }

  // Get supported currencies
  getSupportedCurrencies(): string[] {
    const currencies = new Set<string>();
    
    for (const [from, toMap] of this.rates.entries()) {
      currencies.add(from);
      for (const to of toMap.keys()) {
        currencies.add(to);
      }
    }
    
    return Array.from(currencies).sort();
  }

  // Format price range
  formatPriceRange(
    minAmount: number,
    maxAmount: number,
    currency: string,
    showConversions: boolean = true
  ): string {
    const minDisplay = this.createPriceDisplay(minAmount, currency);
    const maxDisplay = this.createPriceDisplay(maxAmount, currency);

    if (!showConversions) {
      return `${minDisplay.native.formatted} - ${maxDisplay.native.formatted}`;
    }

    return `${minDisplay.native.formatted} - ${maxDisplay.native.formatted} | ${minDisplay.usd.formatted} - ${maxDisplay.usd.formatted} | ${minDisplay.gbp.formatted} - ${maxDisplay.gbp.formatted}`;
  }
}