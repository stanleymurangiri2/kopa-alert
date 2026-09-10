-- Bulk-import offline transactions (debts and payments recorded while a
-- business wasn't using the system - paper, memory, a gap in usage, etc.)
-- in one atomic call. Each row either:
--   - DEBT: creates the customer if new (matched by phone), then a debt
--     dated to when it was actually incurred.
--   - PAYMENT: applies to that customer's oldest still-unpaid debt (FIFO) -
--     rows must be sent in chronological order so multi-row imports that
--     both create and pay off a debt replay correctly.
-- A per-row failure (bad data, no outstanding debt to pay, self-dealing,
-- etc.) doesn't abort the whole batch - it's caught and reported back so
-- the caller can show which rows succeeded and which didn't.
CREATE OR REPLACE FUNCTION public.import_customer_transactions(p_rows JSONB)
RETURNS JSONB AS $$
DECLARE
  v_business_id UUID := public.get_current_user_business_id();
  v_user_id UUID := auth.uid();
  v_row JSONB;
  v_index INT := 0;
  v_results JSONB := '[]'::jsonb;
  v_customer_id UUID;
  v_phone TEXT;
  v_name TEXT;
  v_email TEXT;
  v_type TEXT;
  v_amount NUMERIC;
  v_description TEXT;
  v_due_date DATE;
  v_payment_method TEXT;
  v_txn_date DATE;
  v_debt_id UUID;
BEGIN
  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'No business context for the current user.';
  END IF;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    v_index := v_index + 1;
    v_debt_id := NULL;

    BEGIN
      v_name := trim(coalesce(v_row->>'customer_name', ''));
      v_phone := trim(coalesce(v_row->>'customer_phone', ''));
      v_email := NULLIF(trim(coalesce(v_row->>'customer_email', '')), '');
      v_type := upper(trim(coalesce(v_row->>'type', '')));
      v_amount := NULLIF(v_row->>'amount', '')::NUMERIC;
      v_description := NULLIF(trim(coalesce(v_row->>'description', '')), '');
      v_due_date := NULLIF(v_row->>'due_date', '')::DATE;
      v_payment_method := COALESCE(NULLIF(trim(coalesce(v_row->>'payment_method', '')), ''), 'cash');
      v_txn_date := COALESCE(NULLIF(v_row->>'date', '')::DATE, CURRENT_DATE);

      IF v_name = '' OR v_phone = '' THEN
        RAISE EXCEPTION 'Customer name and phone are required.';
      END IF;

      IF v_amount IS NULL OR v_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be a positive number.';
      END IF;

      IF v_type NOT IN ('DEBT', 'PAYMENT') THEN
        RAISE EXCEPTION 'Type must be DEBT or PAYMENT.';
      END IF;

      SELECT id INTO v_customer_id
      FROM public.customers
      WHERE business_id = v_business_id AND trim(phone) = v_phone;

      IF v_customer_id IS NULL THEN
        INSERT INTO public.customers (business_id, full_name, phone, email)
        VALUES (v_business_id, v_name, v_phone, v_email)
        RETURNING id INTO v_customer_id;
      END IF;

      IF v_type = 'DEBT' THEN
        IF v_due_date IS NULL THEN
          RAISE EXCEPTION 'Due date is required for a DEBT row.';
        END IF;
        IF v_description IS NULL THEN
          RAISE EXCEPTION 'Description is required for a DEBT row.';
        END IF;

        INSERT INTO public.debts (
          business_id, customer_id, amount, amount_paid, description, due_date, status, created_at, updated_at
        ) VALUES (
          v_business_id, v_customer_id, v_amount, 0, v_description, v_due_date, 'pending', v_txn_date, v_txn_date
        ) RETURNING id INTO v_debt_id;

        INSERT INTO public.financial_transactions (
          business_id, customer_id, debt_id, type, amount, description, created_by, created_at
        ) VALUES (
          v_business_id, v_customer_id, v_debt_id, 'LOAN_DISBURSEMENT', v_amount, v_description, v_user_id, v_txn_date
        );
      ELSE
        SELECT id INTO v_debt_id
        FROM public.debts
        WHERE customer_id = v_customer_id
          AND business_id = v_business_id
          AND (amount - amount_paid) > 0
        ORDER BY created_at ASC
        LIMIT 1;

        IF v_debt_id IS NULL THEN
          RAISE EXCEPTION 'No outstanding debt found for this customer to apply the payment to.';
        END IF;

        INSERT INTO public.payments (
          business_id, debt_id, amount_paid, payment_method, notes, created_at
        ) VALUES (
          v_business_id, v_debt_id, v_amount, v_payment_method, v_description, v_txn_date
        );

        INSERT INTO public.financial_transactions (
          business_id, customer_id, debt_id, type, amount, description, created_by, created_at
        ) VALUES (
          v_business_id, v_customer_id, v_debt_id, 'PAYMENT', v_amount, v_description, v_user_id, v_txn_date
        );
      END IF;

      v_results := v_results || jsonb_build_object(
        'row', v_index, 'success', true, 'customer_id', v_customer_id, 'debt_id', v_debt_id
      );
    EXCEPTION WHEN OTHERS THEN
      v_results := v_results || jsonb_build_object(
        'row', v_index, 'success', false, 'error', SQLERRM
      );
    END;
  END LOOP;

  RETURN v_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
