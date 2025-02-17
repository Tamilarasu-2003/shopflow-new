const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const jwt = require("jsonwebtoken");

const { sendResponse } = require("../utils/responseHandler");

const validateToken = async (req, res, next) => {
  try {
    let token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return sendResponse(res, {
        status: 401,
        type: "error",
        message: "No token found......",
      });
    }

    const payload = jwt.verify(token, process.env.JWT_TOKEN);

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
    });

    if (!user) {
      return sendResponse(res, {
        status: 404,
        type: "error",
        message: "User not found.",
      });
    }

    req.user = user;

    return next();
  } catch (error) {
    console.log(error);
  }
};

module.exports = { validateToken };
