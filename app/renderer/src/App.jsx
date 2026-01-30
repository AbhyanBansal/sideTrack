import React, { useState, useEffect, useRef } from 'react';
import pebbleLoveImg from './assets/pebble_love.jpg';
import {
    Settings,
    Mic2,
    SkipBack,
    Pause,
    SkipForward,
    X,
    Play,
    Library,
    FolderPlus,
    Music,
    ChevronLeft,
    Users,
    Disc,
    Folder
} from 'lucide-react';

const { ipcRenderer } = window.require('electron');

function App() {
    const [songs, setSongs] = useState([]);
    const [showLibrary, setShowLibrary] = useState(false);

    // Playback State
    const audioRef = useRef(null);
    const [currentSong, setCurrentSong] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [queue, setQueue] = useState([]); // List of songs in current context
    const [queueIndex, setQueueIndex] = useState(-1);

    // Easter Eggs
    const [showCryingEmoji, setShowCryingEmoji] = useState(false);
    const [showLoveScreen, setShowLoveScreen] = useState(false);

    // Navigation Stack
    const [viewStack, setViewStack] = useState([{ type: 'home' }]);

    // Data Loading Checks
    const [artists, setArtists] = useState([]);
    const [albums, setAlbums] = useState([]);
    const [folders, setFolders] = useState([]);
    const [activeAlbumIndex, setActiveAlbumIndex] = useState(0);

    const handleAlbumScroll = (e) => {
        const container = e.target;
        const center = container.scrollLeft + container.clientWidth / 2;
        const items = container.children;
        // Skip calling set if no items, strictly generic check
        if (!items || items.length === 0) return;

        // Simplified Logic: Assumes items are regular. 
        // We know padding is 100px. Item width is 56px (w-14) + gap 24px (gap-6) = 80px approx.
        // But getBoundingClientRect is safer.

        let closestIndex = 0;
        let minDist = Infinity;

        for (let i = 0; i < items.length - 1; i++) { // -1 to skip the padding element if exists, or check class
            const item = items[i];
            // Simple check to ensure it's an album button
            if (item.tagName !== 'BUTTON') continue;

            const rect = item.getBoundingClientRect();
            // container rect
            const containerRect = container.getBoundingClientRect();
            const itemCenter = rect.left + rect.width / 2 - containerRect.left; // relative to container
            const dist = Math.abs(itemCenter - container.clientWidth / 2);

            if (dist < minDist) {
                minDist = dist;
                closestIndex = i;
            }
        }
        if (closestIndex !== activeAlbumIndex) {
            setActiveAlbumIndex(closestIndex);
        }
    };

    useEffect(() => {
        loadSongs();
        ipcRenderer.on('scan-progress', (event, songTitle) => {
            console.log('Scanning:', songTitle);
        });
        return () => {
            ipcRenderer.removeAllListeners('scan-progress');
        };
    }, []);

    // Audio Event Handlers
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const onTimeUpdate = () => setCurrentTime(audio.currentTime);
        const onLoadedMetadata = () => setDuration(audio.duration);
        const onEnded = () => handleNext(); // Auto-play next

        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('loadedmetadata', onLoadedMetadata);
        audio.addEventListener('ended', onEnded);

        return () => {
            audio.removeEventListener('timeupdate', onTimeUpdate);
            audio.removeEventListener('loadedmetadata', onLoadedMetadata);
            audio.removeEventListener('ended', onEnded);
        };
    }, [queue, queueIndex]); // Re-attach if queue changes essentially

    const loadSongs = async () => {
        const loadedSongs = await ipcRenderer.invoke('get-songs');
        setSongs(loadedSongs || []);
    };

    const handleAddFolder = async () => {
        const updatedSongs = await ipcRenderer.invoke('scan-folder');
        if (updatedSongs) {
            setSongs(updatedSongs);
        }
    };

    // --- Playback Logic ---

    // Easter Egg Logic: trigger on currentSong change
    useEffect(() => {
        if (!currentSong) {
            setShowCryingEmoji(false);
            setShowLoveScreen(false);
            return;
        };

        const normalizeString = (str) => {
            if (!str) return '';
            return str.toLowerCase().replace(/[.\-_,()[\]]/g, ' ').replace(/\s+/g, ' ').trim();
        };

        const normalizedTitle = normalizeString(currentSong.title);
        const normalizedArtist = normalizeString(currentSong.artist);

        // Check for "Beete Lamhein" by KK
        const isBeeteLamhein = normalizedTitle.includes('beete lamhe') ||
            normalizedTitle.includes('beete lamhein') ||
            normalizedTitle.includes('beetey lamhe') ||
            normalizedTitle.includes('beetey lamhein');

        const isKK = normalizedArtist.includes('k k') ||
            normalizedArtist.includes('kk') ||
            normalizedArtist.includes('kay kay') ||
            normalizedArtist.includes('krishnakumar');

        if (isBeeteLamhein && isKK) {
            setShowCryingEmoji(true);
        } else {
            setShowCryingEmoji(false);
        }

        // Check for "Pehli Baar Mohabbat" by Mohit Chauhan
        const isPehliBaarMohabbat = normalizedTitle.includes('pehli baar mohabbat') || normalizedTitle.includes('pehli bar mohabbat');
        const isMohitChauhan = normalizedArtist.includes('mohit chauhan') || normalizedArtist.includes('mohit chohan');

        if (isPehliBaarMohabbat && isMohitChauhan) {
            setShowLoveScreen(true);
        } else {
            setShowLoveScreen(false);
        }

    }, [currentSong]);

    const playSong = (song, contextList = null) => {
        if (contextList) {
            setQueue(contextList);
            const index = contextList.findIndex(s => s.id === song.id);
            setQueueIndex(index);
        }

        // If clicking the same song, just toggle play
        if (currentSong && currentSong.id === song.id) {
            togglePlay();
            return;
        }

        setCurrentSong(song);
        setIsPlaying(true);
        setShowLibrary(false);
        if (audioRef.current) {
            audioRef.current.src = `file://${song.path}`;
            audioRef.current.play().catch(e => console.error("Playback error:", e));
        }
    };

    const togglePlay = () => {
        if (!currentSong) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleNext = () => {
        if (queue.length === 0 || queueIndex === -1) return;
        const nextIndex = (queueIndex + 1) % queue.length; // Loop or stop? Let's loop for now
        if (nextIndex === 0 && queueIndex === queue.length - 1) {
            // Optional: Stop at end of queue
            // setIsPlaying(false); return; 
        }
        setQueueIndex(nextIndex);
        const nextSong = queue[nextIndex];
        setCurrentSong(nextSong);
        setIsPlaying(true);
        if (audioRef.current) {
            audioRef.current.src = `file://${nextSong.path}`;
            audioRef.current.play();
        }
    };

    const handlePrev = () => {
        if (queue.length === 0 || queueIndex === -1) return;

        // If > 3 seconds in, restart song
        if (audioRef.current && audioRef.current.currentTime > 3) {
            audioRef.current.currentTime = 0;
            return;
        }

        const prevIndex = (queueIndex - 1 + queue.length) % queue.length;
        setQueueIndex(prevIndex);
        const prevSong = queue[prevIndex];
        setCurrentSong(prevSong);
        setIsPlaying(true);
        if (audioRef.current) {
            audioRef.current.src = `file://${prevSong.path}`;
            audioRef.current.play();
        }
    };

    const handleSeek = (e) => {
        if (!audioRef.current || !duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(1, x / rect.width));
        audioRef.current.currentTime = percent * duration;
    };


    // --- Navigation Logic ---

    const navigateTo = async (viewType, data = null) => {
        if (viewType === 'artists') {
            const res = await ipcRenderer.invoke('get-artists');
            setArtists(res);
        } else if (viewType === 'albums') {
            const res = await ipcRenderer.invoke('get-albums');
            setAlbums(res);
        } else if (viewType === 'folders') {
            const res = await ipcRenderer.invoke('get-folders');
            setFolders(res);
        } else if (viewType === 'songs') {
            let res = [];
            if (data.filter === 'artist') {
                res = await ipcRenderer.invoke('get-songs-by-artist', data.value);
            } else if (data.filter === 'album') {
                res = await ipcRenderer.invoke('get-songs-by-album', data.value);
            } else if (data.filter === 'folder') {
                res = await ipcRenderer.invoke('get-songs-by-folder', data.value);
            } else { // All songs
                res = await ipcRenderer.invoke('get-songs');
            }
            setSongs(res);
        }
        setViewStack([...viewStack, { type: viewType, data }]);
    };

    const navigateBack = () => {
        if (viewStack.length > 1) {
            setViewStack(viewStack.slice(0, -1));
        }
    };

    const getCurrentView = () => viewStack[viewStack.length - 1];

    // --- Sub-Components ---

    const renderLibraryContent = () => {
        const current = getCurrentView();

        if (current.type === 'home') {
            return (
                <div className="grid grid-cols-2 gap-1.5 p-1.5">
                    {/* All Songs */}
                    <button
                        onClick={() => navigateTo('songs', { filter: 'all', value: null })}
                        className="flex items-center gap-2 px-2 py-1.5 bg-neutral-900/50 rounded border border-neutral-800 cursor-pointer"
                    >
                        <Music size={16} className="text-neutral-400" strokeWidth={1.5} />
                        <span className="text-neutral-300 text-[9px] font-medium tracking-wide">ALL</span>
                    </button>

                    {/* Folders */}
                    <button
                        onClick={() => navigateTo('folders')}
                        className="flex items-center gap-2 px-2 py-1.5 bg-neutral-900/50 rounded border border-neutral-800 cursor-pointer"
                    >
                        <Folder size={16} className="text-neutral-400" strokeWidth={1.5} />
                        <span className="text-neutral-300 text-[9px] font-medium tracking-wide">FOLDERS</span>
                    </button>

                    {/* Artists */}
                    <button
                        onClick={() => navigateTo('artists')}
                        className="flex items-center gap-2 px-2 py-1.5 bg-neutral-900/50 rounded border border-neutral-800 cursor-pointer"
                    >
                        <Users size={16} className="text-neutral-400" strokeWidth={1.5} />
                        <span className="text-neutral-300 text-[9px] font-medium tracking-wide">ARTISTS</span>
                    </button>

                    {/* Albums */}
                    <button
                        onClick={() => navigateTo('albums')}
                        className="flex items-center gap-2 px-2 py-1.5 bg-neutral-900/50 rounded border border-neutral-800 cursor-pointer"
                    >
                        <Disc size={16} className="text-neutral-400" strokeWidth={1.5} />
                        <span className="text-neutral-300 text-[9px] font-medium tracking-wide">ALBUMS</span>
                    </button>
                </div>
            );
        }

        if (current.type === 'artists') {
            return (
                <div className="flex flex-col gap-0.5 p-1">
                    {artists.map((artist, i) => (
                        <button key={i} onClick={() => navigateTo('songs', { filter: 'artist', value: artist.artist })} className="flex items-center justify-between p-2 hover:bg-white/5 rounded group text-left">
                            <span className="text-white text-xs truncate max-w-[180px]">{artist.artist || 'Unknown'}</span>
                            <span className="text-[9px] text-neutral-600">{artist.count}</span>
                        </button>
                    ))}
                </div>
            );
        }

        if (current.type === 'albums') {
            return (
                <div
                    className="flex items-center overflow-x-auto snap-x snap-mandatory h-full px-[100px] gap-6 scrollbar-hide mask-linear-fade w-full"
                    onScroll={handleAlbumScroll}
                >
                    {albums.map((album, i) => (
                        <button
                            key={i}
                            onClick={() => navigateTo('songs', { filter: 'album', value: album.album })}
                            className="flex flex-col gap-1 group text-left items-center justify-center shrink-0 snap-center transition-opacity duration-300"
                        >
                            {/* Vinyl Record */}
                            <div className={`w-14 h-14 rounded-full bg-[#111] overflow-hidden shadow-[0_0_15px_rgba(0,0,0,0.8)] border border-neutral-800 relative flex items-center justify-center ${i === activeAlbumIndex ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
                                {/* Grooves Texture */}
                                <div className="absolute inset-0 rounded-full opacity-20" style={{ background: 'repeating-radial-gradient(#222 0, #111 2px, #222 3px)' }}></div>
                                {/* Gloss Overlay */}
                                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none z-10"></div>

                                {/* Label (Album Art) */}
                                <div className="w-7 h-7 rounded-full overflow-hidden border border-neutral-800 relative z-0">
                                    {album.artwork ? (
                                        <img src={`data:image/jpeg;base64,${Buffer.from(album.artwork).toString('base64')}`} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-neutral-500 bg-[#222]">
                                            <div className="w-full h-full bg-[#e0e0e0] flex items-center justify-center">
                                                <span className="text-[5px] text-black font-bold -rotate-45">SIDE A</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Center Spindle Hole */}
                                <div className="absolute w-1 h-1 bg-[#0a0a0a] rounded-full z-20 shadow-[inset_0_1px_2px_rgba(0,0,0,1)]"></div>
                            </div>

                            <span className={`text-white text-[9px] font-bold tracking-widest uppercase truncate max-w-[90px] text-center transition-opacity ${i === activeAlbumIndex ? 'opacity-100' : 'opacity-50'}`}>{album.album || 'Unknown'}</span>
                        </button>
                    ))}
                    {/* Padding element to ensure last item can be centered if needed, or just rely on px */}
                </div>
            );
        }

        if (current.type === 'folders') {
            return (
                <div className="flex flex-col gap-0.5 p-1">
                    {folders.map((folder, i) => (
                        <button key={i} onClick={() => navigateTo('songs', { filter: 'folder', value: folder })} className="flex items-center gap-2 p-2 hover:bg-white/5 rounded group text-left">
                            <Folder size={12} className="text-neutral-600 group-hover:text-[#ff4d00]" />
                            <span className="text-white text-[10px] truncate direction-rtl w-full">{folder}</span>
                        </button>
                    ))}
                </div>
            );
        }

        if (current.type === 'songs') {
            return (
                <div className="flex flex-col gap-0.5 p-1">
                    {songs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 text-neutral-600 gap-2">
                            <Music size={24} />
                            <span className="text-[10px]">No songs found</span>
                        </div>
                    ) : songs.map((song) => {
                        const isCurrent = currentSong && currentSong.id === song.id;
                        return (
                            <div
                                key={song.id}
                                onClick={() => playSong(song, songs)}
                                className={`group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${isCurrent ? 'bg-white/10' : 'hover:bg-white/5'}`}
                            >
                                <div className="w-6 h-6 rounded bg-neutral-800 flex-shrink-0 overflow-hidden relative">
                                    {song.artwork ? (
                                        <img src={`data:image/jpeg;base64,${Buffer.from(song.artwork).toString('base64')}`} className={`w-full h-full object-cover ${isCurrent && isPlaying ? 'opacity-50' : ''}`} alt="Art" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-neutral-600">
                                            <Music size={12} />
                                        </div>
                                    )}
                                    {isCurrent && isPlaying && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-1.5 h-1.5 bg-[#ff4d00] rounded-full animate-pulse"></div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className={`text-[10px] truncate font-medium leading-none mb-0.5 ${isCurrent ? 'text-[#ff4d00]' : 'text-white'}`}>{song.title}</span>
                                    <span className="text-[8px] text-neutral-500 truncate leading-none">{song.artist}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
        }
    };

    return (
        <div className="w-screen h-screen flex items-center justify-center bg-transparent overflow-hidden">
            <audio ref={audioRef} className="hidden" />

            {/* Easter Egg: Crying Emoji for "Beete Lamhein" by KK */}
            {showCryingEmoji && (
                <div className="absolute top-16 right-10 z-[100] animate-bounce">
                    <div className="relative text-5xl select-none">
                        {/* Retro Pixelated Crying Face */}
                        <div className="relative w-12 h-12 flex items-center justify-center">
                            {/* Main emoji - using simple text emoji with retro styling */}
                            <div className="text-4xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" style={{
                                imageRendering: 'pixelated',
                                fontFamily: 'monospace'
                            }}>
                                😢
                            </div>
                            {/* Animated tears */}
                            <div className="absolute -bottom-1 left-2 w-1 h-3 bg-blue-400 rounded-full opacity-70 animate-[tear_2s_ease-in-out_infinite]"
                                style={{ animationDelay: '0s' }}>
                            </div>
                            <div className="absolute -bottom-2 right-2 w-1 h-4 bg-blue-400 rounded-full opacity-70 animate-[tear_2s_ease-in-out_infinite]"
                                style={{ animationDelay: '0.5s' }}>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Container - The Cassette */}
            <div className="relative w-[340px] h-[240px] bg-[#1a1a1a] rounded-xl shadow-2xl overflow-hidden border border-white/10 draggable group select-none">



                {/* Background Texture */}
                <div className="absolute inset-0 bg-neutral-900 z-0">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
                </div>

                {/* Glossy Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none z-10"></div>

                {/* Close Button */}
                <button
                    onClick={() => window.close()}
                    className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/10 text-white/30 hover:text-white transition-colors z-50 non-draggable cursor-pointer"
                >
                    <X size={14} />
                </button>

                {/* Main Screen Area (Tape Window / Library) */}
                <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[280px] h-[110px] bg-[#0a0a0a] rounded-lg border border-white/5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] overflow-hidden z-20 non-draggable relative">

                    {/* Easter Egg: Love Screen Overlay */}
                    {showLoveScreen && (
                        <div className="absolute inset-0 z-[50] bg-[#e6e6e6] animate-fade-in pointer-events-none overflow-hidden shadow-[inset_0_2px_10px_rgba(0,0,0,0.1)] rounded-lg">

                            {/* Metallic Texture Overlay */}
                            <div className="absolute inset-0 z-0 opacity-40 bg-[linear-gradient(45deg,#d4d4d8_25%,#e4e4e7_25%,#e4e4e7_50%,#d4d4d8_50%,#d4d4d8_75%,#e4e4e7_75%,#e4e4e7_100%)] bg-[length:4px_4px]"></div>

                            {/* Decorative Screws */}
                            <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-neutral-300 border border-neutral-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_1px_1px_rgba(0,0,0,0.2)] flex items-center justify-center"><div className="w-full h-[0.5px] bg-neutral-400 rotate-45"></div></div>
                            <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-neutral-300 border border-neutral-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_1px_1px_rgba(0,0,0,0.2)] flex items-center justify-center"><div className="w-full h-[0.5px] bg-neutral-400 rotate-12"></div></div>
                            <div className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-neutral-300 border border-neutral-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_1px_1px_rgba(0,0,0,0.2)] flex items-center justify-center"><div className="w-full h-[0.5px] bg-neutral-400 -rotate-12"></div></div>
                            <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-neutral-300 border border-neutral-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_1px_1px_rgba(0,0,0,0.2)] flex items-center justify-center"><div className="w-full h-[0.5px] bg-neutral-400 rotate-90"></div></div>

                            {/* 1. Engraved Text (Left Side, unobstructed) */}
                            <div className="absolute top-7 left-4 z-10 select-none pointer-events-none max-w-[140px]">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black tracking-[0.2em] text-neutral-400 uppercase font-sans mb-2 drop-shadow-[0_1px_0_rgba(255,255,255,0.95)] opacity-80">
                                        WITH ALL MY LOVE
                                    </span>

                                    <div className="flex flex-col leading-none border-l-2 border-neutral-300/50 pl-0">
                                        <span className="text-[6px] font-bold text-neutral-500 tracking-widest drop-shadow-[0_1px_0_rgba(255,255,255,0.9)] opacity-80 mb-1">
                                            DEDICATED TO
                                        </span>
                                        <span className="text-[14px] font-serif italic tracking-wide text-[#333] drop-shadow-[0_1px_0_rgba(255,255,255,1)] font-bold whitespace-nowrap">
                                            my baby bee♡
                                        </span>
                                    </div>
                                </div>
                            </div>


                            {/* 2. Start/Stop Button (Bottom Left - Smaller) */}
                            <div className="absolute bottom-2 left-2 w-8 h-6 bg-gradient-to-b from-[#e0e0e0] to-[#c0c0c0] rounded-[2px] shadow-[0_2px_4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.8)] flex items-center justify-center border border-white/50 z-20 group">
                                <div
                                    className={`w-[85%] h-[75%] border border-neutral-400/50 rounded-[1px] transition-all duration-100
        ${isPlaying
                                            ? 'bg-gradient-to-b from-[#e8f2ec] to-[#d6ebe0] shadow-[inset_0_2px_3px_rgba(0,0,0,0.12)] translate-y-[1px]'   // subtle green
                                            : 'bg-gradient-to-b from-[#f4eaea] to-[#ead8d8] shadow-[0_1px_2px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]' // subtle red
                                        }`}
                                />
                            </div>



                            {/* 3. Turntable Assembly (Right Side) */}
                            <div className="absolute top-1/2 -translate-y-1/2 right-[60px] z-10 w-[90px] h-[90px] flex items-center justify-center">

                                {/* Strobe Light Visual (Left of Platter) */}
                                <div className="absolute left-[-12px] top-[75%] -translate-y-1/2 w-3.5 h-[22px] bg-gradient-to-r from-[#222] to-black rounded-l-sm rounded-r-md border-l border-white/10 shadow-lg flex items-center justify-center z-20 transform -rotate-[8deg] translate-y-3">
                                    <div className="w-1 h-1 bg-red-500 rounded-full shadow-[0_0_6px_rgba(239,68,68,1)] animate-pulse"></div>
                                </div>

                                {/* Platter Base */}
                                <div className="absolute w-[84px] h-[84px] rounded-full bg-[#18181b] shadow-[0_6px_16px_rgba(0,0,0,0.3)] flex items-center justify-center ring-1 ring-black/30">
                                    {/* Platter Dots (Strobe) */}
                                    <div className={`absolute inset-0.5 rounded-full border-[3px] border-dashed border-neutral-400/20 opacity-90 ${isPlaying ? 'animate-[spin_3s_linear_infinite]' : ''}`}></div>

                                    {/* Vinyl Record */}
                                    <div className={`w-[76px] h-[76px] rounded-full bg-[#111] relative flex items-center justify-center shadow-[0_0_10px_rgba(0,0,0,0.6)] ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''} transition-transform duration-700 ease-out`}>
                                        {/* Grooves */}
                                        <div className="absolute inset-0 rounded-full opacity-50" style={{ background: 'repeating-radial-gradient(#1a1a1a 0, #0a0a0a 1.5px, #1a1a1a 3px)' }}></div>
                                        {/* Gloss */}
                                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/15 via-transparent to-transparent pointer-events-none z-10"></div>

                                        {/* Label */}
                                        <div className="w-[30px] h-[30px] bg-[#f0f0f0] rounded-full flex items-center justify-center overflow-hidden relative z-20 shadow-[inset_0_0_2px_rgba(0,0,0,0.2)]">
                                            <img src={pebbleLoveImg} className="w-full h-full object-cover opacity-95" alt="Label" />
                                            <div className="absolute w-1 h-1 bg-white rounded-full shadow-sm"></div>
                                        </div>

                                        {/* Spindle */}
                                        <div className="absolute w-1.5 h-1.5 bg-neutral-300 rounded-full border border-neutral-500 shadow-[0_1px_1px_rgba(0,0,0,0.8)] z-30 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                            <div className="absolute top-[20%] left-[20%] w-[30%] h-[30%] bg-white rounded-full opacity-90"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 4. Tonearm (Top Right Pivot) */}
                            <div className="absolute top-4 right-4 z-30 w-[90px] h-[70px] pointer-events-none">
                                {/* Pivot Assembly */}
                                <div className="absolute top-1 right-1 w-9 h-9 rounded-full bg-gradient-to-tr from-neutral-200 to-neutral-100 border border-neutral-300 shadow-[0_3px_6px_rgba(0,0,0,0.15)] flex items-center justify-center z-20">
                                    <div className="w-5 h-5 rounded-full border border-neutral-400 bg-neutral-300 shadow-inner"></div>
                                </div>

                                {/* The Arm Itself */}
                                <div
                                    className={`absolute top-[1.2rem] right-[1.2rem] w-[70px] h-[3px] origin-right transition-transform duration-1000 cubic-bezier(0.4, 0, 0.2, 1) z-10 ${isPlaying ? 'rotate-[25deg]' : 'rotate-[45deg]'}`}
                                >
                                    {/* Arm Tube */}
                                    <div className="w-full h-full bg-gradient-to-b from-neutral-300 to-neutral-400 rounded-l-full shadow-md border-t border-white/50"></div>

                                    {/* Headshell (End of arm) */}
                                    <div className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-3.5 h-5 bg-[#1a1a1a] rounded-[1px] transform -rotate-[15deg] shadow-sm flex flex-col items-center">
                                        {/* Cartridge */}
                                        <div className="w-2 h-3 bg-neutral-800 mt-[2px] border-t border-white/20"></div>
                                        {/* Finger lift */}
                                        <div className="absolute bottom-[-3px] right-[-2px] w-0.5 h-3 bg-neutral-400 rounded-full -rotate-12 origin-top"></div>
                                    </div>
                                </div>
                            </div>

                            {/* 5. Pitch Slider (Bottom Right) */}
                            <div className="absolute bottom-5 right-5 w-1.5 h-10 bg-[#1a1a1a] rounded-[1px] border border-neutral-600 shadow-inner z-10 overflow-visible">
                                <div className="absolute top-[-4px] -left-1 w-full text-[3px] text-neutral-500 text-center font-mono tracking-widest">PITCH</div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-1 bg-neutral-300 rounded-[0.5px] shadow-sm border border-neutral-500 cursor-pointer hover:bg-white"></div>
                            </div>

                        </div>
                    )}

                    {showLibrary ? (
                        // Library View
                        <div className="w-full h-full flex flex-col">
                            {/* Header */}
                            <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 bg-[#111]">
                                <div className="flex items-center gap-2">
                                    {viewStack.length > 1 && (
                                        <button onClick={navigateBack} className="text-neutral-400 hover:text-white">
                                            <ChevronLeft size={14} />
                                        </button>
                                    )}
                                    <span className="text-[10px] text-neutral-400 font-bold tracking-wider uppercase">
                                        {getCurrentView().type === 'home' ? 'Library' :
                                            getCurrentView().type === 'songs' ? (getCurrentView().data?.value || 'Songs') :
                                                getCurrentView().type}
                                    </span>
                                </div>
                                {getCurrentView().type === 'home' && (
                                    <button
                                        onClick={handleAddFolder}
                                        className="text-neutral-400 hover:text-[#ff4d00] transition-colors"
                                        title="Add Folder"
                                    >
                                        <FolderPlus size={14} />
                                    </button>
                                )}
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {renderLibraryContent()}
                            </div>
                        </div>
                    ) : (
                        // Cassette Reels View - Enhanced Design
                        <div className="w-full h-full flex items-center justify-center relative">

                            {/* Tape Window */}
                            <div className="w-[85%] h-[60%] bg-[#0a0a0a] rounded border border-white/5 relative flex items-center justify-center gap-6 sm:gap-8 shadow-inner">

                                {/* Left Reel */}
                                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border-[6px] border-[#222] bg-[#111] flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.8)]">
                                    <div className="absolute inset-0 rounded-full border border-white/10"></div>
                                    {/* Tape Spool */}
                                    <div className={`w-full h-full rounded-full border-[8px] border-white/90 flex items-center justify-center relative ${isPlaying ? 'reel-spin-slow' : ''}`}>
                                        <div className="w-2 h-full bg-[#ff4d00]/20 absolute rotate-45"></div>
                                        <div className="w-2 h-full bg-[#ff4d00]/20 absolute -rotate-45"></div>
                                        <div className="w-3 h-3 bg-black rounded-full z-10"></div>
                                        {/* Teeth */}
                                        <div className="absolute w-full h-full flex items-center justify-center">
                                            <Settings className={`w-8 h-8 text-[#ff4d00] ${isPlaying ? 'animate-[spin_4s_linear_reverse_infinite]' : ''}`} />
                                        </div>
                                    </div>
                                </div>

                                {/* Connection Tape */}
                                <div className="absolute top-[45%] h-12 w-24 bg-transparent border-t border-b border-white/5 opacity-30 skew-x-12"></div>

                                {/* Right Reel */}
                                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border-[6px] border-[#222] bg-[#111] flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.8)]">
                                    <div className="absolute inset-0 rounded-full border border-white/10"></div>
                                    <div className={`w-full h-full rounded-full border-[4px] border-white/30 flex items-center justify-center relative ${isPlaying ? 'reel-spin-slow' : ''}`}>
                                        <div className="w-3 h-3 bg-black rounded-full z-10"></div>
                                        <div className="absolute w-full h-full flex items-center justify-center">
                                            <Settings className={`w-8 h-8 text-[#ff4d00] ${isPlaying ? 'animate-[spin_4s_linear_reverse_infinite]' : ''}`} />
                                        </div>
                                    </div>
                                </div>

                                {/* Tape Level (Visual only) */}
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5">
                                    <div className="w-1 h-3 bg-red-500 rounded-full"></div>
                                    <div className="w-1 h-2 bg-red-500/50 rounded-full"></div>
                                    <div className="w-1 h-4 bg-red-500 rounded-full"></div>
                                    <div className="w-1 h-3 bg-red-500/50 rounded-full"></div>
                                </div>

                            </div>

                            {/* Tape Label area */}
                            <div className="absolute bottom-3 w-full px-6 flex justify-between items-end">
                                <div className="text-[8px] font-bold text-neutral-500 tracking-widest">AB</div>
                                <div className="text-[8px] font-bold text-neutral-500 tracking-widest">VOL 01</div>
                            </div>

                        </div>
                    )}

                </div>

                {/* Info & Controls Bottom Area */}
                <div className="absolute bottom-0 w-full h-[85px] bg-gradient-to-t from-[#111] via-[#151515] to-transparent flex flex-col justify-end pb-0 z-30">

                    <div className="flex items-end justify-between px-6 pb-5">
                        {/* Song Info */}
                        <div className="flex flex-col max-w-[140px]">
                            <span className="text-[10px] text-neutral-500 font-medium flex items-center gap-1.5 uppercase tracking-wider mb-0.5 truncate">
                                <Mic2 size={10} /> {currentSong ? currentSong.artist : 'Select Song'}
                            </span>
                            <span className="text-white font-bold text-base leading-tight tracking-tight drop-shadow-md truncate">
                                {currentSong ? currentSong.title : 'Born For Music'}
                            </span>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-4 non-draggable">
                            <button
                                onClick={() => setShowLibrary(!showLibrary)}
                                className={`text-neutral-500 hover:text-white transition-colors transform active:scale-95 ${showLibrary ? 'text-[#ff4d00]' : ''}`}
                                title="Library"
                            >
                                <Library size={16} />
                            </button>

                            <button
                                onClick={handlePrev}
                                className="text-neutral-500 hover:text-white transition-colors transform active:scale-95"
                            >
                                <SkipBack size={18} fill="currentColor" />
                            </button>
                            <button
                                onClick={togglePlay}
                                disabled={!currentSong}
                                className={`text-[#ff4d00] hover:text-[#ff763b] transition-all hover:scale-110 active:scale-95 bg-white/5 rounded-full p-1 border border-white/5 shadow-lg ${!currentSong ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                            </button>
                            <button
                                onClick={handleNext}
                                className="text-neutral-500 hover:text-white transition-colors transform active:scale-95"
                            >
                                <SkipForward size={18} fill="currentColor" />
                            </button>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div
                        className="w-full h-[3px] bg-white/5 relative non-draggable group/seek cursor-pointer"
                        onClick={handleSeek}
                    >
                        <div
                            className="h-full bg-gradient-to-r from-[#ff4d00] to-orange-500 relative shadow-[0_0_10px_rgba(255,77,0,0.5)] transition-all duration-100 ease-linear"
                            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                        >
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full opacity-0 group-hover/seek:opacity-100 shadow-[0_0_4px_rgba(0,0,0,0.5)] transition-opacity"></div>
                        </div>
                    </div>
                </div>

                {/* Decorative Label Marks */}
                <div className="absolute bottom-[90px] w-full px-8 flex justify-between text-[8px] font-bold text-neutral-600/50 select-none pointer-events-none z-10">
                    <span>A SIDE</span>
                    <span>NR [ON]</span>
                </div>

            </div>
        </div>
    );
}

export default App;
