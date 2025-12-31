// @ts-nocheck
// Supabase Edge Function: delete-account
// Fully deletes a user: storage assets, profile row, and auth user.
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to be set as function secrets.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Helper to build JSON responses
function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
    status: init.status ?? 200,
  });
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { user_id } = await req.json().catch(() => ({ user_id: undefined }));

    if (!user_id || typeof user_id !== "string") {
      return json({ error: "user_id is required" }, { status: 400 });
    }

    const supabaseUrl = Deno.env.get("DATABASE_URL");
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return json({ error: "Missing DATABASE_URL, SERVICE_ROLE_KEY or ANON_KEY" }, { status: 500 });
    }

    // Verify the caller's JWT and enforce self-deletion only
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
      auth: { persistSession: false },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Invalid or expired token" }, { status: 401 });
    }

    if (userData.user.id !== user_id) {
      return json({ error: "Forbidden: can only delete your own account" }, { status: 403 });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 1) Best-effort: Delete any avatar files under avatars/<user_id>/
    try {
      const { data: files, error: listError } = await admin.storage
        .from("avatars")
        .list(user_id, { limit: 1000, offset: 0 });

      if (!listError && files && files.length > 0) {
        const paths = files.map((f: { name: string }) => `${user_id}/${f.name}`);
        await admin.storage.from("avatars").remove(paths);
      }
    } catch (_) {
      // ignore storage errors
    }

    // 2) Best-effort: Delete profile row
    try {
      await admin.from("profiles").delete().eq("id", user_id);
    } catch (_) {
      // ignore profile deletion errors
    }

    // 3) Delete auth user (authoritative)
    const { error: authError } = await admin.auth.admin.deleteUser(user_id);
    if (authError) {
      return json({ error: authError.message }, { status: 500 });
    }

    return json({ success: true }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return json({ error: message }, { status: 500 });
  }
});
