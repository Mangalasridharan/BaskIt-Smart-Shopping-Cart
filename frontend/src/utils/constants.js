export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const ROLES = {
    CUSTOMER: "customer",
    SHOPKEEPER: "shopkeeper",
};

export const ROLE_LABELS = {
    [ROLES.CUSTOMER]: "Customer",
    [ROLES.SHOPKEEPER]: "Shopkeeper",
};

export const ROLE_HOME = {
    [ROLES.CUSTOMER]: "/dashboard",
    [ROLES.SHOPKEEPER]: "/inventory",
};

// "admin" is a legacy role value; treat it as shopkeeper everywhere.
export const normalizeRole = (role) => {
    if (role === "admin") return ROLES.SHOPKEEPER;
    return role === ROLES.SHOPKEEPER ? ROLES.SHOPKEEPER : ROLES.CUSTOMER;
};

export const getRoleHome = (role) => ROLE_HOME[normalizeRole(role)] || "/login";

export const MIN_PASSWORD_LENGTH = 6;
