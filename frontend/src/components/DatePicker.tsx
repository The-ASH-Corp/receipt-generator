import { useState } from "react";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";
import { format, parseISO } from "date-fns";
import { CalendarDays, X } from "lucide-react";
import "react-day-picker/style.css";

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}

export default function DatePicker({
  value,
  onChange,
  required = false,
  placeholder = "Select date",
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  const selectedDate = value ? parseISO(value) : undefined;

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600 hover:border-slate-400 transition-colors"
      >
        <span className={selectedDate ? "text-slate-900" : "text-slate-500"}>
          {selectedDate ? format(selectedDate, "dd MMM yyyy") : placeholder}
        </span>
        <CalendarDays size={18} className="text-slate-500" />
      </button>

      {required && (
        <input
          type="text"
          value={value}
          required
          readOnly
          tabIndex={-1}
          className="absolute opacity-0 w-px h-px pointer-events-none"
        />
      )}

      {open && (
        <>
          {/* Mobile View: Render centered modal via React Portal into document.body */}
          {createPortal(
            <div className="fixed inset-0 z-[10000] sm:hidden flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in-0">
              <div
                className="fixed inset-0"
                onClick={() => setOpen(false)}
              />
              <div className="relative z-10 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 w-full max-w-[340px] animate-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <span className="font-semibold text-sm text-indigo-950">
                    {placeholder}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="flex justify-center">
                  <DayPicker
                    mode="single"
                    selected={selectedDate}
                    onSelect={(day) => {
                      if (day) {
                        onChange(format(day, "yyyy-MM-dd"));
                        setOpen(false);
                      }
                    }}
                    className="text-sm m-0"
                    classNames={{
                      today: "text-indigo-600 font-bold",
                      selected: "!bg-indigo-600 !text-white rounded-lg",
                      chevron: "fill-slate-600",
                      day_button:
                        "w-9 h-9 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition-colors",
                    }}
                  />
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Desktop View: Dropdown below the trigger */}
          <div
            className="hidden sm:block fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          <div className="hidden sm:block absolute left-0 top-full mt-2 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-3 animate-in fade-in-0 zoom-in-95">
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={(day) => {
                if (day) {
                  onChange(format(day, "yyyy-MM-dd"));
                  setOpen(false);
                }
              }}
              className="text-sm m-0"
              classNames={{
                today: "text-indigo-600 font-bold",
                selected: "!bg-indigo-600 !text-white rounded-lg",
                chevron: "fill-slate-600",
                day_button:
                  "w-9 h-9 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition-colors",
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
