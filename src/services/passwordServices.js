const bcrypt = require("bcrypt");
const crypto = require("crypto");

const hashPassword = async (password) => {
  let salt = await bcrypt.genSalt(Number(process.env.SALT_ROUNDS));
  let hash = await bcrypt.hash(password, salt);
  return hash;
};
const hashCompare = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};
const generateRandomPassword = () => {
  return crypto.randomBytes(16).toString("hex");
};

module.exports = { hashPassword, hashCompare, generateRandomPassword };
