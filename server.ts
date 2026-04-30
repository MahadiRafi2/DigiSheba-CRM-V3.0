import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

import pool from "./db";

async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE,
        password VARCHAR(255),
        name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'staff'
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        source VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX (user_id),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        name VARCHAR(255),
        type VARCHAR(50), 
        cost_price DECIMAL(10,2),
        selling_price DECIMAL(10,2),
        INDEX (user_id),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        customer_id INT,
        product_id INT,
        amount DECIMAL(10,2),
        profit DECIMAL(10,2),
        payment_method VARCHAR(100),
        date DATETIME,
        renewal_date DATETIME,
        status VARCHAR(50) DEFAULT 'Pending',
        order_id VARCHAR(255),
        day30_sent TINYINT(1) DEFAULT 0,
        day15_sent TINYINT(1) DEFAULT 0,
        expired_sent TINYINT(1) DEFAULT 0,
        INDEX (user_id),
        INDEX (customer_id),
        INDEX (product_id),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL,
        FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE SET NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS renewal_email_settings (
        user_id INT PRIMARY KEY,
        day30_subject TEXT,
        day30_body TEXT,
        day15_subject TEXT,
        day15_body TEXT,
        expired_subject TEXT,
        expired_body TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS smtp_settings (
        user_id INT PRIMARY KEY,
        host VARCHAR(255),
        port INT,
        user VARCHAR(255),
        pass VARCHAR(255),
        from_email VARCHAR(255),
        from_name VARCHAR(255),
        secure TINYINT(1) DEFAULT 1,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_email_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT UNIQUE,
        subject TEXT,
        body TEXT,
        FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS canva_renewal_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        name VARCHAR(255),
        phone VARCHAR(50),
        email VARCHAR(255),
        package_name VARCHAR(255),
        price DECIMAL(10,2),
        payment_method VARCHAR(100),
        sender_number VARCHAR(50),
        transaction_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Pending',
        created_at DATETIME,
        INDEX (user_id),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS canva_renewal_settings (
        user_id INT PRIMARY KEY,
        packages TEXT,
        payment_info TEXT,
        banner_url TEXT,
        page_title VARCHAR(255),
        page_description TEXT,
        bkash_logo TEXT,
        nagad_logo TEXT,
        rocket_logo TEXT,
        redirect_url VARCHAR(255),
        approval_email_template TEXT,
        rejection_email_template TEXT,
        approval_email_subject VARCHAR(255),
        rejection_email_subject VARCHAR(255),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS global_templates (
        user_id INT PRIMARY KEY,
        approved_subject TEXT,
        approved_body TEXT,
        rejected_subject TEXT,
        rejected_body TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS branding_settings (
        user_id INT PRIMARY KEY,
        logo_url TEXT,
        admin_logo_url TEXT,
        favicon_url TEXT,
        site_name VARCHAR(255),
        show_floating_login TINYINT(1) DEFAULT 1,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Ensure show_floating_login column exists
    try {
      await pool.query(`ALTER TABLE branding_settings ADD COLUMN show_floating_login TINYINT(1) DEFAULT 1`);
    } catch (e) {}

    // Ensure columns for Canva settings (incremental updates)
    const columns = [
      'bkash_logo', 'nagad_logo', 'rocket_logo', 'redirect_url',
      'approval_email_template', 'rejection_email_template',
      'approval_email_subject', 'rejection_email_subject'
    ];
    for (const col of columns) {
      try {
        await pool.query(`ALTER TABLE canva_renewal_settings ADD COLUMN ${col} TEXT`);
      } catch (e) {}
    }

    const saleExtraColumns = ['day30_sent', 'day15_sent', 'expired_sent'];
    for (const col of saleExtraColumns) {
      try {
        await pool.query(`ALTER TABLE sales ADD COLUMN ${col} TINYINT(1) DEFAULT 0`);
      } catch (e) {}
    }

    // Seed data
    const [rows]: any = await pool.query("SELECT COUNT(*) as count FROM users");
    if (rows[0].count === 0) {
      const hashedPassword = bcrypt.hashSync("admin123", 10);
      const [userResult]: any = await pool.query("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)", ["admin@example.com", hashedPassword, "Admin User", "admin"]);
      const userId = userResult.insertId;

      await pool.query("INSERT INTO customers (user_id, name, email, phone, source) VALUES (?, ?, ?, ?, ?)", [userId, "Jane Doe", "jane@example.com", "987654321", "WooCommerce"]);
      const [cRows]: any = await pool.query("SELECT id FROM customers WHERE user_id = ? LIMIT 1", [userId]);
      const customerId = cRows[0].id;

      await pool.query("INSERT INTO products (user_id, name, type, cost_price, selling_price) VALUES (?, ?, ?, ?, ?)", [userId, "Monthly Plan", "1month", 10, 29]);
      const [pRows]: any = await pool.query("SELECT id FROM products WHERE user_id = ? LIMIT 1", [userId]);
      const productId = pRows[0].id;

      await pool.query("INSERT INTO sales (user_id, customer_id, product_id, amount, profit, payment_method, date) VALUES (?, ?, ?, ?, ?, ?, ?)", [userId, customerId, productId, 29, 19, "bKash", new Date()]);
    }

    console.log("Database initialized successfully");
  } catch (err) {
    console.error("Database initialization failed:", err);
  }
}

async function startServer() {
  await initializeDatabase();
  const app = express();
  app.use(express.json());

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    const { email, password, name } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      const [result]: any = await pool.query("INSERT INTO users (email, password, name) VALUES (?, ?, ?)", [email, hashedPassword, name]);
      const userId = result.insertId;
      const token = jwt.sign({ id: userId, email, name }, JWT_SECRET);
      res.json({ token, user: { id: userId, email, name } });
    } catch (err) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const [rows]: any = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  });

  // Dashboard Stats
  app.get("/api/stats", authenticate, async (req: any, res) => {
    const userId = req.user.id;
    const [salesRows]: any = await pool.query("SELECT SUM(amount) as revenue, SUM(profit) as profit FROM sales WHERE user_id = ?", [userId]);
    const [customersRows]: any = await pool.query("SELECT COUNT(*) as count FROM customers WHERE user_id = ?", [userId]);
    
    res.json({
      revenue: parseFloat(salesRows[0].revenue) || 0,
      profit: parseFloat(salesRows[0].profit) || 0,
      customers: customersRows[0].count || 0
    });
  });

  // Customers
  app.get("/api/customers", authenticate, async (req: any, res) => {
    const [rows]: any = await pool.query("SELECT * FROM customers WHERE user_id = ? ORDER BY created_at DESC", [req.user.id]);
    res.json(rows);
  });

  app.post("/api/customers", authenticate, async (req: any, res) => {
    const { name, email, phone, source } = req.body;
    const [result]: any = await pool.query("INSERT INTO customers (user_id, name, email, phone, source) VALUES (?, ?, ?, ?, ?)", 
      [req.user.id, name, email, phone, source]);
    res.json({ id: result.insertId });
  });

  // Products
  app.get("/api/products", authenticate, async (req: any, res) => {
    const [rows]: any = await pool.query("SELECT * FROM products WHERE user_id = ?", [req.user.id]);
    res.json(rows);
  });

  app.post("/api/products", authenticate, async (req: any, res) => {
    const { name, type, selling_price } = req.body;
    const cost_price = 0;
    const [result]: any = await pool.query("INSERT INTO products (user_id, name, type, cost_price, selling_price) VALUES (?, ?, ?, ?, ?)",
      [req.user.id, name, type, cost_price, selling_price]);
    res.json({ id: result.insertId });
  });

  app.put("/api/products/:id", authenticate, async (req: any, res) => {
    const { name, type, selling_price } = req.body;
    const cost_price = 0;
    await pool.query("UPDATE products SET name = ?, type = ?, cost_price = ?, selling_price = ? WHERE id = ? AND user_id = ?",
      [name, type, cost_price, selling_price, req.params.id, req.user.id]);
    res.json({ success: true });
  });

  app.delete("/api/products/:id", authenticate, async (req: any, res) => {
    console.log(`Attempting to delete product ${req.params.id} for user ${req.user.id}`);
    try {
      // Manual delete associated templates as CASCADE might not be supported in some MySQL environments
      await pool.query("DELETE FROM product_email_templates WHERE product_id = ?", [req.params.id]);
      
      const [result]: any = await pool.query("DELETE FROM products WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
      if (result.affectedRows === 0) {
        console.log(`Product ${req.params.id} not found or doesn't belong to user ${req.user.id}`);
        return res.status(404).json({ error: "Product not found" });
      }
      console.log(`Product ${req.params.id} deleted successfully`);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Delete product error:", err.message);
      if (err.message.includes("foreign key constraint fails")) {
        return res.status(400).json({ error: "Cannot delete product because it has associated sales. Delete associated sales first." });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // Sales
  app.get("/api/sales", authenticate, async (req: any, res) => {
    const [rows]: any = await pool.query(`
      SELECT s.*, c.name as customer_name, c.email, c.phone, p.name as product_name 
      FROM sales s
      JOIN customers c ON s.customer_id = c.id
      JOIN products p ON s.product_id = p.id
      WHERE s.user_id = ?
      ORDER BY s.date DESC
    `, [req.user.id]);
    res.json(rows);
  });

  app.post("/api/sales", authenticate, async (req: any, res) => {
    const { name, email, phone, product_id, amount, profit, payment_method, date, renewal_date } = req.body;
    
    // Find or create customer
    let customerId;
    let [rows]: any = await pool.query("SELECT id, email, phone FROM customers WHERE (email = ? AND email != '') OR (phone = ? AND phone != '') AND user_id = ?", 
      [email || '___none___', phone || '___none___', req.user.id]);
    
    if (rows.length > 0) {
      const customer = rows[0];
      customerId = customer.id;
      if (phone && phone.trim() !== '') {
        await pool.query("UPDATE customers SET phone = ? WHERE id = ?", [phone, customerId]);
      }
      if (email && email.trim() !== '' && (!customer.email || customer.email.trim() === '')) {
        await pool.query("UPDATE customers SET email = ? WHERE id = ?", [email, customerId]);
      }
    } else {
      const [result]: any = await pool.query("INSERT INTO customers (user_id, name, email, phone, source) VALUES (?, ?, ?, ?, ?)",
        [req.user.id, name, email || null, phone || null, 'Manual']);
      customerId = result.insertId;
    }

    const [result]: any = await pool.query("INSERT INTO sales (user_id, customer_id, product_id, amount, profit, payment_method, date, renewal_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [req.user.id, customerId, product_id, amount, profit, payment_method, date, renewal_date]);
    res.json({ id: result.insertId });
  });

  app.post("/api/sales/import", authenticate, async (req: any, res) => {
    const { orders } = req.body;
    const userId = req.user.id;

    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({ error: "Invalid data" });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      for (const order of orders) {
        const { 
          customer_name, email, phone, 
          product_name, amount, profit, 
          payment_method, date, renewal_date 
        } = order;

        if (!customer_name || !product_name) continue;

        // 1. Find or create product
        let [pRows]: any = await connection.query("SELECT id FROM products WHERE name = ? AND user_id = ?", [product_name, userId]);
        let productId;
        if (pRows.length > 0) {
          productId = pRows[0].id;
        } else {
          const [pResult]: any = await connection.query("INSERT INTO products (user_id, name, type, cost_price, selling_price) VALUES (?, ?, ?, ?, ?)",
            [userId, product_name, 'manual', 0, amount || 0]);
          productId = pResult.insertId;
        }

        // 2. Find or create customer
        let customerId;
        let [cRows]: any = await connection.query("SELECT id, email, phone FROM customers WHERE ((email = ? AND email != '') OR (phone = ? AND phone != '')) AND user_id = ?", 
          [email || '___none___', phone || '___none___', userId]);
        
        if (cRows.length > 0) {
          const customer = cRows[0];
          customerId = customer.id;
          if (phone && phone.trim() !== '') {
            await connection.query("UPDATE customers SET phone = ? WHERE id = ?", [phone, customerId]);
          }
          if (email && email.trim() !== '' && (!customer.email || customer.email.trim() === '')) {
            await connection.query("UPDATE customers SET email = ? WHERE id = ?", [email, customerId]);
          }
        } else {
          const [cResult]: any = await connection.query("INSERT INTO customers (user_id, name, email, phone, source) VALUES (?, ?, ?, ?, ?)",
            [userId, customer_name, email || null, phone || null, 'Import']);
          customerId = cResult.insertId;
        }

        // 3. Insert Sale
        await connection.query(`
          INSERT INTO sales (user_id, customer_id, product_id, amount, profit, payment_method, date, renewal_date, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [userId, customerId, productId, amount || 0, profit || 0, payment_method || 'Import', date || new Date(), renewal_date || null, 'Approved']);
      }

      await connection.commit();
      res.json({ success: true, count: orders.length });
    } catch (err: any) {
      await connection.rollback();
      console.error("Import error:", err);
      res.status(500).json({ error: err.message });
    } finally {
      connection.release();
    }
  });

  // Sale Status update
  app.post("/api/public/orders", async (req, res) => {
    const { name, email, phone, product_id, amount, payment_method } = req.body;
    
    // Find the first admin user to assign these public orders to
    const [uRows]: any = await pool.query("SELECT id FROM users ORDER BY id ASC LIMIT 1");
    const adminUser = uRows[0];
    if (!adminUser) return res.status(500).json({ error: "System not ready" });

    // Handle Customer
    let [cRows]: any = await pool.query("SELECT id FROM customers WHERE email = ? AND user_id = ?", [email, adminUser.id]);
    let customerId;
    if (cRows.length > 0) {
      customerId = cRows[0].id;
    } else {
      const [cResult]: any = await pool.query("INSERT INTO customers (user_id, name, email, phone, source) VALUES (?, ?, ?, ?, ?)",
        [adminUser.id, name, email, phone, 'Landing Page']);
      customerId = cResult.insertId;
    }

    const [pRows]: any = await pool.query("SELECT * FROM products WHERE id = ?", [product_id]);
    const product = pRows[0];
    if (!product) return res.status(400).json({ error: "Product not found" });

    // Calculate renewal date based on product type
    const date = new Date();
    const renewalDate = new Date();
    
    if (product.type === '1month') renewalDate.setMonth(date.getMonth() + 1);
    else if (product.type === '3month') renewalDate.setMonth(date.getMonth() + 3);
    else if (product.type === '6month') renewalDate.setMonth(date.getMonth() + 6);
    else if (product.type === '1year') renewalDate.setFullYear(date.getFullYear() + 1);
    else if (product.type === '2year') renewalDate.setFullYear(date.getFullYear() + 2);
    else if (product.type === '3year') renewalDate.setFullYear(date.getFullYear() + 3);
    else if (product.type === 'lifetime') {
      renewalDate.setFullYear(date.getFullYear() + 100); // 100 years for lifetime
    } else {
      renewalDate.setMonth(date.getMonth() + 1); // Default to 1 month
    }

    // Create Sale as Pending
    const [result]: any = await pool.query(`
      INSERT INTO sales (user_id, customer_id, product_id, amount, profit, payment_method, date, renewal_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [adminUser.id, customerId, product_id, amount, amount, payment_method, date, renewalDate, 'Pending']);

    res.json({ success: true, id: result.insertId });
  });

  // Public Order Tracking
  app.get("/api/public/track", async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Email is required" });

    // Fetch regular sales
    const [sales]: any = await pool.query(`
      SELECT 
        s.id, 
        s.date,
        s.renewal_date,
        s.status,
        s.payment_method,
        p.name as product_name, 
        p.type as product_type,
        c.name as customer_name,
        c.phone as phone,
        c.email as email,
        'standard' as order_type
      FROM sales s
      JOIN customers c ON s.customer_id = c.id
      JOIN products p ON s.product_id = p.id
      WHERE c.email = ?
      ORDER BY s.date DESC
    `, [email]);

    // Fetch Canva renewal orders
    const [canvaOrders]: any = await pool.query(`
      SELECT 
        id, 
        created_at as date,
        NULL as renewal_date,
        status,
        payment_method,
        package_name as product_name,
        'canva' as product_type,
        name as customer_name,
        phone,
        email,
        'canva' as order_type
      FROM canva_renewal_orders
      WHERE email = ?
      ORDER BY created_at DESC
    `, [email]);

    // Merge and sort
    const allOrders = [...(sales as any[]), ...(canvaOrders as any[])].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    res.json(allOrders);
  });

  // Public Products
  app.get("/api/public/products", async (req, res) => {
    // Find the first admin user to show their products on landing page
    const [uRows]: any = await pool.query("SELECT id FROM users ORDER BY id ASC LIMIT 1");
    const adminUser = uRows[0];
    if (!adminUser) return res.json([]);
    
    const [products]: any = await pool.query("SELECT * FROM products WHERE user_id = ?", [adminUser.id]);
    res.json(products);
  });

  // Update Sale Status
  app.patch("/api/sales/:id/status", authenticate, async (req: any, res) => {
    const { status } = req.body;
    const saleId = req.params.id;

    // Get sale info with customer email and name
    const [sRows]: any = await pool.query(`
      SELECT s.*, p.name as product_name, c.name as customer_name, c.email
      FROM sales s 
      JOIN products p ON s.product_id = p.id 
      JOIN customers c ON s.customer_id = c.id
      WHERE s.id = ? AND s.user_id = ?
    `, [saleId, req.user.id]);
    const sale = sRows[0];

    if (!sale) return res.status(404).json({ error: "Sale not found" });

    await pool.query("UPDATE sales SET status = ? WHERE id = ? AND user_id = ?", [status, saleId, req.user.id]);

    // Send Email Notification
    const [smtpRows]: any = await pool.query("SELECT * FROM smtp_settings WHERE user_id = ?", [req.user.id]);
    const smtp = smtpRows[0];
    const [templateRows]: any = await pool.query("SELECT * FROM global_templates WHERE user_id = ?", [req.user.id]);
    const templates = templateRows[0];

    if (smtp && templates && (status === 'Approved' || status === 'Rejected')) {
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: parseInt(smtp.port),
        secure: smtp.secure === 1,
        auth: { user: smtp.user, pass: smtp.pass },
      });

      const subject = status === 'Approved' ? templates.approved_subject : templates.rejected_subject;
      let body = status === 'Approved' ? templates.approved_body : templates.rejected_body;

      // Simple variable replacement
      if (body) {
        body = body
          .replace(/{customer_name}/g, sale.customer_name || '')
          .replace(/{product_name}/g, sale.product_name || '')
          .replace(/{status}/g, status);
      }

      transporter.sendMail({
        from: `"${smtp.from_name || 'DigiSheba'}" <${smtp.from_email || smtp.user}>`,
        to: sale.email,
        subject: subject || `Order ${status}`,
        text: body || `Your order for ${sale.product_name} has been ${status}.`,
        html: body ? body.replace(/\n/g, "<br>") : undefined,
      }).catch(err => console.error("Failed to send status email:", err));
    }

    res.json({ success: true });
  });

  // Delete Sale
  app.delete("/api/sales/:id", authenticate, async (req: any, res) => {
    try {
      const [result]: any = await pool.query("DELETE FROM sales WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Order not found or not owned by you" });
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error("Delete error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Bulk Email Campaigns
  app.post("/api/email-campaign/customers", authenticate, async (req: any, res) => {
    const { subject, body } = req.body;
    const userId = req.user.id;

    const [smtpRows]: any = await pool.query("SELECT * FROM smtp_settings WHERE user_id = ?", [userId]);
    const smtp = smtpRows[0];
    if (!smtp) return res.status(400).json({ error: "SMTP settings not configured" });

    const [customers]: any = await pool.query("SELECT email, name FROM customers WHERE user_id = ?", [userId]);
    if (customers.length === 0) return res.json({ success: true, count: 0 });

    try {
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure === 1,
        auth: { user: smtp.user, pass: smtp.pass },
      });

      let count = 0;
      for (const customer of customers as any[]) {
        if (!customer.email) continue;
        const personalizedBody = body.replace(/{{name}}/g, customer.name || 'Customer');
        
        await transporter.sendMail({
          from: `"${smtp.from_name}" <${smtp.from_email}>`,
          to: customer.email,
          subject: subject,
          text: personalizedBody,
          html: personalizedBody.replace(/\n/g, "<br>"),
        });
        count++;
      }

      res.json({ success: true, count });
    } catch (err: any) {
      console.error("Bulk email error:", err);
      res.status(500).json({ error: "Failed to send: " + err.message });
    }
  });

  app.post("/api/email-campaign/manual", authenticate, async (req: any, res) => {
    const { subject, body, emails } = req.body; // emails is an array of strings
    const userId = req.user.id;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: "No emails provided" });
    }

    const [smtpRows]: any = await pool.query("SELECT * FROM smtp_settings WHERE user_id = ?", [userId]);
    const smtp = smtpRows[0];
    if (!smtp) return res.status(400).json({ error: "SMTP settings not configured" });

    try {
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure === 1,
        auth: { user: smtp.user, pass: smtp.pass },
      });

      let count = 0;
      for (const email of emails) {
        await transporter.sendMail({
          from: `"${smtp.from_name}" <${smtp.from_email}>`,
          to: email.trim(),
          subject: subject,
          text: body,
          html: body.replace(/\n/g, "<br>"),
        });
        count++;
      }

      res.json({ success: true, count });
    } catch (err: any) {
      console.error("Manual bulk email error:", err);
      res.status(500).json({ error: "Failed to send: " + err.message });
    }
  });

  // Update Sale
  app.put("/api/sales/:id", authenticate, async (req: any, res) => {
    const { customer_name, email, phone, product_id, amount, profit, date, renewal_date, payment_method } = req.body;
    const saleId = req.params.id;
    const userId = req.user.id;

    try {
      // 1. Find or create/update customer
      let customerId;
      let [rows]: any = await pool.query("SELECT id, email, phone FROM customers WHERE ((email = ? AND email != '') OR (phone = ? AND phone != '')) AND user_id = ?", 
        [email || '___none___', phone || '___none___', userId]);

      if (rows.length > 0) {
        const customer = rows[0];
        customerId = customer.id;
        await pool.query("UPDATE customers SET name = ?, phone = ?, email = ? WHERE id = ?", [customer_name, phone || null, email || null, customerId]);
      } else {
        const [cResult]: any = await pool.query("INSERT INTO customers (user_id, name, email, phone, source) VALUES (?, ?, ?, ?, ?)",
          [userId, customer_name, email || null, phone || null, 'Manual']);
        customerId = cResult.insertId;
      }

      // 2. Update Sale
      await pool.query(`
        UPDATE sales 
        SET customer_id = ?, product_id = ?, amount = ?, profit = ?, date = ?, renewal_date = ?, payment_method = ?
        WHERE id = ? AND user_id = ?
      `, [customerId, product_id, amount, profit, date, renewal_date, payment_method, saleId, userId]);

      res.json({ success: true });
    } catch (err: any) {
      console.error("Update sale error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Email Templates
  app.get("/api/settings/templates", authenticate, async (req: any, res) => {
    const [rows]: any = await pool.query("SELECT * FROM global_templates WHERE user_id = ?", [req.user.id]);
    const templates = rows[0];
    res.json(templates || {
      approved_subject: "Order Approved!",
      approved_body: "Hi {customer_name},\n\nYour order for {product_name} has been approved.\n\nThank you!",
      rejected_subject: "Order Rejected",
      rejected_body: "Hi {customer_name},\n\nSorry, your order for {product_name} was rejected."
    });
  });

  app.post("/api/settings/templates", authenticate, async (req: any, res) => {
    const { approved_subject, approved_body, rejected_subject, rejected_body } = req.body;
    await pool.query(`
      INSERT INTO global_templates (user_id, approved_subject, approved_body, rejected_subject, rejected_body)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        approved_subject = VALUES(approved_subject),
        approved_body = VALUES(approved_body),
        rejected_subject = VALUES(rejected_subject),
        rejected_body = VALUES(rejected_body)
    `, [req.user.id, approved_subject, approved_body, rejected_subject, rejected_body]);
    res.json({ success: true });
  });

  // User Management
  app.get("/api/users", authenticate, async (req: any, res) => {
    // Only return names and emails for safety
    const [rows]: any = await pool.query("SELECT id, name, email FROM users");
    res.json(rows);
  });

  app.post("/api/users", authenticate, async (req: any, res) => {
    const { name, email, password } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [name, email, hashedPassword]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: "User already exists or invalid data" });
    }
  });

  app.delete("/api/users/:id", authenticate, async (req: any, res) => {
    // Prevent deleting your own account
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: "You cannot delete your own account" });
    }
    await pool.query("DELETE FROM users WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  });

  app.patch("/api/profile", authenticate, async (req: any, res) => {
    const { name, email, password } = req.body;
    try {
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query("UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?", [name, email, hashedPassword, req.user.id]);
      } else {
        await pool.query("UPDATE users SET name = ?, email = ? WHERE id = ?", [name, email, req.user.id]);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: "Failed to update profile (email might be in use)" });
    }
  });

  // Branding Settings
  app.get("/api/settings/branding", authenticate, async (req: any, res) => {
    const [rows]: any = await pool.query("SELECT * FROM branding_settings WHERE user_id = ?", [req.user.id]);
    res.json(rows[0] || { 
      logo_url: '', 
      admin_logo_url: '', 
      favicon_url: '', 
      site_name: 'DigiSheba',
      show_floating_login: 1
    });
  });

  app.post("/api/settings/branding", authenticate, async (req: any, res) => {
    const { logo_url, admin_logo_url, favicon_url, site_name, show_floating_login } = req.body;
    await pool.query(`
      INSERT INTO branding_settings (user_id, logo_url, admin_logo_url, favicon_url, site_name, show_floating_login)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        logo_url = VALUES(logo_url),
        admin_logo_url = VALUES(admin_logo_url),
        favicon_url = VALUES(favicon_url),
        site_name = VALUES(site_name),
        show_floating_login = VALUES(show_floating_login)
    `, [req.user.id, logo_url, admin_logo_url, favicon_url, site_name || 'DigiSheba', show_floating_login ? 1 : 0]);
    res.json({ success: true });
  });

  // Canva Renewal Public
  app.get("/api/public/canva-renewal/settings", async (req, res) => {
    const [uRows]: any = await pool.query("SELECT id FROM users LIMIT 1");
    if (uRows.length === 0) return res.status(404).json({ error: "System not ready" });
    const adminId = uRows[0].id;
    const [sRows]: any = await pool.query("SELECT * FROM canva_renewal_settings WHERE user_id = ?", [adminId]);
    const settings = sRows[0];
    
    res.json(settings ? {
      packages: JSON.parse(settings.packages || '[]'),
      payment_info: JSON.parse(settings.payment_info || '{}'),
      banner_url: settings.banner_url,
      page_title: settings.page_title,
      page_description: settings.page_description,
      bkash_logo: settings.bkash_logo,
      nagad_logo: settings.nagad_logo,
      rocket_logo: settings.rocket_logo,
      redirect_url: settings.redirect_url,
    } : {
      packages: [
        { name: '1 Month', price: 99 },
        { name: '6 Month', price: 499 },
        { name: '1 Year', price: 899 },
        { name: 'Lifetime', price: 1499 }
      ],
      payment_info: { bkash: '01XXXXXXXXX', nagad: '01XXXXXXXXX', rocket: '01XXXXXXXXX' },
      banner_url: '',
      page_title: '',
      page_description: '',
      bkash_logo: '',
      nagad_logo: '',
      rocket_logo: '',
      redirect_url: '',
    });
  });

  app.post("/api/public/canva-renewal/orders", async (req, res) => {
    const { name, phone, email, package_name, price, payment_method, sender_number, transaction_id } = req.body;
    const [uRows]: any = await pool.query("SELECT id FROM users LIMIT 1");
    if (uRows.length === 0) return res.status(404).json({ error: "System not ready" });
    const adminId = uRows[0].id;

    const [result]: any = await pool.query(`
      INSERT INTO canva_renewal_orders (user_id, name, phone, email, package_name, price, payment_method, sender_number, transaction_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [adminId, name, phone, email, package_name, price, payment_method, sender_number, transaction_id, new Date()]);

    res.json({ success: true, id: result.insertId });
  });

  // Canva Renewal Admin
  app.get("/api/admin/canva-renewal/orders", authenticate, async (req: any, res) => {
    const [rows]: any = await pool.query("SELECT * FROM canva_renewal_orders WHERE user_id = ? ORDER BY created_at DESC", [req.user.id]);
    res.json(rows);
  });

  app.patch("/api/admin/canva-renewal/orders/:id/status", authenticate, async (req: any, res) => {
    const { status } = req.body;
    const orderId = req.params.id;
    const userId = req.user.id;

    try {
      // Find order and its owner's settings
      const [oRows]: any = await pool.query("SELECT * FROM canva_renewal_orders WHERE id = ?", [orderId]);
      const order = oRows[0];
      if (!order) return res.status(404).json({ error: "Order not found" });

      // Update order status
      await pool.query("UPDATE canva_renewal_orders SET status = ? WHERE id = ?", [status, orderId]);

      // Use the current user's SMTP and settings for notification
      const [setRows]: any = await pool.query("SELECT * FROM canva_renewal_settings WHERE user_id = ?", [userId]);
      const settings = setRows[0];
      const [smtpRows]: any = await pool.query("SELECT * FROM smtp_settings WHERE user_id = ?", [userId]);
      const smtp = smtpRows[0];

      if (settings && smtp && (status === 'Approved' || status === 'Rejected')) {
        const subject = status === 'Approved' 
          ? (settings.approval_email_subject || "Canva Pro Renewal Approved") 
          : (settings.rejection_email_subject || "Canva Pro Renewal Rejected");
        
        let body = status === 'Approved'
          ? (settings.approval_email_template || "Hi {name}, your Canva renewal for {package} has been approved.")
          : (settings.rejection_email_template || "Hi {name}, your Canva renewal for {package} has been rejected.");

        body = body
          .replace(/{name}/g, order.name || '')
          .replace(/{phone}/g, order.phone || '')
          .replace(/{email}/g, order.email || '')
          .replace(/{package}/g, order.package_name || '')
          .replace(/{price}/g, (order.price || 0).toString())
          .replace(/{transaction_id}/g, order.transaction_id || '');

        const transporter = nodemailer.createTransport({
          host: smtp.host,
          port: parseInt(smtp.port),
          secure: smtp.secure === 1,
          auth: { user: smtp.user, pass: smtp.pass },
        });

        transporter.sendMail({
          from: `"${smtp.from_name || 'Canva Renewal'}" <${smtp.from_email || smtp.user}>`,
          to: order.email,
          subject: subject,
          text: body,
          html: body.replace(/\n/g, "<br>"),
        }).then(() => {
          console.log(`Email sent successfully for order ${orderId} (${status})`);
        }).catch(err => {
          console.error(`Failed to send email for order ${orderId}:`, err);
        });
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("Status update error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/admin/canva-renewal/orders/:id", authenticate, async (req: any, res) => {
    try {
      const [result]: any = await pool.query("DELETE FROM canva_renewal_orders WHERE id = ?", [req.params.id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error("Delete order error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/canva-renewal/settings", authenticate, async (req: any, res) => {
    const [rows]: any = await pool.query("SELECT * FROM canva_renewal_settings WHERE user_id = ?", [req.user.id]);
    const settings = rows[0];
    res.json(settings ? {
      packages: JSON.parse(settings.packages || '[]'),
      payment_info: JSON.parse(settings.payment_info || '{}'),
      banner_url: settings.banner_url || '',
      page_title: settings.page_title || '',
      page_description: settings.page_description || '',
      bkash_logo: settings.bkash_logo || '',
      nagad_logo: settings.nagad_logo || '',
      rocket_logo: settings.rocket_logo || '',
      redirect_url: settings.redirect_url || '',
      approval_email_template: settings.approval_email_template || '',
      rejection_email_template: settings.rejection_email_template || '',
      approval_email_subject: settings.approval_email_subject || '',
      rejection_email_subject: settings.rejection_email_subject || ''
    } : {
      packages: [
        { name: '1 Month', price: 99 },
        { name: '6 Month', price: 499 },
        { name: '1 Year', price: 899 },
        { name: 'Lifetime', price: 1499 }
      ],
      payment_info: { bkash: '', nagad: '', rocket: '' },
      banner_url: '',
      page_title: '',
      page_description: '',
      bkash_logo: '',
      nagad_logo: '',
      rocket_logo: '',
      redirect_url: '',
      approval_email_template: '',
      rejection_email_template: '',
      approval_email_subject: '',
      rejection_email_subject: ''
    });
  });

  app.post("/api/admin/canva-renewal/settings", authenticate, async (req: any, res) => {
    const { 
      packages, payment_info, banner_url, page_title, page_description,
      bkash_logo, nagad_logo, rocket_logo, redirect_url,
      approval_email_template, rejection_email_template,
      approval_email_subject, rejection_email_subject
    } = req.body;
    await pool.query(`
      INSERT INTO canva_renewal_settings (
        user_id, packages, payment_info, banner_url, page_title, page_description,
        bkash_logo, nagad_logo, rocket_logo, redirect_url,
        approval_email_template, rejection_email_template,
        approval_email_subject, rejection_email_subject
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        packages = VALUES(packages),
        payment_info = VALUES(payment_info),
        banner_url = VALUES(banner_url),
        page_title = VALUES(page_title),
        page_description = VALUES(page_description),
        bkash_logo = VALUES(bkash_logo),
        nagad_logo = VALUES(nagad_logo),
        rocket_logo = VALUES(rocket_logo),
        redirect_url = VALUES(redirect_url),
        approval_email_template = VALUES(approval_email_template),
        rejection_email_template = VALUES(rejection_email_template),
        approval_email_subject = VALUES(approval_email_subject),
        rejection_email_subject = VALUES(rejection_email_subject)
    `, [
      req.user.id, JSON.stringify(packages), JSON.stringify(payment_info), banner_url, page_title, page_description,
      bkash_logo, nagad_logo, rocket_logo, redirect_url,
      approval_email_template, rejection_email_template,
      approval_email_subject, rejection_email_subject
    ]);
    res.json({ success: true });
  });

  app.patch("/api/admin/canva-renewal/orders/:id", authenticate, async (req: any, res) => {
    const { name, phone, email, package_name, price, sender_number, transaction_id } = req.body;
    try {
      await pool.query(`
        UPDATE canva_renewal_orders 
        SET name = ?, phone = ?, email = ?, package_name = ?, price = ?, sender_number = ?, transaction_id = ?
        WHERE id = ? AND user_id = ?
      `, [name, phone, email, package_name, price, sender_number, transaction_id, req.params.id, req.user.id]);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Update order error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Public Branding (for Landing Page - fetching from first admin)
  app.get("/api/public/branding", async (req, res) => {
    const [uRows]: any = await pool.query("SELECT id FROM users ORDER BY id ASC LIMIT 1");
    if (uRows.length === 0) return res.json({ site_name: 'DigiSheba', show_floating_login: 1 });
    
    const [rows]: any = await pool.query("SELECT * FROM branding_settings WHERE user_id = ?", [uRows[0].id]);
    res.json(rows[0] || { site_name: 'DigiSheba', show_floating_login: 1 });
  });

  // Enhanced Stats
  app.get("/api/enhanced-stats", authenticate, async (req: any, res) => {
    const userId = req.user.id;
    
    const fetchStat = async (query: string) => {
      const [rows]: any = await pool.query(query, [userId]);
      return rows[0].total || 0;
    };

    const stats = {
      daily: await fetchStat("SELECT SUM(amount) as total FROM sales WHERE user_id = ? AND status = 'Approved' AND date >= CURDATE()"),
      weekly: await fetchStat("SELECT SUM(amount) as total FROM sales WHERE user_id = ? AND status = 'Approved' AND date >= DATE_SUB(NOW(), INTERVAL 7 DAY)"),
      monthly: await fetchStat("SELECT SUM(amount) as total FROM sales WHERE user_id = ? AND status = 'Approved' AND date >= DATE_SUB(NOW(), INTERVAL 30 DAY)"),
      yearly: await fetchStat("SELECT SUM(amount) as total FROM sales WHERE user_id = ? AND status = 'Approved' AND date >= DATE_SUB(NOW(), INTERVAL 365 DAY)"),
      lifetime: await fetchStat("SELECT SUM(amount) as total FROM sales WHERE user_id = ? AND status = 'Approved'"),
      profit: await fetchStat("SELECT SUM(profit) as total FROM sales WHERE user_id = ? AND status = 'Approved'")
    };

    res.json(stats);
  });

  // SMTP Settings
  app.get("/api/settings/smtp", authenticate, async (req: any, res) => {
    const [rows]: any = await pool.query("SELECT * FROM smtp_settings WHERE user_id = ?", [req.user.id]);
    res.json(rows[0] || {});
  });

  app.post("/api/settings/smtp", authenticate, async (req: any, res) => {
    const { host, port, user, pass, from_email, from_name, secure } = req.body;
    await pool.query(`
      INSERT INTO smtp_settings (user_id, host, port, user, pass, from_email, from_name, secure)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        host=VALUES(host),
        port=VALUES(port),
        user=VALUES(user),
        pass=VALUES(pass),
        from_email=VALUES(from_email),
        from_name=VALUES(from_name),
        secure=VALUES(secure)
    `, [req.user.id, host, port, user, pass, from_email, from_name, secure ? 1 : 0]);
    res.json({ success: true });
  });

  // Product Email Templates
  app.get("/api/products/:id/template", authenticate, async (req: any, res) => {
    const [rows]: any = await pool.query("SELECT * FROM product_email_templates WHERE product_id = ?", [req.params.id]);
    res.json(rows[0] || { subject: "", body: "" });
  });

  app.post("/api/products/:id/template", authenticate, async (req: any, res) => {
    const { subject, body } = req.body;
    await pool.query(`
      INSERT INTO product_email_templates (product_id, subject, body)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        subject=VALUES(subject),
        body=VALUES(body)
    `, [req.params.id, subject, body]);
    res.json({ success: true });
  });

  // Send Renewal Email
  app.post("/api/sales/:id/send-renewal-email", authenticate, async (req: any, res) => {
    const saleId = req.params.id;
    const userId = req.user.id;

    const [sRows]: any = await pool.query(`
      SELECT s.*, c.email as customer_email, c.name as customer_name, p.name as product_name, p.id as product_id
      FROM sales s
      JOIN customers c ON s.customer_id = c.id
      JOIN products p ON s.product_id = p.id
      WHERE s.id = ? AND s.user_id = ?
    `, [saleId, userId]);
    const sale = sRows[0];

    if (!sale) return res.status(404).json({ error: "Sale not found" });

    const [smtpRows]: any = await pool.query("SELECT * FROM smtp_settings WHERE user_id = ?", [userId]);
    const smtp = smtpRows[0];
    if (!smtp) return res.status(400).json({ error: "SMTP settings not configured" });

    const [tRows]: any = await pool.query("SELECT * FROM product_email_templates WHERE product_id = ?", [sale.product_id]);
    const template = tRows[0];
    if (!template) return res.status(400).json({ error: "Email template not configured for this product" });

    // Replace placeholders
    let subject = (template.subject || "").replace(/{{customer_name}}/g, sale.customer_name)
                                             .replace(/{{product_name}}/g, sale.product_name)
                                             .replace(/{{renewal_date}}/g, sale.renewal_date);
    let body = (template.body || "").replace(/{{customer_name}}/g, sale.customer_name)
                                       .replace(/{{product_name}}/g, sale.product_name)
                                       .replace(/{{renewal_date}}/g, sale.renewal_date);

    try {
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure === 1,
        auth: { user: smtp.user, pass: smtp.pass },
      });

      await transporter.sendMail({
        from: `"${smtp.from_name}" <${smtp.from_email || smtp.user}>`,
        to: sale.customer_email,
        subject: subject,
        text: body,
        html: body.replace(/\n/g, "<br>"),
      });

      res.json({ success: true });
    } catch (err: any) {
      console.error("Email error:", err);
      res.status(500).json({ error: "Failed to send email: " + err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  const PORT = 3000;
  app.get("/api/settings/renewal-emails", authenticate, async (req: any, res) => {
    const [rows]: any = await pool.query("SELECT * FROM renewal_email_settings WHERE user_id = ?", [req.user.id]);
    res.json(rows[0] || {
      day30_subject: "Renewal Alert: 30 Days Remaining",
      day30_body: "Hi {customer_name},\n\nYour subscription for {product_name} will expire in 30 days.\n\nThank you!",
      day15_subject: "Renewal Alert: 15 Days Remaining",
      day15_body: "Hi {customer_name},\n\nYour subscription for {product_name} will expire in 15 days. Please renew soon.\n\nThank you!",
      expired_subject: "Subscription Expired",
      expired_body: "Hi {customer_name},\n\nYour subscription for {product_name} has expired."
    });
  });

  app.post("/api/settings/renewal-emails", authenticate, async (req: any, res) => {
    const { day30_subject, day30_body, day15_subject, day15_body, expired_subject, expired_body } = req.body;
    await pool.query(`
      INSERT INTO renewal_email_settings (user_id, day30_subject, day30_body, day15_subject, day15_body, expired_subject, expired_body)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        day30_subject=VALUES(day30_subject),
        day30_body=VALUES(day30_body),
        day15_subject=VALUES(day15_subject),
        day15_body=VALUES(day15_body),
        expired_subject=VALUES(expired_subject),
        expired_body=VALUES(expired_body)
    `, [req.user.id, day30_subject, day30_body, day15_subject, day15_body, expired_subject, expired_body]);
    res.json({ success: true });
  });

  // Background task for renewal notifications
  const checkRenewals = async () => {
    console.log("Checking for upcoming renewals...");
    const now = new Date();
    
    // 1. Get all active sales that need notifications
    const [sales]: any = await pool.query(`
      SELECT s.*, c.name as customer_name, c.email as customer_email, p.name as product_name, u.id as owner_id
      FROM sales s
      JOIN customers c ON s.customer_id = c.id
      JOIN products p ON s.product_id = p.id
      JOIN users u ON s.user_id = u.id
      WHERE s.status = 'Approved' 
      AND s.renewal_date IS NOT NULL
    `);

    for (const sale of sales) {
      if (!sale.customer_email) continue;
      
      const renewalDate = new Date(sale.renewal_date);
      const diffTime = renewalDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let type: 'day30' | 'day15' | 'expired' | null = null;
      if (diffDays <= 0 && !sale.expired_sent) type = 'expired';
      else if (diffDays <= 15 && diffDays > 0 && !sale.day15_sent) type = 'day15';
      else if (diffDays <= 30 && diffDays > 15 && !sale.day30_sent) type = 'day30';

      if (type) {
        // Send email
        const [smtpRows]: any = await pool.query("SELECT * FROM smtp_settings WHERE user_id = ?", [sale.owner_id]);
        const [settRows]: any = await pool.query("SELECT * FROM renewal_email_settings WHERE user_id = ?", [sale.owner_id]);
        const smtp = smtpRows[0];
        const settings = settRows[0];

        if (smtp && settings) {
          const transporter = nodemailer.createTransport({
            host: smtp.host,
            port: parseInt(smtp.port),
            secure: smtp.secure === 1,
            auth: { user: smtp.user, pass: smtp.pass },
          });

          const subjectTemplate = settings[`${type}_subject`];
          const bodyTemplate = settings[`${type}_body`];

          if (subjectTemplate && bodyTemplate) {
            const subject = subjectTemplate
              .replace(/{customer_name}/g, sale.customer_name || '')
              .replace(/{product_name}/g, sale.product_name || '');
            
            const body = bodyTemplate
              .replace(/{customer_name}/g, sale.customer_name || '')
              .replace(/{product_name}/g, sale.product_name || '');

            try {
              await transporter.sendMail({
                from: `"${smtp.from_name || 'Renewal Alert'}" <${smtp.from_email || smtp.user}>`,
                to: sale.customer_email,
                subject: subject,
                text: body,
                html: body.replace(/\n/g, "<br>"),
              });
              
              // Mark as sent
              await pool.query(`UPDATE sales SET ${type}_sent = 1 WHERE id = ?`, [sale.id]);
              console.log(`Renewal email (${type}) sent to ${sale.customer_email}`);
            } catch (err) {
              console.error(`Failed to send renewal email to ${sale.customer_email}:`, err);
            }
          }
        }
      }
    }
  };

  // Run immediately on start then every 24 hours
  checkRenewals().catch(console.error);
  setInterval(() => checkRenewals().catch(console.error), 24 * 60 * 60 * 1000);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
