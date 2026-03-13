import { NavLink } from 'react-router-dom';
import { Images, Tags, Map, Search, Settings, BarChart3 } from 'lucide-react';
import { useStats } from '../../hooks/useScanStatus';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(1)} GB`;
}

export default function Sidebar() {
  const { data: stats } = useStats();

  const navItems = [
    { to: '/photos', icon: Images, label: 'Photos' },
    { to: '/tags', icon: Tags, label: 'Tags' },
    { to: '/search', icon: Search, label: 'Search' },
    { to: '/map', icon: Map, label: 'Map' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="w-60 bg-gray-900 text-gray-300 flex flex-col h-full">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold text-white">PhotoTag</h1>
      </div>

      <nav className="flex-1 p-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-800 text-gray-400 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {stats && (
        <div className="p-4 border-t border-gray-700 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="flex items-center gap-1"><BarChart3 size={12} /> Photos</span>
            <span className="text-white">{stats.total_photos.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Tags</span>
            <span className="text-white">{stats.total_tags}</span>
          </div>
          <div className="flex justify-between">
            <span>Embeddings</span>
            <span className="text-white">{stats.photos_with_embeddings.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Storage</span>
            <span className="text-white">{formatBytes(stats.total_storage_bytes)}</span>
          </div>
        </div>
      )}
    </aside>
  );
}
