-- ============================================================================
-- MedConnect Pulse Migration 06: Phase 7 - Real Inventory System
-- ============================================================================

-- 1. Ensure columns exist with proper defaults
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS total_quantity INT NOT NULL DEFAULT 0;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS reserved_quantity INT NOT NULL DEFAULT 0;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS available_quantity INT NOT NULL DEFAULT 0;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS resource_type TEXT NOT NULL DEFAULT 'Other';
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS item_name TEXT NOT NULL DEFAULT 'Resource';
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS subtype TEXT;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'units';

-- 2. Drop legacy constraints if present to re-apply updated constraints cleanly
ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS check_inventory_available;
ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS check_inventory_reserved;
ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS check_inventory_total;
ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS check_quantity_sum;
ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS check_reserved_lte_total;
ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS check_available_calc;

-- 3. Add Phase 7 database constraints
ALTER TABLE inventory_items ADD CONSTRAINT check_inventory_total CHECK (total_quantity >= 0);
ALTER TABLE inventory_items ADD CONSTRAINT check_inventory_reserved CHECK (reserved_quantity >= 0);
ALTER TABLE inventory_items ADD CONSTRAINT check_inventory_available CHECK (available_quantity >= 0);
ALTER TABLE inventory_items ADD CONSTRAINT check_reserved_lte_total CHECK (reserved_quantity <= total_quantity);
ALTER TABLE inventory_items ADD CONSTRAINT check_available_calc CHECK (available_quantity = total_quantity - reserved_quantity);

-- 4. Create DB trigger to automatically sync available_quantity = total_quantity - reserved_quantity
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
