const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const app = require('../index');
const Product = require('../models/Product');
const User = require('../models/User');

describe('Products API', () => {
  let adminToken, userToken;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/test-mobile-covers');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Product.deleteMany({});
    await User.deleteMany({});

    // Create admin user (password will be hashed by pre-save hook)
    const admin = new User({
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash: 'admin123',
      role: 'admin'
    });
    await admin.save();

    // Create regular user (password will be hashed by pre-save hook)
    const user = new User({
      name: 'Regular User',
      email: 'user@example.com',
      passwordHash: 'user123'
    });
    await user.save();

    // Get tokens
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'admin123' });
    if (!adminLogin.body || !adminLogin.body.data) {
      console.error('Admin login failed response:', JSON.stringify(adminLogin.body, null, 2));
    }
    adminToken = adminLogin.body?.data?.token;

    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'user123' });
    if (!userLogin.body || !userLogin.body.data) {
      console.error('User login failed response:', JSON.stringify(userLogin.body, null, 2));
    }
    userToken = userLogin.body?.data?.token;
  });

  describe('GET /api/products', () => {
    beforeEach(async () => {
      // Create test products
      const products = [
        {
          title: 'iPhone 14 Pro Designer Cover',
          brand: 'Apple',
          model: 'iPhone 14 Pro',
          type: 'Glossy Metal',
          description: 'Premium designer cover for iPhone 14 Pro',
          variants: [
            {
              color: 'Black',
              price: 899,
              stock: 10,
              sku: 'IP14P-BLK-001',
              isActive: true,
              images: []
            },
            {
              color: 'Blue',
              price: 899,
              stock: 5,
              sku: 'IP14P-BLU-001',
              isActive: true,
              images: []
            }
          ],
          mockupTemplateUrl: 'https://example.com/mockup.png',
          isActive: true,
          featured: true
        },
        {
          title: 'Samsung Galaxy S23 Cover',
          brand: 'Samsung',
          model: 'Galaxy S23',
          type: 'Glossy Metal + Gel',
          description: 'Premium cover for Galaxy S23',
          variants: [
            {
              color: 'Red',
              price: 799,
              stock: 8,
              sku: 'GS23-RED-001',
              isActive: true,
              images: []
            }
          ],
          mockupTemplateUrl: 'https://example.com/mockup2.png',
          isActive: true,
          featured: false
        }
      ];

      for (const product of products) {
        await new Product(product).save();
      }
    });

    it('should get all products', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(2);
      expect(response.body.data.pagination.totalProducts).toBe(2);
    });

    it('should filter products by brand', async () => {
      const response = await request(app)
        .get('/api/products?brand=Apple')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(1);
      expect(response.body.data.products[0].brand).toBe('Apple');
    });

    it('should filter products by search term', async () => {
      const response = await request(app)
        .get('/api/products?search=iPhone')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(1);
      expect(response.body.data.products[0].title).toContain('iPhone');
    });

    it('should paginate products', async () => {
      const response = await request(app)
        .get('/api/products?page=1&limit=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(1);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.totalPages).toBe(2);
    });

    it('should sort products by price', async () => {
      const response = await request(app)
        .get('/api/products?sort=variants.price')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products[0].variants[0].price).toBe(799);
    });
  });

  describe('GET /api/products/:id', () => {
    let productId;

    beforeEach(async () => {
      const product = new Product({
        title: 'Test Product',
        brand: 'Test Brand',
        model: 'Test Model',
        type: 'Glossy Metal',
        description: 'Test description',
        variants: [
          {
            color: 'Black',
            price: 999,
            stock: 10,
            sku: 'TEST-BLK-001',
            isActive: true,
            images: []
          }
        ],
        mockupTemplateUrl: 'https://example.com/mockup.png',
        isActive: true
      });
      
      const savedProduct = await product.save();
      productId = savedProduct._id;
    });

    it('should get product by ID', async () => {
      const response = await request(app)
        .get(`/api/products/${productId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.product._id).toBe(productId.toString());
      expect(response.body.data.product.title).toBe('Test Product');
    });

    it('should return 404 for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/products/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/products (Admin only)', () => {
    it('should create product as admin', async () => {
      const productData = {
        title: 'New Product',
        brand: 'New Brand',
        model: 'New Model',
        type: 'Glossy Metal',
        description: 'New product description',
        category: 'Designer',
        featured: true
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(productData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.product.title).toBe(productData.title);
      expect(response.body.data.product.brand).toBe(productData.brand);
    });

    it('should not create product as regular user', async () => {
      const productData = {
        title: 'New Product',
        brand: 'New Brand',
        model: 'New Model',
        type: 'Glossy Metal',
        description: 'New product description'
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${userToken}`)
        .send(productData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const productData = {
        title: 'New Product'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(productData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('PUT /api/products/:id (Admin only)', () => {
    let productId;

    beforeEach(async () => {
      const product = new Product({
        title: 'Original Product',
        brand: 'Original Brand',
        model: 'Original Model',
        type: 'Glossy Metal',
        description: 'Original description',
        variants: [],
        mockupTemplateUrl: 'https://example.com/mockup.png',
        isActive: true
      });
      
      const savedProduct = await product.save();
      productId = savedProduct._id;
    });

    it('should update product as admin', async () => {
      const updateData = {
        title: 'Updated Product',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.product.title).toBe(updateData.title);
      expect(response.body.data.product.description).toBe(updateData.description);
    });

    it('should not update product as regular user', async () => {
      const updateData = {
        title: 'Updated Product'
      };

      const response = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/products/:id (Admin only)', () => {
    let productId;

    beforeEach(async () => {
      const product = new Product({
        title: 'Product to Delete',
        brand: 'Test Brand',
        model: 'Test Model',
        type: 'Glossy Metal',
        description: 'Description',
        variants: [],
        mockupTemplateUrl: 'https://example.com/mockup.png',
        isActive: true
      });
      
      const savedProduct = await product.save();
      productId = savedProduct._id;
    });

    it('should delete product as admin', async () => {
      const response = await request(app)
        .delete(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify product is deleted
      const getResponse = await request(app)
        .get(`/api/products/${productId}`)
        .expect(404);
    });

    it('should not delete product as regular user', async () => {
      const response = await request(app)
        .delete(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});