import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

serve(async (req) => {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const PAYU_MERCHANT_KEY = Deno.env.get("PAYU_MERCHANT_KEY")!;
    const PAYU_MERCHANT_SALT = Deno.env.get("PAYU_MERCHANT_SALT")!;
    const SITE_URL = Deno.env.get("SITE_URL") || "http://localhost:3000";

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse form data from PayU callback
    const formData = await req.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    const {
      mihpayid,
      status,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      hash: receivedHash,
      additionalCharges,
      udf1 = "",
      udf2 = "",
      udf3 = "",
      udf4 = "",
      udf5 = "",
    } = params;

    // Verify reverse hash from PayU
    // Reverse hash: sha512(salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
    let reverseHashString = `${PAYU_MERCHANT_SALT}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${PAYU_MERCHANT_KEY}`;

    // If additional charges exist, include them
    if (additionalCharges) {
      reverseHashString = `${additionalCharges}|${reverseHashString}`;
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(reverseHashString);
    const hashBuffer = await crypto.subtle.digest("SHA-512", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computedHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    const isHashValid = computedHash === receivedHash;

    if (!isHashValid) {
      console.error("Hash verification failed!", { computed: computedHash, received: receivedHash });
      // Update order as failed due to hash mismatch
      await supabase
        .from("orders")
        .update({
          payment_status: "failed",
          payu_response: { ...params, hash_verification: "failed" },
        })
        .eq("order_id", txnid);

      return Response.redirect(`${SITE_URL}/failure.html?reason=verification_failed&order_id=${txnid}`, 303);
    }

    if (status === "success") {
      // Update order as paid
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          transaction_id: mihpayid,
          payu_response: params,
          download_expiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("order_id", txnid);

      if (updateError) {
        console.error("Failed to update order:", updateError);
      }

      return Response.redirect(
        `${SITE_URL}/success.html?order_id=${txnid}&transaction_id=${mihpayid}&status=success`,
        303
      );
    } else {
      // Payment failed or was cancelled
      await supabase
        .from("orders")
        .update({
          payment_status: "failed",
          payu_response: params,
        })
        .eq("order_id", txnid);

      return Response.redirect(
        `${SITE_URL}/failure.html?order_id=${txnid}&reason=${status}&status=failed`,
        303
      );
    }
  } catch (error) {
    console.error("Callback error:", error);
    const SITE_URL = Deno.env.get("SITE_URL") || "";
    return Response.redirect(`${SITE_URL}/failure.html?reason=server_error`, 303);
  }
});
