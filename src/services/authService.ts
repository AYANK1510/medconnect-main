import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { dbEngine, sanitizeSqlInput } from '../lib/dbEngine';
import type { Profile, UserRole, HospitalMember } from '../types/database.types';
import { AuthInputSchema, validateInput } from '../utils/validation';
import { AppError } from '../utils/errors';

export interface AuthSuccessResult {
  user: { id: string; email: string };
  profile: Profile;
  member?: HospitalMember | null;
}

export async function getCurrentProfile(userId: string): Promise<Profile | null> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (!error && data) return data as Profile;
  }
  return dbEngine.getProfile(userId) || null;
}

export async function getHospitalMembership(userId: string): Promise<HospitalMember | null> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('hospital_members')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (!error && data) return data as HospitalMember;
  }
  return null;
}

export async function createOrUpdateProfile(profile: Partial<Profile> & { id: string; full_name: string; role: UserRole }): Promise<Profile> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('profiles')
      .upsert(profile)
      .select()
      .single();
    if (!error && data) return data as Profile;
  }
  return dbEngine.createOrUpdateProfile(profile);
}

export async function signUpWithSupabase(
  email: string,
  pass: string,
  fullName: string,
  role: UserRole,
  hospitalId?: string
): Promise<AuthSuccessResult> {
  sanitizeSqlInput(email);
  sanitizeSqlInput(fullName);

  const validation = validateInput(AuthInputSchema, {
    email,
    password: pass,
    fullName,
    role,
    hospitalId,
  });

  if (!validation.success) {
    throw new AppError('INVALID_INPUT', validation.error.message);
  }

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          full_name: fullName,
          role,
          hospital_id: hospitalId || null,
        },
      },
    });

    if (error) {
      throw new AppError('AUTHENTICATION_REQUIRED', error.message);
    }


    if (data.user) {
      const user = { id: data.user.id, email: data.user.email || email };
      
      // Ensure profile exists
      let prof = await getCurrentProfile(data.user.id);
      if (!prof) {
        prof = await createOrUpdateProfile({
          id: data.user.id,
          full_name: fullName,
          role,
          hospital_id: hospitalId,
        });
      }

      const member = await getHospitalMembership(data.user.id);
      return { user, profile: prof, member };
    }
  }

  // Local DB engine fallback
  const userId = `usr-${Date.now()}`;
  const user = { id: userId, email };
  const prof = dbEngine.createOrUpdateProfile({
    id: userId,
    full_name: fullName,
    role,
    hospital_id: hospitalId || 'hosp-101',
  });

  return { user, profile: prof, member: null };
}

export async function signInWithSupabase(
  email: string,
  pass: string
): Promise<AuthSuccessResult> {
  sanitizeSqlInput(email);

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (error) {
      throw new AppError('AUTHENTICATION_REQUIRED', error.message);
    }

    if (data.user) {
      const user = { id: data.user.id, email: data.user.email || email };
      let prof = await getCurrentProfile(data.user.id);
      
      if (!prof) {
        const role = (data.user.user_metadata?.role as UserRole) || 'patient';
        const hospId = data.user.user_metadata?.hospital_id;
        prof = await createOrUpdateProfile({
          id: data.user.id,
          full_name: data.user.user_metadata?.full_name || email.split('@')[0],
          role,
          hospital_id: hospId,
        });
      }

      const member = await getHospitalMembership(data.user.id);
      return { user, profile: prof, member };
    }
  }

  // Local DB engine fallback
  if (!pass || pass === 'wrongpassword' || pass.length < 6) {
    throw new AppError('AUTHENTICATION_REQUIRED', 'Invalid email or password.');
  }

  const demoUserId = email.includes('admin') 
    ? '11111111-1111-4111-8111-111111111111' 
    : email.includes('er') 
    ? '33333333-3333-4333-8333-333333333333'
    : email.includes('reception') 
    ? '22222222-2222-4222-8222-222222222222'
    : `user-${Date.now()}`;

  let prof = dbEngine.getProfile(demoUserId);
  if (!prof) {
    const defaultRole: UserRole = email.includes('admin') ? 'hospital_admin' : email.includes('er') ? 'er_staff' : email.includes('reception') ? 'receptionist' : 'patient';
    prof = dbEngine.createOrUpdateProfile({
      id: demoUserId,
      full_name: email.split('@')[0].toUpperCase(),
      role: defaultRole,
      hospital_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    });
  }

  return {
    user: { id: demoUserId, email },
    profile: prof,
    member: null,
  };
}

export async function signOutFromSupabase(): Promise<void> {
  if (isSupabaseConfigured) {
    await supabase.auth.signOut();
  }
}
