import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import React from 'react';

interface TileProps {
    icon: LucideIcon;
    onClick: () => void;
    content: ReactNode;
    actions?: ReactNode;
}

export default function Tile({ icon: Icon, onClick, content, actions }: TileProps) {
    function handleKeyDown(event: React.KeyboardEvent<HTMLLIElement>) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick();
        }
    }

    return (
        <li
            className={`tile${actions ? ' tile-has-actions' : ''} tile-clickable`}
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={handleKeyDown}
        >
            <div className="tile-icon" aria-hidden="true">
                <Icon size={28} strokeWidth={1.75} />
            </div>
            <div className="tile-content">{content}</div>
            {actions && (
                <div className="tile-actions" onClick={(e) => e.stopPropagation()}>
                    {actions}
                </div>
            )}
        </li>
    );
}
