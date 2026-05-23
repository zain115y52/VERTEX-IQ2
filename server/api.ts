import { Router } from "express";
import jwt from "jsonwebtoken";
import { db } from "./db.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-for-dev";

// Auth Middleware
export const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

export const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
};

// --- AUTHENTICATION ---
router.post("/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  const user = db.getUser(username, password);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ id: user.id, role: user.role, username: user.username }, JWT_SECRET, { expiresIn: "24h" });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

// --- ADMIN ROUTES ---
router.get("/admin/servers", authenticate, requireAdmin, (req, res) => {
  res.json(db.getServers());
});

router.post("/admin/servers", authenticate, requireAdmin, (req, res) => {
  const { name, ip, port, username, password, panelUrl, type, inboundId, limit, status } = req.body;
  if (!name || !ip || !port || !username || !password || !panelUrl || !type || !limit || !status) {
    return res.status(400).json({ error: "جميع الحقول مطلوبة" });
  }
  
  if (port < 1 || port > 65535) {
    return res.status(400).json({ error: "Port غير صحيح" });
  }

  try {
    const newServer = db.addServer({ 
      name, ip, port: Number(port), username, passwordHash: password, panelUrl, type, inboundId: Number(inboundId) || 1, limit: Number(limit), status 
    });
    res.json(newServer);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/admin/servers/:id", authenticate, requireAdmin, (req, res) => {
  try {
    db.deleteServer(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/admin/servers/:id", authenticate, requireAdmin, (req, res) => {
  try {
    const updated = db.updateServer(req.params.id, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Add Reseller
router.post("/admin/clients", authenticate, requireAdmin, (req, res) => {
  const { username, password, serverId, limit, status } = req.body;
  if (!username || !password || !serverId || !limit || !status) {
    return res.status(400).json({ error: "جميع الحقول مطلوبة" });
  }
  try {
    const client = db.addClient({ username, pass: password, serverId, limit: Number(limit), status });
    res.json(client);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/admin/clients/:id", authenticate, requireAdmin, (req, res) => {
  try {
    db.deleteClient(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/admin/clients", authenticate, requireAdmin, (req, res) => {
  res.json(db.getClients());
});



// Update admin profile (username and/or password)
router.put("/admin/profile", authenticate, requireAdmin, (req: any, res) => {
  const { username, oldPassword, newPassword } = req.body;
  try {
    if (username) {
       db.updateUsername(req.user.id, username);
    }
    if (newPassword && oldPassword) {
       db.changePassword(req.user.id, oldPassword, newPassword);
    } else if (newPassword) {
       return res.status(400).json({ error: "كلمة المرور الحالية مطلوبة" });
    }

    const updatedUser = db.getUserById(req.user.id);
    if (!updatedUser) return res.status(404).json({ error: "User not found" });

    const token = jwt.sign({ id: updatedUser.id, role: updatedUser.role, username: updatedUser.username }, JWT_SECRET, { expiresIn: "24h" });

    res.json({ success: true, token, user: { id: updatedUser.id, username: updatedUser.username, role: updatedUser.role } });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Change own admin pass
router.post("/admin/change-password", authenticate, requireAdmin, (req: any, res) => {
  const { oldPassword, newPassword } = req.body;
  try {
    db.changePassword(req.user.id, oldPassword, newPassword);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Change client pass
router.post("/admin/clients/:id/password", authenticate, requireAdmin, (req, res) => {
  const { newPassword } = req.body;
  try {
    db.forceChangePassword(req.params.id, newPassword);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get overall stats for Admin
router.get("/admin/stats", authenticate, requireAdmin, (req, res) => {
  res.json(db.getAdminStats());
});


// --- CLIENT ROUTES ---
router.get("/client/dashboard", authenticate, async (req: any, res: any) => {
  if (req.user.role !== "client") return res.status(403).json({ error: "Forbidden" });
  try {
    const stats = await db.getClientDashboard(req.user.id);
    res.json(stats);
  } catch(err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/client/users/generate", authenticate, async (req: any, res: any) => {
  if (req.user.role !== "client") return res.status(403).json({ error: "Forbidden" });
  try {
    const newUser = await db.generateVpnUser(req.user.id);
    res.json(newUser);
  } catch(err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/client/users/:id/display-name", authenticate, (req: any, res: any) => {
  if (req.user.role !== "client") return res.status(403).json({ error: "Forbidden" });
  try {
    const { displayName } = req.body;
    const updated = db.updateVpnUserDisplayName(req.user.id, req.params.id, displayName || "");
    res.json(updated);
  } catch(err: any) {
    res.status(400).json({ error: err.message });
  }
});


export default router;
