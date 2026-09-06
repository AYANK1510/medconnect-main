import React, { useState, useEffect, useMemo } from 'react';
import {
  fetchInventory,
  addInventoryItem,
  updateInventoryItem,
  increaseStock,
  decreaseStock
} from '../services/inventoryService';
import type { InventoryItem, InventoryResourceType } from '../types/database.types';
import { dbEngine } from '../lib/dbEngine';
import {
  Package,
  Plus,
  Edit2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Search,
  CheckCircle2,
  AlertCircle,
  Lock,
  Layers,
  Droplet,
  Wind,
  Bed,
  Stethoscope,
  Pill
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';

const RESOURCE_TYPES: InventoryResourceType[] = ['Oxygen', 'Blood', 'ICU Bed', 'Ventilator', 'Medicine', 'Other'];

export const InventoryPage: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('hosp-101');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Modals & Action States
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [stockActionItem, setStockActionItem] = useState<{ item: InventoryItem; mode: 'increase' | 'decrease' } | null>(null);

  // Form Fields - Add Item
  const [newItemData, setNewItemData] = useState<{
    resource_type: InventoryResourceType;
    item_name: string;
    subtype: string;
    total_quantity: number;
    unit: string;
  }>({
    resource_type: 'Oxygen',
    item_name: '',
    subtype: '',
    total_quantity: 10,
    unit: 'units',
  });

  // Form Fields - Edit Item
  const [editFormData, setEditFormData] = useState<{
    resource_type: InventoryResourceType;
    item_name: string;
    subtype: string;
    total_quantity: number;
    unit: string;
  }>({
    resource_type: 'Oxygen',
    item_name: '',
    subtype: '',
    total_quantity: 0,
    unit: 'units',
  });

  // Stock Adjust Amount
  const [stockAdjustAmount, setStockAdjustAmount] = useState<number>(1);

  // Toast Notification
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = async () => {
    try {
      const data = await fetchInventory(selectedHospitalId);
      setInventory(data);
    } catch (err: unknown) {
      const e = err as Error;
      showNotification(e.message || 'Failed to load inventory', 'error');
    }
  };

  useEffect(() => {
    loadData();
    const unsub = dbEngine.subscribe(() => loadData());
    return () => unsub();
  }, [selectedHospitalId]);

  // Filtered Items
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesCategory =
        selectedCategory === 'All' ||
        item.resource_type.toLowerCase() === selectedCategory.toLowerCase();
      const matchesSearch =
        (item.item_name || item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.subtype || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.resource_type.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [inventory, selectedCategory, searchQuery]);

  // Totals
  const totals = useMemo(() => {
    let totalItems = 0;
    let totalStock = 0;
    let reservedStock = 0;
    let availableStock = 0;
    let lowStockCount = 0;

    inventory.forEach(i => {
      totalItems += 1;
      const total = i.total_quantity ?? (i.available_quantity + i.reserved_quantity);
      const reserved = i.reserved_quantity ?? 0;
      const available = total - reserved;

      totalStock += total;
      reservedStock += reserved;
      availableStock += available;
      if (available <= 5) lowStockCount += 1;
    });

    return { totalItems, totalStock, reservedStock, availableStock, lowStockCount };
  }, [inventory]);

  // Handle Add Item
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemData.item_name.trim()) {
      showNotification('Resource item name is required.', 'error');
      return;
    }
    if (newItemData.total_quantity < 0) {
      showNotification('Total quantity cannot be negative.', 'error');
      return;
    }

    try {
      await addInventoryItem({
        hospital_id: selectedHospitalId,
        resource_type: newItemData.resource_type,
        item_name: newItemData.item_name.trim(),
        subtype: newItemData.subtype.trim() || null,
        total_quantity: Number(newItemData.total_quantity),
        unit: newItemData.unit.trim() || 'units',
        reserved_quantity: 0,
      });

      setIsAddModalOpen(false);
      setNewItemData({
        resource_type: 'Oxygen',
        item_name: '',
        subtype: '',
        total_quantity: 10,
        unit: 'units',
      });
      showNotification(`Successfully added ${newItemData.item_name}!`);
      await loadData();
    } catch (err: unknown) {
      const e = err as Error;
      showNotification(e.message || 'Failed to add inventory item.', 'error');
    }
  };

  // Handle Edit Item Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!editFormData.item_name.trim()) {
      showNotification('Resource item name is required.', 'error');
      return;
    }

    try {
      await updateInventoryItem(editingItem.id, {
        resource_type: editFormData.resource_type,
        item_name: editFormData.item_name.trim(),
        name: editFormData.item_name.trim(),
        subtype: editFormData.subtype.trim() || null,
        total_quantity: Number(editFormData.total_quantity),
        unit: editFormData.unit.trim() || 'units',
      });

      setEditingItem(null);
      showNotification(`Updated ${editFormData.item_name} inventory details!`);
      await loadData();
    } catch (err: unknown) {
      const e = err as Error;
      showNotification(e.message || 'Failed to edit inventory item.', 'error');
    }
  };

  // Handle Stock Increase / Decrease Submit
  const handleStockActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockActionItem) return;
    const amount = Number(stockAdjustAmount);
    if (isNaN(amount) || amount <= 0) {
      showNotification('Quantity must be greater than 0.', 'error');
      return;
    }

    try {
      if (stockActionItem.mode === 'increase') {
        await increaseStock(stockActionItem.item.id, amount);
        showNotification(`Increased stock by +${amount} ${stockActionItem.item.unit}!`);
      } else {
        await decreaseStock(stockActionItem.item.id, amount);
        showNotification(`Decreased stock by -${amount} ${stockActionItem.item.unit}!`);
      }
      setStockActionItem(null);
      await loadData();
    } catch (err: unknown) {
      const e = err as Error;
      showNotification(e.message || 'Failed to adjust stock quantity.', 'error');
    }
  };

  // Icon mapping per Resource Type
  const getResourceIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('oxygen')) return <Wind className="w-5 h-5 text-blue-500" />;
    if (t.includes('blood')) return <Droplet className="w-5 h-5 text-rose-500" />;
    if (t.includes('icu') || t.includes('bed')) return <Bed className="w-5 h-5 text-emerald-500" />;
    if (t.includes('ventilator')) return <Stethoscope className="w-5 h-5 text-amber-500" />;
    if (t.includes('medicine')) return <Pill className="w-5 h-5 text-purple-500" />;
    return <Package className="w-5 h-5 text-blue-600" />;
  };

  return (
    <div className="space-y-6 sm:space-y-8 font-sans">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center space-x-3 px-4 py-3 rounded-xl border shadow-dropdown transition-all duration-300 ${
            notification.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          {notification.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          )}
          <span className="text-xs font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] sm:text-xs font-bold text-blue-600 uppercase tracking-wider block">
              REAL-TIME HOSPITAL INVENTORY
            </span>
            <Badge variant="blue" size="sm">
              SUPABASE CONNECTED
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Hospital Inventory Control
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">
            Real-time track of Total, Reserved, and Available stock (<code className="text-blue-600 font-semibold">available = total - reserved</code>).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 shrink-0">
          <select
            value={selectedHospitalId}
            onChange={e => setSelectedHospitalId(e.target.value)}
            className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 cursor-pointer shadow-xs"
          >
            <option value="hosp-101">MedConnect Central Hospital (hosp-101)</option>
            <option value="hosp-102">City Trauma & Emergency Center (hosp-102)</option>
            <option value="hosp-103">Apex Specialty Care (hosp-103)</option>
          </select>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-sm transition duration-150 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Resource</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-2 shadow-card">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Managed Items</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono tabular-nums">{totals.totalItems}</div>
          <div className="text-[11px] text-slate-400 font-mono">{totals.totalStock} total units across items</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-2 shadow-card">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Available Stock</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 font-mono tabular-nums">{totals.availableStock}</div>
          <div className="text-[11px] text-emerald-600/80 font-medium">Ready for immediate allocation</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-2 shadow-card">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Emergency Reserved</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-rose-600 font-mono tabular-nums">{totals.reservedStock}</div>
          <div className="text-[11px] text-rose-600/80 font-medium">Locked for ER SOS dispatches</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-2 shadow-card">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Critical / Low Stock</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-600 font-mono tabular-nums">{totals.lowStockCount}</div>
          <div className="text-[11px] text-amber-600/80 font-medium">Items with available stock ≤ 5</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Category Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === 'All'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            All
          </button>
          {RESOURCE_TYPES.map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedCategory(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === type
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Inventory Item Cards */}
      {filteredInventory.length === 0 ? (
        <EmptyState
          title="No inventory items found"
          description="Try selecting a different category filter or add a new medical resource."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredInventory.map(item => {
            const total = item.total_quantity ?? (item.available_quantity + item.reserved_quantity);
            const reserved = item.reserved_quantity ?? 0;
            const available = total - reserved;

            return (
              <div
                key={item.id}
                className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-card hover:border-slate-300 transition duration-150"
              >
                {/* Card Top Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      {getResourceIcon(item.resource_type)}
                      <Badge variant="blue" size="sm">
                        {item.resource_type}
                      </Badge>
                      {item.subtype && (
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md truncate">
                          {item.subtype}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 text-base leading-snug truncate">
                      {item.item_name || item.name}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingItem(item);
                      setEditFormData({
                        resource_type: item.resource_type as InventoryResourceType,
                        item_name: item.item_name || item.name || '',
                        subtype: item.subtype || '',
                        total_quantity: total,
                        unit: item.unit,
                      });
                    }}
                    title="Edit Resource"
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Stock Breakdown Grid */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  {/* Total */}
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                    <span className="text-[10px] text-slate-500 font-medium block">Total Stock</span>
                    <span className="font-mono font-extrabold text-slate-900 text-base block tabular-nums">{total}</span>
                    <span className="text-[10px] text-slate-400 block truncate">{item.unit}</span>
                  </div>

                  {/* Reserved */}
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                    <span className="text-[10px] text-slate-500 font-medium block">Reserved</span>
                    <span className="font-mono font-extrabold text-rose-600 text-base block tabular-nums">{reserved}</span>
                    <span className="text-[10px] text-rose-600/70 block truncate font-medium">locked</span>
                  </div>

                  {/* Available */}
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                    <span className="text-[10px] text-slate-500 font-medium block">Available</span>
                    <span className={`font-mono font-extrabold text-base block tabular-nums ${available <= 0 ? 'text-rose-600' : available <= 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {available}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">{item.unit}</span>
                  </div>
                </div>

                {/* Formula Callout */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200/80 font-mono">
                  <span>Available:</span>
                  <span className="text-blue-600 font-bold">{total} - {reserved} = {available}</span>
                </div>

                {/* Stock Controls */}
                <div className="flex items-center space-x-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setStockActionItem({ item, mode: 'increase' });
                      setStockAdjustAmount(1);
                    }}
                    className="flex-1 flex items-center justify-center space-x-1.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition-colors cursor-pointer"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>+ Increase</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStockActionItem({ item, mode: 'decrease' });
                      setStockAdjustAmount(1);
                    }}
                    className="flex-1 flex items-center justify-center space-x-1.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-colors cursor-pointer"
                  >
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>- Decrease</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Resource Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Medical Resource"
        description="Register a new medical resource into this hospital's live inventory."
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddItem}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl shadow-sm cursor-pointer"
            >
              Save Resource
            </button>
          </>
        }
      >
        <form onSubmit={handleAddItem} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Resource Type</label>
            <select
              value={newItemData.resource_type}
              onChange={e => setNewItemData({ ...newItemData, resource_type: e.target.value as InventoryResourceType })}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
            >
              {RESOURCE_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Item Name *</label>
            <input
              type="text"
              placeholder="e.g. Type II Oxygen Cylinder, O- Negative Blood"
              value={newItemData.item_name}
              onChange={e => setNewItemData({ ...newItemData, item_name: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Subtype / Variant (Optional)</label>
            <input
              type="text"
              placeholder="e.g. O-, Type D, Pediatric"
              value={newItemData.subtype}
              onChange={e => setNewItemData({ ...newItemData, subtype: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Initial Total Stock</label>
              <input
                type="number"
                min="0"
                value={newItemData.total_quantity}
                onChange={e => setNewItemData({ ...newItemData, total_quantity: Number(e.target.value) })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-mono focus:outline-none focus:border-blue-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Unit</label>
              <input
                type="text"
                placeholder="e.g. cylinders, units, beds"
                value={newItemData.unit}
                onChange={e => setNewItemData({ ...newItemData, unit: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                required
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Edit Resource Modal */}
      <Modal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        title="Edit Resource Details"
        description="Update resource naming, classification or physical stock capacity."
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleEditSubmit}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl shadow-sm cursor-pointer"
            >
              Save Changes
            </button>
          </>
        }
      >
        {editingItem && (
          <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Resource Type</label>
              <select
                value={editFormData.resource_type}
                onChange={e => setEditFormData({ ...editFormData, resource_type: e.target.value as InventoryResourceType })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500"
              >
                {RESOURCE_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Item Name *</label>
              <input
                type="text"
                value={editFormData.item_name}
                onChange={e => setEditFormData({ ...editFormData, item_name: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Subtype / Variant</label>
              <input
                type="text"
                value={editFormData.subtype}
                onChange={e => setEditFormData({ ...editFormData, subtype: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Total Stock</label>
                <input
                  type="number"
                  min={editingItem.reserved_quantity || 0}
                  value={editFormData.total_quantity}
                  onChange={e => setEditFormData({ ...editFormData, total_quantity: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-mono focus:outline-none focus:border-blue-500"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Min total: {editingItem.reserved_quantity} (reserved)</span>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Unit</label>
                <input
                  type="text"
                  value={editFormData.unit}
                  onChange={e => setEditFormData({ ...editFormData, unit: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 font-mono text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>Reserved Stock:</span>
                <span className="text-rose-600 font-bold">{editingItem.reserved_quantity} {editFormData.unit}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Resulting Available:</span>
                <span className="text-emerald-600 font-bold">
                  {Math.max(0, editFormData.total_quantity - editingItem.reserved_quantity)} {editFormData.unit}
                </span>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal
        isOpen={!!stockActionItem}
        onClose={() => setStockActionItem(null)}
        title={stockActionItem?.mode === 'increase' ? 'Increase Stock' : 'Decrease Stock'}
        description={`Adjust available quantity for ${stockActionItem?.item.item_name || stockActionItem?.item.name}.`}
        footer={
          <>
            <button
              type="button"
              onClick={() => setStockActionItem(null)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleStockActionSubmit}
              className={`px-5 py-2 font-bold rounded-xl shadow-sm text-white cursor-pointer ${
                stockActionItem?.mode === 'increase'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              Confirm {stockActionItem?.mode === 'increase' ? 'Increase' : 'Decrease'}
            </button>
          </>
        }
      >
        {stockActionItem && (
          <form onSubmit={handleStockActionSubmit} className="space-y-4 text-xs">
            <div>
              <span className="text-slate-500 block mb-1 font-medium">Target Item</span>
              <span className="font-bold text-slate-900 text-sm block">
                {stockActionItem.item.item_name || stockActionItem.item.name}
              </span>
              <span className="text-slate-500 font-mono text-[11px] block mt-0.5">
                Current: Total = {stockActionItem.item.total_quantity}, Reserved = {stockActionItem.item.reserved_quantity}, Available = {stockActionItem.item.available_quantity}
              </span>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Quantity to {stockActionItem.mode === 'increase' ? 'Add (+)' : 'Deduct (-)'}
              </label>
              <input
                type="number"
                min="1"
                max={stockActionItem.mode === 'decrease' ? stockActionItem.item.available_quantity : 99999}
                value={stockAdjustAmount}
                onChange={e => setStockAdjustAmount(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-mono text-base focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default InventoryPage;
