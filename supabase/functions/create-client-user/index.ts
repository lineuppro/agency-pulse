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

    const { clientId, email, fullName, password, role } = await req.json();
    const userRole = role || "client";

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Formato de email inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate password if provided
    if (password && password.length < 6) {
      return new Response(
        JSON.stringify({ error: "A senha deve ter pelo menos 6 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[create-client-user] Creating user: ${email}, client: ${clientId || 'none'}`);

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
          client_id: clientId || null,
          full_name: fullName || null,
        })
        .eq("user_id", existingUser.id);

      if (updateProfileError) {
        console.error("[create-client-user] Error updating profile:", updateProfileError);
        throw updateProfileError;
      }

      // Add role if not exists
      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert(
          { user_id: existingUser.id, role: userRole },
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

    // Use provided password or generate a temporary one
    const userPassword = password || (crypto.randomUUID().slice(0, 12) + "Aa1!");

    // Create new user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: userPassword,
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
        client_id: clientId || null,
        full_name: fullName || email.split("@")[0],
      })
      .eq("user_id", newUser.user.id);

    if (profileError) {
      console.error("[create-client-user] Error updating profile:", profileError);
      // Try to insert if update fails
      await supabase.from("profiles").insert({
        user_id: newUser.user.id,
        email: email,
        client_id: clientId || null,
        full_name: fullName || email.split("@")[0],
      });
    }

    // Add role
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: newUser.user.id, role: userRole });

    if (roleError) {
      console.error("[create-client-user] Error adding role:", roleError);
    }

    console.log(`[create-client-user] Successfully created user with password set by admin`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: newUser.user.id,
        message: password 
          ? "Usuário criado com sucesso! A senha foi definida conforme solicitado."
          : "Usuário criado com senha temporária. Solicite ao usuário que redefina sua senha."
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
