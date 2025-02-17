const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const findUserWishlist = async (userId) => {
  return await prisma.wishlist.findUnique({
    where: { userId: parseInt(userId) },
    include: {
      products: {
        orderBy: { createdAt: "desc" },
        include: { product: true },
      },
    },
  });
};

const createWishlist = async (userId, productId) => {
  return await prisma.wishlist.create({
    data: {
      userId: parseInt(userId),
      products: {
        create: [{ productId: parseInt(productId) }],
      },
    },
    include: { products: true },
  });
};

const findProductInWishlist = async (wishlistId, productId) => {
  return await prisma.wishlistProduct.findFirst({
    where: {
      wishlistId: parseInt(wishlistId),
      productId: parseInt(productId),
    },
  });
};

const addProductToWishlist = async (wishlistId, productId) => {
  return await prisma.wishlistProduct.create({
    data: {
      wishlistId,
      productId: parseInt(productId),
    },
  });
};

const removeProductFromWishlist = async (productId) => {
  return await prisma.wishlistProduct.delete({
    where: { id: parseInt(productId) },
  });
};

const userWishlist = async (userId) => {
    return await prisma.wishlist.findUnique({
        where: { userId: parseInt(userId) },
        include: {
          products: {
            orderBy: { createdAt: "desc" },
            include: {
              product: true,
            },
          },
        },
      });
}

module.exports = {
  findUserWishlist,
  createWishlist,
  findProductInWishlist,
  addProductToWishlist,
  removeProductFromWishlist,
  userWishlist,
};
