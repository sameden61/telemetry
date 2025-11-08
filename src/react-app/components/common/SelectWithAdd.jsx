import { useState } from 'react';

export default function SelectWithAdd({
  label,
  value,
  onChange,
  options = [],
  onAdd,
  placeholder = "Choose...",
  addLabel = "Add New",
  className = ""
}) {
  const [showAddForm, setShowAddForm] = useState(false);

  const handleSelectChange = (e) => {
    const selectedValue = e.target.value;
    if (selectedValue === '__ADD_NEW__') {
      setShowAddForm(true);
      onAdd && onAdd();
    } else {
      onChange(selectedValue);
    }
  };

  return (
    <div className={className}>
      <label className="block text-f1-text font-medium mb-2">{label}</label>
      <select
        value={value}
        onChange={handleSelectChange}
        className="w-full bg-f1-background text-f1-text px-4 py-3 rounded-lg border border-gray-700 focus:border-f1-accent focus:ring-2 focus:ring-f1-accent focus:ring-opacity-50 outline-none transition-all"
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
