import { CoreTool } from 'ai';

import { bnsTool } from '@/tools/stacks-api/bns';
import { searchTool } from '@/tools/stacks-api/search';
import { walletTool } from '@/tools/wallet';

// We don't need to extend Tool anymore since we're using CoreTool directly
export class ToolRegistry {
  private tools: Map<string, CoreTool> = new Map();

  constructor() {
    this.tools.set('Stacks-Wallet', walletTool);
    this.tools.set('Stacks-API-BNS', bnsTool);
    this.tools.set('Stacks-API-Search', searchTool);
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
