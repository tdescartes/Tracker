"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";

export default function RegisterPage() {
    const router = useRouter();
    const { register, isLoading } = useAuthStore();
    const [form, setForm] = useState({ email: "", password: "", full_name: "", household_name: "" });
    const [error, setError] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        try {
            await register(form);
            router.push("/dashboard");
        } catch {
            setError("Could not create account. Email may already be in use.");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
                <h1 className="text-3xl font-bold text-primary mb-1">Tracker</h1>
                <p className="text-neutral mb-6">Create your household account</p>

                {error && (
                    <p className="mb-4 text-sm text-alert bg-orange-50 border border-alert/30 rounded-lg px-4 py-2">
                        {error}
                    </p>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {[
                        { name: "full_name", label: "Full Name", type: "text" },
                        { name: "email", label: "Email", type: "email" },
                        { name: "password", label: "Password", type: "password" },
                        { name: "household_name", label: "Household Name (e.g. The Smith Family)", type: "text" },
                    ].map((field) => (
                        <div key={field.name}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                            <input
                                name={field.name}
                                type={field.type}
                                value={form[field.name as keyof typeof form]}
                                onChange={handleChange}
                                required={field.name !== "household_name"}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    ))}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-primary text-white rounded-lg py-2.5 font-semibold hover:bg-primary-dark transition disabled:opacity-50"
                    >
                        {isLoading ? "Creating account…" : "Create Account"}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-neutral">
                    Already have an account?{" "}
                    <Link href="/login" className="text-primary font-medium hover:underline">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
