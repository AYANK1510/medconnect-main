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
  X,
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
    } catch (err: any) {
      showNotification(err.message || 'Failed to load inventory', 'error');
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
    } catch (err: any) {
      showNotification(err.message || 'Failed to add inventory item.', 'error');
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
    } catch (err: any) {
      showNotification(err.message || 'Failed to edit inventory item.', 'error');
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
      setStockAdjustAmount(1);
      await loadData();
    } catch (err: any) {
      showNotification(err.message || 'Failed to adjust stock quantity.', 'error');
    }
  };

  // Helper function to return icon for resource type
  const getResourceIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('oxygen')) return <Wind className="w-5 h-5 text-cyan-400" />;
    if (t.includes('blood')) return <Droplet className="w-5 h-5 text-rose-400" />;
    if (t.includes('icu') || t.includes('bed')) return <Bed className="w-5 h-5 text-emerald-400" />;
    if (t.includes('ventilator')) return <Stethoscope className="w-5 h-5 text-amber-400" />;
    if (t.includes('medicine')) return <Pill className="w-5 h-5 text-purple-400" />;
    return <Package className="w-5 h-5 text-teal-400" />;
  };

  // Badge Color per Resource Type
  const getCategoryBadgeClass = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('oxygen')) return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    if (t.includes('blood')) return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    if (t.includes('icu') || t.includes('bed')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (t.includes('ventilator')) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    if (t.includes('medicine')) return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    return 'bg-slate-500/10 text-slate-300 border-slate-500/20';
  };

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center space-x-3 px-4 py-3 rounded-xl border shadow-2xl transition-all duration-300 ${
            notification.type === 'error'
              ? 'bg-rose-950/90 text-rose-200 border-rose-800/80 backdrop-blur-md'
              : 'bg-emerald-950/90 text-emerald-200 border-emerald-800/80 backdrop-blur-md'
          }`}
        >
          {notification.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider">
              REAL-TIME HOSPITAL INVENTORY
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/20">
              SUPABASE CONNECTED
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1">Hospital Inventory Control</h1>
          <p className="text-xs text-slate-400">
            Real-time track of Total, Reserved, and Available stock (<code className="text-teal-300">available = total - reserved</code>).
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={selectedHospitalId}
            onChange={e => setSelectedHospitalId(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:border-teal-500"
          >
            <option value="hosp-101">MedConnect Central Hospital (hosp-101)</option>
            <option value="hosp-102">City Trauma & Emergency Center (hosp-102)</option>
            <option value="hosp-103">Apex Specialty Care (hosp-103)</option>
          </select>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>Add Resource</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Managed Items</span>
            <Layers className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{totals.totalItems}</div>
          <div className="text-[11px] text-slate-400 font-mono">{totals.totalStock} total units across items</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Available Stock</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">{totals.availableStock}</div>
          <div className="text-[11px] text-emerald-400/80 font-mono">Ready for immediate allocation</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Emergency Reserved</span>
            <Lock className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-rose-400 font-mono">{totals.reservedStock}</div>
          <div className="text-[11px] text-rose-400/80 font-mono">Locked for ER SOS dispatches</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Critical / Low Stock</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400 font-mono">{totals.lowStockCount}</div>
          <div className="text-[11px] text-amber-400/80 font-mono">Items with available stock ≤ 5</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        {/* Category Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              selectedCategory === 'All'
                ? 'bg-teal-500 text-slate-950'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            All
          </button>
          {RESOURCE_TYPES.map(type => (
            <button
              key={type}
              onClick={() => setSelectedCategory(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedCategory === type
                  ? 'bg-teal-500 text-slate-950'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* Inventory Item Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredInventory.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 border-dashed">
            <Package className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-slate-300 text-sm font-bold">No inventory items found</h3>
            <p className="text-slate-500 text-xs mt-1">Try selecting a different filter or add a new resource.</p>
          </div>
        ) : (
          filteredInventory.map(item => {
            const total = item.total_quantity ?? (item.available_quantity + item.reserved_quantity);
            const reserved = item.reserved_quantity ?? 0;
            const available = total - reserved;

            return (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800/90 rounded-2xl p-5 space-y-4 shadow-xl hover:border-slate-700 transition duration-200"
              >
                {/* Card Top Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      {getResourceIcon(item.resource_type)}
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase border ${getCategoryBadgeClass(item.resource_type)}`}>
                        {item.resource_type}
                      </span>
                      {item.subtype && (
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                          {item.subtype}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-white text-base leading-snug">
                      {item.item_name || item.name}
                    </h3>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
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
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Stock Breakdown Grid */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  {/* Total */}
                  <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 font-medium block">Total Stock</span>
                    <span className="font-mono font-extrabold text-white text-base block">{total}</span>
                    <span className="text-[10px] text-slate-500 block truncate">{item.unit}</span>
                  </div>

                  {/* Reserved */}
                  <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 font-medium block">Reserved</span>
                    <span className="font-mono font-extrabold text-rose-400 text-base block">{reserved}</span>
                    <span className="text-[10px] text-rose-400/70 block truncate">locked</span>
                  </div>

                  {/* Available */}
                  <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 font-medium block">Available</span>
                    <span className={`font-mono font-extrabold text-base block ${available <= 0 ? 'text-rose-500' : available <= 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {available}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">{item.unit}</span>
                  </div>
                </div>

                {/* Formula Callout */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-3 py-2 bg-slate-950/50 rounded-xl border border-slate-800/80 font-mono">
                  <span>Available Calculation:</span>
                  <span className="text-teal-300 font-bold">{total} - {reserved} = {available}</span>
                </div>

                {/* Stock Controls */}
                <div className="flex items-center space-x-2 pt-1 border-t border-slate-800/60">
                  <button
                    onClick={() => {
                      setStockActionItem({ item, mode: 'increase' });
                      setStockAdjustAmount(1);
                    }}
                    className="flex-1 flex items-center justify-center space-x-1.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs rounded-xl border border-emerald-500/20 transition"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>+ Increase</span>
                  </button>

                  <button
                    onClick={() => {
                      setStockActionItem({ item, mode: 'decrease' });
                      setStockAdjustAmount(1);
                    }}
                    className="flex-1 flex items-center justify-center space-x-1.5 py-2 bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold text-xs rounded-xl border border-rose-500/20 transition"
                  >
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>- Decrease</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Resource Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Package className="w-5 h-5 text-teal-400" />
                <span>Add Medical Resource</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Resource Type</label>
                <select
                  value={newItemData.resource_type}
                  onChange={e => setNewItemData({ ...newItemData, resource_type: e.target.value as InventoryResourceType })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500 font-medium"
                >
                  {RESOURCE_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Item Name</label>
                <input
                  type="text"
                  placeholder="e.g. Type II Oxygen Cylinder, O- Negative Blood"
                  value={newItemData.item_name}
                  onChange={e => setNewItemData({ ...newItemData, item_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-teal-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Subtype / Variant (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. O-, Type D, Pediatric"
                  value={newItemData.subtype}
                  onChange={e => setNewItemData({ ...newItemData, subtype: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-teal-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Initial Total Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={newItemData.total_quantity}
                    onChange={e => setNewItemData({ ...newItemData, total_quantity: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-teal-500 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Unit</label>
                  <input
                    type="text"
                    placeholder="e.g. cylinders, units, beds"
                    value={newItemData.unit}
                    onChange={e => setNewItemData({ ...newItemData, unit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500 font-medium"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl shadow-lg"
                >
                  Save Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Resource Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Edit2 className="w-5 h-5 text-teal-400" />
                <span>Edit Resource Details</span>
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Resource Type</label>
                <select
                  value={editFormData.resource_type}
                  onChange={e => setEditFormData({ ...editFormData, resource_type: e.target.value as InventoryResourceType })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                >
                  {RESOURCE_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Item Name</label>
                <input
                  type="text"
                  value={editFormData.item_name}
                  onChange={e => setEditFormData({ ...editFormData, item_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Subtype / Variant</label>
                <input
                  type="text"
                  value={editFormData.subtype}
                  onChange={e => setEditFormData({ ...editFormData, subtype: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Total Stock</label>
                  <input
                    type="number"
                    min={editingItem.reserved_quantity || 0}
                    value={editFormData.total_quantity}
                    onChange={e => setEditFormData({ ...editFormData, total_quantity: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-teal-500"
                    required
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Min total: {editingItem.reserved_quantity} (reserved)</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Unit</label>
                  <input
                    type="text"
                    value={editFormData.unit}
                    onChange={e => setEditFormData({ ...editFormData, unit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1 font-mono text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>Reserved Stock:</span>
                  <span className="text-rose-400 font-bold">{editingItem.reserved_quantity} {editFormData.unit}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Resulting Available:</span>
                  <span className="text-emerald-400 font-bold">
                    {Math.max(0, editFormData.total_quantity - editingItem.reserved_quantity)} {editFormData.unit}
                  </span>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl shadow-lg"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {stockActionItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                {stockActionItem.mode === 'increase' ? (
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-rose-400" />
                )}
                <span>
                  {stockActionItem.mode === 'increase' ? 'Increase Stock' : 'Decrease Stock'}
                </span>
              </h3>
              <button
                onClick={() => setStockActionItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStockActionSubmit} className="space-y-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">Target Item</span>
                <span className="font-bold text-white text-sm block">
                  {stockActionItem.item.item_name || stockActionItem.item.name}
                </span>
                <span className="text-slate-500 font-mono text-[11px]">
                  Current Stock: Total = {stockActionItem.item.total_quantity}, Reserved = {stockActionItem.item.reserved_quantity}, Available = {stockActionItem.item.available_quantity}
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Quantity to {stockActionItem.mode === 'increase' ? 'Add (+)' : 'Deduct (-)'}
                </label>
                <input
                  type="number"
                  min="1"
                  max={stockActionItem.mode === 'decrease' ? stockActionItem.item.available_quantity : 99999}
                  value={stockAdjustAmount}
                  onChange={e => setStockAdjustAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-base focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStockActionItem(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 font-bold text-slate-950 rounded-xl shadow-lg ${
                    stockActionItem.mode === 'increase'
                      ? 'bg-emerald-400 hover:bg-emerald-300'
                      : 'bg-rose-500 hover:bg-rose-400 text-white'
                  }`}
                >
                  Confirm {stockActionItem.mode === 'increase' ? 'Increase' : 'Decrease'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
