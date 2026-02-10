import { useMemo, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { BaseContent } from '../registryComponents';
import type { FileTypeContentProps } from './types';

interface PdfNodeData {
  url?: string;
  pageCount?: number;
}

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

export function PdfContent<TData extends PdfNodeData = PdfNodeData>({
  node,
  icon,
  detailLine
}: FileTypeContentProps<TData>) {
  const [pages, setPages] = useState<number | null>(node.data?.pageCount ?? null);
  const url = node.data?.url;

  const file = useMemo(() => (url ? { url } : undefined), [url]);

  return (
    <BaseContent node={node} icon={icon} detailLine={detailLine} data-testid="file-pdf">
      {url ? (
        <div className="flex flex-col gap-3">
          <Document
            file={file}
            onLoadSuccess={info => setPages(info.numPages)}
            loading={<div className="text-xs text-muted-foreground">Loading PDF…</div>}
            error={<div className="text-xs text-destructive">Failed to load PDF.</div>}
          >
            <Page
              pageNumber={1}
              width={560}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Pages</span>
            <span className="text-foreground">{pages ?? 'Unknown'}</span>
          </div>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">No PDF available.</div>
      )}
    </BaseContent>
  );
}
