import type { SpringstackNode } from 'springstack';
import type { Corpus, CorpusItem, DemoNodeData } from '../components/demos/SpringstackDemo';

/**
 * Convert corpus name to URL slug
 */
function corpusToSlug(corpus: Corpus): string {
  return corpus.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '--' + corpus.id;
}

/**
 * Parse corpus slug to find matching corpus
 * Supports both formats: "x-files-cabinet-a--c-archive" or just "c-archive"
 */
function findCorpusBySlug(slug: string, demoCorpora: Corpus[]): Corpus | null {
  // Try exact ID match first
  let corpus = demoCorpora.find(c => c.id === slug);
  if (corpus) return corpus;

  // Try slug format: extract ID after "--"
  const dashDashIndex = slug.lastIndexOf('--');
  if (dashDashIndex !== -1) {
    const id = slug.substring(dashDashIndex + 2);
    corpus = demoCorpora.find(c => c.id === id);
    if (corpus) return corpus;
  }

  return null;
}

/**
 * Parse URL pathname to Springstack node array
 * Returns null if path is invalid
 */
export function parsePathToStack(
  pathname: string,
  demoCorpora: Corpus[],
  demoItems: Record<string, CorpusItem[]>,
  builders: {
    buildRootNode: () => SpringstackNode<DemoNodeData>;
    buildCorpusNode: (corpus: Corpus) => SpringstackNode<DemoNodeData>;
    buildItemNode: (item: CorpusItem, corpus: Corpus) => SpringstackNode<DemoNodeData>;
    buildDetailNode: (item: CorpusItem) => SpringstackNode<DemoNodeData>;
  }
): SpringstackNode<DemoNodeData>[] | null {
  const segments = pathname.split('/').filter(Boolean);

  // Root: /
  if (segments.length === 0) {
    return [builders.buildRootNode()];
  }

  // Corpus: /corpus/:slug
  if (segments[0] === 'corpus' && segments[1]) {
    const corpus = findCorpusBySlug(segments[1], demoCorpora);
    if (!corpus) return null;

    const stack: SpringstackNode<DemoNodeData>[] = [
      builders.buildRootNode(),
      builders.buildCorpusNode(corpus)
    ];

    // Item: /corpus/:corpusId/item/:itemId
    if (segments[2] === 'item' && segments[3]) {
      const items = demoItems[corpus.id] ?? [];
      const item = items.find(i => i.id === segments[3]);
      if (!item) return null;

      stack.push(builders.buildItemNode(item, corpus));

      // Detail: /corpus/:corpusId/item/:itemId/detail
      if (segments[4] === 'detail') {
        stack.push(builders.buildDetailNode(item));
      }
    }

    return stack;
  }

  return null;
}

/**
 * Convert Springstack node array to URL pathname
 */
export function stackToPath(
  stack: SpringstackNode<DemoNodeData>[],
  demoCorpora: Corpus[]
): string {
  if (stack.length === 1 && stack[0].kind === 'root') {
    return '/';
  }

  const corpusNode = stack.find(n => n.kind === 'corpus');
  if (!corpusNode?.data?.corpusId) return '/';

  const corpus = demoCorpora.find(c => c.id === corpusNode.data.corpusId);
  if (!corpus) return '/';

  // Use slug format for corpus URLs
  const slug = corpusToSlug(corpus);
  let path = `/corpus/${slug}`;

  const itemNode = stack.find(n => n.kind === 'item');
  if (itemNode?.data?.itemId) {
    path += `/item/${itemNode.data.itemId}`;

    const detailNode = stack.find(n => n.kind === 'detail');
    if (detailNode) {
      path += '/detail';
    }
  }

  return path;
}
