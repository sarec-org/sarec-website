'use client';

type FormFieldProps = {
  label: string;
  name: string;
  required?: boolean;
  type?: 'text' | 'email' | 'tel' | 'textarea' | 'select';
  options?: string[];
  placeholder?: string;
};

export function FormField({
  label,
  name,
  required,
  type = 'text',
  options,
  placeholder
}: FormFieldProps) {
  const id = `field-${name}`;
  const labelText = `${label}${required ? ' *' : ''}`;
  const inputClass =
    'w-full border-0 border-b border-line bg-transparent px-0 py-3.5 text-base text-ink outline-none transition placeholder:text-zinc-400 focus:border-ink';

  return (
    <label className="block font-sans text-sm font-medium text-muted" htmlFor={id}>
      <span className="block">{labelText}</span>
      {type === 'textarea' ? (
        <textarea
          className={`${inputClass} min-h-28 resize-y`}
          id={id}
          name={name}
          placeholder={placeholder}
          required={required}
        />
      ) : type === 'select' ? (
        <select className={inputClass} id={id} name={name} required={required} defaultValue="">
          <option value="" disabled>
            请选择
          </option>
          {options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          className={inputClass}
          id={id}
          name={name}
          placeholder={placeholder}
          required={required}
          type={type}
        />
      )}
    </label>
  );
}
