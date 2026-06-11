const Service = require('../models/Service');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

const createService = async (req, res, next) => {
  try {
    const { title, description, category, price, priceType, tags, lat, lng, serviceArea } =
      req.body;

    const images = req.files ? req.files.map((f) => f.path || `/uploads/${f.filename}`) : [];

    const service = await Service.create({
      provider: req.user._id,
      title,
      description,
      category,
      price,
      priceType,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim())) : [],
      images,
      location: {
        type: 'Point',
        coordinates: [parseFloat(lng) || 0, parseFloat(lat) || 0],
      },
      serviceArea: serviceArea || 25,
    });

    await service.populate('provider', 'name avatar averageRating');
    return successResponse(res, { service }, 'Service created', 201);
  } catch (error) {
    next(error);
  }
};

const getServices = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      minPrice,
      maxPrice,
      rating,
      search,
      lat,
      lng,
      radius = 50,
      sort = '-createdAt',
      availability,
    } = req.query;

    const filter = { isActive: true };
    if (category) filter.category = category;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    if (rating) filter.averageRating = { $gte: parseFloat(rating) };
    if (search) filter.$text = { $search: search };

    if (lat && lng) {
      filter.location = {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseFloat(radius) * 1000,
        },
      };
    }

    // Filter by provider availability
    if (availability) {
      const providers = await require('../models/User').find({
        role: 'PROVIDER',
        availability,
      }).select('_id');
      filter.provider = { $in: providers.map((p) => p._id) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [services, total] = await Promise.all([
      Service.find(filter)
        .populate('provider', 'name avatar averageRating availability')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Service.countDocuments(filter),
    ]);

    return paginatedResponse(res, services, total, page, limit, 'Services fetched');
  } catch (error) {
    next(error);
  }
};

const getServiceById = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id).populate(
      'provider',
      'name avatar bio averageRating totalReviews availability phone'
    );
    if (!service) return errorResponse(res, 'Service not found', 404);
    return successResponse(res, { service });
  } catch (error) {
    next(error);
  }
};

const updateService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return errorResponse(res, 'Service not found', 404);
    if (service.provider.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return errorResponse(res, 'Not authorized', 403);
    }

    const updates = { ...req.body };
    if (req.files && req.files.length > 0) {
      updates.images = req.files.map((f) => f.path || `/uploads/${f.filename}`);
    }
    if (updates.lat && updates.lng) {
      updates.location = {
        type: 'Point',
        coordinates: [parseFloat(updates.lng), parseFloat(updates.lat)],
      };
    }

    const updated = await Service.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).populate('provider', 'name avatar averageRating');

    return successResponse(res, { service: updated }, 'Service updated');
  } catch (error) {
    next(error);
  }
};

const deleteService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return errorResponse(res, 'Service not found', 404);
    if (service.provider.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return errorResponse(res, 'Not authorized', 403);
    }
    await service.deleteOne();
    return successResponse(res, {}, 'Service deleted');
  } catch (error) {
    next(error);
  }
};

const getMyServices = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [services, total] = await Promise.all([
      Service.find({ provider: req.user._id })
        .sort('-createdAt')
        .skip(skip)
        .limit(parseInt(limit)),
      Service.countDocuments({ provider: req.user._id }),
    ]);
    return paginatedResponse(res, services, total, page, limit);
  } catch (error) {
    next(error);
  }
};

module.exports = { createService, getServices, getServiceById, updateService, deleteService, getMyServices };
