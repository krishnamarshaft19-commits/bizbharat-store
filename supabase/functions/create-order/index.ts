import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const PAYU_MERCHANT_KEY = Deno.env.get("PAYU_MERCHANT_KEY")!;
    const PAYU_MERCHANT_SALT = Deno.env.get("PAYU_MERCHANT_SALT")!;
    const PAYU_ENV = Deno.env.get("PAYU_ENV") || "test";
    const PAYU_BASE_URL = PAYU_ENV === "production"
      ? "https://secure.payu.in"
      : "https://test.payu.in";
    const SITE_URL = Deno.env.get("SITE_URL") || new URL(req.headers.get("origin") || req.headers.get("referer") || "http://localhost:3000").origin;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { product_id, product_title, amount, pdf_file, customer_name, customer_email, customer_phone } = await req.json();

    // Validate required fields
    if (!product_id || !product_title || !amount || !pdf_file || !customer_email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate unique order ID
    const orderId = `BB-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Create order in database
    const { data: order, error: dbError } = await supabase
      .from("orders")
      .insert({
        order_id: orderId,
        product_id,
        product_title,
        amount: parseFloat(amount),
        customer_name: customer_name || "",
        customer_email,
        customer_phone: customer_phone || "",
        pdf_file,
        payment_status: "pending",
        download_expiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to create order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate PayU hash
    // Hash formula: sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt)
    const txnId = orderId;
    const amountStr = parseFloat(amount).toFixed(2);
    const productInfo = product_title.substring(0, 100);
    const firstName = customer_name || "Customer";
    const email = customer_email;
    const udf1 = "";
    const udf2 = "";
    const udf3 = "";
    const udf4 = "";
    const udf5 = "";

    const hashString = `${PAYU_MERCHANT_KEY}|${txnId}|${amountStr}|${productInfo}|${firstName}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${PAYU_MERCHANT_SALT}`;

    const encoder = new TextEncoder();
    const data = encoder.encode(hashString);
    const hashBuffer = await crypto.subtle.digest("SHA-512", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // Success and failure URLs
    const successUrl = `${SITE_URL}/success.html`;
    const failureUrl = `${SITE_URL}/failure.html`;

    // PayU form parameters
    const payuParams = {
      key: PAYU_MERCHANT_KEY,
      txnid: txnId,
      amount: amountStr,
      productinfo: productInfo,
      firstname: firstName,
      email: email,
      phone: customer_phone || "",
      surl: `${SUPABASE_URL}/functions/v1/payment-callback`,
      furl: `${SUPABASE_URL}/functions/v1/payment-callback`,
      hash: hash,
      service_provider: "payu_paisa",
    };

    return new Response(
      JSON.stringify({
        success: true,
        order_id: orderId,
        payu_url: `${PAYU_BASE_URL}/_payment`,
        payu_params: payuParams,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
