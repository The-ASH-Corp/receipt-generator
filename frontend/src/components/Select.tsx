import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

interface SelectOption {
    label: string;
    value: string;
}

interface SelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    required?: boolean;
}

export default function Select({
    value,
    onChange,
    options,
    placeholder = "Select an option",
    className = "",
    disabled = false,
    required = false
}: SelectProps) {
    return (
        <SelectPrimitive.Root
            value={value}
            onValueChange={onChange}
            disabled={disabled}
            required={required}
        >
            <SelectPrimitive.Trigger
                className={`w-full flex items-center justify-between gap-2
          px-3 py-2 rounded-xl border border-slate-300
          bg-white text-sm text-slate-700
          outline-none transition-all duration-200
          hover:border-slate-400
          disabled:bg-slate-100 disabled:cursor-not-allowed
          ${className}`}
            >
                <SelectPrimitive.Value placeholder={placeholder} />
                <SelectPrimitive.Icon>
                    <ChevronDown size={16} className="text-slate-500" />
                </SelectPrimitive.Icon>
            </SelectPrimitive.Trigger>

            <SelectPrimitive.Portal>
                <SelectPrimitive.Content
                    position="popper"
                    sideOffset={5}
                    className="z-[10000] w-[var(--radix-select-trigger-width)]
            overflow-hidden rounded-xl border border-slate-200
            bg-white shadow-lg
            animate-in fade-in-0 zoom-in-95"
                >
                    <SelectPrimitive.Viewport className="p-1 flex flex-col gap-1 max-h-60 overflow-y-auto">
                        {options.map((option) => (
                            <SelectPrimitive.Item
                                key={option.value}
                                value={option.value}
                                className="relative flex items-center justify-between
                  px-3 py-2 rounded-lg text-sm text-slate-700
                  cursor-pointer outline-none
                  data-[highlighted]:bg-indigo-50
                  data-[highlighted]:text-indigo-700
                  data-[state=checked]:bg-indigo-50
                  data-[state=checked]:text-indigo-700"
                            >
                                <SelectPrimitive.ItemText>
                                    {option.label}
                                </SelectPrimitive.ItemText>

                                <SelectPrimitive.ItemIndicator>
                                    <Check size={15} className="text-indigo-600" />
                                </SelectPrimitive.ItemIndicator>
                            </SelectPrimitive.Item>
                        ))}
                    </SelectPrimitive.Viewport>
                </SelectPrimitive.Content>
            </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
    );
}
