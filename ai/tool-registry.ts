import { CoreTool } from 'ai';

import { bnsTool } from '@/tools/bns';
import { walletTool } from '@/tools/wallet';

// We don't need to extend Tool anymore since we're using CoreTool directly
export class ToolRegistry {
  private tools: Map<string, CoreTool> = new Map();

  constructor() {
    this.tools.set('walletTool', walletTool);
    this.tools.set('bnsTool', bnsTool);
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
