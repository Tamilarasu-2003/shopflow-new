const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const createUser = async (userData) => {
  return await prisma.user.create({ data: userData });
};

const findUserByEmail = async (email) => {
  return await prisma.user.findUnique({ where: { email } });
};

const findUserByGoogleId = async (googleId) => {
  return await prisma.user.findUnique({ where: { googleId } });
};

const findUserById = async (id) => {
  return await prisma.user.findUnique({
    where: { id: parseInt(id) },
  });
};

const updateUser = async (id, data) => {
  return await prisma.user.update({
    where: { id: parseInt(id) },
    data,
  });
};

const checkExistingPhone = async (phone, excludeUserId) => {
  return await prisma.user.findFirst({
    where: {
      OR: [{ phone: phone, NOT: { id: excludeUserId } }],
    },
  });
};

const createAddress = async (street, city, state, country, zip) => {
  return await prisma.address.create({
    data: { street, city, state, country, postalCode: zip },
  });
};

const linkAddressToUser = async (userId, addressId, isPrimary) => {
  return await prisma.addressOnUser.create({
    data: {
      userId: parseInt(userId),
      addressId: addressId,
      isPrimary: isPrimary,
    },
  });
};

const setAllAddressesToNonPrimary = async (userId) => {
  return await prisma.addressOnUser.updateMany({
    where: { userId: parseInt(userId), isPrimary: true },
    data: { isPrimary: false },
  });
};



const findUserAddress = async (userId, addressId) => {
  return await prisma.addressOnUser.findFirst({
    where: {
      userId: parseInt(userId),
      addressId: parseInt(addressId),
    },
  });
};

const setPrimaryAddress = async (addressOnUserId,booleanValue) => {
  return await prisma.addressOnUser.update({
    where: { id: parseInt(addressOnUserId) },
    data: { isPrimary: booleanValue || true },
  });
};

const updateAddress = async (addressId, data) => {
  return await prisma.address.update({
    where: { id: parseInt(addressId) },
    data,
  });
};

const deleteAddress = async (addressId) => {
  return await prisma.address.delete({
    where: { id: parseInt(addressId) },
  });
};

const findAllUserAddresses = async (userId) => {
  return await prisma.addressOnUser.findMany({
    where: { userId: parseInt(userId) },
    orderBy: {
      address: { createdAt: "asc" },
    },
    include: {
      address: true,
    },
  });
};

const updateUserPassword = async (email, password) => {
    return await prisma.user.update({
        where: { email: email },
        data: {
          password: password,
        },
      })
}

module.exports = {
  findUserByEmail,
  createUser,
  findUserByGoogleId,
  findUserById,
  updateUser,
  checkExistingPhone,
  setAllAddressesToNonPrimary,
  createAddress,
  linkAddressToUser,
  findUserAddress,
  setPrimaryAddress,
  updateAddress,
  deleteAddress,
  findAllUserAddresses,
  updateUserPassword,
};
