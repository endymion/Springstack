import { createElement } from 'react';
import type { ComponentType, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { SpringstackHelpers, SpringstackNode, SpringstackRenderers } from './types';
import type { BaseSummaryProps } from './registryComponents';
import { BaseSummary } from './registryComponents';

export type NodeTypeDetailLine<TData> = string | ((node: SpringstackNode<TData>) => string | undefined);

export type NodeTypeSummaryRenderer<TData> = (
  node: SpringstackNode<TData>,
  resolved: ResolvedNodeType<TData>
) => ReactNode;

export type NodeTypeContentRenderer<TData> = (
  node: SpringstackNode<TData>,
  resolved: ResolvedNodeType<TData>,
  helpers?: SpringstackHelpers<TData>
) => ReactNode;

export interface NodeTypeDefinition<TData = unknown> {
  icon: LucideIcon;
  detailLine?: NodeTypeDetailLine<TData>;
  summary?: NodeTypeSummaryRenderer<TData>;
  content?: NodeTypeContentRenderer<TData>;
}

export interface ResolvedNodeType<TData = unknown> {
  matchedKey: string;
  icon: LucideIcon;
  detailLine?: string;
  summary?: NodeTypeSummaryRenderer<TData>;
  content?: NodeTypeContentRenderer<TData>;
}

export interface NodeTypeRegistry<TData = unknown> {
  register: (kind: string, definition: NodeTypeDefinition<TData>) => NodeTypeRegistry<TData>;
  registerAll: (definitions: Record<string, NodeTypeDefinition<TData>>) => NodeTypeRegistry<TData>;
  resolve: (kind: string) => ResolvedNodeType<TData>;
  toRenderers: () => SpringstackRenderers<TData>;
  iconFor: (kind: string) => LucideIcon;
  detailLineFor: (node: SpringstackNode<TData>) => string | undefined;
  get: (kind: string) => NodeTypeDefinition<TData> | undefined;
}

interface RegistryOptions<TData> {
  fallback: NodeTypeDefinition<TData>;
}

const resolveDetailLine = <TData,>(
  node: SpringstackNode<TData>,
  definition: NodeTypeDefinition<TData> | undefined
) => {
  if (!definition?.detailLine) return undefined;
  if (typeof definition.detailLine === 'string') return definition.detailLine;
  return definition.detailLine(node);
};

const isWildcard = (key: string) => key.includes('*');

const resolveDefinition = <TData,>(
  kind: string,
  definitions: Map<string, NodeTypeDefinition<TData>>,
  fallback: NodeTypeDefinition<TData>
) => {
  const exact = definitions.get(kind);
  if (exact) {
    return { matchedKey: kind, definition: exact };
  }
  const root = kind.split('/')[0];
  const wildcardKey = root ? `${root}/*` : '';
  if (wildcardKey) {
    const wildcard = definitions.get(wildcardKey);
    if (wildcard) {
      return { matchedKey: wildcardKey, definition: wildcard };
    }
  }
  return { matchedKey: 'fallback', definition: fallback };
};

export const createNodeTypeRegistry = <TData,>(options: RegistryOptions<TData>) => {
  const fallback = options.fallback;

  const buildRegistry = (definitions: Map<string, NodeTypeDefinition<TData>>): NodeTypeRegistry<TData> => {
    const resolve = (kind: string): ResolvedNodeType<TData> => {
      const resolved = resolveDefinition(kind, definitions, fallback);
      return {
        matchedKey: resolved.matchedKey,
        icon: resolved.definition.icon,
        detailLine: undefined,
        summary: resolved.definition.summary,
        content: resolved.definition.content
      };
    };

    const iconFor = (kind: string) => resolve(kind).icon;

    const detailLineFor = (node: SpringstackNode<TData>) => {
      const { definition } = resolveDefinition(node.kind, definitions, fallback);
      return resolveDetailLine(node, definition);
    };

    const defaultSummary: NodeTypeSummaryRenderer<TData> = (node, resolved) =>
      createElement(BaseSummary as ComponentType<BaseSummaryProps<TData>>, {
        node,
        icon: resolved.icon,
        detailLine: resolved.detailLine ?? detailLineFor(node)
      });

    const toRenderers = (): SpringstackRenderers<TData> => {
      const list: Record<string, (node: SpringstackNode<TData>) => ReactNode> = {};
      const crumb: Record<string, (node: SpringstackNode<TData>) => ReactNode> = {};

      definitions.forEach((definition, key) => {
        if (isWildcard(key)) return;
        list[key] = node => {
          const detailLine = resolveDetailLine(node, definition);
          const resolved: ResolvedNodeType<TData> = {
            matchedKey: key,
            icon: definition.icon,
            detailLine,
            summary: definition.summary,
            content: definition.content
          };
          return (definition.summary ?? defaultSummary)(node, resolved);
        };
        crumb[key] = list[key];
      });

      const defaultRenderer = (node: SpringstackNode<TData>) => {
        const resolvedDefinition = resolveDefinition(node.kind, definitions, fallback);
        const detailLine = resolveDetailLine(node, resolvedDefinition.definition);
        const resolved: ResolvedNodeType<TData> = {
          matchedKey: resolvedDefinition.matchedKey,
          icon: resolvedDefinition.definition.icon,
          detailLine,
          summary: resolvedDefinition.definition.summary,
          content: resolvedDefinition.definition.content
        };
        return (resolvedDefinition.definition.summary ?? defaultSummary)(node, resolved);
      };

      return {
        list: { ...list, default: defaultRenderer },
        crumb: { ...crumb, default: defaultRenderer }
      };
    };

    return {
      register: (kind, definition) => {
        const next = new Map(definitions);
        next.set(kind, definition);
        return buildRegistry(next);
      },
      registerAll: (defs) => {
        const next = new Map(definitions);
        Object.entries(defs).forEach(([kind, definition]) => {
          next.set(kind, definition);
        });
        return buildRegistry(next);
      },
      resolve: (kind) => {
        const { definition, matchedKey } = resolveDefinition(kind, definitions, fallback);
        return {
          matchedKey,
          icon: definition.icon,
          detailLine: undefined,
          summary: definition.summary,
          content: definition.content
        };
      },
      toRenderers,
      iconFor,
      detailLineFor,
      get: (kind) => definitions.get(kind)
    };
  };

  return buildRegistry(new Map());
};
