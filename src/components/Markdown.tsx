import {
  memo,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
} from 'react';
import ReactMarkdown, {
  type Components,
  type ExtraProps,
} from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import 'katex/dist/katex.min.css';
import { Icon } from './Icon';

function safeUrlTransform(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed, 'https://cope.local');
    if (
      parsed.protocol === 'http:' ||
      parsed.protocol === 'https:' ||
      parsed.protocol === 'mailto:'
    ) {
      return trimmed;
    }
  } catch {
    return '';
  }
  return '';
}

function CodeBlock({
  node: _node,
  children,
  ...props
}: ComponentPropsWithoutRef<'pre'> & ExtraProps) {
  const preRef = useRef<HTMLPreElement>(null);
  const timerRef = useRef<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const copy = async () => {
    const text = preRef.current?.innerText ?? '';
    if (!text) return;
    try {
      await navigator.clipboard?.writeText(text);
      setCopied(true);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="codeBlock">
      <div className="codeBar">
        <span>Código</span>
        <button type="button" className="codeCopy" onClick={() => void copy()}>
          <Icon name={copied ? 'check' : 'copy'} size={14} />
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <pre ref={preRef} {...props}>
        {children}
      </pre>
    </div>
  );
}

function MarkdownLink({
  href,
  children,
}: ComponentPropsWithoutRef<'a'> & ExtraProps) {
  if (!href) return <span>{children}</span>;
  return (
    <a href={href} target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  );
}

function MarkdownTable({
  children,
}: ComponentPropsWithoutRef<'table'> & ExtraProps) {
  return (
    <div className="tableWrap">
      <table>{children}</table>
    </div>
  );
}

const components: Components = {
  pre: CodeBlock,
  a: MarkdownLink,
  table: MarkdownTable,
};

export const Markdown = memo(function Markdown({
  content,
}: {
  content: string;
}) {
  if (!content.trim()) return null;
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          [rehypeKatex, { trust: false }],
          [rehypeHighlight, { detect: false, ignoreMissing: true }],
        ]}
        components={components}
        urlTransform={safeUrlTransform}
        skipHtml
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
