const Customer = require("../models/customer.model");

const createCustomer = async (customerData) => {
  const customer = new Customer(customerData);
  return await customer.save();
};

const findCustomerByEmail = async (email) => {
  return await Customer.findOne({ email }).lean();
};

const findCustomerById = async (id) => {
  return await Customer.findById(id);
};

module.exports = {
  createCustomer,
  findCustomerByEmail,
  findCustomerById,
};
