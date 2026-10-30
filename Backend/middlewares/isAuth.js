import jwt from "jsonwebtoken"

const isAuth = async(req,res, next) => {
    try {
        const {token} = req.cookies

        if(!token){
            return res.status(400).json({
                message:"Unauthorised access. Please sign in first"
            })
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        if(!decoded){
            return res.status(400).json({
                message:"Unauthroised access."
            })
        }

        req.userId = decoded.userId

        next()

    } catch (error) {
        console.log(`isAuth error : ${error}`)
        return res.status(500).json({
            message:"Internal Server error"
        })
    }
}

export default isAuth