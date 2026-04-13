import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Plus, Pencil, Trash2, Check, X, ToggleLeft, ToggleRight, AlertTriangle, Shield } from 'lucide-react';
import api from '../../services/api';
import { useSensorial, haptics } from '../../context/SensorialContext';

interface Area {
  id: number;
  name: string;
  pincodes: string;
  is_active: boolean;
  priority: number;
  notes: string;
  created_at: string;
}

const BLANK_FORM = { name: '', pincodes: '', priority: 0, notes: '', is_active: true };

function parsePincodes(raw: string): string[] {
  return raw.split(',').map(p => p.trim()).filter(p => /^\d{6}$/.test(p));
}

export default function AdminAreaPage() {
  const qc = useQueryClient();
  const { confirm } = useSensorial();

  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(BLANK_FORM);

  const { data: areas = [], isLoading } = useQuery<Area[]>({
    queryKey: ['admin-areas'],
    queryFn: () => api.get('/admin/areas').then(r => r.data),
  });

  const { data: settings } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api.get('/admin/settings').then(r => r.data.settings),
  });

  const geoEnabled: boolean = settings?.geo_check_enabled ?? false;

  const toggleGeo = useMutation({
    mutationFn: (val: boolean) => api.patch('/admin/settings', { geo_check_enabled: val }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-settings'] }); haptics.confirm(); },
  });

  const createArea = useMutation({
    mutationFn: (data: typeof BLANK_FORM) => api.post('/admin/areas', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-areas'] });
      setShowAdd(false);
      setForm(BLANK_FORM);
      haptics.success();
    },
  });

  const updateArea = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<typeof BLANK_FORM> }) =>
      api.patch(`/admin/areas/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-areas'] });
      setEditingId(null);
      haptics.success();
    },
  });

  const deleteArea = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/areas/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-areas'] }); haptics.success(); },
  });

  const startEdit = (area: Area) => {
    setForm({ name: area.name, pincodes: area.pincodes ?? '', priority: area.priority, notes: area.notes ?? '', is_active: area.is_active });
    setEditingId(area.id);
    setShowAdd(false);
    haptics.light();
  };

  const handleDelete = async (area: Area) => {
    const ok = await confirm({
      title: `Delete "${area.name}"?`,
      message: 'This zone and all its pincodes will be removed. Orders from these pincodes will no longer be checked against this zone.',
      confirmText: 'Delete',
      type: 'danger',
    });
    if (ok) deleteArea.mutate(area.id);
  };

  // Total unique pincodes across all active zones
  const activePincodes = areas
    .filter(a => a.is_active)
    .flatMap(a => parsePincodes(a.pincodes ?? ''));
  const uniqueActivePincodes = [...new Set(activePincodes)];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black t-text tracking-tight flex items-center gap-2">
            <MapPin size={22} className="text-accent" />
            Delivery Zones
          </h1>
          <p className="text-xs t-text-muted mt-1">Control which pincodes are eligible for delivery</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setEditingId(null); setForm(BLANK_FORM); }}
          className="flex items-center gap-2 bg-accent text-white px-5 py-2.5 rounded-2xl text-sm font-bold hover:brightness-110 active:scale-95 transition-all shadow-sm"
        >
          <Plus size={16} />
          Add Zone
        </button>
      </div>

      {/* Master toggle */}
      <div className={`rounded-2xl border p-5 flex items-center gap-5 transition-all ${
        geoEnabled
          ? 'bg-orange-500/5 border-orange-500/20'
          : 'bg-bg-card border-border/15'
      }`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
          geoEnabled ? 'bg-orange-500/10 text-orange-500' : 'bg-bg-subtle text-text-muted'
        }`}>
          <Shield size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold t-text">Zone Restriction</p>
          <p className="text-xs t-text-muted mt-0.5">
            {geoEnabled
              ? `Active — only ${uniqueActivePincodes.length} pincode${uniqueActivePincodes.length !== 1 ? 's' : ''} across ${areas.filter(a => a.is_active).length} zone${areas.filter(a => a.is_active).length !== 1 ? 's' : ''} can place orders`
              : 'Off — all addresses accepted, zones are not enforced'}
          </p>
        </div>
        {geoEnabled && uniqueActivePincodes.length === 0 && (
          <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold flex-shrink-0">
            <AlertTriangle size={14} />
            No pincodes set — all pass
          </div>
        )}
        <button
          onClick={() => toggleGeo.mutate(!geoEnabled)}
          disabled={toggleGeo.isPending}
          className="flex-shrink-0 transition-all active:scale-95"
        >
          {geoEnabled
            ? <ToggleRight size={42} className="text-orange-500" />
            : <ToggleLeft size={42} className="text-text-muted opacity-40" />}
        </button>
      </div>

      {/* Add zone form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl border border-accent/20 bg-accent/[0.03] p-6 space-y-4"
          >
            <p className="text-sm font-bold t-text">New Delivery Zone</p>
            <ZoneForm form={form} setForm={setForm} />
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => createArea.mutate(form)}
                disabled={!form.name.trim() || createArea.isPending}
                className="flex items-center gap-2 bg-accent text-white px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 hover:brightness-110 active:scale-95 transition-all"
              >
                <Check size={15} />
                {createArea.isPending ? 'Saving…' : 'Save Zone'}
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold t-text-muted bg-bg-subtle hover:bg-bg-card transition-all"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zones list */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-44 rounded-2xl bg-bg-subtle animate-pulse" />)}
        </div>
      ) : areas.length === 0 ? (
        <div className="text-center py-16 t-text-muted">
          <MapPin size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-semibold">No delivery zones yet</p>
          <p className="text-xs mt-1 opacity-60">Add a zone with pincodes to start restricting delivery areas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {areas.map(area => {
              const pins = parsePincodes(area.pincodes ?? '');
              const isEditing = editingId === area.id;

              return (
                <motion.div
                  key={area.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className={`rounded-2xl border bg-bg-card transition-all ${
                    area.is_active ? 'border-border/20' : 'border-border/10 opacity-60'
                  }`}
                >
                  {isEditing ? (
                    /* Edit form inline */
                    <div className="p-5 space-y-4">
                      <p className="text-sm font-bold t-text">Edit Zone</p>
                      <ZoneForm form={form} setForm={setForm} />
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => updateArea.mutate({ id: area.id, data: form })}
                          disabled={!form.name.trim() || updateArea.isPending}
                          className="flex items-center gap-1.5 bg-accent text-white px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-40 hover:brightness-110 active:scale-95 transition-all"
                        >
                          <Check size={13} />
                          {updateArea.isPending ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-4 py-2 rounded-xl text-xs font-bold t-text-muted bg-bg-subtle hover:bg-bg-card transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Zone card view */
                    <div className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${area.is_active ? 'bg-teal-500' : 'bg-border'}`} />
                            <h3 className="text-sm font-bold t-text truncate">{area.name}</h3>
                            {area.priority > 0 && (
                              <span className="text-[10px] font-black text-accent/60 bg-accent/8 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                P{area.priority}
                              </span>
                            )}
                          </div>
                          {area.notes && (
                            <p className="text-[11px] t-text-muted mt-1 pl-4 truncate">{area.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => startEdit(area)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center t-text-muted hover:text-accent hover:bg-accent/8 transition-all"
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(area)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center t-text-muted hover:text-red-500 hover:bg-red-500/8 transition-all"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Pincodes */}
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold t-text-muted uppercase tracking-widest">
                          Pincodes ({pins.length})
                        </p>
                        {pins.length === 0 ? (
                          <p className="text-[11px] t-text-muted opacity-50 italic">
                            No pincodes — {geoEnabled ? 'all addresses pass for this zone' : 'add pincodes to restrict'}
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {pins.map(pin => (
                              <span key={pin} className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-bg-subtle t-text tabular-nums">
                                {pin}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Active toggle */}
                      <div className="flex items-center justify-between pt-1 border-t border-border/10">
                        <span className="text-[11px] font-semibold t-text-muted">
                          {area.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <button
                          onClick={() => updateArea.mutate({ id: area.id, data: { is_active: !area.is_active } })}
                          disabled={updateArea.isPending}
                          className="transition-all active:scale-95 disabled:opacity-40"
                        >
                          {area.is_active
                            ? <ToggleRight size={28} className="text-teal-500" />
                            : <ToggleLeft size={28} className="text-text-muted opacity-40" />}
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Summary when geo is enabled */}
      {geoEnabled && uniqueActivePincodes.length > 0 && (
        <div className="rounded-2xl bg-bg-subtle border border-border/10 p-5 space-y-3">
          <p className="text-xs font-bold t-text-muted uppercase tracking-widest">
            All Serviceable Pincodes ({uniqueActivePincodes.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {uniqueActivePincodes.map(pin => (
              <span key={pin} className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 tabular-nums">
                {pin}
              </span>
            ))}
          </div>
          <p className="text-[11px] t-text-muted opacity-60">
            Customers whose address doesn't contain one of these pincodes will not be able to place orders.
          </p>
        </div>
      )}
    </div>
  );
}

/* Shared form fields for add + edit */
function ZoneForm({ form, setForm }: { form: typeof BLANK_FORM; setForm: React.Dispatch<React.SetStateAction<typeof BLANK_FORM>> }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold t-text-muted uppercase tracking-widest">Zone name *</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Dwarka"
            className="w-full bg-bg-card border border-border/25 rounded-xl px-3 py-2.5 text-sm t-text placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold t-text-muted uppercase tracking-widest">Priority</label>
          <input
            type="number"
            min={0}
            value={form.priority}
            onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))}
            className="w-full bg-bg-card border border-border/25 rounded-xl px-3 py-2.5 text-sm t-text focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold t-text-muted uppercase tracking-widest">Pincodes (comma-separated)</label>
        <input
          type="text"
          value={form.pincodes}
          onChange={e => setForm(f => ({ ...f, pincodes: e.target.value }))}
          placeholder="110075, 110078, 110059"
          className="w-full bg-bg-card border border-border/25 rounded-xl px-3 py-2.5 text-sm t-text font-mono placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all"
        />
        {form.pincodes && (
          <p className="text-[10px] t-text-muted">
            {parsePincodes(form.pincodes).length} valid 6-digit pincode{parsePincodes(form.pincodes).length !== 1 ? 's' : ''} detected
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold t-text-muted uppercase tracking-widest">Notes (optional)</label>
        <input
          type="text"
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="e.g. Primary hub, high-density area"
          className="w-full bg-bg-card border border-border/25 rounded-xl px-3 py-2.5 text-sm t-text placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all"
        />
      </div>
    </div>
  );
}
