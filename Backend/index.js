import "dotenv/config";
import express from "express"
import cookieParser from "cookie-parser"
import connectDb from "./utils/db.js";
// import cors from "cors"

const app = express()

const PORT = process.env.PORT || 8000

const corsOption = {
    origin:"http://localhost:5173",
    credentials:true
}

// usernamr:aalukachori25_db_user
// pass :q0xCr73VRvGx4pmg

// All the middlewares
app.use(express.json())
app.use(cookieParser())
app.use(express.urlencoded({extended:true}))
// app.use(cors(corsOption))


// All the routes

app.listen(PORT, ()=>{
    connectDb()
    console.log(`Server is running on the PORT ${PORT}`)
})