import type { LucideIcon } from 'lucide-react';
import type { SpringstackHelpers, SpringstackNode } from '../types';

export interface FileTypeContentProps<TData = unknown> {
  node: SpringstackNode<TData>;
  icon?: LucideIcon;
  detailLine?: string;
  helpers?: SpringstackHelpers<TData>;
}
