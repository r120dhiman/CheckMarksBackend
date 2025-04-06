const express = require('express');
const multer = require('multer');
const axios = require('axios');

const FormData = require('form-data');
const cors = require('cors');

const app = express();
const port = 3000;

// Configure multer for memory storage
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Enable CORS
app.use(cors());

// Health check endpoint
app.get('/health-check', (req, res) => {
    return res.status(200).json({ message: "Ok" });
});

// Configure API URL based on environment
const API_URL =  "https://api-fmv4.onrender.com";

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

        console.log('Making MCQ request...');
        const mcqResponse = await axios.post(
            `${API_URL}/extract/mcq`,
            formData1,
            {
                ...axiosConfig,
                headers: {
                    ...headers,
                    ...formData1.getHeaders()
                }
            }
        );
        console.log('MCQ request completed');

        // Make SA request after MCQ is done
        const formData2 = new FormData();
        formData2.append('file', fileBuffer, {
            filename: fileName,
            contentType: 'application/pdf',
            knownLength: fileBuffer.length
        });
        formData2.append('date', formattedDate);

        console.log('Making SA request...');
        const saResponse = await axios.post(
            `${API_URL}/extract/sa`,
            formData2,
            {
                ...axiosConfig,
                headers: {
                    ...headers,
                    ...formData2.getHeaders()
                }
            }
        );
        console.log('SA request completed');

        // Process responses
        const mcqData = mcqResponse.data;
        const saData = saResponse.data;
        console.log( mcqData.score_summary.total_score+saData.score_summary.total_score );
        return res.json({
            mcqResult: mcqData.score_summary,
            // saResult: totalSAPoints,
            total: mcqData.score_summary.total_score+saData.score_summary.total_score ,
            details: {
                mcq: mcqData.mcq_data,
                // sa: saData.sa_data
            }
        });

    } catch (error) {
        console.error('Error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });

        // Send appropriate error response
        res.status(error.response?.status || 500).json({
            message: "Error processing file",
            error: error.response?.data?.detail || error.message,
            status: error.response?.status
        });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});