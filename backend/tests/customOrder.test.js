const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index');
const User = require('../models/User');
const Product = require('../models/Product');

describe('Custom Orders API', () => {
  let userToken;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/test-mobile-covers');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Product.deleteMany({});

    const user = new User({ name: 'Custom User', email: 'custom@example.com', passwordHash: 'user123' });
    await user.save();

    const login = await request(app).post('/api/auth/login').send({ email: 'custom@example.com', password: 'user123' });
    userToken = login.body?.data?.token;
  });

  it('should create a custom order when productId is provided', async () => {
    // create product
    const product = await new Product({
      title: 'Custom Product',
      brand: 'Brand',
      model: 'Model X',
      type: 'Glossy Metal',
      description: 'product for custom tests',
      variants: [{ color: 'Black', price: 450, stock: 5, sku: 'CUST-001', isActive: true }],
      mockupTemplateUrl: 'https://example.com/mockup.png',
      isActive: true
    }).save();

    const payload = {
      productId: product._id.toString(),
      variant: { name: 'Default' },
      quantity: 1,
      imageUrls: [{ original: { url: 'data:image/png;base64,TEST' } }],
      mockupUrl: 'data:image/png;base64,TEST',
      shippingAddress: { name: 'Joe', phone: '1234567890', address1: '123 Main St', city: 'City', state: 'State', postalCode: '12345' }
    };

    const res = await request(app)
      .post('/api/custom/order')
      .set('Authorization', `Bearer ${userToken}`)
      .send(payload)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.customOrder).toBeDefined();
    expect(res.body.data.customOrder.productId).toBe(product._id.toString());
  });

  it('should allow creating a custom order without productId if variant.price is present', async () => {
    const payload = {
      variant: { name: 'FreeForm', price: 600 },
      quantity: 2,
      imageUrls: [{ original: { url: 'data:image/png;base64,TEST2' } }],
      mockupUrl: 'data:image/png;base64,TEST2',
      shippingAddress: { name: 'Jane', phone: '9876543210', address1: '456 Main St', city: 'Town', state: 'State', postalCode: '54321' }
    };

    const res = await request(app)
      .post('/api/custom/order')
      .set('Authorization', `Bearer ${userToken}`)
      .send(payload)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.customOrder).toBeDefined();
    expect(res.body.data.customOrder.productId).toBeFalsy();
    expect(res.body.data.customOrder.price).toBeGreaterThan(0);
  });

  it('should reject custom order without productId or variant.price or explicit price', async () => {
    const payload = {
      variant: { name: 'NoPrice' },
      quantity: 1,
      imageUrls: [{ original: { url: 'data:image/png;base64,TEST3' } }],
      mockupUrl: 'data:image/png;base64,TEST3',
      shippingAddress: { name: 'Bob', phone: '9999999999', address1: '789 Main St', city: 'Metropolis', state: 'State', postalCode: '99999' }
    };

    const res = await request(app)
      .post('/api/custom/order')
      .set('Authorization', `Bearer ${userToken}`)
      .send(payload)
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Unable to determine base price/i);
  });
});
