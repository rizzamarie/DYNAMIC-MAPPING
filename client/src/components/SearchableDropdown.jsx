import React, { useState, useRef, useEffect } from 'react';
import { FaSearch, FaPlus, FaTrash, FaChevronDown } from 'react-icons/fa';

const SearchableDropdown = ({
  options,
  value,
  onChange,
  placeholder = "Select an item",
  onAdd,
  onDelete,
  label,
  style = {},
  inputStyle = {},
  buttonStyle = {},
  deleteButtonStyle = {},
  addButtonStyle = {},
  dropdownHeight = '200px',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current.focus(), 0);
    }
  }, [isOpen]);

  const filteredOptions = options.filter(option =>
    String(option.label).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (optionValue) => {
    onChange({ target: { name: label.toLowerCase(), value: optionValue } });
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleDeleteClick = () => {
    if (onDelete) {
      onDelete(value);
    }
  };

  const selectedLabel = options.find(opt => opt.value === value)?.label || value;

  const defaultInputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #e3e8ff',
    background: '#ffffff',
    fontSize: '14px',
    boxSizing: 'border-box',
    ...inputStyle,
  };

  const defaultButtonStyle = {
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '0 12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '42px',
    ...buttonStyle,
  };

  const defaultDeleteButtonStyle = {
    background: '#fee2e2',
    color: '#ef4444',
    border: '1px solid #fecaca',
    ...defaultButtonStyle,
    ...deleteButtonStyle,
  };

  const defaultAddButtonStyle = {
    background: '#e0f2f1',
    color: '#00796b',
    border: '1px solid #a7f3d0',
    ...defaultButtonStyle,
    ...addButtonStyle,
  };

  return (
    <div style={{ width: '100%', ...style }}>
      {label && <label style={{ display: 'block', fontWeight: 800, color: '#374151', marginBottom: 6, fontSize: 13 }}>{label}</label>}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ position: 'relative', flexGrow: 1 }} ref={dropdownRef}>
          <div
            onClick={() => setIsOpen(!isOpen)}
            style={{
              ...defaultInputStyle,
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              userSelect: 'none',
            }}
          >
            <span style={{ color: selectedLabel ? '#0f172a' : '#9ca3af' }}>
              {selectedLabel || placeholder}
            </span>
            <FaChevronDown style={{ color: '#9ca3af', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
          </div>

          {isOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 5px)',
                left: 0,
                right: 0,
                backgroundColor: 'white',
                border: '1px solid #e3e8ff',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ padding: 8, borderBottom: '1px solid #f3f4f6', position: 'relative', display: 'flex', alignItems: 'center' }}>
                <FaSearch style={{ color: '#9ca3af', position: 'absolute', left: 16 }} />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  style={{
                    width: '100%',
                    padding: '8px 8px 8px 32px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    outline: 'none',
                  }}
                />
              </div>
              <div style={{ maxHeight: dropdownHeight, overflowY: 'auto' }}>
                {filteredOptions.length === 0 ? (
                  <div style={{ padding: '10px 12px', color: '#6b7280', fontSize: '14px', textAlign: 'center' }}>No results found</div>
                ) : (
                  filteredOptions.slice(0, 5).map((option) => (
                    <div
                      key={option.value}
                      onClick={() => handleSelect(option.value)}
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        backgroundColor: value === option.value ? '#e0f2f1' : 'transparent',
                        fontSize: '14px',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0fdf4'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = value === option.value ? '#e0f2f1' : 'transparent'}
                    >
                      {option.label}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        {onDelete && (
          <button type="button" onClick={handleDeleteClick} style={defaultDeleteButtonStyle} title={`Delete ${label}`}>
            <FaTrash size={14} />
          </button>
        )}
        {onAdd && (
          <button type="button" onClick={onAdd} style={defaultAddButtonStyle} title={`Add New ${label}`}>
            <FaPlus size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchableDropdown;
