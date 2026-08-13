/** Returns the page that should replace an out-of-range requested page. */
export function getCanonicalPage(
  requestedPage: number,
  totalPages: number,
): number | null {
  const lastPage = Math.max(1, totalPages);
  return requestedPage > lastPage ? lastPage : null;
}
