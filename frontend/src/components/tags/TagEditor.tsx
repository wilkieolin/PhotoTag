import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import type { Photo } from '../../types/photo';
import { useTags, useCreateTag, useAssignTags, useRemoveTag } from '../../hooks/useTags';

interface Props {
  photo: Photo;
}

export default function TagEditor({ photo }: Props) {
  const { data: allTags = [] } = useTags();
  const createTag = useCreateTag();
  const assignTags = useAssignTags();
  const removeTag = useRemoveTag();
  const [newTagName, setNewTagName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const photoTagIds = new Set(photo.tags.map((t) => t.id));
  const availableTags = allTags.filter((t) => !photoTagIds.has(t.id));
  const filteredTags = newTagName
    ? availableTags.filter((t) =>
        t.name.toLowerCase().includes(newTagName.toLowerCase())
      )
    : availableTags;

  const handleAssign = (tagId: number) => {
    assignTags.mutate({ photoId: photo.id, tagIds: [tagId] });
    setNewTagName('');
    setShowDropdown(false);
  };

  const handleRemove = (tagId: number) => {
    removeTag.mutate({ photoId: photo.id, tagId });
  };

  const handleCreateAndAssign = async () => {
    if (!newTagName.trim()) return;
    const tag = await createTag.mutateAsync({ name: newTagName.trim() });
    assignTags.mutate({ photoId: photo.id, tagIds: [tag.id] });
    setNewTagName('');
    setShowDropdown(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {photo.tags.map((tag) => (
          <span
            key={tag.id}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
              tag.source === 'ai'
                ? 'bg-purple-900/50 text-purple-300'
                : 'bg-blue-900/50 text-blue-300'
            }`}
          >
            {tag.name}
            <button
              onClick={() => handleRemove(tag.id)}
              className="hover:text-white"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        {photo.tags.length === 0 && (
          <span className="text-xs text-gray-500">No tags yet</span>
        )}
      </div>

      <div className="relative">
        <div className="flex gap-1">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => {
              setNewTagName(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Add tag..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleCreateAndAssign}
            disabled={!newTagName.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-2 py-1 rounded text-xs flex items-center gap-1"
          >
            <Plus size={12} /> New
          </button>
        </div>

        {showDropdown && filteredTags.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded max-h-32 overflow-auto z-10">
            {filteredTags.slice(0, 10).map((tag) => (
              <button
                key={tag.id}
                onClick={() => handleAssign(tag.id)}
                className="w-full text-left px-2 py-1 text-xs hover:bg-gray-700 flex items-center gap-1"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    tag.source === 'ai' ? 'bg-purple-400' : 'bg-blue-400'
                  }`}
                />
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
