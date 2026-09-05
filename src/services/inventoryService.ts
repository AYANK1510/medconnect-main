import { dbEngine, sanitizeSqlInput, checkInventoryPermission } from '../lib/dbEngine';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { InventoryItem, UserRole } from '../types/database.types';
import { InventoryInputSchema, validateInput } from '../utils/validation';
import { AppError } from '../utils/errors';

export async function fetchInventory(hospitalId?: string): Promise<InventoryItem[]> {
  if (isSupabaseConfigured) {
    try {
      let query = supabase.from('inventory_items').select('*');
      if (hospitalId) {
        query = query.eq('hospital_id', hospitalId);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const formatted: InventoryItem[] = data.map((item: any) => {
          const total = item.total_quantity ?? (item.available_quantity + item.reserved_quantity);
          const reserved = item.reserved_quantity ?? 0;
          return {
            id: item.id,
            hospital_id: item.hospital_id,
            resource_type: item.resource_type,
            item_name: item.item_name || item.name || 'Resource',
            name: item.item_name || item.name || 'Resource',
            subtype: item.subtype || null,
            total_quantity: total,
            reserved_quantity: reserved,
            available_quantity: total - reserved,
            unit: item.unit || 'units',
            created_at: item.created_at,
            updated_at: item.updated_at,
          };
        });
        return formatted;
      }
    } catch (err) {
      console.warn('Supabase fetchInventory failed, falling back to local dbEngine:', err);
    }
  }
  return dbEngine.getInventory(hospitalId);
}

export async function addInventoryItem(data: {
  hospital_id: string;
  resource_type: string;
  item_name: string;
  total_quantity: number;
  unit: string;
  subtype?: string | null;
  reserved_quantity?: number;
}, actor?: { role?: UserRole; hospital_id?: string }): Promise<InventoryItem> {
  if (actor) {
    const isAllowed = checkInventoryPermission(actor.role, actor.hospital_id, data.hospital_id);
    if (!isAllowed) {
      throw new AppError('UNAUTHORIZED_INVENTORY_MODIFICATION', 'Unauthorized inventory modification: missing er_staff/hospital_admin role or hospital mismatch.');
    }
  }

  sanitizeSqlInput(data.item_name);

  const validation = validateInput(InventoryInputSchema, {
    hospitalId: data.hospital_id,
    resourceType: data.resource_type as any,
    itemName: data.item_name,
    totalQuantity: data.total_quantity,
    reservedQuantity: data.reserved_quantity ?? 0,
  });

  if (!validation.success) {
    throw new AppError('INVALID_INPUT', validation.error.message);
  }

  const reserved = data.reserved_quantity ?? 0;
  if (data.total_quantity < 0) {
    throw new AppError('INVALID_INPUT', 'Total quantity cannot be negative.');
  }
  if (reserved < 0) {
    throw new AppError('INVALID_INPUT', 'Reserved quantity cannot be negative.');
  }
  if (reserved > data.total_quantity) {
    throw new AppError('INVALID_INPUT', 'Reserved quantity cannot exceed total quantity.');
  }

  // Always update local dbEngine state
  const localItem = dbEngine.addInventoryItem(data);

  if (isSupabaseConfigured) {
    try {
      const available = data.total_quantity - reserved;
      const { data: sbData, error } = await supabase
        .from('inventory_items')
        .insert([{
          hospital_id: data.hospital_id,
          resource_type: data.resource_type,
          item_name: data.item_name,
          subtype: data.subtype || null,
          total_quantity: data.total_quantity,
          reserved_quantity: reserved,
          available_quantity: available,
          unit: data.unit || 'units',
        }])
        .select()
        .single();

      if (!error && sbData) {
        return {
          id: sbData.id,
          hospital_id: sbData.hospital_id,
          resource_type: sbData.resource_type,
          item_name: sbData.item_name,
          name: sbData.item_name,
          subtype: sbData.subtype,
          total_quantity: sbData.total_quantity,
          reserved_quantity: sbData.reserved_quantity,
          available_quantity: sbData.available_quantity,
          unit: sbData.unit,
          created_at: sbData.created_at,
          updated_at: sbData.updated_at,
        };
      }
    } catch (err) {
      console.warn('Supabase addInventoryItem failed, using local result:', err);
    }
  }

  return localItem;
}

export async function updateInventoryItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> {
  // Always update local dbEngine state
  const localItem = dbEngine.updateInventoryItem(id, updates);

  if (isSupabaseConfigured) {
    try {
      const payload: Record<string, any> = {};
      if (updates.resource_type !== undefined) payload.resource_type = updates.resource_type;
      if (updates.item_name !== undefined) payload.item_name = updates.item_name;
      if (updates.subtype !== undefined) payload.subtype = updates.subtype;
      if (updates.unit !== undefined) payload.unit = updates.unit;
      if (updates.total_quantity !== undefined) payload.total_quantity = updates.total_quantity;
      if (updates.reserved_quantity !== undefined) payload.reserved_quantity = updates.reserved_quantity;
      if (payload.total_quantity !== undefined || payload.reserved_quantity !== undefined) {
        const total = payload.total_quantity ?? localItem.total_quantity;
        const reserved = payload.reserved_quantity ?? localItem.reserved_quantity;
        payload.available_quantity = total - reserved;
      }

      await supabase
        .from('inventory_items')
        .update(payload)
        .eq('id', id);
    } catch (err) {
      console.warn('Supabase updateInventoryItem failed:', err);
    }
  }

  return localItem;
}

export async function increaseStock(id: string, amount: number): Promise<InventoryItem> {
  if (amount <= 0) {
    throw new Error('Increase amount must be greater than zero.');
  }
  const localItem = dbEngine.increaseStock(id, amount);

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('inventory_items')
        .update({
          total_quantity: localItem.total_quantity,
          available_quantity: localItem.available_quantity,
        })
        .eq('id', id);
    } catch (err) {
      console.warn('Supabase increaseStock sync failed:', err);
    }
  }

  return localItem;
}

export async function decreaseStock(id: string, amount: number): Promise<InventoryItem> {
  if (amount <= 0) {
    throw new Error('Decrease amount must be greater than zero.');
  }
  const localItem = dbEngine.decreaseStock(id, amount);

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('inventory_items')
        .update({
          total_quantity: localItem.total_quantity,
          available_quantity: localItem.available_quantity,
        })
        .eq('id', id);
    } catch (err) {
      console.warn('Supabase decreaseStock sync failed:', err);
    }
  }

  return localItem;
}

export async function updateInventoryQuantity(id: string, available: number): Promise<InventoryItem> {
  const localItem = dbEngine.updateInventoryQuantity(id, available);

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('inventory_items')
        .update({
          total_quantity: localItem.total_quantity,
          available_quantity: localItem.available_quantity,
        })
        .eq('id', id);
    } catch (err) {
      console.warn('Supabase updateInventoryQuantity sync failed:', err);
    }
  }

  return localItem;
}
