import { useEffect, useState } from 'react';
import CheckWritingPage from './pages/CheckWritingPage';
import ProfilesPage from './pages/ProfilesPage';
import NewProfileModal from './components/NewProfileModal';
import type { CheckTemplate, Profile } from './types.d';

type Page = 'profiles' | 'check-writing';

export default function App() {
    const [currentPage, setCurrentPage] = useState<Page>('profiles');
    const [selectedTemplate, setSelectedTemplate] = useState<CheckTemplate | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    function handleSelectTemplate(profile: Profile, template: CheckTemplate) {
        setSelectedProfile(profile);
        setSelectedTemplate(template);
        setCurrentPage('check-writing');
    }

    function handleBackFromCheckWriting() {
        setCurrentPage('profiles');
        setSelectedTemplate(null);
        // selectedProfile is kept so ProfilesPage restores the detail view
    }

    useEffect(() => {
        if (!window.electronAPI?.menu?.onNewProfile) return undefined;

        return window.electronAPI.menu.onNewProfile(() => {
            setIsProfileModalOpen(true);
        });
    }, []);

    return (
        <div className="app-container">
            <main className="app-main">
                {currentPage === 'profiles' && <ProfilesPage onSelectTemplate={handleSelectTemplate} initialProfile={selectedProfile ?? undefined} />}
                {currentPage === 'check-writing' && <CheckWritingPage template={selectedTemplate ?? undefined} onBack={handleBackFromCheckWriting} />}
            </main>

            {isProfileModalOpen && (
                <NewProfileModal onClose={() => setIsProfileModalOpen(false)} />
            )}
        </div>
    );
}
