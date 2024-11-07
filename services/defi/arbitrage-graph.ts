/**
 * @fileoverview DEX Arbitrage Graph Service
 *
 * This service implements a graph-based representation of a decentralized exchange (DEX) system,
 * designed to model and analyze liquidity pools and potential arbitrage opportunities. The system
 * uses an adjacency list structure to represent connections between tokens and liquidity pools,
 * enabling efficient calculation of exchange rates and liquidity operations.
 *
 * Key Features:
 * - Represents both basic tokens and liquidity pool tokens
 * - Models liquidity pool pairs with reserve tracking
 * - Calculates swap rates based on constant product formula
 * - Determines liquidity provision (mint) and withdrawal (burn) rates
 * - Maintains a graph structure for potential multi-hop path finding
 *
 * Design Patterns:
 * - Uses class inheritance for token specialization
 * - Implements an adjacency list using nested Maps
 * - Encapsulates rate calculations within LP tokens
 * - Provides clear type definitions for all components
 *
 * @version 1.0.0
 */

/**
 * Represents a basic token in the DEX ecosystem.
 * Serves as the base class for both standard tokens and liquidity pool tokens.
 */
class Token {
  /** Unique identifier for the token */
  id: string;

  /**
   * Creates a new Token instance.
   * @param {string} id - Unique identifier for the token
   */
  constructor(id: string) {
    this.id = id;
  }
}

/**
 * Represents the liquidity state of a token within a pool.
 * Combines the token reference with its current reserve amount.
 */
type Liquidity = {
  /** Current reserve amount of the token in the pool */
  reserve: number;
  /** Reference to the token object */
  token: Token;
};

/**
 * Represents a liquidity pool token that manages a pair of tokens.
 * Extends the base Token class with additional properties and methods
 * for handling liquidity pool operations.
 */
class LPToken extends Token {
  /** First token's liquidity state in the pool */
  a: Liquidity;
  /** Second token's liquidity state in the pool */
  b: Liquidity;

  /**
   * Creates a new LPToken instance.
   * @param {string} id - Unique identifier for the LP token
   * @param {Liquidity} a - First token's liquidity state
   * @param {Liquidity} b - Second token's liquidity state
   */
  constructor(id: string, a: Liquidity, b: Liquidity) {
    super(id);
    this.a = a;
    this.b = b;
  }

  /**
   * Calculates the current exchange rates between the paired tokens.
   * Uses the constant product formula (x * y = k) to determine rates.
   * @returns {Object} Object containing both forward and reverse exchange rates
   */
  getSwapRate(): { rateAB: number; rateBA: number } {
    const rateAB = this.b.reserve / this.a.reserve;
    const rateBA = this.a.reserve / this.b.reserve;
    return { rateAB, rateBA };
  }

  /**
   * Calculates the rates for providing liquidity to the pool.
   * Returns the proportion of each token needed for minting LP tokens.
   * @returns {Object} Object containing the mint rates for both tokens
   */
  getMintRates(): { rateA: number; rateB: number } {
    const totalReserves = this.a.reserve + this.b.reserve;
    return {
      rateA: this.a.reserve / totalReserves,
      rateB: this.b.reserve / totalReserves,
    };
  }

  /**
   * Calculates the rates for withdrawing liquidity from the pool.
   * Returns the proportion of tokens received when burning LP tokens.
   * @returns {Object} Object containing the burn rates for both tokens
   */
  getBurnRates(): { rateA: number; rateB: number } {
    const totalReserves = this.a.reserve + this.b.reserve;
    return {
      rateA: this.a.reserve / totalReserves,
      rateB: this.b.reserve / totalReserves,
    };
  }
}

/**
 * Main service class that manages the DEX graph structure.
 * Implements a graph-based representation of token connections and liquidity pools.
 */
class ArbitrageGraph {
  /**
   * Adjacency list representation of the graph.
   * Outer Map: Maps token IDs to their connections
   * Inner Map: Maps connected token IDs to their Token/LPToken instances
   */
  private adjacencyList: Map<string, Map<string, Token | LPToken>>;

  /**
   * Creates a new ArbitrageGraph instance.
   * Initializes the graph with provided tokens and LP tokens.
   * @param {Token[]} tokens - Array of basic tokens
   * @param {LPToken[]} lpTokens - Array of liquidity pool tokens
   */
  constructor(tokens: Token[], lpTokens: LPToken[]) {
    this.adjacencyList = new Map();
    this.initialize(tokens, lpTokens);
  }

  /**
   * Initializes the graph structure with tokens and LP tokens.
   * @param {Token[]} tokens - Array of basic tokens
   * @param {LPToken[]} lpTokens - Array of liquidity pool tokens
   * @private
   */
  private initialize(tokens: Token[], lpTokens: LPToken[]) {
    // Add all tokens to the graph
    tokens.forEach((token) => this.addToken(token));

    // Add all LP tokens and their connections
    lpTokens.forEach((lpToken) => this.addLPToken(lpToken));
  }

  /**
   * Adds a single token to the graph.
   * Creates a new entry in the adjacency list if the token doesn't exist.
   * @param {Token} token - Token to add to the graph
   * @private
   */
  private addToken(token: Token) {
    if (!this.adjacencyList.has(token.id)) {
      this.adjacencyList.set(token.id, new Map());
    }
  }

  /**
   * Adds a liquidity pool token to the graph.
   * Creates connections between the LP token and its constituent tokens.
   * @param {LPToken} lpToken - Liquidity pool token to add
   * @private
   */
  private addLPToken(lpToken: LPToken) {
    // Ensure both tokens exist in the graph
    this.addToken(lpToken.a.token);
    this.addToken(lpToken.b.token);

    // Create bidirectional connections
    this.adjacencyList.get(lpToken.a.token.id)?.set(lpToken.id, lpToken);
    this.adjacencyList.get(lpToken.b.token.id)?.set(lpToken.id, lpToken);

    // Add LP token's own connections
    this.adjacencyList.set(
      lpToken.id,
      new Map([
        [lpToken.a.token.id, lpToken],
        [lpToken.b.token.id, lpToken],
      ])
    );
  }

  /**
   * Gets the exchange rates between two tokens if a direct path exists.
   * @param {string} tokenAId - ID of the first token
   * @param {string} tokenBId - ID of the second token
   * @returns {Object|undefined} Exchange rates or undefined if no direct path exists
   */
  getSwapRate(
    tokenAId: string,
    tokenBId: string
  ): { rateAB: number; rateBA: number } | undefined {
    const lpToken = this.adjacencyList.get(tokenAId)?.get(tokenBId);
    return lpToken instanceof LPToken ? lpToken.getSwapRate() : undefined;
  }

  /**
   * Gets the mint rates for a specific LP token.
   * @param {string} lpTokenId - ID of the LP token
   * @returns {Object|undefined} Mint rates or undefined if LP token not found
   */
  getMintRates(
    lpTokenId: string
  ): { rateA: number; rateB: number } | undefined {
    const lpToken = this.adjacencyList.get(lpTokenId)?.get(lpTokenId);
    return lpToken instanceof LPToken ? lpToken.getMintRates() : undefined;
  }

  /**
   * Gets the burn rates for a specific LP token.
   * @param {string} lpTokenId - ID of the LP token
   * @returns {Object|undefined} Burn rates or undefined if LP token not found
   */
  getBurnRates(
    lpTokenId: string
  ): { rateA: number; rateB: number } | undefined {
    const lpToken = this.adjacencyList.get(lpTokenId)?.get(lpTokenId);
    return lpToken instanceof LPToken ? lpToken.getBurnRates() : undefined;
  }
}

export { Token, LPToken, ArbitrageGraph, type Liquidity };
