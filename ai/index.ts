import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { experimental_wrapLanguageModel as wrapLanguageModel } from 'ai';

import { customMiddleware } from './custom-middleware';

export const customModel = (apiIdentifier: string) => {
  return wrapLanguageModel({
    model:
      apiIdentifier === 'gpt-4o'
        ? openai(apiIdentifier)
        : anthropic(apiIdentifier),
    middleware: customMiddleware,
  });
};
