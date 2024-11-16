import { CoreTool } from 'ai';

import { contractAuditTool } from '@/tools/code-audit/smart-contract';
import { contractCallTool } from '@/tools/contract';
import { pricesTool } from '@/tools/defi/prices';
import { dexTool } from '@/tools/defi/univ2-dex';
import { swapTool } from '@/tools/defi/univ2-swap';
import { sip10Tool } from '@/tools/sips/sip10';
import { tokenRegistryTool } from '@/tools/sips/token-registry';
import { bnsTool } from '@/tools/stacks-api/bns';
import { contractTool } from '@/tools/stacks-api/contract';
import { searchTool } from '@/tools/stacks-api/search';
import { metadataTool } from '@/tools/stacks-api/tokens';
import { transactionTool } from '@/tools/stacks-api/transaction';
import { walletTool } from '@/tools/wallet';

// We don't need to extend Tool anymore since we're using CoreTool directly
export class ToolRegistry {
  private tools: Map<string, CoreTool> = new Map();

  constructor() {
    this.tools.set('Token-Registry', tokenRegistryTool);
    this.tools.set('DEX-Swap', swapTool);
    this.tools.set('Contract-Call', contractCallTool);
    this.tools.set('DEX-Analysis', dexTool);
    this.tools.set('SIP010-Token', sip10Tool);
    this.tools.set('Token-Prices', pricesTool);
    this.tools.set('Contract-Audit', contractAuditTool);
    this.tools.set('Stacks-Token-Metadata', metadataTool);
    this.tools.set('Stacks-Wallet', walletTool);
    this.tools.set('Stacks-API-BNS', bnsTool);
    this.tools.set('Stacks-API-Contract', contractTool);
    this.tools.set('Stacks-API-Search', searchTool);
    this.tools.set('Stacks-API-Transaction', transactionTool);
  }

  getTool(name: string): CoreTool | undefined {
    return this.tools.get(name);
  }

  getAllTools(): Record<string, CoreTool<any, any>> {
    return Object.fromEntries(this.tools.entries());
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }
}

export const toolRegistry = new ToolRegistry();
