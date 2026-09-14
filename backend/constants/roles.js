// Roles supported by BaskIt. "admin" is kept as a legacy alias for shopkeeper.
const ROLES = {
  CUSTOMER: "customer",
  SHOPKEEPER: "shopkeeper",
};

const VALID_ROLES = [ROLES.CUSTOMER, ROLES.SHOPKEEPER];

const normalizeRole = (role) => {
  if (role === "admin") return ROLES.SHOPKEEPER;
  return VALID_ROLES.includes(role) ? role : ROLES.CUSTOMER;
};

module.exports = {
  ROLES,
  VALID_ROLES,
  normalizeRole,
};
