import { lazy, memo, Suspense } from 'react';

const MarkdownImpl = lazy(() =>
  import('./Markdown').then((module) => ({ default: module.Markdown })),
);

export const LazyMarkdown = memo(function LazyMarkdown({
  content,
}: {
  content: string;
}) {
  if (!content.trim()) return null;
  return (
    <Suspense
      fallback={
        <div className="markdown markdownFallback" aria-busy="true" dir="auto">
          {content}
        </div>
      }
    >
      <MarkdownImpl content={content} />
    </Suspense>
  );
});
