const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index');
const User = require('../models/User');
const Product = require('../models/Product');

describe('Orders with custom cart items', () => {
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

    const user = new User({ name: 'Order User', email: 'order@example.com', passwordHash: 'user123' });
    await user.save();

    const login = await request(app).post('/api/auth/login').send({ email: 'order@example.com', password: 'user123' });
    userToken = login.body?.data?.token;
  });

  it('should accept mixed orders with a custom cart item and a regular product', async () => {
    const product = await new Product({
      title: 'Regular Product',
      brand: 'ACME',
      model: 'R-1',
      type: 'Glossy Metal',
      description: 'Regular product',
      variants: [{ color: 'Blue', price: 200, stock: 10, sku: 'REG-1', isActive: true }],
      isActive: true
    }).save();

    const payload = {
      items: [
        {
          productId: product._id.toString(),
          variantId: product.variants[0]._id.toString(),
          quantity: 1,
          price: product.variants[0].price
        },
        {
          productId: 'custom_1764094838341',
          variantId: 'v_1764094838341',
          quantity: 2,
          price: 350,
          product: { title: 'Custom Cover', design: { imgSrc: 'data:image/png;base64,TEST' } },
          variant: { name: 'CustomVariant', color: 'Red' }
        }
      ],
      total: 200 + (350 * 2),
      paymentMethod: 'cod',
      shippingAddress: { name: 'Test', phone: '1234567890', address1: '123 Main Addr', city: 'City', state: 'State', postalCode: '00000' }
    };

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send(payload)
      .expect(201);

    expect(res.body.success).toBe(true);
    const order = res.body.data.order;
    expect(order).toBeDefined();
    expect(order.items.length).toBe(2);

    // Verify totals and custom item properties preserved
    const customItem = order.items.find(i => i.productId === 'custom_1764094838341');
    expect(customItem).toBeTruthy();
    expect(customItem.price).toBe(350);
    expect(order.total).toBe(200 + 350 * 2);
  });
});
