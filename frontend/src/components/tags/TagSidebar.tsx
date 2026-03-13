import { useState } from 'react';
import { Search, X, Trash2, Plus } from 'lucide-react';
import { useTags, useCreateTag, useDeleteTag } from '../../hooks/useTags';

interface Props {
  selectedTagIds: number[];
  onTagSelect: (tagIds: number[]) => void;
}

export default function TagSidebar({ selectedTagIds, onTagSelect }: Props) {
  const { data: tags = [] } = useTags();
  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();
  const [search, setSearch] = useState('');
  const [newTagName, setNewTagName] = useState('');

  const filtered = search
    ? tags.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    : tags;

  const toggleTag = (tagId: number) => {
    if (selectedTagIds.includes(tagId)) {
      onTagSelect(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onTagSelect([...selectedTagIds, tagId]);
    }
  };

  const handleCreate = async () => {
    if (!newTagName.trim()) return;
    await createTag.mutateAsync({ name: newTagName.trim() });
    setNewTagName('');
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter tags..."
          className="w-full bg-gray-800 border border-gray-700 rounded pl-7 pr-2 py-1.5 text-xs focus:outline-none focus:border-blue-500"
        />
      </div>

      {selectedTagIds.length > 0 && (
        <button
          onClick={() => onTagSelect([])}
          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
        >
          <X size={12} /> Clear filter
        </button>
      )}

      <div className="space-y-0.5 max-h-64 overflow-auto">
        {filtered.map((tag) => (
          <div key={tag.id} className="flex items-center gap-1 group">
            <button
              onClick={() => toggleTag(tag.id)}
              className={`flex-1 text-left px-2 py-1 rounded text-xs flex items-center gap-1.5 ${
                selectedTagIds.includes(tag.id)
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-800 text-gray-300'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  tag.source === 'ai' ? 'bg-purple-400' : 'bg-blue-400'
                }`}
              />
              {tag.name}
            </button>
            <button
              onClick={() => deleteTag.mutate(tag.id)}
              className="p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-1">
        <input
          type="text"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="New tag..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleCreate}
          disabled={!newTagName.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white p-1 rounded"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
