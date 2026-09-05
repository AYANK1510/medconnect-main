-- ============================================================================
-- MedConnect Pulse PostgreSQL Database Performance Indexes Migration (02_indexes.sql)
-- Comprehensive Indexing across Foreign Keys, Status Columns, & Lookups
-- ============================================================================

-- 1. Profiles Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_hospital_id ON profiles(hospital_id);

-- 2. Hospitals Indexes
CREATE INDEX IF NOT EXISTS idx_hospitals_code ON hospitals(code);
CREATE INDEX IF NOT EXISTS idx_hospitals_location ON hospitals(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_hospitals_status ON hospitals(status);

-- 3. Hospital Members Indexes
CREATE INDEX IF NOT EXISTS idx_hospital_members_hospital ON hospital_members(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hospital_members_user ON hospital_members(user_id);
CREATE INDEX IF NOT EXISTS idx_hospital_members_role ON hospital_members(role);

-- 4. Departments Indexes
CREATE INDEX IF NOT EXISTS idx_departments_hospital ON departments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);

-- 5. Doctors Indexes
CREATE INDEX IF NOT EXISTS idx_doctors_hospital ON doctors(hospital_id);
CREATE INDEX IF NOT EXISTS idx_doctors_dept ON doctors(department_id);
CREATE INDEX IF NOT EXISTS idx_doctors_user ON doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_active ON doctors(is_active);

-- 6. Doctor Schedules Indexes
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_doctor ON doctor_schedules(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_day ON doctor_schedules(day_of_week);

-- 7. Patients Indexes
CREATE INDEX IF NOT EXISTS idx_patients_user ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);

-- 8. Appointments Indexes
CREATE INDEX IF NOT EXISTS idx_appointments_hospital ON appointments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_appointments_dept ON appointments(department_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date_status ON appointments(appointment_date, status);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON appointments(doctor_id, appointment_date);

-- 9. Queue Tokens Indexes
CREATE INDEX IF NOT EXISTS idx_queue_tokens_hospital ON queue_tokens(hospital_id);
CREATE INDEX IF NOT EXISTS idx_queue_tokens_appointment ON queue_tokens(appointment_id);
CREATE INDEX IF NOT EXISTS idx_queue_tokens_status ON queue_tokens(status);
CREATE INDEX IF NOT EXISTS idx_queue_tokens_hospital_status ON queue_tokens(hospital_id, status);

-- 10. Inventory Items Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_hospital ON inventory_items(hospital_id);
CREATE INDEX IF NOT EXISTS idx_inventory_resource_type ON inventory_items(resource_type);
CREATE INDEX IF NOT EXISTS idx_inventory_hospital_resource ON inventory_items(hospital_id, resource_type);

-- 11. Emergency Requests Indexes
CREATE INDEX IF NOT EXISTS idx_emergency_req_hospital ON emergency_requests(requesting_hospital_id);
CREATE INDEX IF NOT EXISTS idx_emergency_req_status ON emergency_requests(status);
CREATE INDEX IF NOT EXISTS idx_emergency_req_urgency ON emergency_requests(urgency);
CREATE INDEX IF NOT EXISTS idx_emergency_req_resource ON emergency_requests(resource_type);
CREATE INDEX IF NOT EXISTS idx_emergency_req_location ON emergency_requests(latitude, longitude);

-- 12. Emergency Matches Indexes
CREATE INDEX IF NOT EXISTS idx_emergency_matches_request ON emergency_matches(request_id);
CREATE INDEX IF NOT EXISTS idx_emergency_matches_hospital ON emergency_matches(hospital_id);
CREATE INDEX IF NOT EXISTS idx_emergency_matches_status ON emergency_matches(status);

-- 13. Resource Reservations Indexes
CREATE INDEX IF NOT EXISTS idx_resource_res_request ON resource_reservations(request_id);
CREATE INDEX IF NOT EXISTS idx_resource_res_inventory ON resource_reservations(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_resource_res_hospital ON resource_reservations(hospital_id);
CREATE INDEX IF NOT EXISTS idx_resource_res_status ON resource_reservations(status);

-- 14. Dispatches Indexes
CREATE INDEX IF NOT EXISTS idx_dispatches_request ON dispatches(request_id);
CREATE INDEX IF NOT EXISTS idx_dispatches_source ON dispatches(source_hospital_id);
CREATE INDEX IF NOT EXISTS idx_dispatches_dest ON dispatches(destination_hospital_id);
CREATE INDEX IF NOT EXISTS idx_dispatches_status ON dispatches(status);
CREATE INDEX IF NOT EXISTS idx_dispatches_code ON dispatches(verification_code);

-- 15. Notifications Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_hospital ON notifications(hospital_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);

-- 16. Activity Logs Indexes
CREATE INDEX IF NOT EXISTS idx_activity_hospital ON activity_logs(hospital_id);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_category ON activity_logs(category);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at DESC);
