import { useEffect, useState } from 'react';
import { CircleUserRound, User, Banknote, Pencil } from 'lucide-react';
import type { CheckTemplate, Profile } from '../types.d';
import Button from '../components/Button';
import CheckTemplateModal from '../components/CheckTemplateModal';
import PageHeader from '../components/PageHeader';
import Tile from '../components/Tile';

interface ProfileDetailPageProps {
    profile: Profile;
    onBack: () => void;
    onSelectTemplate: (profile: Profile, template: CheckTemplate) => void;
}

export default function ProfileDetailPage({ profile, onBack, onSelectTemplate }: ProfileDetailPageProps) {
    const [templates, setTemplates] = useState<CheckTemplate[]>([]);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
    const [templateError, setTemplateError] = useState<string | null>(null);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<CheckTemplate | null>(null);
    const [templateReloadKey, setTemplateReloadKey] = useState(0);

    useEffect(() => {
        let isCancelled = false;

        async function loadTemplates() {
            if (!window.electronAPI?.templates?.list) {
                if (!isCancelled) {
                    setTemplates([]);
                    setTemplateError('Template API is not available in this environment.');
                    setIsLoadingTemplates(false);
                }
                return;
            }

            setIsLoadingTemplates(true);
            setTemplateError(null);
            try {
                const result = await window.electronAPI.templates.list(profile.id);
                if (!isCancelled) {
                    setTemplates(result);
                }
            } catch (error) {
                if (!isCancelled) {
                    setTemplateError((error as Error)?.message || 'Failed to load cheque templates.');
                    setTemplates([]);
                }
            } finally {
                if (!isCancelled) {
                    setIsLoadingTemplates(false);
                }
            }
        }

        loadTemplates();

        return () => {
            isCancelled = true;
        };
    }, [profile.id, templateReloadKey]);

    function handleTemplateModalClose() {
        setIsTemplateModalOpen(false);
        setEditingTemplate(null);
        setTemplateReloadKey((value) => value + 1);
    }

    function handleOpenNewTemplate() {
        setEditingTemplate(null);
        setIsTemplateModalOpen(true);
    }

    function handleOpenEditTemplate(template: CheckTemplate) {
        setEditingTemplate(template);
        setIsTemplateModalOpen(true);
    }

    return (
        <section className="profile-detail-page">
            <PageHeader
                onBack={onBack}
                content={(
                    <>
                        <h2 className="profile-detail-title">
                            <CircleUserRound size={20} aria-hidden="true" />
                            {profile.profile_name}
                        </h2>
                        <div className="page-header-actions">
                            <Button
                                icon="Banknote"
                                overlayIcon="Plus"
                                overlayIconProps={{ strokeWidth: 4, size: 8 }}
                                title="create new cheque template"
                                action={() => handleOpenNewTemplate()}
                                classes={["btn", "btn-primary"]}
                            />
                        </div>
                    </>
                )}
            />

            <div className="profile-detail-card">
                <h3 className="profile-detail-section-heading">Account Holder</h3>
                <dl className="profile-detail-list">
                    <div className="profile-detail-row">
                        <dt className="profile-detail-label">
                            <User size={14} aria-hidden="true" />
                            Name
                        </dt>
                        <dd className="profile-detail-value">
                            {profile.name ?? <span className="profile-detail-empty">—</span>}
                        </dd>
                    </div>
                </dl>
            </div>

            <div className="profile-detail-divider" aria-hidden="true" />

            <section className="profile-detail-templates">
                <h3 className="profile-detail-section-heading">Cheque Templates</h3>

                {isLoadingTemplates && <p className="profile-detail-message">Loading templates...</p>}

                {!isLoadingTemplates && templateError && (
                    <p className="profile-detail-message profile-detail-error">{templateError}</p>
                )}

                {!isLoadingTemplates && !templateError && templates.length === 0 && (
                    <p className="profile-detail-message profile-detail-empty-message">No cheque templates found for this profile.</p>
                )}

                {!isLoadingTemplates && !templateError && templates.length > 0 && (
                    <ul className="profile-list">
                        {templates.map((template) => (
                            <Tile
                                key={template.id}
                                icon={Banknote}
                                onClick={() => onSelectTemplate(profile, template)}
                                actions={
                                    <button
                                        className="tile-action-btn"
                                        aria-label={`Edit ${template.template_name}`}
                                        onClick={() => handleOpenEditTemplate(template)}
                                    >
                                        <Pencil size={15} strokeWidth={1.75} />
                                    </button>
                                }
                                content={(
                                    <>
                                        <div className="profile-list-item-name">{template.template_name}</div>
                                        <div className="profile-list-item-detail">
                                            {template.width && template.height
                                                ? `${template.width} x ${template.height}`
                                                : 'No size specified'}
                                        </div>
                                    </>
                                )}
                            />
                        ))}
                    </ul>
                )}
            </section>

            {isTemplateModalOpen && (
                <CheckTemplateModal
                    profileId={profile.id}
                    existingTemplate={editingTemplate ?? undefined}
                    onClose={handleTemplateModalClose}
                />
            )}

        </section>
    );
}
