const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getAllCarousels = async () => {
  return await prisma.carousel.findMany();
};

const getTotalProducts = async () => {
  return await prisma.product.count();
};

const getPaginatedProducts = async (offset, limit) => {
  return await prisma.product.findMany({
    skip: offset,
    take: limit,
    include: { subCategory: true },
  });
};

const getMultipleProductsByIds = async (productIds) => {
  return await prisma.product.findMany({
    where: { id: { in: productIds } },
  });
}

const getFlashDealProducts = async () => {
  return await prisma.product.findMany({
    where: { discountPercentage: { gte: 50, lte: 72 } },
    orderBy: { discountPercentage: "desc" },
    take: 5,
  });
};

const getCategorySubCategories = async (categoryName) => {
  const category = await prisma.category.findUnique({
    where: { name: categoryName },
    include: { subCategories: { select: { name: true } } },
  });

  return category ? category.subCategories.map((sub) => sub.name) : [];
};

const getFilteredProducts = async (filter, sort, offset, limitInt) => {
  const [products, totalCount] = await Promise.all([
    prisma.product.findMany({
      skip: offset,
      take: limitInt,
      where: filter,
      orderBy: sort
        ? { actualPrice: sort === "low to high" ? "asc" : "desc" }
        : undefined,
      include: { subCategory: true },
    }),
    prisma.product.count({ where: filter }),
  ]);

  return {
    products,
    totalCount,
  };
};


const fetchCategories = async () => {
  return await prisma.category.findMany({
    select: {
      name: true,
      id: true,
      image: true,
      subCategories: {
        select: {
          name: true,
          id: true,
        },
      },
    },
  });
};

const fetchSubCategories = async (categoryId) => {
  return await prisma.category.findUnique({
    where: { id: parseInt(categoryId) },
    select: {
      subCategories: { select: { name: true, id: true } },
    },
  });
};

const fetchProductById = async (productId) => {
  return await prisma.product.findFirst({
    where: { id: parseInt(productId) },
  });
};

const fetchProductsBySubCategory = async (subCategoryId) => {
  return await prisma.product.findMany({
    where: { subCategoryId: parseInt(subCategoryId) },
    select: {
      id: true,
      name: true,
      image: true,
      description: true,
      actualPrice: true,
      offerPrice: true,
      discountPercentage: true,
      subCategoryId: true,
      rating: true,
    },
  });
};

const fetchTrendingProducts = async () => {
  return await prisma.product.findMany({
    where: {
      rating: { gte: 4.5 },
      stock: { gt: 0 },
    },
    orderBy: [{ rating: "desc" }, { discountPercentage: "desc" }],
    take: 10,
  });
};

const fetchNewArrivals = async () => {
  return await prisma.product.findMany({
    where: {
      stock: { gt: 0 },
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });
};

const fetchLimitedTimeOffers = async () => {
  const now = new Date();
  return await prisma.product.findMany({
    where: {
      stock: { gt: 0 },
      discountPercentage: { gte: 20, lte: 49 },
      //   offerStart: { lte: now },
      //   offerEnd: { gte: now },
    },
    orderBy: { discountPercentage: "desc" },
    take: 10,
  });
};

const fetchTopRatedProducts = async () => {
  return await prisma.product.findMany({
    where: {
      stock: { gt: 0 },
      rating: { gte: 4.0 },
    },
    orderBy: { rating: "desc" },
    take: 10,
  });
};

const fetchClearanceSaleProducts = async () => {
  return await prisma.product.findMany({
    where: {
      discountPercentage: { gte: 50 },
      stock: { lte: 10 },
    },
    orderBy: { discountPercentage: "desc" },
    take: 10,
  });
};

module.exports = {
  getAllCarousels,
  getTotalProducts,
  getPaginatedProducts,
  getFlashDealProducts,
  getCategorySubCategories,
  getFilteredProducts,
  fetchCategories,
  fetchSubCategories,
  fetchProductById,
  fetchProductsBySubCategory,
  fetchTrendingProducts,
  fetchNewArrivals,
  fetchLimitedTimeOffers,
  fetchTopRatedProducts,
  fetchClearanceSaleProducts,
  getMultipleProductsByIds
};
