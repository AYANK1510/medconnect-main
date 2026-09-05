-- ============================================================================
-- MedConnect Pulse Migration 07: Phase 9 - Atomic Resource Reservations
-- ============================================================================

-- 1. Ensure resource_reservations table exists with proper fields and constraints
CREATE TABLE IF NOT EXISTS resource_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES emergency_requests(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    reserved_quantity INT NOT NULL,
    status reservation_status NOT NULL DEFAULT 'RESERVED',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_reservation_quantity CHECK (reserved_quantity > 0)
);

ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS reservation_id UUID REFERENCES resource_reservations(id) ON DELETE SET NULL;

-- 2. Stored Procedure / RPC for Atomic Reservation and Dispatch Creation
CREATE OR REPLACE FUNCTION reserve_emergency_inventory(
    p_hospital_id UUID, p_resource_type TEXT, p_quantity INT, p_request_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_available INT;
    v_total INT;
    v_reserved INT;
    v_req_hospital_id UUID;
    v_resource TEXT;
    v_req_quantity INT;
    v_dispatch_id UUID;
    v_reservation_id UUID;
    v_inventory_item_id UUID;
    v_verification_code TEXT;
BEGIN
    -- 1. Validate & Lock Emergency Request (FOR UPDATE)
    SELECT requesting_hospital_id, resource_type, quantity
    INTO v_req_hospital_id, v_resource, v_req_quantity
    FROM emergency_requests WHERE id = p_request_id AND status = 'PENDING' FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Emergency request is no longer available or pending.');
    END IF;

    -- 2. Validate & Lock Inventory Row (FOR UPDATE)
    SELECT id, available_quantity, total_quantity, reserved_quantity
    INTO v_inventory_item_id, v_available, v_total, v_reserved
    FROM inventory_items
    WHERE hospital_id = p_hospital_id
      AND (lower(resource_type) = lower(p_resource_type) OR lower(item_name) LIKE '%' || lower(p_resource_type) || '%')
      AND available_quantity >= p_quantity
    FOR UPDATE;

    IF NOT FOUND OR v_available < p_quantity THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient available inventory to fulfill emergency reservation.');
    END IF;

    -- 3. Atomically Update Inventory (available = total - reserved)
    UPDATE inventory_items
    SET available_quantity = available_quantity - p_quantity,
        reserved_quantity = reserved_quantity + p_quantity,
        updated_at = NOW()
    WHERE id = v_inventory_item_id;

    -- 4. Create Resource Reservation
    INSERT INTO resource_reservations (
        request_id, inventory_item_id, hospital_id, reserved_quantity, status, expires_at
    ) VALUES (
        p_request_id, v_inventory_item_id, p_hospital_id, p_quantity, 'RESERVED', NOW() + INTERVAL '30 minutes'
    ) RETURNING id INTO v_reservation_id;

    -- 5. Create Verification Code & Dispatch Record
    v_verification_code := 'DSP-' || upper(substring(md5(random()::text) from 1 for 8));

    INSERT INTO dispatches (
        request_id, reservation_id, source_hospital_id, destination_hospital_id,
        resource_type, quantity, status, verification_code
    ) VALUES (
        p_request_id, v_reservation_id, p_hospital_id, v_req_hospital_id,
        p_resource_type, p_quantity, 'RESERVED', v_verification_code
    ) RETURNING id INTO v_dispatch_id;

    -- 6. Update Emergency Request & Match Statuses
    UPDATE emergency_requests SET status = 'FULFILLED', updated_at = NOW() WHERE id = p_request_id;
    UPDATE emergency_matches SET status = 'ACCEPTED', responded_at = NOW() WHERE request_id = p_request_id AND hospital_id = p_hospital_id;
    UPDATE emergency_matches SET status = 'DECLINED', responded_at = NOW() WHERE request_id = p_request_id AND hospital_id != p_hospital_id AND status = 'PENDING';

    RETURN jsonb_build_object(
        'success', true,
        'reservation_id', v_reservation_id,
        'dispatch_id', v_dispatch_id,
        'verification_code', v_verification_code
    );
END;
$$ LANGUAGE plpgsql;
