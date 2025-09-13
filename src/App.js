import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, ExternalLink, Loader, Filter, X, Clock } from 'lucide-react';

const WORKER_URL = 'https://gameapi.a7a8524.workers.dev'; // Replace with your actual worker URL

const GameSearchApp = () => {
  const [query, setQuery] = useState('');
  const [refineQuery, setRefineQuery] = useState('');
  const [results, setResults] = useState([]);
  const [recentUploads, setRecentUploads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [error, setError] = useState('');
  const [siteFilter, setSiteFilter] = useState('all');
  const [stats, setStats] = useState({});
  const [searchHistory, setSearchHistory] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [failedImages, setFailedImages] = useState(new Set());
  const [decryptedLinks, setDecryptedLinks] = useState({}); // ✅ store decrypted crypt links

  const searchInputRef = useRef(null);

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

  useEffect(() => {
    fetchRecentUploads();
  }, []);
  
  useEffect(() => {
    let newTitle = 'GameSearch';
    if (hasSearched && query) {
      newTitle = `GameSearch: ${query} results`;
    } else if (hasSearched && results.length > 0) {
      newTitle = `GameSearch: Search Results`;
    } else if (!hasSearched && recentUploads.length > 0) {
      newTitle = `GameSearch: Recent Uploads`;
    }
    document.title = newTitle;
    
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎮</text></svg>';
    
    const existingLink = document.querySelector("link[rel~='icon']");
    if (existingLink) {
      existingLink.remove();
    }
    document.head.appendChild(link);
    
    return () => {
      document.title = 'GameSearch';
      link.remove();
    };
  }, [query, hasSearched, results.length, recentUploads.length]);

  const saveToHistory = (searchTerm) => {
    const newHistory = [searchTerm, ...searchHistory.filter(h => h !== searchTerm)].slice(0, 10);
    setSearchHistory(newHistory);
    try {
      localStorage.setItem('gameSearchHistory', JSON.stringify(newHistory));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  };

  const fetchRecentUploads = async () => {
    setLoadingRecent(true);
    setHasSearched(false);
    setResults([]);
    setError('');
    setQuery('');
    setStats({});
    setRefineQuery('');
    try {
      const response = await fetch(`${WORKER_URL}/recent`);
      const data = await response.json();
      if (data.success) {
        setRecentUploads(data.results || []);
      } else {
        console.error('Failed to fetch recent uploads:', data.error);
        setError(data.error || 'Failed to fetch recent uploads');
      }
    } catch (err) {
      console.error('Recent uploads error:', err);
      setError('Failed to connect to API');
    } finally {
      setLoadingRecent(false);
    }
  };

  const searchGames = async (searchQuery = query) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setHasSearched(true);
    setError('');
    setRecentUploads([]);

    try {
      const params = new URLSearchParams({
        search: searchQuery.trim(),
        site: siteFilter,
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

  const clearSearch = () => {
    setQuery('');
    setRefineQuery('');
    setResults([]);
    setStats({});
    setError('');
    setHasSearched(false);
    fetchRecentUploads();
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };

  const getProxiedImageUrl = (originalUrl) => {
    if (!originalUrl || !originalUrl.startsWith('http')) {
      return null;
    }
    return `${WORKER_URL}/proxy-image?url=${encodeURIComponent(originalUrl)}`;
  };

  const extractGamePoster = (game) => {
    if (game.image && game.image.startsWith('http')) {
      const proxiedUrl = getProxiedImageUrl(game.image);
      if (proxiedUrl) {
        return { url: proxiedUrl, isProxied: true, originalUrl: game.image };
      }
    }
    if (game.description) {
      const posterMatch = game.description.match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|gif|webp|bmp)/i);
      if (posterMatch) {
        const proxiedUrl = getProxiedImageUrl(posterMatch[0]);
        if (proxiedUrl) {
          return { url: proxiedUrl, isProxied: true, originalUrl: posterMatch[0] };
        }
      }
    }
    const colors = [
      'from-purple-600 to-blue-600', 'from-blue-600 to-cyan-600', 'from-cyan-600 to-teal-600',
      'from-teal-600 to-green-600', 'from-green-600 to-yellow-600', 'from-yellow-600 to-orange-600',
      'from-orange-600 to-red-600', 'from-red-600 to-pink-600', 'from-pink-600 to-purple-600'
    ];
    const colorIndex = game.title?.charCodeAt(0) % colors.length || 0;
    return { url: colors[colorIndex], isProxied: false, originalUrl: null };
  };

  const getServiceIcon = (service) => {
    if (!service) return '💾';
    const serviceLower = service.toLowerCase();
    if (serviceLower.includes('magnet') || serviceLower.includes('torrent')) return '🧲';
    if (serviceLower.includes('mega')) return '🟦';
    if (serviceLower.includes('mediafire')) return '🔥';
    if (serviceLower.includes('google')) return '🔗';
    return '💾';
  };

  const handleImageError = (gameId, imageUrl, originalUrl) => {
    console.log(`Image failed to load for ${gameId}: ${imageUrl} (original: ${originalUrl})`);
    setFailedImages(prev => new Set([...prev, gameId]));
  };

  // ✅ handle crypt link clicks & caching
  const handleCryptClick = async (e, cryptUrl) => {
    e.preventDefault();
    const hash = cryptUrl.split('#')[1];
    if (!hash) return;
    
    if (decryptedLinks[hash]) {
      window.open(decryptedLinks[hash].resolvedUrl, '_blank');
      return;
    }
    
    try {
      const resp = await fetch(`${WORKER_URL}/decrypt?hash=${encodeURIComponent(hash)}`);
      const data = await resp.json();
      
      if (data.success && data.resolvedUrl) {
        setDecryptedLinks(prev => ({ ...prev, [hash]: data }));
        window.open(data.resolvedUrl, '_blank');
      } else {
        alert(data.error || 'Failed to decrypt link');
      }
    } catch (err) {
      console.error('Decrypt error:', err);
      alert('Error decrypting link');
    }
  };

  const GameCard = ({ game }) => {
    const [showAllLinks, setShowAllLinks] = useState(false);

    const posterData = extractGamePoster(game);
    const { url: posterSrc, isProxied, originalUrl } = posterData;
    const isImagePoster = posterSrc && posterSrc.startsWith('http');
    const imageHasFailed = failedImages.has(game.id);
    const shouldShowImage = isImagePoster && !imageHasFailed;

    const linksToShow = showAllLinks
      ? game.downloadLinks
      : game.downloadLinks.slice(0, 10);

    return (
      <div className="group">
        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-3xl border border-gray-700/50 overflow-hidden hover:border-cyan-400/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-cyan-500/20 hover:from-gray-700/80 hover:to-gray-800/80">
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
                <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center opacity-0 group-hover:opacity-10 transition-opacity">
                  <div className="text-4xl opacity-40">🎮</div>
                </div>
              </>
            ) : (
              <div
                className={`flex w-full h-full bg-gradient-to-br ${
                  isImagePoster ? 'from-gray-700 to-gray-800' : posterSrc
                } items-center justify-center`}
              >
                <div className="text-6xl opacity-40">🎮</div>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>
            <div className="absolute top-4 right-4">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md ${
                  game.source === 'SkidrowReloaded'
                    ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/30'
                    : game.source === 'FreeGOGPCGames'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30'
                    : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30'
                }`}
              >
                {game.source}
              </span>
            </div>
            {game.downloadLinks && game.downloadLinks.length > 0 && (
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500 to-cyan-500 text-white backdrop-blur-md shadow-lg shadow-blue-500/30">
                  {game.downloadLinks.length} Links
                </span>
              </div>
            )}
          </div>
          <div className="p-6 space-y-4">
            <h3 className="font-bold text-xl text-white leading-tight group-hover:text-cyan-400 transition-colors">
              {game.title}
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed line-clamp-3">
              {game.description}
            </p>
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
                <ExternalLink className="w-3 h-3" /> Source
              </a>
            </div>
          </div>
          {game.downloadLinks && game.downloadLinks.length > 0 && (
            <div className="border-t border-gray-700/50 bg-gradient-to-r from-gray-800/50 to-gray-900/50">
              <div className="p-6 space-y-3">
                <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <Download className="w-4 h-4 text-cyan-400" /> Download Options
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {linksToShow.map((link, index) => {
                    const isCrypt = link.type === 'crypt';
                    const hash = isCrypt ? link.url.split('#')[1] : null;
                    const resolved = hash ? decryptedLinks[hash] : null;

                    return (
                      <a
                        key={index}
                        href={link.url}
                        onClick={isCrypt ? (e) => handleCryptClick(e, link.url) : undefined}
                        target={isCrypt ? undefined : "_blank"}
                        rel={isCrypt ? undefined : "noopener noreferrer"}
                        className="group/link flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-700/30 transition-colors"
                      >
                        <span className="text-lg flex-shrink-0">
                          {isCrypt
                            ? resolved
                              ? getServiceIcon(resolved.service)
                              : '🔒'
                            : getServiceIcon(link.service)}
                        </span>
                        <span className="truncate flex-1 font-medium">
                          {isCrypt
                            ? resolved
                              ? `${resolved.service} Link`
                              : 'Decrypt Link'
                            : link.text || link.service}
                        </span>
                        <ExternalLink className="w-4 h-4 opacity-0 group-hover/link:opacity-100 transition-opacity text-cyan-400" />
                      </a>
                    );
                  })}
                </div>
                {game.downloadLinks.length > 10 && (
                  <button
                    onClick={() => setShowAllLinks(!showAllLinks)}
                    className="w-full text-xs text-cyan-400 hover:text-cyan-300 text-center py-2 mt-2 bg-gray-700/30 rounded-lg border border-gray-600/30 transition"
                  >
                    {showAllLinks
                      ? 'Show less'
                      : `+${game.downloadLinks.length - 10} more download options`}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const filteredResults = React.useMemo(() => {
    let currentResults = results;

    if (siteFilter !== 'all') {
      const sourceMap = {
        skidrow: 'SkidrowReloaded',
        freegog: 'FreeGOGPCGames',
        gamedrive: 'GameDrive'
      };
      currentResults = currentResults.filter(game => game.source === sourceMap[siteFilter]);
    }

    if (refineQuery.trim()) {
      const lowerCaseRefineQuery = refineQuery.trim().toLowerCase();
      currentResults = currentResults.filter(game =>
        game.title?.toLowerCase().includes(lowerCaseRefineQuery) ||
        game.description?.toLowerCase().includes(lowerCaseRefineQuery) ||
        game.slug?.toLowerCase().includes(lowerCaseRefineQuery) ||
        game.excerpt?.toLowerCase().includes(lowerCaseRefineQuery)
      );
    }
    
    return currentResults;
  }, [results, siteFilter, refineQuery]);

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
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
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
              </div
