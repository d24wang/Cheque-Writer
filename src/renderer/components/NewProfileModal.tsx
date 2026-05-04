import React, { useState } from 'react';

interface NewProfileModalProps {
    onClose: () => void;
}

interface NewProfileState {
    profileName: string;
    name: string;
}

const defaultProfile: NewProfileState = {
    profileName: '',
    name: ''
};

export default function NewProfileModal({ onClose }: NewProfileModalProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState('');
    const [profile, setProfile] = useState<NewProfileState>(defaultProfile);

    function updateField(event: React.ChangeEvent<HTMLInputElement>) {
        const { name, value } = event.target;
        setProfile((prev) => ({ ...prev, [name]: value }));
    }

    function handleCancel() {
        onClose();
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const profileName = profile.profileName.trim();

        if (!profileName) {
            setStatus('Profile name is required.');
            return;
        }

        if (!window.electronAPI?.profiles?.create) {
            setStatus('Profile API is not available in this environment.');
            return;
        }

        setIsSaving(true);
        setStatus('');

        try {
            await window.electronAPI.profiles.create(
                profileName,
                profile.name.trim() || null
            );
            setStatus('Profile created.');
            setTimeout(() => {
                onClose();
            }, 350);
        } catch (error) {
            const message = (error as Error)?.message || 'Failed to create profile.';
            setStatus(message);
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="newProfileTitle">
            <div className="modal-card">
                <h2 id="newProfileTitle">Create New Profile</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="profileName">Profile Name</label>
                        <input
                            id="profileName"
                            name="profileName"
                            value={profile.profileName}
                            onChange={updateField}
                            placeholder="Personal"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="name">Name (optional)</label>
                        <input id="name" name="name" value={profile.name} onChange={updateField} />
                    </div>

                    {status && <p className="profile-status">{status}</p>}

                    <div className="form-actions">
                        <button type="button" className="btn btn-outline" onClick={handleCancel} disabled={isSaving}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Create Profile'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
