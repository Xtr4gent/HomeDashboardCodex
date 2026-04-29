import Link from "next/link";

type PaginationControlsProps = {
  basePath: string;
  currentPage: number;
  pageParam: string;
  pageSize?: number;
  query?: Record<string, string | undefined>;
  totalItems: number;
  totalPages: number;
};

export function PaginationControls({
  basePath,
  currentPage,
  pageParam,
  pageSize = 5,
  query = {},
  totalItems,
  totalPages
}: PaginationControlsProps) {
  if (totalPages <= 1) {
    return null;
  }

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <nav className="pagination" aria-label="Pagination">
      <span>
        Showing {start}-{end} of {totalItems}
      </span>
      <div>
        <PaginationLink
          basePath={basePath}
          disabled={currentPage <= 1}
          label="Previous"
          page={currentPage - 1}
          pageParam={pageParam}
          query={query}
        />
        <strong>
          Page {currentPage} of {totalPages}
        </strong>
        <PaginationLink
          basePath={basePath}
          disabled={currentPage >= totalPages}
          label="Next"
          page={currentPage + 1}
          pageParam={pageParam}
          query={query}
        />
      </div>
    </nav>
  );
}

function PaginationLink({
  basePath,
  disabled,
  label,
  page,
  pageParam,
  query
}: {
  basePath: string;
  disabled: boolean;
  label: string;
  page: number;
  pageParam: string;
  query: Record<string, string | undefined>;
}) {
  if (disabled) {
    return <span className="secondary-button pagination-disabled">{label}</span>;
  }

  return (
    <Link className="secondary-button" href={paginationHref(basePath, pageParam, page, query)}>
      {label}
    </Link>
  );
}

function paginationHref(basePath: string, pageParam: string, page: number, query: Record<string, string | undefined>) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  if (page > 1) {
    params.set(pageParam, String(page));
  } else {
    params.delete(pageParam);
  }

  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}
