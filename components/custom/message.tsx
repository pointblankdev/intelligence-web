'use client';

import { Attachment, ToolInvocation } from 'ai';
import cx from 'classnames';
import { motion } from 'framer-motion';
import { Code2, Sparkles } from 'lucide-react';
import { Dispatch, ReactNode, SetStateAction } from 'react';

import { UICanvas } from './canvas';
import { ContractAuditResult } from './contract-audit';
import { DexInfo } from './dex-analysis';
import { ArbitrageInfo } from './dex-graph';
import { DocumentToolCall, DocumentToolResult } from './document';
import { Markdown } from './markdown';
import { PreviewAttachment } from './preview-attachment';
import { ContractResult } from './stacks-contract';
import { SearchResult } from './stacks-search';
import { TransactionDisplay } from './transaction-info';
import { WalletInfo } from './wallet-info';

interface CodeBlockInfo {
  language: string;
  title: string;
  content: string;
}

// Clarity code patterns
const clarityPatterns = [
  /^\(define-public/m,
  /^\(define-private/m,
  /^\(define-constant/m,
  /^\(define-data-var/m,
  /^\(define-map/m,
  /^\(define-non-fungible-token/m,
  /^\(define-fungible-token/m,
  /^\(define-trait/m,
  /^\(impl-trait/m,
  /^\(use-trait/m,
  /^\(contract-call\?/m,
  /^\(stx-transfer\?/m,
];

const getCodeFenceInfo = (content: string): CodeBlockInfo | null => {
  const lines = content.split('\n');
  if (!content.startsWith('```')) return null;

  // Remove first and last lines if they're fences
  const firstLine = lines[0].replace('```', '').trim().toLowerCase();
  let language = firstLine;
  let title = '';

  // Check for potential title in the fence
  if (firstLine.includes(':')) {
    [language, title] = firstLine.split(':').map((s) => s.trim());
  }

  // Clean up content
  lines.shift(); // Remove first line
  if (lines[lines.length - 1].trim() === '```') {
    lines.pop();
  }

  return {
    language,
    title:
      title || `${language.charAt(0).toUpperCase() + language.slice(1)} Code`,
    content: lines.join('\n'),
  };
};

const detectCodeType = (content: string): CodeBlockInfo | null => {
  // First check for code fence
  const fenceInfo = getCodeFenceInfo(content);
  if (fenceInfo) return fenceInfo;

  // Check for Clarity code
  if (clarityPatterns.some((pattern) => pattern.test(content))) {
    console.log('Clarity code detected');
    return {
      language: 'clarity',
      title: 'Clarity Smart Contract',
      content,
    };
  }

  return null;
};

export const getCodeInfo = (content: string): CodeBlockInfo | null => {
  const codeInfo = detectCodeType(content);
  if (!codeInfo) {
    // Default fallback
    return null;
  }
  return codeInfo;
};

export const Message = ({
  role,
  content,
  toolInvocations,
  attachments,
  canvas,
  setCanvas,
}: {
  role: string;
  content: string | ReactNode;
  toolInvocations: Array<ToolInvocation> | undefined;
  attachments?: Array<Attachment>;
  canvas: UICanvas;
  setCanvas: Dispatch<SetStateAction<UICanvas>>;
}) => {
  return (
    <motion.div
      className="w-full mx-auto max-w-3xl px-4 group/message "
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      data-role={role}
    >
      <div
        className={cx(
          'flex gap-4 group-data-[role=user]/message:px-5 w-full group-data-[role=user]/message:w-fit group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:py-3.5 rounded-xl',
          {
            'group-data-[role=user]/message:bg-muted': !canvas,
            'group-data-[role=user]/message:bg-zinc-300 dark:group-data-[role=user]/message:bg-zinc-800':
              canvas,
          }
        )}
      >
        {role === 'assistant' && (
          <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border">
            <Sparkles className="size-4" />
          </div>
        )}
        <div className="flex flex-col gap-2 max-w-[22rem] sm:max-w-full">
          {content && (
            <div className="flex flex-col gap-4">
              <Markdown>{content as string}</Markdown>
            </div>
          )}

          {toolInvocations && toolInvocations.length > 0 && (
            <div className="flex flex-col gap-4">
              {toolInvocations.map((toolInvocation) => {
                const { toolName, toolCallId, state, args } = toolInvocation;

                if (state === 'result') {
                  const { result } = toolInvocation;

                  return (
                    <div key={toolCallId}>
                      {toolName === 'DEX-Analysis' ? (
                        <DexInfo response={result} />
                      ) : toolName === 'Contract-Audit' ? (
                        <ContractAuditResult response={result} />
                      ) : toolName === 'Stacks-API-Contract' ? (
                        <SearchResult response={result} />
                      ) : toolName === 'Stacks-API-Contract' ? (
                        <ContractResult response={result} />
                      ) : toolName === 'DEX-Arbitrage' ? (
                        <ArbitrageInfo response={result} />
                      ) : toolName === 'Stacks-Wallet' ? (
                        <WalletInfo response={result} />
                      ) : toolName === 'Stacks-API-Transaction' ? (
                        <TransactionDisplay response={result} />
                      ) : toolName === 'createDocument' ? (
                        <DocumentToolResult
                          type="create"
                          result={result}
                          canvas={canvas}
                          setCanvas={setCanvas}
                        />
                      ) : toolName === 'updateDocument' ? (
                        <DocumentToolResult
                          type="update"
                          result={result}
                          canvas={canvas}
                          setCanvas={setCanvas}
                        />
                      ) : toolName === 'requestSuggestions' ? (
                        <DocumentToolResult
                          type="request-suggestions"
                          result={result}
                          canvas={canvas}
                          setCanvas={setCanvas}
                        />
                      ) : (
                        <pre className="text-xs">
                          {JSON.stringify(result, null, 2)}
                        </pre>
                      )}
                    </div>
                  );
                } else {
                  return (
                    <div
                      key={toolCallId}
                      className={cx({
                        skeleton: ['getWeather'].includes(toolName),
                      })}
                    >
                      {toolName === 'DEX-Analysis' ? (
                        <DexInfo />
                      ) : toolName === 'Stacks-API-Search' ? (
                        <SearchResult />
                      ) : toolName === 'Contract-Audit' ? (
                        <ContractAuditResult />
                      ) : toolName === 'DEX-Arbitrage' ? (
                        <ArbitrageInfo />
                      ) : toolName === 'Stacks-API-Contract' ? (
                        <ContractResult />
                      ) : toolName === 'createDocument' ? (
                        <DocumentToolCall type="create" args={args} />
                      ) : toolName === 'updateDocument' ? (
                        <DocumentToolCall type="update" args={args} />
                      ) : toolName === 'requestSuggestions' ? (
                        <DocumentToolCall
                          type="request-suggestions"
                          args={args}
                        />
                      ) : null}
                    </div>
                  );
                }
              })}
            </div>
          )}

          {attachments && (
            <div className="flex flex-row gap-2">
              {attachments.map((attachment) => (
                <PreviewAttachment
                  key={attachment.url}
                  attachment={attachment}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
