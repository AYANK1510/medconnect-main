-- ============================================================================
-- MedConnect Pulse Migration 05: Phase 6 - Live Queue System
-- ============================================================================

-- 1. Ensure queue_tokens table contains timestamps & doctor_id reference
ALTER TABLE queue_tokens ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;
ALTER TABLE queue_tokens ADD COLUMN IF NOT EXISTS called_at TIMESTAMPTZ;
ALTER TABLE queue_tokens ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE queue_tokens ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL;

-- 2. Create helper function for patient queue metrics calculation
CREATE OR REPLACE FUNCTION get_patient_queue_metrics(p_token_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_token RECORD;
    v_current_token RECORD;
    v_people_ahead INT;
    v_doc_duration INT;
    v_est_wait INT;
    v_position INT;
BEGIN
    SELECT * INTO v_token FROM queue_tokens WHERE id = p_token_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Token not found');
    END IF;

    -- Fetch doctor consultation duration (default 15 mins)
    SELECT COALESCE(consultation_duration_minutes, 15) INTO v_doc_duration
    FROM doctors WHERE id = v_token.doctor_id;

    -- Find currently called token for the hospital/doctor
    SELECT * INTO v_current_token 
    FROM queue_tokens 
    WHERE hospital_id = v_token.hospital_id 
      AND (doctor_id = v_token.doctor_id OR doctor_id IS NULL)
      AND status = 'CALLED'
    ORDER BY called_at DESC LIMIT 1;

    -- Count people ahead in active queue states (WAITING or CHECKED_IN)
    SELECT COUNT(*) INTO v_people_ahead 
    FROM queue_tokens 
    WHERE hospital_id = v_token.hospital_id 
      AND (doctor_id = v_token.doctor_id OR doctor_id IS NULL)
      AND status IN ('WAITING', 'CHECKED_IN')
      AND sequence_number < v_token.sequence_number;

    -- Calculate 1-indexed overall queue position among active tokens
    SELECT COUNT(*) INTO v_position 
    FROM queue_tokens 
    WHERE hospital_id = v_token.hospital_id 
      AND (doctor_id = v_token.doctor_id OR doctor_id IS NULL)
      AND status IN ('WAITING', 'CHECKED_IN', 'CALLED')
      AND sequence_number <= v_token.sequence_number;

    v_est_wait := v_people_ahead * COALESCE(v_doc_duration, 15);

    RETURN jsonb_build_object(
        'success', true,
        'my_token', v_token.token_number,
        'current_token', COALESCE(v_current_token.token_number, 'None'),
        'queue_position', v_position,
        'people_ahead', v_people_ahead,
        'estimated_wait_minutes', v_est_wait,
        'status', v_token.status
    );
END;
$$ LANGUAGE plpgsql STABLE;
