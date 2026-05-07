import { Router, type IRouter } from "express";
import { eq, sql, desc, gte } from "drizzle-orm";
import { db, snippetsTable } from "@workspace/db";
import {
  ListSnippetsResponse,
  CreateSnippetBody,
  GetSnippetParams,
  GetSnippetResponse,
  UpdateSnippetParams,
  UpdateSnippetBody,
  UpdateSnippetResponse,
  DeleteSnippetParams,
  GetSnippetStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/snippets/stats", async (req, res): Promise<void> => {
  const [total, byLanguageRaw, favorites, recentCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(snippetsTable).then(r => r[0]?.count ?? 0),
    db
      .select({ language: snippetsTable.language, count: sql<number>`count(*)::int` })
      .from(snippetsTable)
      .groupBy(snippetsTable.language)
      .orderBy(desc(sql`count(*)`)),
    db.select({ count: sql<number>`count(*)::int` }).from(snippetsTable).where(eq(snippetsTable.isFavorited, true)).then(r => r[0]?.count ?? 0),
    db.select({ count: sql<number>`count(*)::int` }).from(snippetsTable).where(gte(snippetsTable.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))).then(r => r[0]?.count ?? 0),
  ]);

  res.json(GetSnippetStatsResponse.parse({ total, byLanguage: byLanguageRaw, favorites, recentCount }));
});

router.get("/snippets", async (_req, res): Promise<void> => {
  const snippets = await db.select().from(snippetsTable).orderBy(desc(snippetsTable.updatedAt));
  res.json(ListSnippetsResponse.parse(snippets));
});

router.post("/snippets", async (req, res): Promise<void> => {
  const parsed = CreateSnippetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [snippet] = await db.insert(snippetsTable).values(parsed.data).returning();
  res.status(201).json(GetSnippetResponse.parse(snippet));
});

router.get("/snippets/:id", async (req, res): Promise<void> => {
  const params = GetSnippetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [snippet] = await db.select().from(snippetsTable).where(eq(snippetsTable.id, params.data.id));
  if (!snippet) {
    res.status(404).json({ error: "Snippet not found" });
    return;
  }

  res.json(GetSnippetResponse.parse(snippet));
});

router.patch("/snippets/:id", async (req, res): Promise<void> => {
  const params = UpdateSnippetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateSnippetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [snippet] = await db
    .update(snippetsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(snippetsTable.id, params.data.id))
    .returning();

  if (!snippet) {
    res.status(404).json({ error: "Snippet not found" });
    return;
  }

  res.json(UpdateSnippetResponse.parse(snippet));
});

router.delete("/snippets/:id", async (req, res): Promise<void> => {
  const params = DeleteSnippetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [snippet] = await db.delete(snippetsTable).where(eq(snippetsTable.id, params.data.id)).returning();
  if (!snippet) {
    res.status(404).json({ error: "Snippet not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
