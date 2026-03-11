import { useState } from 'react';
import { HiX, HiMusicNote } from 'react-icons/hi';

export default function EqualizerPanel({ eq, onClose }) {
    const {
        eqEnabled, toggleEQ,
        gains, setBandGain,
        activePreset, applyPreset,
        bandLabels, presets,
    } = eq;

    const presetKeys = Object.keys(presets);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-[#1a1a2e]/95 border border-white/10 rounded-2xl shadow-2xl w-[90vw] max-w-md p-5 relative"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <HiMusicNote className="text-neon text-lg" />
                        <h3 className="text-white font-bold text-base">Equalizer</h3>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Toggle */}
                        <button
                            onClick={toggleEQ}
                            className={`relative w-10 h-5 rounded-full transition-colors ${eqEnabled ? 'bg-neon' : 'bg-gray-700'}`}
                        >
                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${eqEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
                            <HiX className="text-lg" />
                        </button>
                    </div>
                </div>

                {/* Presets */}
                <div className="flex flex-wrap gap-1.5 mb-5">
                    {presetKeys.map(key => (
                        <button
                            key={key}
                            onClick={() => applyPreset(key)}
                            className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                                activePreset === key
                                    ? 'bg-neon text-dark'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            {presets[key].name}
                        </button>
                    ))}
                    {activePreset === 'custom' && (
                        <span className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-purple-500/20 text-purple-300">
                            Tùy chỉnh
                        </span>
                    )}
                </div>

                {/* EQ Sliders */}
                <div className={`transition-opacity ${eqEnabled ? 'opacity-100' : 'opacity-40'}`}>
                    <div className="flex items-end justify-between gap-2 px-2">
                        {bandLabels.map((label, i) => (
                            <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                                {/* Gain value */}
                                <span className={`text-[10px] font-mono ${gains[i] > 0 ? 'text-neon' : gains[i] < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                                    {gains[i] > 0 ? '+' : ''}{gains[i]}
                                </span>

                                {/* Vertical slider */}
                                <div className="relative h-28 w-6 flex items-center justify-center">
                                    <input
                                        type="range"
                                        min="-12"
                                        max="12"
                                        step="1"
                                        value={gains[i]}
                                        onChange={e => setBandGain(i, parseInt(e.target.value, 10))}
                                        disabled={!eqEnabled}
                                        className="eq-slider"
                                        style={{
                                            writingMode: 'vertical-lr',
                                            direction: 'rtl',
                                            width: '112px',
                                            height: '20px',
                                        }}
                                    />
                                </div>

                                {/* Frequency label */}
                                <span className="text-[9px] text-gray-500 font-medium">{label}</span>
                            </div>
                        ))}
                    </div>

                    {/* dB scale */}
                    <div className="flex justify-between px-1 mt-2">
                        <span className="text-[8px] text-gray-600">-12dB</span>
                        <span className="text-[8px] text-gray-600">0dB</span>
                        <span className="text-[8px] text-gray-600">+12dB</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
