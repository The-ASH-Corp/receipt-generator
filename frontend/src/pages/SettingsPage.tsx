import React, { useState, useEffect } from 'react';
import { Save, Building2, Upload, Trash2, CheckCircle2 } from 'lucide-react';
import { settingsApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

export const SettingsPage: React.FC = () => {
  const { settings, refreshSettings } = useAuth();
  const { showToast } = useToast();

  const [academyName, setAcademyName] = useState(settings.academyName);
  const [academyLogo, setAcademyLogo] = useState(settings.academyLogo);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [email, setEmail] = useState(settings.email);
  const [website, setWebsite] = useState(settings.website || '');
  const [receiptPrefix, setReceiptPrefix] = useState(settings.receiptPrefix);
  const [receiptFooterMessage, setReceiptFooterMessage] = useState(
    settings.receiptFooterMessage
  );
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol || '₹');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAcademyName(settings.academyName);
    setAcademyLogo(settings.academyLogo);
    setAddress(settings.address);
    setPhone(settings.phone);
    setEmail(settings.email);
    setWebsite(settings.website || '');
    setReceiptPrefix(settings.receiptPrefix);
    setReceiptFooterMessage(settings.receiptFooterMessage);
    setCurrencySymbol(settings.currencySymbol || '₹');
  }, [settings]);

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
      });
      await refreshSettings();
      showToast(res.message || 'Settings updated successfully!', 'success');
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
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-indigo-900 tracking-tight">
          Institution & Receipt Settings
        </h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Configure your academy profile, logo, receipt numbering prefix, and footer message
          used dynamically on all generated PDF receipts
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Settings Form (7 cols) */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Academy / Institution Name <span className="text-rose-500">*</span>
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
                Institution Address <span className="text-rose-500">*</span>
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
              <select
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="₹">₹ (INR - Indian Rupee)</option>
                <option value="$">$ (USD - US Dollar)</option>
                <option value="€">€ (EUR - Euro)</option>
                <option value="£">£ (GBP - British Pound)</option>
              </select>
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
              <span>{saving ? 'Saving Settings...' : 'Save Institution Settings'}</span>
            </button>
          </div>
        </form>

        {/* Live PDF Receipt Header & Footer Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                Live Receipt Branding Preview
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" /> Active on PDFs
              </span>
            </div>

            {/* Simulated Receipt Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
              <div className="h-2 rounded-t-md bg-indigo-950 -mx-4 -mt-4 mb-2" />
              <div className="flex items-start gap-3">
                {academyLogo ? (
                  <img
                    src={academyLogo}
                    alt="Logo"
                    className="w-12 h-12 rounded-lg object-contain bg-white border border-slate-200 p-1 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-indigo-950 text-white flex flex-col items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-indigo-300" />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase leading-snug">
                    {academyName || 'Academy Name'}
                  </h3>
                  <p className="text-[11px] text-slate-600 mt-0.5">{address}</p>
                  <p className="text-[11px] font-medium text-slate-700 mt-1">
                    {phone} &bull; {email}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-indigo-700 block">
                    Sample Receipt No.
                  </span>
                  <span className="font-mono font-bold text-indigo-950">
                    {receiptPrefix || 'REC'}-{new Date().getFullYear()}-0001
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-indigo-950 text-white text-[10px] font-bold uppercase">
                  FEE RECEIPT
                </span>
              </div>

              <div className="pt-3 border-t border-slate-200 text-center">
                <p className="text-xs font-semibold text-indigo-950 italic">
                  &ldquo;{receiptFooterMessage}&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

