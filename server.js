const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const { createClient } = require('@supabase/supabase-js');

// --- CONFIGURATION ---
const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PIN = "0759673853";

// Supabase Credentials (Provided by User)
const SUPABASE_URL = 'https://mtpsrutdzyuaxpzdcidq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10cHNydXRkenl1YXhwemRjaWRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NDA2OTYsImV4cCI6MjA4MzExNjY5Nn0.7C9ALmBeZTE9HWk-fjYB52P0lQuoDN-ZZJY_5bLiJEs'; // Public Anon Key

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'a8f2b3c9d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Multer 'Memory' Storage for Supabase Uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- AUTH ROUTES ---

// Admin Login
app.post('/api/admin-login', (req, res) => {
    const { pin } = req.body;
    if (pin === ADMIN_PIN) {
        req.session.user = { email: 'admin', isAdmin: true };
        return res.json({ success: true });
    }
    res.status(401).json({ error: 'Incorrect PIN' });
});

// User Signup
app.post('/api/signup', async (req, res) => {
    let { email, password } = req.body;
    email = email.toLowerCase().trim();

    // Check if user exists
    const { data: existingUser } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const { error } = await supabase.from('users').insert([{
        email,
        password: hashedPassword,
        cart: [],
        items_ordered: [] // Matching older structure or simple array
    }]);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// User Login
app.post('/api/login', async (req, res) => {
    let { email, password } = req.body;
    email = email.toLowerCase().trim();

    // Fetch user
    const { data: user, error } = await supabase.from('users').select('*').eq('email', email).maybeSingle();

    if (error || !user) {
        // Fallback for hardcoded Admin (if not in DB yet)
        if (email === 'admin' && password === ADMIN_PIN) { 
             // This logic was not clearly in original but let's keep pin flow usually
        }
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (match) {
        const isAdmin = user.is_admin || false;
        req.session.user = { email: user.email, isAdmin: isAdmin };
        return res.json({ success: true, isAdmin: isAdmin, cart: user.cart || [] });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

app.get('/api/check-auth', (req, res) => {
    res.json(req.session.user || null);
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.post('/api/sync-cart', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Login required' });
    const { cart } = req.body;
    
    const { error } = await supabase
        .from('users')
        .update({ cart: cart })
        .eq('email', req.session.user.email);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

app.get('/api/order-history', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Login required' });

    // Fetch orders from 'orders' table joined with user email or id
    // Assuming simple email matching
    const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_email', req.session.user.email)
        .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(orders || []);
});

// --- PRODUCT ROUTES ---

app.get('/api/products', async (req, res) => {
    const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: true }); // Using 'id' created by Date.now() logic from previous code

    if (error) return res.status(500).json({ error: error.message });
    res.json(products || []);
});

// Add Product (Admin Only)
app.post('/api/products', upload.single('image'), async (req, res) => {
    if (!req.session.user || !req.session.user.isAdmin) return res.status(403).json({ error: 'Unauthorized' });

    let imageUrl = '';
    if (req.file) {
        const fileName = `${Date.now()}_${req.file.originalname}`;
        const { data, error } = await supabase.storage
            .from('products')
            .upload(fileName, req.file.buffer, { contentType: req.file.mimetype });
        
        if (error) return res.status(500).json({ error: 'Image upload failed: ' + error.message });
        
        const { data: publicData } = supabase.storage.from('products').getPublicUrl(fileName);
        imageUrl = publicData.publicUrl;
    }

    const newProduct = {
        id: Date.now(), // Keeping number ID for consistency
        name: req.body.name,
        price: parseFloat(req.body.price),
        description: req.body.description,
        category: req.body.category,
        unit: req.body.unit,
        weight: parseFloat(req.body.weight) || 0,
        sale_type: req.body.saleType || 'normal',
        active: req.body.active === 'true',
        variants: JSON.parse(req.body.variants || '[]'),
        image: imageUrl
    };

    const { error } = await supabase.from('products').insert([newProduct]);

    if (error) return res.status(500).json({ error: error.message });
    res.json(newProduct);
});

// Edit Product (Admin Only)
app.put('/api/products/:id', upload.single('image'), async (req, res) => {
    if (!req.session.user || !req.session.user.isAdmin) return res.status(403).json({ error: 'Unauthorized' });

    const productId = req.params.id;
    let updates = {
        name: req.body.name,
        price: parseFloat(req.body.price),
        description: req.body.description,
        category: req.body.category,
        unit: req.body.unit,
        weight: parseFloat(req.body.weight) || 0,
        sale_type: req.body.saleType || 'normal',
        active: req.body.active === 'true',
        variants: JSON.parse(req.body.variants || '[]')
    };

    if (req.file) {
        const fileName = `${Date.now()}_${req.file.originalname}`;
        const { error } = await supabase.storage
            .from('products')
            .upload(fileName, req.file.buffer, { contentType: req.file.mimetype });
        
        if (!error) {
            const { data: publicData } = supabase.storage.from('products').getPublicUrl(fileName);
            updates.image = publicData.publicUrl;
        }
    }

    const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', productId)
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

// Delete Product (Admin Only)
app.delete('/api/products/:id', async (req, res) => {
    if (!req.session.user || !req.session.user.isAdmin) return res.status(403).json({ error: 'Unauthorized' });

    const { error } = await supabase.from('products').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// --- ORDER ROUTES ---

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'safneeasm@gmail.com',
        pass: 'xzcx ddtt evlg iclz' // Use App Password
    }
});

app.post('/api/place-order', async (req, res) => {
    const { customer = {}, payment = 'COD', items = [], subtotal = 0, deliveryCharge = 0, total = 0, totalWeight = 0 } = req.body;
    const orderId = Date.now();

    // 1. Send Email
    const itemsList = items.map(item => `- ${item.name} (Qty: ${item.qty}) - Rs. ${(item.price * item.qty).toLocaleString()}`).join('\n');
    const mailOptions = {
        from: 'safneeasm@gmail.com',
        to: 'safneeasm@gmail.com',
        subject: `NEW ORDER: ${payment} - Total Rs. ${total.toLocaleString()}`,
        text: `New order details:\n\n` +
            `CUSTOMER:\nName: ${customer.name}\nPhone: ${customer.phone}\nAddress: ${customer.address}\nCity: ${customer.city || ''}\nTown: ${customer.town || ''}\nZip: ${customer.zip || ''}\nProvince: ${customer.province || ''}\n\n` +
            `ITEMS:\n${itemsList}\n\n` +
            `--------------------------\n` +
            `Subtotal: Rs. ${subtotal.toLocaleString()}\n` +
            `Total Weight: ${totalWeight.toFixed(2)} kg\n` +
            `Delivery Charge: Rs. ${deliveryCharge.toLocaleString()}\n` +
            `GRAND TOTAL: Rs. ${total.toLocaleString()}\n` +
            `PAYMENT: ${payment}`
    };

    transporter.sendMail(mailOptions, async (error, info) => {
        if (error) console.error("Email Error:", error);

        // 2. Save Order to Supabase
        const orderData = {
            order_id: orderId, // using bigint id
            user_email: req.session.user ? req.session.user.email : null,
            customer_info: customer,
            items: items,
            total,
            payment_method: payment,
            status: 'Processing',
            created_at: new Date()
        };

        const { error: dbError } = await supabase.from('orders').insert([orderData]);
        if (dbError) console.error("DB Error:", dbError);

        // 3. Clear Cart if User Logged In
        if (req.session.user) {
            await supabase.from('users').update({ cart: [] }).eq('email', req.session.user.email);
        }

        res.json({ success: true });
    });
});

// Start Server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}

module.exports = app;
