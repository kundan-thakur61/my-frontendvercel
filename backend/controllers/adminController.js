const Order = require('../models/Order');
const CustomOrder = require('../models/CustomOrder');
const User = require('../models/User');
const logger = require('../utils/logger');

const formatOrderSummary = (order) => ({
  id: order._id,
  orderNumber: `ORD-${order._id.toString().slice(-8).toUpperCase()}`,
  customerName: order.shippingAddress?.name || order.userId?.name || 'Unknown',
  customerEmail: order.userId?.email || null,
  total: order.total,
  status: order.status,
  paymentStatus: order.payment?.status || 'pending',
  createdAt: order.createdAt
});

const formatCustomOrderSummary = (order) => ({
  id: order._id,
  orderNumber: `CUST-${order._id.toString().slice(-8).toUpperCase()}`,
  customerName: order.shippingAddress?.name || order.userId?.name || 'Unknown',
  customerEmail: order.userId?.email || null,
  product: {
    title: order.productId?.title || 'Custom Product',
    model: order.productId?.model || ''
  },
  price: order.price,
  status: order.status,
  createdAt: order.createdAt
});

/**
 * GET /api/admin/overview
 * Aggregated metrics for the admin dashboard
 */
const getDashboardOverview = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const last7Days = new Date(now);
    last7Days.setDate(now.getDate() - 6);

    const [
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      totalOrders,
      pendingOrders,
      deliveredOrders,
      totalCustomOrders,
      pendingCustomOrders,
      standardRevenueAgg,
      customRevenueAgg,
      salesTrendAgg,
      topProductsAgg,
      recentOrdersRaw,
      recentCustomOrdersRaw
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'delivered' }),
      CustomOrder.countDocuments(),
      CustomOrder.countDocuments({ status: 'pending' }),
      Order.aggregate([
        { $group: { _id: null, totalRevenue: { $sum: '$total' } } }
      ]),
      CustomOrder.aggregate([
        { $group: { _id: null, totalRevenue: { $sum: '$price' } } }
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: last7Days } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$total' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Order.aggregate([
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            title: { $first: '$items.title' },
            model: { $first: '$items.model' },
            totalQuantity: { $sum: '$items.quantity' },
            totalSales: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
          }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 5 }
      ]),
      Order.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .select('total status createdAt shippingAddress payment userId')
        .populate('userId', 'name email'),
      CustomOrder.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .select('price status createdAt shippingAddress userId productId')
        .populate('userId', 'name email')
        .populate('productId', 'title model')
    ]);

    const salesTrendMap = salesTrendAgg.reduce((acc, item) => {
      acc[item._id] = {
        revenue: item.revenue,
        orders: item.orders
      };
      return acc;
    }, {});

    const salesTrend = Array.from({ length: 7 }).map((_, idx) => {
      const day = new Date(last7Days);
      day.setDate(last7Days.getDate() + idx);
      const key = day.toISOString().slice(0, 10);
      const entry = salesTrendMap[key] || { revenue: 0, orders: 0 };

      return {
        date: key,
        revenue: entry.revenue,
        orders: entry.orders
      };
    });

    const overview = {
      totalRevenue: (standardRevenueAgg[0]?.totalRevenue || 0) + (customRevenueAgg[0]?.totalRevenue || 0),
      storeRevenue: standardRevenueAgg[0]?.totalRevenue || 0,
      customRevenue: customRevenueAgg[0]?.totalRevenue || 0,
      totalOrders,
      pendingOrders,
      deliveredOrders,
      totalCustomOrders,
      pendingCustomOrders,
      totalUsers,
      activeUsers,
      newUsersThisMonth
    };

    res.json({
      success: true,
      data: {
        overview,
        salesTrend,
        topProducts: topProductsAgg,
        recentOrders: recentOrdersRaw.map(formatOrderSummary),
        recentCustomOrders: recentCustomOrdersRaw.map(formatCustomOrderSummary),
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error generating admin dashboard overview:', error);
    next(error);
  }
};

module.exports = {
  getDashboardOverview
};

