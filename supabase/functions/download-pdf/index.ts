import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get order_id from query params or body
    let orderId: string | null = null;
    const url = new URL(req.url);
    orderId = url.searchParams.get("order_id");

    if (!orderId && req.method === "POST") {
      const body = await req.json();
      orderId = body.order_id;
    }

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "Order ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch order
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("order_id", orderId)
      .single();

    if (fetchError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify payment status
    if (order.payment_status !== "paid") {
      return new Response(
        JSON.stringify({ error: "Payment not completed for this order" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check download expiry
    if (order.download_expiry && new Date(order.download_expiry) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Download link has expired. Please contact support." }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check download count
    if (order.download_count >= order.max_downloads) {
      return new Response(
        JSON.stringify({ error: "Maximum download limit reached. Please contact support." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate signed URL from Supabase Storage (private bucket "pdfs")
    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from("pdfs")
      .createSignedUrl(order.pdf_file, 300); // 5 minutes expiry

    if (signedUrlError || !signedUrlData) {
      console.error("Signed URL error:", signedUrlError);
      return new Response(
        JSON.stringify({ error: "Failed to generate download link" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment download count
    await supabase
      .from("orders")
      .update({ download_count: order.download_count + 1 })
      .eq("order_id", orderId);

    return new Response(
      JSON.stringify({
        success: true,
        download_url: signedUrlData.signedUrl,
        product_title: order.product_title,
        downloads_remaining: order.max_downloads - order.download_count - 1,
        expires_in: "5 minutes",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Download error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
