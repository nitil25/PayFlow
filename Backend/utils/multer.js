import multer from "multer";

const multerConfig = (err, req, res, next) => {

    if (err instanceof multer.MulterError) {

        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
                message: "File size cannot exceed 10 MB"
            });
        }

        return res.status(400).json({
            message: err.message
        });
    }

    next(err);
}


export default multerConfig;