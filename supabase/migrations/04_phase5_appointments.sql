-- ============================================================================
-- MedConnect Pulse Migration 04: Phase 5 - Real Appointment System
-- ============================================================================

-- 1. Update appointment_status enum values
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'BOOKED';
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'IN_QUEUE';
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'NO_SHOW';

-- 2. Add Unique Partial Index to prevent Double Booking on Active Appointments
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_doctor_slot 
ON appointments(doctor_id, appointment_date, appointment_time) 
WHERE status != 'CANCELLED';

-- 3. Add Index for Patient Active Appointment Lookups
CREATE INDEX IF NOT EXISTS idx_appointments_patient_date_status 
ON appointments(patient_phone, appointment_date, status);

-- 4. Create Transactional Stored Procedure for Appointment Creation & Final Availability Check
CREATE OR REPLACE FUNCTION create_appointment_tx(
    p_hospital_id UUID,
    p_department_id UUID,
    p_doctor_id UUID,
    p_patient_id UUID,
    p_patient_name TEXT,
    p_patient_phone TEXT,
    p_appointment_date DATE,
    p_appointment_time TIME,
    p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_hosp_active BOOLEAN;
    v_doc_active BOOLEAN;
    v_doc_hosp_id UUID;
    v_slot_exists INT;
    v_patient_dup INT;
    v_appt_id UUID;
    v_token_id UUID;
    v_seq_num INT;
    v_token_num TEXT;
    v_appt_num TEXT;
BEGIN
    -- Check Hospital Existence & Status
    SELECT is_active INTO v_hosp_active FROM hospitals WHERE id = p_hospital_id;
    IF NOT FOUND OR v_hosp_active IS NOT TRUE THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or inactive hospital ID.');
    END IF;

    -- Check Doctor Existence, Hospital Match & Status
    SELECT is_active, hospital_id INTO v_doc_active, v_doc_hosp_id FROM doctors WHERE id = p_doctor_id FOR SHARE;
    IF NOT FOUND OR v_doc_active IS NOT TRUE OR v_doc_hosp_id != p_hospital_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Doctor is inactive or does not belong to specified hospital.');
    END IF;

    -- Check Past Date/Time
    IF p_appointment_date < CURRENT_DATE THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot book appointments for past dates.');
    ELSIF p_appointment_date = CURRENT_DATE AND p_appointment_time < LOCALTIME THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot book appointments for past times today.');
    END IF;

    -- Double Booking Check (Lock Active Doctor Appointments)
    SELECT COUNT(*) INTO v_slot_exists 
    FROM appointments 
    WHERE doctor_id = p_doctor_id 
      AND appointment_date = p_appointment_date 
      AND appointment_time = p_appointment_time 
      AND status != 'CANCELLED' 
    FOR UPDATE;

    IF v_slot_exists > 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'This time slot has already been booked. Please select another slot.');
    END IF;

    -- Duplicate Patient Booking Check
    SELECT COUNT(*) INTO v_patient_dup 
    FROM appointments 
    WHERE patient_phone = p_patient_phone 
      AND doctor_id = p_doctor_id 
      AND appointment_date = p_appointment_date 
      AND appointment_time = p_appointment_time 
      AND status != 'CANCELLED';

    IF v_patient_dup > 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Patient already has an active appointment for this doctor and time slot.');
    END IF;

    -- Generate IDs and Token Sequence
    v_appt_id := gen_random_uuid();
    v_token_id := gen_random_uuid();
    v_appt_num := 'APPT-' || upper(substring(md5(random()::text) from 1 for 8));

    SELECT COALESCE(MAX(sequence_number), 100) + 1 INTO v_seq_num 
    FROM queue_tokens 
    WHERE hospital_id = p_hospital_id;

    v_token_num := 'MED-' || v_seq_num;

    -- Insert Appointment
    INSERT INTO appointments (
        id, appointment_number, hospital_id, department_id, doctor_id,
        patient_id, patient_name, patient_phone, appointment_date,
        appointment_time, status, notes
    ) VALUES (
        v_appt_id, v_appt_num, p_hospital_id, p_department_id, p_doctor_id,
        p_patient_id, p_patient_name, p_patient_phone, p_appointment_date,
        p_appointment_time, 'BOOKED', p_notes
    );

    -- Insert Queue Token
    INSERT INTO queue_tokens (
        id, hospital_id, appointment_id, department_id, doctor_id,
        token_number, sequence_number, status
    ) VALUES (
        v_token_id, p_hospital_id, v_appt_id, p_department_id, p_doctor_id,
        v_token_num, v_seq_num, 'WAITING'
    );

    RETURN jsonb_build_object(
        'success', true,
        'appointment_id', v_appt_id,
        'appointment_number', v_appt_num,
        'token_id', v_token_id,
        'token_number', v_token_num,
        'status', 'BOOKED'
    );
END;
$$ LANGUAGE plpgsql;
