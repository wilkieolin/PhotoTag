import SearchBar from '../components/search/SearchBar';

export default function SearchPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-xl font-bold">Search</h1>
      <p className="text-sm text-gray-400">
        Search photos by description using AI-powered visual similarity.
        Type a description like "sunset over ocean" or "person with dog in park".
      </p>
      <SearchBar />
    </div>
  );
}
