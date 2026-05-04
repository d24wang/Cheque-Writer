import React, { useMemo } from 'react';
import type { Check, CheckTemplate } from '../types.d';
import { CheckImagePreview } from '../../lib';
import type { InputFieldOverlayField } from '../../lib';

function numberToWords(amount: number): string {
    if (Number.isNaN(amount) || amount <= 0) return '';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
        'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen',
        'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function convertBelow1000(n: number): string {
        if (n === 0) return '';
        if (n < 20) return ones[n];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? `-${ones[n % 10]}` : '');
        return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ` ${convertBelow1000(n % 100)}` : '');
    }

    const dollars = Math.floor(amount);
    const cents = Math.round((amount - dollars) * 100);

    let words = '';
    if (dollars >= 1000000) {
        words += convertBelow1000(Math.floor(dollars / 1000000)) + ' Million ';
    }
    if (dollars >= 1000) {
        words += convertBelow1000(Math.floor((dollars % 1000000) / 1000)) + ' Thousand ';
    }
    words += convertBelow1000(dollars % 1000);

    if (cents > 0) {
        words += ` & ${String(cents).padStart(2, '0')}`;
    } else {
        words += ' & 00';
    }

    return words.trim();
}

function formatAmount(value: number): string {
    return Number(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${month}/${day}/${year}`;
}

function getDateParts(dateStr: string): { month: string; day: string; year2: string; } {
    if (!dateStr) return { month: '', day: '', year2: '' };
    const [year = '', month = '', day = ''] = dateStr.split('-');
    return {
        month: month.padStart(2, '0').slice(-2),
        day: day.padStart(2, '0').slice(-2),
        year2: year.slice(-2),
    };
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

interface CheckFormAndPreviewProps {
    template?: CheckTemplate;
    form: FormState;
    previewData: PreviewData | null;
    templatePreviewUrl: string | null;
    templateFields: InputFieldOverlayField[];
    showImageInPrint: boolean;
    selectedSavedCheckId: number | null;
    isSavingCheck: boolean;
    saveStatus: string;
    onFormChange: (field: string, value: string) => void;
    onPreview: () => void;
    onSave: () => Promise<void>;
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
    onReset: () => void;
    onShowImageInPrintChange: (checked: boolean) => void;
}

const DEFAULT_PRINT_WIDTH_IN = 6.25;
const DEFAULT_PRINT_HEIGHT_IN = 2.75;

export default function CheckFormAndPreview({
    template,
    form,
    previewData,
    templatePreviewUrl,
    templateFields,
    showImageInPrint,
    selectedSavedCheckId,
    isSavingCheck,
    saveStatus,
    onFormChange,
    onPreview,
    onSave,
    onSubmit,
    onReset,
    onShowImageInPrintChange,
}: CheckFormAndPreviewProps) {
    const amountValue = Number.parseFloat(form.amount);
    const amountWords = useMemo(() => {
        if (Number.isNaN(amountValue) || amountValue <= 0) return '';
        return numberToWords(amountValue);
    }, [amountValue]);

    const hasOverlayPreview = templatePreviewUrl != null && templateFields.length > 0;
    const printWidthIn = template?.width && template.width > 0 ? template.width : DEFAULT_PRINT_WIDTH_IN;
    const printHeightIn = template?.height && template.height > 0 ? template.height : DEFAULT_PRINT_HEIGHT_IN;

    function getOverlayFieldValue(field: InputFieldOverlayField, data: PreviewData): string {
        const dateParts = getDateParts(data.date);

        switch (field.kind) {
            case 'date':
                return formatDate(data.date);
            case 'date_month':
                return dateParts.month;
            case 'date_day':
                return dateParts.day;
            case 'date_year':
                return dateParts.year2;
            case 'pay_to':
                return data.payTo;
            case 'amount_number':
                return formatAmount(data.amount);
            case 'amount_words':
                return numberToWords(data.amount);
            case 'memo':
                return data.memo;
            case 'routing_number':
                return template?.routing_number ?? '';
            case 'account_number':
                return template?.account_number ?? '';
            case 'bank_name':
                return template?.bank_name ?? '';
            default:
                return field.placeholder ?? '';
        }
    }

    function handleFieldChange(event: React.ChangeEvent<HTMLInputElement>) {
        const { name, value } = event.target;
        onFormChange(name, value);
    }

    return (
        <>
            <section className="check-form-section">
                <form id="checkForm" onSubmit={onSubmit} onReset={onReset}>
                    <div className="form-group">
                        <label htmlFor="checkDate">Date</label>
                        <input type="date" id="checkDate" name="checkDate" value={form.checkDate} onChange={handleFieldChange} required />
                    </div>

                    <div className="form-group">
                        <label htmlFor="payTo">Pay to the Order of</label>
                        <input type="text" id="payTo" name="payTo" placeholder="Recipient name" value={form.payTo} onChange={handleFieldChange} required />
                    </div>

                    <div className="form-row">
                        <div className="form-group amount-group">
                            <label htmlFor="amount">Amount ($)</label>
                            <input type="number" id="amount" name="amount" min="0.01" step="0.01" placeholder="0.00" value={form.amount} onChange={handleFieldChange} required />
                        </div>
                        <div className="form-group amount-words-group">
                            <label>Amount in Words</label>
                            <div id="amountWords" className="amount-words-display">{amountWords}</div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="memo">Memo</label>
                        <input type="text" id="memo" name="memo" placeholder="Optional note" value={form.memo} onChange={handleFieldChange} />
                    </div>

                    <div className="form-group form-group-inline">
                        <label className="checkbox-label" htmlFor="showImageInPrint">
                            <input
                                id="showImageInPrint"
                                type="checkbox"
                                checked={showImageInPrint}
                                onChange={(event) => onShowImageInPrintChange(event.target.checked)}
                            />
                            Show cheque image when printing
                        </label>
                    </div>

                    <div className="form-actions">
                        <button type="button" id="previewBtn" className="btn btn-secondary" onClick={onPreview}>Preview</button>
                        <button type="button" className="btn btn-secondary" onClick={onSave} disabled={isSavingCheck}>
                            {isSavingCheck ? 'Saving...' : selectedSavedCheckId != null ? 'Update Cheque' : 'Save Cheque'}
                        </button>
                        <button type="submit" className="btn btn-primary">Print Cheque</button>
                        <button type="reset" className="btn btn-outline">Clear</button>
                    </div>
                    {saveStatus && <p className="profile-status">{saveStatus}</p>}
                </form>
            </section>

            <section
                className="check-preview-section"
                id="checkPreview"
                hidden={!previewData}
                style={{
                    '--print-check-width': `${printWidthIn}in`,
                    '--print-check-height': `${printHeightIn}in`,
                    '--print-check-image-visibility': showImageInPrint ? 'visible' : 'hidden',
                } as React.CSSProperties}
            >
                <h2>Cheque Preview</h2>
                {hasOverlayPreview && previewData ? (
                    <CheckImagePreview
                        imageUrl={templatePreviewUrl ?? ''}
                        fields={templateFields}
                        fieldValues={Object.fromEntries(
                            templateFields.map((f) => [f.id, getOverlayFieldValue(f, previewData)])
                        )}
                    />
                ) : (
                    <div className="check-display">
                        <div className="check-header-row">
                            <div className="check-from">
                                <div id="previewFrom" className="check-from-name">Your Name</div>
                                <div className="check-from-address">Your Address</div>
                            </div>
                            <div className="check-number-date">
                                <div id="previewDate">{previewData ? formatDate(previewData.date) : ''}</div>
                            </div>
                        </div>
                        <div className="check-payto-row">
                            <span className="check-label">Pay to the Order of</span>
                            <span id="previewPayTo" className="check-payto-name">{previewData?.payTo || ''}</span>
                            <span className="check-dollar">$</span>
                            <span id="previewAmount" className="check-amount-box">
                                {previewData ? formatAmount(previewData.amount) : ''}
                            </span>
                        </div>
                        <div className="check-words-row">
                            <span id="previewWords" className="check-amount-words">
                                {previewData ? numberToWords(previewData.amount) : ''}
                            </span>
                            <span className="check-dollars-label">DOLLARS</span>
                        </div>
                        <div className="check-bottom-row">
                            <div className="check-memo">
                                <span className="check-label">Memo:</span>
                                <span id="previewMemo"> {previewData?.memo || ''}</span>
                            </div>
                        </div>
                        <div className="check-micr" />
                    </div>
                )}
            </section>
        </>
    );
}
