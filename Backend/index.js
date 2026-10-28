import dotenv, { config } from "dotenv";
dotenv.config()
import express from "express"
import cookieParser from "cookie-parser"
import connectDb from "./utils/db.js";
import authRouter from "./routes/auth.routes.js";
// import cors from "cors"

const app = express()

const PORT = process.env.PORT || 8000

const corsOption = {
    origin:"http://localhost:5173",
    credentials:true
}


// All the middlewares
app.use(express.json())
app.use(cookieParser())
app.use(express.urlencoded({extended:true}))
// app.use(cors(corsOption))


// All the apis routes
app.use("/api/auth",authRouter)





app.listen(PORT, ()=>{
    connectDb()
    console.log(`Server is running on the PORT ${PORT}`)
})