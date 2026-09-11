import React from "react";
import { getInitials } from "../../utils/helper";

const ProfileInfo = ({userInfo, onLogout}) => {
    return (
        userInfo && (
            <div className="flex items-center gap-3" >
                <div className="w-12 h-12 flex items-center justify-center rounded-full text-[#137A24] font-bold bg-[#E2EFE5]">
                    {getInitials(userInfo.fullName)}
                </div>

                <div>
                    <p className="text-sm font-bold text-slate-800">{userInfo.fullName}</p>
                    <button className="text-xs text-red-500 hover:text-red-600 font-semibold transition-colors" onClick={onLogout}>
                        Logout
                    </button>
                </div>
            </div>
        ) 
    );
};

export default ProfileInfo;