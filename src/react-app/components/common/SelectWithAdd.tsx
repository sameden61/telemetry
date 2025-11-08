
interface Option {
  id: string;
  display_name?: string;
  name: string;
}

interface SelectWithAddProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options?: Option[];
  onAdd?: () => void;
  placeholder?: string;
  addLabel?: string;
  className?: string;
}

export default function SelectWithAdd({
  label,
  value,
  onChange,
  options = [],
  onAdd,
  placeholder = "Choose...",
  addLabel = "Add New",
  className = ""
}: SelectWithAddProps) {
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    if (selectedValue === '__ADD_NEW__') {
      onAdd && onAdd();
    } else {
      onChange(selectedValue);
    }
  };

  return (
    <div className={className}>
      <label className="block text-f1-textGray text-xs font-medium mb-2 uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={handleSelectChange}
        className="w-full bg-f1-card text-f1-text px-4 py-2 border border-f1-border focus:border-f1-accent outline-none transition-all"
      >
        <option value="">{placeholder}</option>
        {options.map(option => (
          <option key={option.id} value={option.id}>
            {option.display_name || option.name}
          </option>
        ))}
        {onAdd && (
          <option value="__ADD_NEW__" className="text-f1-accent font-semibold">
            ➕ {addLabel}
          </option>
        )}
      </select>
    </div>
  );
}
