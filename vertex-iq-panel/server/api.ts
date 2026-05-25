import { Router } from "express";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { db } from "./db.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-for-dev";

// Rate Limiters
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login requests per window
  message: { error: "طلبات تسجيل دخول كثيرة جداً، يرجى المحاولة لاحقاً (15 دقيقة)" },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 core API requests per minute
  message: { error: "لقد تجاوزت الحد المسموح به للطلبات، يرجى المحاولة لاحقاً." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth Middleware
export const authenticate = async (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Check if token version matches the one in DB
    try {
      const user = await db.getUserById(decoded.id);
      if (!user || user.tokenVersion !== decoded.tokenVersion) {
        return res.status(401).json({ error: "Session expired or invalid" });
      }
      req.user = decoded;
      next();
    } catch (dbErr: any) {
      console.error("[AUTH] Database error in authenticate:", dbErr);
      return res.status(500).json({ error: "Service Unavailable. Database connection failed." });
    }
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
router.post("/auth/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  try {
    const user = await db.getUser(username, password);
    if (!user) {
      console.log(`[AUTH] Failed login attempt for user: ${username} from IP: ${req.ip}`);
      await db.createLog('LOGIN_FAILED', null, username, req.ip || '', 'Invalid credentials');
      return res.status(401).json({ error: "Invalid credentials" });
    }

    console.log(`[AUTH] Successful login for user: ${username} (Role: ${user.role}) from IP: ${req.ip}`);
    await db.createLog('LOGIN_SUCCESS', user.id, username, req.ip || '', `Logged in as ${user.role}`);
    // Add token rotation log
    const token = jwt.sign({ id: user.id, role: user.role, username: user.username, tokenVersion: user.tokenVersion }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err: any) {
    console.error("[AUTH] Login error:", err);
    res.status(500).json({ error: "Service Unavailable. Database connection failed." });
  }
});

router.post("/auth/logout", authenticate, async (req: any, res: any) => {
  try {
    const { forceAll } = req.body;
    if (forceAll) {
       await db.incrementTokenVersion(req.user.id);
       await db.createLog('LOGOUT_ALL', req.user.id, req.user.username, req.ip || '', 'Forced logout all sessions');
    } else {
       await db.createLog('LOGOUT', req.user.id, req.user.username, req.ip || '', 'Standard logout');
    }
    console.log(`[AUTH] Logout for user: ${req.user.username} from IP: ${req.ip}`);
    res.json({ success: true, message: "Logged out successfully" });
  } catch (err: any) {
    res.status(500).json({ error: "Logout failed" });
  }
});

// Apply API Limiter to all admin and client routes
router.use("/admin", apiLimiter);
router.use("/client", apiLimiter);

// --- ADMIN ROUTES ---
router.get("/admin/servers", authenticate, requireAdmin, async (req, res) => {
  try {
    res.json(await db.getServers());
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/admin/servers", authenticate, requireAdmin, async (req: any, res: any) => {
  const { name, ip, port, username, password, panelUrl, type, inboundId, limit, status } = req.body;
  if (!name || !ip || !port || !username || !password || !panelUrl || !type || !limit || !status) {
    return res.status(400).json({ error: "جميع الحقول مطلوبة" });
  }
  
  if (port < 1 || port > 65535) {
    return res.status(400).json({ error: "Port غير صحيح" });
  }

  try {
    const newServer = await db.addServer({ 
      name, ip, port: Number(port), username, passwordHash: password, panelUrl, type, inboundId: Number(inboundId) || 1, limit: Number(limit), status 
    });
    await db.createLog('ADD_SERVER', req.user.id, req.user.username, req.ip || '', `Added server ${name}`);
    res.json(newServer);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/admin/servers/:id", authenticate, requireAdmin, async (req: any, res: any) => {
  try {
    await db.deleteServer(req.params.id);
    await db.createLog('DELETE_SERVER', req.user.id, req.user.username, req.ip || '', `Deleted server ${req.params.id}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/admin/servers/:id", authenticate, requireAdmin, async (req: any, res: any) => {
  try {
    const updated = await db.updateServer(req.params.id, req.body);
    await db.createLog('UPDATE_SERVER', req.user.id, req.user.username, req.ip || '', `Updated server ${req.params.id}`);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Add Reseller
router.post("/admin/clients", authenticate, requireAdmin, async (req: any, res: any) => {
  const { username, password, serverId, limit, status } = req.body;
  if (!username || !password || !serverId || !limit || !status) {
    return res.status(400).json({ error: "جميع الحقول مطلوبة" });
  }
  try {
    const client = await db.addClient({ username, pass: password, serverId, limit: Number(limit), status });
    await db.createLog('ADD_CLIENT', req.user.id, req.user.username, req.ip || '', `Added client ${username}`);
    res.json(client);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/admin/clients/:id", authenticate, requireAdmin, async (req: any, res: any) => {
  try {
    await db.deleteClient(req.params.id);
    await db.createLog('DELETE_CLIENT', req.user.id, req.user.username, req.ip || '', `Deleted client ${req.params.id}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/admin/clients/:id/limit", authenticate, requireAdmin, async (req: any, res: any) => {
  const { limit } = req.body;
  if (limit === undefined || limit < 0) {
    return res.status(400).json({ error: "حد الموزع غير صحيح" });
  }
  try {
    await db.updateClientLimit(req.params.id, Number(limit));
    await db.createLog('UPDATE_CLIENT_LIMIT', req.user.id, req.user.username, req.ip || '', `Updated limit for client ${req.params.id} to ${limit}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/admin/clients", authenticate, requireAdmin, async (req: any, res: any) => {
  try {
    res.json(await db.getClients());
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Update admin profile (username and/or password)
router.put("/admin/profile", authenticate, requireAdmin, async (req: any, res: any) => {
  const { username, oldPassword, newPassword } = req.body;
  try {
    if (username) {
       await db.updateUsername(req.user.id, username);
    }
    if (newPassword && oldPassword) {
       await db.changePassword(req.user.id, oldPassword, newPassword);
    } else if (newPassword) {
       return res.status(400).json({ error: "كلمة المرور الحالية مطلوبة" });
    }

    const updatedUser = await db.getUserById(req.user.id);
    if (!updatedUser) return res.status(404).json({ error: "User not found" });

    await db.createLog('UPDATE_PROFILE', req.user.id, updatedUser.username, req.ip || '', 'Updated admin profile (username or password)');

    const token = jwt.sign({ id: updatedUser.id, role: updatedUser.role, username: updatedUser.username, tokenVersion: updatedUser.tokenVersion }, JWT_SECRET, { expiresIn: "24h" });

    res.json({ success: true, token, user: { id: updatedUser.id, username: updatedUser.username, role: updatedUser.role } });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Change own admin pass
router.post("/admin/change-password", authenticate, requireAdmin, async (req: any, res: any) => {
  const { oldPassword, newPassword } = req.body;
  try {
    await db.changePassword(req.user.id, oldPassword, newPassword);
    await db.createLog('CHANGE_ADMIN_PASSWORD', req.user.id, req.user.username, req.ip || '', 'Changed own admin password');
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Change client pass
router.post("/admin/clients/:id/password", authenticate, requireAdmin, async (req: any, res: any) => {
  const { newPassword } = req.body;
  try {
    await db.forceChangePassword(req.params.id, newPassword);
    await db.createLog('CHANGE_CLIENT_PASSWORD', req.user.id, req.user.username, req.ip || '', `Changed password for client ${req.params.id}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get overall stats for Admin
router.get("/admin/stats", authenticate, requireAdmin, async (req: any, res: any) => {
  try {
    res.json(await db.getAdminStats());
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/admin/logs", authenticate, requireAdmin, async (req: any, res: any) => {
  try {
    res.json(await db.getSecurityLogs(200));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
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
    await db.createLog('GENERATE_USER', req.user.id, req.user.username, req.ip || '', `Generated new VLESS user for client`);
    res.json(newUser);
  } catch(err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/client/users/:id/display-name", authenticate, async (req: any, res: any) => {
  if (req.user.role !== "client") return res.status(403).json({ error: "Forbidden" });
  try {
    const { displayName } = req.body;
    const updated = await db.updateVpnUserDisplayName(req.user.id, req.params.id, displayName || "");
    await db.createLog('UPDATE_DISPLAY_NAME', req.user.id, req.user.username, req.ip || '', `Updated display name for VPN user ${req.params.id}`);
    res.json(updated);
  } catch(err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/client/users/:id/toggle", authenticate, async (req: any, res: any) => {
  if (req.user.role !== "client") return res.status(403).json({ error: "Forbidden" });
  try {
    const { enable } = req.body;
    const updated = await db.updateVpnUserStatus(req.user.id, req.params.id, Boolean(enable));
    await db.createLog('TOGGLE_USER_STATUS', req.user.id, req.user.username, req.ip || '', `Toggled VPN user ${req.params.id} to ${enable}`);
    res.json(updated);
  } catch(err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
