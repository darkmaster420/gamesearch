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
  const [siteFilter, setSiteFilter] = useState('both');
  const [stats, setStats] = useState({});
  const [searchHistory, setSearchHistory] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [failedImages, setFailedImages] = useState(new Set());
  const [loadingImages, setLoadingImages] = useState(new Set());
  
  // Pagination state - separate for search and recent uploads
  const [searchPage, setSearchPage] = useState(1);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [recentPage, setRecentPage] = useState(1);
  const [recentHasMore, setRecentHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const searchInputRef = useRef(null);

  // Load search history from localStorage on component mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('gameSearchHistory');
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);
        setSearchHistory(Array.isArray(parsedHistory) ? parsedHistory : []);
      }
    } catch (error) {
      console.error('Error loading search history:', error);
      setSearchHistory([]);
    }
  }, []);

  // Load recent uploads on component mount
  useEffect(() => {
    fetchRecentUploads(1, false);
  }, []);

  // Save search to history
  const saveToHistory = (searchTerm) => {
    const newHistory = [searchTerm, ...searchHistory.filter(h => h !== searchTerm)].slice(0, 10);
    setSearchHistory(newHistory);
    
    // Save to localStorage
    try {
      localStorage.setItem('gameSearchHistory', JSON.stringify(newHistory));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  };

  // Updated fetchRecentUploads with pagination support
  const fetchRecentUploads = async (page = 1, append = false) => {
    if (page === 1) {
      setLoadingRecent(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });
      
      const response = await fetch(`${WORKER_URL}/recent?${params}`);
      const data = await response.json();
      
      if (data.success) {
        if (append && page > 1) {
          setRecentUploads(prev => [...prev, ...(data.results || [])]);
        } else {
          setRecentUploads(data.results || []);
        }
        
        setRecentPage(page);
        setRecentHasMore(data.pagination?.hasMore || false);
      } else {
        console.error('Failed to fetch recent uploads:', data.error);
      }
    } catch (err) {
      console.error('Recent uploads error:', err);
    } finally {
      setLoadingRecent(false);
      setLoadingMore(false);
    }
  };

  // Updated searchGames with proper pagination handling
  const searchGames = async (searchQuery = query, page = 1, append = false) => {
    if (!searchQuery.trim()) return;

    if (page === 1) {
      setLoading(true);
      setHasSearched(true);
    } else {
      setLoadingMore(true);
    }
    
    setError('');
    
    try {
      const params = new URLSearchParams({
        search: searchQuery.trim(),
        site: siteFilter,
        page: page.toString(),
        limit: '10'
      });
      
      const response = await fetch(`${WORKER_URL}?${params}`);
      const data = await response.json();
      
      if (data.success) {
        if (append && page > 1) {
          // Append new results to existing ones
          setResults(prev => [...prev, ...(data.results || [])]);
        } else {
          // Replace results (first page)
          setResults(data.results || []);
        }
        
        setStats(data.siteStats || {});
        setSearchPage(page);
        setSearchHasMore(data.pagination?.hasMore || false);
        
        if (page === 1) {
          saveToHistory(searchQuery.trim());
        }
      } else {
        setError(data.error || 'Search failed');
      }
    } catch (err) {
      setError('Failed to connect to search API');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    setSearchPage(1);
    setSearchHasMore(false);
    searchGames();
  };

  const handleHistoryClick = (historyItem) => {
    setQuery(historyItem);
    setSearchPage(1);
    setSearchHasMore(false);
    searchGames(historyItem);
  };

  // Updated clearSearch to reset pagination properly
  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setStats({});
    setError('');
    setHasSearched(false);
    setSearchPage(1);
    setSearchHasMore(false);
    
    // Reload recent uploads when clearing search
    fetchRecentUploads(1, false);
  };

  // Updated loadMore function to handle both search and recent uploads
  const loadMore = () => {
    if (!loadingMore) {
      if (hasSearched && query.trim() && searchHasMore) {
        // Load more search results
        searchGames(query, searchPage + 1, true);
      } else if (!hasSearched && recentHasMore) {
        // Load more recent uploads
        fetchRecentUploads(recentPage + 1, true);
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Improved CORS-safe image proxy function
  const getProxiedImageUrl = (originalUrl) => {
    if (!originalUrl || !originalUrl.startsWith('http')) {
      return null;
    }
    
    // Use your Cloudflare Worker as a proxy
    return `${WORKER_URL}/proxy-image?url=${encodeURIComponent(originalUrl)}`;
  };

  // Improved image extraction with better fallback handling
  const extractGamePoster = (game) => {
    // Use the image field from backend first
    if (game.image && game.image.startsWith('http')) {
      const proxiedUrl = getProxiedImageUrl(game.image);
      if (proxiedUrl) {
        return { url: proxiedUrl, isProxied: true, originalUrl: game.image };
      }
    }
    
    // Fallback: Try to extract poster from description
    if (game.description) {
      const posterMatch = game.description.match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|gif|webp|bmp)/i);
      if (posterMatch) {
        const proxiedUrl = getProxiedImageUrl(posterMatch[0]);
        if (proxiedUrl) {
          return { url: proxiedUrl, isProxied: true, originalUrl: posterMatch[0] };
        }
      }
    }
    
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
    return { url: colors[colorIndex], isProxied: false, originalUrl: null };
  };

  const getServiceIcon = (service) => {
    if (!service) return '💾';
    const serviceLower = service.toLowerCase();
    if (serviceLower.includes('magnet') || serviceLower.includes('torrent')) {
      return '🧲';
    }
    if (serviceLower.includes('mega')) return '🟦';
    if (serviceLower.includes('mediafire')) return '🔥';
    if (serviceLower.includes('google')) return '🔗';
    return '💾';
  };

  const handleImageLoad = (gameId) => {
    setLoadingImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(gameId);
      return newSet;
    });
  };

  const handleImageError = (gameId, imageUrl, originalUrl) => {
    console.log(`Image failed to load for ${gameId}: ${imageUrl} (original: ${originalUrl})`);
    
    setFailedImages(prev => new Set([...prev, gameId]));
    setLoadingImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(gameId);
      return newSet;
    });
  };

  const handleImageLoadStart = (gameId) => {
    setLoadingImages(prev => new Set([...prev, gameId]));
  };

  const GameCard = ({ game }) => {
    const posterData = extractGamePoster(game);
    const { url: posterSrc, isProxied, originalUrl } = posterData;
    const isImagePoster = posterSrc && posterSrc.startsWith('http');
    const imageHasFailed = failedImages.has(game.id);
    const shouldShowImage = isImagePoster && !imageHasFailed;
    
    return (
      <div className="group">
        {/* Game Card Container */}
        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-3xl border border-gray-700/50 overflow-hidden hover:border-cyan-400/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-cyan-500/20 hover:from-gray-700/80 hover:to-gray-800/80">
          
          {/* Poster Section */}
          <div className="relative h-64 overflow-hidden">
            {shouldShowImage ? (
              <>
                <img 
                  src={posterSrc} 
                  alt={game.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  onError={() => handleImageError(game.id, posterSrc, originalUrl)}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
                {/* Loading placeholder while image loads */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center opacity-0 group-hover:opacity-10 transition-opacity">
                  <div className="text-4xl opacity-40">🎮</div>
                </div>
              </>
            ) : (
              /* Gradient Fallback - Always show for non-http URLs or failed images */
              <div className={`flex w-full h-full bg-gradient-to-br ${isImagePoster ? 'from-gray-700 to-gray-800' : posterSrc} items-center justify-center`}>
                <div className="text-6xl opacity-40">🎮</div>
              </div>
            )}
            
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

            {/* Status Badges for debugging - only show in development */}
            {process.env.NODE_ENV === 'development' && (
              <>
                {isProxied && shouldShowImage && !imageHasFailed && (
                  <div className="absolute bottom-4 right-4">
                    <span className="px-2 py-1 rounded text-xs bg-green-500/80 text-white">
                      PROXIED
                    </span>
                  </div>
                )}

                {imageHasFailed && isImagePoster && (
                  <div className="absolute bottom-4 left-4">
                    <span className="px-2 py-1 rounded text-xs bg-red-500/80 text-white" title={`Original: ${originalUrl}`}>
                      IMG FAILED
                    </span>
                  </div>
                )}
              </>
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Search for games..."
                className="w-full pl-12 pr-12 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {hasSearched && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-4 top-4 h-5 w-5 text-gray-400 hover:text-white transition-colors"
                >
                  <X />
                </button>
              )}
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
                type="submit"
                disabled={loading || !query.trim()}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-xl font-semibold transition-colors inline-flex items-center gap-2"
              >
                {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                {loading ? 'Searching...' : 'Search Games'}
              </button>
            </div>
          </form>

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

        {/* Stats (only show when there are search results) */}
        {hasSearched && Object.keys(stats).length > 0 && (
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

        {/* Recent Uploads Section - Show when no search has been made */}
        {!hasSearched && (
          <div className="max-w-7xl mx-auto">
            {/* Recent Uploads Header */}
            <div className="mb-8">
              <div className="bg-gradient-to-r from-purple-600/20 to-orange-600/20 backdrop-blur-md rounded-2xl border border-purple-500/30 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                      <Clock className="w-7 h-7 text-orange-400" />
                      Recent Uploads
                    </h2>
                    <p className="text-purple-200">Latest games uploaded across all sources</p>
                  </div>
                  <div className="text-right">
                    <button
                      onClick={() => fetchRecentUploads(1, false)}
                      disabled={loadingRecent}
                      className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-400/50 rounded-lg text-purple-300 hover:text-white transition-all duration-200 text-sm font-medium flex items-center gap-2"
                    >
                      {loadingRecent ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                      {loadingRecent ? 'Loading...' : 'Refresh'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Uploads Grid */}
            {loadingRecent ? (
              <div className="text-center py-12">
                <Loader className="w-12 h-12 mx-auto mb-4 animate-spin text-purple-400" />
                <p className="text-gray-400">Loading recent uploads...</p>
              </div>
            ) : recentUploads.length > 0 ? (
              <>
                <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
                  {recentUploads.map((game) => (
                    <GameCard key={game.id} game={game} />
                  ))}
                </div>

                {/* Load More Button for Recent Uploads */}
                {recentHasMore && (
                  <div className="text-center mt-8">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="px-8 py-3 bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-700 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 disabled:scale-100 inline-flex items-center gap-2 shadow-lg shadow-purple-500/25"
                    >
                      {loadingMore ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          Loading more...
                        </>
                      ) : (
                        <>
                          <Download className="w-5 h-5" />
                          Load More Recent Uploads
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Results Counter for Recent Uploads */}
                <div className="text-center text-gray-400 text-sm mt-4">
                  Showing {recentUploads.length} recent uploads
                  {recentHasMore && (
                    <span className="text-cyan-400"> • More available</span>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center text-gray-400 py-12">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No recent uploads available</p>
              </div>
            )}
          </div>
        )}

        {/* Search Results - Show when search has been made */}
        {hasSearched && results.length > 0 && (
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
              {results.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>

            {/* Load More Button for Search Results */}
            {searchHasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 disabled:scale-100 inline-flex items-center gap-2 shadow-lg shadow-blue-500/25"
                >
                  {loadingMore ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Loading more...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Load More Search Results
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Results Counter for Search */}
            <div className="text-center text-gray-400 text-sm mt-4">
              Showing {results.length} search results
              {searchHasMore && (
                <span className="text-cyan-400"> • More available</span>
              )}
            </div>
          </div>
        )}

        {/* Empty State for Search Results */}
        {hasSearched && results.length === 0 && !loading && !error && (
          <div className="text-center text-gray-400 py-12">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No games found for your search</p>
            <button
              onClick={clearSearch}
              className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg transition-colors"
            >
              View Recent Uploads
            </button>
          </div>
        )}

        {/* Empty State for Initial Load */}
        {!hasSearched && recentUploads.length === 0 && !loadingRecent && (
          <div className="text-center text-gray-400 py-12">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Search for games or check out recent uploads</p>
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
