"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function createCategory(formData: FormData): Promise<void> {
  await requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "expense");
  const emoji = String(formData.get("emoji") ?? "").trim() || null;
  if (!name) return;
  db()
    .prepare("INSERT INTO categories (name, kind, emoji, sort_order) VALUES (?,?,?,99)")
    .run(name, kind, emoji);
  revalidatePath("/", "layout");
}

export async function deleteCategory(id: number): Promise<void> {
  await requireAuth();
  db().prepare("UPDATE transactions SET category_id=NULL WHERE category_id=?").run(id);
  db().prepare("DELETE FROM categories WHERE id=?").run(id);
  revalidatePath("/", "layout");
}
