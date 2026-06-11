require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/serviceconnect';

const categories = ['Plumbing', 'Electrical', 'Cleaning', 'Painting', 'Carpentry', 'Landscaping', 'HVAC', 'Handyman'];

const serviceTemplates = [
  { category: 'Plumbing', title: 'Emergency Pipe Repair', description: 'Fast, reliable pipe leak detection and repair. Available 24/7 for emergencies. Licensed and insured.', price: 85, priceType: 'HOURLY' },
  { category: 'Plumbing', title: 'Water Heater Installation', description: 'Professional water heater installation and replacement. All brands supported.', price: 350, priceType: 'FIXED' },
  { category: 'Electrical', title: 'Outlet & Switch Installation', description: 'Safe installation of outlets, switches, and circuit breakers by certified electrician.', price: 75, priceType: 'HOURLY' },
  { category: 'Electrical', title: 'Ceiling Fan Installation', description: 'Expert ceiling fan installation with proper wiring. Includes hardware.', price: 120, priceType: 'FIXED' },
  { category: 'Cleaning', title: 'Deep Home Cleaning', description: 'Thorough top-to-bottom home cleaning. Eco-friendly products. Satisfaction guaranteed.', price: 150, priceType: 'FIXED' },
  { category: 'Cleaning', title: 'Move-In/Out Cleaning', description: 'Complete cleaning service for moving transitions. Leaves the space spotless.', price: 200, priceType: 'FIXED' },
  { category: 'Painting', title: 'Interior Room Painting', description: 'Professional interior painting with premium paint. Clean, precise work.', price: 300, priceType: 'FIXED' },
  { category: 'Painting', title: 'Exterior House Painting', description: 'Weather-resistant exterior painting. Proper prep and primer included.', price: 800, priceType: 'NEGOTIABLE' },
  { category: 'Carpentry', title: 'Custom Shelving Installation', description: 'Custom-built and installed shelving solutions for any room.', price: 200, priceType: 'FIXED' },
  { category: 'Landscaping', title: 'Lawn Mowing & Edging', description: 'Regular lawn maintenance including mowing, edging, and cleanup.', price: 60, priceType: 'FIXED' },
  { category: 'HVAC', title: 'AC Maintenance & Tune-Up', description: 'Complete AC system inspection, cleaning, and tune-up for peak performance.', price: 120, priceType: 'FIXED' },
  { category: 'Handyman', title: 'General Home Repairs', description: 'Expert handyman for all your small to medium home repair needs. No job too small.', price: 65, priceType: 'HOURLY' },
];

const providerData = [
  { name: 'James Wilson', email: 'james@demo.com', bio: 'Master plumber with 15 years experience. Licensed and insured in 5 states.', skills: ['Plumbing', 'Pipe Repair', 'Water Heaters'] },
  { name: 'Maria Garcia', email: 'maria@demo.com', bio: 'Certified electrician specializing in residential and light commercial work.', skills: ['Electrical', 'Wiring', 'Panel Upgrades'] },
  { name: 'Robert Chen', email: 'robert@demo.com', bio: 'Professional cleaner with attention to detail. Eco-friendly products only.', skills: ['Cleaning', 'Deep Clean', 'Organization'] },
  { name: 'Sarah Mitchell', email: 'sarah@demo.com', bio: 'Interior and exterior painting specialist. 10+ years of quality work.', skills: ['Painting', 'Color Consulting', 'Staining'] },
];

const userData = [
  { name: 'Alice Thompson', email: 'alice@demo.com' },
  { name: 'Bob Martinez', email: 'bob@demo.com' },
  { name: 'Carol White', email: 'carol@demo.com' },
];

async function seed() {
  console.log('🌱 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected');

  // Clear existing demo data
  const User = require('./src/models/User');
  const Service = require('./src/models/Service');
  const Booking = require('./src/models/Booking');
  const { Review, Notification } = require('./src/models/index');

  const demoEmails = [...providerData.map(p => p.email), ...userData.map(u => u.email), 'user@demo.com', 'provider@demo.com'];
  await User.deleteMany({ email: { $in: demoEmails } });
  console.log('🗑  Cleared demo users');

  // Create admin if not exists
  const existingAdmin = await User.findOne({ role: 'ADMIN' });
  if (!existingAdmin) {
    await User.create({
      name: 'Admin',
      email: process.env.ADMIN_EMAIL || 'admin@serviceconnect.com',
      password: process.env.ADMIN_PASSWORD || 'Admin@123456',
      role: 'ADMIN',
    });
    console.log('✅ Admin created: admin@serviceconnect.com / Admin@123456');
  }

  // Create providers
  const providers = [];
  for (const p of providerData) {
    const user = await User.create({
      ...p,
      password: 'Demo@123456',
      role: 'PROVIDER',
      availability: ['ONLINE', 'ONLINE', 'BUSY', 'ONLINE'][providers.length],
      averageRating: parseFloat((3.8 + Math.random() * 1.2).toFixed(1)),
      totalReviews: Math.floor(Math.random() * 40) + 5,
      totalEarnings: parseFloat((Math.random() * 5000 + 500).toFixed(2)),
    });
    providers.push(user);
  }
  console.log(`✅ Created ${providers.length} demo providers`);

  // Also create generic demo accounts
  const demoProvider = await User.create({
    name: 'Demo Provider',
    email: 'provider@demo.com',
    password: 'Demo@123456',
    role: 'PROVIDER',
    availability: 'ONLINE',
    bio: 'Demo provider account for testing',
    averageRating: 4.5,
    totalReviews: 12,
  });
  providers.push(demoProvider);

  // Create users
  const users = [];
  for (const u of userData) {
    const user = await User.create({ ...u, password: 'Demo@123456', role: 'USER' });
    users.push(user);
  }
  const demoUser = await User.create({
    name: 'Demo User',
    email: 'user@demo.com',
    password: 'Demo@123456',
    role: 'USER',
  });
  users.push(demoUser);
  console.log(`✅ Created ${users.length} demo users`);

  // Create services
  const createdServices = [];
  for (let i = 0; i < serviceTemplates.length; i++) {
    const tmpl = serviceTemplates[i];
    const provider = providers[i % (providers.length - 1)]; // exclude demo provider
    const service = await Service.create({
      ...tmpl,
      provider: provider._id,
      tags: [tmpl.category.toLowerCase(), 'professional', 'insured'],
      location: {
        type: 'Point',
        coordinates: [-74.006 + (Math.random() - 0.5) * 0.2, 40.7128 + (Math.random() - 0.5) * 0.2],
      },
      averageRating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
      totalBookings: Math.floor(Math.random() * 30),
      totalReviews: Math.floor(Math.random() * 20),
    });
    createdServices.push(service);
  }
  console.log(`✅ Created ${createdServices.length} demo services`);

  // Create bookings
  const statuses = ['COMPLETED', 'COMPLETED', 'ACCEPTED', 'PENDING', 'CANCELLED'];
  const bookings = [];
  for (let i = 0; i < 8; i++) {
    const user = users[i % users.length];
    const service = createdServices[i % createdServices.length];
    const status = statuses[i % statuses.length];
    const date = new Date();
    date.setDate(date.getDate() + (i - 3));
    const booking = await Booking.create({
      user: user._id,
      provider: service.provider,
      service: service._id,
      status,
      scheduledDate: date,
      scheduledTime: `${9 + i}:00`,
      address: { street: `${100 + i} Main St`, city: 'New York', state: 'NY', zipCode: '10001' },
      paymentAmount: service.price,
      paymentStatus: status === 'COMPLETED' ? 'PAID' : 'UNPAID',
      completedAt: status === 'COMPLETED' ? new Date() : undefined,
      reviewSubmitted: false,
    });
    bookings.push(booking);
  }
  console.log(`✅ Created ${bookings.length} demo bookings`);

  // Create reviews for completed bookings
  const completedBookings = bookings.filter(b => b.status === 'COMPLETED');
  for (const booking of completedBookings) {
    const rating = Math.floor(Math.random() * 2) + 4; // 4 or 5 stars
    await Review.create({
      booking: booking._id,
      user: booking.user,
      provider: booking.provider,
      service: booking.service,
      rating,
      comment: ['Great work! Very professional.', 'Excellent service, highly recommend!', 'Arrived on time and did a fantastic job.'][Math.floor(Math.random() * 3)],
    });
    booking.reviewSubmitted = true;
    await booking.save();
  }
  console.log(`✅ Created ${completedBookings.length} demo reviews`);

  console.log('\n🎉 Seed completed!\n');
  console.log('Demo Accounts:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin:    admin@serviceconnect.com  / Admin@123456');
  console.log('User:     user@demo.com           / Demo@123456');
  console.log('Provider: provider@demo.com       / Demo@123456');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
