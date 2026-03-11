import { useEffect, useRef, useState, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext';

/**
 * AudioVisualizer — Real-time frequency bars/waveform visualization
 * Uses Web Audio API AnalyserNode
 */
export default function AudioVisualizer({ variant = 'bars', barCount = 32, height = 60, className = '' }) {
    const { audioRef, isPlaying, isYTMode } = usePlayer();
    const canvasRef = useRef(null);
    const analyserRef = useRef(null);
    const sourceRef = useRef(null);
    const animFrameRef = useRef(null);
    const audioCtxRef = useRef(null);

    // Initialize Web Audio API analyser
    const initAnalyser = useCallback(() => {
        if (analyserRef.current || !audioRef.current || isYTMode) return;

        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            // Reuse existing context if possible
            if (!audioCtxRef.current) {
                audioCtxRef.current = new AudioCtx();
            }
            const ctx = audioCtxRef.current;

            const analyser = ctx.createAnalyser();
            analyser.fftSize = 128;
            analyser.smoothingTimeConstant = 0.8;

            // Try to connect source — may already be connected by EQ
            try {
                if (!sourceRef.current) {
                    sourceRef.current = ctx.createMediaElementSource(audioRef.current);
                }
                sourceRef.current.connect(analyser);
                analyser.connect(ctx.destination);
            } catch {
                // Source already connected (by EQ) — skip, use shared context
                // The analyser won't work without a connected source, but we'll draw static bars
            }

            analyserRef.current = analyser;
        } catch (err) {
            console.warn('[Visualizer] Init failed:', err.message);
        }
    }, [audioRef, isYTMode]);

    // Draw visualization
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const analyser = analyserRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const canvasH = canvas.height;

        ctx.clearRect(0, 0, width, canvasH);

        if (!analyser || !isPlaying) {
            // Static idle bars
            const barW = width / barCount;
            for (let i = 0; i < barCount; i++) {
                const h = 2 + Math.random() * 4;
                const x = i * barW;
                ctx.fillStyle = 'rgba(0, 255, 204, 0.15)';
                ctx.fillRect(x + 1, canvasH - h, barW - 2, h);
            }
            return;
        }

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        if (variant === 'bars') {
            const barW = width / barCount;
            const step = Math.floor(bufferLength / barCount);

            for (let i = 0; i < barCount; i++) {
                const value = dataArray[i * step] || 0;
                const percent = value / 255;
                const h = Math.max(2, percent * canvasH * 0.9);
                const x = i * barW;

                // Gradient color from neon to purple
                const hue = 160 + (i / barCount) * 60; // 160 (cyan) → 220 (blue)
                const alpha = 0.4 + percent * 0.6;
                ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${alpha})`;

                // Round top
                const radius = Math.min(barW / 2 - 1, 3);
                ctx.beginPath();
                ctx.roundRect(x + 1, canvasH - h, barW - 2, h, [radius, radius, 0, 0]);
                ctx.fill();
            }
        } else {
            // Waveform
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(0, 255, 204, 0.5)';
            ctx.lineWidth = 2;
            const sliceWidth = width / bufferLength;
            let x = 0;
            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 255;
                const y = canvasH - v * canvasH * 0.8;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
                x += sliceWidth;
            }
            ctx.stroke();
        }

        animFrameRef.current = requestAnimationFrame(draw);
    }, [isPlaying, barCount, variant]);

    // Start/stop animation loop
    useEffect(() => {
        if (isPlaying && !isYTMode) {
            if (!analyserRef.current) initAnalyser();
            if (audioCtxRef.current?.state === 'suspended') {
                audioCtxRef.current.resume();
            }
            draw();
        } else {
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
            }
            // Draw idle state
            draw();
        }

        return () => {
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
            }
        };
    }, [isPlaying, isYTMode, draw, initAnalyser]);

    // Resize canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const resizeObserver = new ResizeObserver(() => {
            canvas.width = canvas.offsetWidth * window.devicePixelRatio;
            canvas.height = canvas.offsetHeight * window.devicePixelRatio;
            const ctx = canvas.getContext('2d');
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        });
        resizeObserver.observe(canvas);
        return () => resizeObserver.disconnect();
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className={`w-full ${className}`}
            style={{ height: `${height}px` }}
        />
    );
}
