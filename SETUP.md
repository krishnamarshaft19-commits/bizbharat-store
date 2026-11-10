# BizBharat — Complete Setup Guide

## Prerequisites
- A **Supabase** account with a project ([supabase.com](https://supabase.com))
- A **PayU India** merchant account ([payu.in](https://payu.in))
- The **Supabase CLI** installed (`npm i -g supabase`)
- A hosting solution for the static frontend (Netlify, Vercel, GitHub Pages, or any static host)

---

## Step 1: Supabase Database Setup

1. Go to your **Supabase Dashboard → SQL Editor**
2. Copy-paste and run the SQL from `supabase/migrations/001_create_orders_table.sql`
3. This creates the `orders` table with indexes, triggers, and RLS policies

---

## Step 2: Supabase Storage Setup

1. Go to **Storage** in your Supabase Dashboard
2. Create a **private** bucket named `pdfs` (for PDF files — not publicly accessible)
3. Create a **public** bucket named `covers` (for cover images — publicly accessible)
4. Upload your PDF files to the `pdfs` bucket (paths like `pdfs/business-blueprint.pdf`)
5. Upload cover images to the `covers` bucket (paths like `covers/business-blueprint.png`)
6. Make sure the file paths match those in `products.json`

### Storage Path Convention
```
pdfs/                          ← Private bucket
  ├── business-blueprint.pdf
  ├── digital-marketing.pdf
  └── ...

covers/                        ← Public bucket
  ├── business-blueprint.png
  ├── digital-marketing.png
  └── ...
```

---

## Step 3: Link Supabase CLI to Your Project

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

---

## Step 4: Set Supabase Edge Function Secrets

```bash
supabase secrets set PAYU_MERCHANT_KEY=your_merchant_key
supabase secrets set PAYU_MERCHANT_SALT=your_merchant_salt_v2
supabase secrets set PAYU_BASE_URL=https://test.payu.in
supabase secrets set SITE_URL=https://your-deployed-site.com
```

> **Note:** `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available to edge functions — you do NOT need to set them.

---

## Step 5: Deploy Supabase Edge Functions

```bash
supabase functions deploy create-order --no-verify-jwt
supabase functions deploy payment-callback --no-verify-jwt
supabase functions deploy download-pdf --no-verify-jwt
supabase functions deploy verify-order --no-verify-jwt
```

---

## Step 6: Configure Frontend

Update the `CONFIG` object in **three files**:

### 1. `js/app.js` (line 7-8)
### 2. `success.html` (line 73-74)
### 3. `failure.html` (no config needed — no API calls)

```javascript
const CONFIG = {
  SUPABASE_URL: 'https://YOUR-PROJECT-REF.supabase.co',
  SUPABASE_ANON_KEY: 'your-supabase-anon-key',
};
```

Find these values in **Supabase Dashboard → Settings → API**:
- **Project URL** → `SUPABASE_URL`
- **anon / public key** → `SUPABASE_ANON_KEY`

---

## Step 7: Deploy Frontend

Deploy these files to your static hosting provider:
```
index.html
success.html
failure.html
products.json
css/style.css
js/app.js
```

### Popular options:
- **Netlify**: Drag-and-drop the folder, or connect a Git repo
- **Vercel**: `vercel deploy`
- **GitHub Pages**: Push to a repo and enable Pages

---

## Step 8: Update SITE_URL

After deploying, update the `SITE_URL` secret to match your actual domain:
```bash
supabase secrets set SITE_URL=https://your-actual-domain.com
```

---

## Managing Products

To add, edit, or remove products:

1. Edit `products.json` — add a new entry following the existing format
2. Upload the PDF file to the `pdfs` bucket in Supabase Storage
3. Upload the cover image to the `covers` bucket
4. Redeploy the static site

```json
{
  "id": "unique-id",
  "title": "Your PDF Title",
  "description": "A brief description of the content.",
  "price": 299,
  "original_price": 599,
  "category": "Business",
  "cover_image": "covers/your-cover.png",
  "pdf_file": "pdfs/your-file.pdf",
  "featured": true
}
```

---

## Going Live (Production)

When ready to accept real payments:

1. Switch PayU to production mode:
   ```bash
   supabase secrets set PAYU_BASE_URL=https://secure.payu.in
   supabase secrets set PAYU_MERCHANT_KEY=your_live_key
   supabase secrets set PAYU_MERCHANT_SALT=your_live_salt
   ```

2. Redeploy edge functions:
   ```bash
   supabase functions deploy create-order --no-verify-jwt
   supabase functions deploy payment-callback --no-verify-jwt
   supabase functions deploy download-pdf --no-verify-jwt
   supabase functions deploy verify-order --no-verify-jwt
   ```

---

## Testing Payment Flow

Use PayU **test mode** credentials:

| Field | Value |
|-------|-------|
| PayU Base URL | `https://test.payu.in` |
| Test Card Number | `5123456789012346` |
| CVV | `123` |
| Expiry Date | Any future date |
| OTP | `123456` |

---

## Payment Flow Diagram

```
Customer clicks "Buy Now"
     ↓
Frontend sends product details → create-order Edge Function
     ↓
Edge Function creates DB order + generates PayU hash
     ↓
Frontend submits hidden form to PayU payment page
     ↓
Customer completes payment on PayU
     ↓
PayU POSTs callback → payment-callback Edge Function
     ↓
Edge Function verifies reverse hash + updates order in DB
     ↓
Customer redirected to success.html or failure.html
     ↓
Success page calls download-pdf Edge Function
     ↓
Edge Function generates 5-min signed URL from private storage
     ↓
Customer downloads their PDF
```

---

## Security Features

- ✅ PayU merchant key and salt are **never exposed to the client**
- ✅ Payment hash is generated **server-side** using SHA-512
- ✅ Payment response hash is **verified** before marking orders as paid
- ✅ PDF files are in a **private** Supabase Storage bucket
- ✅ Download links are **signed URLs** that expire in 5 minutes
- ✅ Each order has a maximum of **3 downloads**
- ✅ Download links expire **24 hours** after payment
- ✅ Database access is protected by **Row Level Security**

---

## Troubleshooting

| Issue | Solution |
|-------|---------|
| Products not loading | Check `products.json` is accessible at site root |
| Cover images not showing | Verify `covers` bucket is **public** and file paths match |
| "Configuration Error" toast | Update `CONFIG` in `js/app.js` with your Supabase URL and anon key |
| PayU hash error | Verify `PAYU_MERCHANT_KEY` and `PAYU_MERCHANT_SALT` secrets are correct |
| Payment callback not working | Check `SITE_URL` secret matches your deployed domain exactly |
| Download link errors | Verify `pdfs` bucket exists and files are uploaded with matching paths |
