'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="text-sm text-fg/90 leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p:          ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul:         ({ children }) => <ul className="list-disc list-outside pl-4 mb-2 space-y-0.5">{children}</ul>,
          ol:         ({ children }) => <ol className="list-decimal list-outside pl-4 mb-2 space-y-0.5">{children}</ol>,
          li:         ({ children }) => <li>{children}</li>,
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
              ? <code className="block font-mono text-xs text-fg/90">{children}</code>
              : <code className="px-1.5 py-0.5 rounded bg-surface-2 border border-border font-mono text-xs text-accent">{children}</code>;
          },
          // Code blocks
          pre:        ({ children }) => (
            <pre className="bg-surface-2 border border-border rounded-lg px-4 py-3 overflow-x-auto font-mono text-xs mb-2 leading-relaxed">
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
