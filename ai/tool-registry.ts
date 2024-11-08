import { CoreTool } from 'ai';

import { contractAuditTool } from '@/tools/code-audit/smart-contract';
import { sip10Tool } from '@/tools/sips/sip10';
import { bnsTool } from '@/tools/stacks-api/bns';
import { contractTool } from '@/tools/stacks-api/contract';
import { searchTool } from '@/tools/stacks-api/search';
import { transactionTool } from '@/tools/stacks-api/transaction';
import { dexTool } from '@/tools/univ2-dex';
import { walletTool } from '@/tools/wallet';

// We don't need to extend Tool anymore since we're using CoreTool directly
export class ToolRegistry {
  private tools: Map<string, CoreTool> = new Map();

  constructor() {
    this.tools.set('DEX-Analysis', dexTool);
    this.tools.set('SIP010-Token', sip10Tool);
    this.tools.set('Contract-Audit', contractAuditTool);
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
