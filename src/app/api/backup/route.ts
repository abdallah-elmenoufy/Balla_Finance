import { NextResponse } from "next/server";
import fs from "fs";
import { isAuthed } from "@/lib/auth";
import { db, DB_PATH } from "@/lib/db";
import { todayISO } from "@/lib/money";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthed())) return new NextResponse("Unauthorized", { status: 401 });
  db().pragma("wal_checkpoint(TRUNCATE)");
  const buf = fs.readFileSync(DB_PATH);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="balla-backup-${todayISO()}.db"`,
    },
  });
}
