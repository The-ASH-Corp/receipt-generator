import React, { useState, useEffect } from 'react';
import { Save, Building2, Upload, Trash2, MapPin } from 'lucide-react';
import { settingsApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import Select from '../components/Select';

interface BranchDetails {
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  receiptPrefix?: string;
  receiptFooterMessage?: string;
}

const DEFAULT_BRANCHES: Record<string, BranchDetails> = {
  Thirur: {
    address: '2nd Floor, OPS Mall, Vailathur,Tirur',
    phone: '+91 8921365750',
    email: 'connect@ashacademy.ai',
    website: 'www.ashacademy.ai',
    receiptPrefix: 'REC',
    receiptFooterMessage: 'Please note: All payments are final and non-refundable.',
  },
  Calicut: {
    address: 'Calicut, Kerala',
    phone: '+91 8921365750',
    email: 'connect@ashacademy.ai',
    website: 'www.ashacademy.ai',
    receiptPrefix: 'REC',
    receiptFooterMessage: 'Please note: All payments are final and non-refundable.',
  },
};

export const SettingsPage: React.FC = () => {
  const { settings, refreshSettings } = useAuth();
  const { showToast } = useToast();

  const [selectedBranch, setSelectedBranch] = useState<string>(
    settings.selectedBranch || 'Thirur'
  );

  const [branches, setBranches] = useState<Record<string, BranchDetails>>(() => {
    return settings.branches && Object.keys(settings.branches).length > 0
      ? settings.branches
      : DEFAULT_BRANCHES;
  });

  const activeBranchData =
    branches[selectedBranch] || DEFAULT_BRANCHES[selectedBranch] || DEFAULT_BRANCHES.Thirur;

  const [academyName, setAcademyName] = useState(settings.academyName);
  const [academyLogo, setAcademyLogo] = useState(settings.academyLogo);
  const [address, setAddress] = useState(activeBranchData.address || settings.address);
  const [phone, setPhone] = useState(activeBranchData.phone || settings.phone);
  const [email, setEmail] = useState(activeBranchData.email || settings.email);
  const [website, setWebsite] = useState(activeBranchData.website || settings.website || '');
  const [receiptPrefix, setReceiptPrefix] = useState(
    activeBranchData.receiptPrefix || settings.receiptPrefix
  );
  const [receiptFooterMessage, setReceiptFooterMessage] = useState(
    activeBranchData.receiptFooterMessage || settings.receiptFooterMessage
  );
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol || '₹');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAcademyName(settings.academyName);
    setAcademyLogo(settings.academyLogo);
    setCurrencySymbol(settings.currencySymbol || '₹');

    if (settings.branches && Object.keys(settings.branches).length > 0) {
      setBranches(settings.branches);
      const current = settings.branches[selectedBranch] || settings.branches.Thirur;
      if (current) {
        setAddress(current.address || settings.address);
        setPhone(current.phone || settings.phone);
        setEmail(current.email || settings.email);
        setWebsite(current.website || settings.website || '');
        setReceiptPrefix(current.receiptPrefix || settings.receiptPrefix);
        setReceiptFooterMessage(current.receiptFooterMessage || settings.receiptFooterMessage);
      }
    }
  }, [settings]);

  const handleBranchChange = (newBranch: string) => {
    // Save current form state into the previous branch's slot
    const updatedBranches: Record<string, BranchDetails> = {
      ...branches,
      [selectedBranch]: {
        address,
        phone,
        email,
        website,
        receiptPrefix: receiptPrefix.toUpperCase().trim(),
        receiptFooterMessage,
      },
    };
    setBranches(updatedBranches);
    setSelectedBranch(newBranch);

    // Switch form values to target branch
    const nextData =
      updatedBranches[newBranch] || DEFAULT_BRANCHES[newBranch] || DEFAULT_BRANCHES.Thirur;

    setAddress(nextData.address || '');
    setPhone(nextData.phone || '');
    setEmail(nextData.email || '');
    setWebsite(nextData.website || '');
    setReceiptPrefix(nextData.receiptPrefix || 'REC');
    setReceiptFooterMessage(
      nextData.receiptFooterMessage ||
      'Please note: All payments are final and non-refundable.'
    );
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      showToast('Logo image must be under 1 MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAcademyLogo(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updatedBranches: Record<string, BranchDetails> = {
        ...branches,
        [selectedBranch]: {
          address,
          phone,
          email,
          website,
          receiptPrefix: receiptPrefix.toUpperCase().trim(),
          receiptFooterMessage,
        },
      };
      setBranches(updatedBranches);

      const res = await settingsApi.update({
        academyName,
        academyLogo,
        address,
        phone,
        email,
        website,
        receiptPrefix: receiptPrefix.toUpperCase().trim(),
        receiptFooterMessage,
        currencySymbol,
        selectedBranch,
        branches: updatedBranches,
      });
      await refreshSettings();
      showToast(res.message || `Settings for ${selectedBranch} branch saved!`, 'success');
    } catch (err: any) {
      showToast(
        err?.response?.data?.message || 'Failed to update institution settings.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-indigo-900 tracking-tight">
          Institution & Receipt Settings
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Settings Form (7 cols) */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-5"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-indigo-950 uppercase tracking-wide">
              Settings Details
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
              Branch: {selectedBranch}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Academy Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={academyName}
                onChange={(e) => setAcademyName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            {/* Academy Logo Upload */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Academy Logo (PNG / JPEG)
              </label>
              <div className="flex items-center gap-4">
                {academyLogo ? (
                  <img
                    src={academyLogo}
                    alt="Academy Logo"
                    className="w-16 h-16 rounded-xl object-contain border border-slate-200 p-1 bg-slate-50"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-indigo-950 text-white flex flex-col items-center justify-center border border-indigo-700">
                    <Building2 className="w-6 h-6 text-indigo-300" />
                    <span className="text-[9px] font-bold uppercase text-indigo-200 mt-0.5">
                      Default
                    </span>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Upload Logo Image</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />
                  </label>
                  {academyLogo && (
                    <button
                      type="button"
                      onClick={() => setAcademyLogo('')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Use Default Crest</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Academy Address ({selectedBranch}) <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Official Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Receipt Number Prefix <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={8}
                placeholder="REC"
                value={receiptPrefix}
                onChange={(e) => setReceiptPrefix(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Example: {receiptPrefix || 'REC'}-{new Date().getFullYear()}-0001
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Currency Symbol
              </label>
              <Select
                value={currencySymbol}
                onChange={setCurrencySymbol}
                options={[
                  { label: "₹ (INR - Indian Rupee)", value: "₹" },
                  { label: "$ (USD - US Dollar)", value: "$" },
                ]}
                className="px-3.5 py-2.5 font-semibold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Receipt Footer Message <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={receiptFooterMessage}
                onChange={(e) => setReceiptFooterMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Settings...' : `Save ${selectedBranch} Settings`}</span>
            </button>
          </div>
        </form>

        {/* Branch Selection Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                  Branch Selection
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-semibold text-xs border border-indigo-100">
                Active: {selectedBranch}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                Select Branch
              </label>
              <Select
                value={selectedBranch}
                onChange={handleBranchChange}
                options={[
                  { label: "Thirur Branch", value: "Thirur" },
                  { label: "Calicut Branch", value: "Calicut" },
                ]}
                className="px-4 py-3 font-bold text-slate-900 shadow-2xs"
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <span className="font-bold text-slate-800 block">Current Branch Summary:</span>
              <div className="flex justify-between">
                <span className="text-slate-500">Branch:</span>
                <span className="font-semibold text-slate-900">{selectedBranch}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Receipt Prefix:</span>
                <span className="font-mono font-semibold text-indigo-900">{receiptPrefix}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone:</span>
                <span className="font-medium text-slate-700">{phone}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
