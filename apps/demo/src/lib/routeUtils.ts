import type { SpringstackNode } from 'springstack';
import type { Corpus, CorpusItem, DemoNodeData } from '../components/demos/SpringstackDemo';

const DETAIL_KIND = 'application/x-detail';
const SQLITE_TABLE_KIND = 'application/x-sqlite3-table';

function corpusToSlug(corpus: Corpus): string {
  return corpus.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '--' + corpus.id;
}

function findCorpusBySlug(slug: string, demoCorpora: Corpus[]): Corpus | null {
  let corpus = demoCorpora.find(c => c.id === slug);
  if (corpus) return corpus;

  const dashDashIndex = slug.lastIndexOf('--');
  if (dashDashIndex !== -1) {
    const id = slug.substring(dashDashIndex + 2);
    corpus = demoCorpora.find(c => c.id === id);
    if (corpus) return corpus;
  }

  return null;
}

export function parsePathToStack(
  pathname: string,
  demoCorpora: Corpus[],
  demoItems: Record<string, CorpusItem[]>,
  builders: {
    buildRootNode: () => SpringstackNode<DemoNodeData>;
    buildCorpusNode: (corpus: Corpus) => SpringstackNode<DemoNodeData>;
    buildItemNode: (item: CorpusItem, corpus: Corpus) => SpringstackNode<DemoNodeData>;
    buildDetailNode: (item: CorpusItem) => SpringstackNode<DemoNodeData>;
    buildTableNode?: (item: CorpusItem, tableId: string) => SpringstackNode<DemoNodeData>;
  }
): SpringstackNode<DemoNodeData>[] | null {
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return [builders.buildRootNode()];
  }

  if (segments[0] === 'corpus' && segments[1]) {
    const corpus = findCorpusBySlug(segments[1], demoCorpora);
    if (!corpus) return null;

    const stack: SpringstackNode<DemoNodeData>[] = [
      builders.buildRootNode(),
      builders.buildCorpusNode(corpus)
    ];

    if (segments[2] === 'item' && segments[3]) {
      const hasKind = segments[4] && segments[4] !== 'detail' && segments[4] !== 'table';
      const kindSegment = hasKind ? decodeURIComponent(segments[3]) : null;
      const itemId = hasKind ? segments[4] : segments[3];
      const items = demoItems[corpus.id] ?? [];
      const item = items.find(i => i.id === itemId);
      if (!item) return null;

      stack.push(builders.buildItemNode(item, corpus));

      const detailIndex = hasKind ? 5 : 4;
      if (segments[detailIndex] === 'detail') {
        stack.push(builders.buildDetailNode(item));
      }
      if (segments[detailIndex] === 'table' && segments[detailIndex + 1] && builders.buildTableNode) {
        stack.push(builders.buildTableNode(item, decodeURIComponent(segments[detailIndex + 1])));
      }
      if (kindSegment && item.mediaType !== kindSegment) {
        // Keep parsing consistent for non-demo callers that use kind in the URL.
        stack[2] = { ...stack[2], kind: kindSegment };
      }
    }

    return stack;
  }

  return null;
}

export function stackToPath(
  stack: SpringstackNode<DemoNodeData>[],
  demoCorpora: Corpus[]
): string {
  if (stack.length === 1) {
    return '/';
  }

  const corpusNode = stack.find(n => n.data?.corpusId);
  if (!corpusNode?.data?.corpusId) return '/';

  const corpus = demoCorpora.find(c => c.id === corpusNode.data.corpusId);
  if (!corpus) return '/';

  const slug = corpusToSlug(corpus);
  let path = `/corpus/${slug}`;

  const itemNode = stack.find(n => n.data?.itemId && n.kind !== DETAIL_KIND && n.kind !== SQLITE_TABLE_KIND);
  if (itemNode?.data?.itemId) {
    const kindSegment = encodeURIComponent(itemNode.kind);
    path += `/item/${kindSegment}/${itemNode.data.itemId}`;

    const detailNode = stack.find(n => n.kind === DETAIL_KIND || n.kind === SQLITE_TABLE_KIND);
    if (detailNode) {
      if (detailNode.kind === SQLITE_TABLE_KIND && detailNode.data?.tableId) {
        path += `/table/${encodeURIComponent(detailNode.data.tableId)}`;
      } else {
        path += '/detail';
      }
    }
  }

  return path;
}
