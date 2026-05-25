import { randomUUID, createCipheriv, createDecipheriv } from "crypto";
import bcrypt from "bcryptjs";
import { pool } from "./db.js";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Ensure we have a 32 byte key for AES-256
const ENCRYPTION_KEY = process.env.JWT_SECRET 
  ? Buffer.from(process.env.JWT_SECRET.padEnd(32, '0').slice(0, 32))
  : Buffer.from("fallback-secret-for-dev".padEnd(32, '0').slice(0, 32));
const IV_LENGTH = 16;

function encryptText(text: string) {
  let iv = Buffer.alloc(IV_LENGTH, 0); // Using zero IV for simplicity with same pass, or generate random and store
  let cipher = createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return encrypted.toString('hex');
}

function decryptText(text: string) {
  let iv = Buffer.alloc(IV_LENGTH, 0);
  let encryptedText = Buffer.from(text, 'hex');
  let decipher = createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// Helper to convert snake_case to camelCase
function toCamel(obj: any): any {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(toCamel);
  
  const camelObj: any = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    camelObj[camelKey] = toCamel(obj[key]);
  }
  return camelObj;
}

export class PostgresDB {
  
  // --- Auth ---
  async getUser(username: string, pass: string) {
    const res = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    if (res.rows.length === 0) return null;
    const user = res.rows[0];
    if (bcrypt.compareSync(pass, user.password_hash)) {
      return toCamel(user);
    }
    return null;
  }

  async getUserById(id: string) {
    const res = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    return res.rows.length > 0 ? toCamel(res.rows[0]) : null;
  }

  async incrementTokenVersion(userId: string) {
    await pool.query("UPDATE users SET token_version = COALESCE(token_version, 0) + 1 WHERE id = $1", [userId]);
  }

  async createLog(action: string, user_id: string | null, username: string | null, ip_address: string, details: string) {
    await pool.query(
      `INSERT INTO security_logs (id, action, user_id, username, ip_address, details) VALUES ($1, $2, $3, $4, $5, $6)`,
      [randomUUID(), action, user_id, username, ip_address, details]
    );
  }

  async updateUsername(userId: string, newUsername: string) {
    const res = await pool.query("SELECT * FROM users WHERE username = $1 AND id != $2", [newUsername, userId]);
    if (res.rows.length > 0) throw new Error("اسم المستخدم مستخدم بالفعل");
    
    await pool.query("UPDATE users SET username = $1 WHERE id = $2", [newUsername, userId]);
  }

  async changePassword(userId: string, oldPass: string, newPass: string) {
    const res = await pool.query("SELECT password_hash FROM users WHERE id = $1", [userId]);
    if (res.rows.length === 0) throw new Error("User not found");
    const user = res.rows[0];
    if (!bcrypt.compareSync(oldPass, user.password_hash)) {
      throw new Error("Invalid old password");
    }
    const newHash = bcrypt.hashSync(newPass, 10);
    await pool.query("UPDATE users SET password_hash = $1, token_version = COALESCE(token_version, 0) + 1 WHERE id = $2", [newHash, userId]);
  }

  async forceChangePassword(userId: string, newPass: string) {
    const newHash = bcrypt.hashSync(newPass, 10);
    await pool.query("UPDATE users SET password_hash = $1, token_version = COALESCE(token_version, 0) + 1 WHERE id = $2", [newHash, userId]);
  }

  // --- Clients (Resellers) ---
  async addClient(data: { username: string, pass: string, serverId: string, limit: number, status: string }) {
    const existing = await pool.query("SELECT id FROM users WHERE username = $1", [data.username]);
    if (existing.rows.length > 0) throw new Error("اسم المستخدم مكرر");

    const srvRes = await pool.query("SELECT * FROM servers WHERE id = $1", [data.serverId]);
    if (srvRes.rows.length === 0) throw new Error("السيرفر المختار غير موجود");
    const server = srvRes.rows[0];

    if (server.status !== 'نشط') throw new Error("لا يمكن ربط الموزع بسيرفر غير نشط");

    const clientsRes = await pool.query("SELECT SUM(\"limit\") as total_limit FROM users WHERE role = 'client' AND server_id = $1", [data.serverId]);
    const totalAllocatedLimit = parseInt(clientsRes.rows[0].total_limit || '0');
    
    if (totalAllocatedLimit + data.limit > server.limit) {
      throw new Error(`لا يمكن تجاوز الحد الأقصى للسيرفر. المتبقي: ${server.limit - totalAllocatedLimit}`);
    }

    const clientId = randomUUID();
    const hash = bcrypt.hashSync(data.pass, 10);
    
    await pool.query(
      `INSERT INTO users (id, username, password_hash, role, "limit", status, server_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [clientId, data.username, hash, 'client', data.limit, data.status, data.serverId]
    );

    return { id: clientId, username: data.username };
  }

  async deleteClient(id: string) {
    if (id === "admin-1") throw new Error("Cannot delete super admin");
    // Also delete their vpn users
    await pool.query("DELETE FROM vpn_users WHERE client_id = $1", [id]);
    await pool.query("DELETE FROM users WHERE id = $1", [id]);
  }

  async updateClientLimit(id: string, limit: number) {
    if (limit < 0) throw new Error("لا يمكن أن يكون الحد أقل من صفر");
    await pool.query('UPDATE users SET "limit" = $1 WHERE id = $2 AND role = $3', [limit, id, 'client']);
  }

  async getClients() {
    const res = await pool.query(`
      SELECT u.id, u.username, u."limit", u.status, u.created_at as "createdAt",
             s.name as "assignedServer"
      FROM users u
      LEFT JOIN servers s ON u.server_id = s.id
      WHERE u.role = 'client'
    `);
    return res.rows.map(r => ({
      id: r.id,
      username: r.username,
      plainPass: '********', // Masked for security
      limit: r.limit,
      status: r.status,
      assignedServer: r.assignedServer || 'بدون سيرفر',
      createdAt: r.createdAt
    }));
  }

  // --- Servers ---
  async addServer(data: { name: string, ip: string, port: number, username: string, passwordHash: string, panelUrl: string, type: string, inboundId: number, limit: number, status: string }) {
    if (!data.name || !data.ip || !data.port || !data.username || !data.passwordHash || !data.panelUrl || !data.type || !data.limit || !data.status) {
      throw new Error("جميع الحقول مطلوبة");
    }

    if (data.port < 1 || data.port > 65535) throw new Error("Port غير صحيح");

    const dup1 = await pool.query("SELECT id FROM servers WHERE name = $1", [data.name]);
    if (dup1.rows.length > 0) throw new Error("اسم السيرفر مكرر");

    const dup2 = await pool.query("SELECT id FROM servers WHERE ip = $1", [data.ip]);
    if (dup2.rows.length > 0) throw new Error("IP مكرر");

    const serverId = randomUUID();
    const hash = bcrypt.hashSync(data.passwordHash, 10);
    const encryptedPanelPass = encryptText(data.passwordHash); // Encrypt plain password
    
    await pool.query(
      `INSERT INTO servers (id, name, ip, port, username, password_hash, panel_password_enc, panel_url, type, inbound_id, "limit", status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
      [serverId, data.name, data.ip, data.port, data.username, hash, encryptedPanelPass, data.panelUrl, data.type, data.inboundId || 1, data.limit, data.status]
    );

    return await this.getServerById(serverId);
  }

  async deleteServer(id: string) {
    await pool.query("DELETE FROM vpn_users WHERE server_id = $1", [id]);
    await pool.query("UPDATE users SET server_id = NULL WHERE server_id = $1", [id]);
    await pool.query("DELETE FROM servers WHERE id = $1", [id]);
  }

  async updateServer(id: string, updates: any) {
    const srvRes = await pool.query("SELECT * FROM servers WHERE id = $1", [id]);
    if (srvRes.rows.length === 0) throw new Error("Server not found");
    const srv = srvRes.rows[0];

    const name = updates.name !== undefined ? updates.name : srv.name;
    const ip = updates.ip !== undefined ? updates.ip : srv.ip;
    const port = updates.port !== undefined ? updates.port : srv.port;
    const username = updates.username !== undefined ? updates.username : srv.username;
    const panelUrl = updates.panelUrl !== undefined ? updates.panelUrl : srv.panel_url;
    const type = updates.type !== undefined ? updates.type : srv.type;
    const inboundId = updates.inboundId !== undefined ? updates.inboundId : srv.inbound_id;
    const limit = updates.limit !== undefined ? updates.limit : srv.limit;
    const status = updates.status !== undefined ? updates.status : srv.status;

    let hash = srv.password_hash;
    let encryptedPanelPass = srv.panel_password_enc;
    if (updates.password !== undefined) {
      hash = bcrypt.hashSync(updates.password, 10);
      encryptedPanelPass = encryptText(updates.password);
    }

    await pool.query(
      `UPDATE servers SET name = $1, ip = $2, port = $3, username = $4, password_hash = $5, panel_password_enc = $6, panel_url = $7, type = $8, inbound_id = $9, "limit" = $10, status = $11 WHERE id = $12`,
      [name, ip, port, username, hash, encryptedPanelPass, panelUrl, type, inboundId, limit, status, id]
    );

    return await this.getServerById(id);
  }

  async getServerById(id: string) {
    const res = await pool.query("SELECT * FROM servers WHERE id = $1", [id]);
    return res.rows.length > 0 ? toCamel(res.rows[0]) : null;
  }

  async getServers() {
    const res = await pool.query(`
      SELECT s.id, s.name, s.ip, s.port, s.username, s.panel_url, s.type, s.inbound_id, s."limit", s.status, s.created_at, 
        (SELECT COUNT(*) FROM vpn_users WHERE server_id = s.id) as user_count,
        (SELECT string_agg(username, ', ') FROM users WHERE server_id = s.id AND role = 'client') as client_name
      FROM servers s
    `);
    return res.rows.map(r => ({
      ...toCamel(r),
      plainPass: '********', // Masked for security
      passwordHash: undefined, // ensure hash doesn't leak
      panelPasswordEnc: undefined, // ensure encrypted password doesn't leak
      clientName: r.client_name || "None",
      userCount: parseInt(r.user_count)
    }));
  }

  // --- VPN Users logic ---
  async generateVpnUser(clientId: string) {
    const clientUser = await this.getUserById(clientId);
    if (!clientUser) throw new Error("المستخدم غير موجود");

    const serverId = clientUser.serverId;
    if (!serverId) throw new Error("لا يوجد سيرفر مخصص لك حالياً.");

    const selectedServer = await this.getServerById(serverId);
    if (!selectedServer) throw new Error("السيرفر المخصص غير موجود.");

    const totalClientUsersRes = await pool.query("SELECT COUNT(*) as count FROM vpn_users WHERE client_id = $1", [clientId]);
    const totalClientUsers = parseInt(totalClientUsersRes.rows[0].count);
    
    if (clientUser.limit && totalClientUsers >= clientUser.limit) {
      throw new Error("عذراً، لقد استنفدت الحد الأقصى للمستخدمين المسموح به لك.");
    }

    const serverUsersRes = await pool.query("SELECT COUNT(*) as count FROM vpn_users WHERE server_id = $1", [serverId]);
    const serverUsersCount = parseInt(serverUsersRes.rows[0].count);
    
    if (serverUsersCount >= selectedServer.limit) {
       throw new Error("عذراً، السيرفر ممتلئ حالياً.");
    }

    const uuid = randomUUID();
    const newUsername = `VERTEX-${uuid.substring(0, 5).toUpperCase()}`;
    const quotaBytes = 100 * 1024 * 1024 * 1024;
    const expiryTime = Date.now() + 30 * 24 * 60 * 60 * 1000;
    let finalUrl = "";

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    
    try {
      let baseUrls = [];
      let originalUrl = selectedServer.panelUrl.trim().replace(/[:\/]+$/, '');
      
      if (!originalUrl.startsWith("http://") && !originalUrl.startsWith("https://")) {
        baseUrls = [`http://${originalUrl}`, `https://${originalUrl}`];
      } else {
        baseUrls = [originalUrl];
      }
      
      let loginRes: Response | null = null;
      let baseUrl = "";
      let fetchError: any = null;

      for (const url of baseUrls) {
        try {
          const loginUrl = `${url.replace(/\/$/, '')}/login`;
          
          let decryptedPanelPass = "";
          if (selectedServer.panelPasswordEnc) {
             try {
                decryptedPanelPass = decryptText(selectedServer.panelPasswordEnc);
             } catch(e) {
                console.error("Failed to decrypt panel password", e);
             }
          }
          
          loginRes = await fetch(loginUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: selectedServer.username,
              password: decryptedPanelPass
            })
          });
          baseUrl = url;
          fetchError = null;
          
          if (!loginRes.ok) {
            console.error(`[X-UI Login] URL: ${loginUrl}, Status: ${loginRes.status}`);
          }
          break;
        } catch (e: any) {
          fetchError = e;
        }
      }

      if (fetchError && !loginRes) {
        let msg = fetchError.message;
        if (msg === "fetch failed" || msg.includes("fetch failed") || msg.includes("ECONNREFUSED")) {
            msg = "تعذر الوصول إلى اللوحة. تحقق من صحة عنوان السيرفر والمنفذ.";
        }
        throw new Error(`تعذر الاتصال باللوحة: ${msg}`);
      }

      if (!loginRes) throw new Error("فشل غير متوقع أثناء محاولة تسجيل الدخول");

      let loginData;
      let respText = "";
      try {
         respText = await loginRes.text();
         console.log(`[X-UI Login Response] ${respText.slice(0, 100)}`);
         if (respText) loginData = JSON.parse(respText);
      } catch (e) {
         console.error(`[X-UI Login Error Parsing]`, e);
      }

      if (!loginRes.ok || (loginData && !loginData.success)) {
        let errDesc = loginData?.msg || respText.slice(0, 50) || "بيانات غير صحيحة";
        throw new Error(`تعذر الدخول (${baseUrl}): ${errDesc}`);
      }

      const rawCookies = loginRes.headers.get('set-cookie');
      if (!rawCookies) throw new Error("لم يتم استلام جلسة من لوحة السيرفر");
      
      let cookies = rawCookies;
      const sessionMatch = rawCookies.match(/(session|3x-ui)=([^;]+)/);
      if (sessionMatch) {
         cookies = `${sessionMatch[1]}=${sessionMatch[2]}`;
      } else {
         cookies = rawCookies.split(';')[0];
      }

      const getInboundUrl = `${baseUrl.replace(/\/$/, '')}/panel/api/inbounds/get/${selectedServer.inboundId || 1}`;
      finalUrl = `vless://${uuid}@${selectedServer.ip}:${selectedServer.port}?type=tcp&security=none#${newUsername}`;
      let outboundFlow = "";
      let existingClients: any[] = [];
      
      try {
        const inboundRes = await fetch(getInboundUrl, {
          method: 'GET',
          headers: { 'Cookie': cookies, 'Accept': 'application/json' }
        });
        
        if (inboundRes.ok) {
           const inboundData = await inboundRes.json();
           if (inboundData && inboundData.success && inboundData.obj) {
              const obj = inboundData.obj;
              try {
                  const inboundSettings = typeof obj.settings === 'string' ? JSON.parse(obj.settings || "{}") : (obj.settings || {});
                  existingClients = inboundSettings.clients || [];
              } catch (e) {}

              const protocol = obj.protocol;
              const port = obj.port;
              let stream: any = {};
              try {
                  stream = typeof obj.streamSettings === 'string' ? JSON.parse(obj.streamSettings || "{}") : (obj.streamSettings || {});
              } catch(e) {}
              
              const net = stream.network || "tcp";
              const security = stream.security || "none";
              
              let link = `${protocol}://${uuid}@${selectedServer.ip}:${port}?type=${net}&security=${security}`;
              
              let sni = "";
              if (security === "tls") {
                 sni = stream.tlsSettings?.serverNames?.[0] || stream.tlsSettings?.serverName || stream.tlsSettings?.settings?.serverName || "";
                 const fp = stream.tlsSettings?.fingerprint || "chrome";
                 const alpn = stream.tlsSettings?.alpn ? (Array.isArray(stream.tlsSettings.alpn) ? stream.tlsSettings.alpn.join(",") : stream.tlsSettings.alpn) : "";
                 if (sni) {
                     link += `&sni=${encodeURIComponent(sni)}`;
                     if (net === "tcp") link += `&host=${encodeURIComponent(sni)}`;
                 }
                 if (fp) link += `&fp=${fp}`;
                 if (alpn) link += `&alpn=${encodeURIComponent(alpn)}`;
              } else if (security === "reality") {
                 sni = stream.realitySettings?.serverNames?.[0] || stream.realitySettings?.serverName || stream.realitySettings?.settings?.serverName || "";
                 const pbk = stream.realitySettings?.publicKey || "";
                 const fp = stream.realitySettings?.fingerprint || "chrome";
                 const sid = stream.realitySettings?.shortIds?.[0] || "";
                 const spx = stream.realitySettings?.spiderX || "";
                 if (sni) link += `&sni=${encodeURIComponent(sni)}`;
                 if (pbk) link += `&pbk=${pbk}`;
                 if (fp) link += `&fp=${fp}`;
                 if (sid) link += `&sid=${sid}`;
                 if (spx) link += `&spx=${encodeURIComponent(spx)}`;
              }

              if (net === "ws") {
                 const path = stream.wsSettings?.path || "/";
                 const host = stream.wsSettings?.headers?.Host || stream.wsSettings?.headers?.host || "";
                 if (path) link += `&path=${encodeURIComponent(path)}`;
                 if (host) link += `&host=${encodeURIComponent(host)}`;
              } else if (net === "tcp") {
                 const type = stream.tcpSettings?.header?.type || "none";
                 if (type === "http") {
                    link += `&headerType=http`;
                    const host = stream.tcpSettings?.header?.request?.headers?.Host?.[0] || stream.tcpSettings?.header?.request?.headers?.host?.[0] || "";
                    if (host) link += `&host=${encodeURIComponent(host)}`;
                    const path = stream.tcpSettings?.header?.request?.path?.[0] || "";
                    if (path) link += `&path=${encodeURIComponent(path)}`;
                 }
              } else if (net === "grpc") {
                 const serviceName = stream.grpcSettings?.serviceName || "";
                 const multiMode = stream.grpcSettings?.multiMode ? "multi" : "gun";
                 if (serviceName) link += `&serviceName=${encodeURIComponent(serviceName)}`;
                 link += `&mode=${multiMode}`;
              }

              if (protocol === "vless" && (security === "tls" || security === "reality")) {
                  outboundFlow = "";
              }

              link += `#${encodeURIComponent(newUsername)}`;
              finalUrl = link;
           }
        }
      } catch (err) {
        console.error("Failed to parse inbound data for link generation", err);
      }

      const isDuplicate = existingClients.some((c: any) => c.id === uuid || c.email === newUsername);
      if (isDuplicate) throw new Error("UUID أو اسم المستخدم موجود مسبقاً في اللوحة. حاول مرة أخرى.");

      const addClientUrl = `${baseUrl.replace(/\/$/, '')}/panel/api/inbounds/addClient`;
      
      const clientConfig = {
        id: uuid,
        flow: outboundFlow,
        email: newUsername,
        limitIp: 1,
        totalGB: quotaBytes,
        expiryTime: expiryTime,
        enable: true,
        tgId: "",
        subId: ""
      };

      const settings = {
        clients: [clientConfig]
      };

      let addSuccess = false;
      let addErrorMsg = "";

      try {
          const addRes = await fetch(addClientUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Cookie': cookies },
            body: JSON.stringify({
              id: selectedServer.inboundId || 1,
              settings: JSON.stringify(settings)
            })
          });

          const addText = await addRes.text();
          try {
             const addData = JSON.parse(addText);
             if (addRes.ok && addData.success) {
                addSuccess = true;
             } else {
                addErrorMsg = (addData && addData.msg) || "فشل إضافة المستخدم في لوحة X-UI";
             }
          } catch(e) {
             if (addRes.ok) addSuccess = true; 
          }
      } catch (e: any) {
          addErrorMsg = e.message;
      }

      if (!addSuccess) {
         console.error("[X-UI Add Client error] Msg from panel:", addErrorMsg);
         try {
             const checkRes = await fetch(getInboundUrl, {
               method: 'GET',
               headers: { 'Cookie': cookies, 'Accept': 'application/json' }
             });
             if (checkRes.ok) {
                 const checkData = await checkRes.json();
                 if (checkData && checkData.success && checkData.obj) {
                     const checkSettings = JSON.parse(checkData.obj.settings || "{}");
                     const checkClients = checkSettings.clients || [];
                     const isAdded = checkClients.some((c: any) => c.id === uuid || c.email === newUsername);
                     if (isAdded) addSuccess = true;
                 }
             }
         } catch (checkErr) { }
      }

      if (!addSuccess) {
         throw new Error(addErrorMsg || "فشل غير معروف في إضافة المستخدم إلى السيرفر");
      }
    } catch (err: any) {
       console.error("X-UI API Error:", err);
       let errorMessage = err.message;
       if (errorMessage === "fetch failed" || errorMessage.includes("fetch failed") || errorMessage.includes("ECONNREFUSED")) {
          errorMessage = "تعذر الوصول إلى لوحة السيرفر. يرجى التأكد من صحة رابط السيرفر وحالة اللوحة.";
       }
       throw new Error(`تعذر الاتصال بالسيرفر 3X-UI: ${errorMessage}`);
    }

    const newUser = {
        id: randomUUID(),
        serverId: selectedServer.id,
        clientId: clientId,
        username: newUsername,
        displayName: "",
        quotaGb: 100,
        days: 30,
        usageGb: 0, 
        isOnline: false,
        vlessUrl: finalUrl
    };

    await pool.query(
      `INSERT INTO vpn_users (id, server_id, client_id, username, display_name, quota_gb, days, usage_gb, is_online, vless_url, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [newUser.id, newUser.serverId, newUser.clientId, newUser.username, newUser.displayName, newUser.quotaGb, newUser.days, newUser.usageGb, newUser.isOnline, newUser.vlessUrl]
    );

    return toCamel(newUser);
  }

  async updateVpnUserDisplayName(clientId: string, vpnUserId: string, displayName: string) {
    const res = await pool.query("SELECT * FROM vpn_users WHERE id = $1 AND client_id = $2", [vpnUserId, clientId]);
    if (res.rows.length === 0) throw new Error("المستخدم غير موجود أو لا تملك الصلاحية");
    
    await pool.query("UPDATE vpn_users SET display_name = $1 WHERE id = $2", [displayName, vpnUserId]);
    
    const updated = await pool.query("SELECT * FROM vpn_users WHERE id = $1", [vpnUserId]);
    return toCamel(updated.rows[0]);
  }

  async getAdminStats() {
    const serversCount = parseInt((await pool.query("SELECT COUNT(*) FROM servers")).rows[0].count);
    const clientsCount = parseInt((await pool.query("SELECT COUNT(*) FROM users WHERE role = 'client'")).rows[0].count);
    const vpnUsersCount = parseInt((await pool.query("SELECT COUNT(*) FROM vpn_users")).rows[0].count);
    const onlineVpnUsers = parseInt((await pool.query("SELECT COUNT(*) FROM vpn_users WHERE is_online = true")).rows[0].count);

    return {
        totalServers: serversCount,
        totalClients: clientsCount,
        totalVpnUsers: vpnUsersCount,
        onlineVpnUsers: onlineVpnUsers
    };
  }

  async getSecurityLogs(limit: number = 100) {
    const res = await pool.query(
        "SELECT * FROM security_logs ORDER BY created_at DESC LIMIT $1",
        [limit]
    );
    return toCamel(res.rows);
  }

  async fetchServerOnlines(server: any) {
    if (!server) return [];
    try {
      let baseUrls = [];
      let originalUrl = server.panelUrl.trim().replace(/[:\/]+$/, '');
      
      if (!originalUrl.startsWith("http://") && !originalUrl.startsWith("https://")) {
        baseUrls = [`http://${originalUrl}`, `https://${originalUrl}`];
      } else {
        baseUrls = [originalUrl];
      }
      
      let loginRes: Response | null = null;
      let baseUrl = "";
      
      let decryptedPanelPass = "";
      if (server.panelPasswordEnc) {
         try {
            decryptedPanelPass = decryptText(server.panelPasswordEnc);
         } catch(e) {
            console.error("Failed to decrypt panel password", e);
         }
      }

      for (const url of baseUrls) {
        try {
          const loginUrl = `${url.replace(/\/$/, '')}/login`;
          loginRes = await fetch(loginUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: server.username,
              password: decryptedPanelPass
            })
          });
          if (!loginRes.ok) console.error(`[X-UI Onlines Login] URL: ${loginUrl}, Status: ${loginRes.status}`);
          if (loginRes.ok) {
            baseUrl = url;
            break;
          }
        } catch (e) {}
      }
      
      if (loginRes && baseUrl) {
        let setCookie = loginRes.headers.get("set-cookie");
        let cookiesArray = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [];
        let cookieString = "";
        if (cookiesArray.length > 0) {
            cookieString = cookiesArray.map((c: string) => c.split(';')[0]).join('; ');
        } else if (setCookie) {
            cookieString = setCookie.split(';')[0];
        }

        const onlinesUrl = `${baseUrl.replace(/\/$/, '')}/panel/api/inbounds/onlines`;
        const onlinesRes = await fetch(onlinesUrl, {
          method: 'POST',
          headers: { 'Cookie': cookieString, 'Accept': 'application/json', 'Content-Type': 'application/json' }
        });
        if (onlinesRes.ok) {
          const jsonData = await onlinesRes.json();
          if (jsonData.success && Array.isArray(jsonData.obj)) {
            return jsonData.obj; 
          }
        }
      }
    } catch(err) {
      console.error("Failed to fetch onlines", err);
    }
    return [];
  }

  async getClientDashboard(clientId: string) {
    const clientUser = await this.getUserById(clientId);
    const assignedServer = clientUser?.serverId ? await this.getServerById(clientUser.serverId) : null;
    
    const vpnUsersRes = await pool.query("SELECT * FROM vpn_users WHERE client_id = $1 ORDER BY created_at DESC", [clientId]);
    const users = vpnUsersRes.rows.map(toCamel);
    
    let onlineEmails: string[] = [];
    if (assignedServer) {
        onlineEmails = await this.fetchServerOnlines(assignedServer);
    }

    const totalUsers = users.length;
    let computedOnlineUsers = 0;
    
    users.forEach(u => {
        u.isOnline = onlineEmails.includes(u.username);
        if (u.isOnline) computedOnlineUsers++;
    });

    // Optionally update online status in DB in background
    for (const u of users) {
      pool.query("UPDATE vpn_users SET is_online = $1 WHERE id = $2", [u.isOnline, u.id]).catch(() => {});
    }

    const totalUsage = users.reduce((acc: any, curr: any) => acc + curr.usageGb, 0);
    const totalQuota = users.reduce((acc: any, curr: any) => acc + curr.quotaGb, 0);
    
    return {
        clientLimit: clientUser?.limit || 50,
        totalUsers,
        onlineUsers: computedOnlineUsers,
        totalUsage,
        remainingData: totalQuota - totalUsage,
        totalQuota,
        servers: assignedServer ? [{
            id: assignedServer.id,
            name: assignedServer.name,
            ip: assignedServer.ip
        }] : [],
        usersList: users.map((u: any) => ({
            id: u.id,
            displayName: u.displayName,
            v2rayLink: u.vlessUrl,
            username: u.username,
            usageGb: u.usageGb,
            quotaGb: u.quotaGb,
            remainingGb: u.quotaGb - u.usageGb,
            daysRatio: "30 / 30",
            isOnline: u.isOnline,
            serverName: assignedServer?.name || ""
        }))
    };
  }
}
