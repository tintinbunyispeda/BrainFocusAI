import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, user_id } = await req.json();

    if (!email || !user_id) {
      return new Response(
        JSON.stringify({ error: "Email and user_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the user exists and email matches
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("id", user_id)
      .eq("email", email.toLowerCase())
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "User verification failed" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a recovery link for the user (works better for programmatic auth)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: email.toLowerCase(),
    });

    if (linkError || !linkData) {
      console.error("Magic link error:", linkError);
      return new Response(
        JSON.stringify({ error: "Failed to generate authentication link" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use hashed_token which is the correct token for verifyOtp
    const hashedToken = linkData.properties.hashed_token;

    console.log("Generated token for face auth, email:", email.toLowerCase());

    return new Response(
      JSON.stringify({ 
        success: true,
        token: hashedToken,
        type: "recovery",
        email: email.toLowerCase(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Face auth error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
