const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const cors = require('cors');
const extract = require('./routes/extract');
const UserRoute = require('./routes/User');
const { connectDB } = require('./connections/connection');
const PaymentRouter = require('./routes/Payment');
const {auth} = require('./middleware/auth');
const User = require('./models/User');
const Marks = require('./models/Marks');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const port = process.env.PORT || 3000;
connectDB(process.env.MONGO_URI)
    .then(() => {
        console.log("DB connected");
    })
    .catch((error) => {
        console.error("Database connection error:", error);
        process.exit(1);
    });
// Configure multer for memory storage
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Configure CORS
app.use(cors({
    origin: '*',
    credentials: true
}));

// Health check endpoint
app.get('/health-check', (req, res) => {
    return res.status(200).json({ message: "Ok" });
});

app.get('/',async (req, res ) => {
//   const count=await Landing.findOneAndUpdate()
  return res.status(200).json({message:"OK"});
}
)

const Date_Array=["02_04_25_1","02_04_25_2","03_04_25_1","03_04_25_2","04_04_25_1","04_04_25_2","07_04_25_1","07_04_25_2","08_04_25_1","08_04_25_2","28_01_26_2"];

// Configure API URL based on environment
// const API_URL = "http://localhost:3000"; // Change this to your actual API URL
const API_URL = "https://checkmarksbackend.onrender.com"; // Change this to your actual API URL
// 
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        // Check if formData exists
        if (!req.body.formData) {
            return res.status(400).json({ 
                message: "Missing form data"
            });
        }

        // Parse the formData string back to an object
        let formData;
        try {
            formData = JSON.parse(req.body.formData);
        } catch (parseError) {
            console.error('Form data parsing error:', parseError);
            return res.status(400).json({ 
                message: "Invalid form data format",
                details: parseError.message 
            });
        }

        const {name, email, city, jeeDate, jeeShift} = formData;
        console.log(email);
        // Validate all required fields
        if (!name || !email|| !city || !jeeDate || !jeeShift) {
            return res.status(400).json({ 
                message: "All fields are required" 
            });
        }

        // Validate request
       
        if (!req.file || !jeeDate) {
            return res.status(400).json({ message: "File and date are required" });
        }

        // Enhanced file type validation
        const fileExtension = req.file.originalname.split('.').pop() || '';
        if (!fileExtension.toLowerCase().match(/^pdf$/)) {
            return res.status(400).json({ 
                message: "Only PDF files are allowed",
                details: "File must have a .pdf extension (case insensitive)"
            });
        }
        

        // Normalize filename to lowercase .pdf extension
        const fileName = req.file.originalname.slice(0, -fileExtension.length) + 'pdf';
        const fileBuffer = req.file.buffer;

        // Convert date format
        const inputDate = new Date(jeeDate);
        const formattedDate = `${inputDate.getDate().toString().padStart(2, '0')}_${(inputDate.getMonth() + 1).toString().padStart(2, '0')}_${inputDate.getFullYear().toString().slice(-2)}_${jeeShift}`;

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
        const grandtotal= mcqData.score_summary.total_score + saData.score_summary.total_score;
            const  userinfo=await Marks.create({name, email, city, shift_Date:formattedDate,marks:grandtotal});
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

app.use('/extract', extract.router);
app.use('/user', UserRoute)
app.use("/payment",auth, PaymentRouter)

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