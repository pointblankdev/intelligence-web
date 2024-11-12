import { describe, it } from 'vitest';

import { MarketplaceService } from './marketplace';

// Contract addresses for testing
const MARKETPLACE_ADDRESS = 'SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS';
const MARKETPLACE_CONTRACT = 'marketplace-v6';

// Known NFT contracts for testing
const NFT_CONTRACTS = {
  PUNK: 'SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS.welsh-punk',
  SCROLL: 'SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS.spell-scrolls-fire-bolt',
} as const;

// Common test IDs
const TEST_IDS = {
  FIRST: 2,
  MIDDLE: 50,
  LAST: 100,
} as const;

describe('MarketplaceService', () => {
  const service = new MarketplaceService();

  describe('Listing Information', () => {
    it('should get single listing', async () => {
      const result = await service.getListing(
        MARKETPLACE_ADDRESS,
        MARKETPLACE_CONTRACT,
        NFT_CONTRACTS.SCROLL,
        TEST_IDS.FIRST
      );
      console.log('Single listing:', result);
    });

    it('should get multiple listings', async () => {
      const queries = [
        {
          marketplaceAddress: MARKETPLACE_ADDRESS,
          marketplaceContract: MARKETPLACE_CONTRACT,
          nftContract: NFT_CONTRACTS.PUNK,
          tokenId: TEST_IDS.FIRST,
        },
        {
          marketplaceAddress: MARKETPLACE_ADDRESS,
          marketplaceContract: MARKETPLACE_CONTRACT,
          nftContract: NFT_CONTRACTS.SCROLL,
          tokenId: TEST_IDS.MIDDLE,
        },
      ];
      const result = await service.batchGetListings(queries);
      console.log('Multiple listings:', result);
    });
  }, 20000);

  describe('Royalty Information', () => {
    it('should get royalty amount', async () => {
      const result = await service.getRoyaltyAmount(
        MARKETPLACE_ADDRESS,
        MARKETPLACE_CONTRACT,
        NFT_CONTRACTS.PUNK
      );
      console.log('Royalty amount:', result);
    });
  });

  describe('Error Cases', () => {
    it('should handle non-existent listing', async () => {
      try {
        await service.getListing(
          MARKETPLACE_ADDRESS,
          MARKETPLACE_CONTRACT,
          NFT_CONTRACTS.PUNK,
          999999
        );
      } catch (error) {
        console.log('Expected error for non-existent listing:', error);
      }
    });

    it('should handle invalid contract address', async () => {
      try {
        await service.getRoyaltyAmount(
          MARKETPLACE_ADDRESS,
          MARKETPLACE_CONTRACT,
          'SP000000000000000000000000000.invalid'
        );
      } catch (error) {
        console.log('Expected error for invalid contract:', error);
      }
    });
  });
});
