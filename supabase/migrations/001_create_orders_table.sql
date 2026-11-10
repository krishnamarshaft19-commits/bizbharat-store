-- Orders table for tracking purchases
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL,  -- Human-readable order ID like "BB-xxxxxxxxxx"
  product_id TEXT NOT NULL,
  product_title TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  transaction_id TEXT,
  payu_response JSONB,
  pdf_file TEXT NOT NULL,  -- Storage path to the PDF
  download_count INTEGER DEFAULT 0,
  max_downloads INTEGER DEFAULT 3,
  download_expiry TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON public.orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_transaction_id ON public.orders(transaction_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS policies
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Allow edge functions (service role) full access
-- No public access to orders table
CREATE POLICY "Service role full access" ON public.orders
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
