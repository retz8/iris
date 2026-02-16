import React, { useState, useEffect, useCallback, useMemo } from 'react';

const SORT_OPTIONS = {
  NAME_ASC: { field: 'name', order: 'asc', label: 'Name (A-Z)' },
  NAME_DESC: { field: 'name', order: 'desc', label: 'Name (Z-A)' },
  DATE_ASC: { field: 'createdAt', order: 'asc', label: 'Oldest first' },
  DATE_DESC: { field: 'createdAt', order: 'desc', label: 'Newest first' },
};

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

function SearchableList({ items, onSelect, placeholder = 'Search...' }) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState('NAME_ASC');
  const [selectedId, setSelectedId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const debouncedQuery = useDebounce(query, 300);

  const filteredItems = useMemo(() => {
    if (!debouncedQuery) return items;
    const lowerQuery = debouncedQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerQuery) ||
        item.description?.toLowerCase().includes(lowerQuery)
    );
  }, [items, debouncedQuery]);

  const sortedItems = useMemo(() => {
    const { field, order } = SORT_OPTIONS[sortKey];
    return [...filteredItems].sort((a, b) => {
      const aVal = a[field] ?? '';
      const bVal = b[field] ?? '';
      const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
      return order === 'asc' ? cmp : -cmp;
    });
  }, [filteredItems, sortKey]);

  const handleSelect = useCallback(
    (item) => {
      setSelectedId(item.id);
      onSelect?.(item);
    },
    [onSelect]
  );

  const handleClearSearch = useCallback(() => {
    setQuery('');
    setSelectedId(null);
  }, []);

  if (error) {
    return (
      <div className="error-banner" role="alert">
        <span>{error.message}</span>
        <button onClick={() => setError(null)}>Dismiss</button>
      </div>
    );
  }

  return (
    <div className="searchable-list">
      <div className="search-controls">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label="Search items"
        />
        {query && (
          <button onClick={handleClearSearch} aria-label="Clear search">
            Clear
          </button>
        )}
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          aria-label="Sort order"
        >
          {Object.entries(SORT_OPTIONS).map(([key, opt]) => (
            <option key={key} value={key}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="results-info">
        {debouncedQuery && (
          <span>
            {sortedItems.length} result{sortedItems.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="loading-spinner" aria-label="Loading" />
      ) : sortedItems.length === 0 ? (
        <div className="empty-state">
          <p>No items found{debouncedQuery ? ` for "${debouncedQuery}"` : ''}</p>
        </div>
      ) : (
        <ul className="item-list" role="listbox">
          {sortedItems.map((item) => (
            <li
              key={item.id}
              className={`item ${selectedId === item.id ? 'selected' : ''}`}
              onClick={() => handleSelect(item)}
              role="option"
              aria-selected={selectedId === item.id}
            >
              <span className="item-name">{item.name}</span>
              {item.description && (
                <span className="item-desc">{item.description}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SearchableList;
