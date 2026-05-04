import React, { useEffect, useState } from 'react';
import { Copy, PenLine, Trash2 } from 'lucide-react';
import type { Check, CheckTemplate } from '../types.d';
import CheckFormAndPreview from '../components/CheckFormAndPreview';
import PageHeader from '../components/PageHeader';
import type { InputFieldOverlayField } from '../../lib';

const FIELD_META_SAVE_PATH = 'check_meta.json';

function formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${month}/${day}/${year}`;
}

function formatSavedTimestamp(value: string): string {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString();
}

function formatAmount(value: number): string {
    return Number(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function getTodayDateInputValue(): string {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

interface FormState {
    checkDate: string;
    payTo: string;
    amount: string;
    memo: string;
}

interface PreviewData {
    date: string;
    payTo: string;
    amount: number;
    memo: string;
}

const defaultForm: FormState = {
    checkDate: getTodayDateInputValue(),
    payTo: '',
    amount: '',
    memo: ''
};

interface CheckWritingPageProps {
    template?: CheckTemplate;
    onBack: () => void;
}

export default function CheckWritingPage({ template, onBack }: CheckWritingPageProps) {
    const [form, setForm] = useState<FormState>(defaultForm);
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [templatePreviewUrl, setTemplatePreviewUrl] = useState<string | null>(null);
    const [templateFields, setTemplateFields] = useState<InputFieldOverlayField[]>([]);
    const [showImageInPrint, setShowImageInPrint] = useState(false);
    const [savedChecks, setSavedChecks] = useState<Check[]>([]);
    const [selectedSavedCheckId, setSelectedSavedCheckId] = useState<number | null>(null);
    const [saveStatus, setSaveStatus] = useState('');
    const [isSavingCheck, setIsSavingCheck] = useState(false);

    // Load template preview and fields
    useEffect(() => {
        let disposed = false;

        async function loadTemplatePreview() {
            if (!template) {
                setTemplatePreviewUrl(null);
                setTemplateFields([]);
                return;
            }

            const getImage = window.electronAPI?.templates?.getCheckImageDataUrl;
            const getMeta = window.electronAPI?.templates?.getCheckMeta;

            if (!getImage || !getMeta) {
                setTemplatePreviewUrl(null);
                setTemplateFields([]);
                return;
            }

            try {
                const [imageDataUrl, metaData] = await Promise.all([
                    getImage(template.id, template.profile_id),
                    getMeta(template.id, template.profile_id, FIELD_META_SAVE_PATH),
                ]);

                if (disposed) return;

                setTemplatePreviewUrl(imageDataUrl ?? null);
                setTemplateFields(Array.isArray(metaData) ? (metaData as InputFieldOverlayField[]) : []);
            } catch {
                if (disposed) return;
                setTemplatePreviewUrl(null);
                setTemplateFields([]);
            }
        }

        void loadTemplatePreview();

        return () => {
            disposed = true;
        };
    }, [template]);

    useEffect(() => {
        let disposed = false;

        async function loadSavedChecks() {
            if (!template) {
                setSavedChecks([]);
                return;
            }

            const listChecks = window.electronAPI?.checks?.list;
            if (!listChecks) {
                setSavedChecks([]);
                return;
            }

            try {
                const items = await listChecks(template.id);
                if (!disposed) {
                    setSavedChecks(items);
                }
            } catch {
                if (!disposed) {
                    setSavedChecks([]);
                }
            }
        }

        void loadSavedChecks();

        return () => {
            disposed = true;
        };
    }, [template]);

    function getFormDataOrNull(): PreviewData | null {
        const amount = Number.parseFloat(form.amount);
        if (Number.isNaN(amount) || amount <= 0) {
            window.alert('Please enter a valid amount.');
            return null;
        }

        return {
            date: form.checkDate,
            payTo: form.payTo,
            amount,
            memo: form.memo
        };
    }

    function handleFormChange(field: string, value: string) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    function handlePreview() {
        const data = getFormDataOrNull();
        if (!data) return;
        setPreviewData(data);
    }

    async function handleSave() {
        if (!template) {
            setSaveStatus('Choose a cheque template before saving.');
            return;
        }

        const createCheck = window.electronAPI?.checks?.create;
        const updateCheck = window.electronAPI?.checks?.update;
        const listChecks = window.electronAPI?.checks?.list;
        if (!createCheck || !updateCheck || !listChecks) {
            setSaveStatus('Check save API is unavailable. Please restart the desktop app.');
            return;
        }

        const data = getFormDataOrNull();
        if (!data) return;

        setPreviewData(data);
        setIsSavingCheck(true);
        setSaveStatus('');

        try {
            let savedId: number;

            if (selectedSavedCheckId != null) {
                // Update the loaded cheque in-place.
                await updateCheck(selectedSavedCheckId, {
                    pay_to: data.payTo,
                    amount: data.amount,
                    memo: data.memo || null,
                    date: data.date,
                });
                savedId = selectedSavedCheckId;
                setSaveStatus('Cheque updated.');
            } else {
                const created = await createCheck(
                    template.id,
                    null,
                    data.payTo,
                    data.amount,
                    data.memo || null,
                    data.date,
                );
                savedId = created.id;
                setSaveStatus('Cheque saved.');
            }

            const items = await listChecks(template.id);
            setSavedChecks(items);
            setSelectedSavedCheckId(savedId);
        } catch (error) {
            const message = (error as Error)?.message || 'Failed to save cheque.';
            setSaveStatus(message);
        } finally {
            setIsSavingCheck(false);
        }
    }

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const data = getFormDataOrNull();
        if (!data) return;
        setPreviewData(data);

        // Wait for React to commit preview state before opening print.
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                window.print();
            });
        });
    }

    function handleReset() {
        setForm(defaultForm);
        setPreviewData(null);
        setSelectedSavedCheckId(null);
    }

    function handleLoadSavedCheck(check: Check) {
        const nextForm: FormState = {
            checkDate: check.date || getTodayDateInputValue(),
            payTo: check.pay_to || '',
            amount: check.amount != null ? String(check.amount) : '',
            memo: check.memo || '',
        };

        setForm(nextForm);
        if (check.amount != null && check.amount > 0) {
            setPreviewData({
                date: nextForm.checkDate,
                payTo: nextForm.payTo,
                amount: check.amount,
                memo: nextForm.memo,
            });
        } else {
            setPreviewData(null);
        }
        setSelectedSavedCheckId(check.id);
        setSaveStatus('');
    }

    function handleCopySavedCheck(event: React.MouseEvent, check: Check) {
        event.stopPropagation();
        const nextForm: FormState = {
            checkDate: check.date || getTodayDateInputValue(),
            payTo: check.pay_to || '',
            amount: check.amount != null ? String(check.amount) : '',
            memo: check.memo || '',
        };
        setForm(nextForm);
        if (check.amount != null && check.amount > 0) {
            setPreviewData({
                date: nextForm.checkDate,
                payTo: nextForm.payTo,
                amount: check.amount,
                memo: nextForm.memo,
            });
        } else {
            setPreviewData(null);
        }
        // Clear selection so saving will create a new cheque.
        setSelectedSavedCheckId(null);
        setSaveStatus('');
    }

    async function handleDeleteSavedCheck(event: React.MouseEvent, checkId: number) {
        event.stopPropagation();

        const deleteCheck = window.electronAPI?.checks?.delete;
        const listChecks = window.electronAPI?.checks?.list;
        if (!deleteCheck || !listChecks || !template) return;

        try {
            await deleteCheck(checkId);
            const items = await listChecks(template.id);
            setSavedChecks(items);
            if (selectedSavedCheckId === checkId) {
                setSelectedSavedCheckId(null);
            }
        } catch (error) {
            const message = (error as Error)?.message || 'Failed to delete cheque.';
            setSaveStatus(message);
        }
    }

    return (
        <section className="check-writing-page">
            <PageHeader
                onBack={onBack}
                content={(
                    <h2 className="profile-detail-title">
                        <PenLine size={20} aria-hidden="true" />
                        {template ? `Write a Cheque — ${template.template_name}` : 'Write a Cheque'}
                    </h2>
                )}
            />

            <CheckFormAndPreview
                template={template}
                form={form}
                previewData={previewData}
                templatePreviewUrl={templatePreviewUrl}
                templateFields={templateFields}
                showImageInPrint={showImageInPrint}
                selectedSavedCheckId={selectedSavedCheckId}
                isSavingCheck={isSavingCheck}
                saveStatus={saveStatus}
                onFormChange={handleFormChange}
                onPreview={handlePreview}
                onSave={handleSave}
                onSubmit={handleSubmit}
                onReset={handleReset}
                onShowImageInPrintChange={setShowImageInPrint}
            />

            {savedChecks.length > 0 && (
                <section className="check-preview-section saved-checks-section" aria-labelledby="savedChequesTitle">
                    <div className="saved-checks-panel">
                        <h2 id="savedChequesTitle">Saved Cheques</h2>
                        <div className="saved-checks-list" role="list" aria-label="Saved cheques">
                            {savedChecks.map((check) => (
                                <button
                                    key={check.id}
                                    type="button"
                                    className={`saved-check-card${selectedSavedCheckId === check.id ? ' is-selected' : ''}`}
                                    role="listitem"
                                    onClick={() => handleLoadSavedCheck(check)}
                                >
                                    <div className="saved-check-card__row">
                                        <strong>{check.pay_to || 'Unnamed payee'}</strong>
                                        <span>{check.amount != null ? `$${formatAmount(check.amount)}` : ''}</span>
                                    </div>
                                    <div className="saved-check-card__meta">
                                        <span>{check.date ? formatDate(check.date) : 'No date'}</span>
                                        <span>{check.memo || 'No memo'}</span>
                                    </div>
                                    <div className="saved-check-card__footer">
                                        <span className="saved-check-card__timestamp">
                                            Saved {formatSavedTimestamp(check.created_at)}
                                        </span>
                                        <div className="saved-check-card__actions">
                                            <button
                                                type="button"
                                                className="saved-check-card__copy-btn"
                                                aria-label="Copy cheque to form"
                                                onClick={(e) => handleCopySavedCheck(e, check)}
                                            >
                                                <Copy size={14} aria-hidden="true" />
                                            </button>
                                            <button
                                                type="button"
                                                className="saved-check-card__delete-btn"
                                                aria-label="Delete cheque"
                                                onClick={(e) => handleDeleteSavedCheck(e, check.id)}
                                            >
                                                <Trash2 size={14} aria-hidden="true" />
                                            </button>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </section>
    );
}
