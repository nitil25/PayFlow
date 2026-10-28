import mongoose from "mongoose";

const connectDb = async() => {
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log("Database connection sucessfull")
    } catch (error) {
        console.log("Db connection error ", error.message)
    }
}

export default connectDb