-- ============================================================================
-- MedConnect Pulse Development Seed Data (supabase/seed.sql)
-- Comprehensive production-like realistic development data
-- ============================================================================

-- Fix UUIDs for reproducible seed relational integrity
DO $$
DECLARE
    -- Hospital UUIDs
    hosp_city_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    hosp_apex_id UUID := 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
    hosp_stjude_id UUID := 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
    hosp_metro_id UUID := 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';

    -- User Profile UUIDs
    user_admin_id UUID := '11111111-1111-4111-8111-111111111111';
    user_reception_id UUID := '22222222-2222-4222-8222-222222222222';
    user_er_id UUID := '33333333-3333-4333-8333-333333333333';
    user_patient1_id UUID := '44444444-4444-4444-8444-444444444444';
    user_patient2_id UUID := '55555555-5555-4555-8555-555555555555';

    -- Department UUIDs
    dept_em_city UUID := 'e1111111-1111-4111-8111-111111111111';
    dept_card_city UUID := 'e2222222-2222-4222-8222-222222222222';
    dept_neuro_city UUID := 'e3333333-3333-4333-8333-333333333333';
    dept_peds_city UUID := 'e4444444-4444-4444-8444-444444444444';
    dept_em_apex UUID := 'e5555555-5555-4555-8555-555555555555';
    dept_card_apex UUID := 'e6666666-6666-4666-8666-666666666666';

    -- Doctor UUIDs
    doc_sharma_id UUID := 'd1111111-1111-4111-8111-111111111111';
    doc_patel_id UUID := 'd2222222-2222-4222-8222-222222222222';
    doc_gupta_id UUID := 'd3333333-3333-4333-8333-333333333333';
    doc_reddy_id UUID := 'd4444444-4444-4444-8444-444444444444';
    doc_singh_id UUID := 'd5555555-5555-4555-8555-555555555555';

    -- Patient Record UUIDs
    patient_rahul_id UUID := 'p1111111-1111-4111-8111-111111111111';
    patient_priya_id UUID := 'p2222222-2222-4222-8222-222222222222';
    patient_amit_id UUID := 'p3333333-3333-4333-8333-333333333333';

    -- Inventory Item UUIDs
    inv_city_o_neg UUID := 'i1111111-1111-4111-8111-111111111111';
    inv_city_o_pos UUID := 'i2222222-2222-4222-8222-222222222222';
    inv_city_icu UUID := 'i3333333-3333-4333-8333-333333333333';
    inv_city_oxy UUID := 'i4444444-4444-4444-8444-444444444444';
    inv_apex_o_neg UUID := 'i5555555-5555-4555-8555-555555555555';
    inv_apex_icu UUID := 'i6666666-6666-4666-8666-666666666666';

    -- Appointment UUIDs
    appt1_id UUID := 'a1111111-1111-4111-8111-111111111111';
    appt2_id UUID := 'a2222222-2222-4222-8222-222222222222';

    -- Emergency Request UUID
    em_req1_id UUID := 'r1111111-1111-4111-8111-111111111111';
    res1_id UUID := 's1111111-1111-4111-8111-111111111111';
BEGIN

    -- 1. SEED HOSPITALS
    INSERT INTO hospitals (id, name, code, address, latitude, longitude, phone, emergency_contact, status, is_active)
    VALUES 
        (hosp_city_id, 'City General Hospital', 'CGH-01', '122 Healthcare Boulevard, Sector 14', 28.6139, 77.2090, '+91-11-23456789', '+91-11-23459999', 'operational', true),
        (hosp_apex_id, 'Apex Care Medical Center', 'ACM-02', '45 Ring Road, Lajpat Nagar', 28.5672, 77.2400, '+91-11-87654321', '+91-11-87659999', 'operational', true),
        (hosp_stjude_id, 'St. Jude Specialty Hospital', 'SJH-03', '88 Health Enclave, Saket', 28.5244, 77.2188, '+91-11-45678901', '+91-11-45679999', 'busy', true),
        (hosp_metro_id, 'Metro Health Super-Specialty', 'MHS-04', '12 GT Road, Connaught Place', 28.6315, 77.2167, '+91-11-98765432', '+91-11-98769999', 'operational', true)
    ON CONFLICT (id) DO NOTHING;

    -- 2. SEED PROFILES
    INSERT INTO profiles (id, full_name, role, hospital_id, phone, avatar_url)
    VALUES
        (user_admin_id, 'Dr. Rajesh Sharma', 'hospital_admin', hosp_city_id, '+91-9876543210', 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=200'),
        (user_reception_id, 'Sunita Verma', 'receptionist', hosp_city_id, '+91-9876543211', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200'),
        (user_er_id, 'Vikram Singh', 'er_staff', hosp_city_id, '+91-9876543212', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200'),
        (user_patient1_id, 'Rahul Kapoor', 'patient', NULL, '+91-9876543213', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200'),
        (user_patient2_id, 'Priya Malhotra', 'patient', NULL, '+91-9876543214', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200')
    ON CONFLICT (id) DO NOTHING;

    -- 3. SEED HOSPITAL MEMBERS
    INSERT INTO hospital_members (hospital_id, user_id, role)
    VALUES
        (hosp_city_id, user_admin_id, 'hospital_admin'),
        (hosp_city_id, user_reception_id, 'receptionist'),
        (hosp_city_id, user_er_id, 'er_staff')
    ON CONFLICT (hospital_id, user_id) DO NOTHING;

    -- 4. SEED DEPARTMENTS
    INSERT INTO departments (id, hospital_id, name, description)
    VALUES
        (dept_em_city, hosp_city_id, 'Emergency & Trauma', '24/7 Acute critical care & emergency response center'),
        (dept_card_city, hosp_city_id, 'Cardiology', 'Comprehensive cardiovascular diagnosis & surgery'),
        (dept_neuro_city, hosp_city_id, 'Neurology', 'Advanced brain and spinal nerve care'),
        (dept_peds_city, hosp_city_id, 'Pediatrics', 'Child healthcare & pediatric specialized treatment'),
        (dept_em_apex, hosp_apex_id, 'Emergency & Trauma', '24/7 Regional emergency trauma department'),
        (dept_card_apex, hosp_apex_id, 'Cardiology', 'Heart health and coronary care unit')
    ON CONFLICT (id) DO NOTHING;

    -- 5. SEED DOCTORS
    INSERT INTO doctors (id, hospital_id, department_id, user_id, name, specialization, consultation_duration_minutes, is_active)
    VALUES
        (doc_sharma_id, hosp_city_id, dept_card_city, user_admin_id, 'Dr. Rajesh Sharma', 'Interventional Cardiologist', 15, true),
        (doc_patel_id, hosp_city_id, dept_neuro_city, NULL, 'Dr. Ananya Patel', 'Neurologist', 20, true),
        (doc_gupta_id, hosp_city_id, dept_peds_city, NULL, 'Dr. Suresh Gupta', 'Pediatrician', 15, true),
        (doc_reddy_id, hosp_apex_id, dept_em_apex, NULL, 'Dr. Kavita Reddy', 'Emergency Care Specialist', 15, true),
        (doc_singh_id, hosp_apex_id, dept_card_apex, NULL, 'Dr. Harpreet Singh', 'Cardiothoracic Surgeon', 30, true)
    ON CONFLICT (id) DO NOTHING;

    -- 6. SEED DOCTOR SCHEDULES
    INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, max_patients, is_active)
    VALUES
        (doc_sharma_id, 1, '09:00:00', '13:00:00', 16, true), -- Monday
        (doc_sharma_id, 3, '09:00:00', '13:00:00', 16, true), -- Wednesday
        (doc_sharma_id, 5, '09:00:00', '13:00:00', 16, true), -- Friday
        (doc_patel_id, 2, '10:00:00', '14:00:00', 12, true),  -- Tuesday
        (doc_patel_id, 4, '10:00:00', '14:00:00', 12, true),  -- Thursday
        (doc_gupta_id, 1, '09:30:00', '12:30:00', 12, true)   -- Monday
    ON CONFLICT (doctor_id, day_of_week, start_time) DO NOTHING;

    -- 7. SEED PATIENTS
    INSERT INTO patients (id, user_id, full_name, age, gender, blood_group, phone, emergency_contact, address)
    VALUES
        (patient_rahul_id, user_patient1_id, 'Rahul Kapoor', 34, 'Male', 'O+', '+91-9876543213', '+91-9876500001', 'Flat 402, Green Meadows, Saket'),
        (patient_priya_id, user_patient2_id, 'Priya Malhotra', 28, 'Female', 'A+', '+91-9876543214', '+91-9876500002', 'H-12 Hauz Khas Enclave'),
        (patient_amit_id, NULL, 'Amit Kumar', 45, 'Male', 'B+', '+91-9811122233', '+91-9811122244', 'C-45 Defence Colony')
    ON CONFLICT (id) DO NOTHING;

    -- 8. SEED APPOINTMENTS
    INSERT INTO appointments (id, appointment_number, hospital_id, department_id, doctor_id, patient_id, patient_name, patient_phone, appointment_date, appointment_time, status, source, notes)
    VALUES
        (appt1_id, 'APT-2026-001', hosp_city_id, dept_card_city, doc_sharma_id, patient_rahul_id, 'Rahul Kapoor', '+91-9876543213', CURRENT_DATE, '10:00:00', 'SCHEDULED', 'web_ui', 'Routine cardiac evaluation'),
        (appt2_id, 'APT-2026-002', hosp_city_id, dept_neuro_city, doc_patel_id, patient_priya_id, 'Priya Malhotra', '+91-9876543214', CURRENT_DATE, '11:00:00', 'CHECKED_IN', 'web_ui', 'Follow-up consultation for migraine')
    ON CONFLICT (id) DO NOTHING;

    -- 9. SEED QUEUE TOKENS
    INSERT INTO queue_tokens (id, hospital_id, appointment_id, department_id, doctor_id, token_number, sequence_number, status, estimated_wait_minutes, checked_in_at)
    VALUES
        (gen_random_uuid(), hosp_city_id, appt1_id, dept_card_city, doc_sharma_id, 'CAR-001', 1, 'WAITING', 15, NOW()),
        (gen_random_uuid(), hosp_city_id, appt2_id, dept_neuro_city, doc_patel_id, 'NEU-001', 1, 'CHECKED_IN', 5, NOW() - INTERVAL '10 minutes')
    ON CONFLICT (hospital_id, token_number) DO NOTHING;

    -- 10. SEED INVENTORY ITEMS
    INSERT INTO inventory_items (id, hospital_id, resource_type, item_name, subtype, total_quantity, available_quantity, reserved_quantity, unit)
    VALUES
        (inv_city_o_neg, hosp_city_id, 'blood', 'Blood Units (O-)', 'O-', 25, 20, 5, 'units'),
        (inv_city_o_pos, hosp_city_id, 'blood', 'Blood Units (O+)', 'O+', 40, 38, 2, 'units'),
        (inv_city_icu, hosp_city_id, 'icu_bed', 'ICU Beds', 'Ventilator', 30, 8, 4, 'beds'),
        (inv_city_oxy, hosp_city_id, 'oxygen', 'Oxygen Cylinders 45L', 'Cylinders 45L', 60, 45, 5, 'cylinders'),
        (inv_apex_o_neg, hosp_apex_id, 'blood', 'Blood Units (O-)', 'O-', 15, 12, 3, 'units'),
        (inv_apex_icu, hosp_apex_id, 'icu_bed', 'ICU Beds', 'Ventilator', 20, 6, 2, 'beds')
    ON CONFLICT (hospital_id, resource_type, item_name, subtype) DO NOTHING;

    -- 11. SEED EMERGENCY REQUESTS
    INSERT INTO emergency_requests (id, request_number, requesting_hospital_id, resource_type, blood_group, quantity, urgency, latitude, longitude, status, notes, expires_at)
    VALUES
        (em_req1_id, 'REQ-EM-901', hosp_city_id, 'blood', 'O-', 4, 'CRITICAL', 28.6139, 77.2090, 'PENDING', 'Emergency trauma patient requires immediate O- negative transfusion', NOW() + INTERVAL '5 minutes')
    ON CONFLICT (id) DO NOTHING;

    -- 12. SEED EMERGENCY MATCHES
    INSERT INTO emergency_matches (id, request_id, hospital_id, distance_km, status, notified_at)
    VALUES
        (gen_random_uuid(), em_req1_id, hosp_apex_id, 4.2, 'NOTIFIED', NOW() - INTERVAL '1 minute'),
        (gen_random_uuid(), em_req1_id, hosp_stjude_id, 8.7, 'PENDING', NOW())
    ON CONFLICT (request_id, hospital_id) DO NOTHING;

    -- 13. SEED RESOURCE RESERVATION
    INSERT INTO resource_reservations (id, request_id, inventory_item_id, hospital_id, reserved_quantity, status, expires_at)
    VALUES
        (res1_id, em_req1_id, inv_apex_o_neg, hosp_apex_id, 4, 'RESERVED', NOW() + INTERVAL '25 minutes')
    ON CONFLICT (id) DO NOTHING;

    -- 14. SEED DISPATCHES
    INSERT INTO dispatches (id, request_id, reservation_id, source_hospital_id, destination_hospital_id, resource_type, blood_group, quantity, status, verification_code, eta_minutes)
    VALUES
        (gen_random_uuid(), em_req1_id, res1_id, hosp_apex_id, hosp_city_id, 'blood', 'O-', 4, 'RESERVED', 'DSP-O-NEG-901', 12)
    ON CONFLICT (verification_code) DO NOTHING;

    -- 15. SEED NOTIFICATIONS
    INSERT INTO notifications (id, user_id, hospital_id, title, message, type, is_read)
    VALUES
        (gen_random_uuid(), user_admin_id, hosp_city_id, 'Critical Emergency Broadcast', 'Emergency Request REQ-EM-901 broadcasted to 2 nearby network hospitals.', 'warning', false),
        (gen_random_uuid(), user_patient1_id, NULL, 'Appointment Confirmed', 'Your appointment with Dr. Rajesh Sharma for today at 10:00 AM has been confirmed.', 'info', true)
    ON CONFLICT (id) DO NOTHING;

    -- 16. SEED ACTIVITY LOGS
    INSERT INTO activity_logs (id, hospital_id, user_id, action, entity_type, entity_id, details, category, severity)
    VALUES
        (gen_random_uuid(), hosp_city_id, user_admin_id, 'EMERGENCY_BROADCAST', 'emergency_requests', em_req1_id, '{"resource":"blood","group":"O-","quantity":4}'::jsonb, 'emergency', 'emergency'),
        (gen_random_uuid(), hosp_city_id, user_reception_id, 'PATIENT_CHECK_IN', 'appointments', appt2_id, '{"patient":"Priya Malhotra","doctor":"Dr. Ananya Patel"}'::jsonb, 'appointment', 'info')
    ON CONFLICT (id) DO NOTHING;

END $$;
