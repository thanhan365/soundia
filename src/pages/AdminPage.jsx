import React, { useState, useContext, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import api from '../utils/api';
import {
    HiCog, HiMusicNote, HiUpload, HiRefresh, HiCheck, HiX, HiPlay, HiPlusCircle,
    HiUsers, HiCollection, HiHeart, HiChartBar, HiTrash, HiClock, HiFolder
} from 'react-icons/hi';

// ── Tab: Dashboard ───────────────────────────────────────────────────────
function DashboardTab() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/admin/stats')
            .then(res => setStats(res.data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="text-center py-12 text-gray-400"><HiRefresh className="inline animate-spin mr-2" />Đang tải...</div>;
    if (!stats) return <div className="text-center py-12 text-red-400">Không tải được thống kê</div>;

    const cards = [
        { icon: HiUsers, label: 'Người dùng', value: stats.totalUsers, sub: `+${stats.newUsersThisWeek} tuần này`, color: 'from-blue-500 to-cyan-500' },
        { icon: HiCollection, label: 'Playlists', value: stats.totalPlaylists, color: 'from-purple-500 to-violet-500' },
        { icon: HiHeart, label: 'Yêu thích', value: stats.totalFavorites, color: 'from-pink-500 to-rose-500' },
        { icon: HiChartBar, label: 'Lượt nghe', value: stats.totalListened, sub: `+${stats.listensThisWeek} tuần này`, color: 'from-amber-500 to-orange-500' },
    ];

    return (
        <div className="space-y-5">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {cards.map((c, i) => (
                    <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/5 hover:border-white/10 transition-all">
                        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${c.color} flex items-center justify-center mb-3`}>
                            <c.icon className="text-white text-base" />
                        </div>
                        <p className="text-2xl font-bold text-white">{c.value.toLocaleString()}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{c.label}</p>
                        {c.sub && <p className="text-[10px] text-green-400 mt-1">{c.sub}</p>}
                    </div>
                ))}
            </div>

            {/* Top Songs */}
            {stats.topSongs?.length > 0 && (
                <div className="bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/5">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                            <HiChartBar className="text-amber-400" /> Top bài hát (7 ngày qua)
                        </h3>
                    </div>
                    {stats.topSongs.map((s, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-2 border-b border-white/[0.03] last:border-0">
                            <span className={`text-xs font-bold w-5 text-right ${i < 3 ? 'text-amber-400' : 'text-gray-500'}`}>{i + 1}</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate">{s.title || 'Unknown'}</p>
                                <p className="text-[11px] text-gray-400 truncate">{s.artist || ''}</p>
                            </div>
                            <span className="text-xs text-gray-500">{s.plays} lượt</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Sub: Upload MP3 Trực Tiếp ─────────────────────────────────────────────
function UploadMp3Section() {
    const { playSong } = usePlayer();
    const fileInputRef = useRef(null);
    const [file, setFile] = useState(null);
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [coverUrl, setCoverUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadMsg, setUploadMsg] = useState(null); // { type: 'success'|'error', text }
    const [uploadedSongs, setUploadedSongs] = useState([]);
    const [totalSongs, setTotalSongs] = useState(0);
    const [page, setPage] = useState(1);
    const [loadingSongs, setLoadingSongs] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    const fetchUploaded = useCallback(async (p = 1) => {
        setLoadingSongs(true);
        try {
            const res = await api.get(`/admin/uploaded-songs?page=${p}&pageSize=10`);
            setUploadedSongs(res.data.songs || []);
            setTotalSongs(res.data.total || 0);
        } catch { }
        finally { setLoadingSongs(false); }
    }, []);

    useEffect(() => { fetchUploaded(page); }, [fetchUploaded, page]);

    const handleFileChange = (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setFile(f);
        // Auto-fill tên bài từ tên file
        const nameParts = f.name.replace(/\.[^.]+$/, '').split(' - ');
        if (nameParts.length >= 2) {
            setArtist(nameParts[0].trim());
            setTitle(nameParts.slice(1).join(' - ').trim());
        } else {
            setTitle(nameParts[0].trim());
        }
        setUploadMsg(null);
    };

    const handleUpload = async () => {
        if (!file || !title.trim() || !artist.trim()) return;
        setUploading(true);
        setUploadProgress(0);
        setUploadMsg(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('title', title.trim());
            formData.append('artist', artist.trim());
            if (coverUrl.trim()) formData.append('coverUrl', coverUrl.trim());

            await api.post('/admin/upload-song', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (e) => {
                    const pct = Math.round((e.loaded * 100) / e.total);
                    setUploadProgress(pct);
                },
            });

            setUploadMsg({ type: 'success', text: `✅ Upload "${title}" thành công!` });
            setFile(null); setTitle(''); setArtist(''); setCoverUrl('');
            if (fileInputRef.current) fileInputRef.current.value = '';
            setPage(1);
            fetchUploaded(1);
        } catch (err) {
            setUploadMsg({ type: 'error', text: err.response?.data || err.message || 'Upload thất bại' });
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleDelete = async (id, songTitle) => {
        if (confirmDeleteId !== id) {
            setConfirmDeleteId(id);
            setTimeout(() => setConfirmDeleteId(prev => prev === id ? null : prev), 4000);
            return;
        }
        setConfirmDeleteId(null);
        setDeletingId(id);
        try {
            await api.delete(`/admin/songs/${id}`);
            fetchUploaded(page);
        } catch { }
        finally { setDeletingId(null); }
    };

    const formatSize = (bytes) => {
        if (!bytes) return '';
        if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
        return `${(bytes / 1024).toFixed(0)} KB`;
    };

    return (
        <div className="space-y-4">
            {/* Form upload */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/5 space-y-3">
                <p className="text-xs font-semibold text-neon flex items-center gap-1.5">
                    <HiMusicNote /> Upload file MP3 trực tiếp
                </p>

                {/* Chọn file */}
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-all
                        ${file ? 'border-neon/50 bg-neon/5' : 'border-white/10 hover:border-white/25 bg-black/20'}`}
                >
                    <input ref={fileInputRef} type="file" accept=".mp3,.m4a,.wav,.ogg" className="hidden" onChange={handleFileChange} />
                    {file ? (
                        <>
                            <HiMusicNote className="text-3xl text-neon" />
                            <p className="text-sm text-white font-medium">{file.name}</p>
                            <p className="text-xs text-gray-400">{formatSize(file.size)}</p>
                        </>
                    ) : (
                        <>
                            <HiFolder className="text-3xl text-gray-500" />
                            <p className="text-sm text-gray-400">Nhấn để chọn file nhạc</p>
                            <p className="text-xs text-gray-600">.mp3, .m4a, .wav, .ogg — tối đa 50MB</p>
                        </>
                    )}
                </div>

                {/* Thông tin bài */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                        <label className="text-[11px] text-gray-400 mb-1 block">Tên bài hát <span className="text-red-400">*</span></label>
                        <input
                            value={title} onChange={e => setTitle(e.target.value)}
                            placeholder="VD: Người ta"
                            className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon/40 transition-all"
                        />
                    </div>
                    <div>
                        <label className="text-[11px] text-gray-400 mb-1 block">Nghệ sĩ <span className="text-red-400">*</span></label>
                        <input
                            value={artist} onChange={e => setArtist(e.target.value)}
                            placeholder="VD: Bích Phương"
                            className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon/40 transition-all"
                        />
                    </div>
                </div>
                <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">URL ảnh bìa (tùy chọn)</label>
                    <input
                        value={coverUrl} onChange={e => setCoverUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon/40 transition-all"
                    />
                </div>

                {/* Progress bar */}
                {uploading && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-gray-400">
                            <span>Đang upload...</span><span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-neon to-purple-500 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                        </div>
                    </div>
                )}

                {/* Thông báo */}
                {uploadMsg && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${uploadMsg.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                        {uploadMsg.type === 'success' ? <HiCheck /> : <HiX />}
                        {uploadMsg.text}
                    </div>
                )}

                <button
                    onClick={handleUpload}
                    disabled={uploading || !file || !title.trim() || !artist.trim()}
                    className="w-full py-2.5 bg-gradient-to-r from-neon to-purple-600 text-white text-sm font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                    {uploading ? <><HiRefresh className="animate-spin" /> Đang upload...</> : <><HiUpload /> Upload lên server</>}
                </button>
            </div>

            {/* Danh sách bài đã upload */}
            <div className="bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <HiMusicNote className="text-neon" /> Bài đã upload ({totalSongs})
                    </h3>
                    <button onClick={() => fetchUploaded(page)} className="text-gray-500 hover:text-gray-300 transition-colors">
                        <HiRefresh className={loadingSongs ? 'animate-spin' : ''} />
                    </button>
                </div>

                {loadingSongs ? (
                    <div className="py-8 text-center text-gray-500 text-sm"><HiRefresh className="inline animate-spin mr-2" />Đang tải...</div>
                ) : uploadedSongs.length === 0 ? (
                    <div className="py-8 text-center text-gray-600 text-sm">Chưa có bài nào được upload</div>
                ) : (
                    <div className="divide-y divide-white/[0.03]">
                        {uploadedSongs.map(song => (
                            <div key={song.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors group">
                                {song.coverUrl ? (
                                    <img src={song.coverUrl} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                                ) : (
                                    <div className="w-9 h-9 rounded-lg bg-neon/10 flex items-center justify-center flex-shrink-0">
                                        <HiMusicNote className="text-neon text-sm" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white truncate font-medium">{song.title}</p>
                                    <p className="text-[11px] text-gray-400 truncate">{song.artist}</p>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => {
                                            const backendBase = (import.meta.env.VITE_API_URL || 'http://localhost:5066/api').replace('/api', '');
                                            playSong({
                                                id: `local_${song.id}`, title: song.title, artist: song.artist,
                                                cover: song.coverUrl,
                                                audio: song.audioUrl ? `${backendBase}${song.audioUrl}` : 'YT_STREAM',
                                                source: 'local'
                                            });
                                        }}
                                        className="p-1.5 rounded-lg bg-neon/20 text-neon hover:bg-neon/30 transition-all" title="Phát"
                                    >
                                        <HiPlay className="text-sm" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(song.id, song.title)}
                                        disabled={deletingId === song.id}
                                        className={`p-1.5 rounded-lg text-sm transition-all ${confirmDeleteId === song.id ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 text-red-400 hover:bg-red-500/20'}`}
                                        title={confirmDeleteId === song.id ? 'Bấm lần nữa để xóa' : 'Xóa'}
                                    >
                                        {deletingId === song.id ? <HiRefresh className="animate-spin" /> : <HiTrash />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Phân trang */}
                {totalSongs > 10 && (
                    <div className="flex items-center justify-center gap-3 p-3 border-t border-white/5">
                        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-xs text-gray-400 bg-white/5 rounded-lg disabled:opacity-30 hover:bg-white/10 transition-all">← Trước</button>
                        <span className="text-xs text-gray-500">Trang {page} / {Math.ceil(totalSongs / 10)}</span>
                        <button disabled={page * 10 >= totalSongs} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-xs text-gray-400 bg-white/5 rounded-lg disabled:opacity-30 hover:bg-white/10 transition-all">Sau →</button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Tab: Import ──────────────────────────────────────────────────────────
function ImportTab() {
    const { playSong, addToQueue } = usePlayer();
    const [linkInput, setLinkInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [activeImportMode, setActiveImportMode] = useState('upload'); // 'upload' | 'link'

    const detectLink = (url) => {
        const t = url.trim();
        const m = (r) => t.match(r);
        if (m(/zingmp3\.vn\/embed\/playlist\/([A-Z0-9]+)/i)) return { source: 'zing', type: 'playlist', id: m(/zingmp3\.vn\/embed\/playlist\/([A-Z0-9]+)/i)[1] };
        if (m(/zingmp3\.vn\/(?:playlist|album)\/[^/]+\/([A-Z0-9]+)/i)) return { source: 'zing', type: 'playlist', id: m(/zingmp3\.vn\/(?:playlist|album)\/[^/]+\/([A-Z0-9]+)/i)[1] };
        if (m(/zingmp3\.vn\/bai-hat\/[^/]+\/([A-Z0-9]+)/i)) return { source: 'zing', type: 'song', id: m(/zingmp3\.vn\/bai-hat\/[^/]+\/([A-Z0-9]+)/i)[1] };
        if (m(/nhaccuatui\.com\/playlist\/[^.]+\.([a-zA-Z0-9]+)\.html/i)) return { source: 'nct', type: 'playlist', key: m(/nhaccuatui\.com\/playlist\/[^.]+\.([a-zA-Z0-9]+)\.html/i)[1] };
        if (m(/nhaccuatui\.com\/bai-hat\/[^.]+\.([a-zA-Z0-9]+)\.html/i)) return { source: 'nct', type: 'song', key: m(/nhaccuatui\.com\/bai-hat\/[^.]+\.([a-zA-Z0-9]+)\.html/i)[1] };
        if (m(/^([A-Z0-9]{8})$/i)) return { source: 'zing', type: 'playlist', id: m(/^([A-Z0-9]{8})$/i)[1] };
        return null;
    };

    const handlePreview = async () => {
        setError(''); setResult(null);
        const d = detectLink(linkInput);
        if (!d) { setError('Link không hợp lệ. Hỗ trợ: Zing MP3 (playlist/bài hát/embed) và NhacCuaTui (playlist/bài hát).'); return; }
        setLoading(true);
        try {
            if (d.source === 'zing' && d.type === 'playlist') {
                const res = await api.get(`/songs/zing-playlist/${d.id}`);
                setResult({ source: 'Zing MP3', type: 'Playlist', name: res.data.data.name, image: res.data.data.image, totalSongs: res.data.data.totalSongs, tracks: res.data.data.tracks });
            } else if (d.source === 'nct' && d.type === 'playlist') {
                const res = await api.get(`/songs/nct-playlist-detail/${d.key}`);
                const data = res.data;
                setResult({
                    source: 'NhacCuaTui', type: 'Playlist', name: data.name || data.playlistName || 'NCT Playlist', image: data.image || data.coverUrl || '', totalSongs: data.songs?.length || 0,
                    tracks: (data.songs || []).map((s, i) => ({ id: s.key || `nct_${i}`, title: s.title || s.name || '', artist: s.artist || s.artistName || 'Unknown', cover: s.cover || s.imageUrl || '', audio: s.streamUrl || s.audio || 'YT_STREAM', nctKey: s.key, source: 'nct' }))
                });
            } else if (d.source === 'nct' && d.type === 'song') {
                const res = await api.get(`/songs/nct-stream/${d.key}`);
                setResult({
                    source: 'NhacCuaTui', type: 'Bài hát', name: res.data.title || 'NCT Song', totalSongs: 1,
                    tracks: [{ id: d.key, title: res.data.title || '', artist: res.data.artist || 'Unknown', cover: res.data.cover || '', audio: res.data.streamUrl || 'YT_STREAM', nctKey: d.key, source: 'nct' }]
                });
            } else if (d.source === 'zing' && d.type === 'song') {
                setResult({
                    source: 'Zing MP3', type: 'Bài hát', name: `Zing Song ${d.id}`, totalSongs: 1,
                    tracks: [{ id: `zing_${d.id}`, title: `Zing Song ${d.id}`, artist: 'Đang tải...', cover: '', audio: 'YT_STREAM', source: 'zing' }]
                });
            }
        } catch (err) { setError(err.response?.data?.message || err.message || 'Lỗi khi tải'); }
        finally { setLoading(false); }
    };

    const handlePlayAll = () => {
        if (!result?.tracks?.length) return;
        playSong({ ...result.tracks[0], audio: result.tracks[0].audio || 'YT_STREAM' });
        result.tracks.slice(1).forEach(s => addToQueue({ ...s, audio: s.audio || 'YT_STREAM' }));
    };

    return (
        <div className="space-y-4">
            {/* Mode switcher */}
            <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                <button
                    onClick={() => setActiveImportMode('upload')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeImportMode === 'upload' ? 'bg-neon/15 text-neon' : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'}`}
                >
                    <HiMusicNote className="text-base" /> Upload MP3
                </button>
                <button
                    onClick={() => setActiveImportMode('link')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeImportMode === 'link' ? 'bg-amber-500/15 text-amber-400' : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'}`}
                >
                    <HiUpload className="text-base" /> Import từ link
                </button>
            </div>

            {/* Upload MP3 mode */}
            {activeImportMode === 'upload' && <UploadMp3Section />}

            {/* Import từ link mode */}
            {activeImportMode === 'link' && <>
            {/* Input */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                <p className="text-xs text-gray-400 mb-3">
                    Dán link hoặc mã nhúng iframe từ <span className="text-purple-400">Zing MP3</span> / <span className="text-green-400">NhacCuaTui</span> — playlist hoặc bài hát đơn lẻ
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    {[
                        { l: 'Zing Playlist', c: 'text-purple-400' }, { l: 'Zing Embed/iframe', c: 'text-purple-400' },
                        { l: 'NCT Playlist', c: 'text-green-400' }, { l: 'NCT Bài hát', c: 'text-green-400' },
                    ].map((x, i) => (
                        <div key={i} className="flex items-center gap-1.5 px-2 py-1.5 bg-black/20 rounded-lg">
                            <HiCheck className={`text-[10px] ${x.c}`} /><span className="text-[11px] text-gray-300">{x.l}</span>
                        </div>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input value={linkInput} onChange={(e) => { setLinkInput(e.target.value); setResult(null); setError(''); }}
                        onKeyDown={(e) => e.key === 'Enter' && handlePreview()}
                        placeholder="Dán link Zing MP3 / NhacCuaTui / iframe embed..."
                        className="flex-1 px-3 py-2.5 bg-black/30 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-all" />
                    <button onClick={handlePreview} disabled={loading || !linkInput.trim()}
                        className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-all flex items-center gap-1.5">
                        {loading ? <HiRefresh className="animate-spin" /> : <HiUpload />}
                        {loading ? 'Đang tải...' : 'Import'}
                    </button>
                </div>
                {error && <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm mt-3 bg-red-500/10 text-red-400 border border-red-500/20"><HiX />{error}</div>}
            </div>

            {/* Results */}
            {result && (
                <div className="bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                    <div className="p-4 border-b border-white/5 flex items-center gap-3">
                        {result.image && <img src={result.image} alt="" className="w-14 h-14 rounded-xl object-cover" />}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${result.source === 'Zing MP3' ? 'bg-purple-500/20 text-purple-400' : 'bg-green-500/20 text-green-400'}`}>{result.source}</span>
                                <span className="text-[10px] text-gray-500">{result.type}</span>
                            </div>
                            <h3 className="text-base font-bold text-white truncate">{result.name}</h3>
                            <p className="text-[11px] text-gray-400">{result.totalSongs} bài • NCT ưu tiên → YouTube</p>
                        </div>
                        <button onClick={handlePlayAll}
                            className="px-3 py-2 bg-gradient-to-r from-neon to-purple-500 text-white text-sm font-semibold rounded-lg hover:scale-105 transition-all flex items-center gap-1.5 flex-shrink-0">
                            <HiPlay /> Phát tất cả
                        </button>
                    </div>
                    <div className="max-h-[45vh] overflow-y-auto">
                        {result.tracks.map((song, idx) => (
                            <div key={song.id || idx} className="flex items-center gap-2.5 px-4 py-2 hover:bg-white/5 transition-colors border-b border-white/[0.03] last:border-0 group">
                                <span className="text-[11px] text-gray-500 w-5 text-right font-mono">{idx + 1}</span>
                                {song.cover ? <img src={song.cover} alt="" className="w-8 h-8 rounded object-cover" /> :
                                    <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center"><HiMusicNote className="text-gray-600 text-xs" /></div>}
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm text-white truncate">{song.title}</p>
                                    <p className="text-[11px] text-gray-400 truncate">{song.artist}</p>
                                </div>
                                {song.duration > 0 && <span className="text-[11px] text-gray-500">{Math.floor(song.duration / 60)}:{String(song.duration % 60).padStart(2, '0')}</span>}
                                <button onClick={() => playSong({ ...song, audio: song.audio || 'YT_STREAM' })}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded-full bg-neon/20 text-neon hover:bg-neon/30 transition-all" title="Phát">
                                    <HiPlay className="text-xs" /></button>
                                <button onClick={() => addToQueue({ ...song, audio: song.audio || 'YT_STREAM' })}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded-full bg-white/5 text-gray-400 hover:text-white transition-all" title="Thêm hàng chờ">
                                    <HiPlusCircle className="text-xs" /></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            </>}
        </div>
    );
}

// ── Tab: Users ───────────────────────────────────────────────────────────
function UsersTab() {
    const [users, setUsers] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const { user: currentUser } = useContext(AuthContext);

    const fetchUsers = useCallback(() => {
        setLoading(true);
        api.get(`/admin/users?page=${page}&pageSize=20`)
            .then(res => { setUsers(res.data.users); setTotal(res.data.total); })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [page]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const [deleteError, setDeleteError] = useState('');
    const [deleting, setDeleting] = useState(null);
    const [confirmId, setConfirmId] = useState(null);

    const handleDelete = async (id, username) => {
        // Two-step: first click sets confirmId, second click executes
        if (confirmId !== id) {
            setConfirmId(id);
            setTimeout(() => setConfirmId(prev => prev === id ? null : prev), 5000); // auto-cancel after 5s
            return;
        }
        setConfirmId(null);
        setDeleteError('');
        setDeleting(id);
        console.log('[Admin] Deleting user id=', id, 'username=', username);
        try {
            const res = await api.delete(`/admin/users/${id}`);
            console.log('[Admin] Delete success:', res.data);
            fetchUsers();
        } catch (err) {
            console.error('[Admin] Delete error:', err.response?.status, err.response?.data, err);
            const msg = err.response?.data?.message || err.response?.data || err.message || 'Lỗi không xác định';
            setDeleteError(`Lỗi xóa "${username}": ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
        } finally {
            setDeleting(null);
        }
    };

    if (loading) return <div className="text-center py-12 text-gray-400"><HiRefresh className="inline animate-spin mr-2" />Đang tải...</div>;

    return (
        <div className="bg-white/5 rounded-xl border border-white/5 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><HiUsers className="text-blue-400" /> Danh sách ({total})</h3>
            </div>
            {deleteError && (
                <div className="mx-4 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-red-500/10 text-red-400 border border-red-500/20">
                    <HiX className="flex-shrink-0" />{deleteError}
                </div>
            )}
            {users.length === 0 ? (
                <p className="p-4 text-gray-400 text-sm text-center">Không có user nào</p>
            ) : (
                <div className="divide-y divide-white/[0.03]">
                    {users.map(u => (
                        <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors group">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                {(u.displayName || u.username || '?')[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm text-white font-medium truncate">{u.displayName || u.username}</p>
                                    {u.role === 'admin' && <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-bold">ADMIN</span>}
                                </div>
                                <p className="text-[11px] text-gray-400 truncate">@{u.username} • {u.email}</p>
                            </div>
                            <div className="hidden sm:flex items-center gap-4 text-[11px] text-gray-500">
                                <span title="Playlists"><HiCollection className="inline mr-1" />{u.playlistCount}</span>
                                <span title="Yêu thích"><HiHeart className="inline mr-1" />{u.favoritesCount}</span>
                                <span title="Lượt nghe"><HiChartBar className="inline mr-1" />{u.listenCount}</span>
                            </div>
                            <div className="text-[11px] text-gray-500 hidden md:block">{new Date(u.createdAt).toLocaleDateString('vi-VN')}</div>
                            {u.id !== currentUser?.id && (
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(u.id, u.username); }}
                                    disabled={deleting === u.id}
                                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 flex items-center gap-1 ${confirmId === u.id
                                            ? 'bg-red-500 text-white animate-pulse'
                                            : 'text-red-400 bg-red-500/10 hover:bg-red-500/20'
                                        }`} title={confirmId === u.id ? 'Bấm lần nữa để xóa' : 'Xóa user'}>
                                    {deleting === u.id ? <><HiRefresh className="text-sm animate-spin" /> Đang xóa...</>
                                        : confirmId === u.id ? <><HiTrash className="text-sm" /> Xác nhận?</>
                                            : <HiTrash className="text-sm" />}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
            {total > 20 && (
                <div className="flex items-center justify-center gap-3 p-3 border-t border-white/5">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-xs text-gray-400 bg-white/5 rounded-lg disabled:opacity-30">← Trước</button>
                    <span className="text-xs text-gray-500">Trang {page}</span>
                    <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-xs text-gray-400 bg-white/5 rounded-lg disabled:opacity-30">Sau →</button>
                </div>
            )}
        </div>
    );
}

// ── Main Admin Page ──────────────────────────────────────────────────────
const tabs = [
    { id: 'dashboard', label: 'Tổng quan', icon: HiChartBar },
    { id: 'import', label: 'Import nhạc', icon: HiUpload },
    { id: 'users', label: 'Người dùng', icon: HiUsers },
];

const AdminPage = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('dashboard');

    useEffect(() => {
        if (!user || user.role !== 'admin') navigate('/');
    }, [user, navigate]);

    if (!user || user.role !== 'admin') return null;

    return (
        <div className="max-w-5xl mx-auto pb-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <HiCog className="text-lg text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white">Quản trị Soundia</h1>
                    <p className="text-gray-400 text-xs">Xin chào, {user.displayName || user.username}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-5 bg-white/5 p-1 rounded-xl border border-white/5">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
                            }`}>
                        <tab.icon className="text-base" /> {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'dashboard' && <DashboardTab />}
            {activeTab === 'import' && <ImportTab />}
            {activeTab === 'users' && <UsersTab />}
        </div>
    );
};

export default AdminPage;
