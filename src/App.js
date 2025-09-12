import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, ExternalLink, Loader, Filter, X, Clock } from 'lucide-react';

const WORKER_URL = 'https://gameapi.a7a8524.workers.dev'; // Replace with your actual worker URL

const GameSearchApp = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [recentUploads, setRecentUploads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [error, setError] = useState('');
  const [siteFilter, setSiteFilter] = useState('all'); // Changed from 'both' to 'all' for better clarity with multiple sources
  const [stats, setStats] = useState({});
  const [searchHistory, setSearchHistory] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [failedImages, setFailedImages] = useState(new Set());
  const [loadingImages, setLoadingImages] = useState(new Set());
  
  const searchInputRef = useRef(null);

  // Load search history from localStorage on component mount
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('searchHistory');
      if (storedHistory) {
        setSearchHistory(JSON.parse(storedHistory));
      }
    } catch (e) {
      console.error('Failed to load search history from localStorage:', e);
    }
  }, []);

  // Fetch recent uploads on component mount
  useEffect(() => {
    fetchRecentUploads();
  }, []);

  const fetchRecentUploads = async () => {
    setLoadingRecent(true);
    setError('');
    try {
      const response = await fetch(`${WORKER_URL}/recent`);
      const data = await response.json();
      if (data.success) {
        setRecentUploads(data.results);
      } else {
        setError(data.error || 'Failed to fetch recent uploads.');
      }
    } catch (err) {
      setError('An error occurred while fetching recent uploads.');
      console.error(err);
    } finally {
      setLoadingRecent(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) {
      setError('Please enter a search query.');
      return;
    }
    
    setLoading(true);
    setResults([]);
    setError('');
    setHasSearched(true);
    setStats({});
    
    // Add query to search history
    const newHistory = [query, ...searchHistory.filter(q => q !== query)].slice(0, 5);
    setSearchHistory(newHistory);
    localStorage.setItem('searchHistory', JSON.stringify(newHistory));

    try {
      const response = await fetch(`${WORKER_URL}/search?search=${encodeURIComponent(query)}&site=${siteFilter}`);
      const data = await response.json();
      
      if (data.success) {
        setResults(data.results);
        setStats(data.siteStats);
        if (data.results.length === 0) {
          setError('No results found for your query.');
        }
      } else {
        setError(data.error || 'Failed to fetch search results.');
      }
    } catch (err) {
      setError('An error occurred while searching.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setError('');
    setHasSearched(false);
    setStats({});
    fetchRecentUploads();
    searchInputRef.current?.focus();
  };

  const renderDownloadLinks = (links) => {
    if (!links || links.length === 0) {
      return <p className="text-gray-400">No download links available.</p>;
    }
    return (
      <div className="space-y-2 mt-4">
        {links.map((link, index) => (
          <a
            key={index}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 bg-white/5 rounded-lg hover:bg-white/10 transition text-sm text-cyan-400"
          >
            <Download size={16} />
            <span className="truncate">{link.text || 'Download'}</span>
          </a>
        ))}
      </div>
    );
  };
  
  const handleImageError = (id) => {
    setFailedImages(prev => new Set(prev).add(id));
  };

  const renderResult = (post) => {
    const isImageFailed = failedImages.has(post.id);
    const isLoadingImage = loadingImages.has(post.id);

    return (
      <div key={post.id} className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 flex flex-col sm:flex-row gap-6 hover:border-cyan-400 transition-colors duration-200 ease-in-out">
        {/* Conditional image rendering */}
        {post.image && (
          <div className="relative w-full sm:w-48 h-48 flex-shrink-0 rounded-lg overflow-hidden border border-white/20 bg-gray-900 flex items-center justify-center">
            {isLoadingImage && (
              <Loader size={24} className="animate-spin text-gray-500 absolute" />
            )}
            {isImageFailed ? (
              <span className="text-gray-500 text-center text-xs p-2">Image unavailable</span>
            ) : (
              <img
                src={
                  post.siteType === 'gog-games'
                    ? post.image
                    : `${WORKER_URL}/proxy-image?url=${encodeURIComponent(post.image)}`
                }
                alt={post.title}
                className={`w-full h-full object-cover transition-opacity duration-300 ${isLoadingImage ? 'opacity-0' : 'opacity-100'}`}
                onLoad={() => setLoadingImages(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(post.id);
                  return newSet;
                })}
                onError={() => handleImageError(post.id)}
                style={{ objectFit: 'cover' }}
              />
            )}
          </div>
        )}

        <div className="flex-grow flex flex-col">
          <div className="flex-grow">
            <h3 className="text-xl font-bold text-cyan-400 leading-tight">
              {post.title}
            </h3>
            <p className="text-sm text-gray-400 mt-1">{post.source}</p>
            <p className="text-xs text-gray-500">{new Date(post.date).toLocaleDateString()}</p>
            {post.excerpt && (
              <p className="text-sm text-gray-300 mt-3 line-clamp-3">
                {post.excerpt}
              </p>
            )}
            {post.description && post.siteType === 'skidrow' && (
              <div className="mt-3">
                <h4 className="font-semibold text-gray-300">Description:</h4>
                <p className="text-sm text-gray-400 whitespace-pre-wrap mt-1 max-h-48 overflow-y-auto custom-scrollbar">
                  {post.description}
                </p>
              </div>
            )}
            {post.siteType === 'gog-games' && (
              <div className="mt-3 text-sm text-gray-300">
                <p>Developer: <span className="text-gray-400">{post.excerpt.split(',')[0].replace('Developer:', '').trim()}</span></p>
                <p>Publisher: <span className="text-gray-400">{post.excerpt.split(',')[1].replace('Publisher:', '').trim()}</span></p>
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-col gap-4">
            <a
              href={post.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 bg-white/5 rounded-lg hover:bg-white/10 transition text-sm text-cyan-400"
            >
              <ExternalLink size={16} />
              View Full Post
            </a>
            {post.siteType !== 'gog-games' && renderDownloadLinks(post.downloadLinks)}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-cyan-400 mb-2">Game Search</h1>
          <p className="text-gray-400">Search across SkidrowReloaded, FreeGOGPCGames, and GOG-Games.to</p>
        </div>

        {/* Search Bar and Filter */}
        <form onSubmit={handleSearch} className="mb-8 relative">
          <div className="relative flex items-center bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-2 shadow-lg">
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for a game..."
              className="w-full bg-transparent text-white placeholder-gray-400 focus:outline-none p-3 pl-4"
              disabled={loading}
            />
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-20 text-gray-400 hover:text-white transition-colors duration-200 p-2 rounded-full"
                aria-label="Clear search"
              >
                <X size={20} />
              </button>
            )}
            <button
              type="submit"
              className="bg-cyan-600 text-white p-3 rounded-xl hover:bg-cyan-500 transition-colors duration-200 flex items-center justify-center"
              disabled={loading}
            >
              {loading ? (
                <Loader size={24} className="animate-spin" />
              ) : (
                <Search size={24} />
              )}
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-gray-300">
            <Filter size={16} className="text-gray-500" />
            <span className="font-semibold">Filter by source:</span>
            {['all', 'skidrow', 'freegog', 'gog-games'].map(site => (
              <label key={site} className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="site-filter"
                  value={site}
                  checked={siteFilter === site}
                  onChange={(e) => setSiteFilter(e.target.value)}
                  className="form-radio text-cyan-400 bg-gray-700 border-gray-600 focus:ring-cyan-400"
                />
                {site.charAt(0).toUpperCase() + site.slice(1)}
              </label>
            ))}
          </div>
        </form>
        
        {/* Search History */}
        {!hasSearched && searchHistory.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-300 mb-2 flex items-center">
              <Clock size={18} className="mr-2 text-gray-500" /> Recent Searches
            </h2>
            <div className="flex flex-wrap gap-2">
              {searchHistory.map((historyQuery, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setQuery(historyQuery);
                    handleSearch({ preventDefault: () => {} });
                  }}
                  className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20 hover:bg-white/20 transition text-sm text-gray-300"
                >
                  {historyQuery}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results Display */}
        {loading && (
          <div className="text-center text-gray-400 my-8">
            <Loader size={48} className="animate-spin mx-auto mb-4 text-cyan-400" />
            <p>Searching for games...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 text-red-300 p-4 rounded-lg border border-red-500 text-center my-8">
            <p>{error}</p>
          </div>
        )}

        {!hasSearched && !loadingRecent && (
          <div className="my-8">
            <h2 className="text-lg font-semibold text-gray-300 mb-4">
              Recent Uploads
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recentUploads.length > 0 ? (
                recentUploads.map(post => renderResult(post))
              ) : (
                <p className="text-gray-400">No recent uploads found.</p>
              )}
            </div>
          </div>
        )}

        {hasSearched && !loading && results.length > 0 && (
          <div className="my-8">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-300">
                Search Results ({results.length})
              </h2>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-400">
                {Object.entries(stats).map(([source, count]) => (
                  <span key={source} className="bg-white/5 backdrop-blur-sm rounded-full px-3 py-1 text-xs">
                    {source}: {count} results
                  </span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6">
              {results.map(post => renderResult(post))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center mt-12 text-gray-400 text-sm">
        <p>Powered by Cloudflare Workers • Search across multiple game sources</p>
      </div>
    </div>
  );
};

export default GameSearchApp;
