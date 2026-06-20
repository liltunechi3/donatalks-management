import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const event_id = req.nextUrl.searchParams.get("event_id");
  if (!event_id) return NextResponse.json({ error: "event_id required" }, { status: 400 });

  const { data, error } = await supabaseServer
    .from("event_links")
    .select("*")
    .eq("event_id", event_id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { event_id, label, url, category } = body;

  if (!event_id || !label || !url) {
    return NextResponse.json({ error: "event_id, label, dan url wajib diisi" }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("event_links")
    .insert({ event_id, label, url: url.trim(), category: category || "lainnya" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
