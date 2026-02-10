import type { ReactNode, HTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { SpringstackNode } from './types';

const mergeClass = (...classes: Array<string | undefined>) => classes.filter(Boolean).join(' ');

export interface BaseSummaryProps<TData = unknown> extends HTMLAttributes<HTMLDivElement> {
  node: SpringstackNode<TData>;
  icon?: LucideIcon;
  detailLine?: string;
}

export function BaseSummary<TData>({ node, icon: Icon, detailLine, className, ...rest }: BaseSummaryProps<TData>) {
  return (
    <div className={mergeClass('flex items-start gap-1', className)} {...rest}>
      {Icon ? <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" strokeWidth={2.25} /> : null}
      <div className="flex flex-col">
        <span className="font-headline text-sm font-semibold text-foreground">{node.title ?? node.id}</span>
        {detailLine ? (
          <span className="font-body text-xs text-muted-foreground">{detailLine}</span>
        ) : null}
      </div>
    </div>
  );
}

export interface BaseContentProps<TData = unknown> extends HTMLAttributes<HTMLDivElement> {
  node: SpringstackNode<TData>;
  icon?: LucideIcon;
  detailLine?: string;
  children?: ReactNode;
}

export function BaseContent<TData>({ node, icon: Icon, detailLine, children, className, ...rest }: BaseContentProps<TData>) {
  return (
    <div className={mergeClass('flex flex-col gap-3 rounded-md bg-muted p-3 text-sm', className)} {...rest}>
      <div className="flex items-start gap-2">
        {Icon ? <Icon className="mt-0.5 h-5 w-5 text-muted-foreground" strokeWidth={2.25} /> : null}
        <div className="flex flex-col">
          <span className="font-headline text-sm font-semibold text-foreground">{node.title ?? node.id}</span>
          {detailLine ? (
            <span className="font-body text-xs text-muted-foreground">{detailLine}</span>
          ) : null}
        </div>
      </div>
      {children ? <div className="flex flex-col gap-2 text-sm text-foreground">{children}</div> : null}
    </div>
  );
}
