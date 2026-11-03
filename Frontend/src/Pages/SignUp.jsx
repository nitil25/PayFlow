import React, { useState } from 'react';
import { FiArrowLeft, FiArrowRight } from 'react-icons/fi';
import axios from "axios"
import { ServerUrl } from '../App';
import { useDispatch } from 'react-redux';
import { setUserData } from '../Redux/UserSlice';

const Signup = () => {

  const dispatch = useDispatch()

  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'owner',
    isActive: true
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = async(e) => {
    e.preventDefault()

    try {
        const response = await axios.post(`${ServerUrl}/api/auth/sign-up`, formData, {withCredentials:true})

        dispatch(setUserData(response.data.user))

        console.log(response.data)

    } catch (error) {
        console.log(`Sign up error : ${error.message}`)
    }

  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row font-sans text-slate-800 bg-white">

      {/* Left Sidebar */}
      <div className="w-full lg:w-[40%] min-h-[420px] lg:min-h-screen bg-gradient-to-br from-[#3b2089] to-[#251061] text-white px-6 py-8 sm:px-10 sm:py-10 lg:p-10 flex flex-col justify-between relative overflow-hidden">

        {/* Background shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 transform translate-x-1/2 -translate-y-1/2"></div>

        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 transform -translate-x-1/2 translate-y-1/2"></div>

        <div className="relative z-10">
          <button className="flex items-center text-sm bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-lg transition">
            <FiArrowLeft className="mr-2 shrink-0" />
            Back to PayFlow
          </button>

          <div className="bg-white rounded-xl p-5 w-fit mt-10 sm:mt-12 mb-8 shadow-xl flex items-center space-x-2">
            <span className="text-3xl font-extrabold italic text-blue-600 tracking-tighter">
              =P
            </span>
            <span className="text-2xl font-bold text-[#6246ea]">
              PayFlow
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
            Your payments.<br />
            Your flow.
          </h1>

          <p className="text-indigo-200 text-sm max-w-sm leading-relaxed">
            Bring employee records, payment workflows and transaction insights together in one workspace.
          </p>
        </div>

        <div className="relative z-10 text-[10px] tracking-widest text-indigo-300 uppercase mt-12 lg:mt-20">
          Payments, brought into flow
        </div>
      </div>

      {/* Right Content */}
      <div className="w-full lg:w-[60%] flex flex-col justify-center items-center px-5 py-12 sm:px-8 sm:py-14 lg:px-10 lg:py-16 relative">

        <div className="w-full max-w-md mx-auto">

          <div className="w-8 h-1 bg-[#6246ea] mb-6"></div>

          <h3 className="text-xs font-bold tracking-widest text-[#6246ea] uppercase mb-2">
            Get Started
          </h3>

          <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-slate-900">
            Create your account.
          </h2>

          <p className="text-slate-500 text-sm mb-8 leading-relaxed">
            Set up your workspace and keep every payment in flow.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full name
              </label>

              <input
                type="text"
                name="name"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full min-w-0 px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6246ea] focus:border-transparent text-sm placeholder-slate-400"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email address
              </label>

              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full min-w-0 px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6246ea] focus:border-transparent text-sm placeholder-slate-400"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>

              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full min-w-0 px-4 py-3 pr-16 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6246ea] focus:border-transparent text-sm placeholder-slate-400"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-[2.1rem] text-xs font-bold text-[#6246ea] hover:text-indigo-800"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {/* Create Account */}
            <button
              type="submit"
              className="w-full bg-[#6246ea] hover:bg-indigo-700 text-white font-medium py-3 rounded-lg flex justify-center items-center transition shadow-lg shadow-indigo-200 mt-2"
            >
              Create account
              <FiArrowRight className="ml-2 shrink-0" />
            </button>

          </form>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="border-t border-slate-200 flex-grow"></div>

            <span className="px-3 text-slate-400 text-xs font-medium">
              OR
            </span>

            <div className="border-t border-slate-200 flex-grow"></div>
          </div>

          {/* PayPal */}
          <button className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-3 px-3 rounded-lg flex justify-center items-center transition">
            <span className="text-blue-800 font-extrabold mr-2 italic">
              P
            </span>
            Continue with PayPal
          </button>

          {/* Sign In */}
          <p className="text-center text-xs text-slate-500 mt-8">
            Already have an account?{' '}
            <a
              href="#"
              className="text-[#6246ea] font-semibold hover:underline"
            >
              Sign in
            </a>
          </p>

        </div>

        {/* Footer */}
        <div className="relative lg:absolute bottom-0 lg:bottom-6 mt-12 lg:mt-0 text-center text-[10px] tracking-widest text-slate-300 uppercase">
          PayFlow · Your payments, in flow
        </div>

      </div>
    </div>
  );
};

export default Signup;
