import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

// Folder where payroll files will be stored
const uploadDir = path.resolve("uploads/payroll");

// Create folder if it doesn't exist
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();

        const uniqueName = randomUUID() + extension;

        cb(null, uniqueName);
    }

});

// Configure multer
const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB
    }
});

export default upload;