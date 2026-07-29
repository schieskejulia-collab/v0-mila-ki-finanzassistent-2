import { NextResponse } from "next/server";
import { requireSupabaseUser } from "@/lib/supabase-server";

export async function GET(req: Request) {
  const { client, user, error: authError } = await requireSupabaseUser(req);

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: authError },
      { status: 401 }
    );
  }

  const { data, error } = await client
    .from("expenses")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: data ?? [] });
}

export async function POST(req: Request) {
  try {
    const { client, user, error: authError } = await requireSupabaseUser(req);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: authError },
        { status: 401 }
      );
    }

    const body = await req.json();

    const amount = Number(body.amount);

    if (!body.title && !body.vendor) {
      return NextResponse.json(
        { success: false, error: "Titel oder Händler fehlt" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Ungültiger Betrag" },
        { status: 400 }
      );
    }

    const { data, error } = await client
      .from("expenses")
      .insert([
        {
          title: body.title || body.vendor || "Ausgabe",
          amount,
          vendor: body.vendor || "",
          category: body.category || "sonstiges",
          note: body.note || "",
          user_id: user.id,
          date: body.date || new Date().toISOString().split("T")[0],
        },
      ])
      .select();

    if (error) {
      console.error("Supabase Fehler:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Fehler beim Speichern:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Fehler beim Speichern" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { client, user, error: authError } = await requireSupabaseUser(req);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: authError },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "id fehlt" },
        { status: 400 }
      );
    }

    const { error } = await client
      .from("expenses")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Supabase Delete Fehler:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Fehler beim Löschen:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Fehler beim Löschen" },
      { status: 500 }
    );
  }
}
