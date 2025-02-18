const productModel = require("../models/productModel");
const { elasticSearch } = require("../services/searchServices");
const { sendResponse } = require("../utils/responseHandler");

const getCarousel = async (req, res) => {
  try {
    const carousel = await productModel.getAllCarousels();

    if (!carousel) {
      return sendResponse(res, {
        status: 404,
        type: "error",
        message: "carousel not found...",
        data: null,
      });
    }

    sendResponse(res, {
      status: 200,
      type: "success",
      message: "carousel data fetched successfully..",
      data: carousel,
    });
  } catch (error) {
    sendResponse(res, {
      status: 500,
      type: "error",
      message: "Internal Server Error on getCarousel",
      data: {
        error: error.message,
      },
    });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const pageInt = parseInt(page, 10);
    const limitInt = parseInt(limit, 10);
    const offset = (pageInt - 1) * limitInt;

    const totalProducts = await productModel.getTotalProducts();
    const totalPages = Math.ceil(totalProducts / limitInt);

    const allProducts = await productModel.getPaginatedProducts(
      offset,
      limitInt
    );

    sendResponse(res, {
      status: 200,
      type: "success",
      message: "Product fetched successfully",
      data: allProducts,
      totalPages: totalPages,
    });
  } catch (error) {
    console.error(error.message);
    sendResponse(res, {
      status: 500,
      type: "error",
      message: "Internal Server Error in getAllProducts",
      error: error.message,
    });
  }
};

const getFlashDealProducts = async (req, res) => {
  try {
    const products = await productModel.getFlashDealProducts();

    if (!products) {
      return sendResponse(res, {
        status: 404,
        type: "error",
        message: "Flash deal product not found.",
        data: null,
      });
    }
    sendResponse(res, {
      status: 200,
      type: "success",
      message: "Successfully fetched flashdeal products.",
      data: products,
    });
  } catch (error) {
    console.error(error.message);
    sendResponse(res, {
      status: 500,
      type: "error",
      message: "Internal Server Error on getFlashDealProducts",
      error: error.message,
    });
  }
};

const getFilteredProducts = async (req, res) => {
  try {
    const {
      categoryName,
      subCategoryNames,
      minPrice,
      maxPrice,
      sort,
      page = 1,
      limit = 10,
    } = req.query;

    const pageInt = parseInt(page, 10);
    const limitInt = parseInt(limit, 10);
    const offset = (pageInt - 1) * limitInt;

    let filter = {};

    if (minPrice || maxPrice) {
      filter.offerPrice = {};
      if (minPrice) filter.offerPrice.gte = parseFloat(minPrice);
      if (maxPrice) filter.offerPrice.lte = parseFloat(maxPrice);
    }

    let subCategories = subCategoryNames
      ? Array.isArray(subCategoryNames)
        ? subCategoryNames
        : subCategoryNames.split(",")
      : categoryName
      ? await productModel.getCategorySubCategories(categoryName)
      : [];

    if (subCategories.length > 0) {
      filter.subCategory = { name: { in: subCategories } };
    }

    if (subCategories.length > 0) {
      filter.subCategory = { name: { in: subCategories } };
    }

    const { products, totalCount } = await productModel.getFilteredProducts(
      filter,
      sort,
      offset,
      limitInt
    );

    console.log("totalCount : ", totalCount);

    if (!products.length) {
      return sendResponse(res, {
        status: 404,
        type: "error",
        message: "No products found matching the filters.",
        data: null,
      });
    }

    const totalPages = Math.ceil(totalCount / limitInt);

    sendResponse(res, {
      status: 200,
      type: "success",
      message: "Success",
      data: products,
      length: products.length,
      totalPages: totalPages,
    });
  } catch (error) {
    sendResponse(res, {
      status: 500,
      type: "error",
      message: "Internal Server Error in getFilteredProducts.",
      error: error.message,
    });
  }
};

const searchProducts = async (req, res) => {
  const { query, page = 1, limit = 10 } = req.query;
  console.log(req.query);

  const offset = (page - 1) * limit;

  if (!query) {
    return sendResponse(res, {
      status: 400,
      type: "error",
      message: "Search query is required",
      data: null,
    });
  }

  try {
    const { data, totalCount } = await elasticSearch(query, offset, limit);
    if (!data.length) {
      return sendResponse(res, {
        status: 404,
        type: "error",
        message: "products not found for this query.",
      });
    }
    console.log("totalCount : ", totalCount);
    const totalPages = Math.ceil(totalCount / limit);

    sendResponse(res, {
      status: 200,
      type: "success",
      message: "Search result fetched.",
      data: data,
      totalPages: totalPages,
    });
  } catch (error) {
    console.error("Error fetching products from Elasticsearch:", error);
    sendResponse(res, {
      status: 500,
      type: "error",
      message: "Internal Server Error in searchProducts",
      error: error.message,
    });
  }
};

const getCategory = async (req, res) => {
  try {
    const categories = await productModel.fetchCategories();

    sendResponse(res, {
      status: 200,
      type: "success",
      message: "Success",
      data: categories,
    });
  } catch (error) {
    sendResponse(res, {
      status: 500,
      type: "error",
      message: "Internal Server Error in getCategory",
      error: error.message,
    });
  }
};

const getSubCategory = async (req, res) => {
  try {
    const { categoryId } = req.query;

    if (!categoryId) {
      return sendResponse(res, {
        status: 400,
        type: "error",
        message: "Category ID is required.",
      });
    }

    const subCategories = await productModel.fetchSubCategories(categoryId);

    sendResponse(res, {
      status: 200,
      type: "success",
      message: "Subcategories are successfully fetched.",
      data: subCategories,
    });
  } catch (error) {
    console.error(error.message);
    sendResponse(res, {
      status: 500,
      type: "error",
      message: "Internal Server Error in getSubCategory",
      error: error.message,
    });
  }
};

const getProdyctById = async (req, res) => {
  try {
    const { productId } = req.query;

    if (!productId || isNaN(productId)) {
      return sendResponse(res, {
        status: 400,
        type: "error",
        message: "Invalid or missing productId.",
      });
    }
    const product = await productModel.fetchProductById(productId);

    if (!product) {
      sendResponse(res, {
        status: 404,
        type: "error",
        message: "Product not found.",
        data: null,
      });
    }
    sendResponse(res, {
      status: 200,
      type: "success",
      message: `Product with id ${productId} retrieved successfully.`,
      data: product,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, {
      status: 500,
      type: "error",
      message: "Internal Server Error in getProdyctById.",
    });
  }
};

const getProductsBySubCategory = async (req, res) => {
  try {
    const { subCategoryId } = req.query;

    if (!subCategoryId || isNaN(subCategoryId)) {
      return sendResponse(res, {
        status: 400,
        type: "error",
        message: "Invalid or missing subCategoryId.",
      });
    }
    const Products = await productModel.fetchProductsBySubCategory(
      subCategoryId
    );

    if (!Products) {
      return sendResponse(res, {
        status: 404,
        type: "error",
        message: "No Products Found.",
        data: null,
      });
    }
    sendResponse(res, {
      status: 200,
      type: "success",
      message: "Success",
      data: Products,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, {
      status: 500,
      type: "error",
      message: "Internal Server Error in getProductsBySubCategory",
    });
  }
};

const getTrendingProducts = async (req, res) => {
  try {
    const trendingProducts = await productModel.fetchTrendingProducts();

    if (!trendingProducts || trendingProducts.length === 0) {
      return sendResponse(res, {
        status: 404,
        type: "error",
        message: "Trending products not found.",
        data: null,
      });
    }

    sendResponse(res, {
      status: 200,
      type: "success",
      message: "Trending products retrieved successfully.",
      data: trendingProducts,
    });
  } catch (error) {
    console.error("Error fetching trending products:", error.message);
    sendResponse(res, {
      status: 500,
      type: "error",
      message: "Internal Server Error in getTrendingProducts",
      error: error.message,
    });
  }
};

const getNewArrivals = async (req, res) => {
  try {
    const newArrivals = await productModel.fetchNewArrivals();

    if (!newArrivals || newArrivals.length === 0) {
      return sendResponse(res, {
        status: 404,
        type: "error",
        message: "New arrivals not found.",
        data: null,
      });
    }

    sendResponse(res, {
      status: 200,
      type: "success",
      message: "New arrivals retrieved successfully.",
      data: newArrivals,
    });
  } catch (error) {
    console.error("Error fetching new arrivals:", error.message);
    sendResponse(res, {
      status: 500,
      type: "error",
      message: "Internal Server Error in getNewArrivals",
      error: error.message,
    });
  }
};

const getLimitedTimeOffers = async (req, res) => {
  try {
    const now = new Date();
    const limitedOffers = await productModel.fetchLimitedTimeOffers();

    if (!limitedOffers || limitedOffers.length === 0) {
      return sendResponse(res, {
        status: 404,
        type: "error",
        message: "No limited time offers found.",
        data: null,
      });
    }

    sendResponse(res, {
      status: 200,
      type: "success",
      message: "Limited time offers retrieved successfully.",
      data: limitedOffers,
    });
  } catch (error) {
    console.error("Error fetching limited time offers:", error.message);
    sendResponse(res, {
      status: 500,
      type: "error",
      message: "Internal Server Error in getLimitedTimeOffers",
      error: error.message,
    });
  }
};

const getTopRatedProducts = async (req, res) => {
  try {
    const topRatedProducts = await productModel.fetchTopRatedProducts();

    if (!topRatedProducts || topRatedProducts.length === 0) {
      return sendResponse(res, {
        status: 404,
        type: "error",
        message: "Top-rated products not found.",
        data: null,
      });
    }

    sendResponse(res, {
      status: 200,
      type: "success",
      message: "Top-rated products retrieved successfully.",
      data: topRatedProducts,
    });
  } catch (error) {
    console.error("Error fetching top-rated products:", error.message);
    sendResponse(res, {
      status: 500,
      type: "error",
      message: "Internal Server Error in getTopRatedProducts",
      error: error.message,
    });
  }
};

const getClearanceSaleProducts = async (req, res) => {
  try {
    const clearanceSaleProducts =
      await productModel.fetchClearanceSaleProducts();

    if (!clearanceSaleProducts || clearanceSaleProducts.length === 0) {
      return sendResponse(res, {
        status: 404,
        type: "error",
        message: "No clearance sale products found.",
        data: null,
      });
    }

    sendResponse(res, {
      status: 200,
      type: "success",
      message: "Clearance sale products retrieved successfully.",
      data: clearanceSaleProducts,
    });
  } catch (error) {
    console.error("Error fetching clearance sale products:", error.message);
    sendResponse(res, {
      status: 500,
      type: "error",
      message: "Internal Server Error in getClearanceSaleProducts",
      error: error.message,
    });
  }
};

module.exports = {
  getAllProducts,
  getFlashDealProducts,
  getFilteredProducts,
  searchProducts,
  getCategory,
  getSubCategory,
  getProdyctById,
  getProductsBySubCategory,
  getTrendingProducts,
  getNewArrivals,
  getLimitedTimeOffers,
  getTopRatedProducts,
  getClearanceSaleProducts,
  getCarousel,
};
