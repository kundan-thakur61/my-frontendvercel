const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index');
const User = require('../models/User');
const MobileCompany = require('../models/MobileCompany');
const MobileModel = require('../models/MobileModel');
const Theme = require('../models/Theme');

describe('Mobile companies / models / themes', () => {
  let adminToken;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/test-mobile-covers');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await MobileCompany.deleteMany({});
    await MobileModel.deleteMany({});
    await Theme.deleteMany({});

    // create admin user and login to get token
    const admin = new User({ name: 'Admin', email: 'admin_mobile@example.com', passwordHash: 'admin123', role: 'admin' });
    await admin.save();
    const res = await request(app).post('/api/auth/login').send({ email: 'admin_mobile@example.com', password: 'admin123' });
    adminToken = res.body?.data?.token;
  });

  it('should allow admin to create, list and delete mobile company', async () => {
    const createRes = await request(app).post('/api/admin/mobile/companies').set('Authorization', `Bearer ${adminToken}`).send({ name: 'TestBrand', description: 'Test brand description' });
    expect(createRes.statusCode).toBe(201);
    expect(createRes.body.data.name).toBe('TestBrand');

    const listRes = await request(app).get('/api/mobile/companies');
    expect(listRes.statusCode).toBe(200);
    expect(listRes.body.data.companies.some(c => c.name === 'TestBrand')).toBe(true);

    const id = createRes.body.data._id;
    const delRes = await request(app).delete(`/api/admin/mobile/companies/${id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(delRes.statusCode).toBe(200);
  });

  it('should allow creating a model and associate with company', async () => {
    // create a company
    const companyRes = await request(app).post('/api/admin/mobile/companies').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Make1' });
    expect(companyRes.statusCode).toBe(201);
    const companyId = companyRes.body.data._id;

    // create model
    const modelRes = await request(app).post('/api/admin/mobile/models').set('Authorization', `Bearer ${adminToken}`).send({ name: 'X100', company: companyId });
    expect(modelRes.statusCode).toBe(201);
    expect(modelRes.body.data.name).toBe('X100');

    // list models public
    const listModels = await request(app).get('/api/mobile/models');
    expect(listModels.statusCode).toBe(200);
    expect(listModels.body.data.models.some(m => m.name === 'X100')).toBe(true);
  });

  it('should allow creating themes and set active', async () => {
    const t1 = await request(app).post('/api/admin/themes').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Light', key: 'light', variables: { '--bg': '#ffffff', '--text': '#000000' } });
    expect(t1.statusCode).toBe(201);
    const t2 = await request(app).post('/api/admin/themes').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Dark', key: 'dark', variables: { '--bg': '#111827', '--text': '#ffffff' } });
    expect(t2.statusCode).toBe(201);

    // activate Dark
    const act = await request(app).put(`/api/admin/themes/${t2.body.data._id}/activate`).set('Authorization', `Bearer ${adminToken}`);
    expect(act.statusCode).toBe(200);

    // get active (public)
    const active = await request(app).get('/api/mobile/themes/active');
    expect(active.statusCode).toBe(200);
    expect(active.body.data.theme.key).toBe('dark');
  });

  it('should store category and description metadata for themes', async () => {
    const createPayload = {
      name: 'Retro Grid',
      key: 'retro-grid',
      category: 'Vintage',
      description: 'Inspired by synthwave neon gradients.',
      variables: {
        '--bg': '#0f172a',
        '--text': '#f472b6',
        '--accent': '#38bdf8'
      }
    };

    const createRes = await request(app)
      .post('/api/admin/themes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(createPayload);

    expect(createRes.statusCode).toBe(201);
    expect(createRes.body.data.category).toBe('Vintage');
    expect(createRes.body.data.description).toMatch(/synthwave/);

    const listRes = await request(app)
      .get('/api/admin/themes')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.statusCode).toBe(200);
    const themes = listRes.body?.data?.themes || [];
    expect(themes.length).toBe(1);
    const stored = themes[0];
    expect(stored.category).toBe('Vintage');
    expect(stored.description).toContain('synthwave');
    expect(stored.variables['--bg']).toBe('#0f172a');
    expect(stored.variables['--accent']).toBe('#38bdf8');
  });
});
