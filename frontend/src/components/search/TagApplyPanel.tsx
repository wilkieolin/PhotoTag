import { useState } from 'react';
import { Tag as TagIcon, Check } from 'lucide-react';
import type { Tag } from '../../types/photo';

interface Props {
  tags: Tag[];
  selectedCount: number;
  onApply: (tagIds: number[]) => Promise<void>;
}

export default function TagApplyPanel({ tags, selectedCount, onApply }: Props) {
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [applying, setApplying] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (tags.length === 0) return null;

  const toggleTag = (id: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const handleApply = async () => {
    setApplying(true);
    setStatus(null);
    const appliedCount = selectedCount;
    const appliedTags = selectedTagIds.length;
    try {
      await onApply(selectedTagIds);
      setSelectedTagIds([]);
      setStatus({
        type: 'success',
        message: `Applied ${appliedTags} tag${appliedTags === 1 ? '' : 's'} to ${appliedCount} photo${appliedCount === 1 ? '' : 's'}`,
      });
    } catch {
      setStatus({ type: 'error', message: 'Failed to apply tags. Please try again.' });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-2 space-y-2">
      <p className="text-xs text-gray-400 flex items-center gap-1">
        <TagIcon size={12} /> Apply this photo's tags to selected images
      </p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <button
            key={tag.id}
            onClick={() => toggleTag(tag.id)}
            className={`px-2 py-0.5 rounded text-xs flex items-center gap-1 ${
              selectedTagIds.includes(tag.id)
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {selectedTagIds.includes(tag.id) && <Check size={10} />}
            {tag.name}
          </button>
        ))}
      </div>
      <button
        onClick={handleApply}
        disabled={selectedTagIds.length === 0 || selectedCount === 0 || applying}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs py-1.5 rounded"
      >
        {applying
          ? 'Applying...'
          : selectedCount === 0
          ? 'Select images below to apply tags'
          : `Apply ${selectedTagIds.length} tag${selectedTagIds.length === 1 ? '' : 's'} to ${selectedCount} selected`}
      </button>
      {status && (
        <p className={`text-xs ${status.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
          {status.message}
        </p>
      )}
    </div>
  );
}
