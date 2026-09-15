import React, { useState } from "react";
import { Sparkles, Hash } from "lucide-react";
import axios from "axios";
import { useAuth } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import Markdown from "react-markdown";

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

const BlogTitles = () => {
    const blogCategories = [
        "General",
        "Technology",
        "Business",
        "Health",
        "Lifestyle",
        "Education",
        "Travel",
        "Food",
    ];

    const [selectedCategory, setSelectedCategory] = useState("General");
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [content, setContent] = useState("");

    const { getToken } = useAuth();

const onSubmitHandler = async (e) => {
    e.preventDefault();

    const keyword = input.trim();

    if (!keyword) {
        toast.error("Please enter a keyword");
        return;
    }

    try {
        setLoading(true);
        setContent("");

        const token = await getToken();

        const prompt = `Generate 10 creative and SEO-friendly blog titles about "${keyword}" in the ${selectedCategory} category. Return only the titles as a numbered list.`;

        const { data } = await axios.post(
            "/api/ai/generate-blog-title",
            {
                prompt,
                keyword,
                category: selectedCategory,
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        console.log("API response:", data);

        if (data.success) {
            setContent(data.content);
            toast.success("Titles generated successfully");
        } else {
            toast.error(data.message || "Failed to generate titles");
        }

    } catch (error) {
        console.error("Generate title error:", error);
        console.error("Backend response:", error.response?.data);

        toast.error(
            error.response?.data?.message ||
            error.message ||
            "Something went wrong while generating titles"
        );
    } finally {
        setLoading(false);
    }
};
    return (
        <div className="h-full overflow-y-scroll p-6 flex items-start flex-wrap gap-4 text-slate-700">
            <form
                onSubmit={onSubmitHandler}
                className="w-full max-w-lg p-4 bg-white rounded-lg border border-gray-200"
            >
                <div className="flex items-center gap-3">
                    <Sparkles className="w-6 text-[#8E37EB]" />

                    <h1 className="text-xl font-semibold">
                        AI Title Generator
                    </h1>
                </div>

                <p className="mt-6 text-sm font-medium">
                    Keyword
                </p>

                <input
                    onChange={(e) => setInput(e.target.value)}
                    value={input}
                    type="text"
                    className="w-full p-2 px-3 mt-2 outline-none text-sm rounded-md border border-gray-300"
                    placeholder="The future of artificial intelligence..."
                    required
                />

                <p className="mt-4 text-sm font-medium">
                    Category
                </p>

                <div className="mt-3 flex gap-3 flex-wrap">
                    {blogCategories.map((item) => (
                        <button
                            type="button"
                            onClick={() => setSelectedCategory(item)}
                            className={`text-xs px-4 py-1 border rounded-full cursor-pointer ${
                                selectedCategory === item
                                    ? "bg-purple-50 text-purple-700 border-purple-300"
                                    : "text-gray-500 border-gray-300"
                            }`}
                            key={item}
                        >
                            {item}
                        </button>
                    ))}
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center gap-2
                    bg-linear-to-r from-[#C341F6] to-[#8E37EB]
                    text-white px-4 py-2 mt-6 text-sm rounded-lg
                    cursor-pointer transition-all duration-200
                    disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <>
                            <span
                                className="w-4 h-4 border-2 border-white/40
                                border-t-white rounded-full animate-spin"
                            />

                            Generating...
                        </>
                    ) : (
                        <>
                            <Hash className="w-5" />
                            Generate Title
                        </>
                    )}
                </button>
            </form>

            {/* Result */}
            <div
                className="w-full max-w-lg p-4 bg-white rounded-lg flex flex-col
                border border-gray-200 min-h-96"
            >
                <div className="flex items-center gap-3">
                    <Hash className="w-5 h-5 text-[#8E37EB]" />

                    <h1 className="text-xl font-semibold">
                        Generated Titles
                    </h1>
                </div>

                {!content ? (
                    <div className="flex-1 flex justify-center items-center">
                        <div className="text-sm flex flex-col items-center gap-5 text-gray-400 text-center">
                            <Hash className="w-9 h-9" />

                            <p>
                                Enter a topic and click "Generate Title"
                                to get started
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="mt-3 h-full overflow-y-auto text-sm text-slate-600">
                        <div className="reset-tw">
                            <Markdown>{content}</Markdown>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BlogTitles;
