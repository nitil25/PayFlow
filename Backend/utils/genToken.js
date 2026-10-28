import jwt from "jsonwebtoken"

const genToken = async(userId) => {
    try {
        const token = jwt.sign({userId},process.env.JWT_SECRET)
        return token
    } catch (error) {
        console.log(`Token generation error : ${error.message}`)  
    }
}

export default genToken