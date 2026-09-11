import React, { useState } from 'react';
import PasswordInput from '../../components/Input/PasswordInput';
import { Link, useNavigate } from "react-router-dom";
import { validateEmail } from "../../utils/helper";
import axiosInstance from '../../utils/axiosInstance';
import { HiChevronLeft } from "react-icons/hi";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";

const SignUp = () => {

    const [name,setName] = useState("");
    const [email,setEmail] = useState("");
    const [password,setPassword] = useState("");
    const [error,setError] = useState(null);

    const navigate = useNavigate();

    const handleSignUp = async (e) => {
        e.preventDefault();

        if(!name) {
            setError("Please enter your name");
            return;
        }

        if (!validateEmail(email)) {
            setError("Please enter a valid email address.");
            return;
        }

        if (!password) {
            setError("Please enter the password");
            return;
        }

        setError('');

        try {
            const response = await axiosInstance.post("/customer/register",{
                fullName: name,
                email:email,
                password:password, 
            });

            if(response.data && response.data.error){
                setError(response.data.message)
                return
            }
            if(response.data && response.data.accessToken){
                localStorage.setItem("token", response.data.accessToken)
                navigate('/dashboard')
            }
        }
        catch (error) {
            if(error.response && error.response.data && error.response.data.message){
                setError(error.response.data.message);

            }else{
                setError("An unexpected error occurred. Please try again!");
            }
        }
    };

    return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#F4FAF5] via-[#E8F3E9] to-[#F4FAF5] flex items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Soft decorative background glows */}
        <div className="absolute top-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-[#E2EFE5]/40 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[45rem] h-[45rem] bg-[#137A24]/5 rounded-full blur-3xl"></div>
        
        <div className="relative w-full max-w-md bg-white rounded-[32px] shadow-xl border border-slate-100 p-8 md:p-10 animate-fade-in-up">
            <div className="flex items-center mb-6">
                <button 
                    type="button"
                    onClick={() => navigate(-1)} 
                    className="w-11 h-11 bg-[#F0F6F1] hover:bg-[#E2EBE3] text-slate-700 flex items-center justify-center rounded-full transition-all duration-200 active:scale-95 shadow-sm"
                >
                    <HiChevronLeft className="text-xl" />
                </button>
            </div>

            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Sign Up</h1>
                <p className="text-slate-500 mt-3 text-sm leading-relaxed font-medium">
                    The shopping app's sign-up is quick with basic fields.
                </p>
            </div>

            <form onSubmit={handleSignUp} className="space-y-5">
                <div>
                    <label className="text-slate-700 text-xs font-bold mb-2 block tracking-wide uppercase">Full Name</label>
                    <input 
                        type="text" 
                        placeholder="Enter Full Name" 
                        className="w-full bg-[#F0F6F1] text-slate-800 placeholder-slate-400 font-medium text-sm px-5 py-4 rounded-2xl border-none outline-none focus:ring-2 focus:ring-[#137A24]/20 transition-all duration-200"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                <div>
                    <label className="text-slate-700 text-xs font-bold mb-2 block tracking-wide uppercase">Email Address</label>
                    <input 
                        type="text" 
                        placeholder="Email Here" 
                        className="w-full bg-[#F0F6F1] text-slate-800 placeholder-slate-400 font-medium text-sm px-5 py-4 rounded-2xl border-none outline-none focus:ring-2 focus:ring-[#137A24]/20 transition-all duration-200"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>

                <div>
                    <label className="text-slate-700 text-xs font-bold mb-2 block tracking-wide uppercase">Password</label>
                    <PasswordInput 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)} 
                        placeholder="Enter Password"
                    />
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                        <p className="text-red-600 text-sm font-medium">{error}</p>
                    </div>
                )}

                <button 
                    type="submit" 
                    className="w-full bg-[#137A24] hover:bg-[#0E621C] text-white font-bold py-4 rounded-2xl active:scale-[0.98] transition-all duration-200 shadow-lg shadow-green-900/10 text-sm mt-4 tracking-wide"
                >
                    Create Account
                </button>

                <div className="flex items-center py-2">
                    <div className="flex-1 h-[1px] bg-slate-100"></div>
                    <span className="text-[10px] text-slate-400 font-bold px-4 tracking-widest">OR</span>
                    <div className="flex-1 h-[1px] bg-slate-100"></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button 
                        type="button" 
                        className="flex items-center justify-center gap-2 bg-[#F0F6F1] hover:bg-[#E2EBE3] text-slate-800 font-bold py-3.5 px-4 rounded-2xl transition-all duration-200 text-xs border border-transparent active:scale-[0.97]"
                    >
                        <FcGoogle className="text-lg shrink-0" />
                        Google
                    </button>
                    <button 
                        type="button" 
                        className="flex items-center justify-center gap-2 bg-[#F0F6F1] hover:bg-[#E2EBE3] text-slate-800 font-bold py-3.5 px-4 rounded-2xl transition-all duration-200 text-xs border border-transparent active:scale-[0.97]"
                    >
                        <FaApple className="text-lg shrink-0 text-slate-900" />
                        Apple
                    </button>
                </div>

                <p className="text-slate-500 text-xs text-center font-semibold pt-4">
                    Already have an account?{" "}
                    <Link to="/login" className="text-[#137A24] font-bold hover:underline transition-all ml-1">
                        Sign In
                    </Link>
                </p>
            </form>
        </div>
    </div>
    );
};

export default SignUp;
