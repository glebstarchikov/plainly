import { db } from "@/db";
import { userTable } from "@/db/schema";

export const dynamic = "force-dynamic";

// The crons in vercel.json call this a few times a day: Supabase pauses a free project whose tables see too few queries in a week.
export async function GET() {
  await db.select({ id: userTable.id }).from(userTable).limit(1);
  return new Response(null, { status: 204 });
}
