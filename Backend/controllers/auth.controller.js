import User from "../models/user.model.js";
import bcrypt from "bcrypt";
import genToken from "../utils/genToken.js";

// Sign Up controller
export const SignUp = async (req, res) => {
  try {
    const { name, email, password, role, isActive } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, password and role is required",
      });
    }

    const existingUser = await User.findOne({email});

    if (existingUser) {
      return res.status(409).json({
        messgae: "A user with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password:hashedPassword,
      role,
      isActive,
    });

    const token =await genToken(user._id)

    res.cookie("token",token,{
        httpOnly:true,
        sameSite:"lax",
        secure:false,
        maxAge:15*24*60*60*1000
    })

    return res.status(201).json({
        message:"User created successfully",
        user:{
            _id:user._id,
            name:user.name,
            email:user.email,
            role:user.role,
            isEmailVerified:user.isEmailVerified,
            isActive:user.isActive
        }
    })

  } catch (error) {
    console.log(`Sign Up error: ${error.message}`);
  }
};

// Sign In controller
export const signIn = async(req,res) => {
    try {
        const {email, password} = req.body

        if(!email){
            return res.status(404).json({
                message:"Please provide a email"
            })
        }

        const isUser = await User.findOne({email})

        if(!isUser){
            return res.status(404).json({
                message:"User not found"
            })
        }

        const isPassword = await bcrypt.compare(password, isUser.password)

        if(!isPassword){
            return res.status(400).json({
                message:"Invalid email or passsword"
            })
        }

        const token = await genToken(isUser._id)

        res.cookie("token", token,{
            http:true,
            sameSite:"lax",
            secure:false,
            maxAge:15*24*60*60*1000
        })

        return res.status(200).json({
            message:"User sign in successfully",
            user:{
            _id:isUser._id,
            name:isUser.name,
            email:isUser.email,
            role:isUser.role,
            isEmailVerified:isUser.isEmailVerified,
            isActive:isUser.isActive
        }
        })

    } catch (error) {
        console.log(`SignIn error : ${error.message}`)
        return res.status(500).json({
            message:"Internal server error"
        })
    }
}

// Logout controller
export const signOut = async(req, res) => {
    try {
        res.clearCookie("token")

        return res.status(200).json({
            message:"User logout successfully"
        })
    } catch (error) {
        console.log(`Logout server error : ${error.message}`)
        return res.status(500).json({
            message:"Internal Servre error"
        })
    }
}