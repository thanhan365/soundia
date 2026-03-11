import { useState, useEffect, useRef } from 'react';

/**
 * useColorExtractor — Extract dominant color from an image URL
 * Uses canvas to sample colors and returns the dominant color
 */
export function useColorExtractor(imageUrl) {
    const [dominantColor, setDominantColor] = useState(null);
    const canvasRef = useRef(document.createElement('canvas'));
    const prevUrl = useRef(null);

    useEffect(() => {
        if (!imageUrl || imageUrl === prevUrl.current) return;
        prevUrl.current = imageUrl;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imageUrl;

        img.onload = () => {
            try {
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                const size = 50; // Small sample size for performance
                canvas.width = size;
                canvas.height = size;
                ctx.drawImage(img, 0, 0, size, size);

                const imageData = ctx.getImageData(0, 0, size, size).data;
                const colorCounts = {};
                let maxCount = 0;
                let dominant = [30, 20, 50]; // default dark

                // Sample every 4th pixel for speed
                for (let i = 0; i < imageData.length; i += 16) {
                    const r = imageData[i];
                    const g = imageData[i + 1];
                    const b = imageData[i + 2];
                    const a = imageData[i + 3];
                    if (a < 128) continue; // Skip transparent

                    // Skip very dark or very light pixels
                    const brightness = (r + g + b) / 3;
                    if (brightness < 30 || brightness > 220) continue;

                    // Quantize to reduce colors
                    const qr = Math.round(r / 32) * 32;
                    const qg = Math.round(g / 32) * 32;
                    const qb = Math.round(b / 32) * 32;
                    const key = `${qr},${qg},${qb}`;

                    colorCounts[key] = (colorCounts[key] || 0) + 1;
                    if (colorCounts[key] > maxCount) {
                        maxCount = colorCounts[key];
                        dominant = [qr, qg, qb];
                    }
                }

                // Darken color for background use (multiply by 0.4)
                const darkened = dominant.map(c => Math.round(c * 0.4));
                setDominantColor({
                    rgb: dominant,
                    dark: darkened,
                    css: `rgb(${dominant.join(',')})`,
                    darkCss: `rgb(${darkened.join(',')})`,
                    gradient: `linear-gradient(135deg, rgb(${darkened.join(',')}) 0%, rgb(${darkened.map(c => Math.round(c * 0.3)).join(',')}) 50%, #0f0a1a 100%)`,
                });
            } catch {
                // CORS or other error — fallback
                setDominantColor(null);
            }
        };

        img.onerror = () => setDominantColor(null);
    }, [imageUrl]);

    return dominantColor;
}
