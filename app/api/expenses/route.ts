import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }

  return NextResponse.json({
    success: true,
    data,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { data, error } = await supabase
      .from("expenses")
      .insert([
        {
          title: body.title,
          amount: Number(body.amount),
          vendor: body.vendor || "",
          category: body.category || "sonstiges",
          note: body.note || "",
          user_id: body.user_id || null,
          date: body.date || new Date().toISOString().split("T")[0],
        },
      ])
      .select();

    if (error) {
      console.error("Supabase Fehler:", error);

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("Fehler beim Speichern:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Fehler beim Speichern",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "id fehlt" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id);

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
      {
        success: false,
        error: error.message || "Fehler beim Löschen",
      },
      { status: 500 }
    );
  }
}