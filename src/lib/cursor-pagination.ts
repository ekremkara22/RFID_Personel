export async function collectCursorPages<T extends { id: number }>(
  loadPage: (afterId: number | undefined, pageSize: number) => Promise<T[]>,
  pageSize = 1000,
) {
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new Error("pageSize pozitif bir tam sayi olmalidir.");
  }

  const rows: T[] = [];
  let afterId: number | undefined;

  while (true) {
    const page = await loadPage(afterId, pageSize);
    rows.push(...page);

    if (page.length < pageSize) return rows;

    const nextAfterId = page.at(-1)?.id;
    if (nextAfterId === undefined || nextAfterId === afterId) {
      throw new Error("Sayfalama imleci ilerlemedi.");
    }
    afterId = nextAfterId;
  }
}
