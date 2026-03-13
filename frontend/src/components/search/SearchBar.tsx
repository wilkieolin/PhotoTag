import { useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import { useTextSearch } from '../../hooks/useSearch';
import { thumbnailUrl } from '../../api/photos';
import { useNavigate } from 'react-router-dom';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const { data: results, isLoading } = useTextSearch(debouncedQuery);
  const navigate = useNavigate();

  const handleSearch = useCallback(() => {
    setDebouncedQuery(query.trim());
  }, [query]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search photos by description (e.g., 'sunset over mountains')..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          onClick={handleSearch}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm"
        >
          Search
        </button>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Searching...</p>}

      {results && results.length === 0 && debouncedQuery && (
        <p className="text-sm text-gray-500">No results found.</p>
      )}

      {results && results.length > 0 && (
        <div>
          <p className="text-sm text-gray-400 mb-2">{results.length} results</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {results.map(({ photo, similarity }) => (
              <div
                key={photo.id}
                className="relative group cursor-pointer rounded-lg overflow-hidden"
                onClick={() => navigate(`/photos?selected=${photo.id}`)}
              >
                <img
                  src={thumbnailUrl(photo.id)}
                  alt={photo.filename}
                  className="w-full aspect-square object-cover"
                  loading="lazy"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1 text-xs text-center">
                  {(similarity * 100).toFixed(0)}% match
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
