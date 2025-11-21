import { useState } from 'react';

interface GitHubInputProps {
  onSubmit: (url: string) => void;
}

export const GitHubInput = ({ onSubmit }: GitHubInputProps) => {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://github.com/owner/repo"
        className="input-text text-gray-900 placeholder-gray-400"
      />
      <button
        type="submit"
        disabled={!url.trim()}
        className="w-full btn btn-primary btn-lg transform hover:scale-[1.02] active:scale-[0.98] disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        Analyze Repository
      </button>
    </form>
  );
};
