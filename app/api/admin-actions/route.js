import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

async function requireCallingAdmin(request, admin) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return { error: "Missing session token", status: 401 };

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return { error: "Invalid session", status: 401 };

  const { data: profile } = await admin
    .from("profiles")
    .select("role, active")
    .eq("id", userData.user.id)
    .single();

  if (!profile || profile.role !== "admin" || !profile.active) {
    return { error: "Only an active admin can do this", status: 403 };
  }
  return { user: userData.user };
}

export async function POST(request) {
  try {
    const admin = getSupabaseAdmin();
    const auth = await requireCallingAdmin(request, admin);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json();
    const { action } = body;

    if (action === "createHrUser") {
      const { email, password, username, permissions } = body;
      if (!email || !password || !username) {
        return NextResponse.json({ error: "Email, password, and username are required" }, { status: 400 });
      }
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createErr) return NextResponse.json({ error: createErr.message }, { status: 400 });

      const { error: profileErr } = await admin.from("profiles").insert({
        id: created.user.id,
        username,
        role: "hr",
        permissions: permissions || {},
        active: true,
      });
      if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 400 });

      return NextResponse.json({ ok: true, id: created.user.id });
    }

    if (action === "resetPassword") {
      const { userId, newPassword } = body;
      if (!userId || !newPassword) {
        return NextResponse.json({ error: "userId and newPassword are required" }, { status: 400 });
      }
      const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}
