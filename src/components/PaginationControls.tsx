"use client";

import { Children, type ReactNode, useState } from "react";

type PaginationControlsProps = {
  children: ReactNode;
  itemLabel?: string;
  pageSize?: number;
};

export function PaginationControls({ children, itemLabel = "items", pageSize = 5 }: PaginationControlsProps) {
  const items = Children.toArray(children);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const [page, setPage] = useState(1);
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const visibleItems = items.slice(startIndex, startIndex + pageSize);

  if (totalItems <= pageSize) {
    return <>{items}</>;
  }

  const start = startIndex + 1;
  const end = Math.min(startIndex + pageSize, totalItems);

  return (
    <>
      {visibleItems}
      <nav className="pagination" aria-label={`${itemLabel} pagination`} aria-live="polite">
        <span>
          Showing {start}-{end} of {totalItems} {itemLabel}
        </span>
        <div>
          <button
            className="secondary-button"
            disabled={currentPage <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            type="button"
          >
            Previous
          </button>
          <strong>
            Page {currentPage} of {totalPages}
          </strong>
          <button
            className="secondary-button"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            type="button"
          >
            Next
          </button>
        </div>
      </nav>
    </>
  );
}
