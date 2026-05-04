import React, { useEffect, useRef, useState } from 'react';
import './input-field-overlay-editor.css';
import { useAutoFitFontSize } from './useAutoFitFontSize';

export interface InputFieldOverlayRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export type InputFieldOverlayAlign = 'left' | 'center' | 'right';

export interface InputFieldOverlayField {
    id: string;
    kind: string;
    rect: InputFieldOverlayRect;
    placeholder?: string;
    align?: InputFieldOverlayAlign;
    fontSize?: number;
    /** When true, font size is computed to fill the box when rendering. */
    autoFont?: boolean;
}

export interface InputFieldOverlayOption {
    value: string;
    label: string;
}

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

interface StageSize {
    width: number;
    height: number;
}

interface Point {
    x: number;
    y: number;
}

type InteractionState =
    | { mode: 'draw'; startPoint: Point; }
    | { mode: 'move'; fieldId: string; startPoint: Point; startRect: InputFieldOverlayRect; }
    | { mode: 'resize'; fieldId: string; startPoint: Point; startRect: InputFieldOverlayRect; handle: ResizeHandle; };

export interface InputFieldOverlayEditorProps {
    imageUrl: string;
    previewWidthIn?: number;
    previewHeightIn?: number;
    fields: InputFieldOverlayField[];
    fieldOptions: InputFieldOverlayOption[];
    onChange: (fields: InputFieldOverlayField[]) => void;
    className?: string;
    emptyLabel?: string;
}

const RESIZE_HANDLES: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const MIN_RECT_SIZE = 0.015;

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

function clampRect(rect: InputFieldOverlayRect): InputFieldOverlayRect {
    const width = clamp(rect.width, MIN_RECT_SIZE, 1);
    const height = clamp(rect.height, MIN_RECT_SIZE, 1);
    const x = clamp(rect.x, 0, 1 - width);
    const y = clamp(rect.y, 0, 1 - height);
    return { x, y, width, height };
}

function createRectFromPoints(start: Point, end: Point, size: StageSize): InputFieldOverlayRect {
    const startX = clamp(start.x / size.width, 0, 1);
    const startY = clamp(start.y / size.height, 0, 1);
    const endX = clamp(end.x / size.width, 0, 1);
    const endY = clamp(end.y / size.height, 0, 1);

    return clampRect({
        x: Math.min(startX, endX),
        y: Math.min(startY, endY),
        width: Math.abs(endX - startX),
        height: Math.abs(endY - startY),
    });
}

function moveRect(rect: InputFieldOverlayRect, startPoint: Point, nextPoint: Point, size: StageSize): InputFieldOverlayRect {
    const dx = (nextPoint.x - startPoint.x) / size.width;
    const dy = (nextPoint.y - startPoint.y) / size.height;
    return clampRect({ ...rect, x: rect.x + dx, y: rect.y + dy });
}

function resizeRect(rect: InputFieldOverlayRect, startPoint: Point, nextPoint: Point, size: StageSize, handle: ResizeHandle): InputFieldOverlayRect {
    const dx = (nextPoint.x - startPoint.x) / size.width;
    const dy = (nextPoint.y - startPoint.y) / size.height;

    let left = rect.x;
    let top = rect.y;
    let right = rect.x + rect.width;
    let bottom = rect.y + rect.height;

    if (handle.includes('w')) left = clamp(rect.x + dx, 0, right - MIN_RECT_SIZE);
    if (handle.includes('e')) right = clamp(rect.x + rect.width + dx, left + MIN_RECT_SIZE, 1);
    if (handle.includes('n')) top = clamp(rect.y + dy, 0, bottom - MIN_RECT_SIZE);
    if (handle.includes('s')) bottom = clamp(rect.y + rect.height + dy, top + MIN_RECT_SIZE, 1);

    return clampRect({
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
    });
}

function createFieldId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    return `field-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function joinClassNames(...values: Array<string | undefined>): string {
    return values.filter(Boolean).join(' ');
}

export default function InputFieldOverlayEditor({
    imageUrl,
    previewWidthIn = 6.25,
    previewHeightIn = 2.75,
    fields,
    fieldOptions,
    onChange,
    className,
    emptyLabel = 'Drag on the image to create a field box.',
}: InputFieldOverlayEditorProps) {
    const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
    const [draftRect, setDraftRect] = useState<InputFieldOverlayRect | null>(null);
    const [stageSize, setStageSize] = useState<StageSize>({ width: 0, height: 0 });
    const [interaction, setInteraction] = useState<InteractionState | null>(null);
    const stageRef = useRef<HTMLDivElement>(null);

    const { fitFontSize } = useAutoFitFontSize({ minSize: 6, maxSize: 200 });

    const selectedField = selectedFieldId
        ? fields.find((field) => field.id === selectedFieldId) ?? null
        : null;

    useEffect(() => {
        if (selectedFieldId && !fields.some((field) => field.id === selectedFieldId)) {
            setSelectedFieldId(null);
        }
    }, [fields, selectedFieldId]);

    useEffect(() => {
        const node = stageRef.current;
        if (!node) return;

        const updateSize = () => {
            const nextWidth = node.clientWidth;
            const nextHeight = node.clientHeight;
            setStageSize((prev) => (
                prev.width === nextWidth && prev.height === nextHeight
                    ? prev
                    : { width: nextWidth, height: nextHeight }
            ));
        };

        updateSize();

        const observer = new ResizeObserver(updateSize);
        observer.observe(node);

        return () => observer.disconnect();
    }, [imageUrl]);

    useEffect(() => {
        if (!interaction) return;

        const handlePointerMove = (event: PointerEvent) => {
            if (!stageRef.current || stageSize.width === 0 || stageSize.height === 0) return;

            const bounds = stageRef.current.getBoundingClientRect();
            const point = {
                x: clamp(event.clientX - bounds.left, 0, bounds.width),
                y: clamp(event.clientY - bounds.top, 0, bounds.height),
            };

            if (interaction.mode === 'draw') {
                setDraftRect(createRectFromPoints(interaction.startPoint, point, stageSize));
                return;
            }

            if (interaction.mode === 'move') {
                onChange(fields.map((field) => (
                    field.id === interaction.fieldId
                        ? { ...field, rect: moveRect(interaction.startRect, interaction.startPoint, point, stageSize) }
                        : field
                )));
                return;
            }

            onChange(fields.map((field) => (
                field.id === interaction.fieldId
                    ? { ...field, rect: resizeRect(interaction.startRect, interaction.startPoint, point, stageSize, interaction.handle) }
                    : field
            )));
        };

        const handlePointerUp = () => {
            if (interaction.mode === 'draw' && draftRect && draftRect.width >= MIN_RECT_SIZE && draftRect.height >= MIN_RECT_SIZE) {
                const defaultKind = fieldOptions[0]?.value ?? 'field';
                const nextField: InputFieldOverlayField = {
                    id: createFieldId(),
                    kind: defaultKind,
                    rect: draftRect,
                };
                onChange([...fields, nextField]);
                setSelectedFieldId(nextField.id);
            }

            setDraftRect(null);
            setInteraction(null);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp, { once: true });

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [draftRect, fieldOptions, fields, interaction, onChange, stageSize]);

    function getFieldLabel(kind: string): string {
        return fieldOptions.find((option) => option.value === kind)?.label ?? kind;
    }

    function getFieldStyle(rect: InputFieldOverlayRect): React.CSSProperties {
        return {
            left: `${rect.x * 100}%`,
            top: `${rect.y * 100}%`,
            width: `${rect.width * 100}%`,
            height: `${rect.height * 100}%`,
        };
    }

    function getPlaceholderStyle(field: InputFieldOverlayField): React.CSSProperties {
        const textAlign = field.align ?? 'left';
        let fontSize = field.fontSize ?? 14;
        if (field.autoFont && field.placeholder && stageSize.width > 0 && stageSize.height > 0) {
            const pxW = field.rect.width * stageSize.width;
            const pxH = field.rect.height * stageSize.height;
            fontSize = fitFontSize(field.placeholder, pxW, pxH);
        }
        return {
            textAlign,
            fontSize: `${fontSize}px`,
            lineHeight: 1,
        };
    }

    function applyAutoFit() {
        if (!selectedFieldId || stageSize.width === 0 || stageSize.height === 0) return;
        const field = fields.find((f) => f.id === selectedFieldId);
        if (!field?.placeholder) return;
        const pxW = field.rect.width * stageSize.width;
        const pxH = field.rect.height * stageSize.height;
        const size = fitFontSize(field.placeholder, pxW, pxH);
        updateSelectedField({ fontSize: size, autoFont: false });
    }

    function startDraw(event: React.PointerEvent<HTMLDivElement>) {
        if (stageSize.width === 0 || stageSize.height === 0 || fieldOptions.length === 0) return;

        const bounds = event.currentTarget.getBoundingClientRect();
        const startPoint = {
            x: clamp(event.clientX - bounds.left, 0, bounds.width),
            y: clamp(event.clientY - bounds.top, 0, bounds.height),
        };

        setSelectedFieldId(null);
        setDraftRect(null);
        setInteraction({ mode: 'draw', startPoint });
    }

    function startMove(fieldId: string, event: React.PointerEvent<HTMLDivElement>) {
        event.stopPropagation();
        if (stageSize.width === 0 || stageSize.height === 0 || !stageRef.current) return;
        const field = fields.find((item) => item.id === fieldId);
        if (!field) return;

        const bounds = stageRef.current.getBoundingClientRect();
        const startPoint = {
            x: clamp(event.clientX - bounds.left, 0, bounds.width),
            y: clamp(event.clientY - bounds.top, 0, bounds.height),
        };

        setSelectedFieldId(fieldId);
        setInteraction({ mode: 'move', fieldId, startPoint, startRect: field.rect });
    }

    function startResize(fieldId: string, handle: ResizeHandle, event: React.PointerEvent<HTMLButtonElement>) {
        event.stopPropagation();
        if (stageSize.width === 0 || stageSize.height === 0 || !stageRef.current) return;
        const field = fields.find((item) => item.id === fieldId);
        if (!field) return;

        const bounds = stageRef.current.getBoundingClientRect();
        const startPoint = {
            x: clamp(event.clientX - bounds.left, 0, bounds.width),
            y: clamp(event.clientY - bounds.top, 0, bounds.height),
        };

        setSelectedFieldId(fieldId);
        setInteraction({ mode: 'resize', fieldId, startPoint, startRect: field.rect, handle });
    }

    function updateSelectedField(patch: Partial<InputFieldOverlayField>) {
        if (!selectedFieldId) return;
        onChange(fields.map((field) => (
            field.id === selectedFieldId ? { ...field, ...patch } : field
        )));
    }

    function deleteSelectedField() {
        if (!selectedFieldId) return;
        onChange(fields.filter((field) => field.id !== selectedFieldId));
        setSelectedFieldId(null);
    }

    return (
        <div
            className={joinClassNames('input-field-overlay-editor', className)}
            style={{
                '--editor-preview-width': `${previewWidthIn}in`,
                '--editor-preview-ratio': `${previewWidthIn} / ${previewHeightIn}`,
            } as React.CSSProperties}
        >
            <div className="input-field-overlay-editor__stage" ref={stageRef} onPointerDown={startDraw}>
                <img
                    src={imageUrl}
                    alt="Cheque preview"
                    className="input-field-overlay-editor__image"
                />
                <div className="input-field-overlay-editor__overlay" aria-label="Input field overlay editor">
                    {fields.map((field) => (
                        <div
                            key={field.id}
                            className={`input-field-overlay-editor__rect${selectedFieldId === field.id ? ' is-selected' : ''}`}
                            style={getFieldStyle(field.rect)}
                            onPointerDown={(event) => startMove(field.id, event)}
                        >
                            {field.placeholder && (
                                <div className="input-field-overlay-editor__placeholder-clip">
                                    <span
                                        className="input-field-overlay-editor__placeholder"
                                        style={getPlaceholderStyle(field)}
                                    >
                                        {field.placeholder}
                                    </span>
                                </div>
                            )}
                            {selectedFieldId === field.id && RESIZE_HANDLES.map((handle) => (
                                <button
                                    key={handle}
                                    type="button"
                                    className={`input-field-overlay-editor__handle handle-${handle}`}
                                    onPointerDown={(event) => startResize(field.id, handle, event)}
                                    aria-label={`Resize ${getFieldLabel(field.kind)} field`}
                                />
                            ))}
                        </div>
                    ))}
                    {draftRect && (
                        <div
                            className="input-field-overlay-editor__rect is-draft"
                            style={getFieldStyle(draftRect)}
                        />
                    )}
                </div>
            </div>
            <div className="input-field-overlay-editor__toolbar">
                <div className="input-field-overlay-editor__toolbar-help-row">
                    <span className="input-field-overlay-editor__help">{emptyLabel}</span>
                </div>
                {selectedField && (
                    <div className="input-field-overlay-editor__toolbar-controls-row">
                        <label htmlFor="inputFieldOverlayKind" className="input-field-overlay-editor__toolbar-label">Field</label>
                        <select
                            id="inputFieldOverlayKind"
                            className="input-field-overlay-editor__select"
                            value={selectedField.kind}
                            onChange={(e) => updateSelectedField({ kind: e.target.value })}
                        >
                            {fieldOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                        <input
                            type="text"
                            className="input-field-overlay-editor__placeholder-input"
                            placeholder="Placeholder text…"
                            value={selectedField.placeholder ?? ''}
                            onChange={(e) => updateSelectedField({ placeholder: e.target.value || undefined })}
                            aria-label="Field placeholder text"
                        />
                        <label htmlFor="inputFieldOverlayFontSize" className="input-field-overlay-editor__toolbar-label">Size</label>
                        <input
                            id="inputFieldOverlayFontSize"
                            type="number"
                            className="input-field-overlay-editor__fontsize-input"
                            min={6}
                            max={200}
                            step={1}
                            value={selectedField.fontSize ?? 14}
                            disabled={selectedField.autoFont === true}
                            onChange={(e) => {
                                const v = parseInt(e.target.value, 10);
                                if (!isNaN(v)) updateSelectedField({ fontSize: clamp(v, 6, 200) });
                            }}
                            aria-label="Font size"
                        />
                        <button
                            type="button"
                            className={`input-field-overlay-editor__auto-btn${selectedField.autoFont ? ' is-active' : ''}`}
                            onClick={() => updateSelectedField({ autoFont: !selectedField.autoFont })}
                            aria-pressed={selectedField.autoFont === true}
                            title="Toggle live auto-fit font size"
                        >
                            Auto
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={applyAutoFit}
                            title="Compute and save the best fitting font size once"
                        >
                            Fit
                        </button>
                        <div className="input-field-overlay-editor__align-group" role="group" aria-label="Text alignment">
                            {(['left', 'center', 'right'] as InputFieldOverlayAlign[]).map((a) => (
                                <button
                                    key={a}
                                    type="button"
                                    className={`input-field-overlay-editor__align-btn${(selectedField.align ?? 'left') === a ? ' is-active' : ''}`}
                                    onClick={() => updateSelectedField({ align: a })}
                                    aria-label={`Align ${a}`}
                                    aria-pressed={(selectedField.align ?? 'left') === a}
                                >
                                    {a === 'left' ? '\u2261' : a === 'center' ? '\u2263' : '\u2261'}
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            className="btn btn-outline btn-sm template-image-remove-btn"
                            onClick={deleteSelectedField}
                        >
                            Delete
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}