"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Background from "@/components/Background";
import { API_URL } from "@/lib/api";
import { Mail, Lock } from "lucide-react";

export default function Login() {
    const router = useRouter();
    const [formData, setFormData] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const res = await fetch(API_URL + "/api/auth/login", {
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
                setError(data.message || "Login failed");
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
                        <h1 className="text-4xl font-bold text-white mb-2">Welcome Back</h1>
                        <p className="text-white/90 text-sm font-medium" style={{ color: '#e2e8f0' }}>
                            Skill Link 
                        </p>
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
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
                            <input
                                name="email"
                                type="email"
                                placeholder="Email"
                                required
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full bg-white/10 border border-white/20 rounded-xl pl-11 pr-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                            />
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-transparent transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                        >
                            {isLoading ? 'Logging in...' : 'Login'}
                        </motion.button>
                    </form>

                    <p className="mt-6 text-center text-sm text-white/90 font-medium" style={{color: '#e2e8f0'}}>
                        Don't have an account?{' '}
                        <a href="/register" className="text-indigo-300 hover:text-white font-semibold transition">
                            Register
                        </a>
                    </p>
                </div>

                {/* Demo Credentials */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-6 p-4 bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 text-white"
                >
                    <p className="text-indigo-300 text-[10px] text-center mb-3 font-bold tracking-widest uppercase">
                        Demo Credentials
                    </p>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center bg-white/10 px-3 py-2 rounded-lg">
                            <span className="text-indigo-300 font-bold text-sm">Admin:</span>
                            <span className="text-white font-mono text-xs tracking-wide">admin@ncct.gov.in / admin123</span>
                        </div>

                        <div className="flex justify-between items-center bg-white/10 px-3 py-2 rounded-lg">
                            <span className="text-indigo-300 font-bold text-sm">Worker:</span>
                            <span className="text-white font-mono text-xs tracking-wide">raju@coop.com / password123</span>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}