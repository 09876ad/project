"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [skills, setSkills] = useState<string[]>([]);
    const [experience, setExperience] = useState(0);
    const [message, setMessage] = useState("");

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        const token = localStorage.getItem("token");

        if (!token || !storedUser) {
            router.push("/login");
            return;
        }

        const userData = JSON.parse(storedUser);
        setUser(userData);

        // Fetch worker profile
        if (userData.role === 'worker') {
            fetchProfile(token, userData._id || userData.id);
        }
    }, [router]);

    const fetchProfile = async (token: string, userId: string) => {
        try {
            const res = await fetch(`http://localhost:5000/api/workers/profile/${userId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setProfile(data);
                setSkills(data.skills || []);
                setExperience(data.experience || 0);
            }
        } catch (error) {
            console.error("Failed to fetch profile");
        }
    };

    const handleSkillToggle = (skill: string) => {
        if (skills.includes(skill)) {
            setSkills(skills.filter(s => s !== skill));
        } else {
            setSkills([...skills, skill]);
        }
    };

    const handleUpdate = async () => {
        const token = localStorage.getItem("token");
        try {
            const res = await fetch("http://localhost:5000/api/workers/update-profile", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ skills, experience })
            });

            if (res.ok) {
                setMessage("✅ Profile updated successfully!");
                setTimeout(() => setMessage(""), 3000);
            } else {
                setMessage(" Failed to update profile");
            }
        } catch (error) {
            setMessage("❌ Something went wrong");
        }
    };

    if (!user || user.role !== 'worker') {
        return <div className="p-8 text-center">Only workers can edit their profile</div>;
    }

    const availableSkills = [
        "Plumbing", "Electrical", "Deep Cleaning", "Carpentry",
        "Painting", "AC Repair", "Appliance Repair"
    ];

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                <h1 className="text-2xl font-bold text-slate-800 mb-6">Edit My Profile</h1>

                {message && (
                    <div className="mb-4 p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm">
                        {message}
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
                        Select Your Services
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