import fs from "fs";
import pdf from "pdf-parse";

export const extractTextFromPDF = async (filePath) => {
    try {
        const dataBuffer = await fs.promises.readFile(filePath);

        const data = await pdf(dataBuffer);

        return data.text || "";
    } catch (error) {
        console.error("PDF extraction error:", error);

        throw new Error(
            `Failed to extract text from PDF: ${error.message}`
        );
    }
};
