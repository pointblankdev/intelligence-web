import { describe, it } from 'vitest';

import { DexReadService } from './univ2-dex';

// Contract addresses and names for testing
const DEX_CORE_ADDRESS = 'SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS';
const DEX_CORE_CONTRACT = 'univ2-core';
const DEX_ROUTER_ADDRESS = 'SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS';
const DEX_ROUTER_CONTRACT = 'univ2-router';

// Known tokens for testing
const TOKENS = {
  CHA: 'SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS.charisma-token',
  SYN_WELSH: 'SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS.synthetic-welsh',
  STX: 'SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS.wstx',
  UPDOG: 'SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS.up-dog',
} as const;

// Common test amounts
const TEST_AMOUNTS = {
  SMALL: BigInt('1000000'),
  MEDIUM: BigInt('10000000'),
  LARGE: BigInt('100000000'),
} as const;

describe('DexReadService', () => {
  const service = new DexReadService(
    DEX_CORE_ADDRESS,
    DEX_CORE_CONTRACT,
    DEX_ROUTER_ADDRESS,
    DEX_ROUTER_CONTRACT
  );

  describe('Pool Information Methods', () => {
    it('should get total number of pools', async () => {
      const result = await service.getNumberOfPools();
      console.log('Total number of pools:', result);
    });

    it('should get pool by ID', async () => {
      const result = await service.getPoolById('1');
      console.log('Pool by ID:', result);
    });

    it('should get pool by tokens', async () => {
      const result = await service.getPool(TOKENS.CHA, TOKENS.SYN_WELSH);
      console.log('Pool by tokens:', result);
    });

    it('should get multiple pools', async () => {
      const ids: string[] = ['1', '2', '3'];
      const result = await service.getPools(ids);
      console.log('Multiple pools:', result);
    });
  }, 20000);

  describe('Swap Calculation Methods', () => {
    it('should get direct swap quote', async () => {
      const result = await service.getSwapQuote(
        TOKENS.CHA,
        TOKENS.SYN_WELSH,
        TEST_AMOUNTS.SMALL
      );
      console.log('Direct swap quote:', result);
    });

    it('should get exact output swap quote', async () => {
      const result = await service.getSwapQuoteForExactOutput(
        TOKENS.CHA,
        TOKENS.SYN_WELSH,
        TEST_AMOUNTS.SMALL
      );
      console.log('Exact output swap quote:', result);
    });

    it('should get multi-hop quote', async () => {
      const result = await service.getMultiHopQuote(
        [TOKENS.STX, TOKENS.CHA, TOKENS.SYN_WELSH],
        TEST_AMOUNTS.SMALL
      );
      console.log('Multi-hop quote:', result);
    });

    it('should get multi-hop exact output quote', async () => {
      const result = await service.getMultiHopQuoteForExactOutput(
        [TOKENS.STX, TOKENS.CHA, TOKENS.SYN_WELSH],
        TEST_AMOUNTS.SMALL
      );
      console.log('Multi-hop exact output quote:', result);
    });

    it('should batch get swap quotes', async () => {
      const queries = [
        {
          path: [TOKENS.CHA, TOKENS.SYN_WELSH],
          amountIn: TEST_AMOUNTS.SMALL,
        },
        {
          path: [TOKENS.STX, TOKENS.CHA],
          amountIn: TEST_AMOUNTS.MEDIUM,
        },
        {
          path: [TOKENS.STX, TOKENS.CHA, TOKENS.SYN_WELSH],
          amountIn: TEST_AMOUNTS.LARGE,
        },
      ];
      const result = await service.batchGetQuotes(queries);
      console.log('Batch quotes:', result);
    });
  });

  describe('Liquidity Addition Methods', () => {
    it('should get liquidity quote', async () => {
      const result = await service.getLiquidityQuote(
        '1',
        TEST_AMOUNTS.SMALL,
        TEST_AMOUNTS.SMALL,
        BigInt('0'),
        BigInt('0')
      );
      console.log('Liquidity quote:', result);
    });

    it('should calculate liquidity tokens', async () => {
      const result = await service.calculateLiquidityTokens(
        '1',
        TEST_AMOUNTS.MEDIUM,
        TEST_AMOUNTS.MEDIUM
      );
      console.log('Calculated liquidity tokens:', result.toString());
    });

    it('should batch get liquidity quotes', async () => {
      const queries = [
        {
          poolId: '1',
          desiredAmount0: TEST_AMOUNTS.SMALL,
          desiredAmount1: TEST_AMOUNTS.SMALL,
          minAmount0: BigInt('0'),
          minAmount1: BigInt('0'),
        },
        {
          poolId: '2',
          desiredAmount0: TEST_AMOUNTS.MEDIUM,
          desiredAmount1: TEST_AMOUNTS.MEDIUM,
          minAmount0: BigInt('0'),
          minAmount1: BigInt('0'),
        },
      ];
      const result = await service.batchGetLiquidityQuotes(queries);
      console.log('Batch liquidity quotes:', result);
    });
  });

  describe('Liquidity Removal Methods', () => {
    it('should get remove liquidity quote', async () => {
      const result = await service.getRemoveLiquidityQuote(
        '1',
        TEST_AMOUNTS.SMALL
      );
      console.log('Remove liquidity quote:', result);
    });

    it('should get remove liquidity range quotes', async () => {
      const result = await service.getRemoveLiquidityRangeQuotes(
        '1',
        TEST_AMOUNTS.LARGE
      );
      console.log('Remove liquidity range quotes:', result);
    });

    it('should batch get remove liquidity quotes', async () => {
      const queries = [
        {
          poolId: '1',
          liquidityTokens: TEST_AMOUNTS.SMALL,
        },
        {
          poolId: '2',
          liquidityTokens: TEST_AMOUNTS.MEDIUM,
        },
      ];
      const result = await service.batchGetRemoveLiquidityQuotes(queries);
      console.log('Batch remove liquidity quotes:', result);
    });
  });

  describe('Error Cases', () => {
    it('should handle non-existent pool', async () => {
      try {
        await service.getPoolById('999999');
      } catch (error) {
        console.log('Expected error for non-existent pool:', error);
      }
    });

    it('should handle invalid token pair', async () => {
      try {
        await service.getPool(TOKENS.CHA, TOKENS.CHA);
      } catch (error) {
        console.log('Expected error for invalid token pair:', error);
      }
    });

    it('should handle zero amounts', async () => {
      try {
        await service.getSwapQuote(TOKENS.CHA, TOKENS.SYN_WELSH, BigInt('0'));
      } catch (error) {
        console.log('Expected error for zero amount:', error);
      }
    });
  });
});
