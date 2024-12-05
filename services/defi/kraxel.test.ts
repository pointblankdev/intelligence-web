import { describe, it } from 'vitest';

import { KraxelService } from './kraxel';

const tokens = {
  welsh: 'SP3NE50GEXFG9SZGTT51P40X2CKYSZ5CC4ZTZ7A2G.welshcorgicoin-token',
  leo: 'SP1AY6K3PQV5MRT6R4S671NWW2FRVPKM0BR162CT6.leo-token',
};

describe('Kraxel PriceService', () => {
  const pricesService = KraxelService.getInstance(
    process.env.KRAXEL_API_URL || 'https://api.kraxel.io/v0'
  );

  describe('Pool Methods', () => {
    it('should return a pool list', async () => {
      const result = await pricesService.getAllPools();
      console.log('Pool list', result);
    });
  });

  describe('Price methods', () => {
    it('should return a price', async () => {
      const result = await pricesService.getPrice(tokens.welsh);
      console.log('Pool list', result);
    });

    it('should return a list of prices', async () => {
      const result = await pricesService.getPrices([tokens.welsh, tokens.leo]);
      console.log('Pool list', result);
    });
  });
}, 50000);
