import { useEffect, useState, useRef } from 'react';
import { useGitHubAuth } from '@/stores/githubAuthStore';
import { Github, ChevronDown, LogOut, Lock, Globe } from 'lucide-react';

interface GitHubInputProps {
  onSubmit: (url: string, token: string | null) => void;
}

export const GitHubInput = ({ onSubmit }: GitHubInputProps) => {
  const { token, user, repos, setTokenAndFetchData, restoreSession, logout } = useGitHubAuth();
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleConnect = async () => {
    window.open('https://github.com/settings/tokens/new?scopes=repo&description=Charon', '_blank');
    const inputToken = window.prompt('After creating your token on GitHub, paste it here:');
    if (inputToken?.trim()) {
      await setTokenAndFetchData(inputToken.trim());
    }
  };

  const isAuthenticated = !!user && !!token;
  const selectedRepoData = repos.find(r => r.full_name === selectedRepo);

  // Authenticated: show repo dropdown (same height as default)
  if (isAuthenticated) {
    return (
      <form onSubmit={(e) => {
        e.preventDefault();
        if (selectedRepo) {
          onSubmit(`https://github.com/${selectedRepo}`, token);
        }
      }} className="space-y-3">
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center justify-between bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent cursor-pointer"
          >
            <span className="flex items-center gap-2">
              {selectedRepoData ? (
                <>
                  {selectedRepoData.private ? <Lock className="w-3.5 h-3.5 text-slate-600" /> : <Globe className="w-3.5 h-3.5 text-slate-600" />}
                  {selectedRepoData.full_name}
                </>
              ) : (
                <span className="text-slate-600">Select repository...</span>
              )}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto">

              {repos.map((repo) => (
                <button
                  key={repo.full_name}
                  type="button"
                  onClick={() => { setSelectedRepo(repo.full_name); setDropdownOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 ${selectedRepo === repo.full_name ? 'bg-slate-100' : ''}`}
                >
                  {repo.private ? <Lock className="w-3.5 h-3.5 text-slate-600" /> : <Globe className="w-3.5 h-3.5 text-slate-600" />}
                  <span className="truncate">{repo.full_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 h-10">
          <button type="submit" disabled={!selectedRepo} className="flex-1 btn btn-primary px-4 disabled:opacity-50 disabled:cursor-not-allowed">
            Analyze
          </button>
          <button
            type="button"
            onClick={logout}
            className="w-10 flex items-center justify-center bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 transition-colors"
            title={`Signed in as ${user.login}`}
          >
            <LogOut className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </form>
    );
  }

  // Default: URL input + Analyze button with GitHub auth on same row
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const input = form.querySelector('input') as HTMLInputElement;
      if (input.value.trim()) {
        onSubmit(input.value.trim(), token);
      }
    }} className="space-y-3">
      <input
        type="text"
        name="url"
        placeholder="https://github.com/owner/repo"
        className="w-full input-text text-slate-900 placeholder-slate-500 text-sm"
      />

      <div className="flex gap-2 h-10">
        <button type="submit" className="flex-1 btn btn-primary px-4">
          Analyze
        </button>
        <button
          type="button"
          onClick={handleConnect}
          className="w-10 flex items-center justify-center bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 transition-colors"
          title="Connect GitHub for private repos"
        >
          <Github className="w-4 h-4 text-slate-600" />
        </button>
      </div>
    </form>
  );
};
