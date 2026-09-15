import OpenAI from "openai";
import sql from "../Configs/db.js";
import { clerkClient } from "@clerk/express";
import axios from "axios"
import {v2 as cloudinary} from "cloudinary" 
import fs from 'fs'
// import { extractTextFromPDF } from "../lib/pdfParser.js";

const AI = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
});

export const generateArticle = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { prompt, length } = req.body;

        const plan = req.plan;
        const free_usage = req.free_usage;

        if (!prompt) {
            return res.status(400).json({
                success: false,
                message: "Prompt is required",
            });
        }

        if (!length) {
            return res.status(400).json({
                success: false,
                message: "Article length is required",
            });
        }

        if (plan !== "premium" && free_usage >= 10) {
            return res.status(403).json({
                success: false,
                message: "Limit reached. Upgrade to continue",
            });
        }

        const tokenLimit = Math.ceil(Number(length) * 1.5);

        const response = await AI.chat.completions.create({
            model: "openai/gpt-oss-120b",
            messages: [
                {
                    role: "user",
                    content: `${prompt}

Write approximately ${length} words.

Important:
- Aim for the requested word count.
- Do not stop early.
- Write a complete and detailed article.
- Include an engaging introduction.
- Use clear headings and subheadings.
- Include useful examples where appropriate.
- Finish with a strong conclusion.
- Do not mention the word-count instructions in the article.`,
                },
            ],
            temperature: 0.7,
            max_tokens: tokenLimit,
        });

        const content = response.choices[0].message.content;

        if (!content) {
            return res.status(500).json({
                success: false,
                message: "AI failed to generate the article",
            });
        }

        await sql`
            INSERT INTO creations (
                user_id,
                prompt,
                content,
                type
            )
            VALUES (
                ${userId},
                ${prompt},
                ${content},
                'article'
            )
        `;

        if (plan !== "premium") {
            await clerkClient.users.updateUserMetadata(userId, {
                privateMetadata: {
                    free_usage: free_usage + 1,
                },
            });
        }

        return res.json({
            success: true,
            content,
        });

    } catch (error) {
        console.error("Generate article error:", error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


export const generateBlogTitle = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { prompt } = req.body;

        const plan = req.plan;
        const free_usage = req.free_usage;

        // Validate prompt
        if (!prompt) {
            return res.status(400).json({
                success: false,
                message: "Prompt is required",
            });
        }

        if (plan !== "premium" && free_usage >= 10) {
            return res.status(403).json({
                success: false,
                message: "Limit reached. Upgrade to continue",
            });
        }

        const response = await AI.chat.completions.create({
            model: "openai/gpt-oss-120b",
            messages: [
                {
                    role: "user",
                    content: `Generate ONE short, SEO-friendly blog title about:

        ${prompt}

        Return ONLY the title.`,
                },
            ],
            max_tokens: 500,
            temperature: 0.7,
            reasoning_effort: "low",
        });

        const content = response.choices?.[0]?.message?.content?.trim();

        if (!content) {
            return res.status(500).json({
                success: false,
                message: "AI returned an empty blog title",
            });
        }

        await sql`
            INSERT INTO creations (
                user_id,
                prompt,
                content,
                type
            )
            VALUES (
                ${userId},
                ${prompt},
                ${content},
                'blog-title'
            )
        `;

        if (plan !== "premium") {
            await clerkClient.users.updateUserMetadata(userId, {
                privateMetadata: {
                    free_usage: free_usage + 1,
                },
            });
        }

        return res.json({
            success: true,
            content,
        });

    } catch (error) {
        console.error("Generate BlogTitle error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Something went wrong",
        });
    }
};

export const generateImage = async (req, res) => {
    try {
        const {userId}=req.auth();
        const {prompt, publish}=req.body;
        const plan=req.plan;

        if (plan !== 'premium') {
            return res.status(403).json({
                success: false,
                message: 'Image generation is available only for premium users',
            })
        }

        if (!prompt) {
            return res.status(400).json({
                success: false,
                message: 'Prompt is required',
            })
        }

        const formData=new FormData()
        formData.append('prompt', prompt)

        const { data } = await axios.post(
            'https://clipdrop-api.co/text-to-image/v1',
            formData,
            {
                headers: {
                    'x-api-key': process.env.CLIPDROP_API_KEY,
                },
                responseType: 'arraybuffer',
            }
        )

        const base64Image = `data:image/png;base64,${Buffer.from(data).toString(
            'base64'
        )}`

        const { secure_url } = await cloudinary.uploader.upload(base64Image)

        await sql`
            INSERT INTO creations (
                user_id,
                prompt,
                content,
                type,
                publish
            )
            VALUES (
                ${userId},
                ${prompt},
                ${secure_url},
                'image',
                ${publish ?? false}
            )
        `

        return res.json({
            success: true,
            content: secure_url,
        })

    } catch (error) {
        console.error('Generate Image error:', error)

        if (error.response) {
            console.error('Status:', error.response.status)

            const errorData = Buffer.isBuffer(error.response.data)
                ? error.response.data.toString()
                : error.response.data

            console.error('Data:', errorData)
        }

        return res.status(500).json({
            success: false,
            message: error.message,
        })
    }
};

export const removeImageBackground = async (req, res) => {
    try {
        const { userId } = req.auth()
        const plan = req.plan
        const image = req.file

        if (plan !== 'premium') {
            return res.status(403).json({
                success: false,
                message: 'Image generation is available only for premium users',
            })
        }

        if (!image) {
            return res.status(400).json({
                success: false,
                message: 'Image is required',
            })
        }

        const result = await cloudinary.uploader.upload(image.path, {
            resource_type: 'image',
            background_removal: 'cloudinary_ai',
        })

        console.log('Cloudinary result:', result)

        await sql`
            INSERT INTO creations (
                user_id,
                prompt,
                content,
                type
            )
            VALUES (
                ${userId},
                'Remove background from image',
                ${result.secure_url},
                'image'
            )
        `

        return res.json({
            success: true,
            content: result.secure_url,
        })

    } catch (error) {
        console.error('Remove Image Background error:', error)

        return res.status(500).json({
            success: false,
            message: error.message,
        })
    }
};

export const removeImageObject=async(req,res)=>{
    try {
        const {userId} = req.auth()
        const {object}=req.body;
        const image = req.file;
        const plan = req.plan

        if (plan !== 'premium') {
            return res.status(403).json({
                success: false,
                message: 'Image generation is available only for premium users',
            })
        }

        const {public_id} = await cloudinary.uploader.upload(image.path)

        const imageUrl=cloudinary.url(public_id, {
            transformation:[{effect:`gen_remove:${object}`}],
            resource_type:'image'

        })

        await sql
            `INSERT INTO creations (
                user_id,
                prompt,
                content,
                type, 
            )
            VALUES (
                ${userId},
                ${`Removed ${object} from the image`},
                ${imageUrl},
                'image',
            )`

        return res.json({
            success: true,
            content: imageUrl,
        })

    } catch (error) {
        console.error('Generate Image error:', error)

        if (error.response) {
            console.error('Status:', error.response.status)

            const errorData = Buffer.isBuffer(error.response.data)
                ? error.response.data.toString()
                : error.response.data

            console.error('Data:', errorData)
        }

        return res.status(500).json({
            success: false,
            message: error.message,
        })
    }
};

export const resumeReview = async (req, res) => {
    const resume = req.file;

    try {
        const { userId } = req.auth();

        const plan = req.plan;
        const free_usage = req.free_usage;

        console.log("\n========== RESUME REVIEW START ==========");
        console.log("User ID:", userId);
        console.log("Plan:", plan);
        console.log("Free usage:", free_usage);
        console.log("File:", resume?.originalname);
        console.log("Mimetype:", resume?.mimetype);
        console.log("Size:", resume?.size);

        // Check free usage limit
        if (plan !== "premium" && free_usage >= 10) {
            return res.status(403).json({
                success: false,
                message:
                    "You have used all 10 free resume reviews. Upgrade to premium for unlimited reviews.",
                remaining: 0,
            });
        }

        // Check file
        if (!resume) {
            return res.status(400).json({
                success: false,
                message: "Resume file is required",
            });
        }

        // Check PDF
        if (resume.mimetype !== "application/pdf") {
            return res.status(400).json({
                success: false,
                message: "Only PDF files are allowed",
            });
        }

        // Check file size
        if (resume.size > 5 * 1024 * 1024) {
            return res.status(400).json({
                success: false,
                message: "Resume file must be smaller than 5MB",
            });
        }

        console.log("Extracting text from PDF...");

        // Extract resume text
        const resumeText = (
            await extractTextFromPDF(resume.path)
        ).trim();

        console.log(
            "Extracted text length:",
            resumeText.length
        );

        if (!resumeText) {
            return res.status(400).json({
                success: false,
                message: "Could not extract text from this PDF",
            });
        }

        const prompt = `
You are an expert resume reviewer, ATS specialist, recruiter,
and career coach.

Review the following resume and provide practical feedback.

Include:

# Overall Assessment

Give a brief overall assessment of the resume.

# Resume Score

Give a score from 0-100 and scores for:

- ATS compatibility
- Content
- Presentation
- Experience
- Skills
- Projects
- Education
- Grammar

# Strengths

Identify the strongest parts of the resume.

# Weaknesses

Explain what is wrong, why it matters, and how to fix it.

# Professional Summary

Review the professional summary.

If it can be improved, provide a better version using ONLY
information that already exists in the resume.

# Work Experience

Review bullet points, action verbs, achievements,
metrics, clarity, and relevance.

Rewrite weak bullet points where appropriate.

Do not invent experience, technologies, responsibilities,
or achievements.

# Skills

Identify missing, unnecessary, outdated, or generic skills.

# Projects

Review project descriptions, technologies, results,
metrics, and GitHub/demo presentation.

Suggest specific improvements.

# ATS Compatibility

Check:

- Formatting
- Keywords
- Headings
- Tables
- Columns
- Icons
- Headers and footers
- Readability
- ATS parsing issues

# Grammar and Wording

Identify unclear, weak, repetitive, or grammatically
incorrect wording and suggest improvements.

# Missing Information

List important information that appears to be missing.

# Action Plan

Give the 5 most important improvements the candidate
should make first.

# Final Verdict

Give a concise final assessment.

Rules:

- Be honest and constructive.
- Do not invent experience or information.
- Use examples from the resume.
- Give specific and practical recommendations.
- Keep the response easy to scan.
- Prioritize improvements that can increase interview chances.

RESUME:

${resumeText.slice(0, 30000)}
`.trim();

        console.log("Calling Groq AI...");

        const response = await AI.chat.completions.create({
            model: "openai/gpt-oss-120b",

            messages: [
                {
                    role: "system",
                    content:
                        "You are an expert ATS resume reviewer, recruiter, and career coach.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],

            temperature: 0.4,
            max_tokens: 3000,
        });

        console.log("AI response received");

        const content =
            response.choices?.[0]?.message?.content?.trim();

        if (!content) {
            throw new Error(
                "AI failed to generate resume review"
            );
        }

        console.log(
            "Review generated. Length:",
            content.length
        );

        // Save review to database
        await sql`
            INSERT INTO creations (
                user_id,
                prompt,
                content,
                type
            )
            VALUES (
                ${userId},
                ${"Review the uploaded resume"},
                ${content},
                ${"resume-review"}
            )
        `;

        console.log("Resume review saved to database");

        // Update free usage
        let newUsage = free_usage;

        if (plan !== "premium") {
            newUsage = free_usage + 1;

            await clerkClient.users.updateUserMetadata(userId, {
                privateMetadata: {
                    free_usage: newUsage,
                },
            });

            console.log(
                "Free usage updated:",
                newUsage
            );
        }

        console.log("========== RESUME REVIEW SUCCESS ==========\n");

        return res.json({
            success: true,
            content,

            usage: {
                used:
                    plan === "premium"
                        ? null
                        : newUsage,

                remaining:
                    plan === "premium"
                        ? null
                        : Math.max(0, 10 - newUsage),

                limit:
                    plan === "premium"
                        ? null
                        : 10,
            },
        });

    } catch (error) {
        console.error(
            "\n========== RESUME REVIEW ERROR =========="
        );

        console.error("Message:", error.message);
        console.error("Name:", error.name);
        console.error("Stack:", error.stack);
        console.error("Full error:", error);

        console.error(
            "==========================================\n"
        );

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Failed to review resume",
        });

    } finally {
        // Delete uploaded temporary file
        if (resume?.path) {
            try {
                await fs.promises.unlink(resume.path);

                console.log(
                    "Temporary resume file deleted"
                );
            } catch (error) {
                console.error(
                    "Failed to delete resume:",
                    error.message
                );
            }
        }
    }
};