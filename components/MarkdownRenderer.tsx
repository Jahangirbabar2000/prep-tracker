'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="md-body text-sm text-fg/90 leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
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
          // Inline code
          code:       ({ children, className }) => {
            const isBlock = !!className;
            return isBlock
              ? <code className="block font-mono text-xs">{children}</code>
              : <code className="px-1.5 py-0.5 rounded bg-surface-2 border border-border font-mono text-xs text-accent">{children}</code>;
          },
          // Code / plaintext blocks — dark surface in both themes so code reads
          // as code (not decoration) and never washes out on a light card.
          pre:        ({ children }) => (
            <pre className="bg-code text-code border border-code rounded-lg px-4 py-3 overflow-x-auto font-mono text-xs mb-2 leading-relaxed">
              {children}
            </pre>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
