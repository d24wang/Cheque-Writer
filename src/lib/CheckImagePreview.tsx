import React, { useEffect, useRef, useState } from 'react';
import './check-image-preview.css';
import { useAutoFitFontSize } from './useAutoFitFontSize';
import type { InputFieldOverlayField } from './InputFieldOverlayEditor';

export interface CheckImagePreviewProps {
    /** Data URL or src for the check template image. */
    imageUrl: string;
    /** Field definitions (layout, font settings, kind). */
    fields: InputFieldOverlayField[];
    /** Map of field id → rendered text value to display. */
    fieldValues: Record<string, string>;
    className?: string;
}

export default function CheckImagePreview({
    imageUrl,
    fields,
    fieldValues,
    className,
}: CheckImagePreviewProps) {
    const [sizePx, setSizePx] = useState<{ width: number; height: number; }>({ width: 0, height: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const { fitFontSize } = useAutoFitFontSize({
        minSize: 6,
        maxSize: 200,
        // Keep a conservative right-side buffer to avoid clipping glyph overhang.
        paddingH: 8,
    });

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) {
                setSizePx({ width: entry.contentRect.width, height: entry.contentRect.height });
            }
        });
        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    function getRectStyle(rect: InputFieldOverlayField['rect']): React.CSSProperties {
        return {
            left: `${rect.x * 100}%`,
            top: `${rect.y * 100}%`,
            width: `${rect.width * 100}%`,
            height: `${rect.height * 100}%`,
        };
    }

    function getTextStyle(field: InputFieldOverlayField, value: string): React.CSSProperties {
        let fontSize = field.fontSize ?? 14;
        if (field.autoFont && value && sizePx.width > 0 && sizePx.height > 0) {
            const pxW = field.rect.width * sizePx.width;
            const pxH = field.rect.height * sizePx.height;
            const fitWidth = Math.max(0, pxW - (field.kind === 'amount_words' ? 6 : 2));
            fontSize = fitFontSize(value, fitWidth, pxH);
        }
        return {
            textAlign: field.align ?? 'left',
            fontSize: `${fontSize}px`,
            lineHeight: 1,
        };
    }

    function getFormatedValue(field: InputFieldOverlayField, value: string): string {
        if (!value) return '';

        switch (field.kind) {
            case 'amount_words':
                return `***${value}`;
            case 'pay_to':
                return `***${value}***`;
            default:
                return value;
        }
    }

    const rootClass = ['check-image-preview', className].filter(Boolean).join(' ');

    return (
        <div className={rootClass} ref={containerRef}>
            <img
                src={imageUrl}
                alt="Cheque template preview"
                className="check-image-preview__image"
            />
            <div className="check-image-preview__overlay" aria-label="Rendered cheque fields">
                {fields.map((field) => {
                    const value = fieldValues[field.id] ?? '';
                    const displayValue = getFormatedValue(field, value);
                    return (
                        <div
                            key={field.id}
                            className={`check-image-preview__field check-image-preview__field--${field.kind}`}
                            style={getRectStyle(field.rect)}
                        >
                            <span
                                className="check-image-preview__text"
                                style={getTextStyle(field, displayValue)}
                            >
                                {displayValue}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
