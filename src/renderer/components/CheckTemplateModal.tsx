import React, { useState, useEffect } from 'react';
import { InputFieldOverlayEditor, type InputFieldOverlayField, type InputFieldOverlayOption } from '../../lib';
import type { CheckTemplate } from '../types.d';

interface CheckTemplateModalProps {
    profileId: number;
    existingTemplate?: CheckTemplate;
    onClose: () => void;
}

interface TemplateFormState {
    templateName: string;
    width: string;
    height: string;
    bankName: string;
    routingNumber: string;
    accountNumber: string;
}

const FIELD_KIND_OPTIONS: InputFieldOverlayOption[] = [
    { value: 'date', label: 'Date' },
    { value: 'date_month', label: 'Date Month' },
    { value: 'date_day', label: 'Date Day' },
    { value: 'date_year', label: 'Date Year (2-digit)' },
    { value: 'pay_to', label: 'Pay To' },
    { value: 'amount_number', label: 'Amount Number' },
    { value: 'amount_words', label: 'Amount Words' },
    { value: 'memo', label: 'Memo' },
    { value: 'check_number', label: 'Cheque Number' },
    { value: 'routing_number', label: 'Routing Number' },
    { value: 'account_number', label: 'Account Number' },
    { value: 'bank_name', label: 'Bank Name' },
];

const FIELD_META_SAVE_PATH = 'check_meta.json';
const DEFAULT_CHECK_WIDTH_IN = 6.25;
const DEFAULT_CHECK_HEIGHT_IN = 2.75;

const defaultForm: TemplateFormState = {
    templateName: '',
    width: '',
    height: '',
    bankName: '',
    routingNumber: '',
    accountNumber: ''
};

function toNullableNumber(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number.parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
}

function templateToForm(t: CheckTemplate): TemplateFormState {
    return {
        templateName: t.template_name,
        width: t.width != null ? String(t.width) : '',
        height: t.height != null ? String(t.height) : '',
        bankName: t.bank_name ?? '',
        routingNumber: t.routing_number ?? '',
        accountNumber: t.account_number ?? '',
    };
}

export default function CheckTemplateModal({ profileId, existingTemplate, onClose }: CheckTemplateModalProps) {
    const isEdit = existingTemplate != null;

    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState('');
    const [form, setForm] = useState<TemplateFormState>(
        isEdit ? templateToForm(existingTemplate!) : defaultForm
    );
    const [selectedImagePath, setSelectedImagePath] = useState<string | null>(null);
    const [selectedImageName, setSelectedImageName] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [existingPreviewUrl, setExistingPreviewUrl] = useState<string | null>(null);
    const [fields, setFields] = useState<InputFieldOverlayField[]>([]);

    useEffect(() => {
        if (!isEdit || !existingTemplate!.has_check_meta) return;
        window.electronAPI?.templates?.getCheckImageDataUrl?.(existingTemplate!.id, profileId)
            .then((url) => setExistingPreviewUrl(url ?? null))
            .catch(() => setExistingPreviewUrl(null));
    }, [existingTemplate?.id, isEdit, profileId]);

    useEffect(() => {
        if (!isEdit || !existingTemplate?.id) return;
        const getCheckMeta = window.electronAPI?.templates?.getCheckMeta;
        if (!getCheckMeta) return;
        getCheckMeta(existingTemplate.id, profileId, FIELD_META_SAVE_PATH)
            .then((data) => {
                if (Array.isArray(data)) {
                    setFields(data as InputFieldOverlayField[]);
                }
            })
            .catch(() => {
                setFields([]);
            });
    }, [existingTemplate?.id, isEdit, profileId]);

    function updateField(event: React.ChangeEvent<HTMLInputElement>) {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    }

    async function handlePickImage() {
        try {
            const picker = window.electronAPI?.dialog?.pickImageFile;
            if (!picker) {
                setStatus('Image picker is unavailable. Restart the desktop app and try again.');
                return;
            }
            const picked = await picker();
            if (!picked) return;
            setSelectedImagePath(picked.filePath);
            setSelectedImageName(picked.filePath.split(/[\/\\]/).pop() ?? picked.filePath);
            setPreviewUrl(picked.dataUrl);
            setStatus('');
        } catch {
            setStatus('Unable to open the image picker. Please try again.');
        }
    }

    function handleRemoveImage() {
        setSelectedImagePath(null);
        setSelectedImageName(null);
        setPreviewUrl(null);
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const templateName = form.templateName.trim();
        if (!templateName) {
            setStatus('Template name is required.');
            return;
        }

        const width = toNullableNumber(form.width);
        const height = toNullableNumber(form.height);
        if ((form.width.trim() && width === null) || (form.height.trim() && height === null)) {
            setStatus('Width and height must be valid numbers.');
            return;
        }

        setIsSaving(true);
        setStatus('');

        try {
            let templateId: number;

            if (isEdit) {
                if (!window.electronAPI?.templates?.update) {
                    throw new Error('Template API is not available in this environment.');
                }
                await window.electronAPI.templates.update(existingTemplate!.id, {
                    template_name: templateName,
                    width: width,
                    height: height,
                    bank_name: form.bankName.trim() || null,
                    routing_number: form.routingNumber.trim() || null,
                    account_number: form.accountNumber.trim() || null,
                });
                templateId = existingTemplate!.id;
                setStatus('Cheque template updated.');
            } else {
                if (!window.electronAPI?.templates?.create) {
                    throw new Error('Template API is not available in this environment.');
                }
                const created = await window.electronAPI.templates.create(
                    profileId,
                    templateName,
                    width,
                    height,
                    form.bankName.trim() || null,
                    form.routingNumber.trim() || null,
                    form.accountNumber.trim() || null
                );
                if (!created?.id) throw new Error('Failed to create cheque template.');
                templateId = created.id;
                setStatus('Cheque template created.');
            }

            if (selectedImagePath) {
                const saveCheckImage = window.electronAPI?.templates?.saveCheckImage;
                if (!saveCheckImage) {
                    throw new Error('Image API is unavailable. Please restart the desktop app.');
                }
                const ext = selectedImagePath.split('.').pop() ?? 'png';
                await saveCheckImage(templateId, profileId, selectedImagePath, ext);
            }

            const saveCheckMeta = window.electronAPI?.templates?.saveCheckMeta;
            if (!saveCheckMeta) {
                throw new Error('Field metadata API is unavailable. Please restart the desktop app.');
            }
            await saveCheckMeta(templateId, profileId, FIELD_META_SAVE_PATH, fields);

            setTimeout(() => {
                onClose();
            }, 350);
        } catch (error) {
            const message = (error as Error)?.message || 'Failed to save cheque template.';
            setStatus(message);
        } finally {
            setIsSaving(false);
        }
    }

    const displayPreviewUrl = previewUrl ?? existingPreviewUrl;
    const widthPreview = toNullableNumber(form.width) ?? DEFAULT_CHECK_WIDTH_IN;
    const heightPreview = toNullableNumber(form.height) ?? DEFAULT_CHECK_HEIGHT_IN;

    return (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="templateModalTitle">
            <div className="modal-card template-modal-card">
                <h2 id="templateModalTitle">{isEdit ? 'Edit Cheque Template' : 'Create New Cheque Template'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="templateName">Template Name</label>
                        <input
                            id="templateName"
                            name="templateName"
                            value={form.templateName}
                            onChange={updateField}
                            placeholder="Default Template"
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="width">Width (optional)</label>
                            <input
                                id="width"
                                name="width"
                                value={form.width}
                                onChange={updateField}
                                inputMode="decimal"
                                placeholder="e.g. 8.5"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="height">Height (optional)</label>
                            <input
                                id="height"
                                name="height"
                                value={form.height}
                                onChange={updateField}
                                inputMode="decimal"
                                placeholder="e.g. 3.5"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="bankName">Bank Name (optional)</label>
                        <input
                            id="bankName"
                            name="bankName"
                            value={form.bankName}
                            onChange={updateField}
                            placeholder="Your Bank"
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="routingNumber">Routing Number (optional)</label>
                            <input
                                id="routingNumber"
                                name="routingNumber"
                                value={form.routingNumber}
                                onChange={updateField}
                                placeholder="123456789"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="accountNumber">Account Number (optional)</label>
                            <input
                                id="accountNumber"
                                name="accountNumber"
                                value={form.accountNumber}
                                onChange={updateField}
                                placeholder="000123456789"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Cheque Image (optional)</label>
                        {!selectedImagePath && !existingPreviewUrl ? (
                            <div className="template-image-pick-row">
                                <button
                                    type="button"
                                    className="btn btn-outline template-image-pick-btn"
                                    onClick={handlePickImage}
                                >
                                    Choose Image
                                </button>
                            </div>
                        ) : (
                            <div className="template-image-preview-container">
                                <InputFieldOverlayEditor
                                    imageUrl={displayPreviewUrl ?? ''}
                                    previewWidthIn={widthPreview}
                                    previewHeightIn={heightPreview}
                                    fields={fields}
                                    fieldOptions={FIELD_KIND_OPTIONS}
                                    onChange={setFields}
                                />
                                <div className="template-image-preview-actions">
                                    <span className="template-image-filename">
                                        {selectedImageName ?? 'Saved image'}
                                    </span>
                                    <span className="template-image-field-count">{fields.length} field{fields.length === 1 ? '' : 's'}</span>
                                    <button
                                        type="button"
                                        className="btn btn-outline template-image-pick-btn btn-sm"
                                        onClick={handlePickImage}
                                    >
                                        Replace
                                    </button>
                                    {selectedImagePath && (
                                        <button
                                            type="button"
                                            className="btn btn-outline btn-sm template-image-remove-btn"
                                            onClick={handleRemoveImage}
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {status && <p className="profile-status">{status}</p>}

                    <div className="form-actions">
                        <button type="button" className="btn btn-outline" onClick={onClose} disabled={isSaving}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={isSaving}>
                            {isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Template'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
