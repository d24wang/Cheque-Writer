import { useCallback, useRef } from 'react';

export interface AutoFitFontSizeOptions {
    /** Minimum font size (inclusive). Default: 6. */
    minSize?: number;
    /** Maximum font size (inclusive). Default: 200. */
    maxSize?: number;
    /** CSS font-family used for measurement. Default: inherited / 'sans-serif'. */
    fontFamily?: string;
    /** Horizontal padding to subtract from box width before fitting (pixels total). Default: 2. */
    paddingH?: number;
    /** Vertical padding to subtract from box height before fitting (pixels total). Default: 2. */
    paddingV?: number;
    /** Font size multiplier when emoji are detected (0–1). Default: 0.75 (25% reduction). */
    emojiMaxSizeMultiplier?: number;
}

/**
 * Standalone hook that exposes `fitFontSize(text, boxWidthPx, boxHeightPx): number`.
 *
 * Uses an off-screen Canvas and binary search to find the largest integer font
 * size at which `text` fits within the given pixel box dimensions.
 * The result is clamped to [minSize, maxSize].
 *
 * Canvas context is created once and reused across calls for performance.
 *
 * When emoji are detected in text, the effective maxSize is reduced by the
 * emojiMaxSizeMultiplier to account for inconsistent emoji rendering metrics.
 */
export function useAutoFitFontSize(options: AutoFitFontSizeOptions = {}) {
    const {
        minSize = 6,
        maxSize = 200,
        fontFamily = 'sans-serif',
        paddingH = 2,
        paddingV = 2,
        emojiMaxSizeMultiplier = 0.75,
    } = options;

    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

    // Regex to detect emoji; covers most common emoji ranges and complex sequences
    const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u;

    function hasEmojiContent(text: string): boolean {
        try {
            return emojiRegex.test(text);
        } catch {
            // Fallback if regex fails (e.g., in older environments)
            return false;
        }
    }

    function getCtx(): CanvasRenderingContext2D | null {
        if (ctxRef.current) return ctxRef.current;
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            const ctx = canvas.getContext('2d');
            if (ctx) ctxRef.current = ctx;
            return ctx;
        } catch {
            return null;
        }
    }

    function measureWidth(ctx: CanvasRenderingContext2D, text: string, size: number): number {
        ctx.font = `${size}px ${fontFamily}`;
        return ctx.measureText(text).width;
    }

    const fitFontSize = useCallback(
        (text: string, boxWidthPx: number, boxHeightPx: number): number => {
            if (!text || boxWidthPx <= 0 || boxHeightPx <= 0) return minSize;

            const ctx = getCtx();
            if (!ctx) return minSize;

            const availableWidth = Math.max(0, boxWidthPx - paddingH);
            const availableHeight = Math.max(0, boxHeightPx - paddingV);

            // Binary search for best fitting integer font size
            let lo = minSize;
            let hi = Math.min(maxSize, Math.floor(availableHeight)); // height is hard upper bound

            // If emoji are detected, reduce the effective maxSize heuristically
            if (hasEmojiContent(text)) {
                hi = Math.floor(hi * emojiMaxSizeMultiplier);
            }

            let best = minSize;

            while (lo <= hi) {
                const mid = Math.floor((lo + hi) / 2);
                const w = measureWidth(ctx, text, mid);
                if (w <= availableWidth && mid <= availableHeight) {
                    best = mid;
                    lo = mid + 1;
                } else {
                    hi = mid - 1;
                }
            }

            return best;
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [minSize, maxSize, fontFamily, paddingH, paddingV, emojiMaxSizeMultiplier],
    );

    return { fitFontSize };
}
