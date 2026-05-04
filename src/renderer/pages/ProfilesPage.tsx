import { useEffect, useState } from 'react';
import { CircleUserRound, UserRoundX } from 'lucide-react';
import type { CheckTemplate, Profile } from '../types.d';
import Button from '../components/Button';
import PageHeader from '../components/PageHeader';
import Tile from '../components/Tile';
import NewProfileModal from '../components/NewProfileModal';
import ProfileDetailPage from './ProfileDetailPage';

interface ProfilesPageProps {
    onSelectTemplate: (profile: Profile, template: CheckTemplate) => void;
    initialProfile?: Profile;
}

export default function ProfilesPage({ onSelectTemplate, initialProfile }: ProfilesPageProps) {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(initialProfile ?? null);

    const hasProfiles = profiles.length > 0;
    const showMessage = !isLoading;
    const message = error
        ? error
        : hasProfiles
            ? 'Select an existing profile, or create a new one to get started.'
            : 'No profiles yet. Create one to get started.';
    const showCreateButton = !isLoading && !error;

    async function loadProfiles() {
        if (!window.electronAPI?.profiles?.list) return;
        setIsLoading(true);
        setError(null);
        try {
            const result = await window.electronAPI.profiles.list();
            setProfiles(result);
        } catch (err) {
            setError((err as Error)?.message || 'Failed to load profiles.');
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        loadProfiles();
    }, []);

    function handleModalClose() {
        setIsModalOpen(false);
        loadProfiles();
    }

    if (selectedProfile) {
        return <ProfileDetailPage profile={selectedProfile} onBack={() => setSelectedProfile(null)} onSelectTemplate={onSelectTemplate} />;
    }

    return (
        <section className="profile-page">
            {isLoading && <p className="profile-page-message">Loading profiles...</p>}

            {showMessage && (
                <PageHeader
                    content={(
                        <div className="page-header-content">
                            <p className={`profile-page-message${error ? ' profile-page-error' : ''}`}>{message}</p>
                            {showCreateButton && (
                                <div className="page-header-actions">
                                    <Button
                                        icon="UserRoundPlus"
                                        title="create new user"
                                        action={() => setIsModalOpen(true)}
                                        classes={["btn", "btn-primary"]}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                />
            )}

            {!isLoading && <div className="profile-page-divider" aria-hidden="true" />}

            {!isLoading && !error && !hasProfiles && (
                <div className="profile-page-empty-icon" aria-hidden="true">
                    <UserRoundX size={96} strokeWidth={1.75} />
                </div>
            )}

            {!isLoading && !error && hasProfiles && (
                <>
                    <ul className="profile-list">
                        {profiles.map((profile) => (
                            <Tile
                                key={profile.id}
                                icon={CircleUserRound}
                                onClick={() => setSelectedProfile(profile)}
                                content={(
                                    <>
                                        <div className="profile-list-item-name">
                                            <span>{profile.profile_name}</span>
                                        </div>
                                        {profile.name && <div className="profile-list-item-detail">{profile.name}</div>}
                                    </>
                                )}
                            />
                        ))}
                    </ul>
                </>
            )}

            {isModalOpen && <NewProfileModal onClose={handleModalClose} />}
        </section>
    );
}
