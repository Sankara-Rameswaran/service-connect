const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../src/app');

// Mock MongoDB connection for tests
jest.mock('../src/config/database', () => async () => {
  await mongoose.connect(process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/serviceconnect_test');
});

const testUser = {
  name: 'Test User',
  email: `test_${Date.now()}@example.com`,
  password: 'Test@123456',
  role: 'USER',
};

const testProvider = {
  name: 'Test Provider',
  email: `provider_${Date.now()}@example.com`,
  password: 'Test@123456',
  role: 'PROVIDER',
};

let userToken, providerToken, serviceId, bookingId;

describe('🔐 Auth API', () => {
  it('POST /api/auth/register - creates user', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('POST /api/auth/register - duplicate email returns 400', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/auth/register - creates provider', async () => {
    const res = await request(app).post('/api/auth/register').send(testProvider);
    expect(res.statusCode).toBe(201);
    providerToken = res.body.data.accessToken;
  });

  it('POST /api/auth/login - valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    userToken = res.body.data.accessToken;
  });

  it('POST /api/auth/login - wrong password returns 401', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: 'WrongPassword',
    });
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/auth/me - returns current user', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.user.email).toBe(testUser.email);
  });

  it('GET /api/auth/me - no token returns 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });
});

describe('🛠️ Services API', () => {
  it('GET /api/services - returns list', async () => {
    const res = await request(app).get('/api/services');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /api/services - provider creates service', async () => {
    const res = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${providerToken}`)
      .field('title', 'Test Plumbing Service')
      .field('description', 'Professional plumbing repairs and installations for your home')
      .field('category', 'Plumbing')
      .field('price', '75')
      .field('priceType', 'FIXED');
    expect(res.statusCode).toBe(201);
    expect(res.body.data.service.title).toBe('Test Plumbing Service');
    serviceId = res.body.data.service._id;
  });

  it('POST /api/services - user cannot create service', async () => {
    const res = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${userToken}`)
      .field('title', 'Unauthorized Service')
      .field('description', 'This should fail')
      .field('category', 'Plumbing')
      .field('price', '50');
    expect(res.statusCode).toBe(403);
  });

  it('GET /api/services/:id - returns service detail', async () => {
    if (!serviceId) return;
    const res = await request(app).get(`/api/services/${serviceId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.service._id).toBe(serviceId);
  });

  it('GET /api/services?category=Plumbing - filters by category', async () => {
    const res = await request(app).get('/api/services?category=Plumbing');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('📋 Bookings API', () => {
  it('POST /api/bookings - user creates booking', async () => {
    if (!serviceId) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        serviceId,
        scheduledDate: tomorrow.toISOString(),
        scheduledTime: '10:00',
        address: { street: '123 Main St', city: 'New York', state: 'NY', zipCode: '10001' },
        notes: 'Please bring tools',
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.booking.status).toBe('PENDING');
    bookingId = res.body.data.booking._id;
  });

  it('GET /api/bookings/my - returns user bookings', async () => {
    const res = await request(app)
      .get('/api/bookings/my')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/bookings/provider - returns provider bookings', async () => {
    const res = await request(app)
      .get('/api/bookings/provider')
      .set('Authorization', `Bearer ${providerToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('PUT /api/bookings/:id/status - provider accepts booking', async () => {
    if (!bookingId) return;
    const res = await request(app)
      .put(`/api/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ status: 'ACCEPTED' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.booking.status).toBe('ACCEPTED');
  });
});

describe('🔔 Notifications API', () => {
  it('GET /api/notifications - returns user notifications', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data.notifications)).toBe(true);
  });
});

describe('💬 Conversations API', () => {
  it('POST /api/conversations - creates conversation', async () => {
    // Get provider ID first
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${providerToken}`);
    const providerId = meRes.body.data.user._id;

    const res = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ participantId: providerId });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.conversation).toBeDefined();
  });
});

afterAll(async () => {
  // Cleanup test data
  try {
    const User = require('../src/models/User');
    const Service = require('../src/models/Service');
    const Booking = require('../src/models/Booking');
    await User.deleteMany({ email: { $in: [testUser.email, testProvider.email] } });
    if (serviceId) await Service.findByIdAndDelete(serviceId);
    if (bookingId) await Booking.findByIdAndDelete(bookingId);
    await mongoose.connection.close();
  } catch (e) {}
});
