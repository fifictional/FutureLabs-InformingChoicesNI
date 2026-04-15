export async function fetchAllPages(fetchPage, options = {}) {
  const pageSize = Math.min(1000, Math.max(1, Number(options.pageSize) || 200));
  const maxPages = Math.max(1, Number(options.maxPages) || 1000);

  const rows = [];
  for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
    const offset = pageIndex * pageSize;
    const pageRows = await fetchPage(offset, pageSize);

    if (!Array.isArray(pageRows)) {
      throw new Error('Paginated endpoint did not return an array payload.');
    }

    rows.push(...pageRows);

    if (pageRows.length < pageSize) {
      break;
    }
  }

  return rows;
}
