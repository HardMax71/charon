import { useEffect, useState, useRef } from 'react';
import { useGitHubAuth } from '@/stores/githubAuthStore';
import { Github, ChevronDown, LogOut, Lock, Globe, Loader2 } from 'lucide-react';

interface GitHubInputProps {
  onSubmit: (url: string) => void;
}

export const GitHubInput = ({ onSubmit }: GitHubInputProps) => {
  const { user, repos, oauthEnabled, isAuthenticating, checkConfig, initiateOAuth, checkSession, logout } = useGitHubAuth();

  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkConfig();
  }, [checkConfig]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

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
    let enabled = oauthEnabled;
    if (enabled === null) {
      enabled = await checkConfig();
    }
    if (enabled) {
      initiateOAuth();
    } else {
      alert('GitHub OAuth is not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in the backend.');
    }
  };

  const isAuthenticated = !!user;
  const selectedRepoData = repos.find(r => r.full_name === selectedRepo);

  if (isAuthenticating) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2 py-6 text-slate-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Connecting to GitHub...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <form onSubmit={(e) => {
        e.preventDefault();
        if (selectedRepo) {
          onSubmit(`https://github.com/${selectedRepo}`);
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
                  {selectedRepoData.private ? <Lock className="w-3.5 h-3.5 text-slate-500" /> : <Globe className="w-3.5 h-3.5 text-slate-600" />}
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
                  {repo.private ? <Lock className="w-3.5 h-3.5 text-slate-500" /> : <Globe className="w-3.5 h-3.5 text-slate-600" />}
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

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const input = form.querySelector('input') as HTMLInputElement;
      if (input.value.trim()) {
        onSubmit(input.value.trim());
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
          title="Sign in with GitHub for private repos"
        >
          <Github className="w-4 h-4 text-slate-600" />
        </button>
      </div>
    </form>
  );
};
