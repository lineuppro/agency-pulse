import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { clientId, email, fullName } = await req.json();

    if (!clientId || !email) {
      return new Response(
        JSON.stringify({ error: "clientId and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[create-client-user] Creating user for client: ${clientId}, email: ${email}`);

    // Initialize Supabase admin client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    if (existingUser) {
      // Check if this user is already linked to a client
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("client_id")
        .eq("user_id", existingUser.id)
        .single();

      if (existingProfile?.client_id) {
        return new Response(
          JSON.stringify({ error: "Este email já está vinculado a um cliente" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update existing profile to link to client
      const { error: updateProfileError } = await supabase
        .from("profiles")
        .update({ 
          client_id: clientId,
          full_name: fullName || null,
        })
        .eq("user_id", existingUser.id);

      if (updateProfileError) {
        console.error("[create-client-user] Error updating profile:", updateProfileError);
        throw updateProfileError;
      }

      // Add client role if not exists
      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert(
          { user_id: existingUser.id, role: "client" },
          { onConflict: "user_id,role" }
        );

      if (roleError) {
        console.error("[create-client-user] Error adding role:", roleError);
      }

      console.log(`[create-client-user] Linked existing user ${existingUser.id} to client ${clientId}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          userId: existingUser.id,
          message: "Usuário existente vinculado ao cliente" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate temporary password
    const tempPassword = crypto.randomUUID().slice(0, 12) + "Aa1!";

    // Create new user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || email.split("@")[0],
      },
    });

    if (createError) {
      console.error("[create-client-user] Error creating user:", createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[create-client-user] Created user: ${newUser.user.id}`);

    // Update profile with client_id (profile is auto-created by trigger)
    // Wait a moment for the trigger to execute
    await new Promise(resolve => setTimeout(resolve, 500));

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ 
        client_id: clientId,
        full_name: fullName || email.split("@")[0],
      })
      .eq("user_id", newUser.user.id);

    if (profileError) {
      console.error("[create-client-user] Error updating profile:", profileError);
      // Try to insert if update fails
      await supabase.from("profiles").insert({
        user_id: newUser.user.id,
        email: email,
        client_id: clientId,
        full_name: fullName || email.split("@")[0],
      });
    }

    // Add client role
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: newUser.user.id, role: "client" });

    if (roleError) {
      console.error("[create-client-user] Error adding role:", roleError);
    }

    // Send password reset email so user can set their own password
    const { error: resetError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: email,
    });

    if (resetError) {
      console.error("[create-client-user] Error generating reset link:", resetError);
    }

    console.log(`[create-client-user] Successfully created user and linked to client`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: newUser.user.id,
        message: "Usuário criado com sucesso. Um email de configuração de senha será enviado." 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[create-client-user] Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
