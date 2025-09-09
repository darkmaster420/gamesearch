import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, ExternalLink, Loader, Filter, X } from 'lucide-react';

const WORKER_URL = 'https://gameapi.a7a8524.workers.dev'; // Replace with your actual worker URL

const GameSearchApp = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [siteFilter, setSiteFilter] = useState('both');
  const [stats, setStats] = useState({});
  const [searchHistory, setSearchHistory] = useState([]);
  const searchInputRef = useRef(null);

  // Load search history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('gameSearchHistory');
    if (saved) {
      setSearchHistory(JSON.parse(saved));
    }
  }, []);

  // Save search to history
  const saveToHistory = (searchTerm) => {
    const newHistory = [searchTerm, ...searchHistory.filter(h => h !== searchTerm)].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem('gameSearchHistory', JSON.stringify(newHistory));
  };

  const searchGames = async (searchQuery = query) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams({
        search: searchQuery.trim(),
        site: siteFilter
      });
      
      const response = await fetch(`${WORKER_URL}?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setResults(data.results || []);
        setStats(data.siteStats || {});
        saveToHistory(searchQuery.trim());
      } else {
        setError(data.error || 'Search failed');
      }
    } catch (err) {
      setError('Failed to connect to search API');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    searchGames();
  };

  const handleHistoryClick = (historyItem) => {
    setQuery(historyItem);
    searchGames(historyItem);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const extractGamePoster = (game) => {
    // Try to extract poster from description or use a placeholder
    const posterMatch = game.description?.match(/https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp)/i);
    if (posterMatch) return posterMatch[0];
    
    // Generate a gradient based on game title for consistent colors
    const colors = [
      'from-purple-600 to-blue-600',
      'from-blue-600 to-cyan-600', 
      'from-cyan-600 to-teal-600',
      'from-teal-600 to-green-600',
      'from-green-600 to-yellow-600',
      'from-yellow-600 to-orange-600',
      'from-orange-600 to-red-600',
      'from-red-600 to-pink-600',
      'from-pink-600 to-purple-600'
    ];
    const colorIndex = game.title?.charCodeAt(0) % colors.length || 0;
    return colors[colorIndex];
  };

  const getServiceIcon = (service) => {
    if (!service) return '💾';
    const serviceLower = service.toLowerCase();
    if (serviceLower.includes('magnet') || serviceLower.includes('torrent')) {
      return '🧲';
    }
    if (serviceLower.includes('mega')) return '🟦';
    if (serviceLower.includes('mediafire')) return '🔥';
    if (serviceLower.includes('google')) return '📁';
    return '💾';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Game Search</h1>
          <p className="text-blue-200">Search across multiple game sources</p>
        </div>

        {/* Search Form */}
        <div className="max-w-4xl mx-auto mb-8">
          <div onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Search for games..."
                className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Site Filter */}
            <div className="flex flex-wrap gap-3 justify-center">
              {[
                { value: 'both', label: 'Both Sites', color: 'from-purple-500 to-pink-500' },
                { value: 'skidrow', label: 'SkidRow', color: 'from-red-500 to-orange-500' },
                { value: 'freegog', label: 'FreeGOG', color: 'from-green-500 to-emerald-500' }
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSiteFilter(option.value)}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                    siteFilter === option.value
                      ? `bg-gradient-to-r ${option.color} text-white shadow-lg shadow-${option.color.split('-')[1]}-500/25`
                      : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/20'
                  }`}
                >
                  <Filter className="inline w-4 h-4 mr-2" />
                  {option.label}
                </button>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={handleSubmit}
                disabled={loading || !query.trim()}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-xl font-semibold transition-colors inline-flex items-center gap-2"
              >
                {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                {loading ? 'Searching...' : 'Search Games'}
              </button>
            </div>
          </div>

          {/* Search History */}
          {searchHistory.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-300 mb-2">Recent searches:</p>
              <div className="flex flex-wrap gap-2">
                {searchHistory.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleHistoryClick(item)}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 text-gray-300 rounded-full text-sm transition-colors"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        {Object.keys(stats).length > 0 && (
          <div className="max-w-4xl mx-auto mb-6">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
              <div className="flex flex-wrap gap-4 justify-center text-sm text-gray-300">
                {Object.entries(stats).map(([site, count]) => (
                  <span key={site} className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                    {site}: {count} results
                  </span>
                ))}
                <span className="flex items-center gap-1 font-semibold">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  Total: {results.length}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="max-w-4xl mx-auto mb-6">
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-200 text-center">
              <X className="inline w-5 h-5 mr-2" />
              {error}
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="max-w-7xl mx-auto">
            {/* Results Container Header */}
            <div className="mb-8">
              <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-md rounded-2xl border border-blue-500/30 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Search Results</h2>
                    <p className="text-blue-200">Found {results.length} games across {Object.keys(stats).length} sources</p>
                  </div>
                  <div className="text-right">
                    <div className="flex flex-wrap gap-3 justify-end">
                      {Object.entries(stats).map(([site, count]) => (
                        <span key={site} className={`px-3 py-1 rounded-full text-xs font-bold ${
                          site === 'SkidrowReloaded' 
                            ? 'bg-red-500/20 text-red-300 border border-red-400/50' 
                            : 'bg-green-500/20 text-green-300 border border-green-400/50'
                        }`}>
                          {site === 'SkidrowReloaded' ? 'Skidrow' : 'GOG'}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Game Cards Grid */}
            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {results.map((game) => {
                const posterSrc = extractGamePoster(game);
                const isImagePoster = posterSrc.startsWith('http');
                
                return (
                  <div key={game.id} className="group">
                    {/* Game Card Container */}
                    <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-3xl border border-gray-700/50 overflow-hidden hover:border-cyan-400/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-cyan-500/20 hover:from-gray-700/80 hover:to-gray-800/80">
                      
                      {/* Poster Section */}
                      <div className="relative h-64 overflow-hidden">
                        {isImagePoster ? (
                          <img 
                            src={posterSrc} 
                            alt={game.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            onError={(e) => {
                              // Fallback to gradient if image fails
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        
                        {/* Gradient Fallback */}
                        <div 
                          className={`${!isImagePoster ? 'flex' : 'hidden'} w-full h-full bg-gradient-to-br ${posterSrc} items-center justify-center`}
                          style={{display: !isImagePoster ? 'flex' : 'none'}}
                        >
                          <div className="text-6xl opacity-40">🎮</div>
                        </div>
                        
                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>
                        
                        {/* Source Badge */}
                        <div className="absolute top-4 right-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md ${
                            game.source === 'SkidrowReloaded' 
                              ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/30' 
                              : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30'
                          }`}>
                            {game.source === 'SkidrowReloaded' ? 'SKIDROW' : 'GOG'}
                          </span>
                        </div>
                        
                        {/* Download Count Badge */}
                        {game.downloadLinks && game.downloadLinks.length > 0 && (
                          <div className="absolute top-4 left-4">
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500 to-cyan-500 text-white backdrop-blur-md shadow-lg shadow-blue-500/30">
                              {game.downloadLinks.length} Links
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content Section */}
                      <div className="p-6 space-y-4">
                        {/* Title */}
                        <h3 className="font-bold text-xl text-white leading-tight group-hover:text-cyan-400 transition-colors">
                          {game.title}
                        </h3>
                        
                        {/* Description */}
                        <p className="text-gray-300 text-sm leading-relaxed line-clamp-3">
                          {game.description}
                        </p>
                        
                        {/* Meta Info */}
                        <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-700/50">
                          <span className="flex items-center gap-1">
                            📅 {formatDate(game.date)}
                          </span>
                          <a 
                            href={game.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Source
                          </a>
                        </div>
                      </div>

                      {/* Download Links Section */}
                      {game.downloadLinks && game.downloadLinks.length > 0 && (
                        <div className="border-t border-gray-700/50 bg-gradient-to-r from-gray-800/50 to-gray-900/50">
                          <div className="p-6 space-y-3">
                            <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                              <Download className="w-4 h-4 text-cyan-400" />
                              Download Options
                            </h4>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                              {game.downloadLinks.slice(0, 10).map((link, index) => (
                                <a
                                  key={index}
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-3 p-3 bg-gray-700/40 hover:bg-gradient-to-r hover:from-cyan-600/20 hover:to-blue-600/20 rounded-lg text-sm text-gray-300 hover:text-white transition-all duration-200 group/link border border-gray-600/30 hover:border-cyan-400/50"
                                >
                                  <span className="text-lg flex-shrink-0">{getServiceIcon(link.service)}</span>
                                  <span className="truncate flex-1 font-medium">{link.text || link.service}</span>
                                  <ExternalLink className="w-4 h-4 opacity-0 group-hover/link:opacity-100 transition-opacity text-cyan-400" />
                                </a>
                              ))}
                              
                              {game.downloadLinks.length > 10 && (
                                <div className="col-span-full text-xs text-gray-400 text-center py-2 bg-gray-700/30 rounded-lg border border-gray-600/30">
                                  +{game.downloadLinks.length - 10} more download options
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {results.length === 0 && !loading && !error && (
          <div className="text-center text-gray-400 py-12">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Search for games to see results</p>
          </div>
        )}

        {/* 🔗 Other Projects Section */}
        <div className="max-w-4xl mx-auto mt-16">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Other Projects
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <a
              href="https://pdbypass.a7a8524.workers.dev/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 hover:bg-white/20 transition"
            >
              <h3 className="text-lg font-semibold text-cyan-400 mb-2">
                Pixeldrain Bypass
              </h3>
              <p className="text-sm text-gray-300">
                Remove Pixeldrain download limits with a Cloudflare Worker proxy.
              </p>
            </a>

            <a
              href="https://cfrss.a7a8524.workers.dev/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 hover:bg-white/20 transition"
            >
              <h3 className="text-lg font-semibold text-cyan-400 mb-2">
                RSS Cloudflare Bypass
              </h3>
              <p className="text-sm text-gray-300">
                Use FlareSolverr via a Cloudflare Worker to fetch RSS feeds behind CF protection.
              </p>
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-400 text-sm">
          <p>Powered by Cloudflare Workers • Search across multiple game sources</p>
        </div>
      </div>
    </div>
  );
};

export default GameSearchApp;
