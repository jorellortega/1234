import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const supabase = supabaseServer();
  const { error } = await supabase.from("generations").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  
  const body = await req.json().catch(() => ({}));
  
  // Check if updating output
  if (body.output !== undefined) {
    // Get authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const supabase = supabaseServer();
    
    // Set the session from the authorization header
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Update output field
    console.log('💾 [API] Updating generation output. ID:', id, 'Output length:', body.output?.length || 0)
    const { data, error } = await supabase
      .from("generations")
      .update({ output: body.output })
      .eq("id", id)
      .eq("user_id", user.id) // Ensure user owns this generation
      .select()
      .single()

    if (error) {
      console.error('❌ [API] Database update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ [API] Generation updated successfully. ID:', id)
    return NextResponse.json({ ok: true, output: body.output, generation: data })
  }
  
  // Legacy: Update tags (for backward compatibility)
  const { tags } = body;
  if (!Array.isArray(tags)) return NextResponse.json({ error: "tags must be an array of strings" }, { status: 400 });

  const cleaned = tags
    .map((t: unknown) => (typeof t === "string" ? t.trim() : ""))
    .filter((t: string) => t.length > 0);

  const supabase = supabaseServer();
  const { error } = await supabase.from("generations").update({ tags: cleaned }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, tags: cleaned });
}
