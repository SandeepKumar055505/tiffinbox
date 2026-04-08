import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { persons as personsApi, auth as authApi } from '../../services/api';
import { Person } from '../../types';

type SpiceLevel = 'mild' | 'medium' | 'hot';
interface IPersonForm { name: string; is_vegetarian: boolean; is_vegan: boolean; allergies: string[]; spice_level: SpiceLevel; notes: string; }
const BLANK: IPersonForm = {
  name: '', is_vegetarian: false, is_vegan: false,
  allergies: [], spice_level: 'medium', notes: '',
};

export default function ProfilePage() {
  const { user, logout, refresh } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<IPersonForm>(BLANK);
  const [editing, setEditing] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [addressEdit, setAddressEdit] = useState(false);
  const [addressVal, setAddressVal] = useState(user?.delivery_address ?? '');

  const updateProfile = useMutation({
    mutationFn: (data: { wallet_auto_apply?: boolean; delivery_address?: string }) =>
      authApi.updateProfile(data),
    onSuccess: () => {
      refresh();
      setAddressEdit(false);
    },
  });

  const { data: persons = [] } = useQuery<Person[]>({
    queryKey: ['persons'],
    queryFn: () => personsApi.list().then(r => r.data),
  });

  const create = useMutation({
    mutationFn: () => personsApi.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['persons'] }); setForm(BLANK); setShowForm(false); },
  });

  const update = useMutation({
    mutationFn: ({ id }: { id: number }) => personsApi.update(id, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['persons'] }); setEditing(null); },
  });

  const remove = useMutation({
    mutationFn: (id: number) => personsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['persons'] }),
  });

  function startEdit(p: Person) {
    setForm({ name: p.name, is_vegetarian: p.is_vegetarian, is_vegan: p.is_vegan, allergies: p.allergies, spice_level: p.spice_level, notes: p.notes || '' });
    setEditing(p.id);
    setShowForm(false);
  }

  return (
    <div className="min-h-screen pb-24 animate-glass bg-bg-primary/50">
      <div className="max-w-2xl mx-auto px-6 space-y-8 relative z-10">
        {/* Apple Music Header */}
        <header className="pt-6 pb-3 border-b border-border/10 mb-6 flex justify-between items-end">
          <h1 className="text-h1 !text-[34px] font-extrabold tracking-tight">Account</h1>
          <button onClick={logout} className="text-red-500 font-bold text-[11px] uppercase tracking-widest bg-red-500/10 px-4 py-2 rounded-full mb-1 hover:bg-red-500/20 transition-colors">
            Sign Out
          </button>
        </header>

        {/* User Profile (Apple Music / iOS Style) */}
        <section className="flex items-center gap-5 py-4 px-2 mb-8 animate-glass">
          {user?.avatar_url ? (
            <img src={user.avatar_url} className="w-20 h-20 rounded-full object-cover shadow-lg" alt="" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center text-accent font-black text-3xl shadow-glow-subtle">
              {user?.name?.[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-black truncate tracking-tight">{user?.name}</p>
            <p className="text-sm opacity-50 font-medium truncate mt-0.5">{user?.email}</p>
          </div>
        </section>

        {/* Persons */}
        <section className="space-y-2 animate-glass" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between px-4 pb-2">
            <h3 className="text-label-caps !text-[12px] !opacity-50 font-bold uppercase tracking-widest flex-1">Family Members</h3>
            {!showForm && editing === null && (
              <button 
                onClick={() => { setForm(BLANK); setShowForm(true); }}
                className="text-[11px] font-bold text-accent uppercase tracking-widest hover:opacity-80"
              >
                Add
              </button>
            )}
          </div>

          {(showForm || editing !== null) && (
            <div className="animate-glass">
              <MemberForm 
                form={form}
                setForm={setForm}
                editing={editing}
                onCancel={() => { setShowForm(false); setEditing(null); }}
                onSubmit={() => editing ? update.mutate({ id: editing }) : create.mutate()} 
                loading={editing ? update.isPending : create.isPending}
                title={editing ? 'Edit Member' : 'New Member'}
              />
            </div>
          )}

          {persons.length > 0 && !showForm && (
            <div className="surface-glass rounded-2xl overflow-hidden divide-y divide-border/10 border border-white/5 shadow-sm">
              {persons.map(p => (
                <div key={p.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-bg-secondary/40 transition-colors">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-lg text-accent shrink-0">
                      {p.name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-body-sm !text-base font-bold truncate">{p.name}</p>
                      <div className="flex gap-2 flex-wrap">
                        {p.is_vegan && <span className="text-[9px] font-bold uppercase tracking-widest text-accent/60">Vegan</span>}
                        {!p.is_vegan && p.is_vegetarian && <span className="text-[9px] font-bold uppercase tracking-widest text-teal-600/60">Veg</span>}
                        <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">{p.spice_level} Spice</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 shrink-0 px-2">
                    <button onClick={() => startEdit(p)} className="text-[10px] font-bold uppercase tracking-widest text-accent opacity-80 hover:opacity-100">Edit</button>
                    <button onClick={() => { if (confirm(`Remove ${p.name}?`)) remove.mutate(p.id); }} className="text-[10px] font-bold uppercase tracking-widest text-red-500 opacity-80 hover:opacity-100">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {persons.length === 0 && !showForm && (
            <div className="surface-glass p-8 text-center rounded-2xl opacity-60">
              <p className="text-h3 !text-lg">No Members</p>
              <p className="text-body-sm !text-sm opacity-70 mt-1">Add family members to start subscribing for them.</p>
              <button 
                onClick={() => setShowForm(true)} 
                className="mt-6 text-[11px] font-bold text-white bg-accent px-5 py-2.5 rounded-full uppercase tracking-widest hover:opacity-90 transition-opacity"
              >
                Add Member
              </button>
            </div>
          )}
        </section>

        {/* Delivery address */}
        <section className="space-y-2 animate-glass" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between px-4 pb-2">
            <h3 className="text-label-caps !text-[12px] !opacity-50 font-bold uppercase tracking-widest">Delivery Address</h3>
            {!addressEdit && (
              <button
                onClick={() => { setAddressVal(user?.delivery_address ?? ''); setAddressEdit(true); }}
                className="text-[11px] font-bold text-accent uppercase tracking-widest hover:opacity-80"
              >
                {user?.delivery_address ? 'Edit' : 'Set'}
              </button>
            )}
          </div>
          <div className="surface-glass rounded-2xl border border-white/5 overflow-hidden">
            {addressEdit ? (
              <div className="flex flex-col">
                <textarea
                  rows={3}
                  value={addressVal}
                  onChange={e => setAddressVal(e.target.value)}
                  placeholder="Street name, apartment number, area..."
                  className="w-full bg-transparent border-0 border-b border-border/10 focus:ring-0 focus:outline-none resize-none !text-base !font-medium leading-relaxed p-5"
                />
                <div className="flex gap-2 p-3 bg-white/[0.01]">
                  <button
                    onClick={() => updateProfile.mutate({ delivery_address: addressVal.trim() })}
                    disabled={updateProfile.isPending}
                    className="flex-1 text-[12px] font-bold text-white bg-accent py-2.5 rounded-xl transition-all disabled:opacity-50"
                  >
                    {updateProfile.isPending ? 'Saving...' : 'Save'}
                  </button>
                  <button 
                    onClick={() => setAddressEdit(false)} 
                    disabled={updateProfile.isPending}
                    className="px-6 text-[12px] font-bold text-text-muted hover:text-accent transition-colors py-2.5 rounded-xl disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 flex items-center gap-4">
                <div className="text-3xl grayscale opacity-60">📍</div>
                <div className="flex-1">
                  {user?.delivery_address ? (
                    <p className="text-body-sm !text-base !font-medium leading-relaxed">
                      {user.delivery_address}
                    </p>
                  ) : (
                    <p className="text-base opacity-40 italic">No delivery address set.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Wallet toggle */}
        <section className="space-y-2 animate-glass" style={{ animationDelay: '0.3s' }}>
          <h3 className="text-label-caps !text-[12px] !opacity-50 font-bold uppercase tracking-widest pl-4 pb-1">Preferences</h3>
          <div className="surface-glass rounded-2xl border border-white/5 overflow-hidden">
            <button
              onClick={() => updateProfile.mutate({ wallet_auto_apply: !user?.wallet_auto_apply })}
              className="w-full p-5 flex items-center justify-between text-left hover:bg-bg-secondary/40 transition-colors"
            >
              <div className="flex-1">
                <p className="text-base font-bold">Auto-Apply Wallet Credits</p>
                <p className="text-[11px] opacity-50 mt-1 uppercase font-bold tracking-widest">Apply balance to renewals</p>
              </div>
              <div className={`w-14 h-8 rounded-full transition-all duration-300 flex items-center px-1 shrink-0 ${user?.wallet_auto_apply ? 'bg-accent' : 'bg-bg-secondary border border-white/10'}`}>
                <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${user?.wallet_auto_apply ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

const MemberForm = ({ 
  form, 
  setForm, 
  editing, 
  onSubmit, 
  onCancel,
  loading, 
  title 
}: { 
  form: IPersonForm; 
  setForm: React.Dispatch<React.SetStateAction<IPersonForm>>;
  editing: number | null;
  onSubmit: () => void; 
  onCancel: () => void;
  loading: boolean; 
  title: string;
}) => (
  <div className="surface-glass p-5 sm:p-6 space-y-5 animate-glass rounded-2xl sm:rounded-[2rem] border-white/5 ring-1 ring-white/5 shadow-xl">
    <div className="flex items-center justify-between pb-2 border-b border-white/5">
      <h4 className="text-h3 !text-lg">{title}</h4>
    </div>
    <div className="space-y-1.5">
      <p className="text-label-caps !text-[11px] !opacity-50 pl-1 font-semibold">Member Name</p>
      <input 
        placeholder="e.g. Rahul Sharma" 
        value={form.name} 
        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        className="w-full input-field !text-lg !font-medium" 
      />
    </div>
    
    <div className="flex gap-4 sm:gap-6 pl-1">
      {(['is_vegetarian', 'is_vegan'] as const).map(key => (
        <label key={key} className="flex items-center gap-2 cursor-pointer group">
          <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all duration-300 ${ form[key] ? 'bg-accent border-accent shadow-glow-subtle' : 'border-border bg-bg-secondary' }`}>
            {form[key] && <span className="text-white text-[10px]">✓</span>}
          </div>
          <input 
            type="checkbox" 
            checked={form[key]} 
            onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} 
            className="hidden" 
          />
          <span className={`text-label-caps !text-[10px] font-bold transition-colors duration-300 ${ form[key] ? '!text-accent' : 'group-hover:!text-text-secondary opacity-60' }`}>
            {key === 'is_vegetarian' ? 'Vegetarian' : 'Vegan'}
          </span>
        </label>
      ))}
    </div>

    <div className="space-y-4">
      <p className="text-label-caps !text-[11px] !opacity-50 pl-1 font-semibold">Preferred Spice Level</p>
      <div className="flex gap-2">
        {(['mild', 'medium', 'hot'] as const).map(s => (
          <button 
            key={s} 
            onClick={() => setForm(f => ({ ...f, spice_level: s }))}
            className={`flex-1 px-3 py-2.5 rounded-xl text-label-caps !text-[10px] font-bold transition-all duration-300 ring-1 ${form.spice_level === s ? 'bg-accent !text-white shadow-glow-subtle ring-accent scale-[1.02]' : 'bg-bg-secondary !text-text-muted ring-white/5 hover:ring-accent/30'}`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
    </div>

    <div className="space-y-2">
      <p className="text-label-caps !text-[11px] !opacity-50 pl-1 font-semibold">Notes & Allergies</p>
      <textarea 
        placeholder="Any specific instructions or dietary preferences..." 
        value={form.notes}
        onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} 
        rows={3}
        className="w-full input-field resize-none !text-sm leading-relaxed" 
      />
    </div>

    <div className="flex gap-3 pt-2">
      <button 
        onClick={onSubmit} 
        disabled={!form.name.trim() || loading}
        className="btn-primary flex-1 !py-2.5 !rounded-xl shadow-glow-subtle disabled:opacity-50"
      >
        {loading ? 'Saving…' : editing ? 'Update Member' : 'Save Member'}
      </button>
      <button 
        onClick={onCancel}
        className="btn-ghost !py-2.5 !px-6 font-bold text-xs"
      >
        Cancel
      </button>
    </div>
  </div>
);
