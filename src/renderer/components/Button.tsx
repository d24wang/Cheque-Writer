import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ButtonProps {
    icon: keyof typeof LucideIcons;
    overlayIcon?: keyof typeof LucideIcons;
    overlayIconProps?: {
        strokeWidth?: number;
        color?: string;
        size?: number;
    };
    title: string;
    action: () => void;
    classes?: string[];
}

export default function Button({ icon, overlayIcon, overlayIconProps, title, action, classes }: ButtonProps) {
    const Icon = LucideIcons[icon] as LucideIcon | undefined;
    const OverlayIcon = overlayIcon ? (LucideIcons[overlayIcon] as LucideIcon | undefined) : undefined;
    const className = ['check-writer-btn', ...(classes ?? [])].join(' ');

    if (!Icon || (overlayIcon && !OverlayIcon)) {
        return null;
    }

    return (
        <button type="button" title={title} onClick={action} className={className}>
            {!OverlayIcon && <Icon size={20} aria-hidden="true" />}
            {OverlayIcon && (
                <span className="check-writer-icon-stack" aria-hidden="true">
                    <Icon className="check-writer-icon-stack-base" />
                    <span className="check-writer-icon-stack-overlay-wrap">
                        <OverlayIcon
                            className="check-writer-icon-stack-overlay"
                            strokeWidth={overlayIconProps?.strokeWidth}
                            color={overlayIconProps?.color}
                            size={overlayIconProps?.size}
                        />
                    </span>
                </span>
            )}
        </button>
    );
}