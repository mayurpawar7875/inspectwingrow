import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roleData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, new_password } = await req.json();
    if (!user_id || !new_password || new_password.length < 6) {
      return new Response(
        JSON.stringify({ error: "user_id and new_password (min 6 chars) required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check if auth user exists
    const { data: existing, error: getErr } = await admin.auth.admin.getUserById(user_id);

    if (getErr || !existing?.user) {
      // Auth user doesn't exist. Look up employee record to create one.
      const { data: emp, error: empErr } = await admin
        .from("employees")
        .select("id, email, full_name, username")
        .eq("id", user_id)
        .maybeSingle();

      if (empErr || !emp) {
        return new Response(JSON.stringify({ error: "Employee not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete the orphan employee row first (handle_new_user trigger will recreate it)
      await admin.from("employees").delete().eq("id", emp.id);

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: emp.email,
        password: new_password,
        email_confirm: true,
        user_metadata: {
          full_name: emp.full_name,
          username: emp.username,
        },
      });

      if (createErr) {
        return new Response(JSON.stringify({ error: createErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update employee row created by trigger to retain username/status
      if (created?.user) {
        await admin
          .from("employees")
          .update({ username: emp.username, full_name: emp.full_name })
          .eq("id", created.user.id);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Auth account created with password" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Auth user exists - just update password
    const { error: updErr } = await admin.auth.admin.updateUserById(user_id, {
      password: new_password,
    });

    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Password updated" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
