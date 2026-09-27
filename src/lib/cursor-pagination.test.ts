import assert from "node:assert/strict";
import test from "node:test";
import { collectCursorPages } from "./cursor-pagination";

test("collectCursorPages tum kayitlari sabit sorgu siniri olmadan toplar", async () => {
  const source = Array.from({ length: 4400 }, (_, index) => ({ id: index + 1 }));
  const requestedCursors: Array<number | undefined> = [];

  const rows = await collectCursorPages(async (afterId, pageSize) => {
    requestedCursors.push(afterId);
    const startIndex = afterId ?? 0;
    return source.slice(startIndex, startIndex + pageSize);
  });

  assert.equal(rows.length, 4400);
  assert.deepEqual(requestedCursors, [undefined, 1000, 2000, 3000, 4000]);
  assert.equal(rows.at(-1)?.id, 4400);
});

test("collectCursorPages tam sayfa sonrasinda bos son sayfayi destekler", async () => {
  const source = Array.from({ length: 2000 }, (_, index) => ({ id: index + 1 }));
  const rows = await collectCursorPages(async (afterId, pageSize) => {
    const startIndex = afterId ?? 0;
    return source.slice(startIndex, startIndex + pageSize);
  });

  assert.equal(rows.length, 2000);
});
