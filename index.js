const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Configure multer for memory storage
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Configure CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));

// Health check endpoint
app.get('/health-check', (req, res) => {
    return res.status(200).json({ message: "Ok" });
});

// Configure API URL based on environment
const API_URL = "https://api-fmv4.onrender.com";

app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        // Validate request
        if (!req.file || !req.body.date) {
            return res.status(400).json({ message: "File and date are required" });
        }

        // Validate file type
        if (!req.file.originalname.toLowerCase().endsWith('.pdf')) {
            return res.status(400).json({ message: "Only PDF files are allowed" });
        }

        // Get file information
        const fileBuffer = req.file.buffer;
        const fileName = req.file.originalname;

        // Convert date format
        const inputDate = new Date(req.body.date);
        const formattedDate = `${inputDate.getDate().toString().padStart(2, '0')}_${(inputDate.getMonth() + 1).toString().padStart(2, '0')}_${inputDate.getFullYear().toString().slice(-2)}`;

        // Common headers for both requests
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'multipart/form-data'
        };

        // Common axios config
        const axiosConfig = {
            headers,
            timeout: 60000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        };

        // Make MCQ request first
        const formData1 = new FormData();
        formData1.append('file', fileBuffer, {
            filename: fileName,
            contentType: 'application/pdf',
            knownLength: fileBuffer.length
        });
        formData1.append('date', formattedDate);

        const mcqContentLength = await new Promise((resolve, reject) => {
            formData1.getLength((err, length) => {
                if (err) reject(err);
                else resolve(length);
            });
        });
        let mcqResponse;
        try {
            console.log('Making MCQ request...');
            mcqResponse = await axios.post(
                `${API_URL}/extract/mcq`,
                formData1,
                {
                    ...axiosConfig,
                    headers: {
                        ...headers,
                        ...formData1.getHeaders(),
                        'Content-Length': mcqContentLength
                    }
                }
            );
            console.log('MCQ request completed');
        } catch (mcqError) {
            console.error('MCQ Request Failed:', {
                message: mcqError.message,
                status: mcqError.response?.status,
                data: mcqError.response?.data
            });
            throw new Error(`MCQ extraction failed: ${mcqError.message}`);
        }

        // Make SA request after MCQ is done
        const formData2 = new FormData();
        formData2.append('file', fileBuffer, {
            filename: fileName,
            contentType: 'application/pdf',
            knownLength: fileBuffer.length
        });
        formData2.append('date', formattedDate);

        const saContentLength = await new Promise((resolve, reject) => {
            formData2.getLength((err, length) => {
                if (err) reject(err);
                else resolve(length);
            });
        });
        let saResponse;
        try {
            console.log('Making SA request...');
            saResponse = await axios.post(
                `${API_URL}/extract/sa`,
                formData2,
                {
                    ...axiosConfig,
                    headers: {
                        ...headers,
                        ...formData2.getHeaders(),
                        'Content-Length': saContentLength
                    }
                }
            );
            console.log('SA request completed');
        } catch (saError) {
            console.error('SA Request Failed:', {
                message: saError.message,
                status: saError.response?.status,
                data: saError.response?.data
            });
            throw new Error(`SA extraction failed: ${saError.message}`);
        }

        // Process responses
        const mcqData = mcqResponse.data;
        const saData = saResponse.data;

        if (!mcqData?.score_summary || !saData?.score_summary) {
            throw new Error('Invalid response format from extraction service');
        }

        console.log('Total Score:', mcqData.score_summary.total_score + saData.score_summary.total_score);
        return res.json({
            mcqResult: mcqData.score_summary,
            saResult: saData.score_summary,
            total: mcqData.score_summary.total_score + saData.score_summary.total_score,
            details: {
                mcq: mcqData.mcq_data,
                sa: saData.sa_data
            }
        });
    } catch (error) {
        console.error('Upload Error:', {
            message: error.message,
            stack: error.stack,
            response: {
                status: error.response?.status,
                data: error.response?.data,
                headers: error.response?.headers
            }
        });

        return res.status(error.response?.status || 500).json({
            success: false,
            message: "Error processing file",
            error: {
                message: error.message,
                details: error.response?.data?.detail || 'Unknown error occurred',
                status: error.response?.status || 500
            }
        });
    }
});

// Add error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        message: "Something went wrong!", 
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
});