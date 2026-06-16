import { useRef, useState } from 'react';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_SIZE = 5 * 1024 * 1024;

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileUpload({ files, onChange, error }) {
  const inputRef = useRef(null);
  const [localError, setLocalError] = useState('');

  function handleFiles(newFiles) {
    setLocalError('');
    const valid = [];
    for (const file of newFiles) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setLocalError(`"${file.name}" is not allowed. Only PDF, JPG, and PNG files are accepted.`);
        return;
      }
      if (file.size > MAX_SIZE) {
        setLocalError(`"${file.name}" exceeds the 5MB size limit.`);
        return;
      }
      valid.push(file);
    }
    onChange([...files, ...valid]);
  }

  function handleDrop(e) {
    e.preventDefault();
    handleFiles(Array.from(e.dataTransfer.files));
  }

  function removeFile(index) {
    const updated = files.filter((_, i) => i !== index);
    onChange(updated);
  }

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-[#1A3C34] transition-colors"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => handleFiles(Array.from(e.target.files))}
        />
        <p className="text-sm text-gray-500">
          Drag & drop files here, or <span className="text-[#1A3C34] font-medium">browse</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG · Max 5MB each</p>
      </div>

      {(localError || error) && (
        <p className="mt-2 text-sm text-[#C53030]">{localError || error}</p>
      )}

      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((file, i) => (
            <li key={i} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md px-4 py-2 text-sm">
              <div>
                <span className="font-medium text-[#1C1C1C]">{file.name}</span>
                <span className="ml-2 text-gray-400">{formatSize(file.size)}</span>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                className="text-[#C53030] hover:text-red-700 font-medium ml-4"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
