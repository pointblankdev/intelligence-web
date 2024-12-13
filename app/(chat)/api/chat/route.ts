import {
  convertToCoreMessages,
  generateObject,
  Message,
  StreamData,
  streamObject,
  streamText,
} from 'ai';
import { z } from 'zod';

import { customModel } from '@/ai';
import { models } from '@/ai/models';
import { canvasPrompt, dungeonMasterPrompt, regularPrompt } from '@/ai/prompts';
import { toolRegistry } from '@/ai/tool-registry';
import { auth } from '@/app/(auth)/auth';
import {
  deleteChatById,
  getChatById,
  getDocumentById,
  getUser,
  saveChat,
  saveDocument,
  saveSuggestions,
} from '@/db/queries';
import { Suggestion, user } from '@/db/schema';
import { generateUUID, sanitizeResponseMessages } from '@/lib/utils';

export const maxDuration = 60;

const canvasTools: string[] = [
  'createDocument',
  'updateDocument',
  'requestSuggestions',
];

export async function POST(request: Request) {
  const {
    id,
    messages,
    modelId,
  }: { id: string; messages: Array<Message>; modelId: string } =
    await request.json();

  let session: any;
  try {
    session = await auth();
  } catch (error) {}

  // if (!session) {
  //   return new Response('Unauthorized', { status: 401 });
  // }

  const model = models.find((model) => model.id === modelId);

  if (!model) {
    return new Response('Model not found', { status: 404 });
  }

  let coreMessages = convertToCoreMessages(messages);
  const streamingData = new StreamData();
  const activeTools = toolRegistry.getToolNames();
  if (modelId === 'gpt-4o-canvas') {
    activeTools.push(...canvasTools);
  }

  // slice coreMessage to only include the last 10 messages (save tokens?)
  // coreMessages = coreMessages.slice(-10);

  const result = await streamText({
    model: customModel(model.apiIdentifier),
    system: modelId === 'gpt-4o-canvas' ? canvasPrompt : regularPrompt,
    messages: coreMessages,
    maxSteps: 10,
    experimental_activeTools: activeTools as any[],
    tools: {
      ...toolRegistry.getAllTools(),
    },
    onFinish: async ({ responseMessages }) => {
      // if (session.user && session.user.id) {
      try {
        const responseMessagesWithoutIncompleteToolCalls =
          sanitizeResponseMessages(responseMessages);

        const chat = {
          id,
          messages: [
            ...coreMessages,
            ...responseMessagesWithoutIncompleteToolCalls,
          ],
          userId:
            (session?.user?.id as any) ||
            '905d5223-af43-4f29-ae34-91a293810e1c',
        };
        await saveChat(chat);
      } catch (error) {
        console.error('Failed to save chat');
      }
      // }

      streamingData.close();
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'stream-text',
    },
  });

  return result.toDataStreamResponse({
    data: streamingData,
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    await deleteChatById({ id });

    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    return new Response('An error occurred while processing your request', {
      status: 500,
    });
  }
}
