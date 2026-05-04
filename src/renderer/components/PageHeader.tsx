import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
    onBack?: () => void;
    content: React.ReactNode;
}

export default function PageHeader({ onBack, content }: PageHeaderProps) {
    return (
        <div className="page-header">
            <div className="page-header-main">
                {onBack && (
                    <button type="button" className="page-header-back-btn" onClick={onBack} aria-label="Go back">
                        <ArrowLeft size={16} aria-hidden="true" />
                        Back
                    </button>
                )}
                {content}
            </div>
        </div>
    );
}
