-- ============================================================================
-- MedConnect Pulse PostgreSQL Database Migration Phase 2
-- Supabase Row Level Security (RLS) Policies, Auth Triggers & Security Functions
-- ============================================================================

-- 1. SECURITY UTILITY & HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.get_user_role(u_id UUID)
RETURNS user_role AS $$
DECLARE
    u_role user_role;
BEGIN
    SELECT role INTO u_role FROM public.profiles WHERE id = u_id;
    IF u_role IS NULL THEN
        SELECT role INTO u_role FROM public.hospital_members WHERE user_id = u_id LIMIT 1;
    END IF;
    RETURN COALESCE(u_role, 'patient'::user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_user_hospital_id(u_id UUID)
RETURNS UUID AS $$
DECLARE
    h_id UUID;
BEGIN
    SELECT hospital_id INTO h_id FROM public.profiles WHERE id = u_id;
    IF h_id IS NULL THEN
        SELECT hospital_id INTO h_id FROM public.hospital_members WHERE user_id = u_id LIMIT 1;
    END IF;
    RETURN h_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_hospital_member(u_id UUID, target_h_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF target_h_id IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.hospital_members
        WHERE user_id = u_id AND hospital_id = target_h_id
    ) OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = u_id AND hospital_id = target_h_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. AUTOMATIC PROFILE & HOSPITAL MEMBERSHIP CREATION ON AUTH SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
    v_full_name TEXT;
    v_role user_role;
    v_hospital_id UUID;
BEGIN
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
    
    BEGIN
        v_role := (NEW.raw_user_meta_data->>'role')::user_role;
    EXCEPTION WHEN OTHERS THEN
        v_role := 'patient'::user_role;
    END;
    IF v_role IS NULL THEN
        v_role := 'patient'::user_role;
    END IF;

    IF NEW.raw_user_meta_data->>'hospital_id' IS NOT NULL AND NEW.raw_user_meta_data->>'hospital_id' != '' THEN
        v_hospital_id := (NEW.raw_user_meta_data->>'hospital_id')::UUID;
    ELSE
        v_hospital_id := NULL;
    END IF;

    -- Insert into profiles
    INSERT INTO public.profiles (id, full_name, role, hospital_id, phone)
    VALUES (NEW.id, v_full_name, v_role, v_hospital_id, NEW.phone)
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        hospital_id = EXCLUDED.hospital_id,
        updated_at = NOW();

    -- Insert into hospital_members if hospital staff/admin
    IF v_hospital_id IS NOT NULL AND v_role IN ('receptionist', 'er_staff', 'hospital_admin') THEN
        INSERT INTO public.hospital_members (hospital_id, user_id, role)
        VALUES (v_hospital_id, NEW.id, v_role)
        ON CONFLICT (hospital_id, user_id) DO UPDATE
        SET role = EXCLUDED.role;
    END IF;

    -- If patient role, ensure entry in patients table
    IF v_role = 'patient' THEN
        INSERT INTO public.patients (user_id, full_name, age, gender, phone)
        VALUES (NEW.id, v_full_name, 30, 'Unspecified', COALESCE(NEW.phone, ''))
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users (if executing in Supabase instance)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'auth' AND tablename = 'users') THEN
        DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
        CREATE TRIGGER trg_on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();
    END IF;
END $$;

-- 3. DROP PERMISSIVE DEMO POLICIES
DROP POLICY IF EXISTS profiles_all ON public.profiles;
DROP POLICY IF EXISTS hospitals_all ON public.hospitals;
DROP POLICY IF EXISTS hospital_members_all ON public.hospital_members;
DROP POLICY IF EXISTS departments_all ON public.departments;
DROP POLICY IF EXISTS doctors_all ON public.doctors;
DROP POLICY IF EXISTS doctor_schedules_all ON public.doctor_schedules;
DROP POLICY IF EXISTS patients_all ON public.patients;
DROP POLICY IF EXISTS appointments_all ON public.appointments;
DROP POLICY IF EXISTS queue_tokens_all ON public.queue_tokens;
DROP POLICY IF EXISTS inventory_items_all ON public.inventory_items;
DROP POLICY IF EXISTS emergency_requests_all ON public.emergency_requests;
DROP POLICY IF EXISTS emergency_matches_all ON public.emergency_matches;
DROP POLICY IF EXISTS resource_reservations_all ON public.resource_reservations;
DROP POLICY IF EXISTS dispatches_all ON public.dispatches;
DROP POLICY IF EXISTS notifications_all ON public.notifications;
DROP POLICY IF EXISTS activity_logs_all ON public.activity_logs;

-- 4. GRANULAR ROW LEVEL SECURITY (RLS) POLICIES

-- PROFILES
CREATE POLICY profiles_select_self ON public.profiles
    FOR SELECT USING (auth.uid() = id OR public.is_hospital_member(auth.uid(), hospital_id));

CREATE POLICY profiles_update_self ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY profiles_admin_manage ON public.profiles
    FOR ALL USING (
        public.get_user_role(auth.uid()) = 'hospital_admin'
        AND public.is_hospital_member(auth.uid(), hospital_id)
    );

-- HOSPITALS
CREATE POLICY hospitals_select_all ON public.hospitals
    FOR SELECT USING (true);

CREATE POLICY hospitals_admin_update ON public.hospitals
    FOR UPDATE USING (
        public.get_user_role(auth.uid()) = 'hospital_admin'
        AND public.is_hospital_member(auth.uid(), id)
    );

-- HOSPITAL_MEMBERS
CREATE POLICY hospital_members_select ON public.hospital_members
    FOR SELECT USING (
        public.is_hospital_member(auth.uid(), hospital_id)
        OR user_id = auth.uid()
    );

CREATE POLICY hospital_members_admin_manage ON public.hospital_members
    FOR ALL USING (
        public.get_user_role(auth.uid()) = 'hospital_admin'
        AND public.is_hospital_member(auth.uid(), hospital_id)
    );

-- PATIENTS
CREATE POLICY patients_select ON public.patients
    FOR SELECT USING (
        user_id = auth.uid()
        OR public.get_user_role(auth.uid()) IN ('receptionist', 'er_staff', 'hospital_admin')
    );

CREATE POLICY patients_insert_update ON public.patients
    FOR ALL USING (
        user_id = auth.uid()
        OR public.get_user_role(auth.uid()) IN ('receptionist', 'er_staff', 'hospital_admin')
    );

-- APPOINTMENTS
CREATE POLICY appointments_patient_select ON public.appointments
    FOR SELECT USING (
        patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
        OR public.is_hospital_member(auth.uid(), hospital_id)
    );

CREATE POLICY appointments_patient_insert ON public.appointments
    FOR INSERT WITH CHECK (
        patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
        OR public.is_hospital_member(auth.uid(), hospital_id)
    );

CREATE POLICY appointments_staff_manage ON public.appointments
    FOR ALL USING (
        public.is_hospital_member(auth.uid(), hospital_id)
        AND public.get_user_role(auth.uid()) IN ('receptionist', 'hospital_admin')
    );

-- QUEUE_TOKENS
CREATE POLICY queue_tokens_select ON public.queue_tokens
    FOR SELECT USING (
        public.is_hospital_member(auth.uid(), hospital_id)
        OR appointment_id IN (
            SELECT id FROM public.appointments 
            WHERE patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
        )
    );

CREATE POLICY queue_tokens_staff_manage ON public.queue_tokens
    FOR ALL USING (
        public.is_hospital_member(auth.uid(), hospital_id)
        AND public.get_user_role(auth.uid()) IN ('receptionist', 'hospital_admin')
    );

-- INVENTORY_ITEMS
CREATE POLICY inventory_select_all_staff ON public.inventory_items
    FOR SELECT USING (
        public.get_user_role(auth.uid()) IN ('receptionist', 'er_staff', 'hospital_admin')
    );

CREATE POLICY inventory_staff_manage ON public.inventory_items
    FOR ALL USING (
        public.is_hospital_member(auth.uid(), hospital_id)
        AND public.get_user_role(auth.uid()) IN ('er_staff', 'hospital_admin')
    );

-- EMERGENCY_REQUESTS
CREATE POLICY emergency_requests_select ON public.emergency_requests
    FOR SELECT USING (
        public.get_user_role(auth.uid()) IN ('er_staff', 'hospital_admin')
    );

CREATE POLICY emergency_requests_er_staff_manage ON public.emergency_requests
    FOR ALL USING (
        public.is_hospital_member(auth.uid(), requesting_hospital_id)
        AND public.get_user_role(auth.uid()) IN ('er_staff', 'hospital_admin')
    );

-- EMERGENCY_MATCHES
CREATE POLICY emergency_matches_select ON public.emergency_matches
    FOR SELECT USING (
        public.is_hospital_member(auth.uid(), hospital_id)
        OR public.get_user_role(auth.uid()) IN ('er_staff', 'hospital_admin')
    );

CREATE POLICY emergency_matches_manage ON public.emergency_matches
    FOR ALL USING (
        public.is_hospital_member(auth.uid(), hospital_id)
        AND public.get_user_role(auth.uid()) IN ('er_staff', 'hospital_admin')
    );

-- RESOURCE_RESERVATIONS & DISPATCHES
CREATE POLICY reservations_select_manage ON public.resource_reservations
    FOR ALL USING (
        public.is_hospital_member(auth.uid(), hospital_id)
        AND public.get_user_role(auth.uid()) IN ('er_staff', 'hospital_admin')
    );

CREATE POLICY dispatches_select_manage ON public.dispatches
    FOR ALL USING (
        (public.is_hospital_member(auth.uid(), source_hospital_id) OR public.is_hospital_member(auth.uid(), destination_hospital_id))
        AND public.get_user_role(auth.uid()) IN ('er_staff', 'hospital_admin')
    );

-- DOCTORS, DOCTOR_SCHEDULES, DEPARTMENTS
CREATE POLICY doctors_select_public ON public.doctors FOR SELECT USING (true);
CREATE POLICY doctor_schedules_select_public ON public.doctor_schedules FOR SELECT USING (true);
CREATE POLICY departments_select_public ON public.departments FOR SELECT USING (true);

CREATE POLICY doctors_admin_manage ON public.doctors
    FOR ALL USING (
        public.is_hospital_member(auth.uid(), hospital_id)
        AND public.get_user_role(auth.uid()) IN ('receptionist', 'hospital_admin')
    );

CREATE POLICY doctor_schedules_admin_manage ON public.doctor_schedules
    FOR ALL USING (
        doctor_id IN (
            SELECT id FROM public.doctors 
            WHERE public.is_hospital_member(auth.uid(), hospital_id)
        )
        AND public.get_user_role(auth.uid()) IN ('receptionist', 'hospital_admin')
    );

CREATE POLICY departments_admin_manage ON public.departments
    FOR ALL USING (
        public.is_hospital_member(auth.uid(), hospital_id)
        AND public.get_user_role(auth.uid()) IN ('hospital_admin')
    );

-- NOTIFICATIONS & ACTIVITY_LOGS
CREATE POLICY notifications_select_own ON public.notifications
    FOR SELECT USING (
        user_id = auth.uid() 
        OR public.is_hospital_member(auth.uid(), hospital_id)
    );

CREATE POLICY activity_logs_select ON public.activity_logs
    FOR SELECT USING (
        public.is_hospital_member(auth.uid(), hospital_id)
        OR public.get_user_role(auth.uid()) = 'hospital_admin'
    );
