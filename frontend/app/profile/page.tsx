"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL, apiFetch } from "@/lib/api";
import { useSession } from "@/lib/session";

interface WorkerProfileData {
    skills?: string[];
    pendingSkills?: string[];
    experience?: number;
}

export default function ProfilePage() {
    const router = useRouter();
    const session = useSession();
    const user = session?.user ?? null;
    const token = session?.token ?? null;
    const [skills, setSkills] = useState<string[]>([]);
    const [pendingSkills, setPendingSkills] = useState<string[]>([]);
    const [experience, setExperience] = useState(0);
    const [message, setMessage] = useState("");
    const [availableSkills, setAvailableSkills] = useState<string[]>([]);

    useEffect(() => {
        let cancelled = false;

        const loadCategories = async () => {
            try {
                const res = await fetch(`${API_URL}/api/services/categories`);
                if (res.ok && !cancelled) {
                    const data = (await res.json()) as { category: string }[];
                    setAvailableSkills(data.map((item) => item.category));
                }
            } catch {
                console.error("Failed to load service categories");
            }
        };

        void loadCategories();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (session && !token) {
            router.replace("/login");
        }
    }, [session, token, router]);

    useEffect(() => {
        if (!token || !user || user.role !== "worker") return;
        let cancelled = false;

        const loadProfile = async () => {
            try {
                const res = await apiFetch(`${API_URL}/api/workers/profile/${user._id}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (!res.ok) {
                    if (!cancelled) setMessage("Failed to load profile");
                    return;
                }
                const data = (await res.json()) as WorkerProfileData;
                if (!cancelled) {
                    setSkills(data.skills || []);
                    setPendingSkills(data.pendingSkills || []);
                    setExperience(data.experience || 0);
                }
            } catch {
                if (!cancelled) setMessage("Failed to load profile");
            }
        };

        void loadProfile();
        return () => { cancelled = true; };
    }, [token, user]);

    const handleSkillToggle = (skill: string) => {
        if (skills.includes(skill)) {
            setSkills(skills.filter(s => s !== skill));
        } else {
            setSkills([...skills, skill]);
        }
    };

    const handleUpdate = async () => {
        if (!token) return;
        try {
            const res = await apiFetch(API_URL + "/api/workers/update-profile", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ skills, experience })
            });

            if (res.ok) {
                const data = (await res.json()) as WorkerProfileData;
                setSkills(data.skills || []);
                setPendingSkills(data.pendingSkills || []);
                setMessage(
                    data.pendingSkills && data.pendingSkills.length > 0
                        ? "Your service change was sent to the board for approval."
                        : "✅ Profile updated successfully!"
                );
                setTimeout(() => setMessage(""), 5000);
            } else {
                setMessage("❌ Failed to update profile");
            }
        } catch {
            setMessage("❌ Something went wrong");
        }
    };

    if (!session) {
        return <div className="p-8 text-center">Loading...</div>;
    }

    if (!user) {
        return null;
    }

    if (user.role !== 'worker') {
        return <div className="p-8 text-center">Only workers can edit their profile</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                <h1 className="text-2xl font-bold text-slate-800 mb-6">Edit My Profile</h1>

                {message && (
                    <div className="mb-4 p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm">
                        {message}
                    </div>
                )}

                {pendingSkills.length > 0 && (
                    <div className="mb-4 p-3 rounded-lg bg-amber-50 text-amber-800 text-sm">
                        Awaiting board approval: {pendingSkills.join(", ")}
                        <span className="block text-xs text-amber-700 mt-1">
                            Your approved services stay active until the board reviews this change.
                        </span>
                    </div>
                )}

                <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Years of Experience
                    </label>
                    <input
                        type="number"
                        value={experience}
                        onChange={(e) => setExperience(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 p-3"
                        min="0"
                        max="50"
                    />
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                        Select Your Services (changes need board approval)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {availableSkills.map((skill) => (
                            <button
                                key={skill}
                                onClick={() => handleSkillToggle(skill)}
                                className={`p-3 rounded-xl border text-left transition ${skills.includes(skill)
                                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                                    : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300'
                                    }`}
                            >
                                <span className="font-medium">{skill}</span>
                                {skills.includes(skill) && <span className="ml-2">✓</span>}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handleUpdate}
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition"
                >
                    Save Changes
                </button>
            </div>
        </div>
    );
}
