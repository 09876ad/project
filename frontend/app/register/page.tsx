"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Background from "@/components/Background";
import { API_URL } from "@/lib/api";
import { User, Mail, Lock, Phone, MapPin, Briefcase } from "lucide-react";

export default function Register() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "customer",
        phone: "",
        address: "",
        skills: [] as string[]
    });
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const res = await fetch(API_URL + "/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (res.ok) {
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify({ _id: data._id, name: data.name, role: data.role }));
                router.push("/dashboard");
            } else {
                setError(data.message || "Registration failed");
            }
        } catch (err) {
            setError("Something went wrong. Is the backend running?");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center p-4">
            <Background />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative w-full max-w-md"
            >
                {/* Glass Card */}
                <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-center mb-8"
                    >
                        <h1 className="text-4xl font-bold text-white mb-2">Join the Cooperative</h1>
                        <p className="text-white/90 text-sm font-medium">Fair wages • Worker welfare • Verified services</p>
                    </motion.div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/50 text-white text-sm"
                        >
                            {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Input Fields with Icons */}
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
                            <input
                                name="name"
                                placeholder="Full Name"
                                required
                                onChange={handleChange}
                                className="w-full bg-white/10 border border-white/20 rounded-xl pl-11 pr-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                            />
                        </div>

                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
                            <input
                                name="email"
                                type="email"
                                placeholder="Email"
                                required
                                onChange={handleChange}
                                className="w-full bg-white/10 border border-white/20 rounded-xl pl-11 pr-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                            />
                        </div>

                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
                            <input
                                name="password"
                                type="password"
                                placeholder="Password"
                                required
                                onChange={handleChange}
                                className="w-full bg-white/10 border border-white/20 rounded-xl pl-11 pr-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                            />
                        </div>

                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
                            <input
                                name="phone"
                                placeholder="Phone Number"
                                required
                                onChange={handleChange}
                                className="w-full bg-white/10 border border-white/20 rounded-xl pl-11 pr-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                            />
                        </div>

                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
                            <input
                                name="address"
                                placeholder="Address"
                                required
                                onChange={handleChange}
                                className="w-full bg-white/10 border border-white/20 rounded-xl pl-11 pr-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                            />
                        </div>

                        {/* Role Selection */}
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
                            <select
                                name="role"
                                onChange={handleChange}
                                className="w-full bg-white/20 border border-white/30 rounded-xl pl-11 pr-4 py-3 text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition appearance-none cursor-pointer"
                                style={{
                                    color: 'white',
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)'
                                }}
                            >
                                <option value="customer" style={{ color: 'white', backgroundColor: '#4c1d95' }}>Customer (I need a service)</option>
                                <option value="worker" style={{ color: 'white', backgroundColor: '#4c1d95' }}>Worker (I provide a service)</option>
                            </select>
                        </div>

                        {/* Skills Selection for Workers */}
                        {formData.role === 'worker' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="space-y-2"
                            >
                                <label className="text-white/80 text-sm font-medium">Select Your Services:</label>
                                <select
                                    name="skills"
                                    multiple
                                    onChange={(e) => {
                                        const selectedOptions = Array.from(e.target.selectedOptions).map(opt => opt.value);
                                        setFormData({ ...formData, skills: selectedOptions });
                                    }}
                                    className="w-full bg-white/20 border border-white/30 rounded-xl p-3 h-32 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    style={{
                                        color: 'white',
                                        backgroundColor: 'rgba(255, 255, 255, 0.2)'
                                    }}
                                >
                                    <option value="Plumbing" style={{ color: 'white', backgroundColor: '#4c1d95' }}>🔧 Plumbing</option>
                                    <option value="Electrical" style={{ color: 'white', backgroundColor: '#4c1d95' }}> 💡Electrical</option>
                                    <option value="Deep Cleaning" style={{ color: 'white', backgroundColor: '#4c1d95' }}>🧹 Deep Cleaning</option>
                                    <option value="Carpentry" style={{ color: 'white', backgroundColor: '#4c1d95' }}>🪚 Carpentry</option>

                                </select>
                                <p className="text-white/60 text-xs">Selected: {formData.skills.join(', ') || 'None'}</p>
                            </motion.div>
                        )}

                        {/* Submit Button */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-transparent transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                        >
                            {isLoading ? 'Registering...' : 'Register'}
                        </motion.button>
                    </form>

                    {/* Footer */}
                    <p className="mt-6 text-center text-sm font-medium" style={{ color: '#e2e8f0' }}>
                        Already have an account?{' '}
                        <a href="/login" className="font-semibold transition hover:text-white" style={{ color: '#a5b4fc' }}>
                            Login
                        </a>
                    </p>
                </div>

                {/* Decorative Elements */}
                <motion.div
                    className="absolute -top-10 -right-10 w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full opacity-20 blur-xl"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                    className="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full opacity-20 blur-xl"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                />
            </motion.div>
        </div>
    );
}