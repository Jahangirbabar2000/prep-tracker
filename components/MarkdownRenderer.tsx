'use client';

import { createContext, useContext } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// A fenced code block (```) always nests <code> inside <pre>, whether or not
// it has a language tag — but only a language tag (```js) gives <code> a
// className. Deciding "block vs. inline" from className alone misclassifies
// untagged fences as inline. This context instead tracks structural nesting,
// so plain ``` fences still get the block treatment.
const InPreContext = createContext(false);

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="md-body text-sm text-fg/90 leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p:          ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul:         ({ children }) => <ul className="list-outside pl-5 mb-2 space-y-1 marker:text-muted">{children}</ul>,
          ol:         ({ children }) => <ol className="list-decimal list-outside pl-5 mb-2 space-y-1 marker:text-muted marker:font-medium">{children}</ol>,
          li:         ({ children }) => <li className="pl-0.5">{children}</li>,
          strong:     ({ children }) => <strong className="font-semibold text-fg">{children}</strong>,
          em:         ({ children }) => <em className="italic">{children}</em>,
          h1:         ({ children }) => <h1 className="text-base font-semibold text-fg mb-1 mt-3 first:mt-0">{children}</h1>,
          h2:         ({ children }) => <h2 className="text-sm font-semibold text-fg mb-1 mt-3 first:mt-0">{children}</h2>,
          h3:         ({ children }) => <h3 className="text-sm font-medium text-fg mb-1 mt-2 first:mt-0">{children}</h3>,
          blockquote: ({ children }) => <blockquote className="border-l-2 border-accent/40 pl-3 text-muted italic mb-2">{children}</blockquote>,
          hr:         () => <hr className="border-border my-3" />,
          a:          ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{children}</a>,
          code:       ({ children }) => {
            const isBlock = useContext(InPreContext);
            return isBlock
              ? <code className="block font-mono text-xs">{children}</code>
              : <code className="px-1.5 py-0.5 rounded bg-surface-2 border border-border font-mono text-xs text-accent">{children}</code>;
          },
          // Code / plaintext blocks — dark surface in both themes so code reads
          // as code (not decoration) and never washes out on a light card.
          pre:        ({ children }) => (
            <InPreContext.Provider value={true}>
              <pre className="bg-code text-code border border-code rounded-lg px-4 py-3 overflow-x-auto font-mono text-xs mb-2 leading-relaxed">
                {children}
              </pre>
            </InPreContext.Provider>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// Lightweight variant for single-line contexts (question titles, card
// previews) — renders inline emphasis/math without wrapping block markup,
// so it can sit inside a heading-style <p>/<div> the caller controls.
export function MarkdownInline({ content, className = '' }: { content: string; className?: string }) {
  return (
    <span className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p:      ({ children }) => <>{children}</>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em:     ({ children }) => <em className="italic">{children}</em>,
          code:   ({ children }) => <code className="font-mono text-[0.9em]">{children}</code>,
          a:      ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{children}</a>,
        }}
      >
        {content}
      </ReactMarkdown>
    </span>
  );
}
