const { extractTextFromPDF } = require('../utils/pdfParser');

class JEEExamParser {
    constructor(pdfBuffer) {
        this.pdfBuffer = pdfBuffer;
        this.examData = [];
    }

    async extractText() {
        try {
            return await extractTextFromPDF(this.pdfBuffer);
        } catch (error) {
            console.error('Error in text extraction:', error);
            return '';
        }
    }

    findAllQuestions(text) {
        const questions = [];
        const sections = text.split(/Question Type\s*:\s*MCQ/).slice(1);

        sections.forEach((section, index) => {
            const idMatch = section.match(/Question ID\s*:\s*(\d+)/);
            if (!idMatch) {
                console.warn(`Could not find Question ID in section ${index + 1}`);
                return;
            }

            const questionId = idMatch[1];
            const qData = this.extractMCQData(section, questionId);
            if (qData) questions.push(qData);
        });

        return questions;
    }

    extractMCQData(section, questionId) {
        try {
            const data = { type: 'mcq', question_id: questionId };
            const optionPattern = /Option (\d) ID\s*:\s*(\d+)/g;
            const optionIdMap = {};

            let match;
            while ((match = optionPattern.exec(section)) !== null) {
                const [, optionNum, optionId] = match;
                data[`option_${optionNum}_id`] = optionId;
                optionIdMap[optionNum] = optionId;
            }

            // Fill missing options
            for (let i = 1; i <= 4; i++) {
                if (!data[`option_${i}_id`]) {
                    data[`option_${i}_id`] = '';
                }
            }

            const statusMatch = section.match(/Status\s*:\s*(.*?)(?=Chosen|\n|$)/s);
            data.status = statusMatch ? statusMatch[1].trim() : 'Not Answered';

            const chosenMatch = section.match(/Chosen Option\s*:\s*(\S*)/);
            const chosenOptionNum = chosenMatch ? chosenMatch[1].trim() : '';
            data.chosen_option = chosenOptionNum;
            data.chosen_option_id = optionIdMap[chosenOptionNum] || '';
            data.given_answer = '';

            return data;
        } catch (error) {
            console.error(`Error extracting MCQ data for question ${questionId}:`, error);
            return null;
        }
    }

    async parseExam() {
        const fullText = await this.extractText();
        if (!fullText) return [];

        this.examData = this.findAllQuestions(fullText);
        this.examData.sort((a, b) => parseInt(a.question_id) - parseInt(b.question_id));
        return this.examData;
    }
}

module.exports = { JEEExamParser };