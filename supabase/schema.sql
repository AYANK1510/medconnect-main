-- ============================================================================
-- MedConnect Pulse Master PostgreSQL Database Schema (supabase/schema.sql)
-- Consolidated Master Schema containing 16 Tables, Constraints, Indexes & RLS
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create Enums & Types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('patient', 'receptionist', 'er_staff', 'hospital_admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE appointment_status AS ENUM ('SCHEDULED', 'CHECKED_IN', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE queue_status AS ENUM ('WAITING', 'CHECKED_IN', 'CALLED', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE emergency_urgency AS ENUM ('CRITICAL', 'HIGH', 'MODERATE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE emergency_status AS ENUM ('PENDING', 'FULFILLED', 'ESCALATED', 'EXPIRED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE match_status AS ENUM ('PENDING', 'NOTIFIED', 'ACCEPTED', 'DECLINED', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE dispatch_status AS ENUM ('RESERVED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE reservation_status AS ENUM ('RESERVED', 'COMMITTED', 'RELEASED', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Utility Trigger Function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TABLE DEFINITIONS (16 TABLES)
-- ============================================================================

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'patient',
    hospital_id UUID,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. HOSPITALS
CREATE TABLE IF NOT EXISTS hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    phone TEXT NOT NULL,
    emergency_contact TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    status TEXT NOT NULL DEFAULT 'operational',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_hospital_latitude CHECK (latitude BETWEEN -90 AND 90),
    CONSTRAINT check_hospital_longitude CHECK (longitude BETWEEN -180 AND 180)
);

ALTER TABLE profiles 
    DROP CONSTRAINT IF EXISTS fk_profiles_hospital;
ALTER TABLE profiles 
    ADD CONSTRAINT fk_profiles_hospital 
    FOREIGN KEY (hospital_id) 
    REFERENCES hospitals(id) 
    ON DELETE SET NULL;

-- 3. HOSPITAL_MEMBERS
CREATE TABLE IF NOT EXISTS hospital_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_hospital_member UNIQUE(hospital_id, user_id)
);

-- 4. DEPARTMENTS
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_hospital_dept_name UNIQUE(hospital_id, name)
);

-- 5. DOCTORS
CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    specialization TEXT NOT NULL,
    avatar_url TEXT,
    consultation_duration_minutes INT NOT NULL DEFAULT 15,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_consultation_duration CHECK (consultation_duration_minutes > 0)
);

-- 6. DOCTOR_SCHEDULES
CREATE TABLE IF NOT EXISTS doctor_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_patients INT NOT NULL DEFAULT 20,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_day_of_week CHECK (day_of_week BETWEEN 0 AND 6),
    CONSTRAINT check_valid_schedule_time CHECK (end_time > start_time),
    CONSTRAINT check_max_patients CHECK (max_patients > 0),
    CONSTRAINT unique_doctor_schedule_slot UNIQUE(doctor_id, day_of_week, start_time)
);

-- 7. PATIENTS
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    age INT NOT NULL,
    gender TEXT NOT NULL,
    blood_group TEXT,
    phone TEXT NOT NULL,
    emergency_contact TEXT,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_patient_age CHECK (age BETWEEN 0 AND 150)
);

-- 8. APPOINTMENTS
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_number TEXT UNIQUE NOT NULL,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    patient_name TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status appointment_status NOT NULL DEFAULT 'SCHEDULED',
    source TEXT NOT NULL DEFAULT 'web_ui',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_doctor_appointment_slot UNIQUE(doctor_id, appointment_date, appointment_time)
);

-- 9. QUEUE_TOKENS
CREATE TABLE IF NOT EXISTS queue_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    token_number TEXT NOT NULL,
    sequence_number INT NOT NULL,
    status queue_status NOT NULL DEFAULT 'WAITING',
    estimated_wait_minutes INT DEFAULT 0,
    checked_in_at TIMESTAMPTZ,
    called_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_sequence_number CHECK (sequence_number > 0),
    CONSTRAINT check_wait_minutes CHECK (estimated_wait_minutes >= 0),
    CONSTRAINT unique_hospital_token_number UNIQUE(hospital_id, token_number)
);

-- 10. INVENTORY_ITEMS
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL,
    item_name TEXT NOT NULL,
    subtype TEXT,
    total_quantity INT NOT NULL DEFAULT 0,
    available_quantity INT NOT NULL DEFAULT 0,
    reserved_quantity INT NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'units',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_inventory_available CHECK (available_quantity >= 0),
    CONSTRAINT check_inventory_reserved CHECK (reserved_quantity >= 0),
    CONSTRAINT check_inventory_total CHECK (total_quantity >= 0),
    CONSTRAINT check_reserved_lte_total CHECK (reserved_quantity <= total_quantity),
    CONSTRAINT check_available_calc CHECK (available_quantity = total_quantity - reserved_quantity),
    CONSTRAINT unique_hospital_resource_item UNIQUE(hospital_id, resource_type, item_name, subtype)
);

CREATE OR REPLACE FUNCTION sync_inventory_available_quantity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.available_quantity := NEW.total_quantity - NEW.reserved_quantity;
    NEW.updated_at := NOW();
    IF NEW.total_quantity < 0 THEN
        RAISE EXCEPTION 'Total quantity cannot be negative';
    END IF;
    IF NEW.reserved_quantity < 0 THEN
        RAISE EXCEPTION 'Reserved quantity cannot be negative';
    END IF;
    IF NEW.reserved_quantity > NEW.total_quantity THEN
        RAISE EXCEPTION 'Reserved quantity cannot exceed total quantity';
    END IF;
    IF NEW.available_quantity < 0 THEN
        RAISE EXCEPTION 'Available quantity cannot be negative';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_inventory_available ON inventory_items;
CREATE TRIGGER trg_sync_inventory_available
BEFORE INSERT OR UPDATE ON inventory_items
FOR EACH ROW
EXECUTE FUNCTION sync_inventory_available_quantity();


-- 11. EMERGENCY_REQUESTS
CREATE TABLE IF NOT EXISTS emergency_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number TEXT UNIQUE NOT NULL,
    requesting_hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL,
    blood_group TEXT,
    quantity INT NOT NULL,
    urgency emergency_urgency NOT NULL DEFAULT 'CRITICAL',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    status emergency_status NOT NULL DEFAULT 'PENDING',
    notes TEXT,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '3 minutes'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_request_quantity CHECK (quantity > 0),
    CONSTRAINT check_req_latitude CHECK (latitude BETWEEN -90 AND 90),
    CONSTRAINT check_req_longitude CHECK (longitude BETWEEN -180 AND 180)
);

-- 12. EMERGENCY_MATCHES
CREATE TABLE IF NOT EXISTS emergency_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES emergency_requests(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    distance_km DOUBLE PRECISION NOT NULL,
    status match_status NOT NULL DEFAULT 'PENDING',
    notified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_match_distance CHECK (distance_km >= 0),
    CONSTRAINT unique_request_match_hospital UNIQUE(request_id, hospital_id)
);

-- 13. RESOURCE_RESERVATIONS
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

-- 14. DISPATCHES
CREATE TABLE IF NOT EXISTS dispatches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES emergency_requests(id) ON DELETE CASCADE,
    reservation_id UUID REFERENCES resource_reservations(id) ON DELETE SET NULL,
    source_hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    destination_hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL,
    blood_group TEXT,
    quantity INT NOT NULL,
    status dispatch_status NOT NULL DEFAULT 'RESERVED',
    verification_code TEXT UNIQUE NOT NULL,
    eta_minutes INT,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dispatched_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_dispatch_quantity CHECK (quantity > 0),
    CONSTRAINT check_dispatch_eta CHECK (eta_minutes IS NULL OR eta_minutes >= 0)
);

-- 15. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    link TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. ACTIVITY_LOGS
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB,
    category TEXT DEFAULT 'system',
    severity TEXT DEFAULT 'info',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR ALL 16 TABLES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_hospital_id ON profiles(hospital_id);

CREATE INDEX IF NOT EXISTS idx_hospitals_code ON hospitals(code);
CREATE INDEX IF NOT EXISTS idx_hospitals_location ON hospitals(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_hospitals_status ON hospitals(status);

CREATE INDEX IF NOT EXISTS idx_hospital_members_hospital ON hospital_members(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hospital_members_user ON hospital_members(user_id);
CREATE INDEX IF NOT EXISTS idx_hospital_members_role ON hospital_members(role);

CREATE INDEX IF NOT EXISTS idx_departments_hospital ON departments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);

CREATE INDEX IF NOT EXISTS idx_doctors_hospital ON doctors(hospital_id);
CREATE INDEX IF NOT EXISTS idx_doctors_dept ON doctors(department_id);
CREATE INDEX IF NOT EXISTS idx_doctors_user ON doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_active ON doctors(is_active);

CREATE INDEX IF NOT EXISTS idx_doctor_schedules_doctor ON doctor_schedules(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_day ON doctor_schedules(day_of_week);

CREATE INDEX IF NOT EXISTS idx_patients_user ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);

CREATE INDEX IF NOT EXISTS idx_appointments_hospital ON appointments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_appointments_dept ON appointments(department_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date_status ON appointments(appointment_date, status);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON appointments(doctor_id, appointment_date);

CREATE INDEX IF NOT EXISTS idx_queue_tokens_hospital ON queue_tokens(hospital_id);
CREATE INDEX IF NOT EXISTS idx_queue_tokens_appointment ON queue_tokens(appointment_id);
CREATE INDEX IF NOT EXISTS idx_queue_tokens_status ON queue_tokens(status);
CREATE INDEX IF NOT EXISTS idx_queue_tokens_hospital_status ON queue_tokens(hospital_id, status);

CREATE INDEX IF NOT EXISTS idx_inventory_hospital ON inventory_items(hospital_id);
CREATE INDEX IF NOT EXISTS idx_inventory_resource_type ON inventory_items(resource_type);
CREATE INDEX IF NOT EXISTS idx_inventory_hospital_resource ON inventory_items(hospital_id, resource_type);

CREATE INDEX IF NOT EXISTS idx_emergency_req_hospital ON emergency_requests(requesting_hospital_id);
CREATE INDEX IF NOT EXISTS idx_emergency_req_status ON emergency_requests(status);
CREATE INDEX IF NOT EXISTS idx_emergency_req_urgency ON emergency_requests(urgency);
CREATE INDEX IF NOT EXISTS idx_emergency_req_resource ON emergency_requests(resource_type);
CREATE INDEX IF NOT EXISTS idx_emergency_req_location ON emergency_requests(latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_emergency_matches_request ON emergency_matches(request_id);
CREATE INDEX IF NOT EXISTS idx_emergency_matches_hospital ON emergency_matches(hospital_id);
CREATE INDEX IF NOT EXISTS idx_emergency_matches_status ON emergency_matches(status);

CREATE INDEX IF NOT EXISTS idx_resource_res_request ON resource_reservations(request_id);
CREATE INDEX IF NOT EXISTS idx_resource_res_inventory ON resource_reservations(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_resource_res_hospital ON resource_reservations(hospital_id);
CREATE INDEX IF NOT EXISTS idx_resource_res_status ON resource_reservations(status);

CREATE INDEX IF NOT EXISTS idx_dispatches_request ON dispatches(request_id);
CREATE INDEX IF NOT EXISTS idx_dispatches_source ON dispatches(source_hospital_id);
CREATE INDEX IF NOT EXISTS idx_dispatches_dest ON dispatches(destination_hospital_id);
CREATE INDEX IF NOT EXISTS idx_dispatches_status ON dispatches(status);
CREATE INDEX IF NOT EXISTS idx_dispatches_code ON dispatches(verification_code);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_hospital ON notifications(hospital_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_activity_hospital ON activity_logs(hospital_id);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_category ON activity_logs(category);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at DESC);

-- ============================================================================
-- FUNCTIONS & PROCEDURES
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_haversine_distance(
    lat1 DOUBLE PRECISION, lon1 DOUBLE PRECISION,
    lat2 DOUBLE PRECISION, lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE
    r DOUBLE PRECISION := 6371.0;
    dlat DOUBLE PRECISION;
    dlon DOUBLE PRECISION;
    a DOUBLE PRECISION;
    c DOUBLE PRECISION;
BEGIN
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);
    a := sin(dlat / 2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2)^2;
    c := 2 * atan2(sqrt(a), sqrt(1 - a));
    RETURN r * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION reserve_emergency_inventory(
    p_hospital_id UUID, p_resource_type TEXT, p_quantity INT, p_request_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_available INT;
    v_req_hospital_id UUID;
    v_resource TEXT;
    v_req_quantity INT;
    v_dispatch_id UUID;
    v_reservation_id UUID;
    v_inventory_item_id UUID;
    v_verification_code TEXT;
BEGIN
    SELECT requesting_hospital_id, resource_type, quantity
    INTO v_req_hospital_id, v_resource, v_req_quantity
    FROM emergency_requests WHERE id = p_request_id AND status = 'PENDING' FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Emergency request is no longer available or pending.');
    END IF;

    SELECT id, available_quantity INTO v_inventory_item_id, v_available
    FROM inventory_items
    WHERE hospital_id = p_hospital_id
      AND (lower(resource_type) = lower(p_resource_type) OR lower(item_name) LIKE '%' || lower(p_resource_type) || '%')
      AND available_quantity >= p_quantity
    FOR UPDATE;

    IF NOT FOUND OR v_available < p_quantity THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient available inventory to fulfill emergency reservation.');
    END IF;

    UPDATE inventory_items
    SET available_quantity = available_quantity - p_quantity,
        reserved_quantity = reserved_quantity + p_quantity,
        updated_at = NOW()
    WHERE id = v_inventory_item_id;

    INSERT INTO resource_reservations (
        request_id, inventory_item_id, hospital_id, reserved_quantity, status, expires_at
    ) VALUES (
        p_request_id, v_inventory_item_id, p_hospital_id, p_quantity, 'RESERVED', NOW() + INTERVAL '30 minutes'
    ) RETURNING id INTO v_reservation_id;

    v_verification_code := 'DSP-' || upper(substring(md5(random()::text) from 1 for 8));

    INSERT INTO dispatches (
        request_id, reservation_id, source_hospital_id, destination_hospital_id,
        resource_type, quantity, status, verification_code
    ) VALUES (
        p_request_id, v_reservation_id, p_hospital_id, v_req_hospital_id,
        p_resource_type, p_quantity, 'RESERVED', v_verification_code
    ) RETURNING id INTO v_dispatch_id;

    UPDATE emergency_requests SET status = 'FULFILLED', updated_at = NOW() WHERE id = p_request_id;
    UPDATE emergency_matches SET status = 'ACCEPTED', responded_at = NOW() WHERE request_id = p_request_id AND hospital_id = p_hospital_id;
    UPDATE emergency_matches SET status = 'DECLINED', responded_at = NOW() WHERE request_id = p_request_id AND hospital_id != p_hospital_id AND status = 'PENDING';

    RETURN jsonb_build_object(
        'success', true, 'reservation_id', v_reservation_id, 'dispatch_id', v_dispatch_id, 'verification_code', v_verification_code
    );
END;
$$ LANGUAGE plpgsql;

-- Realtime Setup
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE queue_tokens;
ALTER PUBLICATION supabase_realtime ADD TABLE emergency_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE emergency_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE dispatches;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_items;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
