import type { ComponentType } from 'react';
import {
  ArchiveContent,
  AudioContent,
  CodeContent,
  createNodeTypeRegistry,
  GenericContent,
  ImageContent,
  MarkdownContent,
  PdfContent,
  SpreadsheetContent,
  SvgContent,
  SqliteContent,
  SqliteTableContent,
  JsonContent,
  VmlContent,
  GraphvizContent,
  ExcalidrawContent,
  PlantumlContent,
  MermaidContent,
  ParquetContent,
  VideoContent,
  type FileTypeContentProps,
  type NodeTypeRegistry,
  type ResolvedNodeType,
  type SpringstackHelpers,
  type SpringstackNode
} from 'springstack';
import type { DemoNodeData } from '../components/demos/SpringstackDemo';
import {
  Archive,
  BookOpen,
  Braces,
  Clapperboard,
  Columns,
  Database,
  File,
  FileText,
  Folder,
  GitFork,
  GitBranch,
  Image,
  Link2,
  Music2,
  PenTool,
  Shapes,
  SquarePlay,
  Table2,
  Terminal,
  Workflow
} from 'lucide-react';

const formatDuration = (durationSec?: number) => {
  if (!durationSec || durationSec <= 0) return undefined;
  const totalSeconds = Math.round(durationSec);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const formatVmlDetail = (data?: DemoNodeData) => {
  if (!data) return undefined;
  const parts: string[] = [];
  if (data.width && data.height) parts.push(`${data.width}×${data.height}`);
  if (data.fps) parts.push(`${data.fps}fps`);
  if (data.sceneCount) parts.push(`${data.sceneCount} scenes`);
  const duration = formatDuration(data.durationSec);
  if (duration) parts.push(duration);
  return parts.length ? parts.join(' · ') : undefined;
};

const formatDiagramDetail = (node: SpringstackNode<DemoNodeData>) => {
  if (node.kind === 'text/vnd.graphviz') {
    const { nodeCount, edgeCount } = node.data ?? {};
    if (nodeCount && edgeCount) return `${nodeCount} nodes · ${edgeCount} edges`;
  }
  if (node.kind === 'application/x-excalidraw+json') {
    const { elementCount } = node.data ?? {};
    if (elementCount) return `${elementCount} elements`;
  }
  if (node.kind === 'text/x-plantuml') {
    const { elementCount } = node.data ?? {};
    if (elementCount) return `${elementCount} elements`;
  }
  if (node.kind === 'text/x-mermaid') {
    const { diagramType } = node.data ?? {};
    if (diagramType) return diagramType;
  }
  return undefined;
};

const detailLineFor = (node: SpringstackNode<DemoNodeData>) => {
  if (node.kind === 'application/x-vml+xml') {
    const vmlLine = formatVmlDetail(node.data);
    if (vmlLine) return vmlLine;
  }
  const diagramLine = formatDiagramDetail(node);
  if (diagramLine) return diagramLine;
  if (node.data?.metaLine) return node.data.metaLine;
  if (typeof node.data?.rowCount === 'number' && typeof node.data?.columnCount === 'number') {
    return `${node.data.rowCount} rows · ${node.data.columnCount} cols`;
  }
  if (typeof node.data?.tableCount === 'number') {
    return `${node.data.tableCount} tables`;
  }
  if (typeof node.data?.itemCount === 'number') {
    return `${node.data.itemCount} items`;
  }
  const parts: string[] = [];
  if (node.data?.mediaType) parts.push(node.data.mediaType);
  else if (node.kind) parts.push(node.kind);
  if (typeof node.data?.sizeKb === 'number') parts.push(`${node.data.sizeKb} KB`);
  return parts.join(' · ') || undefined;
};

const contentRenderer = (Component: ComponentType<FileTypeContentProps<DemoNodeData>>) =>
  (node: SpringstackNode<DemoNodeData>, resolved: ResolvedNodeType<DemoNodeData>, helpers?: SpringstackHelpers<DemoNodeData>) => (
    <Component
      node={node}
      icon={resolved.icon}
      detailLine={resolved.detailLine ?? detailLineFor(node)}
      helpers={helpers}
    />
  );

export const createDemoNodeTypeRegistry = (): NodeTypeRegistry<DemoNodeData> => {
  return createNodeTypeRegistry<DemoNodeData>({
    fallback: {
      icon: File,
      detailLine: detailLineFor,
      content: contentRenderer(GenericContent)
    }
  })
    .register('application/x-root', {
      icon: BookOpen,
      detailLine: detailLineFor
    })
    .register('application/x-folder', {
      icon: Folder,
      detailLine: detailLineFor
    })
    .register('application/x-detail', {
      icon: Link2,
      detailLine: detailLineFor
    })
    .register('text/markdown', {
      icon: FileText,
      detailLine: detailLineFor,
      content: contentRenderer(MarkdownContent)
    })
    .register('application/pdf', {
      icon: FileText,
      detailLine: detailLineFor,
      content: contentRenderer(PdfContent)
    })
    .register('image/svg+xml', {
      icon: Shapes,
      detailLine: detailLineFor,
      content: contentRenderer(SvgContent)
    })
    .register('application/x-sqlite3', {
      icon: Database,
      detailLine: detailLineFor,
      content: contentRenderer(SqliteContent)
    })
    .register('application/x-sqlite3-table', {
      icon: Table2,
      detailLine: detailLineFor,
      content: contentRenderer(SqliteTableContent)
    })
    .register('application/json', {
      icon: Braces,
      detailLine: detailLineFor,
      content: contentRenderer(JsonContent)
    })
    .register('application/x-vml+xml', {
      icon: Clapperboard,
      detailLine: detailLineFor,
      content: contentRenderer(VmlContent)
    })
    .register('text/vnd.graphviz', {
      icon: GitFork,
      detailLine: detailLineFor,
      content: contentRenderer(GraphvizContent)
    })
    .register('text/x-mermaid', {
      icon: GitBranch,
      detailLine: detailLineFor,
      content: contentRenderer(MermaidContent)
    })
    .register('application/x-parquet', {
      icon: Columns,
      detailLine: detailLineFor,
      content: contentRenderer(ParquetContent)
    })
    .register('application/x-excalidraw+json', {
      icon: PenTool,
      detailLine: detailLineFor,
      content: contentRenderer(ExcalidrawContent)
    })
    .register('text/x-plantuml', {
      icon: Workflow,
      detailLine: detailLineFor,
      content: contentRenderer(PlantumlContent)
    })
    .register('text/csv', {
      icon: Table2,
      detailLine: detailLineFor,
      content: contentRenderer(SpreadsheetContent)
    })
    .register('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', {
      icon: Table2,
      detailLine: detailLineFor,
      content: contentRenderer(SpreadsheetContent)
    })
    .register('text/typescript', {
      icon: Terminal,
      detailLine: detailLineFor,
      content: contentRenderer(CodeContent)
    })
    .register('application/zip', {
      icon: Archive,
      detailLine: detailLineFor,
      content: contentRenderer(ArchiveContent)
    })
    .register('image/*', {
      icon: Image,
      detailLine: detailLineFor,
      content: contentRenderer(ImageContent)
    })
    .register('audio/*', {
      icon: Music2,
      detailLine: detailLineFor,
      content: contentRenderer(AudioContent)
    })
    .register('video/*', {
      icon: SquarePlay,
      detailLine: detailLineFor,
      content: contentRenderer(VideoContent)
    });
};
