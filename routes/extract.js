const express = require('express');
const multer = require('multer');
const { JEEExamParser } = require('../models/examParser');
const axios = require('axios');
const pdf= require('pdf-parse');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const path = require('path');
const fs = require('fs');

//function 
async function processSA(buffer, answerKey) {
    // ✅ Utility to remove NULL values
    function removeNullValues(obj) {
      return Object.fromEntries(
        Object.entries(obj).filter(([_, value]) => value !== 'NULL')
      );
    }
  
    const resultObject = {};
    try {
      const data = await pdf(buffer);
      const results = extractGivenAndQuestionId(data.text);
  
      if (results.length > 0) {
        results.forEach(({ value, questionId }) => {
          resultObject[questionId] = value;
        });
      } else {
        resultObject["NULL"] = "NULL";
      }
    } catch (err) {
      console.error(`❌ Error processing PDF:`, err);
    }
  
    const xyz = removeNullValues(resultObject);
    let total = 0;
    for (const [questionId, givenAnswer] of Object.entries(xyz)) {
      const correctEntry = answerKey.find(q => q.id === questionId);
      const correctAnswer = correctEntry ? correctEntry.correct_option : 'N/A';
      const points = givenAnswer === correctAnswer ? 4 : -1;
      total += points;
      xyz[questionId] = {
        given_answer: givenAnswer,
        correct_answer: correctAnswer,
        points: points
      };
    }
  
    // console.log('🧮 Total Points:', total);
    return { results: xyz, totalPoints: total };
  }
  
  function extractGivenAndQuestionId(text) {
    const results = [];
  
    // Regex to match: Given <number or null> ... Question ID : <number>
    const regex = /Given[^\d\-]*([\d.,\-]*)[\s\S]*?Question ID\s*:\s*(\d+)/gi;
    let match;
  
    while ((match = regex.exec(text)) !== null) {
      let value = match[1].trim();
      if (!value || value === '-' || value === '–' || value === '--') {
        value = 'NULL';
      }
  
      const questionId = match[2].trim();
      results.push({ value, questionId });
    }
  
    return results;
  }

router.post('/mcq', upload.single('file'), async (req, res) => {
    try {
        const { file, body: { date } } = req;
        
        if (!file || !file.buffer || !date) {
            return res.status(400).json({ error: 'Missing file or date' });
        }

        if (!file.originalname.endsWith('.pdf')) {
            return res.status(400).json({ error: 'File must be a PDF' });
        }

        // Get answer key
        const answerKeyPath = path.join(__dirname, '..', 'answerkey', `${date}.json`);
        if (!fs.existsSync(answerKeyPath)) {
            throw new Error(`Answer key file not found for date: ${answerKeyPath}`);
        }

        const answerKey = JSON.parse(fs.readFileSync(answerKeyPath, 'utf8'));
        // console.log(`Retrieved answer key with ${answerKey.length} items`);

        // Create answer key dictionary
        const answerKeyDict = {};
        answerKey.forEach(item => {
            answerKeyDict[item.id] = item.correct_option;
        });

        // Process PDF
        const parser = new JEEExamParser(file.buffer);
        const mcqData = await parser.parseExam();

        // Calculate scores
        let correctCount = 0;
        let incorrectCount = 0;
        let skippedCount = 0;
        let totalScore = 0;

        mcqData.forEach(row => {
            const questionId = row.question_id.toString();
            const chosenOptionId = row.chosen_option_id ? row.chosen_option_id.toString() : "";

            if (!answerKeyDict[questionId]) {
                // console.log(`Question ID ${questionId} not found in answer key`);
                return;
            }

            if (!chosenOptionId) {
                skippedCount++;
            } else if (chosenOptionId === answerKeyDict[questionId].toString()) {
                correctCount++;
                totalScore += 4;
            } else {
                incorrectCount++;
                totalScore -= 1;
            }
        });

        res.json({
            mcq_data: mcqData,
            filename: file.originalname,
            score_summary: {
                correct_questions: correctCount,
                incorrect_questions: incorrectCount,
                skipped_questions: skippedCount,
                total_questions: correctCount + incorrectCount + skippedCount,
                total_score: totalScore,
                scoring_system: "+4 for correct, -1 for incorrect, 0 for skipped"
            }
        });

    } catch (error) {
        console.error('Error processing MCQ:', error);
        res.status(500).json({ 
            error: error.response?.data?.detail || error.message 
        });
    }
});


router.post('/sa', upload.single('file'), async (req, res) => {
    try {
        const { file, body: { date } } = req;
        // console.log(`Processing SA request - File: ${file?.originalname}, Date: ${date}`);

        if (!file || !file.buffer || !date) {
            return res.status(400).json({ error: 'Missing file or date' });
        }

        if (!file.originalname.endsWith('.pdf')) {
            return res.status(400).json({ error: 'File must be a PDF' });
        }

        // Get answer key
        // console.log(`Fetching answer key for date: ${date}`);
        const answerKeyPath = path.join(__dirname, '..', 'answerkey', `${date}.json`);
        if (!fs.existsSync(answerKeyPath)) {
            throw new Error(`Answer key file not found for date: ${answerKeyPath}`);
        }

        const answerKey = JSON.parse(fs.readFileSync(answerKeyPath, 'utf8'));
        // console.log(`Retrieved answer key with ${answerKey.length} items`);

        // Create answer key dictionary
        const answerKeyDict = {};
        answerKey.forEach(item => {
            answerKeyDict[item.id.toString()] = item.correct_option.toString();
        });
        const { results, totalPoints } = await processSA(file.buffer, answerKey);

        res.json({
            sa_data: results,
            filename: file.originalname,
            score_summary: {
                total_score: totalPoints,
                scoring_system: "+4 for correct, -1 for incorrect, 0 for skipped"
            }
        });

    } catch (error) {
        console.error('Error processing SA:', error.stack);
        res.status(500).json({ 
            error: 'Error processing SA submission',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

module.exports = { router };