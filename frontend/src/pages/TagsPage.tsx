import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTags, useCreateTag, useDeleteTag } from '../hooks/useTags';
import { Plus, Trash2, Search, Image } from 'lucide-react';

export default function TagsPage() {
  const navigate = useNavigate();
  const { data: tags = [] } = useTags();
  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();
  const [newName, setNewName] = useState('');
  const [filter, setFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('');

  const filtered = tags.filter((t) => {
    if (filter && !t.name.toLowerCase().includes(filter.toLowerCase())) return false;
    if (sourceFilter && t.source !== sourceFilter) return false;
    return true;
  });

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createTag.mutateAsync({ name: newName.trim() });
    setNewName('');
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-bold">Tags</h1>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search tags..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All sources</option>
          <option value="user">User</option>
          <option value="ai">AI</option>
        </select>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="Create new tag..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleCreate}
          disabled={!newName.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-1"
        >
          <Plus size={16} /> Create
        </button>
      </div>

      <div className="space-y-1">
        {filtered.map((tag) => (
          <div
            key={tag.id}
            className="flex items-center justify-between bg-gray-800/50 hover:bg-gray-800 rounded-lg px-4 py-2 group cursor-pointer"
            onClick={() => navigate(`/photos?tags=${tag.id}`)}
            title={`View photos tagged "${tag.name}"`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  tag.source === 'ai' ? 'bg-purple-400' : 'bg-blue-400'
                }`}
              />
              <span className="text-sm">{tag.name}</span>
              <span className="text-xs text-gray-500">{tag.source}</span>
            </div>
            <div className="flex items-center gap-2">
              <Image size={14} className="text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteTag.mutate(tag.id);
                }}
                className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500">
        {filtered.length} tags shown ({tags.filter((t) => t.source === 'user').length} user, {tags.filter((t) => t.source === 'ai').length} AI)
      </p>
    </div>
  );
}
