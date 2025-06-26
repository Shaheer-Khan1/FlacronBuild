import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export interface ScrapingAttempt {
  url: string;
  timestamp: Date;
  success: boolean;
  dataFound: boolean;
  responseStatus?: number;
  error?: string;
  dataExtracted?: any;
}

export class ScrapingVerification {
  private attempts: ScrapingAttempt[] = [];

  async verifyRealScraping(location: string): Promise<{
    isUsingRealData: boolean;
    attempts: ScrapingAttempt[];
    evidence: string[];
    fallbackReason?: string;
  }> {
    console.log(`[VERIFICATION] Starting real data verification for ${location}`);
    this.attempts = [];
    const evidence: string[] = [];
    let realDataFound = false;

    // 1. Test actual web scraping from real construction cost sources
    await this.attemptENRScraping(evidence);
    await this.attemptHomeDepotScraping(evidence);
    await this.attemptBLSScraping(location, evidence);
    await this.attemptGovPermitScraping(location, evidence);

    // Check if any real data was found
    realDataFound = this.attempts.some(attempt => attempt.success && attempt.dataFound);

    const result = {
      isUsingRealData: realDataFound,
      attempts: this.attempts,
      evidence,
      fallbackReason: realDataFound ? undefined : 'No accessible real-time data sources found'
    };

    console.log(`[VERIFICATION] Verification complete: ${realDataFound ? 'REAL DATA' : 'FALLBACK DATA'}`);
    return result;
  }

  private async attemptENRScraping(evidence: string[]): Promise<void> {
    const url = 'https://www.enr.com/economics';
    const attempt: ScrapingAttempt = {
      url,
      timestamp: new Date(),
      success: false,
      dataFound: false
    };

    try {
      console.log('[VERIFICATION] Testing ENR Construction Cost Index access...');
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      attempt.responseStatus = response.status;

      if (response.ok) {
        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Look for construction cost data indicators
        const costIndicators = $('table, .cost-data, .price-index, [data-cost]').length;
        const hasNumbers = /\$\d+|\d+\.\d+/.test(html);
        
        if (costIndicators > 0 || hasNumbers) {
          attempt.success = true;
          attempt.dataFound = true;
          attempt.dataExtracted = { costIndicators, hasNumbers };
          evidence.push(`✓ ENR: Found ${costIndicators} cost data elements`);
        } else {
          evidence.push(`✗ ENR: Connected but no cost data found`);
        }
      } else {
        evidence.push(`✗ ENR: HTTP ${response.status} - ${response.statusText}`);
      }
    } catch (error) {
      attempt.error = (error as Error).message;
      evidence.push(`✗ ENR: Network error - ${attempt.error}`);
    }

    this.attempts.push(attempt);
  }

  private async attemptHomeDepotScraping(evidence: string[]): Promise<void> {
    const url = 'https://www.homedepot.com/building-materials';
    const attempt: ScrapingAttempt = {
      url,
      timestamp: new Date(),
      success: false,
      dataFound: false
    };

    try {
      console.log('[VERIFICATION] Testing Home Depot material pricing access...');
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      attempt.responseStatus = response.status;

      if (response.ok) {
        const html = await response.text();
        const $ = cheerio.load(html);
        
        const priceElements = $('.price, [data-price], .product-price').length;
        const productElements = $('.product, .item, [data-product]').length;
        
        if (priceElements > 0 || productElements > 0) {
          attempt.success = true;
          attempt.dataFound = true;
          attempt.dataExtracted = { priceElements, productElements };
          evidence.push(`✓ Home Depot: Found ${priceElements} price elements, ${productElements} products`);
        } else {
          evidence.push(`✗ Home Depot: Connected but no product data found`);
        }
      } else {
        evidence.push(`✗ Home Depot: HTTP ${response.status}`);
      }
    } catch (error) {
      attempt.error = (error as Error).message;
      evidence.push(`✗ Home Depot: ${attempt.error}`);
    }

    this.attempts.push(attempt);
  }

  private async attemptBLSScraping(location: string, evidence: string[]): Promise<void> {
    const stateCode = this.getStateCode(location);
    const url = `https://www.bls.gov/oes/current/oes_${stateCode}.htm`;
    const attempt: ScrapingAttempt = {
      url,
      timestamp: new Date(),
      success: false,
      dataFound: false
    };

    try {
      console.log(`[VERIFICATION] Testing BLS wage data for ${stateCode}...`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      attempt.responseStatus = response.status;

      if (response.ok) {
        const html = await response.text();
        const $ = cheerio.load(html);
        
        const wageData = $('table tr td').filter((_, el) => {
          const text = $(el).text();
          return text.includes('Construction') || text.includes('carpenter') || text.includes('electrician');
        }).length;
        
        if (wageData > 0) {
          attempt.success = true;
          attempt.dataFound = true;
          attempt.dataExtracted = { wageDataElements: wageData };
          evidence.push(`✓ BLS: Found ${wageData} construction wage data points`);
        } else {
          evidence.push(`✗ BLS: Connected but no wage data found`);
        }
      } else {
        evidence.push(`✗ BLS: HTTP ${response.status}`);
      }
    } catch (error) {
      attempt.error = (error as Error).message;
      evidence.push(`✗ BLS: ${attempt.error}`);
    }

    this.attempts.push(attempt);
  }

  private async attemptGovPermitScraping(location: string, evidence: string[]): Promise<void> {
    const citySlug = location.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const url = `https://${citySlug}.gov/permits`;
    const attempt: ScrapingAttempt = {
      url,
      timestamp: new Date(),
      success: false,
      dataFound: false
    };

    try {
      console.log(`[VERIFICATION] Testing government permit data for ${citySlug}...`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      attempt.responseStatus = response.status;

      if (response.ok) {
        const html = await response.text();
        const $ = cheerio.load(html);
        
        const permitFees = $('.fee, .cost, .price, [data-fee]').length;
        const permitTypes = $('.permit-type, .building-permit').length;
        
        if (permitFees > 0 || permitTypes > 0) {
          attempt.success = true;
          attempt.dataFound = true;
          attempt.dataExtracted = { permitFees, permitTypes };
          evidence.push(`✓ ${citySlug}.gov: Found ${permitFees} fee elements, ${permitTypes} permit types`);
        } else {
          evidence.push(`✗ ${citySlug}.gov: Connected but no permit data found`);
        }
      } else {
        evidence.push(`✗ ${citySlug}.gov: HTTP ${response.status}`);
      }
    } catch (error) {
      attempt.error = (error as Error).message;
      evidence.push(`✗ ${citySlug}.gov: ${attempt.error}`);
    }

    this.attempts.push(attempt);
  }

  private getStateCode(location: string): string {
    const stateCodes: { [key: string]: string } = {
      'california': 'ca', 'new york': 'ny', 'texas': 'tx', 'florida': 'fl',
      'san francisco': 'ca', 'los angeles': 'ca', 'new york city': 'ny',
      'chicago': 'il', 'seattle': 'wa', 'miami': 'fl', 'denver': 'co'
    };
    
    const locationLower = location.toLowerCase();
    for (const [state, code] of Object.entries(stateCodes)) {
      if (locationLower.includes(state)) {
        return code;
      }
    }
    
    return 'us';
  }

  getVerificationSummary(): string {
    const successful = this.attempts.filter(a => a.success && a.dataFound).length;
    const total = this.attempts.length;
    
    return `Verification: ${successful}/${total} data sources accessible with real data`;
  }
}

export const scrapingVerification = new ScrapingVerification();