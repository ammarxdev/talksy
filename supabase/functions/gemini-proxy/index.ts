// @ts-nocheck
// Supabase Edge Function: gemini-proxy
// Proxies requests to the Gemini API using an API key + model stored in Supabase.
// Requires DATABASE_URL, SERVICE_ROLE_KEY, and ANON_KEY to be set as function secrets.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
    status: init.status ?? 200,
  });
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  }

  try {
    const requestBody = await req.json().catch(() => undefined);
    if (!requestBody || typeof requestBody !== "object") {
      return json({ error: "Invalid JSON body" }, { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("DATABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return json(
        {
          error: "Missing Supabase Edge Function secrets",
          hint: "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or DATABASE_URL and SERVICE_ROLE_KEY).",
        },
        { status: 500, headers: corsHeaders }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Fetch Gemini config from DB on every request (fully dynamic)
    const { data: cfg, error: cfgError } = await admin
      .from("ai_provider_config")
      .select("api_key, model")
      .eq("provider", "gemini")
      .single();

    if (cfgError || !cfg?.api_key || !cfg?.model) {
      return json(
        { error: "Gemini configuration not found in Supabase", details: cfgError?.message },
        { status: 500, headers: corsHeaders }
      );
    }

    const geminiBaseUrl = "https://generativelanguage.googleapis.com/v1beta";
    const url = `${geminiBaseUrl}/models/${encodeURIComponent(cfg.model)}:generateContent`;

    const geminiResp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": cfg.api_key,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await geminiResp.text();
    const responseJson = (() => {
      try {
        return JSON.parse(responseText);
      } catch {
        return { raw: responseText };
      }
    })();

    if (!geminiResp.ok) {
      return json(
        {
          error: "Gemini API request failed",
          status: geminiResp.status,
          response: responseJson,
        },
        { status: geminiResp.status, headers: corsHeaders }
      );
    }

    return json(
      {
        ...responseJson,
        _talksy: {
          provider: "gemini",
          model: cfg.model,
        },
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return json({ error: message }, { status: 500, headers: corsHeaders });
  }
});
