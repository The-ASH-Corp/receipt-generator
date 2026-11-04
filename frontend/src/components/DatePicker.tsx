
import { useState } from "react";
import { DayPicker } from "react-day-picker";
import { format, parseISO } from "date-fns";
import { CalendarDays, ChevronDown } from "lucide-react";
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
        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
      >
        <span>
          {selectedDate
            ? format(selectedDate, "dd MMM yyyy")
            : placeholder}
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
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          <div className="absolute left-0 top-full mt-2 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-3">
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={(day) => {
                if (day) {
                  onChange(format(day, "yyyy-MM-dd"));
                  setOpen(false);
                }
              }}
              className="text-sm"
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
