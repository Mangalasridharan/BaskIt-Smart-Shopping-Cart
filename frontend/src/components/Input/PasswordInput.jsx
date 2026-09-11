import React, { useState } from 'react';
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa6";

const PasswordInput = ({ value, onChange, placeholder }) => {
    const [isShowPassword, setIsShowPassword] = useState(false);

    const toggleShowPassword = () => {
        setIsShowPassword(!isShowPassword);
    };

    return (
        <div className="relative w-full">
            <div className="flex items-center bg-[#F0F6F1] rounded-2xl px-5 py-4 focus-within:ring-2 focus-within:ring-[#137A24]/20 transition-all duration-200">
                <input 
                    value={value}
                    onChange={onChange}
                    type={isShowPassword ? "text" : "password"}
                    placeholder={placeholder || "Enter Password"}
                    className='w-full bg-transparent text-slate-800 text-sm placeholder-slate-400 outline-none font-medium'
                />

                {isShowPassword ? (
                    <FaRegEye
                        size={18}
                        className="text-slate-500 cursor-pointer hover:text-slate-700 transition-all shrink-0 ml-2"
                        onClick={toggleShowPassword}
                    />
                ) : (
                    <FaRegEyeSlash
                        size={18}
                        className="text-slate-400 cursor-pointer hover:text-slate-600 transition-all shrink-0 ml-2"
                        onClick={toggleShowPassword}
                    />
                )}
            </div>
        </div>
    );
};

export default PasswordInput;
