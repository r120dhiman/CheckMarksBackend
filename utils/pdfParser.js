const PDFParser = require('pdf-parse');

async function extractTextFromPDF(pdfBuffer) {
    try {
        const data = await PDFParser(pdfBuffer);
        return data.text;
    } catch (error) {
        console.error('Error extracting text from PDF:', error);
        throw error;
    }
}


function matchAnswer(userAnswer, correctAnswer) {
    if (correctAnswer === "DROP" || correctAnswer === "") {
        return false;
    }

    // Try numeric comparison first
    const numericUser = parseFloat(userAnswer);
    const numericCorrect = parseFloat(correctAnswer);
    if (!isNaN(numericUser) && !isNaN(numericCorrect)) {
        return numericUser === numericCorrect;
    }

    // Fall back to string comparison
    return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
}

module.exports = { 
    extractTextFromPDF,
    // extractSAFromPDF,
    matchAnswer
};