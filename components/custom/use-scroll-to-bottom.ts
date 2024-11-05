import { useEffect, useRef, RefObject } from 'react';

export function useScrollToBottom<T extends HTMLElement>(): [
  RefObject<T>,
  RefObject<T>,
] {
  const containerRef = useRef<T>(null);
  const endRef = useRef<T>(null);
  const lastChildCountRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    const end = endRef.current;

    if (container && end) {
      const observer = new MutationObserver((mutations) => {
        // Get current number of direct children (messages)
        const currentChildCount = container.children.length;

        // Only scroll if we've added a new message
        // (not on internal component updates)
        if (currentChildCount > lastChildCountRef.current) {
          end.scrollIntoView({ behavior: 'instant', block: 'end' });
          lastChildCountRef.current = currentChildCount;
        }

        // Alternative approach: check if mutation added a message-level element
        // const hasNewMessage = mutations.some(mutation => {
        //   return Array.from(mutation.addedNodes).some(node => {
        //     const element = node as HTMLElement;
        //     return element.getAttribute?.('data-role') === 'assistant' ||
        //            element.getAttribute?.('data-role') === 'user';
        //   });
        // });
        //
        // if (hasNewMessage) {
        //   end.scrollIntoView({ behavior: "instant", block: "end" });
        // }
      });

      observer.observe(container, {
        childList: true, // Watch for new messages
        subtree: false, // Don't watch internal changes
      });

      // Initialize the child count
      lastChildCountRef.current = container.children.length;

      return () => observer.disconnect();
    }
  }, []);

  return [containerRef, endRef];
}
